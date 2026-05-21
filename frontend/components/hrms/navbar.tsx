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
 
export function HRMSNavbar() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('')
  const { user, isLoading } = useUser();
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
 
  useEffect(() => {
    setMounted(true);
    if (user?.id) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
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
  const designation = user?.designation || "Employee";
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
                      if (n.type === 'leave' && n.reference_id) {
                        router.push(`/employees/leave?id=${n.reference_id}`);
                      } else if (n.type === 'attendance') {
                        const isAdminOrHR = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'hr';
                        if (isAdminOrHR) {
                          router.push(`/attendance/recovery-requests`);
                        } else {
                          router.push(`/attendance`);
                        }
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
                      {n.reference_id && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 px-2 text-[10px] border-brand-teal text-brand-teal hover:bg-brand-light"
                          onClick={() => {
                            if (n.type === 'leave' && n.reference_id) {
                              router.push(`/employees/leave?id=${n.reference_id}`);
                            } else if (n.type === 'attendance') {
                              const isAdminOrHR = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'hr';
                              if (isAdminOrHR) {
                                router.push(`/attendance/recovery-requests`);
                              } else {
                                router.push(`/attendance`);
                              }
                            }
                            markAsRead(n.id);
                          }}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      )}
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
            <DropdownMenuItem className="justify-center text-brand-teal font-medium">
              View all notifications
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
    </header>
  )
}
