"use client";

import React, { useState } from "react";
import { 
  Search, 
  Phone, 
  Video, 
  MoreVertical, 
  Paperclip, 
  Smile, 
  Send,
  UserPlus,
  Hash,
  ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const chats = [
  { id: 1, name: "John Doe", status: "Online", lastMessage: "John Doe is typing...", time: "10:24 AM", unread: 2, avatar: "/avatars/john.jpg", type: "personal" },
  { id: 2, name: "Alice Smith", status: "Last seen 2h ago", lastMessage: "I sent the report to your email.", time: "09:15 AM", unread: 0, avatar: "/avatars/alice.jpg", type: "personal" },
  { id: 3, name: "Marketing Team", status: "8 members, 3 online", lastMessage: "Bob: The new campaign...", time: "Yesterday", unread: 5, avatar: null, type: "group" },
  { id: 4, name: "HR General", status: "Active", lastMessage: "Please update your timesheets.", time: "Monday", unread: 0, avatar: null, type: "personal" },
  { id: 5, name: "Tom Hardy", status: "Offline", lastMessage: "Thanks!", time: "Tuesday", unread: 0, avatar: "/avatars/tom.jpg", type: "personal" },
  { id: 6, name: "Kavya maran", status: "Online", lastMessage: "Uploaded the new assets.", time: "Last Week", unread: 0, avatar: "/avatars/kavya.jpg", type: "personal" },
];

const messages = [
  { id: 1, text: "Hey, are we still on for the meeting?", time: "Today, 09:12 AM", sender: "John Doe", isMe: false },
  { id: 2, text: "Yes, I will be there in 5 minutes.", time: "Today, 09:15 AM", sender: "Me", isMe: true },
  { id: 3, text: "Great, see you then!", time: "Today, 09:16 AM", sender: "John Doe", isMe: false },
];

export default function ChatPage() {
  const [activeTab, setActiveTab] = useState("Personal");
  const [selectedChat, setSelectedChat] = useState(chats[0]);
  const [message, setMessage] = useState("");

  return (
    <div className="flex h-[calc(100vh-120px)] bg-white border border-border rounded-xl overflow-hidden shadow-sm">
      {/* Messages Sidebar */}
      <div className={cn(
        "w-full md:w-[350px] border-r border-border flex flex-col bg-gray-50/30",
        selectedChat && "hidden md:flex" // Hide list on mobile when chat is open
      )}>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-foreground">Messages</h1>
            <Button variant="ghost" size="icon" className="text-brand-teal h-8 w-8">
              <UserPlus className="w-5 h-5" />
            </Button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search groups..." className="pl-9 bg-white border-border rounded-lg h-10 shadow-sm" />
          </div>

          <div className="flex items-center gap-1 p-1 bg-white border border-border rounded-lg">
            {["Personal", "Groups", "General"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 px-3 py-1.5 text-xs font-bold rounded-md transition-all relative",
                  activeTab === tab 
                    ? "bg-brand-teal/10 text-brand-teal" 
                    : "text-muted-foreground hover:bg-gray-50"
                )}
              >
                {tab}
                {tab === "Groups" && <span className="absolute -top-1 -right-1 bg-brand-teal text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">5</span>}
                {tab === "General" && <span className="absolute -top-1 -right-1 bg-brand-teal text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">5</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border/50">
          {chats.map((chat) => (
            <div 
              key={chat.id}
              onClick={() => setSelectedChat(chat)}
              className={cn(
                "p-4 flex items-center gap-3 cursor-pointer transition-colors relative",
                selectedChat?.id === chat.id ? "bg-white" : "hover:bg-white/50"
              )}
            >
              {selectedChat?.id === chat.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-teal" />}
              
              <div className="relative shrink-0">
                <Avatar className="w-12 h-12 border border-border">
                  {chat.avatar ? (
                    <AvatarImage src={chat.avatar} />
                  ) : (
                    <AvatarFallback className={cn(
                      "font-bold text-xs",
                      chat.type === "group" ? "bg-emerald-50 text-emerald-600" : "bg-brand-light text-brand-teal"
                    )}>
                      {chat.name[0]}
                    </AvatarFallback>
                  )}
                </Avatar>
                {chat.status === "Online" && (
                  <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-[14px] text-foreground truncate">{chat.name}</h3>
                  <span className="text-[10px] font-semibold text-muted-foreground">{chat.time}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className={cn(
                    "text-[12px] truncate",
                    chat.unread > 0 ? "text-brand-teal font-semibold" : "text-muted-foreground"
                  )}>
                    {chat.lastMessage}
                  </p>
                  {chat.unread > 0 && (
                    <span className="bg-brand-teal text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shrink-0">
                      {chat.unread}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col bg-white",
        !selectedChat && "hidden md:flex"
      )}>
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="h-[88px] border-b border-border px-6 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="md:hidden"
                  onClick={() => setSelectedChat(null as any)}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <div className="relative shrink-0">
                  <Avatar className="w-11 h-11 border border-border">
                    {selectedChat.avatar ? (
                      <AvatarImage src={selectedChat.avatar} />
                    ) : (
                      <AvatarFallback className="bg-brand-light text-brand-teal font-bold text-xs uppercase">
                        {selectedChat.name[0]}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  {selectedChat.status === "Online" && (
                    <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white"></span>
                  )}
                </div>
                <div>
                  <h2 className="font-bold text-slate-800">{selectedChat.name}</h2>
                  <p className="text-[11px] font-semibold text-emerald-600">{selectedChat.status}</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="text-brand-teal hover:bg-brand-light/50 h-9 w-9 rounded-full border border-brand-teal/5 bg-brand-teal/5">
                  <Phone className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-brand-teal hover:bg-brand-light/50 h-9 w-9 rounded-full border border-brand-teal/5 bg-brand-teal/5">
                  <Video className="w-4 h-4" />
                </Button>
                <div className="w-[1px] h-6 bg-border mx-2" />
                <Button variant="ghost" size="icon" className="text-muted-foreground h-9 w-9">
                  <Search className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground h-9 w-9">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-gray-50/20">
              <div className="flex justify-center">
                <span className="px-3 py-1 bg-white border border-border rounded-full text-[10px] font-bold text-muted-foreground uppercase tracking-wider shadow-sm">
                  Today, 09:12 AM
                </span>
              </div>

              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={cn(
                    "flex items-start gap-3",
                    msg.isMe ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  {!msg.isMe && (
                    <Avatar className="w-9 h-9 border border-border shrink-0 mt-1">
                      <AvatarImage src={selectedChat.avatar || ""} />
                      <AvatarFallback className="bg-slate-200 text-slate-600 font-bold text-[10px]">
                        {msg.sender[0]}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={cn(
                    "flex flex-col gap-1.5 max-w-[70%]",
                    msg.isMe ? "items-end" : "items-start"
                  )}>
                    <div className={cn(
                      "px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-sm",
                      msg.isMe 
                        ? "bg-brand-teal text-white rounded-tr-none" 
                        : "bg-white border border-border text-slate-700 rounded-tl-none"
                    )}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex items-center gap-3">
                <Avatar className="w-9 h-9 border border-border shrink-0">
                  <AvatarImage src={selectedChat.avatar || ""} />
                  <AvatarFallback className="bg-slate-200 text-slate-600 font-bold text-[10px]">JD</AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-brand-teal rounded-full animate-bounce delay-0" />
                    <span className="w-1.5 h-1.5 bg-brand-teal rounded-full animate-bounce delay-150" />
                    <span className="w-1.5 h-1.5 bg-brand-teal rounded-full animate-bounce delay-300" />
                  </div>
                  <span className="text-[11px] font-semibold text-muted-foreground italic">John Doe is typing...</span>
                </div>
              </div>
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-border bg-white">
              <div className="max-w-4xl mx-auto flex items-center gap-3 bg-gray-50/50 p-2 rounded-2xl border border-border">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-white rounded-full">
                  <Paperclip className="w-5 h-5" />
                </Button>
                <Input 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`Type your message to ${selectedChat.name}...`}
                  className="flex-1 bg-transparent border-none focus-visible:ring-0 shadow-none text-sm placeholder:text-muted-foreground h-11"
                />
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-white rounded-full">
                  <Smile className="w-5 h-5" />
                </Button>
                <Button className="bg-brand-teal hover:bg-brand-teal-light text-white rounded-full w-11 h-11 p-0 shadow-md">
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4">
            <div className="w-20 h-20 rounded-full bg-brand-teal/10 flex items-center justify-center">
              <Hash className="w-10 h-10 text-brand-teal" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Select a chat to start messaging</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">Choose a conversation from the left sidebar to see messages and start chatting with your colleagues.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
