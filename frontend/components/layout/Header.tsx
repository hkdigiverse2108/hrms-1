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
 
const { Header: AntHeader } = Layout;
 
export function Header() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const [mounted, setMounted] = useState(false);
 
  useEffect(() => {
    setMounted(true);
  }, []);
 
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
        <button className="flex items-center justify-center p-2 border border-border rounded-full hover:bg-muted transition-colors relative">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>
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
