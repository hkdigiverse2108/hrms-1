"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Plus, Loader2, Link as LinkIcon, BookOpen, Trash2, Edit2, History, ExternalLink } from "lucide-react";
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
import { SearchableSelect } from "@/components/ui/searchable-select";
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

  // Links Popup State
  const [linksModalOpen, setLinksModalOpen] = useState(false);
  const [selectedReferences, setSelectedReferences] = useState<{ concept: string; link: string }[]>([]);
  const [selectedResearchLinksTitle, setSelectedResearchLinksTitle] = useState("");

  const openLinksModal = (research: any) => {
    let refs = [];
    if (research.references && research.references.length > 0) {
      refs = research.references;
    } else if (research.link) {
      refs = [{ concept: "Reference", link: research.link }];
    }
    setSelectedReferences(refs);
    setSelectedResearchLinksTitle(research.title || "Research");
    setLinksModalOpen(true);
  };
  
  // Filter State
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  
  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [references, setReferences] = useState<{ concept: string; link: string }[]>([{ concept: "", link: "" }]);
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
      const roleParam = user?.role || "";
      const res = await fetch(`${API_URL}/research-page-data?userId=${user?.id || user?._id || ''}&role=${roleParam}`, { cache: 'no-store' });

      if (res.ok) {
        const data = await res.json();
        setResearchList(data.research || []);
        setEmployees(data.employees || []);
        setProjects(data.projects || []);
        
        if (data.attendanceStatus) {
          const serverDateStr = res.headers.get("Date");
          if (serverDateStr) {
             setServerTimeOffset(new Date(serverDateStr).getTime() - Date.now());
          }
          setAttendanceStatus(data.attendanceStatus);
        }
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
      if (research.references && research.references.length > 0) {
        setReferences(research.references);
      } else if (research.link) {
        setReferences([{ concept: "Reference", link: research.link }]);
      } else {
        setReferences([{ concept: "", link: "" }]);
      }
      setSharedWith(research.sharedWith || []);
      setProjectId(research.projectId || "");
    } else {
      setEditingResearch(null);
      setTitle("");
      setDescription("");
      setLink("");
      setReferences([{ concept: "", link: "" }]);
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
      const validReferences = references.filter(r => r.concept.trim() !== "" || r.link.trim() !== "");
      const payload = {
        title,
        description,
        link: validReferences[0]?.link || link,
        references: validReferences,
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
            <SearchableSelect
              options={[
                { value: "all", label: "All Employees" },
                ...employees.map(emp => ({
                  value: emp.id || emp._id,
                  label: formatName(`${emp.firstName} ${emp.lastName}`)
                }))
              ]}
              value={filterEmployee}
              onValueChange={setFilterEmployee}
              placeholder="All Employees"
              triggerClassName="w-[170px] bg-white border-slate-200 text-sm"
            />
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
                  <TableHead className="text-slate-600 font-semibold h-11">Concept & Links</TableHead>
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
                        {(() => {
                          const refCount = research.references?.length || (research.link ? 1 : 0);
                          if (refCount === 0) {
                            return <span className="text-[11px] text-slate-400 italic">No links</span>;
                          }
                          return (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openLinksModal(research)}
                              className="h-8 px-3 text-[12px] font-bold text-brand-teal border-brand-teal/20 bg-brand-teal/10 hover:bg-brand-teal hover:text-white transition-all shadow-sm flex items-center gap-1.5 rounded-lg group/btn"
                            >
                              <LinkIcon className="w-3.5 h-3.5 text-brand-teal group-hover/btn:text-white transition-colors" />
                              <span>Links</span>
                              {refCount > 1 && <span className="text-[10px] px-1.5 py-0.5 bg-brand-teal/20 group-hover/btn:bg-white/20 rounded-full font-extrabold">{refCount}</span>}
                            </Button>
                          );
                        })()}
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
            <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-slate-200 shadow-inner">
              <div className="flex items-center justify-between pb-1">
                <div>
                  <Label className="text-slate-800 font-bold text-xs">Concept & Reference Links</Label>
                  <p className="text-[11px] text-slate-500">Add multiple concepts and test redirection for their attached reference links.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setReferences([...references, { concept: "", link: "" }])}
                  className="h-7 px-2.5 text-xs font-bold text-brand-teal border-brand-teal/20 bg-brand-teal/10 hover:bg-brand-teal hover:text-white transition-all shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Another
                </Button>
              </div>

              <div className="space-y-1.5 max-h-[260px] overflow-y-auto overflow-x-hidden pr-1">
                {references.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 bg-white p-1.5 px-2.5 rounded-lg border border-slate-200/80 shadow-sm transition-all hover:border-brand-teal/30 overflow-hidden">
                    <div className="w-1/3 min-w-0 shrink-0">
                      <Input
                        value={item.concept}
                        onChange={(e) => {
                          const newRefs = [...references];
                          newRefs[index].concept = e.target.value;
                          setReferences(newRefs);
                        }}
                        placeholder="Concept Name"
                        className="h-8 text-xs font-medium bg-slate-50/50 focus:bg-white w-full"
                      />
                    </div>
                    <div className="flex-1 flex items-center gap-1.5 min-w-0">
                      <Input
                        value={item.link}
                        onChange={(e) => {
                          const newRefs = [...references];
                          newRefs[index].link = e.target.value;
                          setReferences(newRefs);
                        }}
                        placeholder="https://example.com/doc..."
                        className="h-8 text-xs flex-1 font-medium bg-slate-50/50 focus:bg-white min-w-0"
                      />
                      <button
                        type="button"
                        disabled={!item.link.trim()}
                        onClick={() => {
                          const url = item.link.startsWith("http") ? item.link : `https://${item.link}`;
                          window.open(url, "_blank", "noopener,noreferrer");
                        }}
                        className={`p-1.5 rounded border transition-all shrink-0 ${
                          item.link.trim() 
                            ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-600 hover:text-white cursor-pointer" 
                            : "bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed"
                        }`}
                        title="Redirect / Open Link in New Tab"
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      </button>
                      {references.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setReferences(references.filter((_, i) => i !== index))}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded transition-colors shrink-0"
                          title="Remove Row"
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
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

      <Dialog open={linksModalOpen} onOpenChange={setLinksModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="text-brand-dark-blue flex items-center gap-2 text-lg font-bold">
              <LinkIcon className="w-5 h-5 text-brand-teal shrink-0" />
              <span>Concept & Reference Links</span>
            </DialogTitle>
            <p className="text-sm text-slate-500">Attached references for: <span className="font-bold text-slate-800">{selectedResearchLinksTitle}</span></p>
          </DialogHeader>
          <div className="pt-2 space-y-3">
            {selectedReferences.length > 0 ? (
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 bg-slate-50/90 px-4 py-2 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <div className="w-1/3 shrink-0">Concept / Subject</div>
                  <div className="flex-1 min-w-0">Reference Link (URL)</div>
                  <div className="w-10 text-right shrink-0">Open</div>
                </div>
                <div className="divide-y divide-slate-100 max-h-[55vh] overflow-y-auto overflow-x-hidden">
                  {selectedReferences.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 px-4 py-2 hover:bg-brand-teal/[0.03] transition-colors group">
                      <div className="w-1/3 shrink-0">
                        <span className="text-xs font-bold text-slate-800 block truncate" title={item.concept || "General Reference"}>
                          {item.concept || "General Reference"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 flex items-center">
                        <span className="text-xs font-medium text-slate-600 font-mono block truncate select-all" title={item.link}>
                          {item.link || "No link specified"}
                        </span>
                      </div>
                      <div className="w-10 text-right shrink-0 flex justify-end">
                        <button
                          type="button"
                          disabled={!item.link}
                          onClick={() => {
                            if (item.link) {
                              const url = item.link.startsWith("http") ? item.link : `https://${item.link}`;
                              window.open(url, "_blank", "noopener,noreferrer");
                            }
                          }}
                          className={`p-1.5 rounded-lg border transition-all ${
                            item.link
                              ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-600 hover:text-white cursor-pointer shadow-sm active:scale-95"
                              : "bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed"
                          }`}
                          title="Redirect / Open Link in New Tab"
                        >
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-center py-8">No links or concepts added for this research.</p>
            )}
            <div className="flex justify-end pt-1 border-t border-slate-100">
              <Button variant="outline" onClick={() => setLinksModalOpen(false)} className="px-6 font-semibold">Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
