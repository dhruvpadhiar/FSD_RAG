"use client"

import { useState } from "react"
import { MessageSquare, Calendar, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { format } from "date-fns"

export default function ChatList({ chats, currentChatId, onSelectChat }) {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredChats = chats.filter((chat) => chat.chatName.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search chats..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 bg-background border-border focus-visible:ring-ring"
        />
      </div>

      <div className="space-y-1">
        {filteredChats.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {chats.length === 0 ? "No saved chats yet" : "No chats match your search"}
          </div>
        ) : (
          filteredChats.map((chat) => (
            <div
              key={chat.chatId}
              onClick={() => onSelectChat(chat.chatId)}
              className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                currentChatId === chat.chatId ? "bg-muted border-l-2 border-primary" : "hover:bg-muted/50"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="bg-muted p-2 rounded-lg">
                  <MessageSquare className="h-4 w-4 text-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate">{chat.chatName}</div>
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    <Calendar className="h-3 w-3 mr-1" />
                    {format(new Date(chat.createdAt), "MMM d, yyyy")}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
