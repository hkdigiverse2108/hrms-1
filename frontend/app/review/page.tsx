"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Star,
  StarHalf,
  Loader2
} from "lucide-react";
import { API_URL } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/PageHeader";
import { TablePagination } from "@/components/common/TablePagination";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/useUser";

const reviewsData = [
  {
    id: "01",
    user: "Michael Chang",
    role: "Senior Developer",
    avatar: "/avatars/michael.jpg",
    department: "Engineering",
    summary: "Strong delivery pace, clear ownership, and dependable collaboration across the sprint.",
    rating: 5,
  },
  {
    id: "02",
    user: "Emily Roberts",
    role: "HR Executive",
    avatar: "/avatars/emily.jpg",
    department: "Human Resources",
    summary: "Consistent follow-through, clear documentation, and very responsive support for internal teams.",
    rating: 5,
  },
  {
    id: "03",
    user: "David Wilson",
    role: "QA Analyst",
    avatar: "/avatars/david.jpg",
    department: "Quality Assurance",
    summary: "Careful validation, steady bug tracking, and reliable communication during release cycles.",
    rating: 5,
  },
  {
    id: "04",
    user: "Jessica Taylor",
    role: "Project Coordinator",
    avatar: "/avatars/jessica.jpg",
    department: "Operations",
    summary: "Needs tighter deadline follow-up, but client communication remains calm and professional.",
    rating: 3,
  },
  {
    id: "05",
    user: "Robert Chen",
    role: "UI Designer",
    avatar: "/avatars/robert.jpg",
    department: "Design",
    summary: "Creative direction is strong, and design handoff quality has improved over the last month.",
    rating: 4,
  },
  {
    id: "06",
    user: "Michael Chang",
    role: "Support Specialist",
    avatar: "/avatars/michael.jpg",
    department: "Customer Support",
    summary: "Creative direction is strong, and design handoff quality has improved over the last month.",
    rating: 5,
  }
];

const RatingStars = ({ rating, interactive = false, onRatingChange }: { rating: number, interactive?: boolean, onRatingChange?: (rating: number) => void }) => {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onRatingChange?.(star)}
          className={cn(
            "transition-transform active:scale-95",
            interactive ? "cursor-pointer" : "cursor-default"
          )}
        >
          <Star 
            className={cn(
              "w-4 h-4",
              star <= rating 
                ? "fill-amber-400 text-amber-400" 
                : "text-gray-200 fill-transparent"
            )} 
          />
        </button>
      ))}
    </div>
  );
};

