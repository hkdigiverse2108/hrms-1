"use client";

import { Bell, MessageSquare, Menu } from "lucide-react";
import { Layout } from "antd";
import { SearchBar } from "@/components/common/SearchBar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { SidebarNav } from "./SidebarNav";
import { useUser } from "@/hooks/useUser";

const { Header: AntHeader } = Layout;

export function Header() {
  const { user } = useUser();
  const userName = user?.name || "Guest";
  const designation = user?.designation || "Employee";
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase();

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
        <button className="flex items-center justify-center p-2 border border-border rounded-full hover:bg-muted transition-colors">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
        </button>
        
        <div className="flex items-center gap-3 ml-2 border-l border-border pl-6 cursor-pointer hover:bg-muted px-2 py-1 rounded-md transition-colors h-10 my-auto">
          <Avatar className="w-8 h-8">
            <AvatarImage src={user?.profilePhoto || `https://i.pravatar.cc/150?u=${userName}`} alt={userName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="hidden md:flex flex-col text-sm leading-tight">
            <span className="font-medium text-foreground">{userName}</span>
            <span className="text-xs text-muted-foreground">{designation}</span>
          </div>
        </div>
      </div>
    </AntHeader>
  );
}

