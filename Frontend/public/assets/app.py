import os
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from PyPDF2 import PdfReader
from langchain.text_splitter import CharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.memory import ConversationBufferMemory
from langchain.chains import ConversationalRetrievalChain
from langchain_groq import ChatGroq
from pymongo import MongoClient
from datetime import datetime
import uuid

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}})

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# MongoDB setup
MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    raise ValueError("MONGODB_URI not found in environment variables")
mongo_client = MongoClient(MONGODB_URI)
db = mongo_client['mydb']
chats_collection = db['chats']

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure upload folder exists
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Global variables to store conversation state
conversation = None
chat_history = []

# Function to check allowed file extensions
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Function to generate a unique filename if the file already exists
def get_unique_filename(filepath):
    if not os.path.exists(filepath):
        return filepath
    base, ext = os.path.splitext(filepath)
    counter = 1
    while True:
        new_filepath = f"{base}_{uuid.uuid4().hex[:8]}{ext}"
        if not os.path.exists(new_filepath):
            return new_filepath
        counter += 1

# Function to extract text from PDF files
def get_pdf_text(pdf_paths):
    text = ""
    for pdf_path in pdf_paths:
        logging.info(f"Extracting text from {pdf_path}")
        try:
            with open(pdf_path, 'rb') as f:
                pdf_reader = PdfReader(f)
                for page in pdf_reader.pages:
                    page_text = page.extract_text() or ""
                    text += page_text
        except Exception as e:
            logging.error(f"Error extracting text from {pdf_path}: {e}")
            raise
    return text

# Function to split the extracted text into chunks
def get_text_chunks(text):
    logging.info("Splitting text into chunks")
    try:
        text_splitter = CharacterTextSplitter(
            separator="\n",
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len
        )
        chunks = text_splitter.split_text(text)
        logging.info(f"Created {len(chunks)} chunks")
        return chunks
    except Exception as e:
        logging.error(f"Error splitting text: {e}")
        raise

# Function to create a FAISS vectorstore
def get_vectorstore(text_chunks):
    logging.info("Creating FAISS vectorstore")
    try:
        embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            model_kwargs={'device': 'cpu'}  # Force CPU to avoid GPU memory issues
        )
        # Process chunks in smaller batches to reduce memory usage
        batch_size = 100
        vectorstore = None
        for i in range(0, len(text_chunks), batch_size):
            batch = text_chunks[i:i + batch_size]
            logging.info(f"Processing batch {i // batch_size + 1} with {len(batch)} chunks")
            if vectorstore is None:
                vectorstore = FAISS.from_texts(texts=batch, embedding=embeddings)
            else:
                vectorstore.add_texts(batch)
        return vectorstore
    except Exception as e:
        logging.error(f"Error creating vectorstore: {e}")
        raise

# Function to set up the conversational retrieval chain
def get_conversation_chain(vectorstore):
    logging.info("Setting up conversation chain")
    try:
        groq_api_key = os.getenv("GROQ_API_KEY")
        if not groq_api_key:
            raise ValueError("GROQ_API_KEY not found in environment variables")
        llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0.5, api_key=groq_api_key)
        memory = ConversationBufferMemory(memory_key='chat_history', return_messages=True)
        
        conversation_chain = ConversationalRetrievalChain.from_llm(
            llm=llm,
            retriever=vectorstore.as_retriever(),
            memory=memory
        )
        logging.info("Conversation chain created successfully")
        return conversation_chain
    except Exception as e:
        logging.error(f"Error creating conversation chain: {e}")
        return None

