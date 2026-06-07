'use client'
 
import React, { useState, useEffect } from 'react'
import { Bell, Search, ChevronDown, LogOut, User, Settings, Eye, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useUser } from '@/hooks/useUser'
import { getAvatarUrl } from '@/lib/config'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"

dayjs.extend(relativeTime);
 
export function HRMSNavbar() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('')
  const { user, isLoading } = useUser();
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");

  const markAllAsRead = async () => {
    if (!user?.id) return;
    try {
      const { API_URL } = await import('@/lib/config');
      const response = await fetch(`${API_URL}/notifications/read-all/${user.id}`, {
        method: "PUT"
      });
      if (response.ok) {
        const { toast } = await import('sonner');
        toast.success("All notifications marked as read");
        fetchNotifications();
      }
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };
 
  useEffect(() => {
    setMounted(true);
    if (user?.id) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user?.id) return;
    try {
      const { API_URL } = await import('@/lib/config');
      const response = await fetch(`${API_URL}/notifications/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: any) => !n.is_read).length);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { API_URL } = await import('@/lib/config');
      const response = await fetch(`${API_URL}/notifications/${id}/read`, { method: 'PUT' });
      if (response.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };
 
  const userName = user?.name || "Guest";
  const designation = user?.designation || user?.role || "Employee";
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase();
  const showUserInfo = mounted && !isLoading;
 
  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/login");
  };
 
  return (
    <header className="fixed left-64 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search employees, documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-80 pl-10"
          />
        </div>
      </div>
 
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center bg-brand-danger">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex justify-between items-center">
              <span>Notifications</span>
              {unreadCount > 0 && <span className="text-[10px] font-normal text-muted-foreground">{unreadCount} unread</span>}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-[300px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No notifications yet
                </div>
              ) : (
                notifications.map((n) => (
                  <DropdownMenuItem 
                    key={n.id} 
                    className={`flex flex-col items-start gap-1 py-3 cursor-pointer ${!n.is_read ? 'bg-slate-50/50' : ''}`}
                    onClick={() => {
                      if (n.type === 'leave') {
                        const route = user?.role === 'Employee' ? '/leave' : '/employees/leave';
                        router.push(n.reference_id ? `${route}?id=${n.reference_id}` : route);
                      } else if (n.type === 'document') {
                        router.push('/employees/documents');
                      } else if (n.type === 'attendance') {
                        router.push(user?.role === 'Employee' ? '/attendance' : '/employees/attendance');
                      } else if (n.type === 'recruitment') {
                        router.push('/recruitment');
                      }
                      markAsRead(n.id);
                    }}
                  >
                    <div className="flex justify-between w-full">
                      <span className={`font-medium ${!n.is_read ? 'text-brand-teal' : ''}`}>{n.title}</span>
                      <span className="text-[10px] text-muted-foreground">{n.created_at}</span>
                    </div>
                    <span className="text-sm text-muted-foreground leading-snug">
                      {n.message}
                    </span>
                    <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 px-2 text-[10px] border-brand-teal text-brand-teal hover:bg-brand-light"
                          onClick={() => {
                            if (n.type === 'leave') {
                              const route = user?.role === 'Employee' ? '/leave' : '/employees/leave';
                              router.push(n.reference_id ? `${route}?id=${n.reference_id}` : route);
                            } else if (n.type === 'document') {
                              router.push('/employees/documents');
                            } else if (n.type === 'attendance') {
                              router.push(user?.role === 'Employee' ? '/attendance' : '/employees/attendance');
                            } else if (n.type === 'recruitment') {
                              router.push('/recruitment');
                            }
                            markAsRead(n.id);
                          }}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      {!n.is_read && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 px-2 text-[10px] text-muted-foreground hover:text-brand-teal"
                          onClick={() => markAsRead(n.id)}
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Mark as Read
                        </Button>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={markAllAsRead} 
              disabled={unreadCount === 0}
              className="flex items-center justify-center gap-1.5 text-brand-teal font-medium cursor-pointer py-2 focus:bg-brand-light/50 focus:text-brand-teal disabled:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>Mark all read</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
 
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-3 px-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={getAvatarUrl(user?.profilePhoto, userName)} alt={userName} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {showUserInfo ? initials : ""}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start text-sm min-w-[100px]">
                {showUserInfo ? (
                  <>
                    <span className="font-medium">{userName}</span>
                    <span className="text-xs text-muted-foreground">{designation}</span>
                  </>
                ) : (
                  <div className="space-y-1">
                    <div className="h-3 w-20 bg-gray-100 animate-pulse rounded"></div>
                    <div className="h-2 w-16 bg-gray-50 animate-pulse rounded"></div>
                  </div>
                )}
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link href="/profile">
              <DropdownMenuItem className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
            </Link>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={isNotificationsModalOpen} onOpenChange={setIsNotificationsModalOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[85vh] flex flex-col p-0 overflow-hidden bg-white border border-border rounded-xl shadow-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">Notifications Center</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Stay updated with your latest activities, requests, and system alerts.
                </DialogDescription>
              </div>
              {unreadCount > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={markAllAsRead} 
                  className="text-xs border-brand-teal text-brand-teal hover:bg-brand-light flex items-center gap-1.5 h-8 font-medium"
                >
                  <Check className="w-3.5 h-3.5" />
                  Mark all as read
                </Button>
              )}
            </div>
            {/* Tabs for All vs Unread */}
            <div className="flex gap-2 mt-4 border-b border-border pb-1">
              <button 
                onClick={() => setActiveTab("all")}
                className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-all ${activeTab === 'all' ? 'border-brand-teal text-brand-teal' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                All Notifications ({notifications.length})
              </button>
              <button 
                onClick={() => setActiveTab("unread")}
                className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-all ${activeTab === 'unread' ? 'border-brand-teal text-brand-teal' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                Unread ({unreadCount})
              </button>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 overflow-y-auto px-6 max-h-[50vh]">
            {(() => {
              const displayed = activeTab === "unread" 
                ? notifications.filter(n => !n.is_read)
                : notifications;
              
              if (displayed.length === 0) {
                return (
                  <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
                    <div className="bg-brand-light/50 p-4 rounded-full text-brand-teal">
                      <Bell className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">No notifications found</p>
                      <p className="text-xs text-muted-foreground mt-0.5">You're all caught up!</p>
                    </div>
                  </div>
                );
              }

              return (
                <div className="divide-y divide-border">
                  {displayed.map((n) => {
                    const isUnread = !n.is_read;
                    // Determine icon based on notification type
                    let iconBg = "bg-blue-50 text-blue-600";
                    if (n.type === 'leave') {
                      iconBg = "bg-amber-50 text-amber-600";
                    } else if (n.type === 'attendance') {
                      iconBg = "bg-emerald-50 text-emerald-600";
                    } else if (n.type === 'document') {
                      iconBg = "bg-indigo-50 text-indigo-600";
                    }

                    return (
                      <div 
                        key={n.id} 
                        className={`py-4 flex gap-4 transition-colors relative group ${isUnread ? 'bg-brand-light/5' : ''}`}
                      >
                        {isUnread && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-brand-teal rounded-full" />}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
                          <Bell className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <span className={`font-semibold text-sm text-foreground block truncate ${isUnread ? 'text-brand-teal font-bold' : ''}`}>
                              {n.title}
                            </span>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap pt-0.5">
                              {dayjs(n.created_at).fromNow()}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed break-words">{n.message}</p>
                          
                          <div className="flex items-center gap-3 mt-3">
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setIsNotificationsModalOpen(false);
                                if (n.type === 'leave') {
                                  const route = user?.role === 'Employee' ? '/leave' : '/employees/leave';
                                  router.push(n.reference_id ? `${route}?id=${n.reference_id}` : route);
                                } else if (n.type === 'document') {
                                  router.push('/employees/documents');
                                } else if (n.type === 'attendance') {
                                  router.push(user?.role === 'Employee' ? '/attendance' : '/employees/attendance');
                                } else if (n.type === 'recruitment') {
                                  router.push('/recruitment');
                                }
                                markAsRead(n.id);
                              }}
                              className="h-7 px-2.5 text-[10px] font-bold border-brand-teal text-brand-teal hover:bg-brand-light"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              View Details
                            </Button>
                            {isUnread && (
                              <Button 
                                size="sm"
                                variant="ghost"
                                onClick={() => markAsRead(n.id)}
                                className="h-7 px-2.5 text-[10px] font-bold text-muted-foreground hover:bg-gray-100 hover:text-foreground"
                              >
                                <Check className="w-3.5 h-3.5 mr-1" />
                                Mark as Read
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </ScrollArea>

          <div className="p-4 border-t border-border bg-gray-50/50 flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setIsNotificationsModalOpen(false)} className="text-xs font-semibold">
              Close Notifications
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  )
}
