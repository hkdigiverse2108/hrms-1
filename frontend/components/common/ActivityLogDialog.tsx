"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { History, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogEntry {
  userName: string;
  timestamp: string;
  details: string;
  action?: string;
}

interface ActivityLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  subtitle?: string;
  logs: LogEntry[];
  isLoading?: boolean;
}

const formatTimestamp = (timestampString: string) => {
  if (!timestampString) return "";
  try {
    const date = new Date(timestampString);
    if (isNaN(date.getTime())) return timestampString;
    const dateStr = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${dateStr} • ${timeStr}`;
  } catch (e) {
    return timestampString;
  }
};

export function ActivityLogDialog({
  open,
  onOpenChange,
  title = "Activity Logs",
  subtitle,
  logs,
  isLoading = false,
}: ActivityLogDialogProps) {
  const processedLogs = logs.map(log => {
    if (!log.details) return { ...log, processedDetails: [] };
    
    const detailsList = log.details
      .replace(/^Client '[^']+': /, '')
      .split(', ')
      .map(d => d.trim())
      .filter(d => {
        if (!d) return false;
        if (d.toLowerCase().includes("updated_at changed")) return false;
        if (d.includes("from 'N/A' to 'None'")) return false;
        if (d.includes("from 'N/A' to 'No'")) return false;
        if (d.includes("from 'N/A' to '0.0'")) return false;
        if (d.includes("from 'N/A' to ''")) return false;
        return true;
      });

    return { ...log, processedDetails: detailsList };
  }).filter(log => {
    if (log.details && log.processedDetails.length === 0 && log.action === "Updated") {
      return false;
    }
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden border-none shadow-2xl rounded-[24px]">
        <div className="sr-only">
          <DialogTitle>{title}</DialogTitle>
        </div>
        
        <div className="p-8 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#F0FDF4] rounded-full flex items-center justify-center">
              <History className="w-5 h-5 text-[#0D9488]" />
            </div>
            <div>
              <h2 className="text-[20px] font-bold text-[#111827]">{title}</h2>
              {subtitle && <p className="text-[12px] text-[#6B7280] font-medium italic mt-0.5">{subtitle}</p>}
            </div>
          </div>
        </div>
 
        <div className="px-8 py-4 max-h-[60vh] overflow-y-auto custom-scrollbar relative">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#0D9488]" />
              <p className="text-[13px] font-bold text-[#6B7280] uppercase tracking-widest">Fetching history...</p>
            </div>
          ) : processedLogs.length > 0 ? (
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-[7px] top-2 bottom-2 w-[1.5px] bg-[#E5E7EB]" />
              
              <div className="space-y-6">
                {processedLogs.map((log: any, idx) => (
                  <div key={idx} className="relative pl-9 group">
                    {/* Timeline Dot */}
                    <div className="absolute left-0 top-1.5 w-[16px] h-[16px] rounded-full bg-white border-[3px] border-[#0D9488] z-10 transition-transform group-hover:scale-110" />
                    
                    <div className="bg-[#F9FAFB] border border-[#F3F4F6] rounded-[16px] p-5 transition-all group-hover:shadow-md group-hover:border-[#0D9488]/20 group-hover:bg-white">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[14px] font-bold text-[#111827]">{log.userName}</span>
                        <span className="text-[11px] font-medium text-[#9CA3AF] tabular-nums">{formatTimestamp(log.timestamp)}</span>
                      </div>
                      
                      {log.action && (
                        <div className="mb-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#F0FDF4] text-[#0D9488] border border-[#D1FAE5] uppercase tracking-wider">
                            {log.action}
                          </span>
                        </div>
                      )}
                      
                      <div className="text-[13px] text-[#4B5563] leading-[1.6] font-medium space-y-1">
                        {log.processedDetails && log.processedDetails.length > 0 ? (
                          <ul className="list-disc pl-4 marker:text-[#9CA3AF]">
                            {log.processedDetails.map((detail: string, i: number) => (
                              <li key={i}>{detail.replace(" 00:00:00", "")}</li>
                            ))}
                          </ul>
                        ) : (
                          (!log.details && log.action) ? <span>Action logged</span> : null
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <History className="w-8 h-8 text-gray-200" />
              </div>
              <h3 className="text-[16px] font-bold text-gray-900 mb-1">No history yet</h3>
              <p className="text-[13px] text-gray-500">There are no activity logs recorded for this item.</p>
            </div>
          )}
        </div>

        <div className="p-8 pt-4 flex justify-end">
          <Button 
            onClick={() => onOpenChange(false)}
            className="h-[48px] px-8 rounded-xl bg-[#0D9488] hover:bg-[#0B7A70] text-white font-bold text-[15px] shadow-lg shadow-[#0D9488]/10 transition-all active:scale-95"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
