import React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export function FollowUpDialog({ open, onOpenChange, lead, onSave }: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Follow Up</DialogTitle>
        </DialogHeader>
        <div className="p-4">Follow up form for {lead?.name || 'Lead'}</div>
      </DialogContent>
    </Dialog>
  )
}
