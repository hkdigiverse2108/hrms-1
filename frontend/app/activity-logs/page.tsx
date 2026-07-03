"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TablePagination } from "@/components/common/TablePagination";
import { exportToCSV } from "@/lib/export-utils";
import { useUserContext } from "@/context/UserContext";
import {
  Search,
  Calendar,
  Download,
  Clock,
  RefreshCw,
  User,
  Activity,
  ChevronDown,
  ChevronUp,
  FileCode,
  ShieldAlert,
} from "lucide-react";
import { API_URL } from "@/lib/config";
import { format } from "date-fns";

import { usePermissions } from "@/hooks/usePermissions";

interface DiffItem {
  field?: string;
  old?: any;
  new?: any;
  [key: string]: any;
}

interface LogEntry {
  id: string;
  action: string;
  performedBy: string;
  userName: string;
  details: string;
  timestamp: string;
  diffs?: DiffItem[];
  taskId?: string;
  projectId?: string;
  clientId?: string;
  leadId?: string;
  dailyReportId?: string;
  monthlyReportId?: string;
  employeeId?: string;
  leaveId?: string;
  attendanceId?: string;
  remarkId?: string;
}

export default function ActivityLogsPage() {
  const { user } = useUserContext();
  const { checkPermission, isAdmin, loading: permissionsLoading } = usePermissions();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAction, setSelectedAction] = useState("All");
  const [performerQuery, setPerformerQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<string>("");
  const [debugToken, setDebugToken] = useState<string | null>(null);

  const hasAccess = isAdmin || checkPermission('activity-logs', 'canView');

  const fetchLogs = async () => {
    setIsLoading(true);
    setErrorStatus("");
    const token = localStorage.getItem("token");
    setDebugToken(token);
    console.log("ActivityLogs: retrieved token from localStorage:", token);
    try {
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append("search", searchQuery.trim());
      if (selectedAction !== "All") params.append("action", selectedAction);
      if (performerQuery.trim()) params.append("performedBy", performerQuery.trim());
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      
      const skip = (currentPage - 1) * itemsPerPage;
      params.append("limit", itemsPerPage.toString());
      params.append("skip", skip.toString());

      const res = await fetch(`${API_URL}/admin/activity-logs?${params.toString()}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      } else {
        if (res.status === 401) {
          setErrorStatus("Session token is missing or invalid. Please log out and log back in to refresh your credentials.");
        } else if (res.status === 403) {
          setErrorStatus("Forbidden (403): You do not have administrator permissions to view this resource.");
        } else {
          setErrorStatus(`Server error: status code ${res.status}`);
        }
      }
    } catch (err: any) {
      console.error("Error fetching activity logs:", err);
      setErrorStatus(`Network Error: ${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasAccess) {
      fetchLogs();
    }
  }, [currentPage, itemsPerPage, selectedAction, startDate, endDate, hasAccess]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchLogs();
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedAction("All");
    setPerformerQuery("");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
    setTimeout(() => fetchLogs(), 0);
  };

  const toggleExpandLog = (logId: string) => {
    setExpandedLogId(expandedLogId === logId ? null : logId);
  };

  const handleExport = () => {
    const csvData = logs.map(log => ({
      Timestamp: log.timestamp,
      Performer: log.userName,
      "Performer ID": log.performedBy,
      Action: log.action,
      Details: log.details,
      "Diffs Count": log.diffs ? log.diffs.length : 0,
    }));
    exportToCSV(csvData, `hrms_activity_logs_${format(new Date(), "yyyy_MM_dd")}`);
  };

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 text-brand-teal animate-spin" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4 animate-bounce" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Access Denied</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-md">
          You do not have administrative permissions to view the application logs. Please contact your system administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <PageHeader
        title="Application Audit Logs"
        subtitle="Track every action, update, and modification made across the system."
      />

      {/* Diagnostic Banner */}
      <div className="p-4 rounded-lg border text-sm flex flex-col space-y-1.5 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xs">
        <div className="flex items-center space-x-2 font-semibold text-slate-800 dark:text-slate-200">
          <div className={`w-2 h-2 rounded-full ${debugToken ? "bg-green-500" : "bg-red-500 animate-pulse"}`} />
          <span>Local Security Token Diagnostics</span>
        </div>
        <div className="font-mono text-xs text-slate-500 dark:text-slate-400 break-all select-all">
          Token Status: {debugToken ? `Token Active (Length: ${debugToken.length})` : "MISSING (Session token not found in localStorage)"}
        </div>
        {errorStatus && (
          <div className="text-red-500 font-semibold text-xs mt-1 border-t border-red-100 dark:border-red-950/30 pt-1.5">
            ⚠️ Connection/Auth Error: {errorStatus}
          </div>
        )}
      </div>

      {/* Filters Card */}
      <Card className="border border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm">
        <CardContent className="pt-6">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Search details</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search log description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Action Type</label>
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Actions</SelectItem>
                  <SelectItem value="Employee Created">Employee Created</SelectItem>
                  <SelectItem value="Employee Updated">Employee Updated</SelectItem>
                  <SelectItem value="Employee Deleted">Employee Deleted</SelectItem>
                  <SelectItem value="Clock In">Clock In</SelectItem>
                  <SelectItem value="Clock Out">Clock Out</SelectItem>
                  <SelectItem value="Leave Requested">Leave Requested</SelectItem>
                  <SelectItem value="Leave Updated">Leave Updated</SelectItem>
                  <SelectItem value="Leave Request Deleted">Leave Request Deleted</SelectItem>
                  <SelectItem value="Remark Created">Remark Created</SelectItem>
                  <SelectItem value="Remark Updated">Remark Updated</SelectItem>
                  <SelectItem value="Remark Deleted">Remark Deleted</SelectItem>
                  <SelectItem value="Payroll Processed">Payroll Processed</SelectItem>
                  <SelectItem value="Created">General Created</SelectItem>
                  <SelectItem value="Updated">General Updated</SelectItem>
                  <SelectItem value="Deleted">General Deleted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Performer</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Username / Performer name..."
                  value={performerQuery}
                  onChange={(e) => setPerformerQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Start Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-9 text-slate-700 dark:text-slate-300"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">End Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-9 text-slate-700 dark:text-slate-300"
                />
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-wrap gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={handleResetFilters} className="text-slate-600">
                Clear Filters
              </Button>
              <Button type="button" variant="outline" onClick={handleExport} className="border-teal-500 text-teal-600 hover:bg-teal-50">
                <Download className="w-4 h-4 mr-2" /> Export CSV
              </Button>
              <Button type="submit" className="bg-brand-teal hover:bg-brand-teal/90 text-white">
                <Search className="w-4 h-4 mr-2" /> Apply Filters
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Logs Table Card */}
      <Card className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <CardTitle className="text-lg font-bold flex items-center text-slate-800 dark:text-slate-100">
            <Activity className="w-5 h-5 mr-2 text-brand-teal" /> Log Entries ({total})
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={fetchLogs} disabled={isLoading} className="text-slate-500">
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase border-b border-slate-100 dark:border-slate-800">
                  <th className="py-3.5 px-4 w-12 text-center"></th>
                  <th className="py-3.5 px-4 w-48">Timestamp</th>
                  <th className="py-3.5 px-4 w-44">Performer</th>
                  <th className="py-3.5 px-4 w-44">Action</th>
                  <th className="py-3.5 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <RefreshCw className="w-8 h-8 text-brand-teal animate-spin" />
                        <p>Loading activity logs...</p>
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      No matching log entries found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const hasDiffs = log.diffs && log.diffs.length > 0;
                    const isExpanded = expandedLogId === log.id;
                    return (
                      <React.Fragment key={log.id}>
                        <tr
                          className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${
                            isExpanded ? "bg-slate-50/30 dark:bg-slate-800/10" : ""
                          }`}
                        >
                          <td className="py-4 px-4 text-center">
                            {hasDiffs && (
                              <button
                                onClick={() => toggleExpandLog(log.id)}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-500"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </td>
                          <td className="py-4 px-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                            <div className="flex items-center space-x-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>{log.timestamp}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 font-semibold text-slate-700 dark:text-slate-300">
                            {log.userName || "System User"}
                            <div className="text-[10px] font-normal text-slate-400 font-mono">
                              {log.performedBy || "System"}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                log.action.includes("Created") || log.action.includes("In")
                                  ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                                  : log.action.includes("Deleted")
                                  ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                                  : log.action.includes("Updated")
                                  ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                                  : "bg-slate-50 text-slate-700 dark:bg-slate-900/20 dark:text-slate-400"
                              }`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-slate-600 dark:text-slate-400 max-w-xl truncate">
                            {log.details}
                          </td>
                        </tr>
                        {isExpanded && hasDiffs && (
                          <tr className="bg-slate-50/50 dark:bg-slate-800/10">
                            <td colSpan={5} className="py-3 px-6">
                              <Card className="border border-slate-200/60 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/40">
                                <CardHeader className="py-2.5 px-4 border-b border-slate-200/60 dark:border-slate-800">
                                  <CardTitle className="text-xs font-bold uppercase text-slate-500 flex items-center">
                                    <FileCode className="w-3.5 h-3.5 mr-1.5 text-brand-teal" /> Field Changes Diffs
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 space-y-3 font-mono text-xs">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {log.diffs?.map((diff, index) => (
                                      <div
                                        key={index}
                                        className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded shadow-xs"
                                      >
                                        <div className="text-brand-teal font-bold mb-1">{diff.field || "Value"}</div>
                                        <div className="grid grid-cols-2 gap-2 mt-1">
                                          <div className="p-1.5 bg-red-50/50 dark:bg-red-950/20 border border-red-100/50 dark:border-red-900/30 rounded text-red-700 dark:text-red-400">
                                            <span className="font-bold block text-[10px] text-red-500 uppercase">Old</span>
                                            <span className="break-all">{String(diff.old === null || diff.old === undefined ? "-" : diff.old)}</span>
                                          </div>
                                          <div className="p-1.5 bg-green-50/50 dark:bg-green-950/20 border border-green-100/50 dark:border-green-900/30 rounded text-green-700 dark:text-green-400">
                                            <span className="font-bold block text-[10px] text-green-500 uppercase">New</span>
                                            <span className="break-all">{String(diff.new === null || diff.new === undefined ? "-" : diff.new)}</span>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </CardContent>
                              </Card>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > itemsPerPage && (
        <TablePagination
          currentPage={currentPage}
          totalItems={total}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
          itemName="logs"
        />
      )}
    </div>
  );
}
