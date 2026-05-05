"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useApi } from "@/hooks/useApi";
import { useUser } from "@/hooks/useUser";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
  ChevronLeft,
  Pencil,
  Trash2,
  X,
  Star,
  File as FileIcon,
  Download,
  Users,
  UsersRound,
  Plus,
  Settings,
  UserMinus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { API_URL } from "@/lib/config";
import dayjs from "dayjs";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  Reply, 
  Forward, 
  Copy, 
  Bookmark, 
  BellOff, 
  Link as LinkIcon,
  Pin
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const INITIAL_MESSAGES: Record<string, any[]> = {
  "all": [
    { id: 1, text: "Hey, are we still on for the meeting?", time: "09:12 AM", sender: "John Doe", isMe: false },
    { id: 2, text: "Yes, I will be there in 5 minutes.", time: "09:15 AM", sender: "Me", isMe: true },
  ]
};

export default function ChatPage() {
  const { user } = useUser();
  const { data: apiData, isLoading } = useApi();
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMessages, setCurrentMessages] = useState<any[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [chatSummaries, setChatSummaries] = useState<Record<string, any>>({});
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [forwardingMessage, setForwardingMessage] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"Personal" | "Groups" | "General" | "Saved">("Personal");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isSearchingMessages, setIsSearchingMessages] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [chatGroups, setChatGroups] = useState<any[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shouldScrollToBottom = useRef(true);

  const employees = apiData?.employees || [];

  const scrollToBottom = () => {
    if (scrollRef.current && shouldScrollToBottom.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      shouldScrollToBottom.current = false;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages]);

  useEffect(() => {
    if (user) {
      fetchUnreadCounts();
      fetchChatSummaries();
      const interval = setInterval(() => {
        fetchUnreadCounts();
        fetchChatSummaries();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchChatSummaries = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/chat/summaries/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setChatSummaries(data);
      }
    } catch (err) {
      console.error("Error fetching summaries:", err);
    }
  };

  const fetchUnreadCounts = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/chat/unread-counts/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setUnreadCounts(data);
      }
    } catch (err) {
      console.error("Error fetching unread counts:", err);
    }
  };

  const markAsSeen = async () => {
    if (!selectedChat || !user) return;
    try {
      await fetch(`${API_URL}/chat/mark-seen/${selectedChat.id}/${user.id}`, { method: 'POST' });
      fetchUnreadCounts();
    } catch (err) {
      console.error("Error marking as seen:", err);
    }
  };

  const fetchMessages = React.useCallback(async () => {
    if (!selectedChat || !user) return;
    try {
      const res = await fetch(`${API_URL}/chat/messages/${user.id}/${selectedChat.id}`);
      if (res.ok) {
        const data = await res.json();
        // Mark which messages are mine
        const marked = data.map((m: any) => ({
          ...m,
          isMe: m.senderId === user.id
        }));
        setCurrentMessages(marked);
        
        // If there are unread messages from the other person, mark them seen
        const hasUnread = marked.some(m => !m.isMe && !m.isSeen);
        if (hasUnread) {
          markAsSeen();
        }
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  }, [selectedChat, user]);

  const fetchGroups = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/chat/groups/${user.id}`);
      if (res.ok) {
        setChatGroups(await res.json());
      }
    } catch (err) {
      console.error("Error fetching groups:", err);
    }
  }, [user]);

  useEffect(() => {
    if (selectedChat && user) {
      shouldScrollToBottom.current = true;
      fetchMessages();
      fetchGroups();
      const interval = setInterval(() => {
        fetchMessages();
        fetchGroups();
      }, 3000);
      return () => clearInterval(interval);
    } else if (user) {
      fetchGroups();
    }
  }, [selectedChat, user, fetchMessages, fetchGroups]);

  const handleSendMessage = async () => {
    if ((!message.trim() && !pendingFile) || !selectedChat || !user) return;

    const payload: any = {
      senderId: user.id,
      receiverId: selectedChat.type === 'group' ? "group" : selectedChat.id,
      groupId: selectedChat.type === 'group' ? selectedChat.id : null,
      text: message || (pendingFile ? `Sent a file: ${pendingFile.name}` : ""),
      type: selectedChat.type === 'group' ? "group" : "personal"
    };

    if (replyingTo) {
      payload.replyToId = replyingTo.id;
      payload.replyToText = replyingTo.text;
    }

    if (pendingFile) {
      // Real upload to backend
      const formData = new FormData();
      formData.append('file', pendingFile);
      
      try {
        const uploadRes = await fetch(`${API_URL}/chat/upload`, {
          method: 'POST',
          body: formData
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          payload.attachmentUrl = uploadData.url;
          payload.attachmentName = uploadData.filename;
        } else {
          alert("Failed to upload file. Please try again.");
          return;
        }
      } catch (err) {
        console.error("Upload error:", err);
        alert("An error occurred during upload.");
        return;
      }
    }

    try {
      const res = await fetch(`${API_URL}/chat/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const newMessage = await res.json();
        shouldScrollToBottom.current = true;
        setCurrentMessages(prev => [...prev, { ...newMessage, isMe: true }]);
        setMessage("");
        setReplyingTo(null);
        setPendingFile(null);
      }
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const handleDownload = async (url: string, filename: string) => {
    if (!url || url === "#") {
      alert(`This attachment is not available for download (URL: ${url}). Please send a NEW file to test.`);
      return;
    }
    const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;
    
    try {
      const response = await fetch(fullUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download error:", err);
      // Fallback to direct link if fetch fails
      window.open(fullUrl, '_blank');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingFile(file);
    }
  };

  const handleAddEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const commonEmojis = ["😊", "😂", "🥰", "😍", "😒", "😭", "👍", "🔥", "✨", "🙌", "🙏", "😎", "🤔", "😅", "👌", "❤️", "🎉", "💯", "✅", "❌", "👋", "🤝", "💪", "🚀"];

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || selectedGroupMembers.length === 0 || !user) return;
    
    const payload = {
      name: newGroupName,
      members: [...selectedGroupMembers, user.id],
      createdBy: user.id,
      avatar: null
    };

    try {
      const method = isEditingGroup ? 'PUT' : 'POST';
      const url = method === 'PUT' ? `${API_URL}/chat/groups/${selectedChat.id}` : `${API_URL}/chat/groups`;
      
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const result = await res.json();
        if (method === 'PUT') {
          setChatGroups(prev => prev.map(g => g.id === result.id ? result : g));
          setSelectedChat({ ...result, type: 'group' });
          alert("Group updated successfully.");
        } else {
          setChatGroups(prev => [result, ...prev]);
          setSelectedChat({ ...result, type: 'group' });
        }
        setShowCreateGroup(false);
        setIsEditingGroup(false);
        setNewGroupName("");
        setSelectedGroupMembers([]);
      }
    } catch (err) {
      console.error("Error creating/updating group:", err);
    }
  };

  const handleToggleMember = (empId: string) => {
    setSelectedGroupMembers(prev => 
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };
  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm("Are you sure you want to delete this group? This will delete all messages permanently.")) return;
    try {
      const res = await fetch(`${API_URL}/chat/groups/${groupId}`, { method: 'DELETE' });
      if (res.ok) {
        setChatGroups(prev => prev.filter(g => g.id !== groupId));
        setSelectedChat(null as any);
        alert("Group deleted successfully.");
      }
    } catch (err) {
      console.error("Error deleting group:", err);
    }
  };

  const handleToggleSave = async (msgId: string) => {
    try {
      const res = await fetch(`${API_URL}/chat/messages/${msgId}/toggle-save`, { method: 'POST' });
      if (res.ok) {
        fetchMessages();
      }
    } catch (err) {
      console.error("Error toggling save:", err);
    }
  };

  const handleTogglePin = async (msgId: string) => {
    try {
      const res = await fetch(`${API_URL}/chat/messages/${msgId}/toggle-pin`, { method: 'POST' });
      if (res.ok) {
        fetchMessages();
      }
    } catch (err) {
      console.error("Error toggling pin:", err);
    }
  };

  const handleUpdateMessage = async (msgId: string) => {
    try {
      const res = await fetch(`${API_URL}/chat/messages/${msgId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editText })
      });
      if (res.ok) {
        setEditingMessageId(null);
        fetchMessages();
      }
    } catch (err) {
      console.error("Error updating message:", err);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!confirm("Delete this message?")) return;
    try {
      const res = await fetch(`${API_URL}/chat/messages/${msgId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchMessages();
      }
    } catch (err) {
      console.error("Error deleting message:", err);
    }
  };

  const scrollToMessage = (msgId: string) => {
    shouldScrollToBottom.current = false;
    const element = document.getElementById(`msg-${msgId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Optional: highlight the message temporarily
      element.classList.add('ring-2', 'ring-brand-teal', 'ring-offset-2');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-brand-teal', 'ring-offset-2');
      }, 2000);
    }
  };

  const handleForwardMessage = async (recipientId: string) => {
    if (!forwardingMessage || !user) return;

    const payload = {
      senderId: user.id,
      receiverId: recipientId,
      text: forwardingMessage.text,
      type: "personal",
      forwardedFrom: user.name
    };

    try {
      const res = await fetch(`${API_URL}/chat/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setForwardingMessage(null);
        // If we are currently chatting with the recipient, refresh messages
        if (selectedChat?.id === recipientId) {
          fetchMessages();
        }
        alert("Message forwarded successfully!");
      }
    } catch (err) {
      console.error("Error forwarding message:", err);
    }
  };

  const chats = useMemo(() => {
    return employees
      .filter((emp: any) => emp.id !== user?.id) // Don't chat with self
      .map((emp: any) => {
        const summary = chatSummaries[emp.id];
        return {
          id: emp.id || emp.employeeId,
          name: emp.name,
          status: "Online",
          lastMessage: summary?.lastMessage || "Click to start chatting",
          time: summary?.timestamp ? dayjs(summary.timestamp).format("hh:mm A") : "",
          timestamp: summary?.timestamp || 0,
          avatar: emp.profilePhoto,
          type: "personal"
        };
      })
      .sort((a: any, b: any) => {
        // Sort by timestamp descending
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });
  }, [employees, user?.id, chatSummaries]);

  const filteredChats = chats.filter((c: any) => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedMessages = currentMessages.filter(m => m.isPinned);
  const savedMessagesList = useMemo(() => {
    return currentMessages.filter(m => m.isSaved);
  }, [currentMessages]);

  const displayMessages = useMemo(() => {
    if (!messageSearchQuery) return currentMessages;
    return currentMessages.filter(m => 
      m.text.toLowerCase().includes(messageSearchQuery.toLowerCase())
    );
  }, [currentMessages, messageSearchQuery]);

  const totalPersonalUnread = useMemo(() => {
    return Object.entries(unreadCounts).reduce((acc, [id, count]) => {
      // If id is not in chatGroups, it's personal
      if (!chatGroups.some(g => g.id === id)) {
        return acc + (count as number);
      }
      return acc;
    }, 0);
  }, [unreadCounts, chatGroups]);

  const totalGroupsUnread = useMemo(() => {
    return Object.entries(unreadCounts).reduce((acc, [id, count]) => {
      if (chatGroups.some(g => g.id === id)) {
        return acc + (count as number);
      }
      return acc;
    }, 0);
  }, [unreadCounts, chatGroups]);

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
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-brand-teal h-8 w-8"
              onClick={() => setShowNewChat(true)}
            >
              <UserPlus className="w-5 h-5" />
            </Button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts..." 
              className="pl-9 bg-white border-border rounded-lg h-10 shadow-sm" 
            />
          </div>
        </div>

        <Tabs defaultValue="Personal" value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pb-4">
            <TabsList className="w-full bg-white border border-border p-1 rounded-lg">
              <TabsTrigger value="Personal" className="flex-1 py-2 text-[11px] font-bold rounded-md data-[state=active]:bg-brand-teal data-[state=active]:text-white relative">
                Personal
                {totalPersonalUnread > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                    {totalPersonalUnread}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="Groups" className="flex-1 py-2 text-[11px] font-bold rounded-md data-[state=active]:bg-brand-teal data-[state=active]:text-white relative">
                Groups
                {totalGroupsUnread > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                    {totalGroupsUnread}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="Saved" className="flex-1 py-2 text-[11px] font-bold rounded-md data-[state=active]:bg-brand-teal data-[state=active]:text-white">
                Saved
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <TabsContent value="Personal" className="m-0">
              {isLoading ? (
                <div className="p-8 text-center text-xs text-muted-foreground">Loading contacts...</div>
              ) : filteredChats.length > 0 ? (
                filteredChats.map((chat: any) => (
                  <div 
                    key={chat.id}
                    onClick={() => setSelectedChat(chat)}
                    className={cn(
                      "flex items-center gap-4 p-4 cursor-pointer transition-all border-b border-border/50 hover:bg-gray-50",
                      selectedChat?.id === chat.id && "bg-brand-teal/5 border-l-4 border-l-brand-teal"
                    )}
                  >
                    <div className="relative">
                      <Avatar className="w-12 h-12 border-2 border-white shadow-sm ring-1 ring-border">
                        {chat.avatar ? (
                          <AvatarImage src={chat.avatar} />
                        ) : (
                          <AvatarFallback className="bg-brand-light text-brand-teal font-bold uppercase">
                            {chat.name[0]}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      {chat.status === "Online" && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-[14px] text-foreground truncate">{chat.name}</h3>
                        <span className="text-[10px] font-semibold text-muted-foreground">{chat.time}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12px] text-muted-foreground truncate">{chat.lastMessage}</p>
                        {unreadCounts[chat.id] > 0 && (
                          <Badge className="bg-brand-teal text-white text-[10px] h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full border-none">
                            {unreadCounts[chat.id]}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center mt-10">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No chats found</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="Groups" className="m-0">
              <div className="p-4">
                <Button 
                  className="w-full bg-brand-teal hover:bg-brand-teal/90 rounded-xl gap-2"
                  onClick={() => setShowCreateGroup(true)}
                >
                  <Plus className="w-4 h-4" /> Create New Group
                </Button>
              </div>
              {chatGroups.length > 0 ? (
                chatGroups.map((group: any) => (
                  <div 
                    key={group.id}
                    onClick={() => setSelectedChat({ ...group, type: 'group' })}
                    className={cn(
                      "flex items-center gap-4 p-4 cursor-pointer transition-all border-b border-border/50 hover:bg-gray-50",
                      selectedChat?.id === group.id && "bg-brand-teal/5 border-l-4 border-l-brand-teal"
                    )}
                  >
                    <div className="relative">
                      <Avatar className="w-12 h-12 border-2 border-white shadow-sm ring-1 ring-border">
                        {group.avatar ? (
                          <AvatarImage src={group.avatar} />
                        ) : (
                          <AvatarFallback className="bg-brand-light text-brand-teal font-bold">
                            <Users className="w-6 h-6" />
                          </AvatarFallback>
                        )}
                      </Avatar>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-[14px] text-foreground truncate">{group.name}</h3>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] font-semibold text-muted-foreground">{group.lastMessageTime}</span>
                          {unreadCounts[group.id] > 0 && (
                            <Badge className="bg-brand-teal text-white text-[10px] h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full border-none">
                              {unreadCounts[group.id]}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-[12px] text-muted-foreground truncate">
                        {group.lastMessage || `${group.members.length} members`}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <p className="text-sm">You haven't joined any groups yet.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="Saved" className="m-0">
              {savedMessagesList.length > 0 ? (
                savedMessagesList.map((msg: any) => (
                  <div 
                    key={msg.id}
                    className="p-4 border-b border-border/50 hover:bg-gray-50 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-brand-teal uppercase tracking-wider">Saved Message</span>
                      <span className="text-[10px] text-muted-foreground">{dayjs(msg.timestamp).format("MMM DD, hh:mm A")}</span>
                    </div>
                    <div className="bg-white border border-border p-3 rounded-xl text-xs text-slate-700 shadow-sm">
                      {msg.text}
                    </div>
                    <div className="mt-2 flex justify-end">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-[10px] text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleToggleSave(msg.id)}
                      >
                        Remove from saved
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center mt-10">
                  <div className="w-16 h-16 bg-brand-teal/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bookmark className="w-6 h-6 text-brand-teal" />
                  </div>
                  <h3 className="font-bold text-foreground mb-1">No saved messages</h3>
                  <p className="text-xs text-muted-foreground px-4">
                    Save important messages to see them here for quick access later.
                  </p>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
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
                  <p className="text-[11px] font-semibold text-emerald-600">
                    {selectedChat.type === 'group' ? `${selectedChat.members?.length || 0} Members` : selectedChat.status}
                  </p>
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
                {isSearchingMessages ? (
                  <div className="flex items-center gap-2 bg-gray-50 border border-border px-3 py-1 rounded-full animate-in slide-in-from-right-2">
                    <Search className="w-3.5 h-3.5 text-muted-foreground" />
                    <input 
                      autoFocus
                      placeholder="Search in chat..."
                      value={messageSearchQuery}
                      onChange={(e) => setMessageSearchQuery(e.target.value)}
                      className="bg-transparent border-none focus:outline-none text-[12px] w-32"
                    />
                    <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full hover:bg-gray-200" onClick={() => { setIsSearchingMessages(false); setMessageSearchQuery(""); }}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-muted-foreground h-9 w-9 rounded-full hover:bg-gray-100"
                    onClick={() => setIsSearchingMessages(true)}
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                )}
                
                {selectedChat.type === 'group' && selectedChat.createdBy === user?.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-muted-foreground h-9 w-9 rounded-full hover:bg-gray-100">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem 
                        className="gap-2"
                        onClick={() => {
                          setNewGroupName(selectedChat.name);
                          setSelectedGroupMembers(selectedChat.members);
                          setIsEditingGroup(true);
                          setShowCreateGroup(true);
                        }}
                      >
                        <Pencil className="w-4 h-4" /> Edit Group
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="gap-2 text-red-600"
                        onClick={() => handleDeleteGroup(selectedChat.id)}
                      >
                        <Trash2 className="w-4 h-4" /> Delete Group
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            {/* Pinned Message Banner */}
            {pinnedMessages.length > 0 && (
              <div 
                onClick={() => scrollToMessage(pinnedMessages[pinnedMessages.length - 1].id)}
                className="bg-brand-teal/5 border-b border-brand-teal/10 px-6 py-2 flex items-center justify-between animate-in fade-in slide-in-from-top-1 cursor-pointer hover:bg-brand-teal/10 transition-colors"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="bg-brand-teal/10 p-1.5 rounded-lg">
                    <Pin className="w-3.5 h-3.5 text-brand-teal fill-current shrink-0" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-brand-teal uppercase tracking-tighter leading-none mb-0.5">Pinned Message</p>
                    <p className="text-[11px] text-muted-foreground truncate italic">
                      "{pinnedMessages[pinnedMessages.length - 1].text}"
                    </p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[10px] font-bold text-brand-teal hover:bg-brand-teal/10"
                >
                  View
                </Button>
              </div>
            )}

            {/* Chat Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-8 bg-gray-50/20"
            >
              <div className="flex justify-center">
                <span className="px-3 py-1 bg-white border border-border rounded-full text-[10px] font-bold text-muted-foreground uppercase tracking-wider shadow-sm">
                  Conversation with {selectedChat.name}
                </span>
              </div>

              {displayMessages.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm text-muted-foreground">
                    {messageSearchQuery ? "No messages matching your search." : `No messages yet. Say hi to ${selectedChat.name}!`}
                  </p>
                </div>
              ) : displayMessages.map((msg) => (
                <div 
                  key={msg.id}
                  id={`msg-${msg.id}`}
                  className={cn(
                    "flex items-start gap-3 group",
                    msg.isMe ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  {!msg.isMe && (
                    <Avatar className="w-9 h-9 border border-border shrink-0 mt-1">
                      {selectedChat.avatar && <AvatarImage src={selectedChat.avatar} />}
                      <AvatarFallback className="bg-slate-200 text-slate-600 font-bold text-[10px]">
                        {selectedChat.name[0]}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={cn(
                    "flex flex-col gap-1.5 max-w-[70%]",
                    msg.isMe ? "items-end" : "items-start"
                  )}>
                    {editingMessageId === msg.id ? (
                      <div className="flex flex-col gap-2 bg-white p-3 rounded-xl border border-brand-teal shadow-sm min-w-[200px]">
                        <Input 
                          value={editText} 
                          onChange={(e) => setEditText(e.target.value)} 
                          className="text-xs h-8"
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => setEditingMessageId(null)}>Cancel</Button>
                          <Button size="sm" className="h-7 text-[10px] bg-brand-teal" onClick={() => handleUpdateMessage(msg.id)}>Save</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative group/msg">
                        <div className={cn(
                          "px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-sm",
                          msg.isMe 
                            ? "bg-brand-teal text-white rounded-tr-none" 
                            : "bg-white border border-border text-slate-700 rounded-tl-none"
                        )}>
                          <div className="flex items-center justify-between gap-4 mb-1">
                            <div className="flex items-center gap-2">
                              {msg.isPinned && <Pin className={cn("w-3 h-3 fill-current", msg.isMe ? "text-white" : "text-brand-teal")} />}
                              {msg.isSaved && <Bookmark className={cn("w-3 h-3 fill-current", msg.isMe ? "text-white" : "text-brand-teal")} />}
                            </div>
                            {msg.forwardedFrom && (
                              <>
                                <div className={cn(
                                  "flex items-center gap-1.5 py-0.5 px-2 rounded-md w-fit text-[10px] font-bold uppercase tracking-wider",
                                  msg.isMe ? "bg-white/20 text-white" : "bg-brand-teal/10 text-brand-teal"
                                )}>
                                  <Forward className="w-3 h-3" />
                                  Forwarded
                                </div>
                                <div className={cn(
                                  "border-l-2 pl-3 py-0.5 text-xs italic opacity-90",
                                  msg.isMe ? "border-white/40" : "border-brand-teal/40"
                                )}>
                                  {msg.text}
                                </div>
                              </>
                            )}
                          </div>
                          {!msg.forwardedFrom && (
                            <>
                              {msg.replyToText && (
                                <div className={cn(
                                  "mb-2 p-2 rounded-lg border-l-4 text-[11px] bg-black/5",
                                  msg.isMe ? "border-white/50 text-white/90" : "border-brand-teal text-muted-foreground"
                                )}>
                                  <div className="font-bold opacity-70 mb-0.5">
                                    {msg.isMe ? "Replying to" : selectedChat.name}
                                  </div>
                                  <div className="truncate">{msg.replyToText}</div>
                                </div>
                              )}
                              {msg.attachmentName && (
                                <div className={cn(
                                  "flex items-center gap-3 p-3 rounded-xl mb-2 border",
                                  msg.isMe ? "bg-white/10 border-white/20" : "bg-gray-50 border-border"
                                )}>
                                  <div className={cn(
                                    "p-2 rounded-lg",
                                    msg.isMe ? "bg-white/20" : "bg-brand-teal/10"
                                  )}>
                                    <FileIcon className={cn("w-5 h-5", msg.isMe ? "text-white" : "text-brand-teal")} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-bold text-xs truncate">{msg.attachmentName}</p>
                                    <p className="text-[10px] opacity-70">Click to download</p>
                                  </div>
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className={cn("h-8 w-8 rounded-full", msg.isMe ? "hover:bg-white/20 text-white" : "hover:bg-brand-teal/10 text-brand-teal")}
                                    onClick={() => handleDownload(msg.attachmentUrl, msg.attachmentName)}
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                              {msg.text}
                            </>
                          )}
                          {msg.isEdited && <span className="ml-2 text-[8px] opacity-60 italic">(edited)</span>}
                        </div>
                        
                        <div className={cn(
                          "absolute top-1/2 -translate-y-1/2 opacity-0 group-hover/msg:opacity-100 transition-opacity",
                          msg.isMe ? "-left-10" : "-right-10"
                        )}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-gray-100">
                                <MoreVertical className="w-4 h-4 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={msg.isMe ? "end" : "start"} className="w-56">
                              <DropdownMenuItem 
                                className="gap-2"
                                onClick={() => setReplyingTo(msg)}
                              >
                                <Reply className="w-4 h-4" /> Reply
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="gap-2"
                                onClick={() => setForwardingMessage(msg)}
                              >
                                <Forward className="w-4 h-4" /> Forward message...
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="gap-2"
                                onClick={() => handleToggleSave(msg.id)}
                              >
                                <Bookmark className={cn("w-4 h-4", msg.isSaved && "fill-current text-brand-teal")} /> 
                                {msg.isSaved ? "Unsave" : "Save for later"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="gap-2"
                                onClick={() => {
                                  navigator.clipboard.writeText(msg.text);
                                }}
                              >
                                <Copy className="w-4 h-4" /> Copy message
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2">
                                <LinkIcon className="w-4 h-4" /> Copy link
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="gap-2"
                                onClick={() => handleTogglePin(msg.id)}
                              >
                                <Pin className={cn("w-4 h-4", msg.isPinned && "fill-current text-brand-teal")} /> 
                                {msg.isPinned ? "Unpin from conversation" : "Pin to this conversation"}
                              </DropdownMenuItem>
                              
                              {msg.isMe && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="gap-2 text-brand-teal"
                                    onClick={() => { setEditingMessageId(msg.id); setEditText(msg.text); }}
                                  >
                                    <Pencil className="w-4 h-4" /> Edit message
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="gap-2 text-red-600 focus:text-red-600 focus:bg-red-50"
                                    onClick={() => handleDeleteMessage(msg.id)}
                                  >
                                    <Trash2 className="w-4 h-4" /> Delete message
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    )}
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">
                      {dayjs(msg.timestamp).format("hh:mm A")}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-border bg-white">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileSelect}
              />

              {replyingTo && (
                <div className="max-w-4xl mx-auto mb-2 flex items-center justify-between bg-gray-50 p-3 rounded-xl border-l-4 border-brand-teal animate-in slide-in-from-bottom-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-brand-teal uppercase">Replying to {replyingTo.isMe ? "Yourself" : selectedChat.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{replyingTo.text}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setReplyingTo(null)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}

              {pendingFile && (
                <div className="max-w-4xl mx-auto mb-2 flex items-center justify-between bg-brand-teal/5 p-3 rounded-xl border border-brand-teal/20 animate-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="bg-brand-teal/10 p-2 rounded-lg">
                      <FileIcon className="w-4 h-4 text-brand-teal" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-brand-teal uppercase">Ready to send</p>
                      <p className="text-xs text-muted-foreground truncate">{pendingFile.name}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full text-red-500 hover:bg-red-50" onClick={() => setPendingFile(null)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}

              <form 
                onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                className="max-w-4xl mx-auto flex items-center gap-3 bg-gray-50/50 p-2 rounded-2xl border border-border"
              >
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="text-muted-foreground hover:bg-white rounded-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="w-5 h-5" />
                </Button>
                <Input 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`Type your message to ${selectedChat.name}...`}
                  className="flex-1 bg-transparent border-none focus-visible:ring-0 shadow-none text-sm placeholder:text-muted-foreground h-11"
                />
                <div className="relative">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="text-muted-foreground hover:bg-white rounded-full"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    <Smile className="w-5 h-5" />
                  </Button>
                  
                  {showEmojiPicker && (
                    <div className="absolute bottom-full right-0 mb-4 p-3 bg-white border border-border rounded-2xl shadow-2xl grid grid-cols-6 gap-2 w-64 animate-in fade-in zoom-in-95 duration-200 z-50">
                      {commonEmojis.map(emoji => (
                        <button 
                          key={emoji}
                          type="button"
                          onClick={() => handleAddEmoji(emoji)}
                          className="text-xl hover:bg-gray-100 p-1.5 rounded-lg transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button 
                  type="submit"
                  className="bg-brand-teal hover:bg-brand-teal-light text-white rounded-full w-11 h-11 p-0 shadow-md"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </form>
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

      <Dialog open={!!forwardingMessage} onOpenChange={(open) => !open && setForwardingMessage(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Forward Message</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search people..." 
                className="pl-9"
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-1">
              {filteredChats.map((chat: any) => (
                <div 
                  key={chat.id}
                  onClick={() => handleForwardMessage(chat.id)}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-gray-100"
                >
                  <Avatar className="w-10 h-10 border border-border">
                    {chat.avatar && <AvatarImage src={chat.avatar} />}
                    <AvatarFallback className="bg-brand-light text-brand-teal font-bold text-xs">
                      {chat.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-foreground truncate">{chat.name}</h4>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Send Message</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-brand-teal font-bold text-xs h-8">
                    Send
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Create Group Dialog */}
      <Dialog open={showCreateGroup} onOpenChange={(open) => {
        setShowCreateGroup(open);
        if (!open) setIsEditingGroup(false);
      }}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-brand-teal">
              {isEditingGroup ? "Edit Group" : "Create New Group"}
            </DialogTitle>
            <DialogDescription>
              {isEditingGroup ? "Update group details and membership." : "Create a team conversation and invite your colleagues."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-[12px] font-bold text-slate-500 uppercase">Group Name</Label>
              <Input
                id="name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Enter group name..."
                className="rounded-xl border-border h-11"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-[12px] font-bold text-slate-500 uppercase">Select Members</Label>
              <div className="max-h-[200px] overflow-y-auto border border-border rounded-xl p-2 space-y-1">
                {chats.map((emp: any) => (
                  <div 
                    key={emp.id} 
                    className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                    onClick={() => handleToggleMember(emp.id)}
                  >
                    <Checkbox 
                      id={`emp-${emp.id}`} 
                      checked={selectedGroupMembers.includes(emp.id)}
                      onCheckedChange={() => handleToggleMember(emp.id)}
                    />
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={emp.avatar} />
                      <AvatarFallback className="bg-brand-light text-brand-teal text-[10px]">{emp.name[0]}</AvatarFallback>
                    </Avatar>
                    <label
                      htmlFor={`emp-${emp.id}`}
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      {emp.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => {
              setShowCreateGroup(false);
              setIsEditingGroup(false);
            }} className="rounded-xl">Cancel</Button>
            <Button 
              onClick={handleCreateGroup}
              disabled={!newGroupName.trim() || selectedGroupMembers.length === 0}
              className="bg-brand-teal hover:bg-brand-teal/90 text-white rounded-xl px-8"
            >
              {isEditingGroup ? "Save Changes" : "Create Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Chat Dialog */}
      <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-brand-teal">Start New Chat</DialogTitle>
            <DialogDescription>
              Select a colleague to start a private conversation.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search colleagues..."
                className="pl-10 rounded-xl"
                // Optional: add local search state here
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-1 pr-2">
              {employees.filter((e: any) => e.id !== user?.id).map((emp: any) => (
                <div 
                  key={emp.id}
                  onClick={() => {
                    setSelectedChat({
                      id: emp.id || emp.employeeId,
                      name: emp.name,
                      status: "Online",
                      avatar: emp.profilePhoto,
                      type: "personal"
                    });
                    setShowNewChat(false);
                    setActiveTab("Personal");
                  }}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-gray-100"
                >
                  <Avatar className="w-10 h-10 border border-border">
                    {emp.profilePhoto && <AvatarImage src={emp.profilePhoto} />}
                    <AvatarFallback className="bg-brand-light text-brand-teal font-bold text-xs">
                      {emp.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800">{emp.name}</p>
                    <p className="text-[11px] text-muted-foreground">{emp.designation || "Colleague"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
