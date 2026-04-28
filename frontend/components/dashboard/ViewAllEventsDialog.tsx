"use client";
 
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  Calendar as CalendarIcon, 
  MessageSquare, 
  Cake,
  Pencil,
  Trash2,
  X
} from "lucide-react";
import dayjs from "dayjs";
import { Button } from "@/components/ui/button";

interface ViewAllEventsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  events: any[];
  canAddEvents: boolean;
  onEditEvent: (event: any) => void;
  onDeleteEvent: (id: string) => void;
}

export function ViewAllEventsDialog({ 
  open, 
  onOpenChange, 
  events, 
  canAddEvents,
  onEditEvent,
  onDeleteEvent 
}: ViewAllEventsDialogProps) {
  // Only show events that are >= today, or show all events? 
  // "View all" usually means all upcoming events or just all events. Let's show all events, sorted by date.
  // Actually, let's filter to upcoming events only, so it's a true "View all" of the upcoming events feed, 
  // or maybe just show all of them. I'll show all sorted by date.
  const allEvents = [...events].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const groupedEvents = allEvents.reduce((acc, event) => {
    const monthYear = dayjs(event.date).format("MMMM YYYY");
    if (!acc[monthYear]) acc[monthYear] = [];
    acc[monthYear].push(event);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl bg-white max-h-[80vh] flex flex-col">
        <div className="sr-only">
          <DialogTitle>All Events</DialogTitle>
          <DialogDescription>List of all events.</DialogDescription>
        </div>
        
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
          <h3 className="text-lg font-bold text-[#111827]">All Events</h3>
        </div>
 
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50 space-y-8">
          {Object.keys(groupedEvents).length > 0 ? Object.keys(groupedEvents).map(month => (
             <div key={month} className="space-y-4">
               <h4 className="text-[12px] font-bold text-brand-teal uppercase tracking-widest pb-2 border-b border-brand-teal/10">{month}</h4>
               <div className="space-y-3">
                 {groupedEvents[month].map((event: any, i: number) => {
                   const isPast = dayjs(event.date).isBefore(dayjs().startOf('day'));
                   return (
                     <div key={event.id || i} className={`group p-4 rounded-xl bg-white border border-gray-100 hover:border-brand-teal/20 transition-all shadow-sm flex items-center gap-4 ${isPast ? 'opacity-60' : ''}`}>
                       <div className={`${
                         event.type === 'meeting' ? 'bg-[#F0FDF4] text-green-600' : 
                         event.type === 'discussion' ? 'bg-[#EFF6FF] text-blue-600' : 
                         'bg-[#FFF7ED] text-orange-600'
                       } p-3 rounded-xl`}>
                         {event.type === 'meeting' ? <CalendarIcon className="w-5 h-5" /> : 
                          event.type === 'discussion' ? <MessageSquare className="w-5 h-5" /> : 
                          <Cake className="w-5 h-5" />}
                       </div>
                       <div className="flex-1 min-w-0">
                         <h4 className="font-bold text-[14px] text-[#111827] truncate">{event.title}</h4>
                         <p className="text-[12px] text-gray-500 font-medium truncate">{event.description}</p>
                       </div>
                       <div className="text-right">
                         <div className="text-[13px] font-bold text-[#111827]">{dayjs(event.date).format("DD MMM")}</div>
                         {event.type !== 'birthday' && (
                           <div className="text-[11px] text-gray-400 font-medium">{event.time}</div>
                         )}
                         
                         {canAddEvents && event.type !== 'birthday' && (
                           <div className="flex items-center justify-end gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => {
                                  onOpenChange(false);
                                  onEditEvent(event);
                                }}
                                className="p-1 text-brand-teal hover:bg-brand-light rounded"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={() => onDeleteEvent(event.id)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                           </div>
                         )}
                       </div>
                     </div>
                   )
                 })}
               </div>
             </div>
          )) : (
             <div className="flex flex-col items-center justify-center py-12 text-center h-full">
                <CalendarIcon className="w-12 h-12 text-gray-300 mb-4" />
                <h4 className="text-sm font-bold text-gray-500">No events found</h4>
                <p className="text-xs text-gray-400 mt-1">There are currently no events scheduled.</p>
             </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
