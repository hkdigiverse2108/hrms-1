"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { 
  LayoutDashboard, Users, Clock, Calendar, CalendarDays, ClipboardList, MonitorPlay,
  MessagesSquare, Star, FileText, Files, Briefcase, IndianRupee, Activity, Plus, Search,
  Check, X, Loader2, ChevronDown, LayoutGrid
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { API_URL } from "@/lib/config";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const AVAILABLE_ACTIONS = [
  { id: 'dashboard', label: 'Dashboard', path: '/', icon: LayoutDashboard, category: 'General' },
  { id: 'attendance', label: 'Attendance', path: '/attendance', icon: Clock, category: 'General' },
  { id: 'leave', label: 'Leave', path: '/leave', icon: Calendar, category: 'General' },
  { id: 'schedule', label: 'Schedule', path: '/schedule', icon: CalendarDays, category: 'General' },
  { id: 'penalty', label: 'Penalty', path: '/penalty', icon: MessagesSquare, category: 'General' },
  { id: 'remarks', label: 'Remarks', path: '/remarks', icon: Star, category: 'General' },
  { id: 'activity_tracker', label: 'Activity Tracker', path: '/activity-tracker', icon: Activity, category: 'General' },
  { id: 'chat', label: 'Chat', path: '/chat', icon: MessagesSquare, category: 'General' },

  { id: 'wm_projects', label: 'Projects', path: '/work-management/projects', icon: ClipboardList, category: 'Work Management' },
  { id: 'wm_development', label: 'Development', path: '/work-management/development', icon: ClipboardList, category: 'Work Management' },
  { id: 'wm_daily_progress', label: 'Daily Progress', path: '/work-management/daily-progress', icon: ClipboardList, category: 'Work Management' },
  { id: 'wm_sales', label: 'Sales', path: '/work-management/sales', icon: ClipboardList, category: 'Work Management' },
  { id: 'wm_work_logs', label: 'Work Logs', path: '/work-management/work-logs', icon: ClipboardList, category: 'Work Management' },
  { id: 'wm_clients', label: 'Clients', path: '/work-management/clients', icon: ClipboardList, category: 'Work Management' },
  { id: 'wm_digital_marketing', label: 'Digital Marketing', path: '/work-management/digital-marketing', icon: ClipboardList, category: 'Work Management' },
  { id: 'wm_smm', label: 'Social Media Management', path: '/work-management/smm', icon: ClipboardList, category: 'Work Management' },
  { id: 'wm_research', label: 'Research', path: '/work-management/research', icon: ClipboardList, category: 'Work Management' },

  { id: 'employees', label: 'Employee List', path: '/employees', icon: Users, category: 'Employees' },
  { id: 'org_structure', label: 'Org Structure', path: '/employees/organization/departments', icon: Users, category: 'Employees' },
  { id: 'emp_attendance', label: 'Employee Attendance', path: '/employees/attendance', icon: Users, category: 'Employees' },
  { id: 'leave_requests', label: 'Leave Requests', path: '/employees/leave', icon: Users, category: 'Employees' },
  
  { id: 'emp_documents', label: 'Employee Documents', path: '/employees/documents', icon: Files, category: 'Documents' },
  { id: 'doc_generator', label: 'Document Generator', path: '/employees/documents/generate', icon: Files, category: 'Documents' },
  
  { id: 'salary_structure', label: 'Salary Structure', path: '/payroll/salary-structure', icon: IndianRupee, category: 'Payroll' },
  { id: 'payroll_processing', label: 'Payroll Processing', path: '/payroll', icon: IndianRupee, category: 'Payroll' },
  { id: 'payslips', label: 'Payslips', path: '/payroll/payslips', icon: IndianRupee, category: 'Payroll' },
  { id: 'bonuses', label: 'Bonuses & Deductions', path: '/payroll/bonuses', icon: IndianRupee, category: 'Payroll' },
  
  { id: 'interviews', label: 'Interviews', path: '/recruitment/hiring-board', icon: Briefcase, category: 'Recruitment' },
  { id: 'hirings', label: 'Hirings', path: '/recruitment', icon: Briefcase, category: 'Recruitment' },
  
  { id: 'workspace_seating', label: 'Seating Arrangement', path: '/workspace/seating', icon: MonitorPlay, category: 'Workspace' },
  { id: 'workspace_resource', label: 'Resource Management', path: '/workspace/resource', icon: MonitorPlay, category: 'Workspace' },
  { id: 'workspace_gallery', label: 'Gallery', path: '/workspace/gallery', icon: MonitorPlay, category: 'Workspace' },
  
  { id: 'invoice_all', label: 'All Invoices', path: '/invoice', icon: FileText, category: 'Invoice' },
  { id: 'invoice_ledger', label: 'Invoice Ledger', path: '/invoice/ledger', icon: FileText, category: 'Invoice' },
  { id: 'invoice_create', label: 'Create Invoice', path: '/invoice/create', icon: FileText, category: 'Invoice' },
  { id: 'invoice_proforma', label: 'Create Proforma', path: '/invoice/create?type=Proforma', icon: FileText, category: 'Invoice' },
];

