"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, CalendarIcon, MessageSquare, Filter, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { API_URL } from '@/lib/config';
import dayjs from 'dayjs';

export function FeedbackReviewsEmbedded() {
  const router = useRouter();
  
  const [responses, setResponses] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Response for Dialog
  const [selectedResponse, setSelectedResponse] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resRes, formsRes, clientsRes, pRes] = await Promise.all([
        fetch(`${API_URL}/forms/all/responses`),
        fetch(`${API_URL}/forms/all/forms`),
        fetch(`${API_URL}/clients`),
        fetch(`${API_URL}/projects`)
      ]);
      
      if (resRes.ok) setResponses(await resRes.json());
      if (formsRes.ok) setForms(await formsRes.json());
      if (clientsRes.ok) setClients(await clientsRes.json());
      if (pRes.ok) setProjects(await pRes.json());
    } catch (error) {
      console.error('Failed to fetch reviews data', error);
    } finally {
      setLoading(false);
    }
  };

  const enrichedResponses = useMemo(() => {
    let result = responses.map(resp => {
      const form = forms.find(f => f.id === resp.formId);
      const client = clients.find(c => c.id === resp.clientId);
      let project = null;
      
      if (resp.projectId) {
        project = projects.find(p => p.id === resp.projectId);
      } else if (client) {
        // If it's a specific client form, check if they have a creative project
        project = projects.find(p => p.clientId === client.id && p.department === 'Creative');
      }

      return {
        ...resp,
        formTitle: form?.title || 'Unknown Form',
        clientName: client?.companyName || client?.clientName || 'Unknown Client',
        projectName: project?.title || 'General',
        projectId: project?.id || 'none',
        formDetails: form,
        submittedAtDate: new Date(resp.submittedAt)
      };
    });

    // Apply Project Filter
    if (filterProject !== 'all') {
      result = result.filter(r => r.projectId === filterProject);
    }

    // Apply Date Filter
    if (filterDateRange !== 'all') {
      const now = dayjs();
      if (filterDateRange === '7days') {
        result = result.filter(r => dayjs(r.submittedAtDate).isAfter(now.subtract(7, 'day')));
      } else if (filterDateRange === '30days') {
        result = result.filter(r => dayjs(r.submittedAtDate).isAfter(now.subtract(30, 'day')));
      } else if (filterDateRange === 'this_month') {
        result = result.filter(r => dayjs(r.submittedAtDate).isSame(now, 'month'));
      }
    }

    // Apply Search Query
    if (searchQuery.trim()) {
      const lowerQ = searchQuery.toLowerCase();
      result = result.filter(r => 
        r.clientName.toLowerCase().includes(lowerQ) || 
        r.projectName.toLowerCase().includes(lowerQ) ||
        r.formTitle.toLowerCase().includes(lowerQ)
      );
    }

    // Sort by most recent
    result.sort((a, b) => b.submittedAtDate.getTime() - a.submittedAtDate.getTime());
    return result;
  }, [responses, forms, clients, projects, filterProject, filterDateRange, searchQuery]);

  const getQuestionLabel = (formDetails: any, questionId: string) => {
    if (!formDetails) return questionId;
    const field = formDetails.fields?.find((f: any) => f.id === questionId);
    return field ? field.label : questionId;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[calc(100vh-250px)] flex flex-col">
      {/* Filters Bar */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <MessageSquare className="w-5 h-5 text-brand-teal" />
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Client Reviews & Feedback</h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-48">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm bg-white"
            />
          </div>

          <Select value={filterDateRange} onValueChange={setFilterDateRange}>
            <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm bg-white">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-full sm:w-[200px] h-9 text-sm bg-white">
              <SelectValue placeholder="Filter by Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              <SelectItem value="none">General (No Project)</SelectItem>
              {projects.filter(p => p.department === 'Creative').map(p => (
                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center p-20">
          <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
        </div>
      ) : enrichedResponses.length === 0 ? (
        <div className="text-center py-20 flex-1 flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <Filter className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-medium text-slate-700">No reviews found</h3>
          <p className="text-slate-500 mt-2 text-sm">Try adjusting your filters or date range.</p>
        </div>
      ) : (
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-semibold sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Submitted Date</th>
                <th className="px-6 py-4 whitespace-nowrap">Client</th>
                <th className="px-6 py-4 whitespace-nowrap">Project</th>
                <th className="px-6 py-4 whitespace-nowrap">Form Title</th>
                <th className="px-6 py-4 text-right whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {enrichedResponses.map((item, idx) => (
                <tr key={`${item.id}-${idx}`} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                    {dayjs(item.submittedAt).format('DD/MM/YYYY, hh:mm A')}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-800">
                    {item.clientName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant="outline" className="text-xs text-indigo-600 border-indigo-200 bg-indigo-50">
                      {item.projectName}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.formTitle}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <Button
                      onClick={() => setSelectedResponse(item)}
                      variant="outline"
                      size="sm"
                      className="text-brand-teal border-brand-teal/20 hover:bg-brand-teal/5 gap-1"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      View Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Response Details Dialog */}
      <Dialog open={!!selectedResponse} onOpenChange={(open) => !open && setSelectedResponse(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-brand-teal" />
              Review Details
            </DialogTitle>
            <DialogDescription>
              Submitted by {selectedResponse?.clientName} on {selectedResponse && dayjs(selectedResponse.submittedAt).format('DD/MM/YYYY, hh:mm A')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Form</p>
                <p className="text-sm font-medium text-slate-800">{selectedResponse?.formTitle}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Project</p>
                <p className="text-sm font-medium text-slate-800">{selectedResponse?.projectName}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-slate-800 border-b pb-2">Responses</h4>
              {selectedResponse && selectedResponse.responses && Object.entries(selectedResponse.responses).map(([questionId, answer]: [string, any], i) => (
                <div key={i} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                  <p className="text-sm font-medium text-slate-800 mb-2">
                    {getQuestionLabel(selectedResponse.formDetails, questionId)}
                  </p>
                  <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-md border border-slate-100 whitespace-pre-wrap">
                    {Array.isArray(answer) ? answer.join(", ") : (answer?.toString() || "No answer provided")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
