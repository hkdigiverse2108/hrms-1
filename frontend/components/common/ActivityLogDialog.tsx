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
    let derivedAction = log.action;
    if (title === "Client Activity History" && log.action === "Updated") {
      derivedAction = "CLIENT UPDATED";
    }

    if (!log.details) return { ...log, processedDetails: [], derivedAction };
    
    let detailsStr = log.details.replace(/^Client '[^']+': /, '');
    
    // Custom split function that ignores commas inside quotes or brackets
    const splitDetails = (str: string) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      let bracketLevel = 0;
      let curlyLevel = 0;
      
      for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (char === "'") inQuotes = !inQuotes;
        else if (char === "[") bracketLevel++;
        else if (char === "]") bracketLevel--;
        else if (char === "{") curlyLevel++;
        else if (char === "}") curlyLevel--;
        
        if (char === ',' && str[i+1] === ' ' && !inQuotes && bracketLevel === 0 && curlyLevel === 0) {
          result.push(current);
          current = '';
          i++; // skip space
        } else {
          current += char;
        }
      }
      if (current) result.push(current);
      return result;
    };

    let detailsList = splitDetails(detailsStr)
      .map(d => d.trim())
      .map(d => {
        if (d.startsWith("Campaigns changed from")) {
          const fromMatch = d.match(/from '(\[.*?\])' to/);
          const toMatch = d.match(/to '(\[.*?\])'/);
          if (fromMatch && toMatch) {
            try {
              const extractCampsObj = (s: string) => {
                const matches = [...s.matchAll(/'name':\s*'([^']+)',\s*'isActive':\s*(True|False)/g)];
                const obj: Record<string, boolean> = {};
                matches.forEach(m => {
                  obj[m[1]] = m[2] === 'True';
                });
                return obj;
              };
              
              const fromObj = extractCampsObj(fromMatch[1]);
              const toObj = extractCampsObj(toMatch[1]);
              
              const changes = [];
              let hasAdds = false;
              let hasUpdates = false;
              
              for (const [name, isActive] of Object.entries(toObj)) {
                if (!(name in fromObj)) {
                  hasAdds = true;
                  changes.push(`Added new campaign '${name}' (${isActive ? 'Active' : 'Inactive'})`);
                } else if (fromObj[name] !== isActive) {
                  hasUpdates = true;
                  changes.push(`Campaign '${name}' status changed to ${isActive ? 'Active' : 'Inactive'}`);
                }
              }
              
              for (const name of Object.keys(fromObj)) {
                if (!(name in toObj)) {
                  hasUpdates = true;
                  changes.push(`Deleted campaign '${name}'`);
                }
              }
              
              if (hasAdds && !hasUpdates) {
                derivedAction = "CAMPAIGN CREATED";
              } else if (hasUpdates || hasAdds) {
                derivedAction = "CAMPAIGN UPDATED";
              }
              
              if (changes.length > 0) return changes.join(" | ");
              else return "Campaigns updated";
            } catch (e) {}
          }
        }
        return d;
      })
      .filter(d => {
        if (!d) return false;
        if (d.toLowerCase().includes("updated_at changed")) return false;
        if (d.includes("from 'N/A' to 'None'")) return false;
        if (d.includes("from 'N/A' to 'No'")) return false;
        if (d.includes("from 'N/A' to '0.0'")) return false;
        if (d.includes("from 'N/A' to ''")) return false;
        return true;
      });

    return { ...log, processedDetails: detailsList, derivedAction };
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
        
        <div className="px-6 pt-5 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#F0FDF4] rounded-full flex items-center justify-center">
              <History className="w-4.5 h-4.5 text-[#0D9488]" />
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-[#111827]">{title}</h2>
              {subtitle && <p className="text-[11px] text-[#6B7280] font-medium italic mt-0.5">{subtitle}</p>}
            </div>
          </div>
        </div>
 
        <div className="px-6 py-2 max-h-[60vh] overflow-y-auto custom-scrollbar relative">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
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
                    <div className="absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full bg-white border-[3px] border-[#0D9488] z-10 transition-transform group-hover:scale-110" />
                    
                    <div className="bg-[#F9FAFB] border border-[#F3F4F6] rounded-[12px] p-3 transition-all group-hover:shadow-md group-hover:border-[#0D9488]/20 group-hover:bg-white">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[13.5px] font-bold text-[#111827]">{log.userName}</span>
                        <span className="text-[10.5px] font-medium text-[#9CA3AF] tabular-nums">{formatTimestamp(log.timestamp)}</span>
                      </div>
                      
                      {log.derivedAction && (
                        <div className="mb-1">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#F0FDF4] text-[#0D9488] border border-[#D1FAE5] uppercase tracking-wider">
                            {log.derivedAction}
                          </span>
                        </div>
                      )}
                      
                      <div className="text-[13px] text-[#4B5563] leading-[1.6] font-medium space-y-1.5">
                        {log.processedDetails && log.processedDetails.length > 0 ? (
                          log.processedDetails.map((detail: string, i: number) => (
                            <p key={i}>{detail.replace(/ 00:00:00/g, "")}</p>
                          ))
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
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                <History className="w-6 h-6 text-gray-200" />
              </div>
              <h3 className="text-[15px] font-bold text-gray-900 mb-1">No history yet</h3>
              <p className="text-[12px] text-gray-500">There are no activity logs recorded for this item.</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 flex justify-end">
          <Button 
            onClick={() => onOpenChange(false)}
            className="h-[40px] px-6 rounded-lg bg-[#0D9488] hover:bg-[#0B7A70] text-white font-bold text-[14px] shadow-lg shadow-[#0D9488]/10 transition-all active:scale-95"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
