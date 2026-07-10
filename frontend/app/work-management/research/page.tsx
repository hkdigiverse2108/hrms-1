"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Plus, Loader2, Link as LinkIcon, BookOpen, Trash2, Edit2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { API_URL } from "@/lib/config";
import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import { useConfirm } from "@/context/ConfirmContext";
import { toast } from "sonner";
import { MultiSelect } from "@/components/ui/multi-select";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LiveTimer } from "@/components/common/LiveTimer";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function ResearchPage() {
  const { confirm } = useConfirm();
  const { user } = useUser();
  const router = useRouter();
  const { checkPermission, isAdmin, loading: permissionsLoading } = usePermissions();

  const canView = isAdmin || checkPermission('research', 'canView');
  const canAdd = isAdmin || checkPermission('research', 'canAdd');
  const canEdit = isAdmin || checkPermission('research', 'canEdit');
  const canDelete = isAdmin || checkPermission('research', 'canDelete');

  const [researchList, setResearchList] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingResearch, setEditingResearch] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  
  // Logs State
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState<any[]>([]);
  const [selectedResearchTitle, setSelectedResearchTitle] = useState("");
  const [serverTimeOffset, setServerTimeOffset] = useState(0);
  
  // Filter State
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  
  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [sharedWith, setSharedWith] = useState<string[]>([]);
  const [projectId, setProjectId] = useState("");
  const [attendanceStatus, setAttendanceStatus] = useState<any>(null);

  const formatName = (fullName: string) => {
    if (!fullName) return "";
    const parts = fullName.trim().split(' ');
    if (parts.length <= 2) return fullName;
    return `${parts[0]} ${parts[parts.length - 1]}`;
  };

  useEffect(() => {
    if (permissionsLoading) return;
    if (!canView && !isAdmin) {
      router.push("/");
    }
  }, [permissionsLoading, canView, isAdmin, router]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [resData, empData, projData, attData] = await Promise.all([
        fetch(`${API_URL}/research`, {
          headers: {
            "user-id": (user?.id || user?._id) || "",
            "role": user?.role || "",
          }
        }),
        fetch(`${API_URL}/employees`),
        fetch(`${API_URL}/projects`),
        fetch(`${API_URL}/attendance/status/${user?.id || user?._id}`)
      ]);

      if (resData.ok) {
        setResearchList(await resData.json());
      }
      if (empData.ok) {
        setEmployees(await empData.json());
      }
      if (projData.ok) {
        let allProjects = await projData.json();
        if (!isAdmin && user?.department) {
          allProjects = allProjects.filter((p: any) => p.department === user.department);
        }
        setProjects(allProjects);
      }
      if (attData.ok) {
        const serverDateStr = attData.headers.get("Date");
        if (serverDateStr) {
           setServerTimeOffset(new Date(serverDateStr).getTime() - Date.now());
        }
        setAttendanceStatus(await attData.json());
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch research data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if ((user?.id || user?._id)) fetchData();
  }, [user]);

  const handleOpenModal = (research: any = null) => {
    if (research) {
      setEditingResearch(research);
      setTitle(research.title || "");
      setDescription(research.description || "");
      setLink(research.link || "");
      setSharedWith(research.sharedWith || []);
      setProjectId(research.projectId || "");
    } else {
      setEditingResearch(null);
      setTitle("");
      setDescription("");
      setLink("");
      setSharedWith([]);
      setProjectId("");
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please fill in the title");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title,
        description,
        link,
        sharedWith,
        projectId,
        ...(editingResearch ? {
          updatedBy: (user?.id || user?._id),
          updatedByName: `${user?.firstName} ${user?.lastName}`
        } : {
          createdBy: (user?.id || user?._id),
          createdByName: `${user?.firstName} ${user?.lastName}`
        })
      };

      const url = editingResearch ? `${API_URL}/research/${editingResearch.id}` : `${API_URL}/research`;
      const method = editingResearch ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to save research");

      toast.success(editingResearch ? "Research updated" : "Research created");
      setModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error("Failed to save research");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: "Delete Research",
      message: "Are you sure you want to delete this research? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      destructive: true
    });

    if (!confirmed) return;

    try {
      const res = await fetch(`${API_URL}/research/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Research deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete research");
    }
  };

  const getEmployeeName = (id: string) => {
    const emp = employees.find(e => (e.id || e._id) === id);
    return emp ? `${emp.firstName} ${emp.lastName}` : id;
  };

  if (permissionsLoading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
      </div>
    );
  }

  const employeeOptions = employees.map(emp => ({
    label: `${emp.firstName} ${emp.lastName}`,
    value: emp.id || emp._id
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Research"
        description="Manage and share research documents and links"
      >
        <div className="flex items-center gap-3 flex-wrap">
          {isAdmin && (
            <Select value={filterEmployee} onValueChange={setFilterEmployee}>
              <SelectTrigger className="w-[170px] bg-white border-slate-200 text-sm">
                <SelectValue placeholder="All Employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map(emp => (
                  <SelectItem key={emp.id || emp._id} value={emp.id || emp._id}>
                    {formatName(`${emp.firstName} ${emp.lastName}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-[160px] bg-white border-slate-200 text-slate-600 text-sm"
          />
          {(filterEmployee !== 'all' || filterDate) && (
            <Button
              variant="ghost"
              onClick={() => { setFilterEmployee('all'); setFilterDate(''); }}
              className="text-slate-400 hover:text-brand-teal hover:bg-brand-teal/10 text-sm"
            >
              Clear
            </Button>
          )}
          {canAdd && (
            <Button onClick={() => handleOpenModal()} className="bg-brand-teal hover:bg-brand-teal/90">
              <Plus className="w-4 h-4 mr-2" />
              Add Research
            </Button>
          )}
        </div>
      </PageHeader>


      {researchList.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-slate-500 bg-white/50 backdrop-blur border-dashed border-2 border-slate-200 shadow-sm rounded-2xl">
          <div className="p-4 bg-brand-teal/10 rounded-full mb-4">
            <BookOpen className="w-10 h-10 text-brand-teal" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-1">No research found</h3>
          <p className="text-sm text-slate-500 mb-4">You haven't added any research documents yet.</p>
          {canAdd && <Button onClick={() => handleOpenModal()} className="bg-brand-teal hover:bg-brand-teal/90 shadow-md hover:shadow-lg transition-all">Add your first research</Button>}
        </Card>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 border-b border-slate-200">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[30%] text-slate-600 font-semibold h-11">Research Details</TableHead>
                  <TableHead className="text-slate-600 font-semibold h-11">Date</TableHead>
                  <TableHead className="text-slate-600 font-semibold h-11">Created By</TableHead>
                  <TableHead className="text-slate-600 font-semibold h-11">Shared With</TableHead>
                  <TableHead className="text-slate-600 font-semibold h-11">Link</TableHead>
                  <TableHead className="text-right text-slate-600 font-semibold h-11 pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const filteredResearchList = researchList.filter(r => {
                    let matchesEmp = true;
                    if (filterEmployee !== 'all') {
                      matchesEmp = r.createdBy === filterEmployee;
                    }
                    let matchesDate = true;
                    if (filterDate) {
                      const rDate = new Date(r.createdAt).toISOString().split('T')[0];
                      matchesDate = rDate === filterDate;
                    }
                    return matchesEmp && matchesDate;
                  });

                  if (filteredResearchList.length === 0) {
                    return (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                          No research found matching your filters.
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return filteredResearchList.map((research) => {
                    const currentUserId = user?.id || user?._id;
                    const isCreator = research.createdBy === currentUserId;
                    const isShared = research.sharedWith?.includes(currentUserId);
                    const canUserEdit = canEdit && (isAdmin || isCreator || isShared);
                    const canUserDelete = canDelete && (isAdmin || isCreator);
                    const lastUpdate = research.logs?.slice().reverse().find((l: any) => l.action === 'Updated');

                  return (
                    <TableRow key={research.id} className="group hover:bg-slate-50/50 transition-colors">
                      <TableCell className="align-top py-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 p-1.5 rounded-lg bg-brand-teal/10 text-brand-teal shrink-0">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-slate-800 text-[13px] leading-tight line-clamp-1">{research.title}</p>
                              {attendanceStatus?.isPunchedIn && attendanceStatus?.record?.punchInActivityType === 'Research' && attendanceStatus?.record?.punchInActivityValue === research.title && (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-50 border border-green-100">
                                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                  <LiveTimer startTime={attendanceStatus.record.lastPunchIn} serverTimeOffset={serverTimeOffset} />
                                </div>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 line-clamp-1 leading-relaxed mb-2 max-w-[300px]" title={research.description}>{research.description}</p>
                            {research.projectId && projects.find(p => p.id === research.projectId) && (
                              <Badge variant="outline" className="text-[9px] font-medium text-brand-teal border-brand-teal/20 bg-brand-teal/5 py-0 px-1.5">
                                {projects.find(p => p.id === research.projectId)?.title}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="align-top py-4">
                        <span className="text-[12px] font-medium text-slate-600">
                          {new Date(research.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </TableCell>
                      <TableCell className="align-top py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[12px] font-medium text-slate-700">{formatName(research.createdByName)}</span>
                          {lastUpdate && (
                            <span className="text-[10px] text-amber-600 italic mt-1 leading-tight flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-amber-500" />
                              Edited by {formatName(lastUpdate.byUserName)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="align-top py-4">
                        {research.sharedWith && research.sharedWith.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {research.sharedWith.map((id: string) => (
                              <span key={id} className="text-[10px] bg-slate-100 border border-slate-200/60 text-slate-600 py-0.5 px-1.5 rounded font-medium">
                                {formatName(getEmployeeName(id))}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">None</span>
                        )}
                      </TableCell>
                      <TableCell className="align-top py-4">
                        {research.link ? (
                          <a 
                            href={research.link.startsWith('http') ? research.link : `https://${research.link}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-brand-teal hover:underline bg-brand-teal/5 hover:bg-brand-teal/10 px-2.5 py-1 rounded border border-brand-teal/10 transition-colors max-w-[150px]"
                          >
                            <LinkIcon className="w-3 h-3 shrink-0 text-brand-teal/70" />
                            <span className="truncate">{research.link.replace(/^https?:\/\//, '')}</span>
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No link</span>
                        )}
                      </TableCell>
                      <TableCell className="align-top py-4 text-right pr-4">
                        <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-brand-teal hover:bg-brand-teal/10 rounded" onClick={() => {
                            setSelectedLogs(research.logs ? [...research.logs].reverse() : []);
                            setSelectedResearchTitle(research.title);
                            setLogsModalOpen(true);
                          }}>
                            <History className="w-3.5 h-3.5" />
                          </Button>
                          {(canUserEdit || canUserDelete) && (
                            <>
                              {canUserEdit && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-brand-teal hover:bg-brand-teal/10 rounded" onClick={() => handleOpenModal(research)}>
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              {canUserDelete && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded" onClick={() => handleDelete(research.id)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                  });
                })()}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingResearch ? "Edit Research" : "Add Research"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title <span className="text-red-500">*</span></Label>
                <Input 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="E.g., Competitor Analysis Q3"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project (Optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Project</SelectItem>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details about the research..."
                className="min-h-[300px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Link / Reference URL</Label>
              <Input 
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Share With (Employees)</Label>
              <MultiSelect
                options={employeeOptions}
                selected={sharedWith}
                onChange={setSharedWith}
                placeholder="Select employees to share with"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-brand-teal hover:bg-brand-teal/90">
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingResearch ? "Save Changes" : "Create Research"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={logsModalOpen} onOpenChange={setLogsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-brand-dark-blue flex items-center gap-2">
              <History className="w-5 h-5 text-brand-teal" />
              Activity Logs
            </DialogTitle>
            <p className="text-sm text-slate-500">History for: <span className="font-semibold text-slate-700">{selectedResearchTitle}</span></p>
          </DialogHeader>
          <div className="pt-4 max-h-[60vh] overflow-y-auto space-y-3 custom-scrollbar">
            {selectedLogs.length > 0 ? (
              selectedLogs.map((log: any, i: number) => (
                <div key={i} className="flex gap-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="mt-1">
                    <div className="w-2 h-2 rounded-full bg-brand-teal ring-4 ring-brand-teal/10" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-700">
                      <span className="font-semibold">{formatName(log.byUserName)}</span> {log.action.toLowerCase()} this research
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(log.timestamp).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-center py-4">No activity logs found.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
