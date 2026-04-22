"use client";

import React, { useState } from "react";
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Star,
  StarHalf
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/PageHeader";
import { TablePagination } from "@/components/common/TablePagination";
import { cn } from "@/lib/utils";

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
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [newRating, setNewRating] = useState(0);

  const openEditModal = (review: any) => {
    setSelectedReview(review);
    setEditModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader 
        title="Employee Reviews" 
        description="Review records with department, summary, rating, timestamps, and quick actions."
      >
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
                  <Select>
                    <SelectTrigger className="w-full bg-white shadow-sm border-border">
                      <SelectValue placeholder="Select employee..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="michael">Michael Chang</SelectItem>
                      <SelectItem value="emily">Emily Roberts</SelectItem>
                      <SelectItem value="david">David Wilson</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Department</label>
                  <Input placeholder="Auto-filled" className="bg-gray-50 text-muted-foreground" readOnly />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Rating</label>
                <RatingStars rating={newRating} interactive={true} onRatingChange={setNewRating} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Summary</label>
                <Textarea 
                  placeholder="Write a detailed performance summary here..." 
                  className="h-32 resize-none bg-white"
                />
              </div>
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 mt-4">
              <Button variant="outline" className="px-8" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
              <Button className="bg-brand-teal hover:bg-brand-teal-light text-white font-semibold px-8" onClick={() => setCreateModalOpen(false)}>
                Submit Review
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Main Table Container */}
      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 sm:p-6 border-b border-border bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-[350px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search employees, reports..." className="pl-9 bg-gray-50/50 border-border rounded-lg h-10" />
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
              {reviewsData.map((review) => (
                <tr key={review.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4 font-semibold text-slate-500">
                    {review.id}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 border border-border rounded-lg overflow-hidden">
                        <AvatarImage src={review.avatar} className="object-cover" />
                        <AvatarFallback className="bg-brand-light text-brand-teal text-xs font-bold">
                          {review.user.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-bold text-foreground text-[14px] leading-tight">{review.user}</div>
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
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-brand-teal" onClick={() => openEditModal(review)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => {}}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 bg-white border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
           <div className="text-[13px] text-muted-foreground font-medium">
             Showing 1 to 6 of 35 reviews
           </div>
           
           <div className="flex items-center gap-2">
             <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-medium text-muted-foreground">Previous</Button>
             <div className="flex items-center gap-1">
               <Button size="sm" className="h-8 w-8 p-0 text-xs font-bold bg-brand-teal text-white">1</Button>
               <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-xs font-medium text-muted-foreground">2</Button>
               <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-xs font-medium text-muted-foreground">3</Button>
               <span className="px-1 text-muted-foreground">...</span>
               <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-xs font-medium text-muted-foreground">35</Button>
             </div>
             <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-medium text-muted-foreground">Next</Button>
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
                  <label className="text-sm font-semibold text-foreground">Employee</label>
                  <div className="flex items-center gap-2 p-2 px-3 border border-border rounded-md bg-gray-50/50">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={selectedReview.avatar} />
                      <AvatarFallback>{selectedReview.user[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-muted-foreground">{selectedReview.user}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Department</label>
                  <Input defaultValue={selectedReview.department} className="bg-gray-50 text-muted-foreground" readOnly />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Rating</label>
                <RatingStars rating={selectedReview.rating} interactive={true} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Summary</label>
                <Textarea 
                  defaultValue={selectedReview.summary}
                  className="h-32 resize-none bg-white"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 mt-4">
            <Button variant="outline" className="px-8" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button className="bg-brand-teal hover:bg-brand-teal-light text-white font-semibold px-8" onClick={() => setEditModalOpen(false)}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
