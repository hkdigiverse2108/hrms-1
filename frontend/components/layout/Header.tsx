"use client";
 
import React, { useState, useEffect } from "react";
import { Bell, MessageSquare, Menu, LogOut } from "lucide-react";
import { Layout } from "antd";
import Link from "next/link";
import { SearchBar } from "@/components/common/SearchBar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { SidebarNav } from "./SidebarNav";
import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/config";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Check, Eye } from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";


dayjs.extend(relativeTime);

 
const { Header: AntHeader } = Layout;
 
export function Header() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
 
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
    }
  }, [user?.id]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_URL}/notifications/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: any) => !n.is_read).length);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/notifications/${id}/read`, { method: 'PUT' });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (err) {
      console.error("Error marking read:", err);
    }
  };

 
  const userName = user?.name || "Guest";
  const designation = user?.designation || "Employee";
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase();
  const showUserInfo = mounted && !isLoading;
 
  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/login");
  };
 
  return (
    <AntHeader 
      className="bg-white border-b border-border flex items-center justify-between px-6 sticky top-0 z-10 w-full mb-6"
      style={{ height: '64px', padding: '0 24px', lineHeight: '64px', background: '#fff' }}
    >
      {/* Left - Search & Mobile Menu */}
      <div className="flex-1 max-w-md flex items-center gap-4 h-full">
        <Sheet>
          <SheetTrigger asChild>
            <button className="p-2 lg:hidden border border-border rounded-md hover:bg-muted transition-colors flex items-center justify-center">
              <Menu className="w-5 h-5 text-foreground" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <SidebarNav />
          </SheetContent>
        </Sheet>
        <SearchBar placeholder="Search employees, reports..." className="hidden sm:flex" containerClassName="hidden sm:flex" />
      </div>
 
      {/* Right - Profile & Actions */}
      <div className="flex items-center gap-4 h-full">
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center justify-center p-2 border border-border rounded-full hover:bg-muted transition-colors relative">
              <Bell className="w-4 h-4 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0 shadow-xl border-border" align="end">
            <div className="p-4 border-b border-border flex items-center justify-between bg-gray-50/50 rounded-t-lg">
              <h3 className="font-bold text-sm">Notifications</h3>
              {unreadCount > 0 && <span className="text-[10px] bg-brand-teal/10 text-brand-teal px-2 py-0.5 rounded-full font-medium">{unreadCount} New</span>}
            </div>
            <ScrollArea className="h-[350px]">
              {notifications.length === 0 ? (
                <div className="p-10 text-center flex flex-col items-center gap-2">
                  <div className="bg-gray-100 p-3 rounded-full">
                    <Bell className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-muted-foreground">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`p-4 hover:bg-gray-50 transition-colors relative group ${!n.is_read ? 'bg-brand-light/10' : ''}`}
                    >
                      {!n.is_read && <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-brand-teal rounded-full" />}
                      <div className="flex flex-col gap-1 pl-2">
                        <div className="flex justify-between items-start">
                          <span className="font-semibold text-xs text-foreground">{n.title}</span>
                          <span className="text-[10px] text-muted-foreground">{dayjs(n.created_at, "DD-MM-YYYY HH:mm").fromNow()}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{n.message}</p>
                        
                        <div className="flex items-center gap-2 mt-1">
                          <button 
                            onClick={() => {
                              if (n.type === 'leave') {
                                router.push(user.role === 'Employee' ? '/leave' : '/employees/leave');
                              }
                            }}
                            className="flex items-center gap-1 text-[10px] font-bold text-brand-teal hover:bg-brand-teal/10 px-2 py-1 rounded transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            View
                          </button>
                          {!n.is_read && (
                            <button 
                              onClick={() => markAsRead(n.id)}
                              className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:bg-gray-200 px-2 py-1 rounded transition-colors"
                            >
                              <Check className="w-3 h-3" />
                              Mark as Read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                  ))}
                </div>
              )}
            </ScrollArea>
            <div className="p-3 border-t border-border text-center">
              <button className="text-[11px] font-semibold text-brand-teal hover:underline">View All Notifications</button>
            </div>
          </PopoverContent>
        </Popover>

        <Link href="/chat" className="flex items-center justify-center p-2 border border-border rounded-full hover:bg-muted transition-colors">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
        </Link>
        
        <Link href="/profile" className="flex items-center gap-3 ml-2 border-l border-border pl-6 px-2 py-1 h-10 my-auto hover:bg-muted rounded-md transition-colors">
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage 
                src={user?.profilePhoto ? (user.profilePhoto.startsWith('http') ? user.profilePhoto : `${API_URL}/uploads/${user.profilePhoto}`) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`} 
                alt={userName} 
              />
              <AvatarFallback>{showUserInfo ? initials : ""}</AvatarFallback>
            </Avatar>
 
            <div className="hidden md:flex flex-col text-sm leading-tight min-w-[100px]">
              {showUserInfo ? (
                <>
                  <span className="font-medium text-foreground">{userName}</span>
                  <span className="text-xs text-muted-foreground">{designation}</span>
                </>
              ) : (
                <div className="space-y-1">
                  <div className="h-3 w-20 bg-gray-100 animate-pulse rounded"></div>
                  <div className="h-2 w-16 bg-gray-50 animate-pulse rounded"></div>
                </div>
              )}
            </div>
          </div>
        </Link>
        <button 
          onClick={handleLogout}
          className="ml-2 p-1.5 text-muted-foreground hover:text-brand-danger hover:bg-red-50 rounded-md transition-colors"
          title="Log out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </AntHeader>
  );
}