export function QuickActionsWidget({ 
  user, 
  onUpdate,
  hideConfigButton = false,
  onlyConfigButton = false
}: { 
  user: any, 
  onUpdate?: (newUser: any) => void,
  hideConfigButton?: boolean,
  onlyConfigButton?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  const [selectedIds, setSelectedIds] = useState<string[]>(
    user?.quickActions || []
  );

  const selectedActions = useMemo(() => {
    return selectedIds
      .map(id => AVAILABLE_ACTIONS.find(a => a.id === id))
      .filter(Boolean) as typeof AVAILABLE_ACTIONS;
  }, [selectedIds]);

  const filteredAvailableActions = useMemo(() => {
    if (!searchQuery) return AVAILABLE_ACTIONS;
    return AVAILABLE_ACTIONS.filter(a => 
      a.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
      a.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const groupedActions = useMemo(() => {
    const groups: Record<string, typeof AVAILABLE_ACTIONS> = {};
    filteredAvailableActions.forEach(action => {
      if (!groups[action.category]) groups[action.category] = [];
      groups[action.category].push(action);
    });
    return groups;
  }, [filteredAvailableActions]);

  const toggleAction = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!user?.id && !user?._id) return;
    setIsSaving(true);
    try {
      const uId = user.id || user._id;
      const res = await fetch(`${API_URL}/employees/${uId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quickActions: selectedIds })
      });
      
      if (res.ok) {
        toast.success("Quick actions saved successfully");
        const updatedUser = await res.json();
        updatedUser.quickActions = selectedIds; // Forcefully inject in case backend drops it before restart
        if (onUpdate) onUpdate(updatedUser);
        setIsOpen(false);
      } else {
        toast.error("Failed to save quick actions");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while saving");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {!onlyConfigButton && selectedActions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-9 px-3 gap-2 bg-white shadow-sm border-slate-200 text-slate-700 hover:text-brand-teal hover:border-brand-teal/30 hover:bg-brand-teal/5 transition-all font-semibold rounded-lg"
            >
              <LayoutGrid className="w-4 h-4 text-brand-teal" />
              <span>Quick Links</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-white border border-slate-100 shadow-xl rounded-xl p-1.5 z-[100]">
            {selectedActions.map(action => (
              <Link href={action.path} key={action.id} className="w-full block">
                <DropdownMenuItem className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-slate-600 hover:text-brand-teal hover:bg-brand-teal/5 focus:bg-brand-teal/5 focus:text-brand-teal transition-all text-xs font-semibold">
                  <action.icon className="w-4 h-4 shrink-0 text-slate-400" />
                  <span>{action.label}</span>
                </DropdownMenuItem>
              </Link>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {!hideConfigButton && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          {onlyConfigButton ? (
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 px-4 gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold shadow-sm rounded-lg flex items-center">
                <Plus className="w-4 h-4 text-brand-teal" />
                Configure Shortcuts
              </Button>
            </DialogTrigger>
          ) : (
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 px-3 gap-1.5 border-dashed border-slate-300 bg-white shadow-sm text-slate-600 hover:text-slate-900">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline-block">Quick Actions</span>
              </Button>
            </DialogTrigger>
          )}
          <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="p-5 pb-3 border-b border-slate-100">
            <DialogTitle className="text-xl">Configure Shortcuts</DialogTitle>
            <p className="text-sm text-muted-foreground">Select the sections you want to pin to your dashboard.</p>
          </DialogHeader>
          
          <div className="p-5 pt-3 flex-1 overflow-y-auto">
            <div className="relative mb-5">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input 
                placeholder="Search actions or categories..." 
                className="pl-9 bg-slate-50 border-slate-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-6">
              {Object.entries(groupedActions).map(([category, actions]) => (
                <div key={category}>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{category}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {actions.map(action => {
                      const isSelected = selectedIds.includes(action.id);
                      return (
                        <div 
                          key={action.id}
                          onClick={() => toggleAction(action.id)}
                          className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                            isSelected 
                              ? 'bg-brand-teal/5 border-brand-teal/30 ring-1 ring-brand-teal/20' 
                              : 'bg-white border-slate-200 hover:border-brand-teal/50 hover:bg-slate-50'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-brand-teal text-white' : 'bg-slate-100 text-slate-500'
                          }`}>
                            <action.icon className="w-4 h-4" />
                          </div>
                          <span className={`text-sm font-medium flex-1 ${isSelected ? 'text-brand-teal' : 'text-slate-700'}`}>
                            {action.label}
                          </span>
                          {isSelected && (
                            <Check className="w-4 h-4 text-brand-teal shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              
              {Object.keys(groupedActions).length === 0 && (
                <div className="text-center py-10 text-slate-500">
                  No actions found matching "{searchQuery}"
                </div>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
            <span className="text-sm font-medium text-slate-500">
              {selectedIds.length} actions selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="bg-brand-teal hover:bg-brand-teal-light text-white"
              >
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      )}
    </>
  );
}
