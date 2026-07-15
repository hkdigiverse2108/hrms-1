"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useApi } from "@/hooks/useApi";
import { useUser } from "@/hooks/useUser";
import { useChatContext } from "@/context/ChatContext";
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
  AtSign,
  Send,
  CheckCheck,
  UserPlus,
  Hash,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
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
  Info,
  Clock,
  Layout,
  ExternalLink,
  Home,
  Bookmark,
  Reply,
  Forward,
  Copy,
  Bell,
  BellOff,
  Archive,
  Link as LinkIcon,
  Pin,
  Mic,
  BarChart2,
  Play,
  Pause,
  Square,
  Crop,
  Type,
  PenTool,
  MessageSquare,
  Headphones,
  Share2,
  Flag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { API_URL, getAvatarUrl } from "@/lib/config";
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
import { toast } from "sonner";
import { useConfirm } from "@/context/ConfirmContext";


const getSenderColor = (name: string) => {
  const colors = [
    "#1f75fe",
    "#2ecc71",
    "#e67e22",
    "#9b59b6",
    "#e74c3c",
    "#1abc9c",
    "#d35400",
    "#8e44ad",
    "#27ae60",
    "#2980b9",
    "#b71540",
    "#0c2461",
    "#e58e26",
    "#079992"
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

const ChatLink = ({ href, target, rel, className, children, onClick, textColor }: any) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <a
      href={href}
      target={target}
      rel={rel}
      className={className}
      style={{
        textDecorationLine: 'none',
        textUnderlineOffset: '3px',
        textDecorationThickness: '1px',
        color: textColor
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {children}
    </a>
  );
};

// Shared audio controller to prevent multiple audios playing simultaneously
const audioController = {
  current: null as HTMLAudioElement | null,
  pauseCurrent() {
    if (this.current) {
      this.current.pause();
      this.current = null;
    }
  }
};

const VoicePreviewPlayer = ({ blob, duration, onDelete }: { blob: Blob; duration: number; onDelete: () => void }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(blob);
    urlRef.current = url;
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = url;
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setProgress((audio.currentTime / audio.duration) * 100);
        setCurrentTime(audio.currentTime);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setCurrentTime(0);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.pause();
      audio.src = '';
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [blob]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => {});
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current && audioRef.current.duration) {
      const newTime = (val / 100) * audioRef.current.duration;
      audioRef.current.currentTime = newTime;
      setProgress(val);
      setCurrentTime(newTime);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || time === Infinity || time === 0) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const displayTime = isPlaying || currentTime > 0
    ? formatTime(currentTime)
    : formatTime(duration);

  return (
    <div className="flex-1 flex items-center gap-1.5 bg-[#f0f2f5] px-2 py-1.5 rounded-xl border border-slate-200/60 animate-in fade-in duration-300">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-red-500 hover:bg-red-100 rounded-full shrink-0"
        onClick={onDelete}
      >
        <Trash2 className="w-4 h-4" />
      </Button>

      <button
        type="button"
        onClick={togglePlay}
        className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[#54656f] hover:bg-black/5 transition-colors focus:outline-none"
      >
        {isPlaying ? (
          <Pause className="w-[18px] h-[18px] fill-current" />
        ) : (
          <Play className="w-[18px] h-[18px] fill-current ml-0.5" />
        )}
      </button>

      <div className="flex-1 flex flex-col justify-center min-w-0 gap-[3px]">
        <div className="relative w-full h-[3px] rounded-full bg-[#d1d5db] overflow-visible">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-[#06cf9c] transition-none"
            style={{ width: `${progress}%` }}
          />
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={progress}
            onChange={handleSliderChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-[10px] h-[10px] rounded-full bg-[#06cf9c] shadow-sm pointer-events-none transition-none z-20"
            style={{ left: `calc(${progress}% - 5px)` }}
          />
        </div>
      </div>

      <span className="text-[10px] text-[#667781] tabular-nums shrink-0">{displayTime}</span>
    </div>
  );
};

const getOpenUrl = (url: string | null | undefined) => {
  if (!url) return "";
  const full = url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:') ? url : `${API_URL}${url}`;
  return full.replace("/uploads/", "/attachments/open/");
};

const getDownloadUrl = (url: string | null | undefined) => {
  if (!url) return "";
  const full = url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:') ? url : `${API_URL}${url}`;
  return full.replace("/uploads/", "/attachments/download/");
};

const VoiceMessagePlayer = ({ msg, isMe, renderCheckmarks }: { msg: any; isMe: boolean; renderCheckmarks?: (msg: any) => React.ReactNode }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(msg._optimistic || false);
  const [isDownloading, setIsDownloading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fullUrl = getOpenUrl(msg.attachmentUrl);

  useEffect(() => {
    if (msg._optimistic || !fullUrl) {
      setIsDownloaded(true);
      return;
    }
    const checkCache = async () => {
      try {
        const cache = await caches.open("chat-attachments-cache");
        const cachedResponse = await cache.match(fullUrl);
        if (cachedResponse) {
          setIsDownloaded(true);
        }
      } catch (e) {
        console.warn("Cache check failed", e);
      }
    };
    checkCache();
  }, [fullUrl, msg._optimistic]);

  useEffect(() => {
    if (!isDownloaded || !fullUrl) return;

    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;

    const setupAudioSrc = async () => {
      let audioSrc = encodeURI(fullUrl);
      if (!msg._optimistic) {
        try {
          const cache = await caches.open("chat-attachments-cache");
          const cachedResponse = await cache.match(fullUrl);
          if (cachedResponse) {
            const blob = await cachedResponse.blob();
            audioSrc = window.URL.createObjectURL(blob);
          }
        } catch (e) {
          console.warn("Cache retrieve failed, using remote URL", e);
        }
      }
      audio.src = audioSrc;

      if (audio.readyState >= 2) {
        handleCanPlay();
      }
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleCanPlay = () => {
      setIsLoaded(true);
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => {
      setProgress((audio.currentTime / (audio.duration || 1)) * 100);
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
      if (audioController.current === audio) {
        audioController.current = null;
      }
    };

    const handleError = () => {
      console.warn("Voice message failed to load:", fullUrl);
      setIsLoaded(true);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('canplaythrough', handleCanPlay);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    setupAudioSrc();

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('canplaythrough', handleCanPlay);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      if (audioController.current === audio) {
        audioController.current = null;
      }
      audio.pause();
      if (audio.src && audio.src.startsWith('blob:')) {
        window.URL.revokeObjectURL(audio.src);
      }
      audio.src = '';
    };
  }, [msg.attachmentUrl, isDownloaded, fullUrl]);

  const downloadAudio = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const response = await fetch(encodeURI(fullUrl));
      if (!response.ok) throw new Error("Fetch failed");
      const blob = await response.blob();
      const cache = await caches.open("chat-attachments-cache");
      await cache.put(fullUrl, new Response(blob, {
        headers: {
          'Content-Type': blob.type,
          'Content-Length': blob.size.toString()
        }
      }));
      setIsDownloaded(true);
    } catch (err) {
      console.error(err);
      toast.error("Audio download failed");
    } finally {
      setIsDownloading(false);
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioController.pauseCurrent();
        audioController.current = audioRef.current;
        audioRef.current.play().catch(err => {
          console.error("Audio playback failed:", err);
          toast.error("Could not play voice message. The file might be missing or unsupported.");
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current && duration) {
      const newTime = (val / 100) * duration;
      audioRef.current.currentTime = newTime;
      setProgress(val);
      setCurrentTime(newTime);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || time === Infinity) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const displayTime = isPlaying || currentTime > 0
    ? formatTime(currentTime)
    : formatTime(duration || msg.voiceDuration || 0);

  const totalTime = formatTime(duration || msg.voiceDuration || 0);
  const msgTime = dayjs(msg.timestamp).format("h:mm a");

  let playButton;
  if (!isDownloaded) {
    if (isDownloading) {
      playButton = (
        <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[#54656f] select-none">
          <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    } else {
      playButton = (
        <button
          type="button"
          onClick={downloadAudio}
          className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[#54656f] hover:bg-black/5 transition-colors focus:outline-none border-none outline-none ring-0 focus:ring-0 focus-visible:outline-none"
          title="Download audio"
        >
          <Download className="w-[18px] h-[18px]" />
        </button>
      );
    }
  } else if (!isLoaded) {
    playButton = (
      <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[#54656f] select-none">
        <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  } else {
    playButton = (
      <button
        type="button"
        onClick={togglePlay}
        className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[#54656f] hover:bg-black/5 transition-colors focus:outline-none border-none outline-none ring-0 focus:ring-0 focus-visible:outline-none"
      >
        {isPlaying ? (
          <Pause className="w-[18px] h-[18px] fill-current" />
        ) : (
          <Play className="w-[18px] h-[18px] fill-current ml-0.5" />
        )}
      </button>
    );
  }

  const progressSection = (
    <div className="flex-1 flex flex-col justify-center min-w-0 gap-[3px]">
      <div className="relative w-full h-[3px] rounded-full bg-[#d1d5db] overflow-visible">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-[#06cf9c] transition-none"
          style={{ width: `${progress}%` }}
        />
        <input
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={progress}
          onChange={handleSliderChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 border-none outline-none focus:outline-none focus:ring-0 ring-0 focus-visible:outline-none"
          style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-[10px] h-[10px] rounded-full bg-[#06cf9c] shadow-sm pointer-events-none transition-none z-20"
          style={{ left: `calc(${progress}% - 5px)` }}
        />
      </div>
      <div className="flex items-center justify-between select-none">
        <span className="text-[10px] text-[#667781] tabular-nums">{isPlaying ? displayTime : totalTime}</span>
        <div className="flex items-center gap-1 select-none">
          <span className="text-[10px] text-[#667781] tabular-nums">{msgTime}</span>
          {renderCheckmarks && renderCheckmarks(msg)}
        </div>
      </div>
    </div>
  );

  const headphoneIcon = (
    <div className="w-9 h-9 rounded-full bg-[#f59e0b] hover:bg-[#d97706] active:scale-95 transition-all flex items-center justify-center text-white shrink-0 cursor-pointer shadow-sm border-none outline-none ring-0">
      <Headphones className="w-[18px] h-[18px]" />
    </div>
  );

  return (
    <div className={cn(
      "rounded-xl mb-0.5 w-[260px] sm:w-[300px] lg:w-[330px] max-w-full px-1.5 py-1",
      isMe
        ? "bg-[#d9fdd3] ml-auto rounded-tr-none"
        : "bg-white mr-auto rounded-tl-none"
    )}>
      <div className="flex items-center gap-1.5">
        {isMe ? (
          <>
            {headphoneIcon}
            {playButton}
            {progressSection}
          </>
        ) : (
          <>
            {playButton}
            {progressSection}
            {headphoneIcon}
          </>
        )}
      </div>
    </div>
  );
};

const AudioMessagePlayer = ({ msg, isMe, renderCheckmarks }: { msg: any; isMe: boolean; renderCheckmarks?: (msg: any) => React.ReactNode }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(msg._optimistic || false);
  const [isDownloading, setIsDownloading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fullUrl = getOpenUrl(msg.attachmentUrl);

  useEffect(() => {
    if (msg._optimistic || !fullUrl) {
      setIsDownloaded(true);
      return;
    }
    const checkCache = async () => {
      try {
        const cache = await caches.open("chat-attachments-cache");
        const cachedResponse = await cache.match(fullUrl);
        if (cachedResponse) {
          setIsDownloaded(true);
        }
      } catch (e) {
        console.warn("Cache check failed", e);
      }
    };
    checkCache();
  }, [fullUrl, msg._optimistic]);

  useEffect(() => {
    if (!isDownloaded || !fullUrl) return;

    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;

    const setupAudioSrc = async () => {
      let audioSrc = encodeURI(fullUrl);
      if (!msg._optimistic) {
        try {
          const cache = await caches.open("chat-attachments-cache");
          const cachedResponse = await cache.match(fullUrl);
          if (cachedResponse) {
            const blob = await cachedResponse.blob();
            audioSrc = window.URL.createObjectURL(blob);
          }
        } catch (e) {
          console.warn("Cache retrieve failed, using remote URL", e);
        }
      }
      audio.src = audioSrc;

      if (audio.readyState >= 2) {
        handleCanPlay();
      }
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleCanPlay = () => {
      setIsLoaded(true);
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleDurationChange = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => {
      setProgress((audio.currentTime / (audio.duration || 1)) * 100);
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
      if (audioController.current === audio) {
        audioController.current = null;
      }
    };

    const handleError = () => {
      console.warn("Audio file failed to load:", fullUrl);
      setIsLoaded(true);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('canplaythrough', handleCanPlay);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    setupAudioSrc();

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('canplaythrough', handleCanPlay);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      if (audioController.current === audio) {
        audioController.current = null;
      }
      audio.pause();
      if (audio.src && audio.src.startsWith('blob:')) {
        window.URL.revokeObjectURL(audio.src);
      }
      audio.src = '';
    };
  }, [msg.attachmentUrl, isDownloaded, fullUrl]);

  const downloadAudio = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const response = await fetch(encodeURI(fullUrl));
      if (!response.ok) throw new Error("Fetch failed");
      const blob = await response.blob();
      const cache = await caches.open("chat-attachments-cache");
      await cache.put(fullUrl, new Response(blob, {
        headers: {
          'Content-Type': blob.type,
          'Content-Length': blob.size.toString()
        }
      }));
      setIsDownloaded(true);
    } catch (err) {
      console.error(err);
      toast.error("Audio download failed");
    } finally {
      setIsDownloading(false);
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioController.pauseCurrent();
        audioController.current = audioRef.current;
        audioRef.current.play().catch(err => {
          console.error("Audio playback failed:", err);
          toast.error("Could not play audio message.");
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current && duration) {
      const newTime = (val / 100) * duration;
      audioRef.current.currentTime = newTime;
      setProgress(val);
      setCurrentTime(newTime);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || time === Infinity || time === 0) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const displayTime = isPlaying || currentTime > 0
    ? formatTime(currentTime)
    : formatTime(duration || msg.voiceDuration || 0);

  const totalTime = formatTime(duration || msg.voiceDuration || 0);
  const msgTime = dayjs(msg.timestamp).format("h:mm a");

  let playButton;
  if (!isDownloaded) {
    if (isDownloading) {
      playButton = (
        <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[#54656f] select-none">
          <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    } else {
      playButton = (
        <button
          type="button"
          onClick={downloadAudio}
          className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[#54656f] hover:bg-black/5 transition-colors focus:outline-none border-none outline-none ring-0 focus:ring-0 focus-visible:outline-none"
          title="Download audio"
        >
          <Download className="w-[18px] h-[18px]" />
        </button>
      );
    }
  } else if (!isLoaded) {
    playButton = (
      <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[#54656f] select-none">
        <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  } else {
    playButton = (
      <button
        type="button"
        onClick={togglePlay}
        className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[#54656f] hover:bg-black/5 transition-colors focus:outline-none border-none outline-none ring-0 focus:ring-0 focus-visible:outline-none"
      >
        {isPlaying ? (
          <Pause className="w-[18px] h-[18px] fill-current" />
        ) : (
          <Play className="w-[18px] h-[18px] fill-current ml-0.5" />
        )}
      </button>
    );
  }

  const progressSection = (
    <div className="flex-1 flex flex-col justify-center min-w-0 gap-[3px]">
      <div className="relative w-full h-[3px] rounded-full bg-[#d1d5db] overflow-visible">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-[#06cf9c] transition-none"
          style={{ width: `${progress}%` }}
        />
        <input
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={progress}
          onChange={handleSliderChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 border-none outline-none focus:outline-none focus:ring-0 ring-0 focus-visible:outline-none"
          style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-[10px] h-[10px] rounded-full bg-[#06cf9c] shadow-sm pointer-events-none transition-none z-20"
          style={{ left: `calc(${progress}% - 5px)` }}
        />
      </div>
      <div className="flex items-center justify-between select-none">
        <span className="text-[10px] text-[#667781] tabular-nums">{isPlaying ? displayTime : totalTime}</span>
        <div className="flex items-center gap-1 select-none">
          <span className="text-[10px] text-[#667781] tabular-nums">{msgTime}</span>
          {renderCheckmarks && renderCheckmarks(msg)}
        </div>
      </div>
    </div>
  );

  const headphoneIcon = (
    <div className="w-9 h-9 rounded-full bg-[#f59e0b] hover:bg-[#d97706] active:scale-95 transition-all flex items-center justify-center text-white shrink-0 cursor-pointer shadow-sm border-none outline-none ring-0">
      <Headphones className="w-[18px] h-[18px]" />
    </div>
  );

  return (
    <div className={cn(
      "rounded-xl mb-0.5 w-[260px] sm:w-[300px] lg:w-[330px] max-w-full px-1.5 py-1",
      isMe
        ? "bg-[#d9fdd3] ml-auto rounded-tr-none"
        : "bg-white mr-auto rounded-tl-none"
    )}>
      <div className="flex items-center gap-1.5">
        {isMe ? (
          <>
            {headphoneIcon}
            {playButton}
            {progressSection}
          </>
        ) : (
          <>
            {playButton}
            {progressSection}
            {headphoneIcon}
          </>
        )}
      </div>
    </div>
  );
};

const SmartMediaAttachment = ({ msg, isMe, setPreviewImageMsgId }: { msg: any; isMe: boolean; setPreviewImageMsgId: (id: string | null) => void }) => {
  const [isAudioOnly, setIsAudioOnly] = useState<boolean | null>(null);

  const cleanName = msg.attachmentName ? msg.attachmentName.replace(/^[a-f0-9]+_/, "").toLowerCase() : "";
  const isWhatsAppAudio = cleanName.startsWith("whatsapp audio") || cleanName.includes("whatsapp audio") || cleanName.includes("voice message") || cleanName.includes("voice_message");
  const isAudioExtension = /\.(mp3|wav|m4a|ogg|aac|flac|webm|opus|amr|3gp)$/i.test(msg.attachmentName || "");

  useEffect(() => {
    if (isWhatsAppAudio || isAudioExtension) {
      setIsAudioOnly(true);
      return;
    }
    if (!msg.attachmentUrl) {
      setIsAudioOnly(false);
      return;
    }
    const fullUrl = (msg.attachmentUrl.startsWith('http') || msg.attachmentUrl.startsWith('blob:') || msg.attachmentUrl.startsWith('data:')) ? msg.attachmentUrl : `${API_URL}${msg.attachmentUrl}`;
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = fullUrl;
    const handleLoaded = () => {
      setIsAudioOnly(video.videoHeight === 0 || video.videoWidth === 0);
      video.src = '';
    };
    const handleError = () => {
      setIsAudioOnly(true);
      video.src = '';
    };
    video.addEventListener('loadedmetadata', handleLoaded);
    video.addEventListener('error', handleError);
    return () => {
      video.removeEventListener('loadedmetadata', handleLoaded);
      video.removeEventListener('error', handleError);
      video.src = '';
    };
  }, [msg.attachmentUrl, isWhatsAppAudio, isAudioExtension]);

  if (isAudioOnly === null) {
    return (
      <div className={cn(
        "rounded-xl mb-0.5 w-[260px] sm:w-[300px] lg:w-[330px] max-w-full px-1.5 py-1",
        isMe
          ? "bg-[#d9fdd3] ml-auto rounded-tr-none"
          : "bg-white mr-auto rounded-tl-none border border-slate-100/80 shadow-xs"
      )}>
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center bg-black/5">
            <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="flex-1 text-[10px] text-[#667781]">Loading audio...</div>
        </div>
      </div>
    );
  }

  if (isAudioOnly) {
    return <AudioMessagePlayer msg={msg} isMe={isMe} />;
  }

  return <VideoAttachment msg={msg} setPreviewImageMsgId={setPreviewImageMsgId} />;
};

const SmartPreviewAttachment = ({ msg }: { msg: any }) => {
  const [isAudioOnly, setIsAudioOnly] = useState<boolean | null>(null);

  const cleanName = msg.attachmentName ? msg.attachmentName.replace(/^[a-f0-9]+_/, "").toLowerCase() : "";
  const isWhatsAppAudio = cleanName.startsWith("whatsapp audio") || cleanName.includes("whatsapp audio") || cleanName.includes("voice message") || cleanName.includes("voice_message");
  const isAudioExtension = /\.(mp3|wav|m4a|ogg|aac|flac|webm|opus|amr|3gp)$/i.test(msg.attachmentName || "");

  useEffect(() => {
    if (isWhatsAppAudio || isAudioExtension) {
      setIsAudioOnly(true);
      return;
    }
    if (!msg.attachmentUrl) {
      setIsAudioOnly(false);
      return;
    }
    const fullUrl = (msg.attachmentUrl.startsWith('http') || msg.attachmentUrl.startsWith('blob:') || msg.attachmentUrl.startsWith('data:')) ? msg.attachmentUrl : `${API_URL}${msg.attachmentUrl}`;
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = fullUrl;
    const handleLoaded = () => {
      setIsAudioOnly(video.videoHeight === 0 || video.videoWidth === 0);
      video.src = '';
    };
    const handleError = () => {
      setIsAudioOnly(true);
      video.src = '';
    };
    video.addEventListener('loadedmetadata', handleLoaded);
    video.addEventListener('error', handleError);
    return () => {
      video.removeEventListener('loadedmetadata', handleLoaded);
      video.removeEventListener('error', handleError);
      video.src = '';
    };
  }, [msg.attachmentUrl, isWhatsAppAudio, isAudioExtension]);

  if (isAudioOnly === null) {
    return (
      <div className="flex flex-col items-center justify-center w-full max-w-lg p-8">
        <div className="w-10 h-10 border-3 border-slate-300 border-t-brand-teal rounded-full animate-spin" />
        <span className="text-slate-400 text-sm mt-3">Loading...</span>
      </div>
    );
  }

  if (isAudioOnly) {
    return (
      <div className="flex flex-col items-center justify-center w-full max-w-lg">
        <AudioMessagePlayer msg={msg} isMe={msg.isMe || false} />
      </div>
    );
  }

  return (
    <video
      src={
        msg.attachmentUrl?.startsWith('blob:') ? msg.attachmentUrl :
          msg.attachmentUrl?.startsWith('http') ? msg.attachmentUrl :
            `${API_URL}${msg.attachmentUrl}`
      }
      controls
      autoPlay
      className="max-w-full max-h-[75vh] object-contain shadow-2xl rounded-sm"
    />
  );
};

const ImageWithLoader = ({ src, alt, className, imgClassName, onLoad, onClick }: { src: string; alt: string; className?: string; imgClassName?: string; onLoad?: () => void; onClick?: () => void }) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={cn("relative overflow-hidden", className)} style={loaded ? {} : { minHeight: 180 }}>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 animate-pulse rounded-lg z-10">
          <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={cn("w-full h-full", imgClassName || "object-contain")}
        style={loaded ? {} : { opacity: 0 }}
        onLoad={() => { setLoaded(true); onLoad?.(); }}
        onClick={onClick}
        onError={() => setLoaded(true)}
      />
    </div>
  );
};

const VideoAttachment = ({ msg, setPreviewImageMsgId }: { msg: any; setPreviewImageMsgId: (id: string | null) => void }) => {
  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (msg._optimistic) return;
    setPreviewImageMsgId(msg.id);
  };

  const msgTime = dayjs(msg.timestamp).format("h:mm a");
  const [videoLoaded, setVideoLoaded] = useState(false);

  return (
    <div className={cn(
      "relative rounded-lg overflow-hidden border border-black/10 max-w-full group/video cursor-pointer bg-black",
      msg.text ? "mb-1" : "mb-0"
    )}>
      {/* Video Thumbnail Placeholder */}
      <div 
        onClick={handleAction}
        className="relative w-full sm:w-[360px] lg:w-[420px] h-[180px] sm:h-[220px] flex items-center justify-center bg-slate-950"
      >
        <video
          src={
            msg.attachmentUrl?.startsWith('blob:') ? msg.attachmentUrl :
              msg.attachmentUrl?.startsWith('http') ? msg.attachmentUrl :
                `${API_URL}${msg.attachmentUrl}`
          }
          className={cn("w-full h-full object-cover pointer-events-none", videoLoaded ? "opacity-60" : "opacity-0")}
          onLoadedData={() => setVideoLoaded(true)}
          preload="metadata"
        />
        
        {/* Loader Overlay */}
        {!videoLoaded && !msg._optimistic && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 animate-pulse z-10">
            <div className="w-10 h-10 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin" />
          </div>
        )}

        {/* Loader Overlay (Optimistic) */}
        {msg._optimistic ? (
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center backdrop-blur-xs select-none">
            <div className="w-12 h-12 border-4 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
            <span className="text-white text-[11px] font-bold mt-2">
              Uploading...
            </span>
          </div>
        ) : videoLoaded ? (
          /* Play Button Overlay */
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 hover:bg-black/35 transition-all select-none">
            <div className="w-14 h-14 rounded-full bg-black/50 text-white flex items-center justify-center border border-white/20 shadow-md">
              <Play className="w-6 h-6 fill-current ml-0.5" />
            </div>
          </div>
        ) : null}

        {/* Timestamp overlay */}
        {!msg._optimistic && videoLoaded && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5 text-[10px] text-white bg-black/40 px-2 py-0.5 rounded-[10px] select-none backdrop-blur-xs">
            <span>{msgTime}</span>
            {msg.isMe && (
              <span className="text-[#53bdeb]">
                <svg viewBox="0 0 16 11" width="16" height="11" className="fill-current">
                  <path d="M11.071.653a.457.457 0 0 0-.304-.102-.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 0 0-.336-.146.47.47 0 0 0-.336.146l-.738.759a.445.445 0 0 0 0 .64l2.573 2.541a.958.958 0 0 0 .336.218.93.93 0 0 0 .414.086c.153-.015.295-.08.414-.218l6.647-8.202a.449.449 0 0 0-.102-.64l-.756-.76zm-2.727 0a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-1.005-1.048-.369.381 1.534 1.534a.958.958 0 0 0 .336.218.93.93 0 0 0 .414.086c.153-.015.295-.08.414-.218l6.647-8.202a.449.449 0 0 0-.102-.64l-.389-.443z"/>
                </svg>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const FileAttachment = ({ msg, handleOpenAttachment, renderCheckmarks }: { msg: any; handleOpenAttachment: (url: string, filename: string) => Promise<void>; renderCheckmarks: (msg: any, isImageOverlay: boolean) => React.ReactNode }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const cleanAttachmentName = msg.attachmentName ? msg.attachmentName.replace(/^[a-f0-9]+_/, "") : "";
  const isPdf = msg.attachmentName && /\.pdf$/i.test(msg.attachmentName);

  const handleAction = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (msg._optimistic || isDownloading) return;
    setIsDownloading(true);
    try {
      await handleOpenAttachment(msg.attachmentUrl, msg.attachmentName);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDownloading(false);
    }
  };

  const openUrl = getOpenUrl(msg.attachmentUrl);
  const downloadUrl = getDownloadUrl(msg.attachmentUrl);

  const handleDownloadAttachment = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (msg._optimistic || isDownloading) return;
    setIsDownloading(true);
    try {
      if (typeof window !== 'undefined' && (window as any).electronAPI?.saveFile) {
        const response = await fetch(encodeURI(downloadUrl));
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        await (window as any).electronAPI.saveFile(cleanAttachmentName, uint8Array);
      } else {
        const response = await fetch(encodeURI(downloadUrl));
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = cleanAttachmentName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error(err);
      toast.error("Download failed");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div 
      onClick={handleAction}
      className={cn(
        "rounded-xl overflow-hidden mb-1.5 border w-[280px] sm:w-[320px] lg:w-[360px] max-w-full relative group/file cursor-pointer transition-all hover:shadow-xs",
        msg.isMe ? "bg-[#d9fdd3] border-[#c3ebbc]" : "bg-white border-[#e2e5e7]"
      )}
    >
      {/* PDF Thumbnail Preview */}
      {isPdf && !msg._optimistic && (
        <div className="w-full h-[140px] overflow-hidden bg-slate-50 relative border-b border-black/5 select-none">
          <iframe
            src={`${encodeURI(openUrl)}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
            className="w-[116%] h-full pointer-events-none border-none origin-top"
            scrolling="no"
            style={{ overflow: 'hidden' }}
            title="PDF Preview"
          />
          <div className="absolute inset-0 bg-transparent z-10" />
        </div>
      )}

      {/* File Info Box */}
      <div className="flex items-center gap-3 p-3 relative">
        {isPdf ? (
          <div className="w-9 h-10 bg-[#ef4444] rounded flex flex-col items-center justify-center text-white font-extrabold text-[10px] uppercase select-none shrink-0 shadow-sm relative overflow-hidden leading-none pt-1">
            <FileIcon className="w-4 h-4 text-white/90 fill-transparent stroke-[2.5]" />
            <span className="text-[7.5px] font-black tracking-tighter mt-1 bg-[#be123c] w-full text-center py-0.5">PDF</span>
          </div>
        ) : (
          <div className="p-2 rounded-lg bg-[#e2e8f0] border border-slate-200 shrink-0">
            <FileIcon className="w-6 h-6 text-slate-500 fill-slate-100" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-bold text-xs truncate text-[#111b21]">{cleanAttachmentName}</p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-[10px] text-[#667781] truncate">
              {msg._optimistic ? "Uploading..." : isDownloading ? "Downloading..." : isPdf ? "PDF Document" : "Click to download"}
            </p>
            {(!msg.text || msg.text === `Sent a file: ${msg.attachmentName}` || msg.text === `Sent a file: ${cleanAttachmentName}`) && (
              <span className="text-[9px] text-[#667781] ml-2 flex items-center gap-1 select-none whitespace-nowrap">
                {dayjs(msg.timestamp).format("hh:mm A")}
                {renderCheckmarks(msg, false)}
              </span>
            )}
          </div>
        </div>
        
        {/* Download arrow icon on the right side of the card */}
        {!msg._optimistic && !isDownloading && (
          <div className="w-7 h-7 rounded-full bg-black/5 flex items-center justify-center text-slate-500 group-hover/file:bg-brand-teal/10 group-hover/file:text-brand-teal transition-all shrink-0">
            <Download className="w-4 h-4" />
          </div>
        )}
        {isDownloading && (
          <div className="w-7 h-7 flex items-center justify-center shrink-0">
            <div className="w-4 h-4 border-2 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* PDF Footer Button Bar */}
      {isPdf && !msg._optimistic && (
        <div className={cn(
          "flex border-t text-[11px] font-bold select-none divide-x",
          msg.isMe 
            ? "border-[#c3ebbc]/60 bg-[#c3ebbc]/20 divide-[#c3ebbc]/60" 
            : "border-[#e2e5e7] bg-slate-50/60 divide-[#e2e5e7]"
        )}>
          <button
            type="button"
            onClick={handleAction}
            className="flex-1 py-1.5 text-center text-[#00a884] hover:bg-black/5 active:bg-black/10 transition-colors uppercase tracking-wider"
          >
            Open
          </button>
          <button
            type="button"
            onClick={handleDownloadAttachment}
            className="flex-1 py-1.5 text-center text-[#54656f] hover:bg-black/5 active:bg-black/10 transition-colors uppercase tracking-wider"
          >
            Save as...
          </button>
        </div>
      )}

      {/* Upload loader overlay if optimistic */}
      {msg._optimistic && (
        <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-xs z-10">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg shadow-sm border border-slate-100">
            <div className="w-4 h-4 border-2 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-semibold text-slate-600">Sending...</span>
          </div>
        </div>
      )}
    </div>
  );
};

interface MessageTextProps {
  text: string;
  isMeBubble?: boolean;
  messageSearchQuery?: string;
  employees: any[];
  user: any;
  openPersonalChatWithEmployeeId: (empId: any) => void;
  selectedChat: any;
  timeElement?: React.ReactNode;
}

const parseStrikethrough = (text: string): React.ReactNode => {
  const strikeRegex = /~(?!\s)([^~]+?)(?<!\s)~/g;
  const parts = text.split(strikeRegex);
  if (parts.length > 1) {
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <span key={`strike-${index}`} className="line-through text-slate-500/80">{part}</span>;
      }
      return part;
    });
  }
  return text;
};

const parseItalic = (text: string): React.ReactNode => {
  const italicRegex = /_(?!\s)([^_]+?)(?<!\s)_/g;
  const parts = text.split(italicRegex);
  if (parts.length > 1) {
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <em key={`italic-${index}`} className="italic">{parseStrikethrough(part)}</em>;
      }
      return parseStrikethrough(part);
    });
  }
  return parseStrikethrough(text);
};

const parseBold = (text: string): React.ReactNode => {
  const boldRegex = /\*(?!\s)([^*]+?)(?<!\s)\*/g;
  const parts = text.split(boldRegex);
  if (parts.length > 1) {
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={`bold-${index}`} className="font-bold">{parseItalic(part)}</strong>;
      }
      return parseItalic(part);
    });
  }
  return parseItalic(text);
};

const parseSingleBacktick = (text: string): React.ReactNode => {
  const singleRegex = /`(?!\s)([^`]+?)(?<!\s)`/g;
  const parts = text.split(singleRegex);
  if (parts.length > 1) {
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return (
          <code key={`single-mono-${index}`} className="font-mono bg-black/5 px-1 py-0.5 rounded text-[13px] border border-black/10">
            {part}
          </code>
        );
      }
      return parseBold(part);
    });
  }
  return parseBold(text);
};

const parseMonospace = (text: string): React.ReactNode => {
  const tripleRegex = /```([\s\S]+?)```/g;
  const parts = text.split(tripleRegex);
  if (parts.length > 1) {
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return (
          <code key={`triple-mono-${index}`} className="font-mono bg-black/5 px-1 py-0.5 rounded text-[13px] border border-black/10 whitespace-pre-wrap block my-1">
            {part}
          </code>
        );
      }
      return parseSingleBacktick(part);
    });
  }
  return parseSingleBacktick(text);
};

const parseFormatting = (text: string): React.ReactNode => {
  return parseMonospace(text);
};

const stripFormatting = (text: string | null | undefined): string => {
  if (!text) return "";
  return text
    .replace(/```([\s\S]+?)```/g, "$1")
    .replace(/`(?!\s)([^`]+?)(?<!\s)`/g, "$1")
    .replace(/\*(?!\s)([^*]+?)(?<!\s)\*/g, "$1")
    .replace(/_(?!\s)([^_]+?)(?<!\s)_/g, "$1")
    .replace(/~(?!\s)([^~]+?)(?<!\s)~/g, "$1");
};

const isAudioMessageText = (text: string | null | undefined): boolean => {
  if (!text) return false;
  const clean = text.toLowerCase();
  return (
    clean.includes("voice_message") || 
    clean.includes("voice message") || 
    clean.includes("whatsapp audio") ||
    /\.(mp3|wav|m4a|ogg|aac|flac|webm|opus|amr|3gp)$/i.test(clean)
  );
};

const highlightAndFormat = (text: string, searchQuery?: string): React.ReactNode => {
  const formatted = parseFormatting(text);
  if (!searchQuery) return formatted;

  const highlightNode = (node: React.ReactNode): React.ReactNode => {
    if (typeof node === 'string') {
      const parts = node.split(new RegExp(`(${searchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
      if (parts.length === 1) return node;
      return parts.map((part, index) =>
        part.toLowerCase() === searchQuery.toLowerCase() ? (
          <mark key={`mark-${index}`} className="bg-yellow-200 text-slate-900 rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      );
    }

    if (React.isValidElement(node)) {
      const children = (node.props as any).children;
      if (children) {
        if (Array.isArray(children)) {
          return React.cloneElement(node, {}, ...children.map((child, idx) => {
            const highlightedChild = highlightNode(child);
            return React.isValidElement(highlightedChild)
              ? React.cloneElement(highlightedChild, { key: idx })
              : highlightedChild;
          }));
        } else {
          return React.cloneElement(node, {}, highlightNode(children));
        }
      }
    }

    return node;
  };

  if (Array.isArray(formatted)) {
    return formatted.map((node, idx) => {
      const hl = highlightNode(node);
      return React.isValidElement(hl) ? React.cloneElement(hl, { key: idx }) : hl;
    });
  }
  return highlightNode(formatted);
};

const MessageText = ({
  text,
  isMeBubble = false,
  messageSearchQuery,
  employees,
  user,
  openPersonalChatWithEmployeeId,
  selectedChat,
  timeElement
}: MessageTextProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!text) return null;

  const rawLines = text.trimEnd().split("\n");
  const hasTooManyLines = rawLines.length > 15;
  const isTooLong = text.length > 700;
  const shouldTruncate = hasTooManyLines || isTooLong;

  let displayRawLines = rawLines;
  let isTruncated = false;

  if (shouldTruncate && !isExpanded) {
    isTruncated = true;
    if (isTooLong) {
      let charCount = 0;
      displayRawLines = [];
      for (const line of rawLines) {
        if (charCount + line.length > 700) {
          const remaining = 700 - charCount;
          let cutLine = line.substring(0, remaining);
          const lastSpace = cutLine.lastIndexOf(" ");
          if (lastSpace > remaining - 100 && lastSpace > 0) {
            cutLine = cutLine.substring(0, lastSpace);
          }
          displayRawLines.push(cutLine + "...");
          break;
        }
        displayRawLines.push(line);
        charCount += line.length + 1;
      }
    } else if (hasTooManyLines) {
      displayRawLines = rawLines.slice(0, 15);
    }
  }

  const parseLineContent = (lineText: string) => {
    if (!lineText) return "";

    const isPersonal = selectedChat?.type !== 'group' && selectedChat?.type !== 'general';

    const namePatterns = employees.map(emp => {
      const name = emp.name || `${emp.firstName} ${emp.lastName}`;
      return name.trim();
    }).filter(Boolean)
      .sort((a, b) => b.length - a.length)
      .map(name => name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));

    const mentionRegex = (namePatterns.length > 0 && !isPersonal)
      ? new RegExp(`(^|\\s)(@(?:${namePatterns.join('|')})\\b)`, 'gi')
      : /(?!)/g;

    const parts = lineText.split(mentionRegex);

    return parts.map((part, i) => {
      if (!part) return null;

      if (part.startsWith("@")) {
        const name = part.substring(1).trim();
        const matchedEmp = employees.find(emp => {
          const empName = (emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`).trim();
          return empName.toLowerCase() === name.toLowerCase();
        });

        const isMe = matchedEmp
          ? (matchedEmp.id === user?.id || matchedEmp.employeeId === user?.id)
          : (() => {
            const firstName = user?.firstName?.toLowerCase() || "";
            const lastName = user?.lastName?.toLowerCase() || "";
            const fullName = (user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`).trim().toLowerCase();
            const strippedFullName = fullName.replace(/\s+/g, "");
            const mentionName = name.toLowerCase();
            return (
              (firstName && firstName === mentionName) ||
              (lastName && lastName === mentionName) ||
              (fullName && fullName.includes(mentionName)) ||
              (strippedFullName && strippedFullName === mentionName)
            );
          })();

        let tagColorClass = "";
        if (isMeBubble) {
          tagColorClass = isMe ? "text-[#b45309] font-extrabold" : "text-[#0369a1] font-extrabold";
        } else {
          tagColorClass = isMe ? "text-[#d97706] font-extrabold" : "text-[#0ea5e9] font-extrabold";
        }

        const handleClick = () => {
          if (matchedEmp) {
            const empId = matchedEmp.id || matchedEmp.employeeId;
            if (empId) {
              openPersonalChatWithEmployeeId(empId);
            }
          }
        };

        return (
          <span
            key={`mention-${i}`}
            onClick={handleClick}
            className={cn(
              "text-[13px] transition-all cursor-pointer inline-block mr-1 font-bold",
              tagColorClass
            )}
          >
            {part}
          </span>
        );
      }

      const urlOrEmailRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
      const textParts = part.split(urlOrEmailRegex);

      return textParts.map((tp, k) => {
        if (!tp) return null;

        if (tp.match(urlOrEmailRegex)) {
          let href = tp;
          let isMail = false;
          if (tp.includes('@') && !tp.startsWith('http') && !tp.startsWith('www.')) {
            href = `mailto:${tp}`;
            isMail = true;
          } else if (tp.startsWith('www.')) {
            href = `https://${tp}`;
          }
          const hexColor = isMeBubble ? "#0369a1" : "#0ea5e9";

          return (
            <ChatLink
              key={`url-${i}-${k}`}
              href={href}
              target={isMail ? undefined : "_blank"}
              rel={isMail ? undefined : "noopener noreferrer"}
              className="break-all font-medium cursor-pointer"
              textColor={hexColor}
              onClick={(e: any) => e.stopPropagation()}
            >
              {tp}
            </ChatLink>
          );
        }

        return highlightAndFormat(tp, messageSearchQuery);
      });
    });
  };

  const renderedLines = displayRawLines.map((line, idx) => {
    const isLastLine = idx === displayRawLines.length - 1;

    // 1. Quote detection: line starts with "> " or ">"
    if (line.startsWith("> ") || line.startsWith(">")) {
      const quoteText = line.startsWith("> ") ? line.substring(2) : line.substring(1);
      return (
        <div
          key={`quote-${idx}`}
          className={cn(
            "border-l-[3.5px] pl-3 py-0.5 my-0.5 rounded-r-md text-[14.2px] leading-[19px] whitespace-pre-wrap",
            isMeBubble
              ? "border-emerald-600/60 bg-emerald-500/5 text-emerald-950/80"
              : "border-slate-400 bg-slate-100/50 text-slate-700"
          )}
        >
          {parseLineContent(quoteText)}
          {isLastLine && shouldTruncate && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="text-emerald-600 hover:text-emerald-700 font-bold text-[13px] inline transition-colors cursor-pointer select-none hover:underline ml-1"
            >
              {isTruncated ? "Read more" : "Read less"}
            </button>
          )}
          {isLastLine && timeElement && (
            <span className="whatsapp-time-stamp">
              {timeElement}
            </span>
          )}
        </div>
      );
    }

    // 2. Bullet list detection: line starts with "- ", "* " (do not match user-typed dots "· " or "• ")
    const isBullet = line.startsWith("- ") || line.startsWith("* ");
    if (isBullet) {
      const bulletText = line.substring(2);
      return (
        <div key={`bullet-${idx}`} className="flex items-start pl-1.5 text-[14.2px] leading-[19px] whitespace-pre-wrap">
          <span className={cn("mr-2 select-none font-bold text-slate-500", isMeBubble ? "text-emerald-700/80" : "text-slate-400")}>•</span>
          <span className="flex-1">
            {parseLineContent(bulletText)}
            {isLastLine && shouldTruncate && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="text-emerald-600 hover:text-emerald-700 font-bold text-[13px] inline transition-colors cursor-pointer select-none hover:underline ml-1"
              >
                {isTruncated ? "Read more" : "Read less"}
              </button>
            )}
            {isLastLine && timeElement && (
              <span className="whatsapp-time-stamp">
                {timeElement}
              </span>
            )}
          </span>
        </div>
      );
    }

    // 3. Numbered list detection: e.g. "1. ", "10. "
    const numMatch = line.match(/^(\d+)\.\s(.*)/);
    if (numMatch) {
      const num = numMatch[1];
      const numText = numMatch[2];
      return (
        <div key={`num-${idx}`} className="flex items-start pl-1.5 text-[14.2px] leading-[19px] whitespace-pre-wrap">
          <span className={cn("mr-1.5 select-none font-medium tabular-nums", isMeBubble ? "text-emerald-800/80" : "text-slate-500")}>{num}.</span>
          <span className="flex-1">
            {parseLineContent(numText)}
            {isLastLine && shouldTruncate && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="text-emerald-600 hover:text-emerald-700 font-bold text-[13px] inline transition-colors cursor-pointer select-none hover:underline ml-1"
              >
                {isTruncated ? "Read more" : "Read less"}
              </button>
            )}
            {isLastLine && timeElement && (
              <span className="whatsapp-time-stamp">
                {timeElement}
              </span>
            )}
          </span>
        </div>
      );
    }

    // Default line rendering - match message bubble typography exactly
    return (
      <div key={`line-${idx}`} className="text-[14.2px] leading-[19px] whitespace-pre-wrap min-h-[19px] flow-root">
        {parseLineContent(line)}
        {isLastLine && shouldTruncate && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="text-emerald-600 hover:text-emerald-700 font-bold text-[13px] inline transition-colors cursor-pointer select-none hover:underline ml-1"
          >
            {isTruncated ? "Read more" : "Read less"}
          </button>
        )}
        {isLastLine && timeElement && (
          <span className="whatsapp-time-stamp">
            {timeElement}
          </span>
        )}
      </div>
    );
  });

  return (
    <div className="text-[14.2px] leading-[19px] flow-root">
      {renderedLines}
    </div>
  );
};

export default function ChatPage() {
  const { user } = useUser();
  const { confirm } = useConfirm();
  const { ws, lastEvent, unreadCounts, markAsSeen: contextMarkAsSeen, onlineUsers, isWindowFocused } = useChatContext();
  const { data: apiData, isLoading } = useApi();
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMessages, setCurrentMessages] = useState<any[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null);
  const [pdfViewerTitle, setPdfViewerTitle] = useState<string>("");
  const [editText, setEditText] = useState("");
  const [chatSummaries, setChatSummaries] = useState<Record<string, any>>({});
  const [expandedVoterOptionId, setExpandedVoterOptionId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [forwardingMessage, setForwardingMessage] = useState<any>(null);
  const [forwardingMessages, setForwardingMessages] = useState<any[] | null>(null);
  const [firstUnreadId, setFirstUnreadId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"Personal" | "Groups" | "General" | "Saved">("Personal");
  const [pendingAttachments, setPendingAttachments] = useState<{ file: File; caption: string }[]>([]);
  const [activePendingIndex, setActivePendingIndex] = useState<number>(0);
  const [pendingUrls, setPendingUrls] = useState<string[]>([]);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const [attachmentsDrafts, setAttachmentsDrafts] = useState<Record<string, { file: File; caption: string }[]>>({});
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const [isSearchingMessages, setIsSearchingMessages] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [chatGroups, setChatGroups] = useState<any[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);
  const [groupMemberSearchQuery, setGroupMemberSearchQuery] = useState("");
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [laterTab, setLaterTab] = useState<"In progress" | "Archived" | "Completed">("In progress");
  const [showDeletedNotification, setShowDeletedNotification] = useState(true); // Placeholder for demo, normally would be based on actual deletion events
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatSearchQuery, setNewChatSearchQuery] = useState("");
  const [previewImageMsgId, setPreviewImageMsgId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; msg: any } | null>(null);
  const [showPickerForMsgId, setShowPickerForMsgId] = useState<string | null>(null);
  const [showPreviewEmojiPicker, setShowPreviewEmojiPicker] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [chatBackgroundContextMenu, setChatBackgroundContextMenu] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const urls = pendingAttachments.map(att => URL.createObjectURL(att.file));
    setPendingUrls(urls);
    return () => {
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [pendingAttachments]);

  const mediaMessages = useMemo(() => {
    return currentMessages.filter(msg => 
      msg.attachmentName && 
      (msg.isVoice || /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.attachmentName) || /\.(mp4|mov|mkv)$/i.test(msg.attachmentName) || /\.(mp3|wav|m4a|ogg|aac|flac|webm)$/i.test(msg.attachmentName))
    );
  }, [currentMessages]);

  const currentPreviewMsg = useMemo(() => {
    return currentMessages.find(m => m.id === previewImageMsgId);
  }, [currentMessages, previewImageMsgId]);

  const currentPreviewIndex = useMemo(() => {
    return mediaMessages.findIndex(m => m.id === previewImageMsgId);
  }, [mediaMessages, previewImageMsgId]);

  const handlePrevImage = () => {
    if (currentPreviewIndex > 0) {
      setPreviewImageMsgId(mediaMessages[currentPreviewIndex - 1].id);
    }
  };

  const handleNextImage = () => {
    if (currentPreviewIndex < mediaMessages.length - 1) {
      setPreviewImageMsgId(mediaMessages[currentPreviewIndex + 1].id);
    }
  };

  const [chatChannels, setChatChannels] = useState<any[]>([]);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelData, setNewChannelData] = useState({ name: "", description: "" });
  const [editingChannel, setEditingChannel] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<any>(null);
  const [showGroupMembers, setShowGroupMembers] = useState(false);
  const [globalSavedMessages, setGlobalSavedMessages] = useState<any[]>([]);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'info' | 'files'>('info');
  const [sidebarContactUser, setSidebarContactUser] = useState<any | null>(null);
  const [activeTagIndex, setActiveTagIndex] = useState(0);
  const [chatFiles, setChatFiles] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [newStatusEmoji, setNewStatusEmoji] = useState("💬");
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [voicePreviewBlob, setVoicePreviewBlob] = useState<Blob | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const selectedChatRef = useRef<any>(null);
  const [msgInfoData, setMsgInfoData] = useState<any>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [tagPickerLeft, setTagPickerLeft] = useState<number>(0);

  // Load drafts from localStorage on mount
  useEffect(() => {
    const savedDrafts = localStorage.getItem("chatDrafts");
    if (savedDrafts) {
      try {
        setDrafts(JSON.parse(savedDrafts));
      } catch (e) {
        console.error("Error parsing saved drafts:", e);
      }
    }
  }, []);


  const inputOverlayRef = useRef<HTMLDivElement>(null);

  const isSelectedChatOnline = selectedChat?.type === 'personal' && (onlineUsers.has(selectedChat.id) || onlineUsers.has(selectedChat.employeeId));

  const groupMembersList = useMemo(() => {
    if (!selectedChat) return [];
    if (selectedChat.type === 'general' || selectedChat.id?.startsWith("gen-") || selectedChat.id === "general") {
      return Array.from(new Set(employees.map(emp => emp.id || emp._id).filter(Boolean)));
    }
    return Array.from(new Set(selectedChat.members || []));
  }, [selectedChat, employees]);

  const renderInputHighlight = (text: string) => {
    if (!text) return "";

    // If tag picker is open, find the active '@' that triggered it
    if (showTagPicker) {
      const activeAtIdx = text.lastIndexOf("@");
      if (activeAtIdx !== -1 && activeAtIdx >= text.length - 25) {
        const before = text.substring(0, activeAtIdx);
        const after = text.substring(activeAtIdx + 1);
        return (
          <>
            {renderHighlightParts(before)}
            <span id="active-mention-marker" className="text-[#0ea5e9]">@</span>
            {renderHighlightParts(after)}
          </>
        );
      }
    }

    return renderHighlightParts(text);
  };

  const renderHighlightParts = (text: string) => {
    if (!text) return "";
    const namePatterns = employees.map(emp => {
      const name = emp.name || `${emp.firstName} ${emp.lastName}`;
      return name.trim();
    }).filter(Boolean)
      .sort((a, b) => b.length - a.length)
      .map(name => name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));

    // Strict regex matching: only match actual employee names, no fallback.
    const mentionRegex = namePatterns.length > 0
      ? new RegExp(`(@(?:${namePatterns.join('|')})\\b)`, 'gi')
      : /(?!)/g;

    const parts = text.split(mentionRegex);
    return parts.map((part, idx) => {
      if (part.startsWith("@")) {
        const nameOnly = part.substring(1).trim();
        const matched = employees.some(emp => {
          const empName = (emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`).trim();
          return empName.toLowerCase() === nameOnly.toLowerCase();
        });
        if (matched) {
          return <span key={idx} className="text-[#0ea5e9]">{part}</span>;
        }
      }
      return <span key={idx}>{part}</span>;
    });
  };


  const renderCheckmarks = (msg: any, isImageOverlay: boolean = false) => {
    if (!msg.isMe) return null;
    if (msg._optimistic) {
      return <Clock className={cn("w-3 h-3", isImageOverlay ? "text-white/70" : "text-[#8696a0]")} />;
    }
    if (msg.isSeen) {
      return <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />;
    }

    const isGroupMsg = !!msg.groupId || msg.receiverId === "group" || msg.type === "group";
    const uniqueSeenBy = Array.from(new Set(msg.seenBy || []));
    const seenByOthersCount = uniqueSeenBy.filter((id: any) => String(id) !== String(user?.id)).length;
    const isSeenByOthers = seenByOthersCount > 0;

    if (isGroupMsg) {
      const isChannel = chatChannels.some(c => String(c.id) === String(msg.groupId) || String(c.id) === String(msg.receiverId));
      const isGroup = chatGroups.some(g => String(g.id) === String(msg.groupId) || String(g.id) === String(msg.receiverId));

      let totalMembers = 0;
      if (isChannel) {
        totalMembers = employees.length;
      } else if (isGroup) {
        const group = chatGroups.find(g => String(g.id) === String(msg.groupId) || String(g.id) === String(msg.receiverId));
        const uniqueMembers = Array.from(new Set(group?.members || []));
        totalMembers = uniqueMembers.length;
      }

      const requiredSeenCount = totalMembers > 1 ? totalMembers - 1 : 0; // Exclude sender

      if (requiredSeenCount > 0 && seenByOthersCount >= requiredSeenCount) {
        return <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />;
      } else {
        return <CheckCheck className={cn("w-3.5 h-3.5", isImageOverlay ? "text-white/70" : "text-[#8696a0]")} />;
      }
    }

    if (isSeenByOthers) {
      return <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />;
    }

    const isRecipientOnline = onlineUsers.has(msg.receiverId);
    if (isRecipientOnline) {
      return <CheckCheck className={cn("w-3.5 h-3.5", isImageOverlay ? "text-white/70" : "text-[#8696a0]")} />;
    } else {
      return <Check className={cn("w-3.5 h-3.5", isImageOverlay ? "text-white/70" : "text-[#8696a0]")} />;
    }
  };

  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  // Parse query parameters on load to auto-select chats from desktop notifications
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlChatId = params.get("chatId");
      const urlChatType = params.get("chatType");
      if (urlChatId) {
        localStorage.setItem("selectedChatIdOnMount", urlChatId);
        if (urlChatType) {
          localStorage.setItem("selectedChatTypeOnMount", urlChatType);
        }
        // Clean up URL query parameters so page refresh doesn't keep triggering it
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        // Force trigger auto-select listener event
        window.dispatchEvent(new Event("chat-notification-click"));
      }
    }
  }, []);

  // Listen for Escape key to close the active chat and click to close context menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.key === "Escape") {
        if (showDiscardConfirm) {
          setShowDiscardConfirm(false);
          return;
        }
        if (previewImageMsgId) {
          return;
        }
        if (isSelectionMode) {
          exitSelectionMode();
          return;
        }
        if (pendingAttachments.length > 0) {
          setShowDiscardConfirm(true);
          return;
        }
        setSelectedChat(null as any);
      }
    };
    const handleCloseMenu = (e: MouseEvent) => {
      if (e.button !== 0) return;
      setContextMenu(null);
      setChatBackgroundContextMenu(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("click", handleCloseMenu);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("click", handleCloseMenu);
    };
  }, [previewImageMsgId, pendingAttachments, showDiscardConfirm, isSelectionMode]);

  useEffect(() => {
    const chatArea = document.querySelector('.whatsapp-chat-bg');
    if (!chatArea) return;

    const handleContextMenu = (e: Event) => {
      const target = e.target as HTMLElement;
      const me = e as MouseEvent;
      const isOnInput = !!target.closest('textarea') || !!target.closest('input') || !!target.closest('button');
      const isOnContextMenu = !!target.closest('.custom-ctx-menu');

      if (isOnInput) return;

      e.preventDefault();
      e.stopPropagation();

      const bubbleElement = target.closest('.whatsapp-bubble') || target.closest('.whatsapp-audio-bubble');
      if (bubbleElement) {
        const msgElement = target.closest('[id^="msg-"]');
        if (msgElement) {
          const msgId = msgElement.id.replace('msg-', '');
          const msg = currentMessages.find(m => m.id === msgId);
          if (msg) {
            setContextMenu({
              x: me.clientX,
              y: me.clientY,
              msg
            });
            setChatBackgroundContextMenu(null);
            return;
          }
        }
      }

      if (!isOnContextMenu) {
        setChatBackgroundContextMenu({ x: me.clientX, y: me.clientY });
        setContextMenu(null);
      }
    };

    chatArea.addEventListener('contextmenu', handleContextMenu, true);
    return () => chatArea.removeEventListener('contextmenu', handleContextMenu, true);
  }, [selectedChat, currentMessages]);

  const toggleMessageSelection = (msgId: string) => {
    setSelectedMessageIds(prev =>
      prev.includes(msgId)
        ? prev.filter(id => id !== msgId)
        : [...prev, msgId]
    );
  };

  const enterSelectionMode = () => {
    setIsSelectionMode(true);
    setSelectedMessageIds([]);
    setChatBackgroundContextMenu(null);
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedMessageIds([]);
  };

  const handleForwardSelectedMessages = () => {
    if (selectedMessageIds.length === 0) return;
    const msgs = currentMessages.filter(m => selectedMessageIds.includes(m.id));
    setForwardingMessages(msgs);
  };

  const handleForwardMessage = async (recipientId: string, chatType: string = "personal") => {
    const msgsToForward = forwardingMessages || (forwardingMessage ? [forwardingMessage] : []);
    if (msgsToForward.length === 0 || !user) return;

    for (const msg of msgsToForward) {
      const payload = {
        senderId: user.id,
        receiverId: chatType === "personal" ? recipientId : "group",
        groupId: chatType === "personal" ? null : recipientId,
        text: msg.text || "",
        type: chatType === "general" ? "group" : chatType,
        forwardedFrom: user.name,
        attachmentUrl: msg.attachmentUrl,
        attachmentName: msg.attachmentName
      };

      try {
        await fetch(`${API_URL}/chat/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        console.error("Error forwarding message:", err);
      }
    }

    setForwardingMessage(null);
    setForwardingMessages(null);
    exitSelectionMode();
    if (selectedChat?.id === recipientId) {
      fetchMessages();
    }
    toast.success(`Message${msgsToForward.length > 1 ? 's' : ''} forwarded successfully!`);
  };

  // Arrow key navigation for pending upload attachments (caret position aware)
  useEffect(() => {
    if (pendingAttachments.length === 0) return;

    const handlePendingArrowKeys = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl) {
        const tagName = activeEl.tagName;
        if (tagName === "INPUT" || tagName === "TEXTAREA") {
          const input = activeEl as HTMLInputElement;
          if (input === captionInputRef.current) {
            const start = input.selectionStart;
            const end = input.selectionEnd;
            const valLen = input.value.length;

            if (start === end) {
              if (e.key === "ArrowLeft" && start === 0) {
                setActivePendingIndex(prev => (prev > 0 ? prev - 1 : prev));
                e.preventDefault();
              } else if (e.key === "ArrowRight" && start === valLen) {
                setActivePendingIndex(prev => (prev < pendingAttachments.length - 1 ? prev + 1 : prev));
                e.preventDefault();
              }
            }
          }
          return;
        }
      }

      if (e.key === "ArrowLeft") {
        setActivePendingIndex(prev => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === "ArrowRight") {
        setActivePendingIndex(prev => (prev < pendingAttachments.length - 1 ? prev + 1 : prev));
      }
    };

    window.addEventListener("keydown", handlePendingArrowKeys);
    return () => {
      window.removeEventListener("keydown", handlePendingArrowKeys);
    };
  }, [pendingAttachments.length]);

  // Arrow key navigation for media preview
  useEffect(() => {
    if (!previewImageMsgId) return;

    const handleArrowKeys = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        if (currentPreviewIndex > 0) {
          setPreviewImageMsgId(mediaMessages[currentPreviewIndex - 1].id);
        }
      } else if (e.key === "ArrowRight") {
        if (currentPreviewIndex < mediaMessages.length - 1) {
          setPreviewImageMsgId(mediaMessages[currentPreviewIndex + 1].id);
        }
      }
    };

    window.addEventListener("keydown", handleArrowKeys);
    return () => {
      window.removeEventListener("keydown", handleArrowKeys);
    };
  }, [previewImageMsgId, currentPreviewIndex, mediaMessages]);

  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [pollData, setPollData] = useState({
    question: "",
    options: ["", ""],
    isMultiple: false
  });

  const [mutedChats, setMutedChats] = useState<string[]>([]);
  const [chatNotificationPrefs, setChatNotificationPrefs] = useState<Record<string, { mode: string; sound: string }>>({});

  const [globalDndEnabled, setGlobalDndEnabled] = useState(false);
  const [globalDefaultMode, setGlobalDefaultMode] = useState("all");
  const [globalDefaultSound, setGlobalDefaultSound] = useState("default");

  const [showTagPicker, setShowTagPicker] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState("");

  // Dynamically position mention tag picker above '@' character
  useEffect(() => {
    if (showTagPicker) {
      const timer = setTimeout(() => {
        const marker = document.getElementById("active-mention-marker");
        const container = messageInputRef.current?.parentElement;
        if (marker && container) {
          const markerRect = marker.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          let leftOffset = markerRect.left - containerRect.left;

          // Constrain the leftOffset so the box doesn't go off screen
          const pickerWidth = 256; // w-64 is 256px
          const maxLeft = containerRect.width - pickerWidth - 8;
          if (leftOffset > maxLeft) {
            leftOffset = maxLeft;
          }
          if (leftOffset < 0) {
            leftOffset = 0;
          }

          setTagPickerLeft(leftOffset);
        }
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [showTagPicker, message]);


  const filteredEmployees = useMemo(() => {
    const q = tagSearchQuery.toLowerCase().trim();
    if (!q) return employees;
    return employees.filter(emp => {
      const name = (emp.name || `${emp.firstName} ${emp.lastName}`).toLowerCase();
      const designation = (emp.designation || "").toLowerCase();
      return name.includes(q) || designation.includes(q);
    });
  }, [employees, tagSearchQuery]);

  useEffect(() => {
    setActiveTagIndex(0);
  }, [tagSearchQuery]);

  const handleInputChange = (val: string) => {
    setMessage(val);
    handleTyping();

    if (selectedChat) {
      const chatId = selectedChat.id || selectedChat.employeeId;
      if (chatId) {
        setDrafts(prev => {
          const updated = { ...prev };
          if (val.trim()) {
            updated[chatId] = val;
          } else {
            delete updated[chatId];
          }
          localStorage.setItem("chatDrafts", JSON.stringify(updated));
          return updated;
        });
      }
    }

    // Only trigger mention if @ is at the start or preceded by a space (and only for group/general chats, not personal)
    const atMatch = val.match(/(^|\s)@([^\s]*)$/);
    const isGroupOrChannel = selectedChat?.type === 'group' || selectedChat?.type === 'general';
    if (atMatch && isGroupOrChannel) {
      const textAfterAt = atMatch[2];
      setShowTagPicker(true);
      setTagSearchQuery(textAfterAt);
      return;
    }
    setShowTagPicker(false);
  };


  const handleTagSelect = (emp: any) => {
    const empName = emp.name || `${emp.firstName} ${emp.lastName}`;
    const formattedTag = `@${empName} `;

    let newMsg = message;
    const lastAtIdx = message.lastIndexOf("@");
    if (lastAtIdx !== -1 && lastAtIdx >= message.length - 25) {
      newMsg = message.slice(0, lastAtIdx) + formattedTag;
    } else {
      newMsg = message + formattedTag;
    }
    setMessage(newMsg);

    // Save draft
    if (selectedChat) {
      const chatId = selectedChat.id || selectedChat.employeeId;
      if (chatId) {
        setDrafts(prev => {
          const updated = { ...prev, [chatId]: newMsg };
          localStorage.setItem("chatDrafts", JSON.stringify(updated));
          return updated;
        });
      }
    }

    setShowTagPicker(false);
    setTagSearchQuery("");

    // Refocus, place caret at the end, and adjust auto-resized height
    setTimeout(() => {
      if (messageInputRef.current) {
        messageInputRef.current.focus();
        const len = newMsg.length;
        messageInputRef.current.setSelectionRange(len, len);
        messageInputRef.current.style.height = 'auto';
        messageInputRef.current.style.height = Math.min(messageInputRef.current.scrollHeight, 120) + 'px';
        if (inputOverlayRef.current) {
          inputOverlayRef.current.scrollTop = messageInputRef.current.scrollTop;
        }
      }
    }, 10);
  };


  useEffect(() => {
    const savedMuted = localStorage.getItem("mutedChats");
    if (savedMuted) {
      try { setMutedChats(JSON.parse(savedMuted)); } catch (e) { console.error(e); }
    }
    const savedPrefs = localStorage.getItem("chatNotificationPrefs");
    if (savedPrefs) {
      try { setChatNotificationPrefs(JSON.parse(savedPrefs)); } catch (e) { console.error(e); }
    }
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      try {
        const p = Notification.requestPermission();
        if (p && typeof p.catch === "function") {
          p.catch((err) => console.warn("Notification request permission rejected:", err));
        }
      } catch (err) {
        console.warn("Notification permission request failed:", err);
      }
    }
    const savedDnd = localStorage.getItem("globalDndEnabled");
    if (savedDnd) setGlobalDndEnabled(savedDnd === "true");
    const savedGlobalMode = localStorage.getItem("globalDefaultMode");
    if (savedGlobalMode && savedGlobalMode !== "none") {
      setGlobalDefaultMode(savedGlobalMode);
    } else {
      setGlobalDefaultMode("all");
      localStorage.setItem("globalDefaultMode", "all");
    }
    const savedGlobalSound = localStorage.getItem("globalDefaultSound");
    if (savedGlobalSound) setGlobalDefaultSound(savedGlobalSound);
  }, []);

  const toggleMuteChat = (chatId: string) => {
    const next = mutedChats.includes(chatId)
      ? mutedChats.filter(id => id !== chatId)
      : [...mutedChats, chatId];
    setMutedChats(next);
    localStorage.setItem("mutedChats", JSON.stringify(next));
  };

  const toggleGlobalDnd = () => {
    const next = !globalDndEnabled;
    setGlobalDndEnabled(next);
    localStorage.setItem("globalDndEnabled", next ? "true" : "false");
  };

  const updateGlobalDefaultMode = (val: string) => {
    setGlobalDefaultMode(val);
    localStorage.setItem("globalDefaultMode", val);
  };

  const updateGlobalDefaultSound = (val: string) => {
    setGlobalDefaultSound(val);
    localStorage.setItem("globalDefaultSound", val);
  };

  const updateNotificationPref = (chatId: string, key: "mode" | "sound", value: string) => {
    const current = chatNotificationPrefs[chatId] || { mode: "all", sound: "default" };
    const next = {
      ...chatNotificationPrefs,
      [chatId]: {
        ...current,
        [key]: value
      }
    };
    setChatNotificationPrefs(next);
    localStorage.setItem("chatNotificationPrefs", JSON.stringify(next));
  };

  const playTestSound = (sound: string) => {
    if (sound === "silent") return;
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtxClass();

      const play = () => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (sound === "bubble") {
          osc.type = "sine";
          osc.frequency.setValueAtTime(150, audioCtx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.15);
          gain.gain.setValueAtTime(0.01, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.15);
        } else if (sound === "beep") {
          osc.type = "square";
          osc.frequency.setValueAtTime(880, audioCtx.currentTime);
          gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.08);
        } else {
          osc.type = "triangle";
          osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
          osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1);
          gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.3);
        }
      };

      if (audioCtx.state === "suspended") {
        audioCtx.resume().then(play).catch(e => console.error(e));
      } else {
        play();
      }
    } catch (e) {
      console.warn("AudioContext block caught:", e);
    }
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tagPickerContainerRef = useRef<HTMLDivElement>(null);
  const captionInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showTagPicker && tagPickerContainerRef.current) {
      const container = tagPickerContainerRef.current;
      const buttons = container.querySelectorAll("button");
      const activeElement = buttons[activeTagIndex] as HTMLElement;
      if (activeElement) {
        const containerHeight = container.clientHeight;
        const elemTop = activeElement.offsetTop;
        const elemHeight = activeElement.offsetHeight;
        if (elemTop < container.scrollTop) {
          container.scrollTop = elemTop;
        } else if (elemTop + elemHeight > container.scrollTop + containerHeight) {
          container.scrollTop = elemTop + elemHeight - containerHeight;
        }
      }
    }
  }, [activeTagIndex, showTagPicker]);

  useEffect(() => {
    if (pendingAttachments.length > 0) {
      setTimeout(() => {
        captionInputRef.current?.focus();
      }, 50);
    }
  }, [pendingAttachments.length, activePendingIndex]);

  const shouldScrollToBottom = useRef(true);
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const typingTimeoutRef = useRef<any>(null);
  const isSendingRef = useRef(false);
  const recordingActionRef = useRef<'preview' | 'send' | 'delete'>('preview');
  const recordingStartTimeRef = useRef<number>(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const pausedDurationRef = useRef(0);


  const prevMessagesLength = useRef(0);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isScrolledUp = scrollHeight - scrollTop - clientHeight > 300;
    setShowScrollBottomBtn(isScrolledUp);
  };

  const scrollToBottom = useCallback((force = false) => {
    if (scrollRef.current && (shouldScrollToBottom.current || force)) {
      const el = scrollRef.current;
      el.scrollTop = el.scrollHeight;

      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 50);

      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 150);

      shouldScrollToBottom.current = false;
    }
  }, []);

  useEffect(() => {
    if (currentMessages.length > prevMessagesLength.current) {
      const lastMessage = currentMessages[currentMessages.length - 1];
      const isSentByMe = lastMessage?.senderId === user?.id || lastMessage?.isMe;
      const isInitialLoad = prevMessagesLength.current === 0;

      if (isSentByMe || isInitialLoad) {
        scrollToBottom(true);
      } else if (scrollRef.current) {
        const threshold = 150;
        const isNearBottom = scrollRef.current.scrollHeight - scrollRef.current.scrollTop - scrollRef.current.clientHeight <= threshold;
        if (isNearBottom) {
          scrollToBottom(true);
        }
      }
    } else {
      scrollToBottom();
    }
    prevMessagesLength.current = currentMessages.length;
  }, [currentMessages, typingUsers, user?.id, scrollToBottom]);

  useEffect(() => {
    if (selectedChat) {
      prevMessagesLength.current = 0;
      shouldScrollToBottom.current = true;
      scrollToBottom(true);
    }
  }, [selectedChat?.id, scrollToBottom]);

  // Keep scroll container scrolled to bottom on resize or layout shifts
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const resizeObserver = new ResizeObserver(() => {
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
      if (shouldScrollToBottom.current || isNearBottom) {
        el.scrollTop = el.scrollHeight;
        shouldScrollToBottom.current = false;
      }
    });

    resizeObserver.observe(el);
    return () => {
      resizeObserver.disconnect();
    };
  }, [selectedChat]);

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_URL}/employees`, { cache: 'no-store' });
      if (res.ok) {
        setEmployees(await res.json());
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  const fetchTypingStatus = async () => {
    if (!user || !selectedChat) return;
    const targetId = selectedChat.id || selectedChat.employeeId;
    try {
      const res = await fetch(`${API_URL}/chat/typing/${targetId}?user_id=${user.id}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();

        // Guard against race conditions
        const currentActiveChat = selectedChatRef.current;
        const currentActiveId = currentActiveChat ? (currentActiveChat.id || currentActiveChat.employeeId) : null;
        if (currentActiveId === targetId) {
          setTypingUsers(data.typingUsers);
        }
      }
    } catch (err) {
      console.error("Error fetching typing status:", err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchChatSummaries();
      fetchChannels();
      fetchSavedMessages();
      fetchEmployees();
    }
  }, [user]);

  useEffect(() => {
    if (user && selectedChat) {
      fetchTypingStatus();
    }
  }, [user, selectedChat]);

  const fetchChannels = async () => {
    try {
      const res = await fetch(`${API_URL}/chat/channels`, { cache: 'no-store' });
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
        toast.success("Channel created successfully!");
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
        toast.success("Channel updated successfully!");
      }
    } catch (err) {
      console.error("Error updating channel:", err);
    }
  };

  const handleDeleteChannel = async (channelId: string) => {
    const isConfirmed = await confirm({
      title: "Confirm Action",
      message: "Are you sure you want to delete this channel and all its messages?",
      destructive: true,
      confirmText: "Confirm"
    });
    if (!isConfirmed) return;
    try {
      const res = await fetch(`${API_URL}/chat/channels/${channelId}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedChat?.id === channelId) setSelectedChat(null);
        fetchChannels();
        toast.success("Channel deleted successfully!");
      }
    } catch (err) {
      console.error("Error deleting channel:", err);
    }
  };

  const fetchChatSummaries = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/chat/summaries/${user.id}`, { cache: 'no-store' });
      if (res.ok) {
        setChatSummaries(await res.json());
      }
    } catch (err) {
      console.error("Error fetching summaries:", err);
    }
  }, [user]);

  const fetchSavedMessages = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/chat/saved-messages/${user.id}`, { cache: 'no-store' });
      if (res.ok) {
        setGlobalSavedMessages(await res.json());
      }
    } catch (err) {
      console.error("Error fetching saved messages:", err);
    }
  };

  const fetchChatFiles = async () => {
    if (!selectedChat || !user) return;
    const targetId = selectedChat.id || selectedChat.employeeId;
    try {
      const isGroup = selectedChat.type === 'group' || selectedChat.type === 'general';
      const res = await fetch(`${API_URL}/chat/files/${user.id}/${selectedChat.id}?is_group=${isGroup}`, { cache: 'no-store' });
      if (res.ok) {
        const files = await res.json();

        // Guard against race conditions
        const currentActiveChat = selectedChatRef.current;
        const currentActiveId = currentActiveChat ? (currentActiveChat.id || currentActiveChat.employeeId) : null;
        if (currentActiveId === targetId) {
          setChatFiles(files.filter((f: any) => !f.isVoice));
        }
      }
    } catch (err) {
      console.error("Error fetching chat files:", err);
    }
  };

  const markAsSeen = async (chatId?: string) => {
    const targetId = chatId || selectedChat?.id;
    if (!targetId || !user) return;
    try {
      contextMarkAsSeen(targetId);
    } catch (err) {
      console.error("Error marking as seen:", err);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (selectedChat) {
        const chatId = selectedChat.id || selectedChat.employeeId;
        localStorage.setItem("activeChatId", chatId);
      } else {
        localStorage.removeItem("activeChatId");
      }
    }
    return () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem("activeChatId");
      }
    };
  }, [selectedChat]);

  // Mark active chat as seen when window gains focus
  useEffect(() => {
    if (isWindowFocused && selectedChat) {
      const chatId = selectedChat.id || selectedChat.employeeId;
      if (chatId) {
        markAsSeen(chatId);
        fetchChatSummaries();
      }
    }
  }, [isWindowFocused, selectedChat, fetchChatSummaries]);

  const handleSelectChat = (chat: any) => {
    if (!chat) return;

    // Prevent clearing messages if the same chat is clicked
    const currentId = selectedChat?.id || selectedChat?.employeeId;
    const newId = chat.id || chat.employeeId;

    if (selectedChat && currentId === newId && selectedChat.type === chat.type) {
      return;
    }

    // Save draft for current chat if any text is typed or attachments exist
    if (selectedChat && currentId) {
      setDrafts(prev => {
        const updated = { ...prev };
        if (message.trim()) {
          updated[currentId] = message;
        } else {
          delete updated[currentId];
        }
        localStorage.setItem("chatDrafts", JSON.stringify(updated));
        return updated;
      });

      setAttachmentsDrafts(prev => {
        const updated = { ...prev };
        if (pendingAttachments.length > 0) {
          updated[currentId] = pendingAttachments;
        } else {
          delete updated[currentId];
        }
        return updated;
      });
    }

    setSelectedChat(chat);
    setSidebarContactUser(null);  // Clear single member detail override on chat switch

    // Automatically switch active tab on left sidebar
    if (chat.type === 'personal') {
      setActiveTab('Personal');
    } else if (chat.type === 'group') {
      setActiveTab('Groups');
    } else if (chat.type === 'general' || chat.id?.startsWith("gen-") || chat.id === "general") {
      setActiveTab('General');
    }

    // Load draft for newly selected chat
    const nextDraft = drafts[newId] || "";
    setMessage(nextDraft);

    const nextAttachments = attachmentsDrafts[newId] || [];
    setPendingAttachments(nextAttachments);
    setActivePendingIndex(0);

    // Auto-resize input height for loaded draft
    setTimeout(() => {
      if (messageInputRef.current) {
        messageInputRef.current.style.height = 'auto';
        messageInputRef.current.style.height = Math.min(messageInputRef.current.scrollHeight, 120) + 'px';
        if (inputOverlayRef.current) {
          inputOverlayRef.current.scrollTop = messageInputRef.current.scrollTop;
        }
      }
    }, 50);

    setCurrentMessages([]);  // Clear stale messages immediately on chat switch
    setFirstUnreadId(null);
    shouldScrollToBottom.current = true;
    const chatId = chat.id || chat.employeeId;
    if (chatId) {
      markAsSeen(chatId);
    }
  };


  const openSidebarForMember = (memberId: string) => {
    const emp = employees.find(e => e.id === memberId || e.employeeId === memberId);
    if (!emp) return;
    setSidebarContactUser(emp);
    setSidebarTab('info');
    setShowRightSidebar(true);
  };

  const openPersonalChatWithEmployeeId = (empId: string) => {
    if (empId === user?.id) return;
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;
    const empName = emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
    handleSelectChat({
      id: emp.id || emp.employeeId,
      name: empName,
      status: onlineUsers.has(emp.id || emp.employeeId) ? "Online" : "Offline",
      avatar: emp.profilePhoto
        ? (emp.profilePhoto.startsWith("http") ? emp.profilePhoto : `${API_URL}/uploads/${emp.profilePhoto}`)
        : null,
      type: "personal"
    });
  };

  // Auto-focus message input when a chat is opened
  useEffect(() => {
    if (selectedChat && messageInputRef.current) {
      setTimeout(() => {
        messageInputRef.current?.focus();
      }, 100);
    }
  }, [selectedChat]);

  const fetchMessages = React.useCallback(async () => {
    if (!selectedChat || !user || !user.id) return;
    const targetId = selectedChat.id || selectedChat.employeeId;
    setIsMessagesLoading(true);
    try {
      const url = (selectedChat.type === 'group' || selectedChat.type === 'general')
        ? `${API_URL}/chat/messages/${user.id}/${targetId}?group_id=${targetId}`
        : `${API_URL}/chat/messages/${user.id}/${targetId}`;

      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();

        // Guard against race conditions: check if this chat is still selected
        const currentActiveChat = selectedChatRef.current;
        const currentActiveId = currentActiveChat ? (currentActiveChat.id || currentActiveChat.employeeId) : null;
        if (currentActiveId !== targetId) {
          return;
        }

        // Mark which messages are mine
        const marked = data.map((m: any) => ({
          ...m,
          isMe: m.senderId === user.id
        }));

        setCurrentMessages(prev => {
          const isInitialLoad = prev.length === 0;
          // Filter out optimistic messages to get real message count
          const prevReal = prev.filter(m => !m._optimistic);
          const hasNewMessages = marked.length > prevReal.length;

          if (isInitialLoad) {
            const firstUnreadIndex = marked.findIndex((m: any) => !m.isMe && (!m.seenBy || !m.seenBy.includes(user.id)));
            if (firstUnreadIndex !== -1) {
              setFirstUnreadId(marked[firstUnreadIndex].id);
            }
          }

          // Notification logic: only when we already had messages and new ones arrived
          if (prevReal.length > 0 && hasNewMessages) {
            // Scroll to bottom when new messages arrive
            shouldScrollToBottom.current = true;
            setTimeout(() => {
              if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
              }
            }, 100);
          }

          // Scroll-to-bottom on initial load
          if (isInitialLoad && marked.length > 0) {
            shouldScrollToBottom.current = true;
            setTimeout(() => {
              if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
              }
            }, 100);
          }

          return marked;
        });

        // If there are unread messages from others, mark them seen
        const hasUnread = marked.some((m: any) => !m.isMe && (!m.seenBy || !m.seenBy.includes(user.id)));
        if (hasUnread) {
          markAsSeen(selectedChat.id || selectedChat.employeeId);
        }
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setIsMessagesLoading(false);
    }
  }, [selectedChat, user, mutedChats, chatNotificationPrefs, globalDndEnabled, globalDefaultMode, globalDefaultSound]);

  const fetchGroups = useCallback(async () => {
    if (!user || !user.id) return;
    try {
      const res = await fetch(`${API_URL}/chat/groups/${user.id}`, { cache: 'no-store' });
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
    } else if (user) {
      fetchGroups();
    }
  }, [selectedChat, user, fetchMessages, fetchGroups]);


  useEffect(() => {
    wsRef.current = ws;
    setIsWsConnected(!!ws);
    if (ws) {
      console.log("[Chat] WebSocket connected ✅");
    } else {
      console.log("[Chat] WebSocket disconnected ❌");
    }
  }, [ws]);

  useEffect(() => {
    if (!user) return;

    const handleWsEvent = (e: any) => {
      const { event: eventType, data } = e.detail;

      if (eventType === "new_message") {
      const activeChat = selectedChatRef.current;
      const activeChatId = activeChat ? (activeChat.id || activeChat.employeeId) : null;

      const isGroupMsg = !!data.groupId;
      const messageChatId = isGroupMsg ? data.groupId : (data.senderId === user.id ? data.receiverId : data.senderId);

      if (activeChatId === messageChatId) {
        // Append to active chat messages
        shouldScrollToBottom.current = true;
        setCurrentMessages((prev) => {
          if (prev.some((m) => m.id === data.id || (data.tempId && (m.tempId === data.tempId || m.id === data.tempId)))) {
            return prev.map(m => (m.tempId === data.tempId || m.id === data.tempId || m.id === data.id) ? { ...data, isMe: data.senderId === user.id } : m);
          }
          return [...prev, { ...data, isMe: data.senderId === user.id }];
        });
        if (isWindowFocused) {
          markAsSeen(messageChatId);
        }
      }

      // Live update sidebar lastMessage for all chats
      const otherId = isGroupMsg ? data.groupId : (data.senderId === user.id ? data.receiverId : data.senderId);
      const msgText = data.text || (data.isVoice ? "🎤 Voice message" : (data.attachmentName ? "📎 Media" : ""));
      const nowIso = new Date().toISOString();
      if (data.groupId) {
        setChatGroups(prev => prev.map(g => g.id === data.groupId ? { ...g, lastMessage: msgText, lastMessageTime: nowIso, lastMessageSenderId: data.senderId } : g));
      } else {
        setChatSummaries(prev => ({
          ...prev,
          [otherId]: { ...prev[otherId], lastMessage: msgText, timestamp: nowIso, senderId: data.senderId }
        }));
      }
    }
    else if (eventType === "message_updated") {
      const activeChat = selectedChatRef.current;
      const activeChatId = activeChat ? (activeChat.id || activeChat.employeeId) : null;

      const isGroupMsg = !!data.groupId;
      const messageChatId = isGroupMsg ? data.groupId : (data.senderId === user.id ? data.receiverId : data.senderId);

      if (activeChatId === messageChatId) {
        setCurrentMessages((prev) =>
          prev.map(m => (m.id === data.id ? { ...data, isMe: data.senderId === user.id } : m))
        );
      }
    }
    else if (eventType === "typing_status") {
      const activeChat = selectedChatRef.current;
      const activeChatId = activeChat ? (activeChat.id || activeChat.employeeId) : null;
      const { chatId: eventChatId, userId: typingUserId, isTyping } = data;

      if (activeChatId === eventChatId) {
        setTypingUsers((prev) => {
          const empName = employees.find(e => e.id === typingUserId || e._id === typingUserId)?.name || "Someone";
          if (isTyping) {
            if (prev.includes(empName)) return prev;
            return [...prev, empName];
          } else {
            return prev.filter(name => name !== empName);
          }
        });
      }
    }
    else if (eventType === "message_deleted") {
      const activeChat = selectedChatRef.current;
      const activeChatId = activeChat ? (activeChat.id || activeChat.employeeId) : null;
      const deletedMsgId = data.messageId || data.id;
      const deletedFor = data.deleteFor || 'me';

      if (deletedFor === 'everyone' || data.senderId === user.id || data.performedBy === user.id) {
        setCurrentMessages((prev) => prev.filter(m => m.id !== deletedMsgId && m.tempId !== deletedMsgId));
      } else {
        setCurrentMessages((prev) =>
          prev.map(m => m.id === deletedMsgId ? { ...m, text: "You deleted this message", deletedForMe: true } : m)
        );
      }
      fetchChatSummaries();
      fetchGroups();
      fetchChannels();
    }
    else if (eventType === "messages_seen") {
      const { chatId: seenChatId, userId: readerUserId } = data;
      const activeChat = selectedChatRef.current;
      const activeChatId = activeChat ? (activeChat.id || activeChat.employeeId) : null;

      if (activeChatId === seenChatId) {
        setCurrentMessages((prev) =>
          prev.map((msg) => {
            if (msg.senderId === user.id) {
              const seenBy = msg.seenBy || [];
              if (!seenBy.includes(readerUserId)) {
                return { ...msg, seenBy: [...seenBy, readerUserId] };
              }
            }
            return msg;
          })
        );
      }

      setChatSummaries((prev: any) => {
        if (prev[seenChatId] && prev[seenChatId].senderId === user.id) {
          return {
            ...prev,
            [seenChatId]: {
              ...prev[seenChatId],
              isSeen: true
            }
          };
        }
        return prev;
      });
    }
    };

    window.addEventListener('chat-ws-event', handleWsEvent);
    return () => window.removeEventListener('chat-ws-event', handleWsEvent);
  }, [user, isWindowFocused, employees]);

  const handleSendMessage = async (extraData: any = null) => {
    // Prevent double-send on rapid taps
    if (isSendingRef.current) return;
    if (!extraData && (!message.trim() && pendingAttachments.length === 0 && !voicePreviewBlob) || !selectedChat || !user) return;

    isSendingRef.current = true;

    // --- CASE 1: Multiple / Single Attachment Upload Queue ---
    if (pendingAttachments.length > 0) {
      const attachmentsToSend = [...pendingAttachments];
      // Clear pending attachments state immediately to close the preview window
      setPendingAttachments([]);
      setActivePendingIndex(0);

      const targetId = selectedChat.id || selectedChat.employeeId;
      const now = new Date();

      const optimisticMsgs = attachmentsToSend.map((att, idx) => {
        const tempId = `temp-${Date.now()}-${idx}`;
        const isImageFile = /\.(jpg|jpeg|png|gif|webp)$/i.test(att.file.name);
        const optimisticText = att.caption || (isImageFile ? "" : `Sent a file: ${att.file.name}`);

        return {
          id: tempId,
          text: optimisticText,
          time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sender: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          senderId: user.id,
          isMe: true,
          _optimistic: true,
          attachmentName: att.file.name,
          attachmentUrl: URL.createObjectURL(att.file),
          _blobUrl: true,
          file: att.file,
          caption: att.caption
        };
      });

      // Append all optimistic messages to currentMessages
      shouldScrollToBottom.current = true;
      setCurrentMessages(prev => [...prev, ...optimisticMsgs]);

      // Optimistically update the sidebar lists (using the caption of the last image or first image)
      const lastText = optimisticMsgs[optimisticMsgs.length - 1].text || "Sent attachments";
      const nowIso = now.toISOString();
      if (selectedChat.type === 'personal') {
        setChatSummaries(prev => ({
          ...prev,
          [targetId]: {
            ...prev[targetId],
            lastMessage: lastText,
            timestamp: nowIso,
            isSeen: false,
            senderId: user.id
          }
        }));
      } else if (selectedChat.type === 'group') {
        setChatGroups(prev => prev.map(g => g.id === targetId ? { ...g, lastMessage: lastText, lastMessageTime: nowIso } : g));
      } else if (selectedChat.type === 'general') {
        setChatChannels(prev => prev.map(c => c.id === targetId ? { ...c, lastMessage: lastText, lastMessageTime: nowIso } : c));
      }

      // Clear input fields immediately
      setMessage("");
      if (selectedChat) {
        const chatId = selectedChat.id || selectedChat.employeeId;
        if (chatId) {
          setDrafts(prev => {
            const updated = { ...prev };
            delete updated[chatId];
            localStorage.setItem("chatDrafts", JSON.stringify(updated));
            return updated;
          });
        }
      }
      setReplyingTo(null);
      stopTyping();

      // Sequentially upload and post each attachment
      for (const optMsg of optimisticMsgs) {
        if (optMsg.file.size > 512 * 1024 * 1024) {
          toast.error(`File ${optMsg.file.name} size cannot exceed 512 MB`);
          setCurrentMessages(prev => prev.filter(m => m.id !== optMsg.id));
          continue;
        }

        const formData = new FormData();
        formData.append('file', optMsg.file);

        let attachmentUrl = "";
        let attachmentName = optMsg.file.name;

        try {
          const uploadRes = await fetch(`${API_URL}/chat/upload`, {
            method: 'POST',
            body: formData
          });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            attachmentUrl = uploadData.url;
            attachmentName = uploadData.filename;
          } else {
            toast.error(`Failed to upload ${optMsg.file.name}.`);
            setCurrentMessages(prev => prev.filter(m => m.id !== optMsg.id));
            continue;
          }
        } catch (err) {
          console.error("Upload error:", err);
          toast.error(`An error occurred during upload of ${optMsg.file.name}.`);
          setCurrentMessages(prev => prev.filter(m => m.id !== optMsg.id));
          continue;
        }

        // Post message to backend
        try {
          const payload: any = {
            senderId: user.id,
            receiverId: (selectedChat.type === 'group' || selectedChat.type === 'general') ? "group" : targetId,
            groupId: (selectedChat.type === 'group' || selectedChat.type === 'general') ? targetId : null,
            text: optMsg.text,
            type: (selectedChat.type === 'group' || selectedChat.type === 'general') ? "group" : "personal",
            tempId: optMsg.id,
            attachmentUrl,
            attachmentName
          };

          if (replyingTo) {
            payload.replyToId = replyingTo.id;
            payload.replyToText = replyingTo.text || (replyingTo.attachmentUrl ? "📷 Image" : (replyingTo.isVoice ? "🎤 Voice Message" : ""));
          }

          const res = await fetch(`${API_URL}/chat/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (res.ok) {
            const newMessage = await res.json();
            setCurrentMessages(prev =>
              prev.map(m => m.id === optMsg.id ? { ...newMessage, isMe: true } : m)
            );
          } else {
            setCurrentMessages(prev => prev.filter(m => m.id !== optMsg.id));
          }
        } catch (err) {
          console.error("Error sending message:", err);
          setCurrentMessages(prev => prev.filter(m => m.id !== optMsg.id));
        }
      }

      isSendingRef.current = false;
      return;
    }

    // --- CASE 2: Voice message upload ---
    if (voicePreviewBlob && !extraData?.isVoice) {
      const audioFile = new File([voicePreviewBlob], "voice_message.webm", { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('file', audioFile);
      try {
        const res = await fetch(`${API_URL}/chat/upload`, {
          method: 'POST',
          body: formData
        });
        if (res.ok) {
          const data = await res.json();
          const duration = recordingDuration;
          setVoicePreviewBlob(null);
          setRecordingDuration(0);
          handleSendMessage({
            isVoice: true,
            attachmentUrl: data.url,
            attachmentName: "Voice Message",
            voiceDuration: duration
          });
        }
      } catch (err) {
        console.error("Error uploading voice message:", err);
        toast.error("Failed to upload voice message");
      }
      isSendingRef.current = false;
      return;
    }

    // --- CASE 3: Text-only message ---
    const optimisticText = message || (extraData?.isVoice ? "Sent a voice message" : "");
    const tempId = `temp-${Date.now()}`;

    const targetId = selectedChat.id || selectedChat.employeeId;
    let payload: any = {
      senderId: user.id,
      receiverId: (selectedChat.type === 'group' || selectedChat.type === 'general') ? "group" : targetId,
      groupId: (selectedChat.type === 'group' || selectedChat.type === 'general') ? targetId : null,
      text: optimisticText,
      type: (selectedChat.type === 'group' || selectedChat.type === 'general') ? "group" : "personal",
      tempId: tempId
    };

    if (extraData) {
      payload = { ...payload, ...extraData };
    }

    if (replyingTo) {
      payload.replyToId = replyingTo.id;
      payload.replyToText = replyingTo.text || (replyingTo.attachmentUrl ? "📷 Image" : (replyingTo.isVoice ? "🎤 Voice Message" : ""));
    }

    // --- Optimistic UI: show message instantly before server responds ---
    const optimisticMessage: any = {
      id: tempId,
      text: optimisticText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      senderId: user.id,
      isMe: true,
      replyToId: replyingTo?.id,
      replyToText: replyingTo?.text || (replyingTo?.attachmentUrl ? "📷 Image" : (replyingTo?.isVoice ? "🎤 Voice Message" : "")),
      _optimistic: true,
    };
    shouldScrollToBottom.current = true;
    setCurrentMessages(prev => [...prev, optimisticMessage]);

    // Optimistically update the sidebar lists instantly
    const nowIso = new Date().toISOString();
    if (selectedChat.type === 'personal') {
      setChatSummaries(prev => ({
        ...prev,
        [targetId]: {
          ...prev[targetId],
          lastMessage: optimisticText,
          timestamp: nowIso,
          isSeen: false,
          senderId: user.id
        }
      }));
    } else if (selectedChat.type === 'group') {
      setChatGroups(prev => prev.map(g => g.id === targetId ? { ...g, lastMessage: optimisticText, lastMessageTime: nowIso } : g));
    } else if (selectedChat.type === 'general') {
      setChatChannels(prev => prev.map(c => c.id === targetId ? { ...c, lastMessage: optimisticText, lastMessageTime: nowIso } : c));
    }

    // Clear input fields immediately so the user gets instant feedback
    setMessage("");
    if (selectedChat) {
      const chatId = selectedChat.id || selectedChat.employeeId;
      if (chatId) {
        setDrafts(prev => {
          const updated = { ...prev };
          delete updated[chatId];
          localStorage.setItem("chatDrafts", JSON.stringify(updated));
          return updated;
        });
      }
    }
    setReplyingTo(null);
    stopTyping();

    try {
      const res = await fetch(`${API_URL}/chat/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const newMessage = await res.json();
        // Replace the optimistic placeholder with the confirmed server message
        setCurrentMessages(prev =>
          prev.map(m => m.id === tempId ? { ...newMessage, isMe: true } : m)
        );
      } else {
        // Remove the optimistic message if the server rejected it
        setCurrentMessages(prev => prev.filter(m => m.id !== tempId));
      }
    } catch (err) {
      console.error("Error sending message:", err);
      // Remove the optimistic message on network error
      setCurrentMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      isSendingRef.current = false;
    }
  };

  const handleDownload = async (url: string, filename: string) => {
    if (!url || url === "#") {
      toast.error(`This attachment is not available for download (URL: ${url}). Please send a NEW file to test.`);
      return;
    }
    const fullUrl = getDownloadUrl(url);
    let cleanFilename = filename.replace(/^[a-f0-9]+_/, "");

    try {
      const response = await fetch(encodeURI(fullUrl));
      if (!response.ok) {
        toast.error(`Failed to download: File not found or unavailable on the server.`);
        return;
      }
      const blob = await response.blob();

      const ext = cleanFilename.includes('.') ? '' : (
        blob.type.includes('pdf') ? '.pdf' :
        blob.type.includes('webm') ? '.webm' :
        blob.type.includes('mp3') || blob.type.includes('mpeg') ? '.mp3' :
        blob.type.includes('ogg') ? '.ogg' :
        blob.type.includes('wav') ? '.wav' :
        blob.type.includes('mp4') ? '.mp4' :
        blob.type.includes('jpeg') || blob.type.includes('jpg') ? '.jpg' :
        blob.type.includes('png') ? '.png' :
        blob.type.includes('gif') ? '.gif' :
        '.bin'
      );
      if (ext) cleanFilename += ext;

      if (typeof window !== 'undefined' && (window as any).electronAPI?.saveFile) {
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        await (window as any).electronAPI.saveFile(cleanFilename, uint8Array);
      } else {
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = cleanFilename || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
      }
    } catch (err) {
      console.warn("Download fallback:", err);
      window.open(fullUrl, '_blank');
    }
  };

  const handleOpenAttachment = async (url: string, filename: string) => {
    if (!url || url === "#") {
      toast.error(`This attachment is not available (URL: ${url}).`);
      return;
    }
    const fullUrl = getOpenUrl(url);
    const cleanFilename = filename.replace(/^[a-f0-9]+_/, "");

    // Show opening toast notification
    toast(`"${cleanFilename}" opening.`, { id: "pdf-open" });

    // If running inside Electron, delegate to native download/save and system-open (opens in system default browser)
    if (typeof window !== 'undefined' && (window as any).electronAPI?.saveAndOpen) {
      try {
        const response = await fetch(encodeURI(fullUrl));
        if (!response.ok) {
          toast.error(`Failed to open: File not found or unavailable on the server.`, { id: "pdf-open" });
          return;
        }
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        await (window as any).electronAPI.saveAndOpen(cleanFilename, uint8Array);
        return;
      } catch (err) {
        console.warn("Electron native saveAndOpen failed, falling back:", err);
      }
    }

    try {
      const cache = await caches.open("chat-attachments-cache");
      const cachedResponse = await cache.match(fullUrl);
      if (cachedResponse) {
        const blob = await cachedResponse.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        return;
      }

      const response = await fetch(encodeURI(fullUrl));
      if (!response.ok) {
        toast.error(`Failed to open: File not found or unavailable on the server.`, { id: "pdf-open" });
        return;
      }
      const blob = await response.blob();

      // Cache the response blob
      await cache.put(fullUrl, new Response(blob, {
        headers: {
          'Content-Type': blob.type,
          'Content-Length': blob.size.toString()
        }
      }));

      const blobUrl = window.URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (err) {
      console.warn("Open fallback:", err);
      window.open(fullUrl, '_blank');
    }
  };

  const renderImageGrid = (groupMsgs: any[], originalMsg: any) => {
    const count = groupMsgs.length;
    const visibleMsgs = groupMsgs.slice(0, 4);

    let gridClass = "";
    if (count === 2) {
      gridClass = "grid grid-cols-2 gap-1 w-[280px] sm:w-[360px] h-[120px] sm:h-[160px] lg:h-[200px]";
    } else if (count === 3) {
      gridClass = "grid grid-cols-3 grid-rows-2 gap-1 w-[280px] sm:w-[360px] h-[160px] sm:h-[200px] lg:h-[260px]";
    } else {
      gridClass = "grid grid-cols-2 grid-rows-2 gap-1 w-[280px] sm:w-[360px] h-[200px] sm:h-[300px] lg:h-[400px]";
    }

    const showTimestampOverlay = groupMsgs.every(gMsg => !gMsg.text || !gMsg.text.trim());
    const bottomRightIdx = Math.min(count - 1, 3);

    return (
      <div className={gridClass}>
        {visibleMsgs.map((gMsg, idx) => {
          const isLast = idx === 3 && count > 4;
          const remainingCount = count - 3;
          const isBottomRight = idx === bottomRightIdx;

          let itemClass = "relative overflow-hidden rounded-md cursor-pointer hover:opacity-95 transition-opacity border border-black/5";
          if (count === 3) {
            if (idx === 0) {
              itemClass += " col-span-2 row-span-2";
            } else {
              itemClass += " col-span-1 row-span-1";
            }
          } else {
            itemClass += " col-span-1 row-span-1";
          }

          const imgUrl = gMsg.attachmentUrl?.startsWith('blob:') ? gMsg.attachmentUrl :
            gMsg.attachmentUrl?.startsWith('http') ? gMsg.attachmentUrl :
              `${API_URL}${gMsg.attachmentUrl}`;

          return (
            <div
              key={gMsg.id}
              className={itemClass}
              onClick={() => setPreviewImageMsgId(gMsg.id)}
            >
              <ImageWithLoader
                src={imgUrl}
                alt={gMsg.attachmentName}
                className="w-full h-full"
                imgClassName="object-cover"
                onLoad={() => scrollToBottom(true)}
              />
              {isLast && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center select-none z-5">
                  <span className="text-white text-2xl font-bold">+{remainingCount}</span>
                </div>
              )}
              {isBottomRight && showTimestampOverlay && (
                <div className="absolute bottom-2 right-2 flex items-center gap-1.5 text-[10px] text-white bg-black/40 px-2 py-0.5 rounded-[10px] select-none backdrop-blur-xs z-10">
                  <span>{dayjs(originalMsg.timestamp).format("hh:mm A")}</span>
                  {renderCheckmarks(originalMsg, true)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    console.log("handleFileSelect: Files selected count =", selectedFiles?.length);
    if (selectedFiles && selectedFiles.length > 0) {
      const wasEmpty = pendingAttachments.length === 0;
      const newAttachments = Array.from(selectedFiles).map((file, idx) => ({
        file,
        caption: (wasEmpty && idx === 0) ? message : ""
      }));

      setPendingAttachments(prev => [...prev, ...newAttachments]);
      if (wasEmpty) {
        setActivePendingIndex(0);
        if (message) {
          setMessage("");
        }
      }
      e.target.value = ""; // Reset value to allow re-selection
      setTimeout(() => messageInputRef.current?.focus(), 10);
    }
  };

  const handleCaptionChange = (val: string) => {
    setPendingAttachments(prev => prev.map((att, idx) => idx === activePendingIndex ? { ...att, caption: val } : att));
  };

  const removeAttachment = (indexToRemove: number) => {
    setPendingAttachments(prev => {
      const updated = prev.filter((_, i) => i !== indexToRemove);
      setActivePendingIndex(prevIndex => {
        const newLen = updated.length;
        if (newLen === 0) return 0;
        if (prevIndex >= newLen) return newLen - 1;
        return prevIndex;
      });
      return updated;
    });
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    if (!selectedChat) return;
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedChat) return;
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    if (!selectedChat) return;

    console.log("handleDrop: Files dropped count =", e.dataTransfer.files?.length);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const wasEmpty = pendingAttachments.length === 0;
      const newAttachments = Array.from(e.dataTransfer.files).map((file, idx) => ({
        file,
        caption: (wasEmpty && idx === 0) ? message : ""
      }));

      setPendingAttachments(prev => [...prev, ...newAttachments]);
      if (wasEmpty) {
        setActivePendingIndex(0);
        if (message) {
          setMessage("");
        }
      }
      e.dataTransfer.clearData();
      setTimeout(() => messageInputRef.current?.focus(), 10);
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
          toast.success("Group updated successfully.");
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
    const isConfirmed = await confirm({
      title: "Confirm Action",
      message: "Are you sure you want to delete this group? This will delete all messages permanently.",
      destructive: true,
      confirmText: "Confirm"
    });
    if (!isConfirmed) return;
    try {
      const res = await fetch(`${API_URL}/chat/groups/${groupId}`, { method: 'DELETE' });
      if (res.ok) {
        setChatGroups(prev => prev.filter(g => g.id !== groupId));
        setSelectedChat(null as any);
        toast.success("Group deleted successfully.");
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
    enterSelectionMode();
    toggleMessageSelection(msg.id);
    setMessageToDelete(msg);
    setShowDeleteConfirm(true);
  };

  const canDeleteForEveryone = () => {
    const ids = selectedMessageIds.length > 0 ? selectedMessageIds : (messageToDelete ? [messageToDelete.id] : []);
    if (ids.length === 0) return false;
    return ids.every(id => {
      const msg = currentMessages.find(m => m.id === id);
      return msg?.isMe;
    });
  };

  const confirmDeleteMessage = async (deleteFor: 'me' | 'everyone') => {
    const idsToDelete = selectedMessageIds.length > 0
      ? selectedMessageIds
      : (messageToDelete ? [messageToDelete.id] : []);
    if (idsToDelete.length === 0) return;
    try {
      await Promise.all(idsToDelete.map(id =>
        fetch(`${API_URL}/chat/messages/${id}?deleteFor=${deleteFor}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ performedBy: user?.id })
        })
      ));
      setShowDeleteConfirm(false);
      setMessageToDelete(null);
      if (isSelectionMode) exitSelectionMode();
      fetchMessages();
      toast.success(idsToDelete.length > 1
        ? `${idsToDelete.length} messages deleted`
        : (deleteFor === 'everyone' ? "Message deleted for everyone" : "Message deleted for you"));
    } catch (err) {
      console.error("Error deleting message:", err);
      toast.error("Failed to delete message");
    }
  };

  const handleToggleStarMessage = async (msgId: string) => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/chat/messages/${msgId}/toggle-star?user_id=${user.id}`, { method: 'POST' });
      if (res.ok) {
        fetchMessages();
        toast.success("Message starred!");
      }
    } catch (err) {
      console.error("Error toggling star:", err);
    }
  };

  const handleShareMessage = async (msg: any) => {
    const url = msg.attachmentUrl
      ? (msg.attachmentUrl.startsWith('http') ? msg.attachmentUrl : `${API_URL}${msg.attachmentUrl}`)
      : `${window.location.origin}/chat?msg=${msg.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'HRMS Message', text: msg.text || '', url });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          navigator.clipboard.writeText(url);
          toast.success("Link copied to clipboard!");
        }
      }
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleOpenWith = (msg: any) => {
    if (msg.attachmentUrl) {
      const url = msg.attachmentUrl.startsWith('http') ? msg.attachmentUrl : `${API_URL}${msg.attachmentUrl}`;
      window.open(url, '_blank');
    }
  };

  const handleReportMessage = async (msgId: string) => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/chat/messages/${msgId}/report?user_id=${user.id}`, { method: 'POST' });
      if (res.ok) {
        toast.success("Message reported.");
      } else {
        toast.error("Failed to report message.");
      }
    } catch (err) {
      console.error("Error reporting message:", err);
      toast.error("Failed to report message.");
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
        toast.error("Status updated!");
        setShowStatusPicker(false);
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  // Typing logic
  const stopTyping = () => {
    if (!user || !selectedChat) return;
    const chatId = selectedChat.id || selectedChat.employeeId;
    if (!chatId) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "typing",
        chatId: chatId,
        isTyping: false
      }));
    } else {
      fetch(`${API_URL}/chat/typing?chat_id=${chatId}&user_id=${user.id}&is_typing=false`, { method: 'POST' });
    }
  };

  const handleTyping = () => {
    if (!user || !selectedChat) return;
    const chatId = selectedChat.id || selectedChat.employeeId;
    if (!chatId) return;

    // Notify server we are typing via WebSocket if connected, with fallback to standard REST
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "typing",
        chatId: chatId,
        isTyping: true
      }));
    } else {
      fetch(`${API_URL}/chat/typing?chat_id=${chatId}&user_id=${user.id}&is_typing=true`, { method: 'POST' });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
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
        const action = recordingActionRef.current;
        stream.getTracks().forEach(track => track.stop());

        if (action === 'delete') {
          setVoicePreviewBlob(null);
          setRecordingDuration(0);
          return;
        }

        if (action === 'send') {
          const audioFile = new File([audioBlob], "voice_message.webm", { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('file', audioFile);
          try {
            const res = await fetch(`${API_URL}/chat/upload`, {
              method: 'POST',
              body: formData
            });
            if (res.ok) {
              const data = await res.json();
              const dur = recordingStartTimeRef.current ? Math.floor((Date.now() - recordingStartTimeRef.current) / 1000) : 1;
              setVoicePreviewBlob(null);
              setRecordingDuration(0);
              handleSendMessage({
                isVoice: true,
                attachmentUrl: data.url,
                attachmentName: "Voice Message",
                voiceDuration: dur || 1
              });
            }
          } catch (err) {
            console.error("Error uploading voice message:", err);
            toast.error("Failed to upload voice message");
          }
          return;
        }

        setVoicePreviewBlob(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setRecordingDuration(0);
      recordingActionRef.current = 'preview';
      recordingStartTimeRef.current = Date.now();
      pausedDurationRef.current = 0;
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error starting recording:", err);
      toast.error("Please allow microphone access to record voice messages.");
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      clearInterval(recordingTimerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && (isRecording || mediaRecorderRef.current.state !== "inactive")) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
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

    const applyVoteOptions = (options: any[]) => {
      setCurrentMessages((prev) =>
        prev.map((msg: any) =>
          msg.id === messageId && msg.poll
            ? { ...msg, poll: { ...msg.poll, options } }
            : msg
        )
      );
    };

    const previousMessage = currentMessages.find((msg: any) => msg.id === messageId);
    if (!previousMessage?.poll) return;

    const optimisticOptions = previousMessage.poll.options.map((option: any) => {
      const votes = Array.isArray(option.votes) ? [...option.votes] : [];
      const hasVote = votes.includes(user.id);

      if (option.id === optionId) {
        return {
          ...option,
          votes: hasVote ? votes.filter((id: string) => id !== user.id) : [...votes, user.id]
        };
      }

      if (!previousMessage.poll.isMultiple) {
        return {
          ...option,
          votes: votes.filter((id: string) => id !== user.id)
        };
      }

      return { ...option, votes };
    });

    applyVoteOptions(optimisticOptions);

    try {
      const res = await fetch(`${API_URL}/chat/messages/${messageId}/vote?user_id=${user.id}&option_id=${optionId}`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.options) {
          applyVoteOptions(data.options);
        } else {
          fetchMessages();
        }
      } else {
        applyVoteOptions(previousMessage.poll.options);
        toast.error("Vote failed");
      }
    } catch (err) {
      console.error("Error voting:", err);
      applyVoteOptions(previousMessage.poll.options);
      toast.error("Vote failed");
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
      .map((emp: any) => {
        const summary = chatSummaries[emp.id];
        const isOnline = onlineUsers.has(emp.id || emp.employeeId);
        const empName = emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
        return {
          id: emp.id || emp.employeeId,
          name: emp.id === user?.id ? `${empName} (You)` : empName,
          status: isOnline ? "Online" : "Offline",
          lastMessage: summary?.lastMessage
            ? summary.lastMessage
            : (summary?.attachmentUrl || summary?.attachmentName)
              ? "Sent a file"
              : "Click to start chatting",
          time: summary?.timestamp ? dayjs(summary.timestamp).format("hh:mm A") : "",
          timestamp: summary?.timestamp || 0,
          avatar: emp.profilePhoto
            ? (emp.profilePhoto.startsWith("http") ? emp.profilePhoto : `${API_URL}/uploads/${emp.profilePhoto}`)
            : null,
          type: "personal",
          senderId: summary?.senderId,
          isSeen: summary?.isSeen,
          isVoice: summary?.isVoice || false,
          attachmentName: summary?.attachmentName
        };
      })
      .sort((a: any, b: any) => {
        // Pin self-chat to the very top
        if (a.id === user?.id) return -1;
        if (b.id === user?.id) return 1;

        // Unread messages on top
        const unreadA = unreadCounts[a.id] > 0 ? 1 : 0;
        const unreadB = unreadCounts[b.id] > 0 ? 1 : 0;
        if (unreadA !== unreadB) {
          return unreadB - unreadA;
        }

        // Sort remaining chats by timestamp descending
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });
  }, [employees, user?.id, chatSummaries, onlineUsers]);

  // Auto-select the most recent active conversation on page load or when notification is clicked
  useEffect(() => {
    if (!selectedChat && chats.length > 0) {
      if (typeof window !== "undefined") {
        const targetId = localStorage.getItem("selectedChatIdOnMount");
        if (targetId) {
          localStorage.removeItem("selectedChatIdOnMount");
          localStorage.removeItem("selectedChatTypeOnMount");

          const foundChat = chats.find(c => String(c.id) === String(targetId));
          if (foundChat) {
            handleSelectChat(foundChat);
            setActiveTab("Personal");
            return;
          }

          const chan = chatChannels.find(c => String(c.id) === String(targetId));
          if (chan) {
            handleSelectChat({ ...chan, type: 'general' });
            setActiveTab("General");
            return;
          }

          const grp = chatGroups.find(g => String(g.id) === String(targetId));
          if (grp) {
            handleSelectChat({ ...grp, type: 'group' });
            setActiveTab("Groups");
            return;
          }
        }
      }

    }
  }, [chats, selectedChat, chatChannels, chatGroups, handleSelectChat]);

  // Disable outer layout scroll on mount of Chat page to prevent page overflow
  useEffect(() => {
    const siteLayout = document.querySelector(".site-layout");
    if (siteLayout) {
      const originalOverflow = (siteLayout as HTMLElement).style.overflow;
      (siteLayout as HTMLElement).style.overflow = "hidden";
      return () => {
        (siteLayout as HTMLElement).style.overflow = originalOverflow;
      };
    }
  }, []);

  // Listen for notification clicks when already on the chat page
  useEffect(() => {
    const handleNotificationClick = () => {
      const targetId = localStorage.getItem("selectedChatIdOnMount");
      if (targetId) {
        localStorage.removeItem("selectedChatIdOnMount");
        localStorage.removeItem("selectedChatTypeOnMount");

        const foundChat = chats.find(c => String(c.id) === String(targetId));
        if (foundChat) {
          handleSelectChat(foundChat);
          setActiveTab("Personal");
          return;
        }

        // Try channels
        const chan = chatChannels.find(c => String(c.id) === String(targetId));
        if (chan) {
          handleSelectChat({ ...chan, type: 'general' });
          setActiveTab("General");
          return;
        }

        // Try groups
        const grp = chatGroups.find(g => String(g.id) === String(targetId));
        if (grp) {
          handleSelectChat({ ...grp, type: 'group' });
          setActiveTab("Groups");
          return;
        }
      }
    };

    window.addEventListener("chat-notification-click", handleNotificationClick);
    return () => {
      window.removeEventListener("chat-notification-click", handleNotificationClick);
    };
  }, [chats, chatChannels, chatGroups, handleSelectChat]);

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

  const { imageGroups, messageToGroupFirstId } = useMemo(() => {
    const isImageMessage = (msg: any) => {
      return msg && msg.attachmentName && !msg.isVoice && /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.attachmentName);
    };

    const groups: Record<string, any[]> = {};
    const msgToFirstId: Record<string, string> = {};

    let currentGroup: any[] = [];
    for (let i = 0; i < displayMessages.length; i++) {
      const msg = displayMessages[i];
      if (isImageMessage(msg)) {
        if (currentGroup.length === 0) {
          currentGroup.push(msg);
        } else {
          const prevMsg = currentGroup[currentGroup.length - 1];
          const sameSender = String(prevMsg.senderId) === String(msg.senderId);
          const timeDiff = Math.abs(dayjs(msg.timestamp).diff(dayjs(prevMsg.timestamp), 'second'));
          if (sameSender && timeDiff <= 5) {
            currentGroup.push(msg);
          } else {
            if (currentGroup.length > 1) {
              const firstId = currentGroup[0].id;
              groups[firstId] = [...currentGroup];
              currentGroup.forEach(m => {
                msgToFirstId[m.id] = firstId;
              });
            }
            currentGroup = [msg];
          }
        }
      } else {
        if (currentGroup.length > 1) {
          const firstId = currentGroup[0].id;
          groups[firstId] = [...currentGroup];
          currentGroup.forEach(m => {
            msgToFirstId[m.id] = firstId;
          });
        }
        currentGroup = [];
      }
    }
    if (currentGroup.length > 1) {
      const firstId = currentGroup[0].id;
      groups[firstId] = [...currentGroup];
      currentGroup.forEach(m => {
        msgToFirstId[m.id] = firstId;
      });
    }

    return { imageGroups: groups, messageToGroupFirstId: msgToFirstId };
  }, [displayMessages]);

  const totalPersonalUnread = useMemo(() => {
    return Object.entries(unreadCounts).reduce((acc, [id, count]) => {
      const isPersonal = chats.some(c => c.id === id);
      if (isPersonal) {
        return acc + (count as number);
      }
      return acc;
    }, 0);
  }, [unreadCounts, chats]);

  const totalGroupsUnread = useMemo(() => {
    return Object.entries(unreadCounts).reduce((acc, [id, count]) => {
      const isGroup = chatGroups.some(g => g.id === id);
      if (isGroup) {
        return acc + (count as number);
      }
      return acc;
    }, 0);
  }, [unreadCounts, chatGroups]);

  const totalGeneralUnread = useMemo(() => {
    return Object.entries(unreadCounts).reduce((acc, [id, count]) => {
      const isGeneral = chatChannels.some(c => c.id === id);
      if (isGeneral) {
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 rounded-full transition-colors",
                      globalDndEnabled ? "text-rose-500 hover:text-rose-600" : "text-brand-teal hover:text-brand-teal-600"
                    )}
                    title="Global Notification Settings"
                  >
                    {globalDndEnabled ? (
                      <BellOff className="w-5 h-5" />
                    ) : (
                      <Bell className="w-5 h-5" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-5 rounded-xl shadow-lg border border-border bg-white" align="start">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <h4 className="font-bold text-slate-800 text-[14px]">Global Notification Settings</h4>
                      <span className="text-[9px] bg-brand-teal/10 text-brand-teal font-extrabold uppercase px-2 py-0.5 rounded-full">
                        App-Wide
                      </span>
                    </div>

                    <div className="space-y-3">
                      {/* Do Not Disturb Toggle */}
                      <div className="flex items-center justify-between pb-1">
                        <div className="space-y-0.5">
                          <label className="text-xs font-bold text-rose-600 block">Do Not Disturb (DND)</label>
                          <span className="text-[10px] text-slate-400 font-medium">Mute all app alerts temporarily</span>
                        </div>
                        <Checkbox
                          checked={globalDndEnabled}
                          onCheckedChange={toggleGlobalDnd}
                          className="border-slate-300 data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500"
                        />
                      </div>

                      {!globalDndEnabled && (
                        <>
                          <div className="space-y-1.5 pt-1">
                            <label className="text-xs font-bold text-slate-700 block">Default Alert Mode</label>
                            <select
                              value={globalDefaultMode}
                              onChange={(e) => updateGlobalDefaultMode(e.target.value)}
                              className="w-full h-9 rounded-lg border border-slate-200 bg-white text-xs px-2.5 text-slate-700 outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition-all font-semibold"
                            >
                              <option value="all">All Messages</option>
                              <option value="mentions">@ Mentions Only</option>
                            </select>
                          </div>

                        </>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

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
              className="pl-9 pr-9 bg-white border-border rounded-lg h-10 shadow-sm"
            />
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:bg-transparent hover:text-slate-700"
                onClick={() => setSearchQuery("")}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
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
                          <AvatarImage src={getAvatarUrl(chat.avatar)} />
                        ) : (
                          <AvatarFallback className="bg-brand-light text-brand-teal font-bold uppercase">
                            {chat.name[0]}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      {(onlineUsers.has(chat.id) || onlineUsers.has(chat.employeeId)) && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <h3 className="font-bold text-[14px] text-foreground truncate">{chat.name}</h3>
                          {unreadCounts[chat.id] > 0 && (
                            <Badge className="bg-[#00a884] text-white text-[10px] h-5 min-w-5 px-1 flex items-center justify-center rounded-full border-none font-bold shrink-0">
                              {unreadCounts[chat.id]}
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap shrink-0">{chat.time}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {employees.find(e => e.id === chat.id)?.statusEmoji && (
                            <span className="text-[10px] shrink-0">{employees.find(e => e.id === chat.id)?.statusEmoji}</span>
                          )}
                          <p className="text-[12px] text-muted-foreground truncate flex items-center gap-1 min-w-0 max-w-full">
                            {drafts[chat.id] ? (
                              <>
                                <span className="text-[#00a884] font-bold shrink-0">Draft: </span>
                                <span className="truncate">{drafts[chat.id]}</span>
                              </>
                            ) : (
                              (() => {
                                const customStatus = employees.find(e => e.id === chat.id)?.customStatus;
                                if (customStatus) {
                                  return <span className="truncate">{customStatus}</span>;
                                }
                                const isMe = chat.senderId === user?.id;
                                const isAudio = chat.isVoice || isAudioMessageText(chat.lastMessage) || (chat.attachmentName && /\.(webm|mp3|wav|ogg|m4a)$/i.test(chat.attachmentName));
                                
                                return (
                                  <span className="flex items-center gap-1 min-w-0 max-w-full truncate">
                                    {isMe && (
                                      <span className="shrink-0 flex items-center">
                                        {renderCheckmarks({ isMe, isSeen: chat.isSeen, receiverId: chat.id }, false)}
                                      </span>
                                    )}
                                    {isAudio ? (
                                      <span className="flex items-center gap-1 text-[#667781] font-semibold shrink-0">
                                        <Headphones className="w-3.5 h-3.5 text-[#8696a0]" />
                                        <span>Audio</span>
                                      </span>
                                    ) : (
                                      <span className="truncate">{stripFormatting(chat.lastMessage)}</span>
                                    )}
                                  </span>
                                );
                              })()
                            )}
                          </p>
                        </div>
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
                [...chatGroups].sort((a, b) => {
                  const unreadA = unreadCounts[a.id] > 0 ? 1 : 0;
                  const unreadB = unreadCounts[b.id] > 0 ? 1 : 0;
                  return unreadB - unreadA;
                }).map((group: any) => (
                  <div
                    key={group.id}
                    onClick={() => handleSelectChat({ ...group, type: 'group' })}
                    className={cn(
                      "flex items-center gap-4 p-4 cursor-pointer transition-all border-b border-border/50 hover:bg-gray-50 group",
                      selectedChat?.id === group.id && "bg-brand-teal/5 border-l-4 border-l-brand-teal"
                    )}
                  >
                    <div className="relative">
                      <Avatar className="w-12 h-12 border-2 border-white shadow-sm ring-1 ring-border">
                        {group.avatar ? (
                          <AvatarImage src={getAvatarUrl(group.avatar)} />
                        ) : (
                          <AvatarFallback className="bg-brand-light text-brand-teal font-bold uppercase">
                            {group.name[0]}
                          </AvatarFallback>
                        )}
                      </Avatar>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <h3 className="font-bold text-[14px] text-foreground truncate">{group.name}</h3>
                          {unreadCounts[group.id] > 0 && (
                            <Badge className="bg-[#00a884] text-white text-[10px] h-5 min-w-5 px-1 flex items-center justify-center rounded-full border-none font-bold shrink-0">
                              {unreadCounts[group.id]}
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap shrink-0">{group.lastMessageTime}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12px] text-muted-foreground truncate flex items-center gap-1 min-w-0 max-w-full">
                          {drafts[group.id] ? (
                            <>
                              <span className="text-[#00a884] font-bold shrink-0">Draft: </span>
                              <span className="truncate">{drafts[group.id]}</span>
                            </>
                          ) : (
                            (() => {
                              if (!group.lastMessage) return <span className="truncate">No messages yet</span>;
                              const isMe = group.lastMessageSenderId === user?.id;
                              const isAudio = group.lastMessageIsVoice || isAudioMessageText(group.lastMessage) || (group.lastMessageAttachmentName && /\.(webm|mp3|wav|ogg|m4a)$/i.test(group.lastMessageAttachmentName));
                              
                              return (
                                <span className="flex items-center gap-1 min-w-0 max-w-full truncate">
                                  {isMe && (
                                    <span className="shrink-0 flex items-center">
                                      {renderCheckmarks({ isMe, isSeen: false }, false)}
                                    </span>
                                  )}
                                  {isAudio ? (
                                    <span className="flex items-center gap-1 text-[#667781] font-semibold shrink-0">
                                      <Headphones className="w-3.5 h-3.5 text-[#8696a0]" />
                                      <span>Audio</span>
                                    </span>
                                  ) : (
                                    <span className="truncate">{stripFormatting(group.lastMessage)}</span>
                                  )}
                                </span>
                              );
                            })()
                          )}
                        </p>
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
              {chatChannels.length > 0 ? (
                [...chatChannels].sort((a, b) => {
                  const unreadA = unreadCounts[a.id] > 0 ? 1 : 0;
                  const unreadB = unreadCounts[b.id] > 0 ? 1 : 0;
                  return unreadB - unreadA;
                }).map((channel: any) => (
                  <div
                    key={channel.id}
                    onClick={() => handleSelectChat({ ...channel, type: 'general' })}
                    className={cn(
                      "flex items-center gap-4 p-4 cursor-pointer transition-all border-b border-border/50 hover:bg-gray-50 group",
                      selectedChat?.id === channel.id && "bg-brand-teal/5 border-l-4 border-l-brand-teal"
                    )}
                  >
                    <div className="relative">
                      <Avatar className="w-12 h-12 border-2 border-white shadow-sm ring-1 ring-border">
                        {channel.avatar ? (
                          <AvatarImage src={getAvatarUrl(channel.avatar)} />
                        ) : (
                          <AvatarFallback className="bg-brand-light text-brand-teal font-bold uppercase">
                            {channel.name[0]}
                          </AvatarFallback>
                        )}
                      </Avatar>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <h3 className="font-bold text-[14px] text-foreground truncate">{channel.name}</h3>
                          {unreadCounts[channel.id] > 0 && (
                            <Badge className="bg-[#00a884] text-white text-[10px] h-5 min-w-5 px-1 flex items-center justify-center rounded-full border-none font-bold shrink-0">
                              {unreadCounts[channel.id]}
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap shrink-0">{channel.lastMessageTime}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12px] text-muted-foreground truncate flex items-center gap-1 min-w-0 max-w-full">
                          {drafts[channel.id] ? (
                            <>
                              <span className="text-[#00a884] font-bold shrink-0">Draft: </span>
                              <span className="truncate">{drafts[channel.id]}</span>
                            </>
                          ) : (
                            (() => {
                              if (!channel.lastMessage || channel.lastMessage === channel.description) {
                                return <span className="truncate">{channel.description || "No messages yet"}</span>;
                              }
                              const isMe = channel.lastMessageSenderId === user?.id;
                              const isAudio = channel.lastMessageIsVoice || isAudioMessageText(channel.lastMessage) || (channel.lastMessageAttachmentName && /\.(webm|mp3|wav|ogg|m4a)$/i.test(channel.lastMessageAttachmentName));
                              
                              return (
                                <span className="flex items-center gap-1 min-w-0 max-w-full truncate">
                                  {isMe && (
                                    <span className="shrink-0 flex items-center">
                                      {renderCheckmarks({ isMe, isSeen: false }, false)}
                                    </span>
                                  )}
                                  {isAudio ? (
                                    <span className="flex items-center gap-1 text-[#667781] font-semibold shrink-0">
                                      <Headphones className="w-3.5 h-3.5 text-[#8696a0]" />
                                      <span>Audio</span>
                                    </span>
                                  ) : (
                                    <span className="truncate">{stripFormatting(channel.lastMessage)}</span>
                                  )}
                                </span>
                              );
                            })()
                          )}
                        </p>
                        {(user?.role === "Admin" || user?.role === "HR") && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-white shrink-0">
                                <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem className="gap-2" onClick={(e) => { e.stopPropagation(); setEditingChannel(channel); }}>
                                <Pencil className="w-4 h-4 text-brand-teal" /> Edit Channel
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
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <p className="text-sm">No channels available.</p>
                </div>
              )}
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
                                <AvatarImage src={getAvatarUrl(sender?.profilePhoto)} />
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
                                <div className="text-[14px] text-slate-700 leading-relaxed break-words whitespace-pre-wrap">
                                  <MessageText
                                    text={msg.text}
                                    isMeBubble={msg.isMe}
                                    messageSearchQuery={messageSearchQuery}
                                    employees={employees}
                                    user={user}
                                    openPersonalChatWithEmployeeId={openPersonalChatWithEmployeeId}
                                    selectedChat={selectedChat}
                                  />
                                </div>
                                {msg.attachmentUrl && (
                                  /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.attachmentName || "") ? (
                                    <div className="mt-3 rounded-lg overflow-hidden border border-black/10">
                                      <img
                                        src={msg.attachmentUrl?.startsWith('http') ? msg.attachmentUrl : `${API_URL}${msg.attachmentUrl}`}
                                        alt={msg.attachmentName}
                                        className="max-w-full max-h-[200px] object-contain bg-black/5 cursor-pointer hover:opacity-90 transition-opacity"
                                        onClick={() => setPreviewImageMsgId(msg.id)}
                                      />
                                    </div>
                                  ) : (
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
                                  )
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
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex-1 flex flex-col bg-white relative",
          !selectedChat && "hidden md:flex"
        )}
      >
        {isDragging && selectedChat && (
          <div 
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="absolute inset-0 bg-brand-teal/10 backdrop-blur-md z-50 flex flex-col items-center justify-center border-2 border-dashed border-brand-teal/40 m-4 rounded-2xl animate-in fade-in duration-200"
          >
            <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4 border border-brand-teal/20 scale-100 transition-all">
              <div className="w-16 h-16 bg-brand-light rounded-full flex items-center justify-center animate-bounce">
                <Paperclip className="w-8 h-8 text-brand-teal" />
              </div>
              <div className="text-center">
                <h3 className="font-extrabold text-slate-800 text-lg">Drop file here</h3>
                <p className="text-xs text-muted-foreground mt-1">Attach file to this conversation</p>
              </div>
            </div>
          </div>
        )}
        {selectedChat ? (
          <div className="flex-1 flex flex-row overflow-hidden relative">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              onChange={handleFileSelect}
            />
            {pendingAttachments.length > 0 ? (
              <div className="absolute inset-0 z-45 bg-white flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
                {/* Top Bar */}
                <div className="h-14 px-6 bg-white border-b border-slate-100 flex items-center justify-between text-slate-800 shrink-0 z-50">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full"
                      onClick={() => setShowDiscardConfirm(true)}
                    >
                      <X className="w-6 h-6" />
                    </Button>
                    <span className="font-bold text-sm">Preview</span>
                  </div>
                </div>

                {/* Center File Display */}
                <div className="flex-1 relative w-full flex items-center justify-center p-4 bg-[#f0f2f5]/40 select-none">
                  {/* Arrow navigation buttons inside center display */}
                  {activePendingIndex > 0 && (
                    <button
                      type="button"
                      onClick={() => setActivePendingIndex(prev => prev - 1)}
                      className="absolute left-6 w-11 h-11 bg-black/20 hover:bg-black/35 text-white rounded-full flex items-center justify-center transition-all z-10 focus:outline-none"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                  )}
                  {activePendingIndex < pendingAttachments.length - 1 && (
                    <button
                      type="button"
                      onClick={() => setActivePendingIndex(prev => prev + 1)}
                      className="absolute right-6 w-11 h-11 bg-black/20 hover:bg-black/35 text-white rounded-full flex items-center justify-center transition-all z-10 focus:outline-none"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  )}

                  {pendingAttachments[activePendingIndex] && (
                    pendingAttachments[activePendingIndex].file.type.startsWith("image/") ? (
                      pendingUrls[activePendingIndex] ? (
                        <img
                          src={pendingUrls[activePendingIndex]}
                          alt={pendingAttachments[activePendingIndex].file.name}
                          className="max-w-full max-h-[55vh] object-contain select-none shadow-xl rounded-lg animate-in zoom-in-95 duration-200"
                        />
                      ) : null
                    ) : (
                      <div className="bg-white p-8 rounded-2xl flex flex-col items-center gap-4 border border-slate-200 max-w-sm w-full text-slate-800 shadow-md animate-in zoom-in-95 duration-200">
                        <div className="w-20 h-20 rounded-full bg-brand-teal/10 flex items-center justify-center text-brand-teal">
                          <FileIcon className="w-10 h-10" />
                        </div>
                        <div className="text-center min-w-0 w-full">
                          <p className="font-bold truncate text-sm">{pendingAttachments[activePendingIndex].file.name}</p>
                          <p className="text-xs text-slate-400 mt-1">{(pendingAttachments[activePendingIndex].file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                    )
                  )}
                </div>

                {/* Bottom Bar containing Caption Input, Thumbnails list, and Send Button */}
                <div className="bg-[#f0f2f5] p-4 shrink-0 flex flex-col items-center gap-3 border-t border-slate-200 justify-center w-full">
                  {/* Thumbnails Row */}
                  <div className="flex items-center gap-2 overflow-x-auto max-w-3xl w-full py-2 justify-center scrollbar-thin shrink-0 min-h-[72px]">
                    {pendingAttachments.map((att, idx) => {
                      const isImg = att.file.type.startsWith("image/");
                      const url = pendingUrls[idx];
                      const isActive = idx === activePendingIndex;

                      return (
                        <div
                          key={idx}
                          onClick={() => setActivePendingIndex(idx)}
                          className={cn(
                            "group relative w-14 h-14 rounded-lg overflow-hidden border-2 cursor-pointer transition-all shrink-0 bg-white flex items-center justify-center",
                            isActive ? "border-[#00a884] scale-105 shadow-sm" : "border-transparent opacity-75 hover:opacity-100"
                          )}
                        >
                          {isImg && url ? (
                            <img src={url} alt={att.file.name} className="w-full h-full object-cover" />
                          ) : (
                            <FileIcon className="w-6 h-6 text-slate-400" />
                          )}

                          {/* Delete cross button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeAttachment(idx);
                            }}
                            className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center text-[9px] opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      );
                    })}

                    {/* Plus thumbnail card */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-14 h-14 rounded-lg border-2 border-dashed border-slate-300 hover:border-[#00a884] flex items-center justify-center text-slate-400 hover:text-[#00a884] transition-colors shrink-0 bg-white focus:outline-none"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Caption input and Send circle */}
                  <div className="max-w-3xl w-full flex items-center gap-3">
                    <div className="flex-1 flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-transparent focus-within:border-brand-teal shadow-xs">
                      <Popover open={showPreviewEmojiPicker} onOpenChange={setShowPreviewEmojiPicker}>
                        <PopoverTrigger asChild>
                          <button type="button" className="text-slate-400 hover:text-slate-600 shrink-0 focus:outline-none">
                            <Smile className="w-6 h-6" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent side="top" align="start" className="p-0 border-none bg-transparent shadow-none w-auto mb-4 z-[100]">
                          <EmojiPicker
                            onEmojiSelect={(emoji) => {
                              handleCaptionChange((pendingAttachments[activePendingIndex]?.caption || "") + emoji);
                              setShowPreviewEmojiPicker(false);
                            }}
                            onClose={() => setShowPreviewEmojiPicker(false)}
                          />
                        </PopoverContent>
                      </Popover>
                      <input
                        ref={captionInputRef}
                        type="text"
                        autoFocus
                        value={pendingAttachments[activePendingIndex]?.caption || ""}
                        onChange={(e) => handleCaptionChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        onPaste={(e) => {
                          const items = e.clipboardData?.items;
                          if (items) {
                            const newFiles: File[] = [];
                            for (let i = 0; i < items.length; i++) {
                              if (items[i].type.indexOf('image') !== -1) {
                                const file = items[i].getAsFile();
                                if (file) {
                                  newFiles.push(file);
                                }
                              }
                            }
                            if (newFiles.length > 0) {
                              const newAttachments = newFiles.map((file) => ({
                                file,
                                caption: ""
                              }));
                              setPendingAttachments(prev => [...prev, ...newAttachments]);
                              e.preventDefault();
                            }
                          }
                        }}
                        placeholder="Add a caption..."
                        className="flex-1 bg-transparent border-none text-slate-800 text-[15px] placeholder:text-slate-400 outline-none focus:outline-none"
                      />
                    </div>
                    {/* Send Button with badge */}
                    <button
                      type="button"
                      onClick={() => handleSendMessage()}
                      className="relative bg-[#00a884] hover:bg-[#008f72] active:scale-95 text-white rounded-full w-12 h-12 shadow-md flex items-center justify-center transition-all shrink-0 focus:outline-none"
                    >
                      <Send className="w-5 h-5 fill-current ml-0.5" />
                      {pendingAttachments.length > 1 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-[#00a884] border-2 border-white text-white text-[9.5px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center">
                          {pendingAttachments.length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-w-0 bg-white relative">
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
                    {(selectedChat.type === 'general' || selectedChat.id?.startsWith("gen-")) ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-semibold text-2xl select-none">#</span>
                        <h2 className="font-bold text-slate-800 text-lg">{selectedChat.name.toLowerCase()}</h2>
                      </div>
                    ) : (
                      <div
                        className="flex items-center gap-3.5 cursor-pointer select-none"
                        onClick={() => {
                          if (showRightSidebar && sidebarTab === 'info') {
                            setShowRightSidebar(false);
                          } else {
                            setSidebarTab('info');
                            setShowRightSidebar(true);
                          }
                        }}
                      >
                        <div className="relative shrink-0">
                          <Avatar className="w-11 h-11 border border-border">
                            {selectedChat.avatar ? (
                              <AvatarImage src={getAvatarUrl(selectedChat.avatar)} />
                            ) : (
                              <AvatarFallback className="bg-brand-light text-brand-teal font-bold text-xs uppercase">
                                {selectedChat.name[0]}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          {isSelectedChatOnline && (
                            <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white"></span>
                          )}
                        </div>
                        <div>
                          <h2 className="font-bold text-slate-800">{selectedChat.name}</h2>
                          {typingUsers.length > 0 ? (
                            <p className="text-[11px] font-bold text-brand-teal animate-pulse">
                              {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
                            </p>
                          ) : (selectedChat.type === 'group' || selectedChat.type === 'general') ? (
                            <div
                              className="flex items-center gap-2 pr-2 py-0.5 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (showRightSidebar && sidebarTab === 'info') {
                                  setShowRightSidebar(false);
                                } else {
                                  setSidebarTab('info');
                                  setShowRightSidebar(true);
                                }
                              }}
                            >
                              <div className="flex -space-x-2 overflow-hidden">
                                {groupMembersList.slice(0, 3).map((memberId: string) => {
                                  const member = employees.find((e: any) => e.id === memberId);
                                  return (
                                    <Avatar key={memberId} className="w-5 h-5 border-2 border-white ring-1 ring-border shrink-0">
                                      <AvatarImage src={getAvatarUrl(member?.profilePhoto)} />
                                      <AvatarFallback className="text-[8px] bg-brand-light text-brand-teal font-bold">
                                        {member?.name?.[0] || "?"}
                                      </AvatarFallback>
                                    </Avatar>
                                  );
                                })}
                              </div>
                              <p className="text-[11px] font-bold text-emerald-600">
                                {groupMembersList.length > 3 ? `+${groupMembersList.length - 3} others` : `${groupMembersList.length} Members`}
                              </p>
                            </div>
                          ) : (
                            <p className="text-[11px] font-semibold text-emerald-600">
                              {isSelectedChatOnline ? "Online" : "Offline"}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
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
                      className={cn("text-muted-foreground h-9 w-9 rounded-full hover:bg-gray-100", showRightSidebar && sidebarTab === 'files' && "text-brand-teal bg-brand-teal/5")}
                      onClick={() => {
                        if (showRightSidebar && sidebarTab === 'files') {
                          setShowRightSidebar(false);
                        } else {
                          setSidebarTab('files');
                          setShowRightSidebar(true);
                        }
                      }}
                    >
                      <FileIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Pinned Message Banner */}
                {pinnedMessages.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div className="bg-brand-teal/5 border-b border-brand-teal/10 px-6 py-2 flex items-center justify-between animate-in fade-in slide-in-from-top-1 cursor-pointer hover:bg-brand-teal/10 transition-colors">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="bg-brand-teal/10 p-1.5 rounded-lg">
                            <Pin className="w-3.5 h-3.5 text-brand-teal fill-current shrink-0" />
                          </div>
                          <div className="min-w-0 text-left">
                            <p className="text-[10px] font-bold text-brand-teal uppercase tracking-tighter leading-none mb-0.5">
                              {pinnedMessages.length > 1 ? `${pinnedMessages.length} Pinned Messages` : 'Pinned Message'}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate italic">
                              {pinnedMessages.length > 1 ? "Click to view all pinned messages" : `"${pinnedMessages[pinnedMessages.length - 1].text || (pinnedMessages[pinnedMessages.length - 1].attachmentName ? `Attachment: ${pinnedMessages[pinnedMessages.length - 1].attachmentName}` : 'Pinned Message')}"`}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[10px] font-bold text-brand-teal hover:bg-brand-teal/10 pointer-events-none"
                        >
                          {pinnedMessages.length > 1 ? "View All" : "View"}
                        </Button>
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto p-2 border-brand-teal/10 shadow-lg">
                      <div className="px-2 py-1.5 mb-1 border-b border-slate-50">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pinned Messages</p>
                      </div>
                      {[...pinnedMessages].reverse().map((msg) => (
                        <DropdownMenuItem
                          key={msg.id}
                          onClick={() => scrollToMessage(msg.id)}
                          className="flex flex-col items-start gap-1 p-3 cursor-pointer rounded-xl hover:bg-slate-50 mb-1"
                        >
                          <div className="flex items-center justify-between w-full mb-0.5">
                            <span className="text-[11px] font-bold text-slate-700 truncate mr-2">{msg.sender}</span>
                            <span className="text-[9px] text-slate-400 shrink-0">{dayjs(msg.timestamp).format("MMM D, h:mm A")}</span>
                          </div>
                          <p className="text-xs text-slate-600 line-clamp-2 w-full whitespace-pre-wrap leading-relaxed">
                            {msg.text || (msg.attachmentName ? `[Attachment: ${msg.attachmentName}]` : (msg.isVoice ? "[Voice Message]" : "[Poll]"))}
                          </p>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Chat Messages */}
                <div className="flex-1 flex flex-col whatsapp-chat-bg overflow-x-hidden overflow-y-hidden relative">
                  {/* Selection Mode Header */}
                  {isSelectionMode && (
                    <div className="bg-brand-teal text-white px-4 py-2.5 flex items-center justify-between animate-in slide-in-from-top-1 z-10 shrink-0">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white hover:bg-white/20 h-8 w-8 rounded-full"
                          onClick={exitSelectionMode}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        <span className="text-sm font-bold">{selectedMessageIds.length} selected</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white hover:bg-white/20 h-8 w-8 rounded-full"
                          onClick={() => {
                            if (selectedMessageIds.length === 0) return;
                            setMessageToDelete(null);
                            setShowDeleteConfirm(true);
                          }}
                          disabled={selectedMessageIds.length === 0}
                          title="Delete selected"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white hover:bg-white/20 h-8 w-8 rounded-full"
                          onClick={handleForwardSelectedMessages}
                          disabled={selectedMessageIds.length === 0}
                        >
                          <Forward className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white hover:bg-white/20 h-8 w-8 rounded-full"
                          onClick={() => {
                            if (selectedMessageIds.length === currentMessages.length) {
                              setSelectedMessageIds([]);
                            } else {
                              setSelectedMessageIds(currentMessages.map(m => m.id));
                            }
                          }}
                        >
                          <CheckCheck className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto px-2 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-4 space-y-0.5 custom-scrollbar"
                  >
                    <div className="flex justify-center">
                      <span className="px-3 py-1 bg-white border border-border rounded-full text-[10px] font-bold text-muted-foreground uppercase tracking-wider shadow-sm">
                        Conversation with {selectedChat.name}
                      </span>
                    </div>

                    {isMessagesLoading ? (
                      <div className="flex items-center justify-center py-20">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-8 h-8 border-[3px] border-brand-teal border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs text-muted-foreground font-medium">Loading messages...</span>
                        </div>
                      </div>
                    ) : displayMessages.length === 0 ? (
                      <div className="flex items-center justify-center py-20">
                        <p className="text-sm text-muted-foreground">
                          {messageSearchQuery ? "No messages matching your search." : `No messages yet. Say hi to ${selectedChat.name}!`}
                        </p>
                      </div>
                    ) : displayMessages.map((msg, index) => {
                      if (messageToGroupFirstId[msg.id] && messageToGroupFirstId[msg.id] !== msg.id) {
                        return null;
                      }
                      const isGroup = selectedChat.type === 'group' || selectedChat.type === 'general';
                      const sender = isGroup ? employees.find((e: any) => e.id === msg.senderId) : null;
                      const avatarSrc = isGroup ? getAvatarUrl(sender?.profilePhoto) : getAvatarUrl(selectedChat.avatar);
                      const avatarFallback = isGroup ? (sender?.name?.[0] || msg.sender?.[0] || "U") : selectedChat.name[0];
                      const displayName = isGroup ? (sender?.name || msg.sender || "User") : selectedChat.name;

                      const showDateSeparator = index === 0 || !dayjs(msg.timestamp).isSame(dayjs(displayMessages[index - 1].timestamp), 'day');
                      const prevMsg = index > 0 ? displayMessages[index - 1] : null;
                      const timeDiffMins = prevMsg ? dayjs(msg.timestamp).diff(dayjs(prevMsg.timestamp), 'minute') : 0;
                      const isConsecutive = index > 0 && String(prevMsg.senderId) === String(msg.senderId) && !showDateSeparator && timeDiffMins < 5;

                      const nextMsg = index < displayMessages.length - 1 ? displayMessages[index + 1] : null;
                      const nextTimeDiffMins = nextMsg ? dayjs(nextMsg.timestamp).diff(dayjs(msg.timestamp), 'minute') : 0;
                      const isLastInConsecutive = index === displayMessages.length - 1 ||
                        String(nextMsg.senderId) !== String(msg.senderId) ||
                        !dayjs(nextMsg.timestamp).isSame(dayjs(msg.timestamp), 'day') ||
                        nextTimeDiffMins >= 5;

                      const isToday = dayjs(msg.timestamp).isSame(dayjs(), 'day');
                      const isYesterday = dayjs(msg.timestamp).isSame(dayjs().subtract(1, 'day'), 'day');
                      const dateText = isToday ? "Today" : isYesterday ? "Yesterday" : dayjs(msg.timestamp).format("MMMM D, YYYY");

                      const isSeenByOthers = msg.seenBy && msg.seenBy.filter((id: string) => id !== user?.id).length > 0;
                      const cleanAttachmentName = msg.attachmentName ? msg.attachmentName.replace(/^[a-f0-9]+_/, "") : "";
                      const isDefaultSentFileText = msg.text && msg.attachmentName && (msg.text === `Sent a file: ${msg.attachmentName}` || msg.text === `Sent a file: ${cleanAttachmentName}`);
                      const isPdf = msg.attachmentName && /\.pdf$/i.test(msg.attachmentName);
                      const pdfUrl = msg.attachmentUrl ? (
                        msg.attachmentUrl.startsWith('blob:') ? msg.attachmentUrl :
                          msg.attachmentUrl.startsWith('http') ? msg.attachmentUrl :
                            `${API_URL}${msg.attachmentUrl}`
                      ) : "";

                      return (
                        <React.Fragment key={msg.id}>
                          {showDateSeparator && (
                            <div className="flex justify-center my-4">
                              <span className="px-3 py-1 bg-white text-slate-600 text-xs rounded-[7.5px] shadow-[0_1px_0.5px_rgba(17,27,33,0.1)] font-normal border-none">
                                {dateText}
                              </span>
                            </div>
                          )}
                          {!messageSearchQuery && msg.id === firstUnreadId && (
                            <div className="flex justify-center my-4 relative">
                              <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-brand-teal/30"></div>
                              </div>
                              <span className="relative px-3 py-1 bg-brand-teal/10 text-brand-teal rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm">
                                Unread Messages
                              </span>
                            </div>
                          )}
                          <div
                            id={`msg-${msg.id}`}
                            className={cn(
                              "flex gap-2 group w-full mb-1",
                              msg.isMe ? "justify-end items-end" : "justify-start items-start",
                              isSelectionMode && "cursor-pointer",
                              isSelectionMode && selectedMessageIds.includes(msg.id) && "bg-brand-teal/10 rounded-lg -mx-2 px-2"
                            )}
                            onClick={isSelectionMode ? () => toggleMessageSelection(msg.id) : undefined}
                          >
                            {isSelectionMode && (
                              <div className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all self-center",
                                selectedMessageIds.includes(msg.id)
                                  ? "bg-brand-teal border-brand-teal"
                                  : "border-slate-300 bg-white"
                              )}>
                                {selectedMessageIds.includes(msg.id) && (
                                  <Check className="w-3 h-3 text-white" />
                                )}
                              </div>
                            )}
                            {!msg.isMe && (
                              isConsecutive ? (
                                <div className="w-8 h-8 shrink-0 mt-1" />
                              ) : (
                                <Avatar
                                  className="w-8 h-8 border border-border shrink-0 mt-1 animate-in fade-in duration-200 cursor-pointer hover:opacity-85 transition-opacity"
                                  title={displayName}
                                  onClick={() => {
                                    if (isGroup && msg.senderId) {
                                      openSidebarForMember(msg.senderId);
                                    }
                                  }}
                                >
                                  {avatarSrc && <AvatarImage src={avatarSrc} />}
                                  <AvatarFallback className="bg-slate-200 text-slate-600 font-bold text-[10px]">
                                    {avatarFallback}
                                  </AvatarFallback>
                                </Avatar>
                              )
                            )}
                            <div className={cn(
                              "flex flex-col max-w-[90%] sm:max-w-[75%] lg:max-w-[65%] xl:max-w-[60%]",
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
                                <div className="relative group/msg max-w-full w-fit">
                                  {(() => {
                                    const isAudioMsg = msg.isVoice || (msg.attachmentName && !msg.isVoice && (
                                      /\.(mp3|wav|m4a|ogg|aac|flac|webm|opus|amr|3gp)$/i.test(msg.attachmentName) ||
                                      msg.attachmentName.toLowerCase().includes("whatsapp audio") ||
                                      msg.attachmentName.toLowerCase().includes("voice message") ||
                                      msg.attachmentName.toLowerCase().includes("voice_message")
                                    ));
                                    const isMp4 = msg.attachmentName && !msg.isVoice && /\.mp4$/i.test(msg.attachmentName);

                                    if (isAudioMsg) {
                                      return (
                                        <div className={cn(
                                          msg.isMe ? "ml-auto" : "mr-auto",
                                          "w-fit whatsapp-audio-bubble"
                                        )}>
                                          {msg.isVoice ? (
                                            <VoiceMessagePlayer msg={msg} isMe={msg.isMe} renderCheckmarks={renderCheckmarks} />
                                          ) : (
                                            <AudioMessagePlayer msg={msg} isMe={msg.isMe} renderCheckmarks={renderCheckmarks} />
                                          )}
                                        </div>
                                      );
                                    }

                                    if (isMp4) {
                                      return (
                                        <div className={cn(
                                          msg.isMe ? "ml-auto" : "mr-auto",
                                          "w-fit"
                                        )}>
                                          <SmartMediaAttachment msg={msg} isMe={msg.isMe} setPreviewImageMsgId={setPreviewImageMsgId} />
                                        </div>
                                      );
                                    }

                                    return (
                                  <div
                                    className={cn(
                                      "whatsapp-bubble text-[14.2px] leading-[19px] whitespace-pre-wrap break-words [word-break:break-word] overflow-wrap-anywhere select-text relative flow-root",
                                      (msg.attachmentName && !msg.isVoice && /\.(mov|mkv)$/i.test(msg.attachmentName))
                                        ? "w-[280px] sm:w-[360px] lg:w-[420px] max-w-full"
                                        : (msg.attachmentName && !msg.isVoice && /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.attachmentName) && msg.text) || imageGroups[msg.id]
                                          ? "w-[280px] sm:w-[360px] lg:w-[420px] max-w-full"
                                          : (msg.attachmentName && !msg.isVoice)
                                            ? "w-[280px] sm:w-[320px] lg:w-[360px] max-w-full max-w-full"
                                            : "w-fit max-w-full",
                                      (msg.attachmentName || imageGroups[msg.id])
                                        ? (
                                          (msg.text || (imageGroups[msg.id] && imageGroups[msg.id].some(g => g.text && g.text.trim())))
                                            ? "p-[3.5px] pb-2"
                                            : "p-[3.5px]"
                                        )
                                        : "px-3 py-1.5 pb-2",
                                      msg.isMe
                                        ? (isConsecutive ? "bg-[#d9fdd3] text-[#111b21] rounded-[7.5px]" : "whatsapp-bubble-sent")
                                        : (isConsecutive ? "bg-white text-[#111b21] rounded-[7.5px]" : "whatsapp-bubble-received")
                                    )}
                                  >
                                    {/* Group chat sender display name */}
                                    {isGroup && !msg.isMe && !isConsecutive && (
                                      <span
                                        className="block text-[12.8px] font-bold mb-1 select-none cursor-pointer"
                                        style={{ color: getSenderColor(displayName) }}
                                        onClick={() => {
                                          if (msg.senderId) {
                                            openSidebarForMember(msg.senderId);
                                          }
                                        }}
                                      >
                                        {displayName}
                                      </span>
                                    )}

                                    {/* Forwarded label */}
                                    {msg.forwardedFrom && (
                                      <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold uppercase tracking-wider text-[#667781] select-none">
                                        <Forward className="w-3 h-3 text-[#667781]" />
                                        Forwarded
                                      </div>
                                    )}

                                    {/* Reply Preview */}
                                    {msg.replyToText && (
                                      <div
                                        className="mb-1.5 p-2 rounded-lg border-l-4 border-brand-teal text-[11.1px] bg-black/5 text-[#111b21]/85 cursor-pointer hover:bg-black/10 transition-colors"
                                        onClick={() => msg.replyToId && scrollToMessage(msg.replyToId)}
                                      >
                                        <div className="font-bold text-[10.5px] opacity-75 mb-0.5">
                                          {msg.isMe ? "Replying to" : selectedChat.name}
                                        </div>
                                        <div className="truncate">{msg.replyToText}</div>
                                      </div>
                                    )}

                                    {/* Image Attachment */}
                                    {imageGroups[msg.id] ? (
                                      <div className={cn(
                                        "relative rounded-lg overflow-hidden border border-black/10 max-w-full",
                                        (msg.text || imageGroups[msg.id].some(g => g.text && g.text.trim())) ? "mb-1" : "mb-0"
                                      )}>
                                        {renderImageGrid(imageGroups[msg.id], msg)}
                                      </div>
                                    ) : (
                                      msg.attachmentName && !msg.isVoice && /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.attachmentName) && (
                                        <div className={cn(
                                          "relative rounded-lg overflow-hidden border border-black/10 max-w-full",
                                          msg.text ? "mb-1" : "mb-0"
                                        )}>
                                          <ImageWithLoader
                                            src={
                                              msg.attachmentUrl?.startsWith('blob:') ? msg.attachmentUrl :
                                                msg.attachmentUrl?.startsWith('http') ? msg.attachmentUrl :
                                                  `${API_URL}${msg.attachmentUrl}`
                                            }
                                            alt={msg.attachmentName}
                                            className="max-w-[280px] sm:max-w-[360px] max-h-[300px] cursor-pointer rounded-lg"
                                            onLoad={() => scrollToBottom(true)}
                                            onClick={() => setPreviewImageMsgId(msg.id)}
                                          />
                                          {/* Timestamp overlay if no message text is present */}
                                          {!msg.text && (
                                            <div className="absolute bottom-2 right-2 flex items-center gap-1.5 text-[10px] text-white bg-black/40 px-2 py-0.5 rounded-[10px] select-none backdrop-blur-xs">
                                              <span>{dayjs(msg.timestamp).format("hh:mm A")}</span>
                                              {renderCheckmarks(msg, true)}
                                            </div>
                                          )}
                                          {/* Upload loader overlay if optimistic */}
                                          {msg._optimistic && (
                                            <div className="absolute inset-0 bg-black/45 flex flex-col items-center justify-center backdrop-blur-xs select-none">
                                              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                                              <span className="text-white text-[10px] font-bold mt-1.5">Uploading...</span>
                                            </div>
                                          )}
                                        </div>
                                      )
                                    )}

                                    {/* Video Attachment */}
                                    {msg.attachmentName && !msg.isVoice && /\.(mov|mkv)$/i.test(msg.attachmentName) && (
                                      <VideoAttachment msg={msg} setPreviewImageMsgId={setPreviewImageMsgId} />
                                    )}

                                    {/* File Attachment */}
                                    {msg.attachmentName && !msg.isVoice && 
                                      !(/\.(jpg|jpeg|png|gif|webp)$/i.test(msg.attachmentName)) && 
                                      !(/\.(mp4|mov|mkv)$/i.test(msg.attachmentName)) && 
                                      !(/\.(mp3|wav|m4a|ogg|aac|flac|webm|opus|amr|3gp)$/i.test(msg.attachmentName) ||
                                        msg.attachmentName.toLowerCase().includes("whatsapp audio") ||
                                        msg.attachmentName.toLowerCase().includes("voice message") ||
                                        msg.attachmentName.toLowerCase().includes("voice_message")) && (
                                      <FileAttachment msg={msg} handleOpenAttachment={handleOpenAttachment} renderCheckmarks={renderCheckmarks} />
                                    )}

                                    {/* Poll */}
                                    {msg.poll && (() => {
                                      const totalVotes = msg.poll.options.reduce((acc: number, opt: any) => acc + opt.votes.length, 0);
                                      const maxVotes = Math.max(...msg.poll.options.map((o: any) => o.votes.length), 1);

                                      return (
                                        <div className="rounded-xl overflow-hidden mb-1.5 min-w-[260px] max-w-[340px] bg-white border border-slate-200 shadow-2xs">
                                          {/* Poll Header */}
                                          <div className="px-3.5 pt-3.5 pb-2.5 bg-slate-50/80">
                                            <div className="flex items-center gap-2 mb-1.5">
                                              <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 bg-emerald-50">
                                                <BarChart2 className="w-3.5 h-3.5 text-emerald-500" />
                                              </div>
                                              <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-600/80">Poll</span>
                                            </div>
                                            <h4 className="font-bold text-[14px] leading-snug text-slate-800">{msg.poll.question}</h4>
                                          </div>

                                          {/* Poll Options */}
                                          <div className="p-2.5 space-y-1.5 bg-white">
                                            {msg.poll.options.map((option: any) => {
                                              const percentage = totalVotes > 0 ? (option.votes.length / totalVotes) * 100 : 0;
                                              const hasVoted = option.votes.includes(user?.id);
                                              const isWinning = option.votes.length === maxVotes && option.votes.length > 0;
                                              const voterEmployees = option.votes
                                                .map((voterId: string) => {
                                                  if (voterId === user?.id) return { id: voterId, name: "You", profilePhoto: user?.profilePhoto };
                                                  return employees.find((e: any) => e.id === voterId);
                                                })
                                                .filter(Boolean);

                                              return (
                                                <div key={option.id} className="group/opt">
                                                  <button
                                                    type="button"
                                                    onClick={() => handleVote(msg.id, option.id)}
                                                    className={cn(
                                                      "w-full text-left relative overflow-hidden rounded-lg p-2.5 transition-all duration-300 border",
                                                      hasVoted
                                                        ? "bg-emerald-50/50 border-emerald-200 shadow-[0_1px_1px_rgba(0,0,0,0.01)]"
                                                        : "bg-slate-50/50 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                                                    )}
                                                  >
                                                    <div
                                                      className="absolute left-0 top-0 bottom-0 bg-emerald-100/60 transition-all duration-500 ease-out"
                                                      style={{ width: `${percentage}%` }}
                                                    />
                                                    <div className="relative flex items-center justify-between gap-2">
                                                      <div className="flex items-center gap-2 min-w-0">
                                                        <div className={cn(
                                                          "w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-all duration-300",
                                                          hasVoted ? "border-emerald-500 bg-emerald-50" : "border-slate-300"
                                                        )}>
                                                          {hasVoted && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                                                        </div>
                                                        <span className={cn(
                                                          "text-[12px] font-medium truncate",
                                                          hasVoted ? "text-slate-800 font-bold" : "text-slate-600"
                                                        )}>{option.text}</span>
                                                      </div>
                                                      <div className="flex items-center gap-1.5 shrink-0">
                                                        {isWinning && totalVotes > 1 && (
                                                          <span className="text-[9px] font-bold px-1 rounded-full bg-amber-50 text-amber-500 border border-amber-200">
                                                            ★
                                                          </span>
                                                        )}
                                                        <span className={cn(
                                                          "text-[11px] font-bold tabular-nums min-w-[28px] text-right",
                                                          hasVoted ? "text-emerald-600" : "text-slate-400"
                                                        )}>
                                                          {Math.round(percentage)}%
                                                        </span>
                                                      </div>
                                                    </div>
                                                  </button>
                                                   {voterEmployees.length > 0 && (
                                                     <div className="flex flex-col gap-1.5 mt-1.5 pl-2 animate-in fade-in duration-200">
                                                       <button
                                                         type="button"
                                                         onClick={(e) => {
                                                           e.stopPropagation();
                                                           const key = `${msg.id}-${option.id}`;
                                                           setExpandedVoterOptionId(prev => prev === key ? null : key);
                                                         }}
                                                         className="flex items-center gap-2 hover:opacity-85 transition-opacity cursor-pointer text-left w-fit"
                                                       >
                                                         <div className="flex -space-x-1">
                                                           {voterEmployees.slice(0, 3).map((voter: any, vi: number) => (
                                                             <div
                                                               key={voter.id || vi}
                                                               className="w-4 h-4 rounded-full border border-white overflow-hidden shrink-0 bg-slate-100 shadow-2xs"
                                                               title={voter.name || "User"}
                                                             >
                                                               {voter.profilePhoto ? (
                                                                 <img src={getAvatarUrl(voter.profilePhoto)} alt="" className="w-full h-full object-cover" />
                                                               ) : (
                                                                 <div className="w-full h-full flex items-center justify-center text-[7px] font-bold text-slate-500 bg-slate-200">
                                                                   {(voter.name || "?")[0].toUpperCase()}
                                                                 </div>
                                                               )}
                                                             </div>
                                                           ))}
                                                         </div>
                                                         <span className="text-[9px] font-bold text-slate-400 hover:text-brand-teal transition-colors">
                                                           {voterEmployees.length} {voterEmployees.length === 1 ? "vote" : "votes"}
                                                         </span>
                                                       </button>
                                                       
                                                       {expandedVoterOptionId === `${msg.id}-${option.id}` && (
                                                         <div className="text-[9px] font-semibold text-slate-500 leading-normal bg-slate-50/80 p-1.5 rounded-md border border-slate-200/50">
                                                           {voterEmployees.map((v: any) => v.name || "User").join(", ")}
                                                         </div>
                                                       )}
                                                     </div>
                                                   )}
                                                </div>
                                              );
                                            })}
                                          </div>

                                          {/* Poll Footer */}
                                          <div className="px-3.5 py-2 flex items-center justify-between border-t border-slate-100 bg-slate-50/50">
                                            <div className="flex items-center gap-1">
                                              <Users className="w-3 h-3 text-slate-400" />
                                              <span className="text-[10px] font-bold tabular-nums text-slate-500">
                                                {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
                                              </span>
                                            </div>
                                            {msg.poll.isMultiple && (
                                              <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                                Multi choice
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })()}

                                    {/* Message Text Content */}
                                    {imageGroups[msg.id] ? (
                                      imageGroups[msg.id].some(gMsg => gMsg.text && gMsg.text.trim()) && (
                                        <div className="flex flex-col gap-1.5 mt-1 text-[#111b21] max-w-full px-2.5 py-1">
                                          {(() => {
                                            const filteredGroupMsgs = imageGroups[msg.id].filter(gMsg => gMsg.text && gMsg.text.trim());
                                            return filteredGroupMsgs.map((gMsg, idx) => {
                                              const isLast = idx === filteredGroupMsgs.length - 1;
                                              return (
                                                <div key={gMsg.id} className={cn("inline-block break-words", idx > 0 && "border-t border-black/5 pt-1.5 mt-1")}>
                                                  <MessageText
                                                    text={gMsg.text}
                                                    isMeBubble={msg.isMe}
                                                    messageSearchQuery={messageSearchQuery}
                                                    employees={employees}
                                                    user={user}
                                                    openPersonalChatWithEmployeeId={openPersonalChatWithEmployeeId}
                                                    selectedChat={selectedChat}
                                                    timeElement={isLast ? (
                                                      <>
                                                        <span>{dayjs(msg.timestamp).format("hh:mm A")}</span>
                                                        {msg.isEdited && <span className="text-[8px] opacity-60 italic mr-1">(edited)</span>}
                                                        {renderCheckmarks(msg, false)}
                                                      </>
                                                    ) : undefined}
                                                  />
                                                </div>
                                              );
                                            });
                                          })()}
                                        </div>
                                      )
                                    ) : (
                                      msg.text &&
                                      msg.text !== `Poll: ${msg.poll?.question}` &&
                                      !isDefaultSentFileText && (
                                        <div className={cn(
                                          (msg.replyToText || msg.attachmentName || imageGroups[msg.id]) ? "block w-full" : "inline-block",
                                          (msg.attachmentName || imageGroups[msg.id]) ? "px-2.5 pt-1.5 pb-1" : "",
                                          "text-[#111b21] max-w-full"
                                        )}>
                                          <MessageText
                                            text={msg.text}
                                            isMeBubble={msg.isMe}
                                            messageSearchQuery={messageSearchQuery}
                                            employees={employees}
                                            user={user}
                                            openPersonalChatWithEmployeeId={openPersonalChatWithEmployeeId}
                                            selectedChat={selectedChat}
                                            timeElement={
                                              <>
                                                <span>{dayjs(msg.timestamp).format("hh:mm A")}</span>
                                                {msg.isEdited && <span className="text-[8px] opacity-60 italic mr-1">(edited)</span>}
                                                {renderCheckmarks(msg, false)}
                                              </>
                                            }
                                          />
                                        </div>
                                      )
                                    )}

                                    {/* Inline Timestamp inside the bubble (Only if NO text or default 'Sent a file' text is present to avoid duplicate timestamps) */}
                                    {(!msg.text || isDefaultSentFileText) &&
                                      !(msg.attachmentName && !(/\.(jpg|jpeg|png|gif|webp)$/i.test(msg.attachmentName))) &&
                                      !(imageGroups[msg.id] && imageGroups[msg.id].some(gMsg => gMsg.text && gMsg.text.trim())) && (
                                        ((!msg.attachmentName || !(/\.(jpg|jpeg|png|gif|webp)$/i.test(msg.attachmentName))) ||
                                          (imageGroups[msg.id] && !imageGroups[msg.id].some(gMsg => gMsg.text && gMsg.text.trim()))) && (
                                          <span className={cn("whatsapp-time-stamp", msg.attachmentName && "px-2 pb-1.5")}>
                                            <span>{dayjs(msg.timestamp).format("hh:mm A")}</span>
                                            {msg.isEdited && <span className="text-[8px] opacity-60 italic mr-1">(edited)</span>}
                                            {renderCheckmarks(msg, false)}
                                          </span>
                                        )
                                      )}
                                  </div>
                                  );
                                  })()}

                                  {/* Reactions Display */}
                                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                    <div className={cn(
                                      "flex flex-wrap gap-1 mt-1",
                                      msg.isMe ? "justify-end" : "justify-start"
                                    )}>
                                      {Object.entries(msg.reactions).map(([emoji, users]: [string, any]) => (
                                        <button
                                          key={emoji}
                                          type="button"
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

                                  {/* Hover options: Smile icon for text message, Forward icon for image/attachments */}
                                  <div className={cn(
                                    "absolute top-1/2 -translate-y-1/2 opacity-0 group-hover/msg:opacity-100 transition-opacity z-10 flex items-center gap-1.5",
                                    msg.isMe ? "-left-12" : "-right-12"
                                  )}>
                                    {msg.attachmentName || msg.isVoice ? (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 rounded-full bg-white hover:bg-slate-100 border border-slate-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.08)] text-slate-500"
                                        onClick={() => setForwardingMessage(msg)}
                                        title="Forward"
                                      >
                                        <Forward className="w-3.5 h-3.5" />
                                      </Button>
                                    ) : (
                                      <Popover onOpenChange={(open) => { if (!open) setShowPickerForMsgId(null); }}>
                                        <PopoverTrigger asChild>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 rounded-full bg-white hover:bg-slate-100 border border-slate-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.08)] text-slate-500"
                                            title="React"
                                          >
                                            <Smile className="w-3.5 h-3.5" />
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                          side="top"
                                          align="center"
                                          className={cn(
                                            "border border-slate-200/80 bg-white/95 backdrop-blur-md shadow-lg z-50 animate-in zoom-in-95 duration-100",
                                            showPickerForMsgId === msg.id
                                              ? "p-0 rounded-2xl border-none shadow-none w-auto mb-2"
                                              : "p-1 rounded-full flex items-center gap-0.5 w-auto mb-1"
                                          )}
                                        >
                                          {showPickerForMsgId === msg.id ? (
                                            <EmojiPicker
                                              onEmojiSelect={(emoji) => {
                                                handleToggleReaction(msg.id, emoji);
                                                setShowPickerForMsgId(null);
                                                document.body.click();
                                              }}
                                              onClose={() => setShowPickerForMsgId(null)}
                                            />
                                          ) : (
                                            <>
                                              {["👍", "❤️", "😂", "😮", "😢", "🙏"].map(emoji => (
                                                <Button
                                                  key={emoji}
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-7 w-7 rounded-full hover:bg-slate-100 text-base p-0"
                                                  onClick={() => {
                                                    handleToggleReaction(msg.id, emoji);
                                                    document.body.click();
                                                  }}
                                                >
                                                  {emoji}
                                                </Button>
                                              ))}
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 rounded-full hover:bg-slate-100 text-slate-500 font-bold flex items-center justify-center p-0"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setShowPickerForMsgId(msg.id);
                                                }}
                                                title="More Emojis"
                                              >
                                                <Plus className="w-3.5 h-3.5 text-slate-500" />
                                              </Button>
                                            </>
                                          )}
                                        </PopoverContent>
                                      </Popover>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })}

                    {/* Typing indicator bubble */}
                    {typingUsers.length > 0 && typingUsers.filter(name => name !== user?.name).length > 0 && (
                      <div className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 mt-4">
                        <Avatar className="w-8 h-8 border ring-1 ring-border shadow-2xs shrink-0 rounded-full overflow-hidden">
                          <AvatarFallback className="bg-brand-light text-brand-teal font-extrabold text-[10px] uppercase">
                            {typingUsers[0][0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col items-start gap-1">
                          <div className="bg-gray-100/80 px-4 py-2 rounded-2xl rounded-tl-xs shadow-2xs flex items-center gap-1.5">
                            <span className="text-xs text-slate-500 font-bold">
                              {typingUsers.filter(name => name !== user?.name).join(", ")} typing
                            </span>
                            <span className="flex gap-0.5 items-center pt-1">
                              <span className="h-1 w-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="h-1 w-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="h-1 w-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {showScrollBottomBtn && (
                    <button
                      type="button"
                      onClick={() => {
                        if (scrollRef.current) {
                          scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
                        }
                      }}
                      className="absolute bottom-20 right-6 bg-white hover:bg-slate-50 text-slate-500 rounded-full w-9 h-9 shadow-lg border border-slate-200/60 hover:scale-105 active:scale-95 transition-all z-20 flex items-center justify-center animate-in fade-in slide-in-from-bottom-2 duration-200 focus:outline-none"
                    >
                      <ChevronDown className="w-5 h-5" />
                    </button>
                  )}

                  {/* Chat Input */}
                  <div className="px-4 pb-4 pt-1 whatsapp-chat-bg shrink-0">
                    <form
                      onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                      className="w-full flex items-end gap-3 bg-transparent px-2"
                    >
                      <div className="flex-1 flex flex-col bg-white rounded-[24px] border border-slate-200 shadow-xs">
                        {replyingTo && (
                          <div className="relative flex items-center justify-between bg-slate-50/70 p-2.5 border-l-4 border-brand-teal border-b border-slate-100 animate-in slide-in-from-bottom-2 rounded-t-[24px]">
                            <div className="min-w-0 flex-1 pl-2">
                              <p className="text-[11px] font-bold text-brand-teal uppercase">
                                Replying to {replyingTo.isMe ? "Yourself" : (replyingTo.sender || selectedChat.name)}
                              </p>
                              <p className="text-xs text-slate-500 truncate mt-0.5">
                                {replyingTo.text || (replyingTo.attachmentUrl ? "📷 Image" : (replyingTo.isVoice ? "🎤 Voice Message" : ""))}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setReplyingTo(null)}
                              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-200/50 transition-colors focus:outline-none shrink-0"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        <div className="flex items-end gap-2 px-3 py-2 min-h-[44px]">
                          {voicePreviewBlob ? (
                            <VoicePreviewPlayer
                              blob={voicePreviewBlob}
                              duration={recordingDuration}
                              onDelete={() => { setVoicePreviewBlob(null); setRecordingDuration(0); }}
                            />
                          ) : isRecording ? (
                            <div className="flex-1 flex items-center gap-2 animate-in fade-in duration-300">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 text-red-500 hover:bg-red-50 rounded-full shrink-0"
                                onClick={() => { recordingActionRef.current = 'delete'; stopRecording(); }}
                              >
                                <Trash2 className="w-[18px] h-[18px]" />
                              </Button>

                              <div className="flex items-center gap-1.5">
                                {!isPaused && (
                                  <span className="flex h-2 w-2 relative shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                  </span>
                                )}
                                <span className="text-[12px] font-bold text-red-500 tabular-nums">
                                  {Math.floor(recordingDuration / 60)}:{String(recordingDuration % 60).padStart(2, '0')}
                                </span>
                              </div>

                              {!isPaused ? (
                                <div className="flex-1 flex items-center justify-center overflow-hidden">
                                  <div className="flex items-center gap-[2px] h-6">
                                    {Array.from({ length: 30 }).map((_, i) => (
                                      <div
                                        key={i}
                                        className="w-[3px] bg-red-400 rounded-full animate-pulse"
                                        style={{
                                          height: `${Math.max(4, Math.sin(Date.now() / 200 + i * 0.5) * 12 + 14)}px`,
                                          animationDelay: `${i * 50}ms`,
                                          opacity: 0.7
                                        }}
                                      />
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex-1 flex items-center justify-center">
                                  <span className="text-[12px] font-semibold text-slate-400">Paused</span>
                                </div>
                              )}

                              {!isPaused ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 text-[#54656f] hover:bg-slate-100 rounded-full shrink-0"
                                  onClick={pauseRecording}
                                >
                                  <Pause className="w-5 h-5 fill-current" />
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 text-brand-teal hover:bg-brand-teal/10 rounded-full shrink-0"
                                  onClick={resumeRecording}
                                >
                                  <Play className="w-5 h-5 fill-current ml-0.5" />
                                </Button>
                              )}

                              <Button
                                type="button"
                                size="icon"
                                className="h-9 w-9 bg-[#00a884] hover:bg-[#008f72] text-white rounded-full shrink-0 shadow-sm"
                                onClick={() => { recordingActionRef.current = 'send'; stopRecording(); }}
                              >
                                <Send className="w-4 h-4 fill-current ml-0.5" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              {/* Left side actions: Emoji + Paperclip */}
                              <div className="flex items-center shrink-0">
                                {/* Emoji Popover */}
                                <div className="relative">
                                  <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                                    <PopoverTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className={cn("text-[#54656f] hover:bg-slate-100 rounded-full h-9 w-9 shrink-0", showEmojiPicker && "bg-brand-teal/10 text-brand-teal")}
                                      >
                                        <Smile className="w-5.5 h-5.5" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent side="top" align="start" className="p-0 border-none bg-transparent shadow-none w-auto mb-4 z-[100]">
                                      <EmojiPicker
                                        onEmojiSelect={(emoji) => {
                                          setMessage(prev => prev + emoji);
                                          setShowEmojiPicker(false);
                                          setTimeout(() => messageInputRef.current?.focus(), 10);
                                        }}
                                        onClose={() => setShowEmojiPicker(false)}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </div>

                                {/* File Attachment */}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="text-[#54656f] hover:bg-slate-100 rounded-full h-9 w-9 shrink-0"
                                  onClick={() => fileInputRef.current?.click()}
                                >
                                  <Paperclip className="w-5 h-5" />
                                </Button>
                              </div>

                              {/* Growing Textarea in the middle */}
                              <div className="flex-1 relative">
                                {showTagPicker && filteredEmployees.length > 0 && (
                                  <div
                                    ref={tagPickerContainerRef}
                                    style={{ left: `${tagPickerLeft}px` }}
                                    className="absolute bottom-full mb-2 p-2 border border-slate-100 bg-white rounded-2xl shadow-xl w-64 max-h-64 overflow-y-auto z-[100] transition-all duration-75"
                                  >
                                    <div className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1.5 border-b border-slate-50 mb-1">
                                      Tag Colleague
                                    </div>
                                    <div className="space-y-0.5">
                                      {filteredEmployees.map((emp, idx) => {
                                        const empName = emp.name || [emp.firstName, emp.lastName].filter(Boolean).join(' ') || "Employee";
                                        const initials = empName.split(' ').filter(Boolean).map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
                                        const isActive = idx === activeTagIndex;
                                        return (
                                          <button
                                            key={emp.id}
                                            type="button"
                                            onMouseDown={(e) => {
                                              e.preventDefault(); // Keep focus on textarea
                                              handleTagSelect(emp);
                                            }}
                                            className={cn(
                                              "w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-all",
                                              isActive ? "bg-brand-teal/10 font-bold" : "hover:bg-slate-50"
                                            )}
                                          >
                                            <Avatar className="w-7 h-7 shrink-0">
                                              <AvatarImage src={getAvatarUrl(emp.profilePhoto)} />
                                              <AvatarFallback className="bg-brand-teal/10 text-brand-teal font-bold text-[10px]">{initials}</AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                              <p className="text-xs font-bold text-slate-700 truncate">{empName}</p>
                                              <p className="text-[9px] text-slate-400 font-medium truncate uppercase">{emp.designation || 'Employee'}</p>
                                            </div>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                                <div
                                  ref={inputOverlayRef}
                                  style={{
                                    fontFamily: 'inherit',
                                    fontSize: '15px',
                                    lineHeight: '20px',
                                    padding: '6px 8px',
                                    margin: '0',
                                    border: 'none',
                                    letterSpacing: 'normal',
                                    color: '#111b21',
                                  }}
                                  className="absolute inset-0 pointer-events-none whitespace-pre-wrap break-words [word-break:break-word] overflow-hidden select-none bg-transparent"
                                >
                                  {renderInputHighlight(message)}
                                </div>
                                <Textarea
                                  ref={messageInputRef}
                                  value={message}
                                  onChange={(e) => {
                                    handleInputChange(e.target.value);
                                    // Auto-resize textarea
                                    e.target.style.height = 'auto';
                                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                                    if (inputOverlayRef.current) {
                                      inputOverlayRef.current.scrollTop = e.target.scrollTop;
                                    }
                                  }}
                                  onScroll={(e: any) => {
                                    if (inputOverlayRef.current) {
                                      inputOverlayRef.current.scrollTop = e.target.scrollTop;
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (showTagPicker && filteredEmployees.length > 0) {
                                      if (e.key === 'ArrowDown') {
                                        e.preventDefault();
                                        setActiveTagIndex(prev => (prev + 1) % filteredEmployees.length);
                                        return;
                                      }
                                      if (e.key === 'ArrowUp') {
                                        e.preventDefault();
                                        setActiveTagIndex(prev => (prev - 1 + filteredEmployees.length) % filteredEmployees.length);
                                        return;
                                      }
                                      if (e.key === 'Enter' || e.key === 'Tab') {
                                        e.preventDefault();
                                        const selectedEmp = filteredEmployees[activeTagIndex];
                                        if (selectedEmp) {
                                          handleTagSelect(selectedEmp);
                                        }
                                        return;
                                      }
                                      if (e.key === 'Escape') {
                                        e.preventDefault();
                                        setShowTagPicker(false);
                                        return;
                                      }
                                    }

                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      handleSendMessage();
                                      // Reset textarea height after sending
                                      if (messageInputRef.current) {
                                        messageInputRef.current.style.height = 'auto';
                                      }
                                    }
                                  }}
                                  onPaste={(e) => {
                                    const items = e.clipboardData?.items;
                                    if (items) {
                                      const newFiles: File[] = [];
                                      for (let i = 0; i < items.length; i++) {
                                        if (items[i].type.indexOf('image') !== -1) {
                                          const file = items[i].getAsFile();
                                          if (file) {
                                            newFiles.push(file);
                                          }
                                        }
                                      }
                                      if (newFiles.length > 0) {
                                        const wasEmpty = pendingAttachments.length === 0;
                                        const newAttachments = newFiles.map((file, idx) => ({
                                          file,
                                          caption: (wasEmpty && idx === 0) ? message : ""
                                        }));
                                        setPendingAttachments(prev => [...prev, ...newAttachments]);
                                        if (wasEmpty) {
                                          setActivePendingIndex(0);
                                          if (message) {
                                            setMessage("");
                                          }
                                        }
                                        e.preventDefault();
                                      }
                                    }
                                  }}
                                  placeholder="Type a message"
                                  rows={1}
                                  spellCheck={false}
                                  style={{
                                    fontFamily: 'inherit',
                                    fontSize: '15px',
                                    lineHeight: '20px',
                                    padding: '6px 8px',
                                    margin: '0',
                                    border: 'none',
                                    letterSpacing: 'normal',
                                    color: 'transparent',
                                    WebkitTextFillColor: 'transparent',
                                    caretColor: '#111b21',
                                  }}
                                  className="w-full bg-transparent text-transparent caret-[#111b21] border-none focus-visible:ring-0 shadow-none min-h-[24px] max-h-[120px] resize-none overflow-y-auto outline-none focus:outline-none relative z-10 whitespace-pre-wrap break-words [word-break:break-word] selection:bg-[#0ea5e9]/20"
                                />
                              </div>

                              {/* Right side actions: Poll + Send/Mic */}
                              <div className="flex items-center shrink-0">

                                {/* Poll Button */}
                                {selectedChat?.type !== 'personal' && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-[#54656f] hover:bg-slate-100 rounded-full h-9 w-9 shrink-0"
                                    onClick={() => setShowCreatePoll(true)}
                                    title="Create Poll"
                                  >
                                    <BarChart2 className="w-5 h-5" />
                                  </Button>
                                )}

                                {/* Send or Mic Button */}
                                {(message.trim() || pendingAttachments.length > 0 || voicePreviewBlob) ? (
                                  <Button
                                    type="submit"
                                    variant="ghost"
                                    size="icon"
                                    className="text-brand-teal hover:bg-slate-100 rounded-full h-9 w-9 shrink-0"
                                    title="Send Message"
                                  >
                                    <Send className="w-5 h-5 fill-current" />
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-[#54656f] hover:bg-slate-100 rounded-full h-9 w-9 shrink-0"
                                    onClick={startRecording}
                                    title="Voice Message"
                                  >
                                    <Mic className="w-5 h-5" />
                                  </Button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}
            {/* Right Sidebar - Shared Files Repository / Contact Info */}
            {selectedChat && showRightSidebar && (
              <div className="hidden sm:flex w-full sm:w-[340px] lg:w-[380px] border-l border-border bg-white flex-col overflow-hidden animate-in slide-in-from-right duration-300 shrink-0">
                <div className="h-[88px] border-b border-border px-6 flex items-center justify-between bg-white shrink-0">
                  {sidebarContactUser ? (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-slate-500 hover:text-slate-700 -ml-2"
                        onClick={() => setSidebarContactUser(null)}
                        title="Back"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </Button>
                      <h3 className="font-bold text-slate-800 text-base">Contact info</h3>
                    </div>
                  ) : (
                    <h3 className="font-bold text-slate-800 text-base">
                      {sidebarTab === 'files' ? 'Shared Files' : (selectedChat.type === 'group' || selectedChat.type === 'general') ? 'Group info' : 'Contact info'}
                    </h3>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-600"
                    onClick={() => {
                      setShowRightSidebar(false);
                      setSidebarContactUser(null);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-50/50">
                  {sidebarTab === 'files' ? (
                    <div className="p-4 space-y-6 bg-white min-h-full">
                      {chatFiles.length > 0 ? (
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
                                  onClick={() => {
                                    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(file.attachmentName || "")) {
                                      setPreviewImageMsgId(file.id);
                                    } else {
                                      handleDownload(file.attachmentUrl, file.attachmentName);
                                    }
                                  }}
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
                  ) : sidebarContactUser ? (
                    <div className="space-y-4">
                      {/* Avatar + Basic Details Card for Overridden Contact Info */}
                      <div className="bg-white p-6 border-b border-slate-200/60 flex flex-col items-center">
                        <Avatar className="w-32 h-32 border-2 border-slate-100 shadow-sm">
                          {sidebarContactUser.profilePhoto ? (
                            <AvatarImage src={getAvatarUrl(sidebarContactUser.profilePhoto)} />
                          ) : (
                            <AvatarFallback className="bg-brand-light text-brand-teal font-bold text-3xl uppercase">
                              {(sidebarContactUser.name || sidebarContactUser.firstName || "U")[0]}
                            </AvatarFallback>
                          )}
                        </Avatar>

                        <h4 className="text-lg font-bold text-slate-800 mt-4 text-center">
                          {sidebarContactUser.name || `${sidebarContactUser.firstName || ''} ${sidebarContactUser.lastName || ''}`.trim()}
                        </h4>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1 text-center">
                          {sidebarContactUser.designation || 'Employee'}
                        </p>
                        <span className="mt-2.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-teal/5 text-brand-teal">
                          {sidebarContactUser.department || 'Staff'}
                        </span>

                        <div className="w-full mt-6">
                          <Button
                            onClick={() => {
                              const empId = sidebarContactUser.id || sidebarContactUser.employeeId || sidebarContactUser._id;
                              if (empId) {
                                openPersonalChatWithEmployeeId(String(empId));
                                setShowRightSidebar(false);
                                setSidebarContactUser(null);
                              }
                            }}
                            className="w-full bg-brand-teal hover:bg-brand-teal/90 text-white font-bold rounded-xl h-10 flex items-center justify-center gap-2 shadow-xs"
                          >
                            <MessageSquare className="w-4 h-4" /> Message
                          </Button>
                        </div>
                      </div>

                      {/* Detailed Information Section for Overridden Contact Info */}
                      <div className="bg-white p-6 border-y border-slate-200/60 space-y-4">
                        <div className="border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Email address</span>
                          <span className="text-sm font-semibold text-slate-700 break-all">{sidebarContactUser.email || '-'}</span>
                        </div>
                        <div className="border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Company Role</span>
                          <span className="text-sm font-semibold text-slate-700 capitalize">{sidebarContactUser.role || 'Employee'}</span>
                        </div>
                        {sidebarContactUser.joinDate && (
                          <div className="border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Joined Date</span>
                            <span className="text-sm font-semibold text-slate-700">
                              {dayjs(sidebarContactUser.joinDate).format("DD MMMM YYYY")}
                            </span>
                          </div>
                        )}
                        <div className="pb-3 last:border-0 last:pb-0">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Status</span>
                          <span className={cn(
                            "inline-flex items-center gap-1.5 text-xs font-bold",
                            onlineUsers.has(String(sidebarContactUser.id || sidebarContactUser.employeeId || sidebarContactUser._id)) ? "text-emerald-600" : "text-slate-400"
                          )}>
                            <span className={cn("w-2 h-2 rounded-full", onlineUsers.has(String(sidebarContactUser.id || sidebarContactUser.employeeId || sidebarContactUser._id)) ? "bg-emerald-500" : "bg-slate-300")} />
                            {onlineUsers.has(String(sidebarContactUser.id || sidebarContactUser.employeeId || sidebarContactUser._id)) ? "Online" : "Offline"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Avatar + Basic Details Card */}
                      <div className="bg-white p-6 border-b border-slate-200/60 flex flex-col items-center">
                        <Avatar className="w-32 h-32 border-2 border-slate-100 shadow-sm">
                          {selectedChat.avatar ? (
                            <AvatarImage src={getAvatarUrl(selectedChat.avatar)} />
                          ) : (
                            <AvatarFallback className="bg-brand-light text-brand-teal font-bold text-3xl uppercase">
                              {selectedChat.name[0]}
                            </AvatarFallback>
                          )}
                        </Avatar>

                        <h4 className="text-lg font-bold text-slate-800 mt-4 text-center">{selectedChat.name}</h4>
                        {selectedChat.type === 'personal' ? (
                          (() => {
                            const emp = employees.find(e => String(e.id) === String(selectedChat.id) || String(e.employeeId) === String(selectedChat.id));
                            return (
                              <>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1 text-center">
                                  {emp?.designation || 'Employee'}
                                </p>
                                <span className="mt-2.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-teal/5 text-brand-teal">
                                  {emp?.department || 'Staff'}
                                </span>
                              </>
                            );
                          })()
                        ) : (
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1 text-center">
                            Group Chat • {groupMembersList.length} Members
                          </p>
                        )}

                        {selectedChat.type === 'personal' && (
                          <div className="w-full mt-6">
                            <Button
                              onClick={() => {
                                setShowRightSidebar(false);
                                messageInputRef.current?.focus();
                              }}
                              className="w-full bg-brand-teal hover:bg-brand-teal/90 text-white font-bold rounded-xl h-10 flex items-center justify-center gap-2 shadow-xs"
                            >
                              <MessageSquare className="w-4 h-4" /> Message
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Detailed Information Section */}
                      {selectedChat.type === 'personal' ? (
                        (() => {
                          const emp = employees.find(e => String(e.id) === String(selectedChat.id) || String(e.employeeId) === String(selectedChat.id));
                          return (
                            <div className="bg-white p-6 border-y border-slate-200/60 space-y-4">
                              <div className="border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Email address</span>
                                <span className="text-sm font-semibold text-slate-700 break-all">{emp?.email || '-'}</span>
                              </div>
                              <div className="border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Company Role</span>
                                <span className="text-sm font-semibold text-slate-700 capitalize">{emp?.role || 'Employee'}</span>
                              </div>
                              {emp?.joinDate && (
                                <div className="border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Joined Date</span>
                                  <span className="text-sm font-semibold text-slate-700">
                                    {dayjs(emp.joinDate).format("DD MMMM YYYY")}
                                  </span>
                                </div>
                              )}
                              <div className="pb-3 last:border-0 last:pb-0">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Status</span>
                                <span className={cn(
                                  "inline-flex items-center gap-1.5 text-xs font-bold",
                                  isSelectedChatOnline ? "text-emerald-600" : "text-slate-400"
                                )}>
                                  <span className={cn("w-2 h-2 rounded-full", isSelectedChatOnline ? "bg-emerald-500" : "bg-slate-300")} />
                                  {isSelectedChatOnline ? "Online" : "Offline"}
                                </span>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="bg-white border-y border-slate-200/60">
                          {selectedChat.description && (
                            <div className="p-6 border-b border-slate-100">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Description</span>
                              <p className="text-sm text-slate-600 leading-relaxed font-medium">{selectedChat.description}</p>
                            </div>
                          )}

                          <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Members ({groupMembersList.length})
                              </span>
                            </div>
                            <div className="space-y-3">
                              {groupMembersList.map((memberId: string) => {
                                const emp = employees.find((e: any) => e.id === memberId);
                                if (!emp) return null;
                                const empName = emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
                                const initials = empName.split(' ').map((n: string) => n[0]).join('').toUpperCase();
                                const isMe = memberId === user?.id;

                                return (
                                  <div
                                    key={memberId}
                                    onClick={() => {
                                      if (!isMe) {
                                        openSidebarForMember(memberId);
                                      }
                                    }}
                                    className={cn(
                                      "flex items-center gap-3 p-2 rounded-xl transition-all",
                                      isMe ? "" : "hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-100"
                                    )}
                                  >
                                    <Avatar className="w-9 h-9 border border-slate-100 shadow-2xs">
                                      <AvatarImage src={getAvatarUrl(emp.profilePhoto)} />
                                      <AvatarFallback className="bg-brand-teal/10 text-brand-teal font-extrabold text-xs">{initials}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-bold text-slate-700 truncate">{empName}</span>
                                        {isMe && (
                                          <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded-full select-none">
                                            You
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5 truncate">
                                        {emp.designation || emp.role || 'Employee'}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
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

      <Dialog open={!!forwardingMessage || !!forwardingMessages} onOpenChange={(open) => { if (!open) { setForwardingMessage(null); setForwardingMessages(null); } }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Forward {forwardingMessages && forwardingMessages.length > 1 ? `${forwardingMessages.length} Messages` : 'Message'}</DialogTitle>
            <DialogDescription>Select a chat to forward this message to.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                placeholder="Search people..."
                className="pl-9 pr-9"
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:bg-transparent hover:text-slate-700"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-1">
              {[...filteredChats, ...chatGroups.filter((g: any) => g.name.toLowerCase().includes(searchQuery.toLowerCase())).map((g: any) => ({ ...g, type: 'group' })), ...chatChannels.filter((c: any) => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map((c: any) => ({ ...c, type: 'general' }))].map((chat: any) => (
                <div
                  key={chat.id}
                  onClick={() => handleForwardMessage(chat.id, chat.type || 'personal')}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-gray-100"
                >
                  <Avatar className="w-10 h-10 border border-border">
                    {chat.avatar && <AvatarImage src={getAvatarUrl(chat.avatar)} />}
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
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search members..."
                  className="pl-9 pr-9 h-9 text-sm rounded-lg"
                  value={groupMemberSearchQuery}
                  onChange={(e) => setGroupMemberSearchQuery(e.target.value)}
                />
                {groupMemberSearchQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400 hover:bg-transparent hover:text-slate-700"
                    onClick={() => setGroupMemberSearchQuery("")}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
              <div className="max-h-[200px] overflow-y-auto border border-border rounded-xl p-2 space-y-1">
                {chats.filter((emp: any) => !groupMemberSearchQuery.trim() || emp.name?.toLowerCase().includes(groupMemberSearchQuery.toLowerCase())).map((emp: any) => (
                  <div
                    key={emp.id}
                    className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                    onClick={() => handleToggleMember(emp.id)}
                  >
                    <Checkbox
                      id={`emp-${emp.id}`}
                      checked={selectedGroupMembers.includes(emp.id)}
                      className="pointer-events-none"
                    />
                    <Avatar className="w-8 h-8 pointer-events-none">
                      <AvatarImage src={getAvatarUrl(emp.avatar)} />
                      <AvatarFallback className="bg-brand-light text-brand-teal text-[10px]">{emp.name ? emp.name[0]?.toUpperCase() : "?"}</AvatarFallback>
                    </Avatar>
                    <div className="text-sm font-medium leading-none pointer-events-none">
                      {emp.name}
                    </div>
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
                className="pl-10 pr-9 rounded-xl"
                value={newChatSearchQuery}
                onChange={(e) => setNewChatSearchQuery(e.target.value)}
              />
              {newChatSearchQuery && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:bg-transparent hover:text-slate-700"
                  onClick={() => setNewChatSearchQuery("")}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-1 pr-2">
              {employees.filter((emp: any) => {
                if (!newChatSearchQuery.trim()) return true;
                const q = newChatSearchQuery.toLowerCase().trim();
                const empName = emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
                const name = empName.toLowerCase();
                const designation = (emp.designation || "").toLowerCase();
                return name.includes(q) || designation.includes(q);
              }).map((emp: any) => {
                const empName = emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
                return (
                  <div
                    key={emp.id}
                    onClick={() => {
                      setSelectedChat({
                        id: emp.id || emp.employeeId,
                        name: emp.id === user?.id ? `${empName} (You)` : empName,
                        status: onlineUsers.has(emp.id || emp.employeeId) ? "Online" : "Offline",
                        avatar: emp.profilePhoto
                          ? (emp.profilePhoto.startsWith("http") ? emp.profilePhoto : `${API_URL}/uploads/${emp.profilePhoto}`)
                          : null,
                        type: "personal"
                      });
                      setShowNewChat(false);
                      setActiveTab("Personal");
                    }}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-gray-100"
                  >
                    <Avatar className="w-10 h-10 border border-border">
                      {emp.profilePhoto && (
                        <AvatarImage
                          src={getAvatarUrl(emp.profilePhoto)}
                        />
                      )}
                      <AvatarFallback className="bg-brand-light text-brand-teal font-bold text-xs">
                        {empName ? empName[0]?.toUpperCase() : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800">{emp.id === user?.id ? `${empName} (You)` : empName}</p>
                      <p className="text-[11px] text-muted-foreground">{emp.designation || "Colleague"}</p>
                    </div>
                  </div>
                )
              })}
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
            {Array.from(new Set(selectedChat?.members || [])).map((memberId: any) => {
              const member = employees.find((e: any) => e.id === memberId);
              if (!member) return null;
              return (
                <div key={memberId} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors">
                  <Avatar className="w-10 h-10 border border-border">
                    <AvatarImage src={getAvatarUrl(member.profilePhoto)} />
                    <AvatarFallback className="bg-brand-light text-brand-teal font-bold text-xs">
                      {member.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800">{member.name} {member.id === user?.id && "(You)"}</p>
                    <p className="text-[11px] text-muted-foreground">{member.designation || member.role || "Team Member"}</p>
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
        <DialogContent className="sm:max-w-[320px] bg-white border-none rounded-2xl p-0 overflow-hidden shadow-2xl">
          <div className="p-5">
            <DialogHeader className="mb-3">
              <DialogTitle className="text-base font-bold text-slate-800 text-center">Delete message?</DialogTitle>
              <DialogDescription className="sr-only">Choose how to delete this message</DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-1.5">
              <Button
                onClick={() => { confirmDeleteMessage('me'); if (isSelectionMode) exitSelectionMode(); }}
                className="w-full justify-start text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl py-5 px-4 shadow-none"
              >
                <Trash2 className="w-4 h-4 mr-3 text-slate-500" />
                Delete for me
              </Button>
              {canDeleteForEveryone() && (
                <Button
                  onClick={() => { confirmDeleteMessage('everyone'); if (isSelectionMode) exitSelectionMode(); }}
                  className="w-full justify-start text-sm font-semibold text-red-600 bg-white hover:bg-red-50 border border-slate-200 rounded-xl py-5 px-4 shadow-none"
                >
                  <Trash2 className="w-4 h-4 mr-3 text-red-500" />
                  Delete for everyone
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => { setShowDeleteConfirm(false); if (isSelectionMode) exitSelectionMode(); }}
                className="w-full justify-center text-sm font-medium text-slate-500 hover:bg-slate-50 rounded-xl py-4 mt-0.5"
              >
                Cancel
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

      {/* Image Preview Modal (WhatsApp Style - Light Theme) */}
      <Dialog open={!!previewImageMsgId} onOpenChange={(open) => !open && setPreviewImageMsgId(null)}>
        <DialogContent
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
            }
          }}
          className="sm:max-w-full w-screen h-screen p-0 overflow-hidden bg-[#eaebeb] border-none shadow-2xl flex flex-col justify-between [&>button:last-child]:hidden"
        >
          <DialogTitle className="sr-only">Image Preview</DialogTitle>
          <DialogDescription className="sr-only">Preview of shared image</DialogDescription>

          {/* Top Bar */}
          {currentPreviewMsg && (
            <div className="h-16 px-6 bg-[#f0f2f5] flex items-center justify-between text-slate-800 shrink-0 z-50 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <Avatar className="w-9 h-9 border border-slate-200">
                  <AvatarImage src={currentPreviewMsg.isMe ? getAvatarUrl(user?.profilePhoto) : getAvatarUrl(selectedChat?.avatar)} />
                  <AvatarFallback className="bg-brand-teal text-white font-bold text-xs">
                    {(currentPreviewMsg.isMe ? user?.name : selectedChat?.name)?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 text-left">
                  <p className="text-sm font-bold truncate leading-snug text-slate-800">
                    {currentPreviewMsg.isMe ? `${user?.name} (You)` : (employees.find(e => e.id === currentPreviewMsg.senderId)?.name || currentPreviewMsg.sender || selectedChat?.name)}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {dayjs(currentPreviewMsg.timestamp).format("MMMM D, YYYY [at] hh:mm A")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-full"
                  onClick={() => currentPreviewMsg.replyToId && scrollToMessage(currentPreviewMsg.replyToId)}
                >
                  <Reply className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-full"
                  onClick={() => setForwardingMessage(currentPreviewMsg)}
                >
                  <Forward className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-full"
                  onClick={() => handleDownload(currentPreviewMsg.attachmentUrl, currentPreviewMsg.attachmentName)}
                >
                  <Download className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-full"
                  onClick={() => setPreviewImageMsgId(null)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
          )}

          {/* Center Image View Area */}
          <div className="flex-1 relative w-full flex items-center justify-center p-4">
            {/* Left Nav Arrow */}
            {currentPreviewIndex > 0 && (
              <button
                onClick={handlePrevImage}
                className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 hover:bg-white text-slate-700 shadow-md border border-slate-200 rounded-full flex items-center justify-center transition z-50"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {currentPreviewMsg && (
              currentPreviewMsg.isVoice || (currentPreviewMsg.attachmentName && /\.(mp3|wav|m4a|ogg|aac|flac|webm)$/i.test(currentPreviewMsg.attachmentName)) ? (
                <div className="flex flex-col items-center justify-center w-full max-w-lg">
                  <AudioMessagePlayer msg={currentPreviewMsg} isMe={currentPreviewMsg.isMe || false} />
                </div>
              ) : (currentPreviewMsg.attachmentName && /\.mp4$/i.test(currentPreviewMsg.attachmentName)) ? (
                <SmartPreviewAttachment msg={currentPreviewMsg} />
              ) : (currentPreviewMsg.attachmentName && /\.(mov|mkv)$/i.test(currentPreviewMsg.attachmentName)) ? (
                <video
                  src={
                    currentPreviewMsg.attachmentUrl?.startsWith('blob:') ? currentPreviewMsg.attachmentUrl :
                      currentPreviewMsg.attachmentUrl?.startsWith('http') ? currentPreviewMsg.attachmentUrl :
                        `${API_URL}${currentPreviewMsg.attachmentUrl}`
                  }
                  controls
                  autoPlay
                  className="max-w-full max-h-[75vh] object-contain shadow-2xl rounded-sm"
                />
              ) : (
                <img
                  src={
                    currentPreviewMsg.attachmentUrl?.startsWith('blob:') ? currentPreviewMsg.attachmentUrl :
                      currentPreviewMsg.attachmentUrl?.startsWith('http') ? currentPreviewMsg.attachmentUrl :
                        `${API_URL}${currentPreviewMsg.attachmentUrl}`
                  }
                  alt={currentPreviewMsg.attachmentName}
                  className="max-w-full max-h-[75vh] object-contain select-none shadow-2xl rounded-sm"
                />
              )
            )}

            {/* Right Nav Arrow */}
            {currentPreviewIndex < mediaMessages.length - 1 && (
               <button
                 onClick={handleNextImage}
                 className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 hover:bg-white text-slate-700 shadow-md border border-slate-200 rounded-full flex items-center justify-center transition z-50"
               >
                 <ChevronLeft className="w-6 h-6 rotate-180" />
               </button>
            )}
          </div>

          {/* Bottom Thumbnail Strip Carousel */}
          {mediaMessages.length > 1 && (
            <div className="h-20 bg-[#f0f2f5] border-t border-slate-200 flex items-center justify-center gap-2 p-2 shrink-0 overflow-x-auto">
              {mediaMessages.map((msg) => {
                const isSelected = msg.id === previewImageMsgId;
                const isVideo = msg.attachmentName && /\.(mov|mkv)$/i.test(msg.attachmentName);
                const isAudio = msg.isVoice || (msg.attachmentName && /\.(mp3|wav|m4a|ogg|aac|flac|webm)$/i.test(msg.attachmentName));
                const thumbUrl = msg.attachmentUrl?.startsWith('blob:') ? msg.attachmentUrl :
                  msg.attachmentUrl?.startsWith('http') ? msg.attachmentUrl :
                    `${API_URL}${msg.attachmentUrl}`;
                return (
                  <div
                    key={msg.id}
                    onClick={() => setPreviewImageMsgId(msg.id)}
                    className={cn(
                      "w-12 h-12 rounded-md overflow-hidden cursor-pointer border-2 transition-all relative shrink-0",
                      isSelected ? "border-brand-teal scale-105" : "border-slate-300 opacity-50 hover:opacity-100"
                    )}
                  >
                    {isVideo ? (
                      <div className="relative w-full h-full bg-slate-900 flex items-center justify-center">
                        <video src={thumbUrl} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/35 flex items-center justify-center text-white">
                          <Play className="w-4 h-4 fill-current" />
                        </div>
                      </div>
                    ) : isAudio ? (
                      <div className="relative w-full h-full bg-amber-500 flex items-center justify-center">
                        <Headphones className="w-5 h-5 text-white" />
                      </div>
                    ) : (
                      <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* PDF Viewer Dialog */}
      <Dialog open={!!pdfViewerUrl} onOpenChange={(open) => { if (!open) setPdfViewerUrl(null); }}>
        <DialogContent className="max-w-5xl h-[90vh] p-0 flex flex-col overflow-hidden bg-white rounded-2xl shadow-2xl border-none">
          <DialogHeader className="px-5 py-4 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
            <DialogTitle className="text-sm font-bold text-slate-800 truncate pr-8">{pdfViewerTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 w-full h-full bg-slate-50 relative">
            {pdfViewerUrl && (
              <iframe
                src={pdfViewerUrl}
                className="w-full h-full border-none"
                title="PDF Viewer"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Message Info Modal */}
      <Dialog open={!!msgInfoData} onOpenChange={(open) => {
        if (!open) setMsgInfoData(null);
      }}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-brand-teal">Message Info</DialogTitle>
            <DialogDescription>
              See who has read your message.
            </DialogDescription>
          </DialogHeader>
          {(() => {
            if (!msgInfoData) return null;

            const latestMsg = currentMessages.find((m: any) => String(m.id) === String(msgInfoData.id)) || msgInfoData;
            const seenBy = latestMsg.seenBy || [];
            const readByUsers = seenBy.filter((id: string) => String(id) !== String(user?.id));

            return (
              <div className="py-2">
                {/* Read by section */}
                <h4 className="text-[12px] font-bold mb-2 text-[#53bdeb] uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCheck className="w-4 h-4" /> Read by
                </h4>
                <div className="max-h-[300px] overflow-y-auto space-y-0.5 pr-1">
                  {readByUsers.length > 0 ? (
                    readByUsers.map((id: string) => {
                      const emp = employees.find((e: any) => String(e.id) === String(id));
                      if (!emp) return null;
                      return (
                        <div key={id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={getAvatarUrl(emp.avatar)} />
                            <AvatarFallback className="bg-brand-light text-brand-teal text-[10px]">
                              {emp.name ? emp.name[0]?.toUpperCase() : "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{emp.name}</p>
                          </div>
                          <CheckCheck className="w-4 h-4 text-[#53bdeb]" />
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-slate-500 py-2 italic px-2">No one has read this message yet.</p>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Right-click Context Menu */}
      {contextMenu && (() => {
        const menuW = 200, menuH = 320;
        const vw = typeof window !== 'undefined' ? window.innerWidth : 0;
        const vh = typeof window !== 'undefined' ? window.innerHeight : 0;
        const fitsBelow = contextMenu.y + menuH <= vh;
        const fitsRight = contextMenu.x + menuW <= vw;
        return (
        <div
          key={`${contextMenu.msg.id}-${contextMenu.x}-${contextMenu.y}`}
          className="custom-ctx-menu fixed z-[999] bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-xl shadow-2xl p-1.5 min-w-[200px] max-h-[70vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-100"
          style={{
            top: fitsBelow ? contextMenu.y : undefined,
            bottom: fitsBelow ? undefined : vh - contextMenu.y,
            left: fitsRight ? contextMenu.x : undefined,
            right: fitsRight ? undefined : vw - contextMenu.x
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Reaction Bar */}
          <div className="flex items-center justify-between px-2 py-1 mb-1.5 bg-slate-50/50 rounded-lg border-b border-slate-100 gap-1">
            {["👍", "❤️", "😂", "😮", "😢", "🙏"].map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  handleToggleReaction(contextMenu.msg.id, emoji);
                  setContextMenu(null);
                }}
                className="w-7 h-7 text-lg hover:scale-125 transition-transform flex items-center justify-center rounded-full hover:bg-slate-100"
              >
                {emoji}
              </button>
            ))}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="right" className="p-0 border-none bg-transparent shadow-none z-[1000] w-auto">
                <EmojiPicker
                  onEmojiSelect={(emoji) => {
                    handleToggleReaction(contextMenu.msg.id, emoji);
                    setContextMenu(null);
                  }}
                  onClose={() => { }}
                />
              </PopoverContent>
            </Popover>
          </div>

          {isSelectionMode ? (
            <>
              <button
                type="button"
                onClick={() => {
                  toggleMessageSelection(contextMenu.msg.id);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg text-left transition-colors"
              >
                {selectedMessageIds.includes(contextMenu.msg.id) ? (
                  <><X className="w-4 h-4 text-slate-400" /> Deselect</>
                ) : (
                  <><Check className="w-4 h-4 text-slate-400" /> Select</>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedMessageIds.length > 0) {
                    setShowDeleteConfirm(true);
                    setMessageToDelete(null);
                  }
                  setContextMenu(null);
                }}
                disabled={selectedMessageIds.length === 0}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg text-left transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
                Delete ({selectedMessageIds.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  exitSelectionMode();
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg text-left transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
                Clear
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setReplyingTo(contextMenu.msg);
                  setContextMenu(null);
                  setTimeout(() => messageInputRef.current?.focus(), 50);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg text-left transition-colors"
              >
                <Reply className="w-4 h-4 text-slate-400" />
                Reply
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (contextMenu.msg.text) {
                    navigator.clipboard.writeText(contextMenu.msg.text);
                    toast.success("Copied!");
                  }
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg text-left transition-colors"
              >
                <Copy className="w-4 h-4 text-slate-400" />
                Copy
              </button>

              <button
                type="button"
                onClick={() => { setForwardingMessage(contextMenu.msg); setForwardingMessages(null); setContextMenu(null); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg text-left transition-colors"
              >
                <Forward className="w-4 h-4 text-slate-400" />
                Forward
              </button>

              <button
                type="button"
                onClick={() => {
                  enterSelectionMode();
                  toggleMessageSelection(contextMenu.msg.id);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg text-left transition-colors"
              >
                <CheckCheck className="w-4 h-4 text-slate-400" />
                Select messages
              </button>

              <button
                type="button"
                onClick={() => { handleTogglePin(contextMenu.msg.id); setContextMenu(null); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg text-left transition-colors"
              >
                <Pin className={cn("w-4 h-4 text-slate-400", contextMenu.msg.isPinned && "fill-current text-brand-teal")} />
                {contextMenu.msg.isPinned ? "Unpin" : "Pin"}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (contextMenu.msg.attachmentUrl) {
                    handleDownload(contextMenu.msg.attachmentUrl, contextMenu.msg.attachmentName);
                  } else if (contextMenu.msg.text) {
                    const blob = new Blob([contextMenu.msg.text], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `msg-${contextMenu.msg.id}.txt`;
                    a.click();
                    toast.success("Saved text message!");
                  }
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg text-left transition-colors"
              >
                <Download className="w-4 h-4 text-slate-400" />
                Save as
              </button>

              <DropdownMenuSeparator className="my-1" />

              <button
                type="button"
                onClick={() => { enterSelectionMode(); toggleMessageSelection(contextMenu.msg.id); setContextMenu(null); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg text-left transition-colors"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
                Delete
              </button>
            </>
          )}
        </div>
      ); })()}

      {/* Chat Background Context Menu */}
      {chatBackgroundContextMenu && (() => {
        const bgMenuW = 180, bgMenuH = 120;
        const vw = typeof window !== 'undefined' ? window.innerWidth : 0;
        const vh = typeof window !== 'undefined' ? window.innerHeight : 0;
        const fitsBelow = chatBackgroundContextMenu.y + bgMenuH <= vh;
        const fitsRight = chatBackgroundContextMenu.x + bgMenuW <= vw;
        return (
        <div
          className="custom-ctx-menu fixed z-[999] bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-xl shadow-2xl p-1.5 min-w-[180px] animate-in fade-in zoom-in-95 duration-100"
          style={{
            top: fitsBelow ? chatBackgroundContextMenu.y : undefined,
            bottom: fitsBelow ? undefined : vh - chatBackgroundContextMenu.y,
            left: fitsRight ? chatBackgroundContextMenu.x : undefined,
            right: fitsRight ? undefined : vw - chatBackgroundContextMenu.x
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {isSelectionMode ? (
            <>
              <button
                type="button"
                onClick={() => {
                  handleForwardSelectedMessages();
                  setChatBackgroundContextMenu(null);
                }}
                disabled={selectedMessageIds.length === 0}
                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg text-left transition-colors disabled:opacity-50"
              >
                <Forward className="w-4 h-4 text-slate-400" />
                Forward selected ({selectedMessageIds.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  exitSelectionMode();
                  setChatBackgroundContextMenu(null);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg text-left transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
                Clear selection
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => { enterSelectionMode(); }}
                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg text-left transition-colors"
              >
                <CheckCheck className="w-4 h-4 text-slate-400" />
                Select messages
              </button>
              <button
                type="button"
                onClick={() => { setSelectedChat(null as any); setChatBackgroundContextMenu(null); }}
                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg text-left transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
                Close chat
              </button>
            </>
          )}
        </div>
      ); })()}

      {showDiscardConfirm && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white rounded-[8px] p-6 max-w-[320px] w-full shadow-2xl flex flex-col gap-5 animate-in zoom-in-95 duration-200 text-left">
            <h4 className="text-slate-700 text-[15px] font-semibold">Discard selection?</h4>
            <div className="flex justify-end gap-5">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="text-[#00a884] hover:bg-slate-50 font-bold text-sm px-3 py-1.5 rounded transition-colors focus:outline-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setPendingAttachments([]);
                  setShowDiscardConfirm(false);
                }}
                className="bg-[#00a884] hover:bg-[#008f72] text-white font-bold text-sm px-4 py-1.5 rounded transition-colors shadow-xs focus:outline-none"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
