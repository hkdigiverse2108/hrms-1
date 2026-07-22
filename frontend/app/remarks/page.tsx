"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Star,
  StarHalf,
  Loader2,
  History,
  Check
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { API_URL } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/common/PageHeader";
import { ActivityLogDialog } from "@/components/common/ActivityLogDialog";
import { TablePagination } from "@/components/common/TablePagination";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import { useConfirm } from "@/context/ConfirmContext";

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
  const { confirm } = useConfirm();
  const [reviews, setReviews] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [newRating, setNewRating] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState("remarks");
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [selectedReviewForLogs, setSelectedReviewForLogs] = useState<any>(null);

  const openLogsModal = (review: any) => {
    if (!isAdmin) return;
    setSelectedReviewForLogs(review);
    setLogsDialogOpen(true);
  };
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);
  
  const { user } = useUser();
  const router = useRouter();
  const { checkPermission, isAdmin, loading: permissionsLoading } = usePermissions();

  const canViewReviews = true;
  const canAddReviews = true;
  const canEditReviews = isAdmin || checkPermission('review', 'canEdit');
  const canDeleteReviews = isAdmin || checkPermission('review', 'canDelete');

  useEffect(() => {
    if (!permissionsLoading) {
      if (!canViewReviews) {
        router.push('/');
      }
    }
  }, [permissionsLoading, canViewReviews, router]);
  
  // New review form state
  const [newReview, setNewReview] = useState({
    employeeId: "",
    summary: "",
    rating: 0
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sysSettings, setSysSettings] = useState<any>(null);
  
  const [createQueryModalOpen, setCreateQueryModalOpen] = useState(false);
  const [newQueryText, setNewQueryText] = useState("");
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    if (user !== undefined) {
      fetchData();
    }
    if (user && !isAdmin) {
      setNewReview(prev => ({
        ...prev,
        employeeId: user.id || user._id || ""
      }));
    }
  }, [user, isAdmin]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const employeeIdParam = (!isAdmin && user) ? `?employeeId=${user.id || user._id || ''}` : '';
      const [revRes, empRes, settingsRes] = await Promise.all([
        fetch(`${API_URL}/reviews${employeeIdParam}`),
        fetch(`${API_URL}/employees`),
        fetch(`${API_URL}/system-settings`)
      ]);
      if (revRes.ok) setReviews(await revRes.json());
      if (empRes.ok) setEmployees(await empRes.json());
      if (settingsRes.ok) setSysSettings(await settingsRes.json());
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
      const storedUser = localStorage.getItem('user');
      const currentUser = storedUser ? JSON.parse(storedUser) : null;
      const currentUserName = currentUser?.name || (currentUser?.firstName ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim() : null) || "Unknown User";

      let payload;
      if (!isAdmin && user) {
        payload = {
          employeeId: user.id || user._id || "",
          employeeName: user.name || "Unknown",
          role: user.designation || "Staff",
          avatar: user.profilePhoto || "",
          department: user.department || "N/A",
          summary: newReview.summary,
          rating: newReview.rating,
          updatedBy: currentUserName
        };
      } else {
        const emp = employees.find(e => e.id === newReview.employeeId || e.employeeId === newReview.employeeId);
        payload = {
          ...newReview,
          employeeName: emp?.name || "Unknown",
          role: emp?.designation || "Staff",
          avatar: emp?.profilePhoto || "",
          department: emp?.department || "N/A",
          updatedBy: currentUserName
        };
      }

      const res = await fetch(`${API_URL}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setCreateModalOpen(false);
        setNewReview({ employeeId: (!isAdmin && user) ? (user.id || user._id || "") : "", summary: "", rating: 0 });
        setNewRating(0);
        fetchData();
      }
    } catch (err) {
      console.error("Error creating review:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateQuery = async () => {
    if (!newQueryText.trim()) return;
    setIsSubmitting(true);
    try {
      const storedUser = localStorage.getItem('user');
      const currentUser = storedUser ? JSON.parse(storedUser) : null;
      const currentUserName = currentUser?.name || (currentUser?.firstName ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim() : null) || "Unknown User";

      const payload = {
        employeeId: user?.id || user?._id || "",
        employeeName: user?.name || "Unknown",
        role: user?.designation || "Staff",
        avatar: user?.profilePhoto || "",
        department: user?.department || "N/A",
        summary: "Employee Query",
        rating: 0,
        query: newQueryText,
        updatedBy: currentUserName
      };

      const res = await fetch(`${API_URL}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setCreateQueryModalOpen(false);
        setNewQueryText("");
        fetchData();
      }
    } catch (err) {
      console.error("Error creating query:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateReview = async () => {
    if (!selectedReview) return;
    
    setIsSubmitting(true);
    try {
      const storedUser = localStorage.getItem('user');
      const currentUser = storedUser ? JSON.parse(storedUser) : null;
      const currentUserName = currentUser?.name || (currentUser?.firstName ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim() : null) || "Unknown User";

      const res = await fetch(`${API_URL}/reviews/${selectedReview.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: selectedReview.summary,
          rating: selectedReview.rating,
          query: selectedReview.query,
          adminReply: selectedReview.adminReply,
          replies: selectedReview.replies,
          isApproved: selectedReview.isApproved,
          updatedBy: currentUserName
        })
      });

      if (res.ok) {
        setEditModalOpen(false);
        setReplyText("");
        fetchData();
      }
    } catch (err) {
      console.error("Error updating review:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInstantReplyOrApprove = async (newReply?: any, isApproved?: boolean) => {
    if (!selectedReview) return;
    setIsSubmitting(true);
    try {
      const storedUser = localStorage.getItem('user');
      const currentUser = storedUser ? JSON.parse(storedUser) : null;
      const currentUserName = currentUser?.name || (currentUser?.firstName ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim() : null) || "Unknown User";

      const updatedReplies = newReply ? [...(selectedReview.replies || []), newReply] : selectedReview.replies;
      const updatedApproval = isApproved !== undefined ? isApproved : selectedReview.isApproved;

      const res = await fetch(`${API_URL}/reviews/${selectedReview.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: selectedReview.summary,
          rating: selectedReview.rating,
          query: selectedReview.query,
          adminReply: selectedReview.adminReply,
          replies: updatedReplies,
          isApproved: updatedApproval,
          updatedBy: currentUserName
        })
      });

      if (res.ok) {
        setSelectedReview((prev: any) => ({
          ...prev,
          replies: updatedReplies,
          isApproved: updatedApproval
        }));
        setReplyText("");
        fetchData();
      }
    } catch (err) {
      console.error("Error instant saving:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async (id: string) => {
    const isConfirmed = await confirm({
      title: "Confirm Action",
      message: "Are you sure you want to delete this remark?",
      destructive: true,
      confirmText: "Confirm"
    });
    if (!isConfirmed) return;
    
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

  const filteredReviews = reviews.filter(r => {
    if (!isAdmin && user) {
      const myId = user.id || user._id;
      if (r.employeeId !== myId) return false;
    }

    if (activeTab === "remarks" && r.summary === "Employee Query") return false;
    if (activeTab === "queries" && r.summary !== "Employee Query") return false;

    return (
      r.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.department?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const paginatedReviews = filteredReviews.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader 
        title="Employee Remarks" 
        description="Remark records with department, summary, rating, timestamps, and quick actions."
      >
        {canAddReviews && (
          <div className="flex items-center gap-2 mt-4 sm:mt-0 w-full sm:w-auto">
            {!isAdmin && (
              <Dialog open={createQueryModalOpen} onOpenChange={setCreateQueryModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="text-brand-teal border-brand-teal hover:bg-brand-teal-light hover:text-white font-medium shadow-sm w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Query
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Add Query</DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">Submit a new query for the admin to review.</p>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">Your Query</label>
                      <Textarea 
                        value={newQueryText}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewQueryText(e.target.value)}
                        placeholder="Type your query here..."
                        className="h-32 resize-none bg-white"
                      />
                    </div>
                  </div>
                  <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 mt-4">
                    <Button variant="outline" className="px-8" onClick={() => setCreateQueryModalOpen(false)}>Cancel</Button>
                    <Button 
                      disabled={isSubmitting || !newQueryText.trim()}
                      className="bg-brand-teal hover:bg-brand-teal-light text-white font-semibold px-8" 
                      onClick={handleCreateQuery}
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Submit Query"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            
            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-brand-teal hover:bg-brand-teal-light text-white font-medium shadow-sm w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  New Remark
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Add New Remark</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">Submit a performance remark and rating for an employee.</p>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Employee</label>
                    {!isAdmin ? (
                      <Input 
                        value={user?.name || ""} 
                        className="bg-gray-50 text-muted-foreground" 
                        readOnly 
                      />
                    ) : (
                      <Select onValueChange={(val: string) => setNewReview(prev => ({ ...prev, employeeId: val }))} value={newReview.employeeId}>
                        <SelectTrigger className="w-full bg-white shadow-sm border-border">
                          <SelectValue placeholder="Select employee..." />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map(emp => (
                            <SelectItem key={emp.id} value={emp.id || emp.employeeId}>{emp.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Department</label>
                    <Input 
                      value={
                        !isAdmin 
                          ? (user?.department || "Staff") 
                          : (employees.find(e => e.id === newReview.employeeId || e.employeeId === newReview.employeeId)?.department || "")
                      } 
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
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewReview(prev => ({ ...prev, summary: e.target.value }))}
                    placeholder="Write detailed remarks here..." 
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
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Submit Remark"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        )}
      </PageHeader>

      {/* Main Table Container */}
      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 sm:p-6 border-b border-border bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setCurrentPage(1); }} className="w-full sm:w-auto">
            <TabsList className="inline-flex items-center gap-1 w-max bg-slate-100/70 p-1 rounded-xl shadow-inner border border-slate-200/60 h-auto justify-start shrink-0">
              <TabsTrigger value="remarks" className="data-[state=active]:bg-white data-[state=active]:text-brand-teal data-[state=active]:shadow-sm data-[state=active]:border-slate-200/50 px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap hover:bg-slate-200/50 border border-transparent h-auto">Remarks</TabsTrigger>
              <TabsTrigger value="queries" className="data-[state=active]:bg-white data-[state=active]:text-brand-teal data-[state=active]:shadow-sm data-[state=active]:border-slate-200/50 px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap hover:bg-slate-200/50 border border-transparent h-auto">Queries</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative w-full sm:w-[350px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
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
                {activeTab === "remarks" && <th className="px-6 py-4">Remarks</th>}
                {activeTab === "remarks" && <th className="px-6 py-4">Rating</th>}
                {activeTab === "queries" && <th className="px-6 py-4">Query & Reply</th>}
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-teal" />
                    <p className="text-sm text-muted-foreground mt-2">Loading remarks...</p>
                  </td>
                </tr>
              ) : filteredReviews.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                    No remarks found.
                  </td>
                </tr>
              ) : (
                paginatedReviews.map((review, idx) => {
                  const isQuery = review.summary === "Employee Query" || review.query;
                  const shouldHideNames = isAdmin && sysSettings && sysSettings.showNamesInRemarksToAdmin === false && !isQuery;
                  const displayName = shouldHideNames ? "Anonymous" : review.employeeName;
                  const displayRole = shouldHideNames ? "Employee" : review.role;
                  const displayAvatarFallback = shouldHideNames ? "A" : review.employeeName?.split(' ').map((n:any) => n[0]).join('');
                  const displayAvatarSrc = shouldHideNames ? "" : review.avatar;

                  return (
                    <tr key={review.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4 font-semibold text-slate-500">
                        {((currentPage - 1) * itemsPerPage + idx + 1).toString().padStart(2, '0')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10 border border-border rounded-lg overflow-hidden">
                            <AvatarImage src={displayAvatarSrc} className="object-cover" />
                            <AvatarFallback className="bg-brand-light text-brand-teal text-xs font-bold">
                              {displayAvatarFallback}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-bold text-foreground text-[14px] leading-tight">{displayName}</div>
                            <div className="text-[12px] text-muted-foreground font-medium mt-0.5">{displayRole}</div>
                          </div>
                        </div>
                      </td>
                    <td className="px-6 py-4 font-medium text-slate-600">
                      {review.department}
                    </td>
                    {activeTab === "remarks" && (
                      <td className="px-6 py-4 max-w-[300px]" title={review.summary}>
                        <div className="text-[13px] text-slate-600 leading-relaxed whitespace-normal line-clamp-2">
                          {review.summary}
                        </div>
                      </td>
                    )}
                    {activeTab === "remarks" && (
                      <td className="px-6 py-4">
                        <RatingStars rating={review.rating} />
                      </td>
                    )}
                    {activeTab === "queries" && (
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {review.isApproved ? (
                            <Badge className="bg-green-500 text-white text-[10px] h-5 px-1.5 border-none uppercase font-bold tracking-wider"><Check className="w-2.5 h-2.5 mr-0.5"/> Approved</Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 text-[10px] h-5 px-1.5 font-bold uppercase tracking-wider">Pending</Badge>
                          )}
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isAdmin && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-brand-teal" 
                            onClick={() => openLogsModal(review)}
                            title="View History"
                          >
                            <History className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {(canEditReviews || (!isAdmin && user && review.employeeId === (user.id || user._id))) && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-brand-teal" onClick={() => openEditModal(review)} title={canEditReviews ? "Edit Review" : "Add/Edit Query"}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {canDeleteReviews && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => handleDeleteReview(review.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        <TablePagination 
          totalItems={filteredReviews.length} 
          itemsPerPage={itemsPerPage} 
          currentPage={currentPage} 
          onPageChange={setCurrentPage} 
          onItemsPerPageChange={(v) => { setItemsPerPage(v); setCurrentPage(1); }}
          itemName="remarks" 
        />
      </div>

      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Remark</DialogTitle>
          </DialogHeader>
          
          {selectedReview && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              
              {selectedReview.summary !== "Employee Query" && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Rating</label>
                    <RatingStars 
                      rating={selectedReview.rating} 
                      interactive={isAdmin || checkPermission('review', 'canEdit')} 
                      onRatingChange={(val) => setSelectedReview((prev: any) => ({ ...prev, rating: val }))} 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Summary</label>
                    <Textarea 
                      value={selectedReview.summary}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSelectedReview((prev: any) => ({ ...prev, summary: e.target.value }))}
                      className="h-24 resize-none bg-white"
                      disabled={!isAdmin && !checkPermission('review', 'canEdit')}
                    />
                  </div>
                </>
              )}

              {(selectedReview.summary === "Employee Query" || selectedReview.query) && (
                <div className="col-span-1 sm:col-span-2 space-y-4 border rounded-lg p-4 bg-slate-50">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-slate-800">Query Thread</h3>
                    {selectedReview.isApproved ? (
                      <Badge className="bg-green-500 text-white border-none font-bold uppercase tracking-wider flex items-center gap-0.5"><Check className="w-3 h-3"/> Approved</Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Pending</Badge>
                    )}
                  </div>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {selectedReview.query && (
                      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-900">{selectedReview.employeeName} (Initial Query)</span>
                          <span className="text-[10px] text-slate-400">{selectedReview.date || "Unknown Date"}</span>
                        </div>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedReview.query}</p>
                      </div>
                    )}
                    
                    {selectedReview.adminReply && (
                      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm ml-6">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-900">Admin Reply</span>
                        </div>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedReview.adminReply}</p>
                      </div>
                    )}

                    {selectedReview.replies?.map((reply: any, idx: number) => (
                      <div key={idx} className={`bg-white border border-slate-200 rounded-lg p-3 shadow-sm ${reply.sender === 'Admin' ? 'ml-6 border-l-4 border-l-brand-teal' : 'mr-6 border-l-4 border-l-amber-500'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-900">{reply.senderName || reply.sender}</span>
                          <span className="text-[10px] text-slate-400">{reply.timestamp ? new Date(reply.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                        </div>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{reply.text}</p>
                      </div>
                    ))}
                  </div>

                  {!selectedReview.isApproved && (
                    <div className="pt-2 border-t border-slate-200 space-y-3">
                      <div className="flex gap-2">
                        <Textarea 
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Type a reply..."
                          className="min-h-[40px] h-[40px] resize-none"
                        />
                        <Button 
                          onClick={() => {
                            if (!replyText.trim()) return;
                            const newReply = {
                              text: replyText,
                              sender: isAdmin ? 'Admin' : 'Employee',
                              senderName: user?.name || (isAdmin ? "Admin" : "Employee"),
                              timestamp: new Date().toISOString()
                            };
                            handleInstantReplyOrApprove(newReply, undefined);
                          }}
                          className="bg-brand-teal hover:bg-brand-teal-light text-white shrink-0"
                          disabled={!replyText.trim() || isSubmitting}
                        >
                          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
                        </Button>
                      </div>
                      
                      {!isAdmin && user && (user.id === selectedReview.employeeId || user._id === selectedReview.employeeId) && (
                        <div className="flex justify-end">
                          <Button 
                            variant="outline"
                            className="text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => handleInstantReplyOrApprove(undefined, true)}
                            disabled={isSubmitting}
                          >
                            <Check className="w-4 h-4 mr-2" /> Mark as Approved
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
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

      {/* Logs Dialog */}
      <ActivityLogDialog
        open={logsDialogOpen}
        onOpenChange={setLogsDialogOpen}
        title="Remark Activity History"
        subtitle={selectedReviewForLogs?.employeeName ? `Remark history for ${selectedReviewForLogs.employeeName}` : undefined}
        logs={(() => {
          const allLogs: any[] = [];
          
          // Prepend synthetic creation log if there is no explicit creation log in the array
          const hasCreationLog = selectedReviewForLogs?.logs?.some((l: any) => l.action?.toLowerCase().includes('create'));
          if (selectedReviewForLogs?.date && !hasCreationLog) {
            allLogs.push({
              timestamp: new Date(selectedReviewForLogs.date).toISOString(),
              action: "Remark created",
              details: `Remark created. Summary: '${selectedReviewForLogs.summary}', Rating: ${selectedReviewForLogs.rating} stars`,
              userName: "System"
            });
          }

          if (selectedReviewForLogs?.logs) {
            allLogs.push(...selectedReviewForLogs.logs);
          }
          return allLogs.sort((a, b) => {
            const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return timeB - timeA;
          });
        })()}
      />
    </div>
  );
}
