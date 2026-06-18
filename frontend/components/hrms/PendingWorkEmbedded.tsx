"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, CalendarIcon, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { API_URL } from '@/lib/config';

export function PendingWorkEmbedded() {
  const router = useRouter();
  
  const [entries, setEntries] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [clientProjects, setClientProjects] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

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
        const projectMap: Record<string, string> = {};
        projects.forEach((p: any) => {
          if (p.clientId && p.department === 'Creative') {
            projectMap[p.clientId] = p.title;
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

    entries.forEach(entry => {
      const client = clients.find(c => c.id === entry.clientId);
      const clientName = client ? (client.companyName || client.clientName || 'Unknown Client') : 'Unknown Client';
      const projectName = clientProjects[entry.clientId];
      if (!projectName) return; // Only show if active creative project
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

      if (entry.scriptDate && !entry.scriptLink) tasks.push(enrich('Script', entry.scriptDate, 'scripts'));
      if (entry.shootDate && !entry.shootLink) tasks.push(enrich('Shoot', entry.shootDate, 'shoots'));
      if (entry.editingStart && !entry.finalReelLink) tasks.push(enrich('Editing', entry.editingStart, 'edits'));
      if (entry.approval && entry.isApproved !== 'Yes') tasks.push(enrich('Approval', entry.approval, 'approvals'));
      if (entry.postingDate && entry.status !== 'Posted') tasks.push(enrich('Posting', entry.postingDate, 'posts'));
    });

    tasks.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
    return tasks;
  }, [entries, clients, clientProjects]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[calc(100vh-250px)] flex flex-col">
      {loading ? (
        <div className="flex-1 flex items-center justify-center p-20">
          <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
        </div>
      ) : allPendingTasks.length === 0 ? (
        <div className="text-center py-20">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-slate-700">No pending work anywhere!</h3>
          <p className="text-slate-500 mt-2">All projects are completely up to date.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
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
