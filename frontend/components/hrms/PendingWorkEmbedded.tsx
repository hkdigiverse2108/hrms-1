"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, CalendarIcon, ArrowRight, Filter, Search, ClipboardList, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { API_URL } from '@/lib/config';

export function PendingWorkEmbedded() {
  const router = useRouter();
  
  const [entries, setEntries] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [clientProjects, setClientProjects] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const storedUser = localStorage.getItem('user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      
      const [entriesRes, clientsRes, pRes] = await Promise.all([
        fetch(`${API_URL}/content-calendar/all`),
        fetch(`${API_URL}/clients`),
        fetch(`${API_URL}/projects${user ? `?userId=${user.id}&role=${user.role}` : ''}`)
      ]);
      
      if (entriesRes.ok && clientsRes.ok) {
        const fetchedEntries = await entriesRes.json();
        const fetchedClients = await clientsRes.json();
        setEntries(fetchedEntries);
        setClients(fetchedClients);
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

    // Apply Project Filter
    let filteredTasks = tasks;
    if (filterProject !== 'all') {
      filteredTasks = filteredTasks.filter(t => t.clientId === filterProject);
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

    filteredTasks.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
    return filteredTasks;
  }, [entries, clients, clientProjects, filterProject, filterStage, searchQuery, filterDate]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[calc(100vh-250px)] flex flex-col">
      {/* Filters Bar */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <ClipboardList className="w-5 h-5 text-brand-teal" />
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Pending Work</h2>
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
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Button
                        onClick={() => router.push(`/work-management/smm/${item.clientId}?highlightTask=${item.id}`)}
                        variant="ghost"
                        size="sm"
                        className="text-brand-teal hover:bg-brand-teal/10 hover:text-brand-teal gap-1"
                      >
                        <CalendarIcon className="w-3.5 h-3.5" />
                        Show in Calendar
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
