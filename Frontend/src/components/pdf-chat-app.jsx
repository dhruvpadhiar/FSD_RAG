"use client"

import { useState, useEffect } from "react"
import { FileText, AlertCircle, CheckCircle, Plus, Menu, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useMediaQuery } from "@/hooks/use-media-query"
import ChatInterface from "@/components/chat-interface"
import FileUpload from "@/components/file-upload"
import ChatList from "@/components/chat-list"

export default function PDFChatApp() {
  const [apiStatus, setApiStatus] = useState("checking")
  const [uploadStatus, setUploadStatus] = useState("idle")
  const [errorMessage, setErrorMessage] = useState(null)
  const [chatHistory, setChatHistory] = useState([])
  const [chats, setChats] = useState([])
  const [currentChat, setCurrentChat] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Check if screen is mobile
  const isMobile = useMediaQuery("(max-width: 768px)")

  // Auto-close sidebar on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false)
    } else {
      setSidebarOpen(true)
    }
  }, [isMobile])

  // Check API health on component mount
  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        const response = await fetch("http://localhost:5000/api/health", { signal: controller.signal })
        clearTimeout(timeoutId)
        const data = await response.json()
        setApiStatus(data.status === "healthy" ? "healthy" : "down")
      } catch (error) {
        setApiStatus("down")
        setErrorMessage(
          error.name === "AbortError"
            ? "API request timed out"
            : "API is not available. Please ensure the server is running.",
        )
      }
    }

    checkApiHealth()
  }, [])

  // Fetch user's chats
  useEffect(() => {
    if (apiStatus === "healthy") {
      fetchChats()
    }
  }, [apiStatus])

  const fetchChats = async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) return

      const response = await fetch("http://localhost:5000/api/chats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setChats(data.chats || [])
      }
    } catch (error) {
      console.error("Error fetching chats:", error)
    }
  }

  const createNewChat = () => {
    setChatHistory([])
    setCurrentChat(null)
    // Just create the new chat without notification
    // Close sidebar on mobile after creating a new chat
    if (isMobile) {
      setSidebarOpen(false)
    }
  }

  const selectChat = async (chatId) => {
    try {
      const token = localStorage.getItem("token")
      if (!token) return

      const response = await fetch(`http://localhost:5000/api/chats/${chatId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setChatHistory(data.chat.history || [])
        setCurrentChat(data.chat)
        // Close sidebar on mobile after selecting a chat
        if (isMobile) {
          setSidebarOpen(false)
        }
      }
    } catch (error) {
      console.error("Error fetching chat:", error)
      setErrorMessage("Failed to load chat history")
    }
  }

  const saveCurrentChat = async (chatName) => {
    if (chatHistory.length === 0) return

    try {
      const token = localStorage.getItem("token")
      if (!token) {
        setErrorMessage("Please log in to save chats")
        return
      }

      const userId = JSON.parse(atob(token.split(".")[1])).userId
      const chatId = currentChat?.chatId || `chat_${Date.now()}`

      const response = await fetch("http://localhost:5000/api/chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          chatId,
          chatName: chatName || `Chat ${chats.length + 1}`,
          history: chatHistory,
        }),
      })

      if (response.ok) {
        fetchChats()
      } else {
        setErrorMessage("Failed to save chat")
      }
    } catch (error) {
      console.error("Error saving chat:", error)
      setErrorMessage("Failed to save chat")
    }
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-background overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Toggle sidebar">
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <h1 className="text-xl font-bold">PDF Chat</h1>
        <div className="w-10"></div> {/* Spacer for centering */}
      </div>

      {/* Sidebar - Collapsible on mobile */}
      {/* {sidebarOpen && (
        <div
          className={`${
            isMobile ? "absolute z-40 top-[61px] bottom-0 left-0 w-[280px]" : "w-[280px] min-w-[280px]"
          } border-r border-border bg-card shadow-sm flex flex-col h-full md:h-screen`}
        >
          <div className="p-4 border-b border-border">
            <Button
              onClick={createNewChat}
              className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              New Chat
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            <ChatList chats={chats} currentChatId={currentChat?.chatId} onSelectChat={selectChat} />
          </div>
        </div>
      )} */}

      {/* Main Content - Takes full width when sidebar is closed */}
      <div className="flex-1 flex flex-col overflow-hidden h-[calc(100vh-61px)] md:h-screen">
        {/* Desktop Header */}
        <div className="hidden md:flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center">
            {/* <Button variant="ghost" size="icon" onClick={toggleSidebar} className="mr-2">
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button> */}
            <h1 className="text-2xl font-bold">PDF Chat Application</h1>
          </div>

          {currentChat && (
            <div className="text-sm text-muted-foreground">
              Current chat: <span className="font-medium">{currentChat.chatName}</span>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-3 md:p-6">
          {apiStatus === "down" && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {errorMessage || "API is not available. Please ensure the server is running."}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="lg:col-span-1">
              <Card className="overflow-hidden border shadow-sm h-full">
                <CardHeader className="bg-muted/70 p-4">
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <FileText className="h-5 w-5" />
                    PDF Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <FileUpload
                    apiStatus={apiStatus}
                    setUploadStatus={setUploadStatus}
                    setErrorMessage={setErrorMessage}
                  />

                  {uploadStatus === "success" && (
                    <div className="flex items-center gap-2 mt-4 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>PDFs processed successfully!</span>
                    </div>
                  )}

                  {uploadStatus === "error" && (
                    <div className="flex items-center gap-2 mt-4 text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span>{errorMessage || "Upload failed"}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2">
              <Card className="overflow-hidden border shadow-sm h-full">
                <CardHeader className="bg-muted/70 p-4">
                  <CardTitle className="text-base md:text-lg">Chat with your PDFs</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <ChatInterface
                    apiStatus={apiStatus}
                    uploadStatus={uploadStatus}
                    chatHistory={chatHistory}
                    setChatHistory={setChatHistory}
                    setErrorMessage={setErrorMessage}
                    onSaveChat={saveCurrentChat}
                    currentChat={currentChat}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
