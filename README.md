
# 💬 RAG Chatbot

A full-stack chatbot powered by Groq + Langchain for RAG (Retrieval Augmented Generation).Upload PDFs and ask questions from the content.Authentication handled via a separate Node.js + MongoDB server.

## 🎥 Demo

Landing Page and Auth Page:

![Image](https://github.com/user-attachments/assets/76d37ab9-50e6-41d7-9fe2-8d5a15c9bc4e)

Dashboard:

![Image](https://github.com/user-attachments/assets/02d888f5-b0f0-488b-ba01-11542a026da5)

## Tech Stack

**Client:** React, , TailwindCSS

**Server:** Node, Express

**RAG:** GROQ , Langchain , Python 


## Environment Variables 

To run this project, you will need to add the following environment variables to your .env file.

In backend

`GROQ_API_KEY=your_key_here
`

In terror:


`MONGODB_URI=your_mongodb_connection_string
`

`JWT_SECRET=your_jwt_secret
`

`PORT=XXXX
`

## Run Locally

Clone the project

```bash
  git clone https://github.com/PakshalS/RAG_Chatbot.git
```

Go to the backend directory

```bash
  cd Backend
```

Install dependencies

```bash
  pip install flask python-dotenv PyPDF2 langchain faiss-cpu sentence-transformers langchain-groq werkzeug

```

Start the service

```bash
  python app.py
```

Go to the frontend directory

```bash
  cd frontend
```

Install dependencies

```bash
   npm ci
```

Start the Frontend

```bash
  npm run dev
```

Go to the terror directory

```bash
  cd terror
```

Install dependencies

```bash
   npm ci
```

Start the Node Backend

```bash
  npm start
```
## Feedback

If you have any feedback, please reach out to us at 3277pakshalshah@gmail.com

