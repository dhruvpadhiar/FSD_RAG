"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Loader2, Save, Trash, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

export default function ChatInterface({
  apiStatus,
  uploadStatus,
  chatHistory,
  setChatHistory,
  setErrorMessage,
  onSaveChat,
  currentChat,
}) {
  const [question, setQuestion] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [chatName, setChatName] = useState("")
  const [chatId, setChatId] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  const [chatHistoryList, setChatHistoryList] = useState([])
  const [justSaved, setJustSaved] = useState(false)
  const [showContextMessage, setShowContextMessage] = useState(false)
  const chatContainerRef = useRef(null)

  // Auto-scroll to the bottom when chat history updates
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatHistory])

  // Set chat name, ID, and reset context message when current chat changes
  useEffect(() => {
    if (currentChat) {
      setChatName(currentChat.chatName)
      setChatId(currentChat.chatId)
    } else {
      setChatName(`Chat ${new Date().toLocaleString()}`)
      setChatId(null)
    }
    setJustSaved(false)
    setShowContextMessage(false)
  }, [currentChat])

  // Fetch chat history only when history dialog opens
  useEffect(() => {
    if (historyDialogOpen) {
      console.log("Fetching chat history from /api/chat_history")
      const fetchChatHistory = async () => {
        try {
          const response = await fetch("http://localhost:5000/api/chat_history", {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          })
          const data = await response.json()
          if (response.ok) {
            setChatHistoryList(data.chats)
            console.log("Chat history fetched successfully:", data.chats)
          } else {
            setErrorMessage(data.error || "Failed to fetch chat history")
            console.error("Failed to fetch chat history:", data.error)
          }
        } catch (error) {
          setErrorMessage("Network error. Please try again.")
          console.error("Network error while fetching chat history:", error)
        }
      }
      fetchChatHistory()
    }
  }, [historyDialogOpen, setErrorMessage])

  const handleAsk = async () => {
    if (!question.trim()) return

    console.log("Sending question to /api/ask, chatId:", chatId)
    const userMessage = { role: "user", content: question }
    setChatHistory([...chatHistory, userMessage])
    setIsLoading(true)
    setShowContextMessage(false) // Hide context message when asking a question

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout
      const response = await fetch("http://localhost:5000/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim(), chat_id: chatId }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      const data = await response.json()

      if (response.ok) {
        setChatHistory(data.chat_history)
        setChatId(data.chat_id) // Update chatId if provided
        console.log("Question processed successfully, chatId:", data.chat_id)
      } else {
        setErrorMessage(data.error || "Failed to get response")
        setChatHistory([...chatHistory, userMessage])
        console.error("Failed to process question:", data.error)
      }
    } catch (error) {
      const errorMsg = error.name === "AbortError" ? "Request timed out" : "Network error. Please try again."
      setErrorMessage(errorMsg)
      setChatHistory([...chatHistory, userMessage])
      console.error("Error in handleAsk:", errorMsg)
    } finally {
      setIsLoading(false)
      setQuestion("")
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleAsk()
    }
  }

  const handleSaveChat = async () => {
    if (!chatName.trim()) {
      setErrorMessage("Please enter a chat name")
      return
    }

    console.log("Saving chat, chatId:", chatId)
    try {
      const response = await fetch("http://localhost:5000/api/save_chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_name: chatName,
          messages: chatHistory,
          chat_id: chatId,
        }),
      })
      const data = await response.json()
      if (response.ok) {
        setChatId(data.chat_id) // Update chatId for new chats
        setJustSaved(true) // Mark as just saved to prevent double save
        onSaveChat(chatName)
        console.log("Chat saved successfully, chatId:", data.chat_id)
      } else {
        setErrorMessage(data.error || "Failed to save chat")
        console.error("Failed to save chat:", data.error)
      }
    } catch (error) {
      setErrorMessage("Network error. Please try again.")
      console.error("Network error while saving chat:", error)
    }
    setDialogOpen(false)
  }

  const handleCloseHistory = async () => {
    if (chatHistory.length > 0 && !justSaved) {
      console.log("Saving chat on history dialog close, chatId:", chatId)
      try {
        const response = await fetch("http://localhost:5000/api/save_chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_name: chatName,
            messages: chatHistory,
            chat_id: chatId,
          }),
        })
        const data = await response.json()
        if (response.ok) {
          setChatId(data.chat_id) // Update chatId for new chats
          console.log("Chat saved on close, chatId:", data.chat_id)
        } else {
          setErrorMessage(data.error || "Failed to save chat history")
          console.error("Failed to save chat on close:", data.error)
        }
      } catch (error) {
        setErrorMessage("Network error. Please try again.")
        console.error("Network error while saving chat on close:", error)
      }
    }
    setJustSaved(false) // Reset justSaved flag
    setHistoryDialogOpen(false)
  }

  const clearChat = () => {
    setChatHistory([])
    setChatId(null)
    setChatName(`Chat ${new Date().toLocaleString()}`)
    setJustSaved(false)
    setShowContextMessage(false)
    console.log("Chat cleared, chatId reset to null")
  }

  const loadChat = (chat) => {
    setChatHistory(chat.messages)
    setChatName(chat.chat_name)
    setChatId(chat.chat_id)
    setJustSaved(false)
    setHistoryDialogOpen(false)
    setShowContextMessage(true)
    console.log("Loaded chat, chatId:", chat.chat_id)
  }

  const isInputDisabled = apiStatus !== "healthy" || uploadStatus !== "success" || isLoading

  return (
    <div className="flex flex-col h-[350px] sm:h-[400px] md:h-[500px]">
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4 bg-muted/50 rounded-lg mb-4 border border-border"
      >
        {chatHistory.length === 0 && !showContextMessage ? (
          <div className="text-center text-muted-foreground mt-10 md:mt-20">
            {uploadStatus === "success"
              ? "Your PDFs are processed. Ask a question about them!"
              : "Upload PDFs to start chatting"}
          </div>
        ) : (
          <>
            {showContextMessage && (
              <div className="text-center text-muted-foreground text-sm mt-10 md:mt-20">
                Please provide the PDF that was provided to give context.
              </div>
            )}
            {chatHistory.map((message, index) => (
              <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] sm:max-w-[80%] p-2 md:p-3 rounded-lg ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border shadow-sm"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
          </>
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] sm:max-w-[80%] p-2 md:p-3 rounded-lg bg-card border border-border shadow-sm flex items-center">
              <Loader2 className="h-4 w-4 animate-spin mr-2 text-muted-foreground" />
              <span className="text-foreground">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                disabled={chatHistory.length === 0}
                className="border-border hover:bg-muted hover:text-foreground"
              >
                <Save className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Save Chat</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={chatName}
                    onChange={(e) => setChatName(e.target.value)}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  onClick={handleSaveChat}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            size="icon"
            onClick={clearChat}
            disabled={chatHistory.length === 0}
            className="border-border hover:bg-muted"
          >
            <Trash className="h-4 w-4 text-foreground" />
          </Button>

          <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="border-border hover:bg-muted hover:text-foreground"
              >
                <History className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Chat History</DialogTitle>
              </DialogHeader>
              <div className="max-h-[400px] overflow-y-auto">
                {chatHistoryList.length === 0 ? (
                  <div className="text-center text-muted-foreground py-4">
                    No chat history available
                  </div>
                ) : (
                  chatHistoryList.map((chat) => (
                    <div
                      key={chat.chat_id}
                      className="p-3 border-b border-border hover:bg-muted cursor-pointer"
                      onClick={() => loadChat(chat)}
                    >
                      <div className="flex justify-between">
                        <span className="font-medium">{chat.chat_name}</span>
                        <span className="text-muted-foreground text-sm">{chat.timestamp}</span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {chat.messages[0]?.content.substring(0, 50)}...
                      </div>
                    </div>
                  ))
                )}
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCloseHistory}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative flex-1 mt-2 sm:mt-0">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              apiStatus !== "healthy"
                ? "API is not available"
                : uploadStatus !== "success"
                  ? "Upload PDFs first"
                  : "Ask a question about your PDFs..."
            }
            disabled={isInputDisabled}
            className="pr-12 border-border focus-visible:ring-ring"
          />
          <Button
            onClick={handleAsk}
            disabled={isInputDisabled || !question.trim()}
            size="icon"
            className="absolute right-1 top-1 h-8 w-8 bg-primary hover:bg-primary/90"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}