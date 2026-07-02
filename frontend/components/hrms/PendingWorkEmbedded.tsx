"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, CalendarIcon, ArrowRight, Filter, Search, ClipboardList, X, Check, Edit2, History, ArrowLeftRight, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { API_URL } from '@/lib/config';
import { toast } from 'sonner';

export function PendingWorkEmbedded({ 
  type = "pending-work",
  defaultTaskType = "all",
  hideTaskTypeFilter = false,
  hideStageFilter = false,
  hideProjectFilter = false
}: { 
  type?: "pending-work" | "todays-work" | "upcoming-work" | "completed-work" | "all",
  defaultTaskType?: string,
  hideTaskTypeFilter?: boolean,
  hideStageFilter?: boolean,
  hideProjectFilter?: boolean
}) {
  const router = useRouter();
  
  const [entries, setEntries] = useState<any[]>([]);
  const [otherWorkEntries, setOtherWorkEntries] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [clientProjects, setClientProjects] = useState<Record<string, any>>({});
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [workScope, setWorkScope] = useState<'my' | 'all'>('my');

  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [filterTaskType, setFilterTaskType] = useState<string>(defaultTaskType);
  const [filterAssigner, setFilterAssigner] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState<string>('');

  const [editingRemarkId, setEditingRemarkId] = useState<string | null>(null);
  const [editingRemarkValue, setEditingRemarkValue] = useState<string>('');
  const [editingIsClientIssue, setEditingIsClientIssue] = useState<boolean>(false);
  
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [viewingTransferRequests, setViewingTransferRequests] = useState(false);
  const [requestsTab, setRequestsTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [transferringTask, setTransferringTask] = useState<any>(null);
  const [selectedReceiverId, setSelectedReceiverId] = useState<string>('');
  
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

      const finalRemark = editingIsClientIssue ? `[CLIENT ISSUE] ${editingRemarkValue}` : editingRemarkValue;

      const response = await fetch(`${API_URL}/content-calendar/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remark: finalRemark, updatedBy: userName, remarkStage: stage }),
      });
      if (response.ok) {
        setEntries(entries.map(e => e.id === id ? { ...e, remark: finalRemark, remarkStage: stage } : e));
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

  const handleOpenTransferModal = (task: any) => {
    setTransferringTask(task);
    setSelectedReceiverId('');
    setIsTransferModalOpen(true);
  };

  const handleSendTransferRequest = async () => {
    if (!selectedReceiverId) {
      toast.error("Please select an employee to transfer this task to.");
      return;
    }
    const receiver = employees.find((e: any) => e.id === selectedReceiverId);
    if (!receiver) {
      toast.error("Selected employee not found.");
      return;
    }
    try {
      const response = await fetch(`${API_URL}/work-transfer-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: transferringTask.id,
          taskType: transferringTask.isOtherWork ? "other-work" : "content-calendar",
          taskName: transferringTask.taskName,
          stage: transferringTask.stage,
          senderId: currentUser.id,
          senderName: currentUser.name || `${currentUser.firstName} ${currentUser.lastName || ''}`.trim(),
          receiverId: receiver.id,
          receiverName: `${receiver.firstName} ${receiver.lastName || ''}`.trim(),
        }),
      });
      if (response.ok) {
        toast.success("Transfer request sent successfully.");
        setIsTransferModalOpen(false);
        fetchData();
      } else {
        const err = await response.json();
        toast.error(err.detail || "Failed to send transfer request.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to send transfer request.");
    }
  };

  const handleRespondRequest = async (requestId: string, status: 'Accepted' | 'Rejected') => {
    try {
      const response = await fetch(`${API_URL}/work-transfer-requests/${requestId}/respond`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (response.ok) {
        toast.success(`Transfer request ${status.toLowerCase()} successfully.`);
        fetchData();
      } else {
        const err = await response.json();
        toast.error(err.detail || `Failed to ${status.toLowerCase()} request.`);
      }
    } catch (err) {
      console.error(err);
      toast.error(`Failed to ${status.toLowerCase()} request.`);
    }
  };

  const getPendingTransferRequest = (item: any) => {
    return outgoingRequests.find(r => r.taskId === item.id && r.stage === item.stage && r.status === 'Pending');
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (err) {
        console.error("Failed to parse user from localStorage", err);
      }
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const storedUser = localStorage.getItem('user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      
      const [entriesRes, clientsRes, pRes, otherWorkRes, employeesRes] = await Promise.all([
        fetch(`${API_URL}/content-calendar/all`),
        fetch(`${API_URL}/clients`),
        fetch(`${API_URL}/projects${user ? `?userId=${user.id}&role=${user.role}` : ''}`),
        fetch(`${API_URL}/other-work/all`),
        fetch(`${API_URL}/employees`)
      ]);

      if (user?.id) {
        const [incomingRes, outgoingRes] = await Promise.all([
          fetch(`${API_URL}/work-transfer-requests/incoming/${user.id}`),
          fetch(`${API_URL}/work-transfer-requests/outgoing/${user.id}`)
        ]);
        if (incomingRes.ok) {
          setIncomingRequests(await incomingRes.json());
        }
        if (outgoingRes.ok) {
          setOutgoingRequests(await outgoingRes.json());
        }
      }
      
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
      
      if (employeesRes.ok) {
        const fetchedEmployees = await employeesRes.json();
        setEmployees(fetchedEmployees);
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

  const isAdminOrTL = currentUser?.role === 'Team Leader' || currentUser?.role?.toLowerCase() === 'admin' || currentUser?.name === 'Admin Admin';

  const preFilteredTasks = useMemo(() => {
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

      const enrich = (stage: string, deadline: string, type: string) => {
        let assigneeId = null;
        let assignerId = project.teamLeaderId || client?.teamLeaderId;
        
        if (stage === 'Script') assigneeId = entry.assignedScriptwriterId || project.assignedScriptwriterId || client?.assignedScriptwriterId;
        if (stage === 'Shoot') assigneeId = entry.assignedShooterId || project.assignedShooterId || client?.assignedShooterId;
        if (stage === 'Editing') {
          if (entry.postReel === 'Post') {
            assigneeId = entry.assignedPostDesignerId || project.assignedPostDesignerId || client?.assignedPostDesignerId;
          } else {
            assigneeId = entry.assignedReelEditorId || project.assignedReelEditorId || client?.assignedReelEditorId;
          }
        }
        if (stage === 'Approval') assigneeId = entry.assignedApproverId || project.assignedApproverId || client?.assignedApproverId;
        if (stage === 'Posting') assigneeId = entry.assignedPosterId || project.assignedPosterId || client?.assignedPosterId;

        const assignee = employees.find((e: any) => e.id === assigneeId);
        const assigner = employees.find((e: any) => e.id === assignerId);

        const finalStage = (stage === 'Editing' && entry.postReel === 'Post') ? 'Post/Graphics' : stage;
        return {
          ...entry,
          clientDisplayName: displayName,
          clientId: entry.clientId,
          stage: finalStage,
          deadline,
          type,
          taskName: entry.concept || entry.topic || (entry.postReel ? `${entry.postReel} Content` : `Task for ${entry.postingDate || entry.monthYear || 'Unknown Date'}`),
          assigneeName: assignee ? `${assignee.firstName} ${assignee.lastName}` : null,
          assignerName: assigner ? `${assigner.firstName} ${assigner.lastName}` : null,
          assigneeId: assigneeId,
          assignerId: assignerId,
        };
      };

      const canSeeTask = (stage: string) => {
        if (!isEmployeeOrIntern) return true;
        const uId = user?.id;
        if (!uId) return false;
        
        if (stage === 'Script') return (entry.assignedScriptwriterId || project.assignedScriptwriterId || client?.assignedScriptwriterId) === uId;
        if (stage === 'Shoot') return (entry.assignedShooterId || project.assignedShooterId || client?.assignedShooterId) === uId;
        if (stage === 'Editing') {
          if (entry.postReel === 'Post') {
            return (entry.assignedPostDesignerId || project.assignedPostDesignerId || client?.assignedPostDesignerId) === uId;
          } else {
            return (entry.assignedReelEditorId || project.assignedReelEditorId || client?.assignedReelEditorId) === uId;
          }
        }
        if (stage === 'Approval') return (entry.assignedApproverId || project.assignedApproverId || client?.assignedApproverId) === uId;
        if (stage === 'Posting') return (entry.assignedPosterId || project.assignedPosterId || client?.assignedPosterId) === uId;
        
        return true;
      };

      if (entry.postReel !== 'Post' && entry.scriptDate && !entry.scriptLink && canSeeTask('Script')) tasks.push(enrich('Script', entry.scriptDate, 'scripts'));
      if (entry.postReel !== 'Post' && entry.shootDate && !entry.shootLink && canSeeTask('Shoot')) tasks.push(enrich('Shoot', entry.shootDate, 'shoots'));
      const isEditingPending = entry.editingStart && (entry.postReel === 'Post' ? !entry.finalPostLink : !entry.finalReelLink);
      if (isEditingPending && canSeeTask('Editing')) tasks.push(enrich('Editing', entry.editingStart, 'edits'));
      if (entry.approval && entry.isApproved !== 'Yes' && canSeeTask('Approval')) tasks.push(enrich('Approval', entry.approval, 'approvals'));
      if (entry.postingDate && !entry.postingLinkOfIg && canSeeTask('Posting')) tasks.push(enrich('Posting', entry.postingDate, 'posts'));
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

      const isManagerOrAdmin = ['Team Leader', 'Admin', 'HR', 'Manager', 'Social Media Manager'].includes(user?.role) || user?.role?.toLowerCase() === 'admin';
      if (isManagerOrAdmin || isAssignee || isAssigner) {
        if (type === 'all' || (type === 'completed-work' ? ow.status === 'Approved' : ow.status !== 'Approved')) {
          
          const assignee = employees.find((e: any) => e.id === ow.assigneeId);
          const assigner = employees.find((e: any) => e.id === ow.assignerId);

          tasks.push({
            ...ow,
            clientDisplayName: ow.taskType === 'digital-marketing' ? 'Digital Marketing' : 'Other Work',
            clientId: 'other-work',
            stage: ow.status,
            deadline: ow.deadline,
            type: ow.taskType || 'other-work',
            taskName: ow.title,
            assigneeName: assignee ? `${assignee.firstName} ${assignee.lastName}` : (ow.assigneeName || null),
            assignerName: assigner ? `${assigner.firstName} ${assigner.lastName}` : (ow.assignerName || null),
            isOtherWork: true
          });
        }
      }
    });

    // Apply Scope Filter (My Work vs All Work)
    let filteredTasks = tasks;
    if (workScope === 'my') {
      const uId = user?.id || user?._id;
      filteredTasks = filteredTasks.filter(t => t.assigneeId === uId);
    }

    // Apply Project Filter
    if (filterProject !== 'all') {
      filteredTasks = filteredTasks.filter(t => t.clientId === filterProject);
    }

    // Apply Task Type Filter
    if (filterTaskType !== 'all') {
      if (filterTaskType === 'other-work') {
        filteredTasks = filteredTasks.filter(t => t.isOtherWork && t.type !== 'digital-marketing');
      } else if (filterTaskType === 'content-calendar') {
        filteredTasks = filteredTasks.filter(t => !t.isOtherWork && t.type !== 'digital-marketing');
      } else if (filterTaskType === 'digital-marketing') {
        filteredTasks = filteredTasks.filter(t => t.type === 'digital-marketing');
      }
    }



    // Apply Assigner Filter
    const assignerFilterName = filterAssigner !== 'all' ? (filterAssigner.includes('|') ? filterAssigner.split('|')[0] : filterAssigner) : 'all';
    if (assignerFilterName !== 'all') {
      filteredTasks = filteredTasks.filter(t => t.assignerName && t.assignerName === assignerFilterName);
    }
    
    const assigneeFilterName = filterAssignee !== 'all' ? (filterAssignee.includes('|') ? filterAssignee.split('|')[0] : filterAssignee) : 'all';
    if (assigneeFilterName !== 'all') {
      filteredTasks = filteredTasks.filter(t => t.assigneeName && t.assigneeName === assigneeFilterName);
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
      filteredTasks = filteredTasks.filter(t => {
        if (t.isOtherWork) {
           const assignDateStr = t.created_at ? t.created_at.split('T')[0] : t.deadline;
           return assignDateStr === filterDate || t.deadline === filterDate;
        }
        return t.deadline === filterDate;
      });
    }

    if (type && type !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filteredTasks = filteredTasks.filter(t => {
        if (t.isOtherWork) {
          if (type === 'completed-work') return t.status === 'Approved';
          if (type === 'pending-work') return t.status === 'Pending' || t.status === 'Ready for Review';
          
          const deadlineDate = new Date(t.deadline);
          deadlineDate.setHours(0, 0, 0, 0);
          
          const assignDate = t.created_at ? new Date(t.created_at) : deadlineDate;
          assignDate.setHours(0, 0, 0, 0);

          if (type === 'todays-work') return (assignDate <= today || deadlineDate <= today) && t.status === 'Pending';
          if (type === 'upcoming-work') return deadlineDate > today && assignDate > today && t.status === 'Pending';
          return true;
        }

        const hasApplicableRemark = t.remark && t.remark.trim() !== '' && (!t.remarkStage || t.stage === t.remarkStage);
        const isClientIssue = hasApplicableRemark && t.remark.startsWith('[CLIENT ISSUE] ');

        if (type === 'pending-work') {
          if (isClientIssue) return true;
          return hasApplicableRemark;
        }
        
        if (type === 'completed-work') {
          return false; // For now, only Other Work is shown in completed work
        }

        // If it's a client issue, it should ONLY show in pending work!
        if (isClientIssue) return false;
        
        const deadlineDate = new Date(t.deadline);
        deadlineDate.setHours(0, 0, 0, 0);
        
        if (type === 'todays-work') return deadlineDate <= today;
        if (type === 'upcoming-work') return deadlineDate > today;
        return true;
      });
    }

    filteredTasks.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
    return filteredTasks;
  }, [entries, otherWorkEntries, clients, clientProjects, filterProject, filterTaskType, filterAssigner, filterAssignee, searchQuery, filterDate, type, employees, workScope]);

  const allPendingTasks = useMemo(() => {
    if (filterStage === 'all') return preFilteredTasks;
    return preFilteredTasks.filter(t => t.stage.toLowerCase() === filterStage.toLowerCase());
  }, [preFilteredTasks, filterStage]);

  const availableStages = useMemo(() => {
    const defaultStages = ['script', 'shoot', 'editing', 'post/graphics', 'approval', 'posting'];
    if (isAdminOrTL) {
      return defaultStages;
    }
    const stages = new Set<string>();
    preFilteredTasks.forEach(t => {
      if (t.stage) {
        stages.add(t.stage.toLowerCase());
      }
    });
    return defaultStages.filter(s => stages.has(s));
  }, [preFilteredTasks, isAdminOrTL]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[calc(100vh-250px)] flex flex-col">
      {viewingTransferRequests ? (
        <div className="flex flex-col flex-1">
          {/* Header Row */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewingTransferRequests(false)}
                className="h-8 px-2.5 hover:bg-slate-200/60 text-slate-600 rounded-lg flex items-center gap-1.5 font-bold text-xs"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Tasks
              </Button>
              <div className="h-4 w-px bg-slate-300" />
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-brand-teal" />
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Task Transfer Requests
                </h2>
              </div>
            </div>
          </div>

          {/* Custom Tabs Headers */}
          <div className="flex border-b border-slate-200 px-6 bg-slate-50/50">
            <button
              onClick={() => setRequestsTab('incoming')}
              className={`py-3 px-4 text-xs font-bold border-b-2 -mb-px transition-all ${
                requestsTab === 'incoming'
                  ? 'border-brand-teal text-brand-teal'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Received Requests ({incomingRequests.length})
            </button>
            <button
              onClick={() => setRequestsTab('outgoing')}
              className={`py-3 px-4 text-xs font-bold border-b-2 -mb-px transition-all ${
                requestsTab === 'outgoing'
                  ? 'border-brand-teal text-brand-teal'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Sent Requests ({outgoingRequests.length})
            </button>
          </div>

          <div className="flex-1 overflow-x-auto bg-white">
            {requestsTab === 'incoming' ? (
              incomingRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                  <ArrowLeftRight className="w-8 h-8 text-slate-300 animate-pulse" />
                  <p className="text-sm font-medium">No received transfer requests.</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-6 py-4 whitespace-nowrap">Date</th>
                      <th className="px-6 py-4 whitespace-nowrap">Task Name</th>
                      <th className="px-6 py-4 whitespace-nowrap">Stage</th>
                      <th className="px-6 py-4 whitespace-nowrap">From</th>
                      <th className="px-6 py-4 whitespace-nowrap">Status</th>
                      <th className="px-6 py-4 text-right whitespace-nowrap">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {incomingRequests.map(req => (
                      <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                          {new Date(req.createdDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-800">
                          {req.taskName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="outline" className="text-xs text-brand-teal border-brand-teal/30 bg-brand-teal/5">
                            {req.stage}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-700">
                          {req.senderName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge 
                            variant="secondary"
                            className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                              req.status === 'Pending' 
                                ? 'bg-amber-100 text-amber-700' 
                                : req.status === 'Accepted'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {req.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {req.status === 'Pending' ? (
                            <div className="flex gap-2 justify-end">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-xs h-7 px-3 text-slate-600 border-slate-200 hover:bg-slate-100 rounded-lg font-medium"
                                onClick={() => handleRespondRequest(req.id, 'Rejected')}
                              >
                                Reject
                              </Button>
                              <Button 
                                size="sm" 
                                className="text-xs h-7 px-3 bg-brand-teal hover:bg-brand-teal/90 text-white rounded-lg font-semibold shadow-xs"
                                onClick={() => handleRespondRequest(req.id, 'Accepted')}
                              >
                                Accept
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium italic">Processed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              outgoingRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                  <ArrowLeftRight className="w-8 h-8 text-slate-300 animate-pulse" />
                  <p className="text-sm font-medium">No sent transfer requests.</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-6 py-4 whitespace-nowrap">Date</th>
                      <th className="px-6 py-4 whitespace-nowrap">Task Name</th>
                      <th className="px-6 py-4 whitespace-nowrap">Stage</th>
                      <th className="px-6 py-4 whitespace-nowrap">To</th>
                      <th className="px-6 py-4 whitespace-nowrap">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {outgoingRequests.map(req => (
                      <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                          {new Date(req.createdDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-800">
                          {req.taskName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="outline" className="text-xs text-brand-teal border-brand-teal/30 bg-brand-teal/5">
                            {req.stage}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-700">
                          {req.receiverName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge 
                            variant="secondary"
                            className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                              req.status === 'Pending' 
                                ? 'bg-amber-100 text-amber-700' 
                                : req.status === 'Accepted'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {req.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Filters Bar */}
          <div className="flex flex-col border-b border-slate-200 bg-slate-50/50">
            {/* Top Header Row */}
            <div className="p-4 pb-3 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex items-center justify-between sm:justify-start gap-4 w-full sm:w-auto">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-brand-teal" />
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    {type === 'todays-work' ? "Today's Work" : type === 'upcoming-work' ? 'Upcoming Work' : type === 'completed-work' ? 'Completed Work' : type === 'all' ? 'All Tasks' : 'Pending Work'}
                  </h2>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewingTransferRequests(true)}
                  className="bg-white border-slate-200 hover:bg-slate-50 text-slate-700 rounded-full flex items-center gap-1.5 font-semibold text-xs shadow-sm h-8"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-slate-500" />
                  Transfer Requests
                  {incomingRequests.filter(r => r.status === 'Pending').length > 0 && (
                    <span className="bg-indigo-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black">
                      {incomingRequests.filter(r => r.status === 'Pending').length}
                    </span>
                  )}
                </Button>
              </div>
          
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input 
              placeholder="Search tasks, clients, or stages..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm bg-white border-slate-200 shadow-sm rounded-full focus-visible:ring-brand-teal"
            />
          </div>
        </div>

        {/* Bottom Filters Row */}
        <div className="px-4 pb-4 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <div className="flex items-center gap-2 min-w-max">


            {isAdminOrTL && (
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 mr-2 shadow-sm">
                <button
                  onClick={() => setWorkScope('my')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    workScope === 'my'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  My Work
                </button>
                <button
                  onClick={() => setWorkScope('all')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    workScope === 'all'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  All Work
                </button>
              </div>
            )}

            <div className="relative w-[150px]">
              <Input 
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="h-9 text-sm bg-white pr-8 text-slate-600 rounded-md border-slate-200 focus-visible:ring-brand-teal"
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

            {!hideTaskTypeFilter && (
              <Select value={filterTaskType} onValueChange={setFilterTaskType}>
                <SelectTrigger className="w-[150px] h-9 text-sm bg-white rounded-md border-slate-200 focus:ring-brand-teal">
                  <SelectValue placeholder="Task Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="content-calendar">Content Calendar</SelectItem>
                  <SelectItem value="other-work">Other Work</SelectItem>
                  <SelectItem value="digital-marketing">Digital Marketing</SelectItem>
                </SelectContent>
              </Select>
            )}

            {!hideStageFilter && (
              <Select value={filterStage} onValueChange={setFilterStage}>
                <SelectTrigger className="w-[140px] h-9 text-sm bg-white rounded-md border-slate-200 focus:ring-brand-teal">
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {availableStages.includes('script') && <SelectItem value="script">Script</SelectItem>}
                  {availableStages.includes('shoot') && <SelectItem value="shoot">Shoot</SelectItem>}
                  {availableStages.includes('editing') && <SelectItem value="editing">Editing</SelectItem>}
                  {availableStages.includes('post/graphics') && <SelectItem value="post/graphics">Post/Graphics</SelectItem>}
                  {availableStages.includes('approval') && <SelectItem value="approval">Approval</SelectItem>}
                  {availableStages.includes('posting') && <SelectItem value="posting">Posting</SelectItem>}
                </SelectContent>
              </Select>
            )}

            {!hideProjectFilter && (
              <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger className="w-[180px] h-9 text-sm bg-white rounded-md border-slate-200 focus:ring-brand-teal">
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
            )}

            {isAdminOrTL && (
              <>
                <Select value={filterAssigner} onValueChange={setFilterAssigner}>
                  <SelectTrigger className="w-[160px] h-9 text-sm bg-white rounded-md border-slate-200 focus:ring-brand-teal">
                    <SelectValue placeholder="Assigned By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Assigned By: All</SelectItem>
                    {employees.map(emp => {
                      const empName = `${emp.firstName} ${emp.lastName}`;
                      return (
                        <SelectItem key={`assigner-${emp.id}`} value={`${empName}|${emp.id}`}>
                          {empName}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                  <SelectTrigger className="w-[160px] h-9 text-sm bg-white rounded-md border-slate-200 focus:ring-brand-teal">
                    <SelectValue placeholder="Assigned To" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Assigned To: All</SelectItem>
                    {employees.map(emp => {
                      const empName = `${emp.firstName} ${emp.lastName}`;
                      return (
                        <SelectItem key={`assignee-${emp.id}`} value={`${empName}|${emp.id}`}>
                          {empName}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
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
                const transferReq = incomingRequests.find(r => r.taskId === item.id && (item.type === 'other-work' || r.stage === item.stage) && r.status === 'Accepted');
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
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-800">{item.taskName}</span>
                          {item.monthYear && (
                            <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              {item.monthYear}
                            </span>
                          )}
                          {transferReq && (
                            <span className="text-[10px] text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border border-indigo-100/60">
                              <ArrowLeftRight className="w-2.5 h-2.5" />
                              Transferred from {transferReq.senderName}
                            </span>
                          )}
                        </div>
                        {(item.assignerName || item.assigneeName) && (
                          <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                            {item.assignerName && <div>Assigned by: <span className="font-medium text-slate-700">{item.assignerName}</span></div>}
                            {item.assigneeName && <div>Assigned to: <span className="font-medium text-slate-700">{item.assigneeName}</span></div>}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-[200px]">
                      {(() => {
                        const isApplicable = !item.remarkStage || item.remarkStage === item.stage;
                        const displayRemark = isApplicable ? item.remark : null;

                        return editingRemarkId === `${item.id}-${item.stage}` ? (
                          <div className="flex flex-col gap-1.5 min-w-[150px]">
                            <div className="flex items-center gap-1.5">
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
                            <label className="flex items-center gap-2 cursor-pointer mt-0.5">
                              <input 
                                type="checkbox" 
                                className="w-3 h-3 text-red-500 rounded border-slate-300 focus:ring-red-500 cursor-pointer"
                                checked={editingIsClientIssue}
                                onChange={(e) => setEditingIsClientIssue(e.target.checked)}
                              />
                              <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Issue from client</span>
                            </label>
                          </div>
                        ) : (
                          <div 
                            className="cursor-pointer py-1 px-1 -mx-1 rounded hover:bg-slate-100 truncate flex-1 flex flex-col gap-0.5"
                            onClick={() => {
                              setEditingRemarkId(`${item.id}-${item.stage}`);
                              const remarkText = displayRemark || '';
                              if (remarkText.startsWith('[CLIENT ISSUE] ')) {
                                setEditingIsClientIssue(true);
                                setEditingRemarkValue(remarkText.replace('[CLIENT ISSUE] ', ''));
                              } else {
                                setEditingIsClientIssue(false);
                                setEditingRemarkValue(remarkText);
                              }
                            }}
                            title={displayRemark || ""}
                          >
                            {displayRemark ? (
                                displayRemark.startsWith('[CLIENT ISSUE] ') ? (
                                  <>
                                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Client Issue</span>
                                    <span className="text-slate-600 truncate">{displayRemark.replace('[CLIENT ISSUE] ', '')}</span>
                                  </>
                                ) : (
                                  <span className="text-slate-600 truncate">{displayRemark}</span>
                                )
                            ) : (
                                "-"
                            )}
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
                            {getPendingTransferRequest(item) ? (
                              <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded font-semibold whitespace-nowrap">
                                Pending Transfer to {getPendingTransferRequest(item)?.receiverName}
                              </span>
                            ) : (
                              item.assigneeId === currentUser?.id && (
                                <Button
                                  onClick={() => handleOpenTransferModal(item)}
                                  variant="ghost"
                                  size="icon"
                                  title="Transfer Task"
                                  className="h-8 w-8 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
                                >
                                  <ArrowLeftRight className="w-4 h-4" />
                                </Button>
                              )
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
                            {getPendingTransferRequest(item) ? (
                              <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded font-semibold whitespace-nowrap">
                                Pending Transfer to {getPendingTransferRequest(item)?.receiverName}
                              </span>
                            ) : (
                              item.assigneeId === currentUser?.id && (
                                <Button
                                  onClick={() => handleOpenTransferModal(item)}
                                  variant="ghost"
                                  size="icon"
                                  title="Transfer Task"
                                  className="h-8 w-8 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
                                >
                                  <ArrowLeftRight className="w-4 h-4" />
                                </Button>
                              )
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
        </>
      )}

      <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-slate-50 border-0 shadow-2xl rounded-2xl">
          <DialogHeader className="px-6 py-6 bg-white flex flex-row items-center gap-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] relative z-10">
            <div className="w-14 h-14 rounded-full bg-brand-teal/10 flex items-center justify-center flex-shrink-0">
              <History className="w-6 h-6 text-brand-teal" />
            </div>
            <div className="flex flex-col gap-1 items-start text-left">
              <DialogTitle className="text-[22px] font-bold text-slate-900 m-0 leading-none">Row Activity History</DialogTitle>
              <p className="text-[13px] text-slate-500 italic m-0">Content Calendar Row</p>
            </div>
          </DialogHeader>
          <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
            {currentLogs.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No activity logs found for this task.</p>
            ) : (
              <div className="relative pl-1">
                {/* Vertical Timeline Line */}
                <div className="absolute left-[9px] top-6 bottom-6 w-px bg-slate-200 z-0" />
                
                <div className="space-y-4">
                  {currentLogs.slice().reverse().map((log: any, i: number) => {
                    let dateStr = log.timestamp;
                    try {
                      dateStr = new Intl.DateTimeFormat('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                        hour: 'numeric', minute: '2-digit', hour12: true
                      }).format(new Date(log.timestamp));
                    } catch (e) {}

                    const isCreated = log.action?.toLowerCase().includes('create') || log.details?.toLowerCase().includes('create');
                    const badgeColor = isCreated ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600";
                    const badgeText = isCreated ? "CREATED" : "UPDATED";
                    
                    const detailsList = log.details ? log.details.split(', ').filter((d: string) => d.trim() !== '') : [];

                    return (
                      <div key={i} className="flex gap-6 relative z-10">
                        <div className="flex flex-col items-center mt-[22px]">
                          <div className="w-3 h-3 rounded-full border-2 border-brand-teal bg-white" />
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex-1">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-slate-900 text-[15px]">{log.userName || 'Admin'}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${badgeColor} uppercase tracking-wider`}>
                                {badgeText}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 font-medium">
                              {dateStr}
                            </div>
                          </div>
                          <ul className="space-y-1.5">
                            {detailsList.length > 0 ? detailsList.map((detail: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2 text-[13px] text-slate-600">
                                <span className="text-slate-400 mt-[3px] text-lg leading-none">•</span>
                                <span className="leading-relaxed">{detail}</span>
                              </li>
                            )) : (
                              <li className="flex items-start gap-2 text-[13px] text-slate-600">
                                <span className="text-slate-400 mt-[3px] text-lg leading-none">•</span>
                                <span className="leading-relaxed">{log.action || 'No details provided'}</span>
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div className="p-4 bg-white border-t border-slate-200 flex justify-end">
            <Button onClick={() => setLogsDialogOpen(false)} className="bg-brand-teal hover:bg-brand-teal/90 text-white px-8 rounded-lg font-bold shadow-sm h-10">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-brand-teal" />
              Transfer Task
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs space-y-1.5">
              <div>Task Name: <span className="font-semibold text-slate-800">{transferringTask?.taskName}</span></div>
              <div>Stage: <span className="font-semibold text-slate-800">{transferringTask?.stage}</span></div>
              <div>Client: <span className="font-semibold text-slate-800">{transferringTask?.clientDisplayName}</span></div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block">Select Employee to Transfer To</label>
              <Select value={selectedReceiverId} onValueChange={setSelectedReceiverId}>
                <SelectTrigger className="w-full focus:ring-brand-teal focus:border-brand-teal">
                  <SelectValue placeholder="Choose employee..." />
                </SelectTrigger>
                <SelectContent>
                  {employees
                    .filter((emp: any) => {
                      if (emp.id === currentUser?.id) return false;
                      if (!currentUser?.department) return true;
                      return emp.department?.toLowerCase() === currentUser?.department?.toLowerCase();
                    })
                    .map((emp: any) => {
                      const name = `${emp.firstName} ${emp.lastName || ''}`.trim();
                      return (
                        <SelectItem key={emp.id} value={emp.id}>
                          {name} ({emp.role || 'Employee'})
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsTransferModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-brand-teal hover:bg-brand-teal/90 text-white font-semibold"
              onClick={handleSendTransferRequest}
            >
              Send Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
