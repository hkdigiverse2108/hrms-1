"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@/hooks/useUser";
import { API_URL } from "@/lib/config";

interface ChatEvent {
  event: string;
  data: any;
}

interface ChatContextType {
  ws: WebSocket | null;
  unreadCounts: Record<string, number>;
  totalUnreadCount: number;
  lastEvent: ChatEvent | null;
  markAsSeen: (chatId: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [lastEvent, setLastEvent] = useState<ChatEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<any>(null);

  const totalUnreadCount = Object.values(unreadCounts).reduce((sum, val) => sum + (val || 0), 0);

  // Initialize audio context on first interaction
  useEffect(() => {
    const unlockAudio = () => {
      if (!audioCtxRef.current) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          audioCtxRef.current = new AudioCtxClass();
        }
      }
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume().catch(() => {});
      }
    };
    if (typeof window !== "undefined") {
      document.addEventListener("click", unlockAudio);
      document.addEventListener("keydown", unlockAudio);
      return () => {
        document.removeEventListener("click", unlockAudio);
        document.removeEventListener("keydown", unlockAudio);
      };
    }
  }, []);

  const fetchInitialUnreadCounts = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`${API_URL}/chat/unread-counts/${user.id}`);
      if (res.ok) {
        setUnreadCounts(await res.json());
      }
    } catch (err) {
      console.error("Error fetching unread chat count:", err);
    }
  };

  useEffect(() => {
    if (!user || !user.id) return;
    fetchInitialUnreadCounts();
    let reconnectTimeout: any;
    let reconnectAttempts = 0;

    const connectWebSocket = () => {
      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${wsProtocol}//${window.location.host}/api/chat/ws/${user.id}`;
      
      const websocket = new WebSocket(wsUrl);
      wsRef.current = websocket;

      websocket.onopen = () => {
        setWs(websocket);
        reconnectAttempts = 0;
      };

      websocket.onclose = (event) => {
        setWs(null);
        wsRef.current = null;
        if (reconnectAttempts < 10) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 3000);
          reconnectTimeout = setTimeout(() => {
            reconnectAttempts++;
            connectWebSocket();
          }, delay);
        }
      };

      websocket.onerror = () => {
        websocket.close();
      };

      websocket.onmessage = async (event) => {
        try {
          const payload = JSON.parse(event.data);
          setLastEvent(payload);

          const { event: eventType, data } = payload;
          if (eventType === "new_message") {
            const isGroupMsg = !!data.groupId;
            const messageChatId = isGroupMsg ? data.groupId : (data.senderId === user.id ? data.receiverId : data.senderId);
            const activeChatId = localStorage.getItem("activeChatId");
            const isChatPage = window.location.pathname.startsWith("/chat");
            const isTabActive = typeof document !== "undefined" && document.hasFocus();
            const isUserViewingThisChat = isChatPage && isTabActive && activeChatId === messageChatId;

            if (isUserViewingThisChat) {
               fetch(`${API_URL}/chat/mark-seen/${messageChatId}/${user.id}`, { method: 'POST' });
               // don't increment unread count if actively viewing
            } else {
               setUnreadCounts(prev => ({ ...prev, [messageChatId]: (prev[messageChatId] || 0) + 1 }));

               const isDnd = localStorage.getItem("globalDndEnabled") === "true";
               if (!isDnd && !data.isMe) {
                 const mutedChatsStr = localStorage.getItem("mutedChats");
                 const mutedChats = mutedChatsStr ? JSON.parse(mutedChatsStr) : [];
                 const isMuted = mutedChats.includes(messageChatId);

                 if (!isMuted) {
                   const prefs = JSON.parse(localStorage.getItem("chatNotificationPrefs") || "{}");
                   const globalMode = localStorage.getItem("globalDefaultMode") || "all";
                   const globalSound = localStorage.getItem("globalDefaultSound") || "default";

                   const chatPref = prefs[messageChatId] || { mode: "default", sound: "default" };
                   const resolvedMode = chatPref.mode === "default" || !chatPref.mode ? globalMode : chatPref.mode;
                   const resolvedSound = chatPref.sound === "default" || !chatPref.sound ? globalSound : chatPref.sound;

                   if (resolvedMode !== "none") {
                     let shouldNotify = true;
                     if (resolvedMode === "mentions") {
                       const isMention = (() => {
                         if (!data.text) return false;
                         const mentions = data.text.match(/@\w+/g);
                         if (!mentions) return false;
                         const fullName = (user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`).trim().toLowerCase();
                         return mentions.some((m: string) => {
                           const name = m.substring(1).toLowerCase();
                           return name === "everyone" || fullName.includes(name);
                         });
                       })();
                       const isPersonal = !data.groupId;
                       shouldNotify = isMention || isPersonal;
                     }

                     if (shouldNotify) {
                       // Play Sound
                       try {
                         let audioCtx = audioCtxRef.current;
                         if (!audioCtx) {
                           const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
                           if (AudioCtxClass) {
                             audioCtx = new AudioCtxClass();
                             audioCtxRef.current = audioCtx;
                           }
                         }
                         const play = () => {
                           const osc = audioCtx.createOscillator();
                           const gain = audioCtx.createGain();
                           osc.connect(gain);
                           gain.connect(audioCtx.destination);
                           
                           if (resolvedSound === "bubble") {
                             osc.type = "sine";
                             osc.frequency.setValueAtTime(150, audioCtx.currentTime);
                             osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.15);
                             gain.gain.setValueAtTime(0.01, audioCtx.currentTime);
                             gain.gain.exponentialRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
                             gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
                             osc.start();
                             osc.stop(audioCtx.currentTime + 0.15);
                           } else if (resolvedSound === "beep") {
                             osc.type = "square";
                             osc.frequency.setValueAtTime(880, audioCtx.currentTime);
                             gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
                             gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
                             osc.start();
                             osc.stop(audioCtx.currentTime + 0.08);
                           } else if (resolvedSound !== "silent") {
                             osc.type = "triangle";
                             osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); 
                             osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); 
                             gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
                             gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
                             osc.start();
                             osc.stop(audioCtx.currentTime + 0.3);
                           }
                         };
                         if (audioCtx?.state === "suspended") {
                           audioCtx.resume().then(play).catch(() => play());
                         } else if (audioCtx) {
                           play();
                         }
                       } catch (e) {
                         console.warn(e);
                       }

                       // Desktop Notification
                       if ("Notification" in window && Notification.permission === "granted" && (!isTabActive || !isChatPage)) {
                         const senderName = data.sender || "Colleague";
                         const body = data.text || "Sent an attachment";
                         const title = data.groupId ? `💬 ${senderName} (Group Chat)` : `💬 ${senderName}`;
                         const notif = new Notification(title, { body, icon: "/favicon.ico" });
                         notif.onclick = () => { window.focus(); };
                       }
                     }
                   }
                 }
               }
            }
          }
        } catch (err) {
          console.error("Error parsing chat WS message", err);
        }
      };
    };

    connectWebSocket();

    return () => {
      clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [user?.id]);

  const markAsSeen = useCallback((chatId: string) => {
    setUnreadCounts(prev => {
      const next = { ...prev };
      delete next[chatId];
      return next;
    });
    if (user?.id) {
       fetch(`${API_URL}/chat/mark-seen/${chatId}/${user.id}`, { method: 'POST' });
    }
  }, [user?.id]);

  return (
    <ChatContext.Provider value={{ ws, unreadCounts, totalUnreadCount, lastEvent, markAsSeen }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}
