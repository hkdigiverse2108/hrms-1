import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link as LinkIcon, Loader2, History } from "lucide-react";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import { WhatsAppIcon } from "./WhatsAppIcon";
import { useUser } from "@/hooks/useUser";
import { Badge } from "@/components/ui/badge";

interface WhatsAppSmmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: any;
  onSaved: () => void;
}

export function WhatsAppSmmDialog({ open, onOpenChange, client, onSaved }: WhatsAppSmmDialogProps) {
  const [link, setLink] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingLink, setIsEditingLink] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    if (open && client) {
      setLink(client.whatsappGroup || "");
      setIsEditingLink(!client.whatsappGroup);
    }
  }, [open, client]);

  const handleToggleGreetings = async () => {
    if (!client) return;
    const newValue = !client.greetingsMsgSent;
    const newLog = {
      timestamp: new Date().toISOString(),
      sentBy: user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Unknown',
      status: newValue
    };
    const updatedLogs = [...(client.greetingsLogs || []), newLog];

    try {
      const res = await fetch(`${API_URL}/clients/${client.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          greetingsMsgSent: newValue,
          greetingsLogs: updatedLogs,
          performedBy: user?.id,
          userName: user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Unknown',
        }),
      });
      if (res.ok) {
        toast.success(`Greetings marked as ${newValue ? 'sent' : 'unsent'}`);
        // Mutate the local client object optimistically so the dialog UI updates immediately
        client.greetingsMsgSent = newValue;
        client.greetingsLogs = updatedLogs;
        // Trigger a refetch in the parent component
        onSaved();
      } else {
        toast.error("Failed to update greetings status");
      }
    } catch (err) {
      console.error("Error updating greetings status:", err);
      toast.error("Connection error");
    }
  };

  const handleSaveLink = async (linkToSave: string = link) => {
    if (!client) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/clients/${client.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsappGroup: linkToSave }),
      });
      
      if (res.ok) {
        toast.success(linkToSave ? "WhatsApp link saved!" : "WhatsApp link removed!");
        setIsEditingLink(false);
        onSaved();
        if (!linkToSave) onOpenChange(false);
      } else {
        toast.error("Failed to save link.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Connection error.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLink = () => {
    setLink("");
    handleSaveLink("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#25D366]">
            <WhatsAppIcon className="w-5 h-5" />
            WhatsApp Outreach
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="whatsapp-link" className="text-xs font-bold uppercase text-slate-500">
              Group Link
            </Label>
            {isEditingLink ? (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input 
                    id="whatsapp-link"
                    placeholder="https://chat.whatsapp.com/..." 
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button 
                  onClick={() => handleSaveLink(link)} 
                  disabled={isSaving || !link} 
                  className="bg-[#25D366] hover:bg-[#20bd5a] text-white disabled:bg-slate-200 disabled:text-slate-400"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-md p-3">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <LinkIcon className="w-4 h-4 text-[#25D366] flex-shrink-0" />
                    <span className="text-sm font-medium text-slate-700 truncate">{link}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-white" onClick={() => window.open(link, "_blank")}>
                    Go to Group
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditingLink(true)}>
                    Edit
                  </Button>
                  <Button variant="destructive" onClick={handleDeleteLink}>
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3 mt-6 pt-6 border-t border-slate-100">
            <Label className="text-xs font-bold uppercase text-slate-500">
              Greetings Message
            </Label>
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-md p-3 hover:border-brand-teal/50 transition-colors cursor-pointer" onClick={handleToggleGreetings}>
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 text-brand-teal rounded border-slate-300 focus:ring-brand-teal cursor-pointer"
                  checked={!!client?.greetingsMsgSent}
                  onChange={handleToggleGreetings}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="text-sm font-medium text-slate-700">Greetings message sent to group</span>
              </div>
            </div>

            {client?.greetingsLogs && client.greetingsLogs.length > 0 && (
              <div className="mt-4">
                <Label className="text-xs font-bold uppercase text-slate-500 mb-2 flex items-center gap-1">
                  <History className="w-3 h-3" /> Logs
                </Label>
                <div className="max-h-40 overflow-y-auto pr-2 space-y-2">
                  {[...client.greetingsLogs].reverse().map((log: any, idx: number) => (
                    <div key={idx} className="flex flex-col gap-1 text-xs bg-slate-50 p-2.5 rounded-md border border-slate-100">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-slate-700">{log.sentBy}</span>
                        <span className="text-slate-500">
                          {new Date(log.timestamp).toLocaleString(undefined, { 
                            month: 'short', day: 'numeric', 
                            hour: '2-digit', minute: '2-digit' 
                          })}
                        </span>
                      </div>
                      <span className={log.status ? "text-emerald-600 font-medium" : "text-slate-500"}>
                        {log.status ? "Marked as Sent" : "Marked as Unsent"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="sm:justify-end">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