export default function ReviewPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [newRating, setNewRating] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useUser();
  
  const canManageReviews = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'team leader';
  
  // New review form state
  const [newReview, setNewReview] = useState({
    employeeId: "",
    summary: "",
    rating: 0
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [revRes, empRes] = await Promise.all([
        fetch(`${API_URL}/reviews`),
        fetch(`${API_URL}/employees`)
      ]);
      if (revRes.ok) setReviews(await revRes.json());
      if (empRes.ok) setEmployees(await empRes.json());
    } catch (err) {
      console.error("Error fetching review data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateReview = async () => {
    if (!newReview.employeeId || !newReview.summary || newReview.rating === 0) return;
    
    setIsSubmitting(true);
    try {
      const emp = employees.find(e => e.id === newReview.employeeId || e.employeeId === newReview.employeeId);
      const payload = {
        ...newReview,
        employeeName: emp?.name || "Unknown",
        role: emp?.designation || "Staff",
        avatar: emp?.profilePhoto || "",
        department: emp?.department || "N/A"
      };

      const res = await fetch(`${API_URL}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setCreateModalOpen(false);
        setNewReview({ employeeId: "", summary: "", rating: 0 });
        setNewRating(0);
        fetchData();
      }
    } catch (err) {
      console.error("Error creating review:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateReview = async () => {
    if (!selectedReview) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/reviews/${selectedReview.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: selectedReview.summary,
          rating: selectedReview.rating
        })
      });

      if (res.ok) {
        setEditModalOpen(false);
        fetchData();
      }
    } catch (err) {
      console.error("Error updating review:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (!confirm("Are you sure you want to delete this review?")) return;
    
    try {
      const res = await fetch(`${API_URL}/reviews/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (err) {
      console.error("Error deleting review:", err);
    }
  };

  const openEditModal = (review: any) => {
    setSelectedReview(review);
    setEditModalOpen(true);
  };

  const filteredReviews = reviews.filter(r => 
    r.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-10">
      <PageHeader 
        title="Employee Reviews" 
        description="Review records with department, summary, rating, timestamps, and quick actions."
      >
        {canManageReviews && (
          <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-brand-teal hover:bg-brand-teal-light text-white font-medium shadow-sm w-full sm:w-auto mt-4 sm:mt-0">
                <Plus className="w-4 h-4 mr-2" />
                New Review
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Add New Review</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">Submit a performance review and rating for an employee.</p>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Employee</label>
                    <Select onValueChange={(val) => setNewReview(prev => ({ ...prev, employeeId: val }))} value={newReview.employeeId}>
                      <SelectTrigger className="w-full bg-white shadow-sm border-border">
                        <SelectValue placeholder="Select employee..." />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map(emp => (
                          <SelectItem key={emp.id} value={emp.id || emp.employeeId}>{emp.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Department</label>
                    <Input 
                      value={employees.find(e => e.id === newReview.employeeId || e.employeeId === newReview.employeeId)?.department || ""} 
                      placeholder="Auto-filled" 
                      className="bg-gray-50 text-muted-foreground" 
                      readOnly 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Rating</label>
                  <RatingStars rating={newRating} interactive={true} onRatingChange={(val) => { setNewRating(val); setNewReview(prev => ({ ...prev, rating: val })); }} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Summary</label>
                  <Textarea 
                    value={newReview.summary}
                    onChange={(e) => setNewReview(prev => ({ ...prev, summary: e.target.value }))}
                    placeholder="Write a detailed performance summary here..." 
                    className="h-32 resize-none bg-white"
                  />
                </div>
              </div>

              <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 mt-4">
                <Button variant="outline" className="px-8" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
                <Button 
                  disabled={isSubmitting || !newReview.employeeId || !newReview.summary || newReview.rating === 0}
                  className="bg-brand-teal hover:bg-brand-teal-light text-white font-semibold px-8" 
                  onClick={handleCreateReview}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Submit Review"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      {/* Main Table Container */}
      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 sm:p-6 border-b border-border bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-[350px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search employees, reports..." 
              className="pl-9 bg-gray-50/50 border-border rounded-lg h-10" 
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-[11px] text-muted-foreground font-bold border-b border-border bg-gray-50/30 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 w-[80px]">Sr. No.</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Summary</th>
                <th className="px-6 py-4">Rating</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-teal" />
                    <p className="text-sm text-muted-foreground mt-2">Loading reviews...</p>
                  </td>
                </tr>
              ) : filteredReviews.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                    No reviews found.
                  </td>
                </tr>
              ) : (
                filteredReviews.map((review, idx) => (
                  <tr key={review.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4 font-semibold text-slate-500">
                      {(idx + 1).toString().padStart(2, '0')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 border border-border rounded-lg overflow-hidden">
                          <AvatarImage src={review.avatar} className="object-cover" />
                          <AvatarFallback className="bg-brand-light text-brand-teal text-xs font-bold">
                            {review.employeeName?.split(' ').map((n:any) => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-bold text-foreground text-[14px] leading-tight">{review.employeeName}</div>
                          <div className="text-[12px] text-muted-foreground font-medium mt-0.5">{review.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600">
                      {review.department}
                    </td>
                    <td className="px-6 py-4 max-w-[400px]">
                      <div className="text-[13px] text-slate-600 leading-relaxed whitespace-normal line-clamp-2">
                        {review.summary}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <RatingStars rating={review.rating} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      {canManageReviews && (
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-brand-teal" onClick={() => openEditModal(review)}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => handleDeleteReview(review.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 bg-white border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
           <div className="text-[13px] text-muted-foreground font-medium">
             Showing {filteredReviews.length} reviews
           </div>
           

        </div>
      </div>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Review</DialogTitle>
          </DialogHeader>
          
          {selectedReview && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
               <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Rating</label>
                <RatingStars 
                  rating={selectedReview.rating} 
                  interactive={true} 
                  onRatingChange={(val) => setSelectedReview((prev: any) => ({ ...prev, rating: val }))} 
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Summary</label>
                <Textarea 
                  value={selectedReview.summary}
                  onChange={(e) => setSelectedReview((prev: any) => ({ ...prev, summary: e.target.value }))}
                  className="h-32 resize-none bg-white"
                />
              </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 mt-4">
            <Button variant="outline" className="px-8" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button 
              disabled={isSubmitting}
              className="bg-brand-teal hover:bg-brand-teal-light text-white font-semibold px-8" 
              onClick={handleUpdateReview}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