# Endpoint to upload and process PDFs
@app.route('/api/upload', methods=['POST'])
def upload_pdfs():
    global conversation, chat_history
    logging.info("Received upload request")
    chat_history = []
    
    if 'files' not in request.files:
        logging.error("No files provided")
        return jsonify({'error': 'No files provided'}), 400
    
    files = request.files.getlist('files')
    pdf_paths = []
    
    for file in files:
        if file and allowed_file(file.filename):
            if file.seek(0, os.SEEK_END) > MAX_FILE_SIZE:
                file.seek(0)
                logging.error(f"File {file.filename} exceeds 10MB limit")
                return jsonify({'error': f'File {file.filename} exceeds 10MB limit'}), 400
            file.seek(0)
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            unique_file_path = get_unique_filename(file_path)
            file.save(unique_file_path)
            pdf_paths.append(unique_file_path)
            logging.info(f"Saved and retained uploaded file: {unique_file_path}")
        else:
            logging.error(f"Invalid file type: {file.filename}")
            return jsonify({'error': 'Invalid file type'}), 400
    
    try:
        raw_text = get_pdf_text(pdf_paths)
        text_chunks = get_text_chunks(raw_text)
        vectorstore = get_vectorstore(text_chunks)
        conversation = get_conversation_chain(vectorstore)
        
        if conversation is None:
            logging.error("Failed to create conversation chain")
            return jsonify({'error': 'Failed to create conversation chain'}), 500
        
        logging.info("PDFs processed successfully")
        return jsonify({'message': 'PDFs processed successfully'}), 200
    except Exception as e:
        logging.error(f"Error processing PDFs: {e}")
        return jsonify({'error': str(e)}), 500

# Endpoint to handle user questions
@app.route('/api/ask', methods=['POST'])
def ask_question():
    global conversation, chat_history
    logging.info("Received question request")
    
    if conversation is None:
        logging.error("No documents processed yet")
        return jsonify({'error': 'No documents processed yet'}), 400
    
    data = request.get_json()
    if not data or 'question' not in data:
        logging.error("No question provided")
        return jsonify({'error': 'No question provided'}), 400
    
    user_question = data['question']
    chat_id = data.get('chat_id')  # Optional chat_id from frontend
    
    try:
        response = conversation({'question': user_question})
        chat_history = response['chat_history']
        
        formatted_history = []
        for i, message in enumerate(chat_history):
            role = 'user' if i % 2 == 0 else 'bot'
            formatted_history.append({'role': role, 'content': message.content})
        
        logging.info("Question processed successfully")
        return jsonify({'chat_history': formatted_history, 'chat_id': chat_id}), 200
    except Exception as e:
        logging.error(f"Error processing question: {e}")
        return jsonify({'error': str(e)}), 500

# Endpoint to save or update chat
@app.route('/api/save_chat', methods=['POST'])
def save_chat():
    try:
        data = request.get_json()
        if not data or 'chat_name' not in data or 'messages' not in data:
            logging.error("Invalid save chat request")
            return jsonify({'error': 'Invalid request'}), 400
        
        chat_id = data.get('chat_id')
        chat_document = {
            'chat_name': data['chat_name'],
            'messages': data['messages'],
            'timestamp': datetime.utcnow()
        }
        
        if chat_id:
            # Update existing chat
            result = chats_collection.update_one(
                {'chat_id': chat_id},
                {'$set': chat_document}
            )
            if result.matched_count == 0:
                logging.error(f"No chat found with chat_id: {chat_id}")
                return jsonify({'error': 'Chat not found'}), 404
            logging.info(f"Chat updated with chat_id: {chat_id}")
        else:
            # Create new chat
            chat_document['chat_id'] = str(uuid.uuid4())
            chats_collection.insert_one(chat_document)
            chat_id = chat_document['chat_id']
            logging.info(f"New chat created with chat_id: {chat_id}")
        
        return jsonify({'message': 'Chat saved successfully', 'chat_id': chat_id}), 200
    except Exception as e:
        logging.error(f"Error saving chat: {e}")
        return jsonify({'error': str(e)}), 500

# Endpoint to get chat history
@app.route('/api/chat_history', methods=['GET'])
def get_chat_history():
    try:
        chats = list(chats_collection.find().sort('timestamp', -1))
        formatted_chats = []
        for chat in chats:
            formatted_chats.append({
                'chat_id': chat['chat_id'],
                'chat_name': chat['chat_name'],
                'messages': chat['messages'],
                'timestamp': chat['timestamp'].strftime('%Y-%m-%d %H:%M:%S')
            })
        logging.info("Chat history retrieved successfully")
        return jsonify({'chats': formatted_chats}), 200
    except Exception as e:
        logging.error(f"Error retrieving chat history: {e}")
        return jsonify({'error': str(e)}), 500

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health():
    logging.info("Health check requested")
    return jsonify({'status': 'healthy'}), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000, use_reloader=False)  # Disable auto-reload