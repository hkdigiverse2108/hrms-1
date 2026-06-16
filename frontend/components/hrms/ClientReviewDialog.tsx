import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Loader2, CheckCircle, XCircle, Clock, Send, History } from "lucide-react";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import { useUser } from "@/hooks/useUser";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ClientReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: any;
  onSaved: () => void;
}

export function ClientReviewDialog({ open, onOpenChange, client, onSaved }: ClientReviewDialogProps) {
  const { user } = useUser();
  const [isSaving, setIsSaving] = useState(false);
  
  // New Review Form State
  const [newReviewContent, setNewReviewContent] = useState("");
  const [newReviewType, setNewReviewType] = useState("General");
  const [isAdding, setIsAdding] = useState(false);

  // Admin Update State
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [adminCommentMap, setAdminCommentMap] = useState<Record<string, string>>({});

  let localReviews: any[] = [];
  try {
    if (typeof window !== "undefined" && client?.id) {
      localReviews = JSON.parse(localStorage.getItem(`workReviews_${client.id}`) || "[]");
    }
  } catch (e) {}
  
  const reviews = (client?.workReviews?.length ? client.workReviews : localReviews) || [];

  useEffect(() => {
    if (open && client) {
      setNewReviewContent("");
      setNewReviewType("General");
      setIsAdding(false);
      
      const initialComments: Record<string, string> = {};
      reviews.forEach((r: any) => {
        initialComments[r.id] = r.adminComment || "";
      });
      setAdminCommentMap(initialComments);
    }
  }, [open, client, reviews.length]);

  const handleAddReview = async () => {
    if (!client || !newReviewContent.trim()) return;
    setIsSaving(true);
    
    const newReview = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      addedBy: user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Unknown',
      content: newReviewContent,
      type: newReviewType,
      status: "Pending",
      adminComment: "",
      logs: [{
        timestamp: new Date().toISOString(),
        user: user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Unknown',
        status: "Created",
        comment: "Initial review added"
      }]
    };

    const updatedReviews = [...reviews, newReview];

    try {
      const res = await fetch(`${API_URL}/clients/${client.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          workReviews: updatedReviews,
          performedBy: user?.id,
          userName: user?.name || 'Unknown',
        }),
      });
      
      if (res.ok) {
        toast.success("Review added successfully");
        client.workReviews = updatedReviews;
        try { localStorage.setItem(`workReviews_${client.id}`, JSON.stringify(updatedReviews)); } catch (e) {}
        setNewReviewContent("");
        setIsAdding(false);
        onSaved();
      } else {
        toast.error("Failed to add review");
      }
    } catch (err) {
      console.error(err);
      toast.error("Connection error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateReviewStatus = async (reviewId: string, newStatus: string) => {
    if (!client) return;
    setUpdatingId(reviewId);
    
    const updatedReviews = reviews.map((r: any) => {
      if (r.id === reviewId) {
        const newLog = {
          timestamp: new Date().toISOString(),
          user: user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Unknown',
          status: newStatus,
          comment: adminCommentMap[reviewId] || ""
        };
        const currentLogs = r.logs || [];
        return { 
          ...r, 
          status: newStatus, 
          adminComment: adminCommentMap[reviewId] || "",
          logs: [...currentLogs, newLog]
        };
      }
      return r;
    });

    try {
      const res = await fetch(`${API_URL}/clients/${client.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          workReviews: updatedReviews,
          performedBy: user?.id,
          userName: user?.name || 'Unknown',
        }),
      });
      
      if (res.ok) {
        toast.success(`Review marked as ${newStatus}`);
        client.workReviews = updatedReviews;
        try { localStorage.setItem(`workReviews_${client.id}`, JSON.stringify(updatedReviews)); } catch (e) {}
        onSaved();
      } else {
        toast.error("Failed to update review status");
      }
    } catch (err) {
      console.error(err);
      toast.error("Connection error");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveAdminComment = async (reviewId: string) => {
    if (!client) return;
    
    // Find the current review to check if it actually changed
    const currentReview = reviews.find((r: any) => r.id === reviewId);
    if (!currentReview || currentReview.adminComment === adminCommentMap[reviewId]) {
      return; // No changes to save
    }

    const updatedReviews = reviews.map((r: any) => {
      if (r.id === reviewId) {
        return { ...r, adminComment: adminCommentMap[reviewId] || "" };
      }
      return r;
    });

    try {
      const res = await fetch(`${API_URL}/clients/${client.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          workReviews: updatedReviews,
          performedBy: user?.id,
          userName: user?.name || 'Unknown',
        }),
      });
      
      if (res.ok) {
        client.workReviews = updatedReviews;
        try { localStorage.setItem(`workReviews_${client.id}`, JSON.stringify(updatedReviews)); } catch (e) {}
        onSaved(); // Fetch clients silently
      }
    } catch (err) {
      console.error("Error auto-saving comment:", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-brand-teal">
            <Star className="w-5 h-5 fill-brand-teal" />
            Client Work Reviews
          </DialogTitle>
          <p className="text-sm text-slate-500">Manage feedback and approvals for {client?.companyName}</p>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-6 py-4">
          
          {/* List of Existing Reviews */}
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
                <p className="text-sm text-slate-500">No reviews recorded yet.</p>
              </div>
            ) : (
              [...reviews].reverse().map((review: any) => (
                <div key={review.id} className="bg-white border border-slate-200 shadow-sm rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-medium">
                          {new Date(review.date).toLocaleDateString()} by {review.addedBy}
                        </span>
                      </div>
                    </div>
                    <div>
                      {review.status === "Pending" && <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 shadow-none border-0"><Clock className="w-3 h-3 mr-1"/> Pending</Badge>}
                      {review.status === "Completed" && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 shadow-none border-0"><CheckCircle className="w-3 h-3 mr-1"/> Completed</Badge>}
                      {review.status === "Needs Revision" && <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 shadow-none border-0"><XCircle className="w-3 h-3 mr-1"/> Revision Needed</Badge>}
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-md italic border-l-2 border-brand-teal">
                    "{review.content}"
                  </p>

                  <div className="pt-2 border-t border-slate-100 space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-500">Admin/Manager Comment</Label>
                      <Textarea 
                        placeholder="Add a comment or feedback regarding this review..."
                        value={adminCommentMap[review.id] || ""}
                        onChange={(e) => setAdminCommentMap(prev => ({...prev, [review.id]: e.target.value}))}
                        onBlur={() => handleSaveAdminComment(review.id)}
                        className="h-16 text-sm resize-none"
                      />
                    </div>
                    <div className="flex gap-2 justify-between items-center">
                      {review.logs && review.logs.length > 0 ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-500 hover:text-slate-700 px-2 -ml-2">
                              <History className="w-3.5 h-3.5 mr-1.5" />
                              View History ({review.logs.length})
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-72 p-0" align="start">
                            <div className="p-3 border-b border-slate-100 bg-slate-50/50 rounded-t-md">
                              <h4 className="text-xs font-semibold text-slate-700">Status History</h4>
                            </div>
                            <div className="p-3 space-y-3 max-h-[250px] overflow-y-auto">
                              {review.logs.map((log: any, idx: number) => (
                                <div key={idx} className="flex gap-3 text-sm relative">
                                  {idx !== review.logs.length - 1 && (
                                    <div className="absolute left-[9px] top-5 bottom-[-16px] w-[2px] bg-slate-100" />
                                  )}
                                  <div className="w-5 h-5 rounded-full bg-slate-50 border-2 border-brand-teal/20 flex items-center justify-center shrink-0 z-10 mt-0.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-brand-teal/60" />
                                  </div>
                                  <div className="flex-1 pb-2">
                                    <div className="flex justify-between items-start">
                                      <p className="text-xs font-semibold text-slate-700">{log.status}</p>
                                      <span className="text-[10px] font-medium text-slate-400">{new Date(log.timestamp).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-0.5">By {log.user}</p>
                                    {log.comment && (
                                      <div className="mt-1.5 p-2 bg-slate-50 rounded border border-slate-100 text-xs text-slate-600 italic">
                                        "{log.comment}"
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : <div />}
                      
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-none"
                          disabled={updatingId === review.id}
                          onClick={() => handleUpdateReviewStatus(review.id, "Completed")}
                        >
                          {updatingId === review.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Completed"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add New Review Section */}
          <div className="pt-4 border-t border-slate-200">
            {!isAdding ? (
              <Button onClick={() => setIsAdding(true)} variant="outline" className="w-full border-dashed">
                + Add New Client Review
              </Button>
            ) : (
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-semibold text-slate-700">Record New Review</h4>
                  <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)} className="h-6 px-2 text-slate-500">Cancel</Button>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Client's Feedback</Label>
                    <Textarea 
                      placeholder="Type the exact feedback or review from the client..." 
                      className="bg-white min-h-[80px]"
                      value={newReviewContent}
                      onChange={(e) => setNewReviewContent(e.target.value)}
                    />
                  </div>
                </div>
                
                <Button 
                  className="w-full bg-brand-teal hover:bg-brand-teal/90" 
                  onClick={handleAddReview}
                  disabled={!newReviewContent.trim() || isSaving}
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> Submit Review</>}
                </Button>
              </div>
            )}
          </div>

        </div>

        <DialogFooter className="sm:justify-end border-t border-slate-100 pt-4 gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
