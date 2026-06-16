import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link as LinkIcon, Loader2 } from "lucide-react";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import { WhatsAppIcon } from "./WhatsAppIcon";

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

  useEffect(() => {
    if (open && client) {
      setLink(client.whatsappGroup || "");
      setIsEditingLink(!client.whatsappGroup);
    }
  }, [open, client]);

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

