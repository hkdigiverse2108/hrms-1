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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EmojiPicker } from "@/components/chat/EmojiPicker";
import { Textarea } from "@/components/ui/textarea";
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
  CheckCheck,
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
  UserMinus,
  Filter,
  Check,
  Clock,
  Layout,
  ExternalLink,
  Home,
  Bookmark,
  Reply,
  Forward,
  Copy,
  BellOff,
  Archive,
  Link as LinkIcon,
  Pin,
  Mic,
  BarChart2,
  Play,
  Pause,
  Square
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
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const [laterTab, setLaterTab] = useState<"In progress" | "Archived" | "Completed">("In progress");
  const [showDeletedNotification, setShowDeletedNotification] = useState(true); // Placeholder for demo, normally would be based on actual deletion events
  const [showNewChat, setShowNewChat] = useState(false);

  const [chatChannels, setChatChannels] = useState<any[]>([]);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelData, setNewChannelData] = useState({ name: "", description: "" });
  const [editingChannel, setEditingChannel] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<any>(null);
  const [showGroupMembers, setShowGroupMembers] = useState(false);
  const [globalSavedMessages, setGlobalSavedMessages] = useState<any[]>([]);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [chatFiles, setChatFiles] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [newStatusEmoji, setNewStatusEmoji] = useState("💬");
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [pollData, setPollData] = useState({ 
    question: "", 
    options: ["", ""], 
    isMultiple: false 
  });
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shouldScrollToBottom = useRef(true);
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const typingTimeoutRef = useRef<any>(null);


  const scrollToBottom = () => {
    if (scrollRef.current && shouldScrollToBottom.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      shouldScrollToBottom.current = false;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages]);

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_URL}/employees`);
      if (res.ok) {
        setEmployees(await res.json());
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  const fetchTypingStatus = async () => {
    if (!user || !selectedChat) return;
    try {
      const res = await fetch(`${API_URL}/chat/typing/${selectedChat.id}?user_id=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setTypingUsers(data.typingUsers);
      }
    } catch (err) {
      console.error("Error fetching typing status:", err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUnreadCounts();
      fetchChatSummaries();
      fetchChannels();
      fetchSavedMessages();
      fetchEmployees();
      const interval = setInterval(() => {
        fetchUnreadCounts();
        fetchChatSummaries();
        fetchSavedMessages();
        fetchEmployees();
        fetchTypingStatus();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [user, selectedChat]);

  const fetchChannels = async () => {
    try {
      const res = await fetch(`${API_URL}/chat/channels`);
      if (res.ok) {
        const data = await res.json();
        setChatChannels(data.map((c: any) => ({ ...c, type: 'general' })));
      }
    } catch (err) {
      console.error("Error fetching channels:", err);
    }
  };

  const handleCreateChannel = async () => {
    if (!newChannelData.name) return;
    try {
      const res = await fetch(`${API_URL}/chat/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newChannelData)
      });
      if (res.ok) {
        setNewChannelData({ name: "", description: "" });
        setShowCreateChannel(false);
        fetchChannels();
        alert("Channel created successfully!");
      }
    } catch (err) {
      console.error("Error creating channel:", err);
    }
  };

  const handleUpdateChannel = async () => {
    if (!editingChannel || !editingChannel.name) return;
    try {
      const res = await fetch(`${API_URL}/chat/channels/${editingChannel.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingChannel.name, description: editingChannel.description })
      });
      if (res.ok) {
        setEditingChannel(null);
        fetchChannels();
        alert("Channel updated successfully!");
      }
    } catch (err) {
      console.error("Error updating channel:", err);
    }
  };

  const handleDeleteChannel = async (channelId: string) => {
    if (!confirm("Are you sure you want to delete this channel and all its messages?")) return;
    try {
      const res = await fetch(`${API_URL}/chat/channels/${channelId}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedChat?.id === channelId) setSelectedChat(null);
        fetchChannels();
        alert("Channel deleted successfully!");
      }
    } catch (err) {
      console.error("Error deleting channel:", err);
    }
  };

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

  const fetchSavedMessages = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/chat/saved-messages/${user.id}`);
      if (res.ok) {
        setGlobalSavedMessages(await res.json());
      }
    } catch (err) {
      console.error("Error fetching saved messages:", err);
    }
  };

  const fetchChatFiles = async () => {
    if (!selectedChat || !user) return;
    try {
      const isGroup = selectedChat.type === 'group' || selectedChat.type === 'general';
      const res = await fetch(`${API_URL}/chat/files/${user.id}/${selectedChat.id}?is_group=${isGroup}`);
      if (res.ok) {
        setChatFiles(await res.json());
      }
    } catch (err) {
      console.error("Error fetching chat files:", err);
    }
  };

  const markAsSeen = async (chatId?: string) => {
    const targetId = chatId || selectedChat?.id;
    if (!targetId || !user) return;
    try {
      await fetch(`${API_URL}/chat/mark-seen/${targetId}/${user.id}`, { method: 'POST' });
      // Small delay before refresh to ensure DB consistency
      setTimeout(() => fetchUnreadCounts(), 500);
    } catch (err) {
      console.error("Error marking as seen:", err);
    }
  };

  const handleSelectChat = (chat: any) => {
    if (!chat) return;
    setSelectedChat(chat);
    // Force immediate local clear
    const chatId = chat.id || chat.employeeId;
    if (chatId) {
      setUnreadCounts(prev => {
        const next = { ...prev };
        delete next[chatId];
        return next;
      });
      markAsSeen(chatId);
    }
  };

  const fetchMessages = React.useCallback(async () => {
    if (!selectedChat || !user) return;
    try {
      const url = (selectedChat.type === 'group' || selectedChat.type === 'general')
        ? `${API_URL}/chat/messages/${user.id}/${selectedChat.id}?group_id=${selectedChat.id}`
        : `${API_URL}/chat/messages/${user.id}/${selectedChat.id}`;
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        // Mark which messages are mine
        const marked = data.map((m: any) => ({
          ...m,
          isMe: m.senderId === user.id
        }));
        setCurrentMessages(marked);
        
        // If there are unread messages from others, mark them seen
        const hasUnread = marked.some(m => !m.isMe && (!m.seenBy || !m.seenBy.includes(user.id)));
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
      fetchChatFiles();
      const interval = setInterval(() => {
        fetchMessages();
        fetchGroups();
      }, 3000);
      return () => clearInterval(interval);
    } else if (user) {
      fetchGroups();
    }
  }, [selectedChat, user, fetchMessages, fetchGroups]);

  const handleSendMessage = async (extraData: any = null) => {
    if (!extraData && (!message.trim() && !pendingFile) || !selectedChat || !user) return;

    let payload: any = {
      senderId: user.id,
      receiverId: (selectedChat.type === 'group' || selectedChat.type === 'general') ? "group" : selectedChat.id,
      groupId: (selectedChat.type === 'group' || selectedChat.type === 'general') ? selectedChat.id : null,
      text: message || (pendingFile ? `Sent a file: ${pendingFile.name}` : (extraData?.isVoice ? "Sent a voice message" : "")),
      type: (selectedChat.type === 'group' || selectedChat.type === 'general') ? "group" : "personal"
    };

    if (extraData) {
      payload = { ...payload, ...extraData };
    }

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

  const renderMessageText = (text: string) => {
    if (!text) return "";
    
    // First, handle @mentions
    const parts = text.split(/(@\w+)/g);
    const withMentions = parts.map((part, i) => {
      if (part.startsWith("@")) {
        const name = part.substring(1);
        const isMe = user?.name?.toLowerCase().includes(name.toLowerCase());
        return (
          <span 
            key={`mention-${i}`} 
            className={cn(
              "px-1.5 py-0.5 rounded-md font-bold text-[13px] transition-all cursor-pointer inline-block",
              isMe ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-brand-teal/10 text-brand-teal hover:bg-brand-teal/20"
            )}
          >
            {part}
          </span>
        );
      }
      
      // Then, handle search highlighting for non-mention parts
      if (!messageSearchQuery) return part;
      
      const searchParts = part.split(new RegExp(`(${messageSearchQuery})`, 'gi'));
      return searchParts.map((sp, j) => 
        sp.toLowerCase() === messageSearchQuery.toLowerCase() ? 
          <mark key={`search-${i}-${j}`} className="bg-yellow-200 text-slate-900 rounded-sm px-0.5">{sp}</mark> : 
          sp
      );
    });

    return withMentions;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingFile(file);
    }
  };



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
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/chat/messages/${msgId}/toggle-save?user_id=${user.id}`, { method: 'POST' });
      if (res.ok) {
        fetchMessages();
        fetchSavedMessages();
      }
    } catch (err) {
      console.error("Error toggling save:", err);
    }
  };

  const handleToggleArchive = async (messageId: string) => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/chat/messages/${messageId}/toggle-archive?user_id=${user.id}`, {
        method: 'POST'
      });
      if (res.ok) {
        fetchSavedMessages();
      }
    } catch (err) {
      console.error("Error archiving message:", err);
    }
  };

  const handleToggleComplete = async (messageId: string) => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/chat/messages/${messageId}/toggle-complete?user_id=${user.id}`, {
        method: 'POST'
      });
      if (res.ok) {
        fetchSavedMessages();
      }
    } catch (err) {
      console.error("Error completing message:", err);
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

  const handleDeleteMessage = (msg: any) => {
    setMessageToDelete(msg);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteMessage = async () => {
    if (!messageToDelete) return;
    try {
      const res = await fetch(`${API_URL}/chat/messages/${messageToDelete.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setShowDeleteConfirm(false);
        setMessageToDelete(null);
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

  const handleToggleReaction = async (msgId: string, emoji: string) => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/chat/messages/${msgId}/reaction?user_id=${user.id}&emoji=${encodeURIComponent(emoji)}`, {
        method: 'POST'
      });
      if (res.ok) {
        fetchMessages();
      }
    } catch (err) {
      console.error("Error toggling reaction:", err);
    }
  };

  const handleUpdateStatus = async (status: string, emoji: string) => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/employees/${user.id}/status?status=${encodeURIComponent(status)}&emoji=${encodeURIComponent(emoji)}`, {
        method: 'PUT'
      });
      if (res.ok) {
        const updatedUser = await res.json();
        localStorage.setItem('user', JSON.stringify(updatedUser));
        window.dispatchEvent(new Event('storage'));
        alert("Status updated!");
        setShowStatusPicker(false);
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  // Typing logic
  const handleTyping = () => {
    if (!user || !selectedChat) return;
    
    // Notify server we are typing
    fetch(`${API_URL}/chat/typing?chat_id=${selectedChat.id}&user_id=${user.id}&is_typing=true`, { method: 'POST' });
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      fetch(`${API_URL}/chat/typing?chat_id=${selectedChat.id}&user_id=${user.id}&is_typing=false`, { method: 'POST' });
    }, 3000);
  };

  // Voice Recording logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], "voice_message.webm", { type: 'audio/webm' });
        
        // Upload and send
        const formData = new FormData();
        formData.append('file', audioFile);
        
        try {
          const res = await fetch(`${API_URL}/chat/upload`, {
            method: 'POST',
            body: formData
          });
          if (res.ok) {
            const data = await res.json();
            handleSendMessage({ 
              isVoice: true, 
              attachmentUrl: data.url, 
              attachmentName: "Voice Message",
              voiceDuration: recordingDuration
            });
          }
        } catch (err) {
          console.error("Error uploading voice message:", err);
        }
        
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error starting recording:", err);
      alert("Please allow microphone access to record voice messages.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
    }
  };

  // Poll logic
  const handleCreatePoll = async () => {
    if (!pollData.question || pollData.options.some(o => !o)) return;
    
    const pollPayload = {
      question: pollData.question,
      isMultiple: pollData.isMultiple,
      options: pollData.options.map((opt, i) => ({
        id: `opt-${i}`,
        text: opt,
        votes: []
      }))
    };
    
    handleSendMessage({ poll: pollPayload, text: `Poll: ${pollData.question}` });
    setShowCreatePoll(false);
    setPollData({ question: "", options: ["", ""], isMultiple: false });
  };

  const handleVote = async (messageId: string, optionId: string) => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/chat/messages/${messageId}/vote?user_id=${user.id}&option_id=${optionId}`, {
        method: 'POST'
      });
      if (res.ok) {
        fetchMessages();
      }
    } catch (err) {
      console.error("Error voting:", err);
    }
  };


  const filteredLaterMessages = useMemo(() => {
    return globalSavedMessages.filter((msg: any) => {
      if (laterTab === "Archived") {
        return msg.archivedBy?.includes(user?.id);
      }
      if (laterTab === "Completed") {
        return msg.completedBy?.includes(user?.id);
      }
      // In progress: Saved but NOT archived and NOT completed
      return !msg.archivedBy?.includes(user?.id) && !msg.completedBy?.includes(user?.id);
    });
  }, [globalSavedMessages, laterTab, user?.id]);

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
    return currentMessages.filter(m => m.savedBy?.includes(user?.id));
  }, [currentMessages, user?.id]);

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

  const totalGeneralUnread = useMemo(() => {
    return Object.entries(unreadCounts).reduce((acc, [id, count]) => {
      if (chatChannels.some(c => c.id === id)) {
        return acc + (count as number);
      }
      return acc;
    }, 0);
  }, [unreadCounts, chatChannels]);

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
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-brand-teal h-8 w-8"
                  onClick={() => setShowNewChat(true)}
                >
                  <UserPlus className="w-5 h-5" />
                </Button>
              </div>
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
              <TabsTrigger value="General" className="flex-1 py-2 text-[11px] font-bold rounded-md data-[state=active]:bg-brand-teal data-[state=active]:text-white relative">
                General
                {totalGeneralUnread > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                    {totalGeneralUnread}
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
                    onClick={() => handleSelectChat(chat)}
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
                        <div className="flex items-center gap-1.5 min-w-0">
                          {employees.find(e => e.id === chat.id)?.statusEmoji && (
                            <span className="text-[10px] shrink-0">{employees.find(e => e.id === chat.id)?.statusEmoji}</span>
                          )}
                          <p className="text-[12px] text-muted-foreground truncate">
                            {employees.find(e => e.id === chat.id)?.customStatus || chat.lastMessage}
                          </p>
                        </div>
                        {unreadCounts[chat.id] > 0 && (
                          <Badge className="bg-[#00a884] text-white text-[10px] h-5 min-w-5 px-1 flex items-center justify-center rounded-full border-none font-bold">
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
              {(user?.role === 'Admin' || user?.role === 'HR') && (
                <div className="p-4">
                  <Button 
                    className="w-full bg-brand-teal hover:bg-brand-teal/90 rounded-xl gap-2"
                    onClick={() => setShowCreateGroup(true)}
                  >
                    <Plus className="w-4 h-4" /> Create New Group
                  </Button>
                </div>
              )}
              {chatGroups.length > 0 ? (
                chatGroups.map((group: any) => (
                  <div 
                    key={group.id}
                    onClick={() => handleSelectChat({ ...group, type: 'group' })}
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
                        <span className="text-[10px] font-semibold text-muted-foreground">{group.lastMessageTime}</span>
                      </div>
                    <div className="flex items-center gap-2">
                      {unreadCounts[group.id] > 0 ? (
                        <Badge className="bg-[#00a884] text-white text-[10px] h-5 min-w-5 px-1 flex items-center justify-center rounded-full border-none font-bold shrink-0">
                          {unreadCounts[group.id]}
                        </Badge>
                      ) : (
                         <div className="w-2 h-2 rounded-full bg-slate-200 shrink-0" />
                      )}
                      {(user?.role === 'Admin' || user?.role === 'HR' || group.createdBy === user?.id) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-white shrink-0">
                              <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem className="gap-2" onClick={(e) => { 
                              e.stopPropagation(); 
                              setNewGroupName(group.name);
                              setSelectedGroupMembers(group.members);
                              setIsEditingGroup(true);
                              setShowCreateGroup(true);
                              setSelectedChat({ ...group, type: 'group' });
                            }}>
                              <Pencil className="w-4 h-4 text-brand-teal" /> Edit Group
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="gap-2 text-red-600" onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}>
                              <Trash2 className="w-4 h-4" /> Delete Group
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <p className="text-sm">You haven't joined any groups yet.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="General" className="m-0">
              {(user?.role === "Admin" || user?.role === "HR") && (
                <div className="p-4">
                  <Button 
                    className="w-full bg-brand-teal hover:bg-brand-teal/90 rounded-xl gap-2"
                    onClick={() => setShowCreateChannel(true)}
                  >
                    <Plus className="w-4 h-4" /> Create New Channel
                  </Button>
                </div>
              )}
              <div className="p-4 space-y-2">
                {chatChannels.map((channel) => (
                  <div 
                    key={channel.id}
                    onClick={() => handleSelectChat(channel)}
                    className={cn(
                      "flex items-center gap-4 p-4 cursor-pointer transition-all border border-border/40 rounded-2xl hover:bg-white hover:shadow-md hover:border-brand-teal/20 group/channel",
                      selectedChat?.id === channel.id && "bg-brand-teal/5 border-brand-teal/30 shadow-sm"
                    )}
                  >
                    <div className="w-12 h-12 bg-brand-teal/5 rounded-2xl flex items-center justify-center shrink-0 border border-brand-teal/10">
                      <Hash className="w-6 h-6 text-brand-teal" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-[14px] text-foreground">{channel.name}</h3>
                      <p className="text-[12px] text-muted-foreground truncate">{channel.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {unreadCounts[channel.id] > 0 ? (
                        <Badge className="bg-brand-teal text-white text-[10px] h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full border-none">
                          {unreadCounts[channel.id]}
                        </Badge>
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-slate-200" />
                      )}
                      {(user?.role === "Admin" || user?.role === "HR") && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover/channel:opacity-100 transition-opacity">
                              <MoreVertical className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="gap-2" onClick={(e) => { e.stopPropagation(); setEditingChannel(channel); }}>
                              <Pencil className="w-4 h-4" /> Edit Channel
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="gap-2 text-red-600" onClick={(e) => { e.stopPropagation(); handleDeleteChannel(channel.id); }}>
                              <Trash2 className="w-4 h-4" /> Delete Channel
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="Saved" className="m-0 h-full">
              <div className="flex flex-col h-full bg-[#f8f8f8]">
                {/* Later Header */}
                <div className="p-4 bg-white border-b border-border/50 flex items-center justify-between shrink-0">
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">Later</h2>
                </div>
                
                {/* Sub Tabs */}
                <div className="flex items-center gap-6 px-6 py-2 bg-white border-b border-border/50 shrink-0">
                  {(["In progress", "Archived", "Completed"] as const).map((tab) => {
                    const count = globalSavedMessages.filter((msg: any) => {
                       if (tab === "Archived") return msg.archivedBy?.includes(user?.id);
                       if (tab === "Completed") return msg.completedBy?.includes(user?.id);
                       return !msg.archivedBy?.includes(user?.id) && !msg.completedBy?.includes(user?.id);
                    }).length;
                    return (
                      <button 
                        key={tab}
                        onClick={() => setLaterTab(tab)}
                        className={cn(
                          "text-[13px] font-bold pb-2 border-b-2 transition-all relative",
                          tab === laterTab ? "text-slate-900 border-slate-900" : "text-slate-500 border-transparent hover:text-slate-700"
                        )}
                      >
                        {tab} {count > 0 && <span className="ml-1 opacity-50">{count}</span>}
                      </button>
                    );
                  })}
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-4">
                    {/* Deleted notification area placeholder */}
                    {filteredLaterMessages.length > 0 && laterTab === "In progress" && showDeletedNotification && (
                      <div className="flex items-center justify-between p-3 bg-white border border-border/50 rounded-lg shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Trash2 className="w-5 h-5 text-slate-400" />
                          </div>
                          <p className="text-[13px] text-slate-600 font-medium">A message you saved was deleted.</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-600" onClick={() => setShowDeletedNotification(false)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}

                    {filteredLaterMessages.length > 0 ? (
                      filteredLaterMessages.map((msg: any) => {
                        const sender = employees.find(e => e.id === msg.senderId) || (msg.isMe ? user : null);
                        const isArchived = msg.archivedBy?.includes(user?.id);
                        const isCompleted = msg.completedBy?.includes(user?.id);

                        return (
                          <div key={msg.id} className="group relative bg-white border border-border/50 rounded-xl p-4 hover:shadow-md transition-all">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Direct Message</p>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className={cn("h-7 w-7 rounded-lg", isCompleted ? "text-brand-teal bg-brand-teal/10" : "text-slate-500")}
                                  onClick={() => handleToggleComplete(msg.id)}
                                  title={isCompleted ? "Mark as in progress" : "Mark as completed"}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className={cn("h-7 w-7 rounded-lg", isArchived ? "text-amber-600 bg-amber-50" : "text-slate-500")}
                                  onClick={() => handleToggleArchive(msg.id)}
                                  title={isArchived ? "Unarchive" : "Archive"}
                                >
                                  <Archive className="w-3.5 h-3.5" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-slate-500">
                                      <MoreVertical className="w-3.5 h-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48 p-1">
                                    <DropdownMenuItem 
                                      className="gap-2 text-[13px] font-medium py-2"
                                      onClick={() => handleToggleArchive(msg.id)}
                                    >
                                      <Archive className="w-4 h-4" /> {isArchived ? "Unarchive" : "Archive"}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="gap-2 text-[13px] font-bold py-2 text-red-600 focus:text-red-600 focus:bg-red-50"
                                      onClick={() => handleToggleSave(msg.id)}
                                    >
                                      <Trash2 className="w-4 h-4" /> Remove from Later
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                            
                            <div className="flex gap-3">
                              <Avatar className="w-10 h-10 rounded-lg shrink-0">
                                <AvatarImage src={sender?.profilePhoto} />
                                <AvatarFallback className="bg-brand-teal text-white rounded-lg font-bold">
                                  {sender?.name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2 mb-1">
                                  <span className="font-black text-slate-900 text-[14px]">{sender?.name}</span>
                                  <span className="text-[11px] text-slate-400 font-medium">{dayjs(msg.timestamp).format("h:mm A")}</span>
                                  {isCompleted && (
                                    <Badge variant="outline" className="text-[9px] h-4 bg-brand-teal/5 text-brand-teal border-brand-teal/20 ml-2">
                                      Completed
                                    </Badge>
                                  )}
                                  {isArchived && (
                                    <Badge variant="outline" className="text-[9px] h-4 bg-amber-50 text-amber-600 border-amber-200 ml-2">
                                      Archived
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-[14px] text-slate-700 leading-relaxed break-words">
                                  {renderMessageText(msg.text)}
                                </div>
                                {msg.attachmentUrl && (
                                  <div className="mt-3 p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                      <FileIcon className="w-4 h-4 text-slate-400 shrink-0" />
                                      <span className="text-[12px] font-bold text-slate-600 truncate">{msg.attachmentName}</span>
                                    </div>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 rounded-lg text-brand-teal hover:bg-white"
                                      onClick={() => handleDownload(msg.attachmentUrl, msg.attachmentName)}
                                    >
                                      <Download className="w-4 h-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-8 text-center mt-10">
                        <div className="w-16 h-16 bg-brand-teal/5 rounded-full flex items-center justify-center mx-auto mb-4">
                          {laterTab === "Archived" ? <Archive className="w-6 h-6 text-brand-teal" /> : 
                           laterTab === "Completed" ? <Check className="w-6 h-6 text-brand-teal" /> : 
                           <Bookmark className="w-6 h-6 text-brand-teal" />}
                        </div>
                        <h3 className="font-bold text-foreground mb-1">No {laterTab.toLowerCase()} messages</h3>
                        <p className="text-xs text-muted-foreground px-4">
                          {laterTab === "In progress" ? "Save important messages to see them here for quick access later." :
                           laterTab === "Archived" ? "Archived messages will appear here for reference." :
                           "Messages you mark as complete will be moved to this tab."}
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
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
                  {typingUsers.length > 0 ? (
                    <p className="text-[11px] font-bold text-brand-teal animate-pulse">
                      {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
                    </p>
                  ) : selectedChat.type === 'group' ? (
                    <div 
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded-full pr-2 transition-colors py-0.5"
                      onClick={() => setShowGroupMembers(true)}
                    >
                      <div className="flex -space-x-2 overflow-hidden">
                        {selectedChat.members?.slice(0, 3).map((memberId: string) => {
                          const member = employees.find((e: any) => e.id === memberId);
                          return (
                            <Avatar key={memberId} className="w-5 h-5 border-2 border-white ring-1 ring-border shrink-0">
                              <AvatarImage src={member?.profilePhoto} />
                              <AvatarFallback className="text-[8px] bg-brand-light text-brand-teal font-bold">
                                {member?.name?.[0] || "?"}
                              </AvatarFallback>
                            </Avatar>
                          );
                        })}
                      </div>
                      <p className="text-[11px] font-bold text-emerald-600">
                        {selectedChat.members?.length > 3 ? `+${selectedChat.members.length - 3} others` : `${selectedChat.members?.length || 0} Members`}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] font-semibold text-emerald-600">
                      {selectedChat.status}
                    </p>
                  )}
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
                
                {selectedChat.type === 'group' && (selectedChat.createdBy === user?.id || user?.role === 'Admin' || user?.role === 'HR') && (
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

                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn("text-muted-foreground h-9 w-9 rounded-full hover:bg-gray-100", showRightSidebar && "text-brand-teal bg-brand-teal/5")}
                  onClick={() => setShowRightSidebar(!showRightSidebar)}
                >
                  <FileIcon className="w-4 h-4" />
                </Button>
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
                              {msg.savedBy?.includes(user?.id) && <Bookmark className={cn("w-3 h-3 fill-current", msg.isMe ? "text-white" : "text-brand-teal")} />}
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
                              {msg.attachmentName && !msg.isVoice && (
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

                              {msg.isVoice && (
                                <div className={cn(
                                  "flex items-center gap-3 p-2 rounded-xl mb-2 min-w-[200px]",
                                  msg.isMe ? "bg-white/10" : "bg-gray-50"
                                )}>
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className={cn("h-9 w-9 rounded-full shrink-0", msg.isMe ? "text-white hover:bg-white/20" : "text-brand-teal hover:bg-brand-teal/10")}
                                    onClick={async () => {
                                      try {
                                        const fullUrl = msg.attachmentUrl.startsWith('http') ? msg.attachmentUrl : `${API_URL}${msg.attachmentUrl}`;
                                        const audio = new Audio(fullUrl);
                                        await audio.play();
                                      } catch (err) {
                                        console.error("Audio playback failed:", err);
                                        alert("Could not play voice message. The file might be missing or unsupported.");
                                      }
                                    }}
                                  >
                                    <Play className="w-5 h-5 fill-current" />
                                  </Button>
                                  <div className="flex-1 space-y-1">
                                    <div className="h-1 bg-current opacity-20 rounded-full w-full" />
                                    <div className="flex justify-between text-[9px] opacity-70 font-bold uppercase">
                                      <span>{msg.voiceDuration ? `${Math.floor(msg.voiceDuration / 60)}:${String(Math.floor(msg.voiceDuration % 60)).padStart(2, '0')}` : "0:00"}</span>
                                      <span>Voice Note</span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {msg.poll && (
                                <div className={cn(
                                  "p-4 rounded-xl border mb-2 min-w-[240px]",
                                  msg.isMe ? "bg-white/10 border-white/20" : "bg-white border-border"
                                )}>
                                  <div className="flex items-center gap-2 mb-3">
                                    <BarChart2 className="w-4 h-4" />
                                    <h4 className="font-bold text-[14px]">{msg.poll.question}</h4>
                                  </div>
                                  <div className="space-y-2">
                                    {msg.poll.options.map((option: any) => {
                                      const totalVotes = msg.poll.options.reduce((acc: number, opt: any) => acc + opt.votes.length, 0);
                                      const percentage = totalVotes > 0 ? (option.votes.length / totalVotes) * 100 : 0;
                                      const hasVoted = option.votes.includes(user?.id);

                                      return (
                                        <button 
                                          key={option.id}
                                          onClick={() => handleVote(msg.id, option.id)}
                                          className="w-full text-left group/opt relative overflow-hidden rounded-lg border border-border p-2.5 transition-all hover:border-brand-teal/50"
                                        >
                                          <div 
                                            className="absolute left-0 top-0 bottom-0 bg-brand-teal/10 transition-all duration-500" 
                                            style={{ width: `${percentage}%` }}
                                          />
                                          <div className="relative flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                              {hasVoted && <Check className="w-3.5 h-3.5 text-brand-teal" />}
                                              <span className="text-[12px] font-medium">{option.text}</span>
                                            </div>
                                            <span className="text-[10px] font-bold text-muted-foreground">{option.votes.length}</span>
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                  <p className="mt-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">
                                    {msg.poll.options.reduce((acc: number, opt: any) => acc + opt.votes.length, 0)} votes total
                                  </p>
                                </div>
                              )}

                              {renderMessageText(msg.text)}
                            </>
                          )}
                          {msg.isEdited && <span className="ml-2 text-[8px] opacity-60 italic">(edited)</span>}
                        </div>

                        {/* Reactions Display */}
                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                          <div className={cn(
                            "flex flex-wrap gap-1 mt-1",
                            msg.isMe ? "justify-end" : "justify-start"
                          )}>
                            {Object.entries(msg.reactions).map(([emoji, users]: [string, any]) => (
                              <button
                                key={emoji}
                                onClick={() => handleToggleReaction(msg.id, emoji)}
                                className={cn(
                                  "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border transition-all",
                                  users.includes(user?.id) 
                                    ? "bg-brand-teal/10 border-brand-teal/30 text-brand-teal" 
                                    : "bg-white border-border text-muted-foreground hover:bg-gray-50"
                                )}
                                title={users.map((id: string) => employees.find(e => e.id === id)?.name || "User").join(", ")}
                              >
                                <span>{emoji}</span>
                                <span className="font-bold">{users.length}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        
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
                                <Bookmark className={cn("w-4 h-4", msg.savedBy?.includes(user?.id) && "fill-current text-brand-teal")} /> 
                                {msg.savedBy?.includes(user?.id) ? "Unsave" : "Save for later"}
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
                              
                              {(msg.isMe || user?.role === "Admin" || user?.role === "HR") && (
                                <>
                                  <DropdownMenuSeparator />
                                  {msg.isMe && (
                                    <DropdownMenuItem 
                                      className="gap-2 text-brand-teal"
                                      onClick={() => { setEditingMessageId(msg.id); setEditText(msg.text); }}
                                    >
                                      <Pencil className="w-4 h-4" /> Edit message
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem 
                                    className="gap-2 text-red-600 focus:text-red-600 focus:bg-red-50"
                                    onClick={() => handleDeleteMessage(msg)}
                                  >
                                    <Trash2 className="w-4 h-4" /> Delete message
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuSeparator />
                              <div className="p-2 flex flex-wrap gap-1 justify-center">
                                {["👍", "❤️", "😂", "😮", "😢", "🔥"].map(emoji => (
                                  <Button
                                    key={emoji}
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full hover:bg-brand-teal/10 hover:text-brand-teal text-lg p-0"
                                    onClick={() => handleToggleReaction(msg.id, emoji)}
                                  >
                                    {emoji}
                                  </Button>
                                ))}
                              </div>
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
                  onChange={(e) => {
                    setMessage(e.target.value);
                    handleTyping();
                  }}
                  placeholder={`Type your message to ${selectedChat.name}...`}
                  className="flex-1 bg-transparent border-none focus-visible:ring-0 shadow-none text-sm placeholder:text-muted-foreground h-11"
                />
                <div className="flex items-center gap-1">
                  {isRecording ? (
                    <div className="flex items-center gap-3 bg-red-50 px-3 py-1 rounded-full animate-in fade-in zoom-in-95">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                      <span className="text-[11px] font-bold text-red-500 tabular-nums">
                        {Math.floor(recordingDuration / 60)}:{String(recordingDuration % 60).padStart(2, '0')}
                      </span>
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-red-500 hover:bg-red-100 rounded-full"
                        onClick={stopRecording}
                      >
                        <Square className="w-4 h-4 fill-current" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="icon" 
                        className="text-muted-foreground hover:bg-white rounded-full h-9 w-9"
                        onClick={() => setShowCreatePoll(true)}
                        title="Create Poll"
                      >
                        <BarChart2 className="w-5 h-5" />
                      </Button>
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="icon" 
                        className="text-muted-foreground hover:bg-white rounded-full h-9 w-9"
                        onClick={startRecording}
                        title="Voice Message"
                      >
                        <Mic className="w-5 h-5" />
                      </Button>
                    </>
                  )}
                  <div className="relative">
                    <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                      <PopoverTrigger asChild>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className={cn("text-muted-foreground hover:bg-white rounded-full", showEmojiPicker && "bg-brand-teal/10 text-brand-teal")}
                        >
                          <Smile className="w-5 h-5" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent side="top" align="end" className="p-0 border-none bg-transparent shadow-none w-auto mb-4 z-[100]">
                        <EmojiPicker 
                          onEmojiSelect={(emoji) => {
                            setMessage(prev => prev + emoji);
                            setShowEmojiPicker(false);
                          }}
                          onClose={() => setShowEmojiPicker(false)}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <Button 
                  type="submit"
                  disabled={!message.trim() && !pendingFile && !isRecording}
                  className={cn(
                    "bg-brand-teal hover:bg-brand-teal-light text-white rounded-full w-11 h-11 p-0 shadow-md transition-all",
                    (message.trim() || pendingFile || isRecording) ? "scale-100 opacity-100" : "scale-90 opacity-80"
                  )}
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

        {/* Right Sidebar - Shared Files Repository */}
        {selectedChat && showRightSidebar && (
          <div className="w-80 border-l border-border bg-gray-50/30 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="h-[88px] border-b border-border px-6 flex items-center justify-between bg-white shrink-0">
              <h3 className="font-bold text-slate-800">Shared Files</h3>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setShowRightSidebar(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-6">
                {chatFiles.length > 0 ? (
                  // Group files by date
                  Object.entries(
                    chatFiles.reduce((groups: any, file: any) => {
                      const date = dayjs(file.timestamp).format("MMMM YYYY");
                      if (!groups[date]) groups[date] = [];
                      groups[date].push(file);
                      return groups;
                    }, {})
                  ).map(([date, files]: [string, any]) => (
                    <div key={date}>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-2">{date}</h4>
                      <div className="space-y-2">
                        {files.map((file: any) => (
                          <div 
                            key={file.id} 
                            className="bg-white border border-border p-3 rounded-2xl hover:shadow-md transition-all group/file cursor-pointer"
                            onClick={() => handleDownload(file.attachmentUrl, file.attachmentName)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-brand-teal/5 flex items-center justify-center shrink-0 border border-brand-teal/10">
                                <FileIcon className="w-5 h-5 text-brand-teal" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-bold text-slate-800 truncate mb-0.5">{file.attachmentName || "Document"}</p>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                                  {dayjs(file.timestamp).format("MMM DD")} • Shared by {file.senderId === user?.id ? "You" : (employees.find((e: any) => e.id === file.senderId)?.name || "Member")}
                                </p>
                              </div>
                              <div className="opacity-0 group-hover/file:opacity-100 transition-opacity">
                                <Download className="w-4 h-4 text-brand-teal" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 px-6">
                    <div className="w-16 h-16 bg-white border-2 border-dashed border-border rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileIcon className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-bold text-slate-500 mb-1">No shared files yet</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">Shared documents, images, and other media will appear here for easy access.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
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

      {/* Group Members Dialog */}
      <Dialog open={showGroupMembers} onOpenChange={setShowGroupMembers}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-brand-teal">Group Members</DialogTitle>
            <DialogDescription>
              {selectedChat?.name} ({selectedChat?.members?.length || 0} members)
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[400px] overflow-y-auto space-y-3">
            {selectedChat?.members?.map((memberId: string) => {
              const member = employees.find((e: any) => e.id === memberId);
              if (!member) return null;
              return (
                <div key={memberId} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors">
                  <Avatar className="w-10 h-10 border border-border">
                    <AvatarImage src={member.profilePhoto} />
                    <AvatarFallback className="bg-brand-light text-brand-teal font-bold text-xs">
                      {member.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800">{member.name} {member.id === user?.id && "(You)"}</p>
                    <p className="text-[11px] text-muted-foreground">{member.designation || "Team Member"}</p>
                  </div>
                  {selectedChat.createdBy === memberId && (
                    <Badge variant="outline" className="text-[9px] h-5 border-brand-teal/20 text-brand-teal bg-brand-teal/5">
                      Admin
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Message Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[500px] bg-[#1a1c1e] border-none text-white rounded-3xl p-0 overflow-hidden">
          <div className="p-8 pb-6">
            <DialogHeader className="flex-row items-center justify-between mb-6 space-y-0">
              <DialogTitle className="text-2xl font-bold text-white">Delete message</DialogTitle>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8 rounded-full" onClick={() => setShowDeleteConfirm(false)}>
                <X className="w-5 h-5" />
              </Button>
            </DialogHeader>
            
            <p className="text-gray-400 text-lg mb-8 leading-relaxed">
              Are you sure you want to delete this message? This cannot be undone.
            </p>

            {messageToDelete && (
              <div className="bg-[#2a2d31]/50 border border-white/5 rounded-2xl p-6 mb-8">
                <div className="flex items-start gap-4">
                  <Avatar className="w-10 h-10 border border-white/10">
                    <AvatarImage src={messageToDelete.isMe ? user?.profilePhoto : selectedChat?.avatar} />
                    <AvatarFallback className="bg-brand-teal text-white font-bold uppercase text-xs">
                      {(messageToDelete.isMe ? user?.name : selectedChat?.name)?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-bold text-white text-[15px]">
                        {messageToDelete.isMe ? user?.name : selectedChat?.name}
                      </span>
                      <span className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">
                        {dayjs(messageToDelete.timestamp).format("MMM DD at hh:mm A")}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm break-words leading-relaxed">
                      {messageToDelete.text}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button 
                variant="ghost" 
                onClick={() => setShowDeleteConfirm(false)}
                className="text-white hover:bg-white/10 px-8 py-6 text-lg font-bold rounded-2xl border border-white/10"
              >
                Cancel
              </Button>
              <Button 
                onClick={confirmDeleteMessage}
                className="bg-[#be123c] hover:bg-[#9f1239] text-white px-10 py-6 text-lg font-bold rounded-2xl shadow-xl shadow-red-900/20"
              >
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Create/Edit Channel Dialog */}
      <Dialog 
        open={showCreateChannel || !!editingChannel} 
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateChannel(false);
            setEditingChannel(null);
            setNewChannelData({ name: "", description: "" });
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-brand-teal">
              {editingChannel ? "Edit Channel" : "Create New Channel"}
            </DialogTitle>
            <DialogDescription>
              {editingChannel 
                ? "Update the channel name and purpose." 
                : "Create a new organization-wide communication hub."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="channelName" className="text-[12px] font-bold text-slate-500 uppercase">Channel Name</Label>
              <Input 
                id="channelName" 
                placeholder="e.g. Announcements" 
                value={editingChannel ? editingChannel.name : newChannelData.name}
                onChange={(e) => {
                  if (editingChannel) {
                    setEditingChannel({ ...editingChannel, name: e.target.value });
                  } else {
                    setNewChannelData({ ...newChannelData, name: e.target.value });
                  }
                }}
                className="rounded-xl border-border focus:ring-brand-teal"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="channelDesc" className="text-[12px] font-bold text-slate-500 uppercase">Description</Label>
              <Textarea 
                id="channelDesc" 
                placeholder="What is this channel for?" 
                value={editingChannel ? editingChannel.description : newChannelData.description}
                onChange={(e) => {
                  if (editingChannel) {
                    setEditingChannel({ ...editingChannel, description: e.target.value });
                  } else {
                    setNewChannelData({ ...newChannelData, description: e.target.value });
                  }
                }}
                className="rounded-xl border-border focus:ring-brand-teal resize-none h-24"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => {
              setShowCreateChannel(false);
              setEditingChannel(null);
            }} className="rounded-xl">Cancel</Button>
            <Button 
              onClick={editingChannel ? handleUpdateChannel : handleCreateChannel}
              disabled={editingChannel ? !editingChannel.name.trim() : !newChannelData.name.trim()}
              className="bg-brand-teal hover:bg-brand-teal/90 text-white rounded-xl px-8"
            >
              {editingChannel ? "Save Changes" : "Create Channel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Poll Dialog */}
      <Dialog open={showCreatePoll} onOpenChange={setShowCreatePoll}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-brand-teal">Create a Poll</DialogTitle>
            <DialogDescription>
              Ask a question and gather feedback from the team.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label className="text-[12px] font-bold text-slate-500 uppercase">Question</Label>
              <Input
                value={pollData.question}
                onChange={(e) => setPollData({ ...pollData, question: e.target.value })}
                placeholder="What would you like to ask?"
                className="rounded-xl h-11"
              />
            </div>
            <div className="grid gap-3">
              <Label className="text-[12px] font-bold text-slate-500 uppercase">Options</Label>
              {pollData.options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...pollData.options];
                      newOpts[i] = e.target.value;
                      setPollData({ ...pollData, options: newOpts });
                    }}
                    placeholder={`Option ${i + 1}`}
                    className="rounded-xl h-10"
                  />
                  {pollData.options.length > 2 && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-500 shrink-0"
                      onClick={() => {
                        const newOpts = pollData.options.filter((_, idx) => idx !== i);
                        setPollData({ ...pollData, options: newOpts });
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-brand-teal font-bold h-8 w-fit"
                onClick={() => setPollData({ ...pollData, options: [...pollData.options, ""] })}
              >
                <Plus className="w-4 h-4 mr-1" /> Add Option
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="multiple" 
                checked={pollData.isMultiple} 
                onCheckedChange={(checked) => setPollData({ ...pollData, isMultiple: !!checked })}
              />
              <label htmlFor="multiple" className="text-sm font-medium leading-none">Allow multiple choices</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreatePoll(false)} className="rounded-xl">Cancel</Button>
            <Button 
              onClick={handleCreatePoll}
              disabled={!pollData.question.trim() || pollData.options.some(o => !o.trim())}
              className="bg-brand-teal hover:bg-brand-teal/90 text-white rounded-xl px-8"
            >
              Create Poll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
