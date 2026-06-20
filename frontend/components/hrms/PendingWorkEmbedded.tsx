"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, CalendarIcon, ArrowRight, Filter, Search, ClipboardList, X, Check, Edit2, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { API_URL } from '@/lib/config';
import { toast } from 'sonner';

export function PendingWorkEmbedded({ type = "pending-work" }: { type?: "pending-work" | "todays-work" | "upcoming-work" | "completed-work" }) {
  const router = useRouter();
  
  const [entries, setEntries] = useState<any[]>([]);
  const [otherWorkEntries, setOtherWorkEntries] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [clientProjects, setClientProjects] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [filterTaskType, setFilterTaskType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState<string>('');

  const [editingRemarkId, setEditingRemarkId] = useState<string | null>(null);
  const [editingRemarkValue, setEditingRemarkValue] = useState<string>('');
  
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [currentLogs, setCurrentLogs] = useState<any[]>([]);

  const handleOpenLogs = (entry: any) => {
    setCurrentLogs(entry.logs || []);
    setLogsDialogOpen(true);
  };

  const handleSaveRemark = async (id: string, stage: string) => {
    try {
      const storedUser = localStorage.getItem('user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      const userName = user?.name || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : null) || "Unknown User";

      const response = await fetch(`${API_URL}/content-calendar/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remark: editingRemarkValue, updatedBy: userName, remarkStage: stage }),
      });
      if (response.ok) {
        setEntries(entries.map(e => e.id === id ? { ...e, remark: editingRemarkValue, remarkStage: stage } : e));
        setEditingRemarkId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateOtherWorkStatus = async (id: string, newStatus: string) => {
    try {
      const storedUser = localStorage.getItem('user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      const userName = user?.name || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : null) || "Unknown User";

      const response = await fetch(`${API_URL}/other-work/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, updatedBy: userName }),
      });
      if (response.ok) {
        setOtherWorkEntries(otherWorkEntries.map(e => e.id === id ? { ...e, status: newStatus } : e));
        toast.success(`Task marked as ${newStatus}`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const storedUser = localStorage.getItem('user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      
      const [entriesRes, clientsRes, pRes, otherWorkRes] = await Promise.all([
        fetch(`${API_URL}/content-calendar/all`),
        fetch(`${API_URL}/clients`),
        fetch(`${API_URL}/projects${user ? `?userId=${user.id}&role=${user.role}` : ''}`),
        fetch(`${API_URL}/other-work/all`)
      ]);
      
      if (entriesRes.ok && clientsRes.ok) {
        const fetchedEntries = await entriesRes.json();
        const fetchedClients = await clientsRes.json();
        setEntries(fetchedEntries);
        setClients(fetchedClients);
      }
      
      if (otherWorkRes.ok) {
        const fetchedOtherWork = await otherWorkRes.json();
        setOtherWorkEntries(fetchedOtherWork);
      }
      
      if (pRes.ok) {
        const projects = await pRes.json();
        const projectMap: Record<string, any> = {};
        projects.forEach((p: any) => {
          if (p.clientId && p.department === 'Creative') {
            projectMap[p.clientId] = p;
          }
        });
        setClientProjects(projectMap);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  const allPendingTasks = useMemo(() => {
    const tasks: any[] = [];
    const storedUser = localStorage.getItem('user');
    const user = storedUser ? JSON.parse(storedUser) : null;
    const isEmployeeOrIntern = user?.role === "Employee" || user?.role === "Intern";

    entries.forEach(entry => {
      const client = clients.find(c => c.id === entry.clientId);
      const project = clientProjects[entry.clientId];
      if (!project) return; // Only show if active creative project
      
      const clientName = client ? (client.companyName || client.clientName || 'Unknown Client') : 'Unknown Client';
      const projectName = project.title;
      const displayName = `${projectName} (${clientName})`;

      const enrich = (stage: string, deadline: string, type: string) => ({
        ...entry,
        clientDisplayName: displayName,
        clientId: entry.clientId,
        stage,
        deadline,
        type,
        taskName: entry.concept || entry.topic || (entry.postReel ? `${entry.postReel} Content` : `Task for ${entry.postingDate || entry.monthYear || 'Unknown Date'}`)
      });

      const canSeeTask = (stage: string) => {
        if (!isEmployeeOrIntern) return true;
        const uId = user?.id;
        if (!uId) return false;
        
        if (stage === 'Script') return (project.assignedScriptwriterId || client?.assignedScriptwriterId) === uId;
        if (stage === 'Shoot') return (project.assignedShooterId || client?.assignedShooterId) === uId;
        if (stage === 'Editing') return (project.assignedReelEditorId || client?.assignedReelEditorId) === uId || (project.assignedPostDesignerId || client?.assignedPostDesignerId) === uId;
        if (stage === 'Approval') return (project.assignedApproverId || client?.assignedApproverId) === uId;
        if (stage === 'Posting') return (project.assignedPosterId || client?.assignedPosterId) === uId;
        
        return true;
      };

      if (entry.scriptDate && !entry.scriptLink && canSeeTask('Script')) tasks.push(enrich('Script', entry.scriptDate, 'scripts'));
      if (entry.shootDate && !entry.shootLink && canSeeTask('Shoot')) tasks.push(enrich('Shoot', entry.shootDate, 'shoots'));
      if (entry.editingStart && !entry.finalReelLink && canSeeTask('Editing')) tasks.push(enrich('Editing', entry.editingStart, 'edits'));
      if (entry.approval && entry.isApproved !== 'Yes' && canSeeTask('Approval')) tasks.push(enrich('Approval', entry.approval, 'approvals'));
      if (entry.postingDate && entry.status !== 'Posted' && canSeeTask('Posting')) tasks.push(enrich('Posting', entry.postingDate, 'posts'));
    });

    otherWorkEntries.forEach(ow => {
      const uId = user?.id;
      const isAssignee = ow.assigneeId === uId;
      const isAssigner = ow.assignerId === uId;
      
      // Assignee sees it in their today/upcoming/pending until they submit for review
      // Assigner sees it in their pending when it's Ready for Review
      let canSee = false;
      if (ow.status === 'Pending') canSee = isAssignee;
      else if (ow.status === 'Ready for Review') canSee = isAssigner || isAssignee;
      else if (ow.status === 'Approved') canSee = isAssignee || isAssigner; // Show in completed

      if (!isEmployeeOrIntern || canSee) {
        if (type === 'completed-work' ? ow.status === 'Approved' : ow.status !== 'Approved') {
          tasks.push({
            ...ow,
            clientDisplayName: `Assigned by ${ow.assignerName}`,
            clientId: 'other-work',
            stage: ow.status,
            deadline: ow.deadline,
            type: 'other-work',
            taskName: ow.title,
            isOtherWork: true
          });
        }
      }
    });

    // Apply Project Filter
    let filteredTasks = tasks;
    if (filterProject !== 'all') {
      filteredTasks = filteredTasks.filter(t => t.clientId === filterProject);
    }

    // Apply Task Type Filter
    if (filterTaskType !== 'all') {
      if (filterTaskType === 'other-work') {
        filteredTasks = filteredTasks.filter(t => t.isOtherWork);
      } else if (filterTaskType === 'content-calendar') {
        filteredTasks = filteredTasks.filter(t => !t.isOtherWork);
      }
    }

    // Apply Stage Filter
    if (filterStage !== 'all') {
      filteredTasks = filteredTasks.filter(t => t.stage.toLowerCase() === filterStage.toLowerCase());
    }

    // Apply Search Query
    if (searchQuery.trim()) {
      const lowerQ = searchQuery.toLowerCase();
      filteredTasks = filteredTasks.filter(t => 
        t.clientDisplayName.toLowerCase().includes(lowerQ) || 
        t.taskName.toLowerCase().includes(lowerQ) ||
        t.stage.toLowerCase().includes(lowerQ)
      );
    }

    // Apply Date Filter
    if (filterDate) {
      filteredTasks = filteredTasks.filter(t => t.deadline === filterDate);
    }

    // Apply Type Filter
    if (type) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filteredTasks = filteredTasks.filter(t => {
        if (t.isOtherWork) {
          if (type === 'completed-work') return t.status === 'Approved';
          if (type === 'pending-work') return t.status === 'Pending' || t.status === 'Ready for Review';
          const deadlineDate = new Date(t.deadline);
          deadlineDate.setHours(0, 0, 0, 0);
          if (type === 'todays-work') return deadlineDate <= today && t.status === 'Pending';
          if (type === 'upcoming-work') return deadlineDate > today && t.status === 'Pending';
          return true;
        }

        const hasApplicableRemark = t.remark && t.remark.trim() !== '' && (!t.remarkStage || t.stage === t.remarkStage);

        if (type === 'pending-work') {
          return hasApplicableRemark;
        }
        
        if (type === 'completed-work') {
          return false; // For now, only Other Work is shown in completed work
        }
        
        const deadlineDate = new Date(t.deadline);
        deadlineDate.setHours(0, 0, 0, 0);
        
        if (type === 'todays-work') return deadlineDate <= today;
        if (type === 'upcoming-work') return deadlineDate > today;
        return true;
      });
    }

    filteredTasks.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
    return filteredTasks;
  }, [entries, otherWorkEntries, clients, clientProjects, filterProject, filterStage, filterTaskType, searchQuery, filterDate, type]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[calc(100vh-250px)] flex flex-col">
      {/* Filters Bar */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <ClipboardList className="w-5 h-5 text-brand-teal" />
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            {type === 'todays-work' ? "Today's Work" : type === 'upcoming-work' ? 'Upcoming Work' : type === 'completed-work' ? 'Completed Work' : 'Pending Work'}
          </h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-48">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input 
              placeholder="Search tasks..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm bg-white"
            />
          </div>

          <div className="relative w-full sm:w-[160px]">
            <Input 
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="h-9 text-sm bg-white pr-8 text-slate-600"
            />
            {filterDate && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-0 top-0 h-9 w-9 hover:bg-transparent"
                onClick={() => setFilterDate('')}
              >
                <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
              </Button>
            )}
          </div>

          <Select value={filterTaskType} onValueChange={setFilterTaskType}>
            <SelectTrigger className="w-full sm:w-[150px] h-9 text-sm bg-white">
              <SelectValue placeholder="Task Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="content-calendar">Content Calendar</SelectItem>
              <SelectItem value="other-work">Other Work</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStage} onValueChange={setFilterStage}>
            <SelectTrigger className="w-full sm:w-[150px] h-9 text-sm bg-white">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              <SelectItem value="script">Script</SelectItem>
              <SelectItem value="shoot">Shoot</SelectItem>
              <SelectItem value="editing">Editing</SelectItem>
              <SelectItem value="approval">Approval</SelectItem>
              <SelectItem value="posting">Posting</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-full sm:w-[200px] h-9 text-sm bg-white">
              <SelectValue placeholder="Filter by Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {Object.entries(clientProjects).map(([cId, project]) => {
                const client = clients.find(c => c.id === cId);
                const cName = client ? (client.companyName || client.clientName) : '';
                return (
                  <SelectItem key={cId} value={cId}>{project.title} ({cName})</SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>
      {loading ? (
        <div className="flex-1 flex items-center justify-center p-20">
          <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
        </div>
      ) : allPendingTasks.length === 0 ? (
        <div className="text-center py-20 flex-1 flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <Filter className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-medium text-slate-700">No pending work found</h3>
          <p className="text-slate-500 mt-2 text-sm">Try adjusting your filters or search query, or maybe you're just all caught up!</p>
        </div>
      ) : (
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Due Date</th>
                <th className="px-6 py-4 whitespace-nowrap">Client / Project</th>
                <th className="px-6 py-4 whitespace-nowrap">Stage</th>
                <th className="px-6 py-4 whitespace-nowrap">Task Details</th>
                <th className="px-6 py-4 whitespace-nowrap">Remark</th>
                <th className="px-6 py-4 text-right whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allPendingTasks.map((item, idx) => {
                const isOverdue = new Date(item.deadline) < new Date(new Date().setHours(0,0,0,0));
                return (
                  <tr key={`${item.id}-${item.type}-${idx}`} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={isOverdue ? "destructive" : "secondary"} className="text-xs px-2.5 py-1">
                        {item.deadline}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {item.clientDisplayName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="outline" className="text-xs text-brand-teal border-brand-teal/30 bg-brand-teal/5">
                        {item.stage}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{item.taskName}</span>
                        {item.monthYear && (
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {item.monthYear}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-[200px]">
                      {(() => {
                        const isApplicable = !item.remarkStage || item.remarkStage === item.stage;
                        const displayRemark = isApplicable ? item.remark : null;

                        return editingRemarkId === `${item.id}-${item.stage}` ? (
                          <div className="flex items-center gap-1.5 min-w-[150px]">
                            <Input 
                              value={editingRemarkValue}
                              onChange={(e) => setEditingRemarkValue(e.target.value)}
                              className="h-8 text-xs px-2 py-1 w-full focus-visible:ring-brand-teal"
                              autoFocus
                              placeholder="Type reason..."
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRemark(item.id, item.stage);
                                if (e.key === 'Escape') setEditingRemarkId(null);
                              }}
                            />
                            <button onClick={() => handleSaveRemark(item.id, item.stage)} className="text-green-600 hover:bg-green-50 p-1.5 rounded transition-colors" title="Save">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingRemarkId(null)} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded transition-colors" title="Cancel">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div 
                            className="cursor-pointer py-1 px-1 -mx-1 rounded hover:bg-slate-100 truncate flex-1 text-slate-600"
                            onClick={() => {
                              setEditingRemarkId(`${item.id}-${item.stage}`);
                              setEditingRemarkValue(displayRemark || '');
                            }}
                            title={displayRemark || ""}
                          >
                            {displayRemark || "-"}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end items-center gap-2">
                        {item.isOtherWork ? (
                          <>
                            {item.status === 'Pending' && (
                              <Button 
                                size="sm" 
                                className="bg-brand-teal hover:bg-brand-teal/90 text-white text-xs h-7"
                                onClick={() => handleUpdateOtherWorkStatus(item.id, 'Ready for Review')}
                              >
                                Submit for Review
                              </Button>
                            )}
                            {item.status === 'Ready for Review' && (
                              <>
                                <Button 
                                  size="sm" 
                                  className="bg-green-600 hover:bg-green-700 text-white text-xs h-7"
                                  onClick={() => handleUpdateOtherWorkStatus(item.id, 'Approved')}
                                >
                                  Approve
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  className="text-xs h-7"
                                  onClick={() => handleUpdateOtherWorkStatus(item.id, 'Pending')}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                            <Button
                              onClick={() => handleOpenLogs(item)}
                              variant="ghost"
                              size="icon"
                              title="View Logs"
                              className="h-8 w-8 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                            >
                              <History className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              onClick={() => handleOpenLogs(item)}
                              variant="ghost"
                              size="icon"
                              title="View Logs"
                              className="h-8 w-8 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                            >
                              <History className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => router.push(`/work-management/smm/${item.clientId}?highlightTask=${item.id}`)}
                              variant="ghost"
                              size="icon"
                              title="Show in Calendar"
                              className="h-8 w-8 text-brand-teal hover:bg-brand-teal/10 hover:text-brand-teal"
                            >
                              <CalendarIcon className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0 overflow-hidden bg-slate-50">
          <DialogHeader className="px-6 py-4 bg-white border-b border-slate-200">
            <DialogTitle className="text-[22px] font-bold text-slate-900">Task Activity History</DialogTitle>
            <p className="text-sm text-slate-500">Log of all modifications to this task</p>
          </DialogHeader>
          <div className="p-6 overflow-y-auto flex-1">
            {currentLogs.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No activity logs found for this task.</p>
            ) : (
              <div className="space-y-4">
                {currentLogs.slice().reverse().map((log: any, i: number) => {
                  let dateStr = log.timestamp;
                  try {
                    dateStr = new Intl.DateTimeFormat('en-US', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: 'numeric', minute: 'numeric', hour12: true
                    }).format(new Date(log.timestamp));
                  } catch (e) {}

                  return (
                    <div key={i} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-brand-teal/10 flex items-center justify-center flex-shrink-0">
                          <History className="w-4 h-4 text-brand-teal" />
                        </div>
                        {i < currentLogs.length - 1 && <div className="w-px h-full bg-slate-200 my-1" />}
                      </div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex-1 mb-2">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="font-semibold text-slate-800">{log.action || 'Activity'}</div>
                          <div className="text-[11px] text-slate-500 font-medium whitespace-nowrap bg-slate-100 px-2 py-1 rounded-md">
                            {dateStr}
                          </div>
                        </div>
                        <div className="text-sm text-slate-600 mb-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                          {log.details || 'No details provided'}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                            {(log.userName || '?')[0].toUpperCase()}
                          </div>
                          <span className="text-xs font-medium text-slate-500">{log.userName || 'Unknown User'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="p-4 bg-white border-t border-slate-200 text-right">
            <Button onClick={() => setLogsDialogOpen(false)} className="bg-brand-teal hover:bg-brand-teal/90 text-white px-8 rounded-lg font-medium shadow-sm">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
