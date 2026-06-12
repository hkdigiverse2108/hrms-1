"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TablePagination } from "@/components/common/TablePagination";
import { exportToCSV } from "@/lib/export-utils";
import { useUserContext } from "@/context/UserContext";
import {
  MousePointerClick,
  Keyboard,
  Activity,
  Search,
  Calendar,
  TrendingUp,
  Download,
  Clock,
  ArrowUpDown,
  RefreshCw,
  Monitor,
  Globe,
} from "lucide-react";
import { API_URL } from "@/lib/config";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";

export default function ActivityTrackerPage() {
  const { user } = useUserContext();
  const [stats, setStats] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("Today");
  const [selectedEmployee, setSelectedEmployee] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Track live session statistics
  const [liveClicks, setLiveClicks] = useState(0);
  const [liveKeystrokes, setLiveKeystrokes] = useState(0);

  const isAdminOrHR = user?.role === "Admin" || user?.role === "HR";

  useEffect(() => {
    // Sync live clicks/keystrokes from window events
    const handleClick = () => setLiveClicks(prev => prev + 1);
    const handleKeyDown = () => setLiveKeystrokes(prev => prev + 1);

    window.addEventListener("click", handleClick);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("click", handleClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      
      const statsRes = await fetch(`${API_URL}/activity/stats`, { headers });
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      if (isAdminOrHR) {
        const empRes = await fetch(`${API_URL}/employees`, { headers });
        if (empRes.ok) {
          const empData = await empRes.json();
          setEmployees(empData);
        }
      }
    } catch (err) {
      console.error("Error fetching activity statistics:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter & Sort statistics
  const processedStats = useMemo(() => {
    let filtered = [...stats];

    // Role restrictions: regular employee only sees their own stats
    if (!isAdminOrHR) {
      const userId = user?.id || user?._id;
      filtered = filtered.filter(item => item.employeeId === userId);
    } else {
      // Admin filter by employee
      if (selectedEmployee !== "All") {
        filtered = filtered.filter(item => item.employeeId === selectedEmployee);
      }
    }

    // Filter by search query (employee name)
    if (searchQuery.trim() !== "") {
      filtered = filtered.filter(item =>
        item.employeeName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by Date
    if (dateFilter !== "All") {
      const today = new Date().toISOString().split("T")[0];
      if (dateFilter === "Today") {
        filtered = filtered.filter(item => item.date === today);
      } else if (dateFilter === "This Week") {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        filtered = filtered.filter(item => new Date(item.date) >= oneWeekAgo);
      } else if (dateFilter === "This Month") {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        filtered = filtered.filter(item => new Date(item.date) >= startOfMonth);
      }
    }

    // Sorting
    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (typeof aVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      } else {
        aVal = aVal || 0;
        bVal = bVal || 0;
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
    });

    return filtered;
  }, [stats, searchQuery, dateFilter, selectedEmployee, sortField, sortDirection, user, isAdminOrHR]);

  const totalClicks = useMemo(() => {
    return processedStats.reduce((sum, item) => sum + (item.clicks || 0), 0);
  }, [processedStats]);

  const totalKeystrokes = useMemo(() => {
    return processedStats.reduce((sum, item) => sum + (item.keystrokes || 0), 0);
  }, [processedStats]);

  // Aggregate user stats for Admin overview cards/charts
  const employeeAggregate = useMemo(() => {
    const aggregates: { [key: string]: any } = {};
    processedStats.forEach(item => {
      const empId = item.employeeId;
      if (!aggregates[empId]) {
        const emp = employees.find(e => e.id === empId);
        aggregates[empId] = {
          employeeId: empId,
          name: item.employeeName || "Unknown",
          avatar: emp?.profilePhoto || "",
          clicks: 0,
          keystrokes: 0,
          daysActive: 0
        };
      }
      aggregates[empId].clicks += item.clicks || 0;
      aggregates[empId].keystrokes += item.keystrokes || 0;
      aggregates[empId].daysActive += 1;
    });
    return Object.values(aggregates).sort((a, b) => (b.clicks + b.keystrokes) - (a.clicks + a.keystrokes));
  }, [processedStats, employees]);

  // Chart data for daily trend
  const trendData = useMemo(() => {
    const dailyMap: { [key: string]: { date: string; clicks: number; keystrokes: number } } = {};
    processedStats.forEach(item => {
      const d = item.date;
      if (!dailyMap[d]) {
        dailyMap[d] = { date: d, clicks: 0, keystrokes: 0 };
      }
      dailyMap[d].clicks += item.clicks || 0;
      dailyMap[d].keystrokes += item.keystrokes || 0;
    });

    return Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [processedStats]);

  // Aggregate application and domain durations from the logs
  const { topApps, topDomains } = useMemo(() => {
    const apps: { [key: string]: number } = {};
    const domains: { [key: string]: number } = {};

    processedStats.forEach(item => {
      if (item.applications) {
        Object.entries(item.applications).forEach(([app, secs]) => {
          const cleanApp = app.replace(/_/g, ".");
          apps[cleanApp] = (apps[cleanApp] || 0) + (secs as number);
        });
      }
      if (item.domains) {
        Object.entries(item.domains).forEach(([domain, secs]) => {
          const cleanDomain = domain.replace(/_/g, ".");
          domains[cleanDomain] = (domains[cleanDomain] || 0) + (secs as number);
        });
      }
    });

    const sortedApps = Object.entries(apps)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, val]) => ({ name, duration: val }));

    const sortedDomains = Object.entries(domains)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, val]) => ({ name, duration: val }));

    return { topApps: sortedApps, topDomains: sortedDomains };
  }, [processedStats]);

  const formatDuration = (secs: number) => {
    if (secs < 60) return `${secs}s`;
    if (secs < 3600) return `${Math.round(secs / 60)}m`;
    return `${(secs / 3600).toFixed(1)}h`;
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleExport = () => {
    const exportData = processedStats.map(item => ({
      Date: item.date,
      "Employee Name": item.employeeName,
      Clicks: item.clicks,
      Keystrokes: item.keystrokes,
      "Last Active": item.lastActive ? new Date(item.lastActive).toLocaleString() : "N/A"
    }));
    exportToCSV(exportData, `User_Activity_Report_${new Date().toISOString().slice(0, 10)}`);
  };

  // Pagination
  const paginatedStats = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedStats.slice(startIndex, startIndex + itemsPerPage);
  }, [processedStats, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(processedStats.length / itemsPerPage);

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Activity Tracker"
        description="Monitor user input statistics such as keyboard keypresses and mouse clicks."
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} size="sm" className="border-slate-200">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport} size="sm" className="border-brand-teal text-brand-teal hover:bg-brand-teal hover:text-white">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </PageHeader>

      {/* Main Stats Overviews */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        {/* Total Clicks Card */}
        <Card className="shadow-xs border-slate-200/80">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase">
              Total Mouse Clicks
            </CardTitle>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <MousePointerClick className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-800">
              {isLoading ? "..." : totalClicks.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Accumulated clicks for filtered period
            </p>
          </CardContent>
        </Card>

        {/* Total Keystrokes Card */}
        <Card className="shadow-xs border-slate-200/80">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase">
              Total Keystrokes
            </CardTitle>
            <div className="p-2 bg-pink-50 text-pink-600 rounded-lg">
              <Keyboard className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-800">
              {isLoading ? "..." : totalKeystrokes.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Accumulated key presses for filtered period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts & Leaderboard */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Trend Chart */}
        <Card className="lg:col-span-2 shadow-xs border-slate-200/80">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-brand-teal" />
              Input Activity Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {trendData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No activity trend data available for the selected period
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorKeys" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#ec4899" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tickLine={false} tick={{ fontSize: 11 }} />
                    <YAxis tickLine={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend iconType="circle" />
                    <Area
                      type="monotone"
                      dataKey="clicks"
                      name="Mouse Clicks"
                      stroke="#4f46e5"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorClicks)"
                    />
                    <Area
                      type="monotone"
                      dataKey="keystrokes"
                      name="Keystrokes"
                      stroke="#ec4899"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorKeys)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard Card (For Admins) or Stats summary (For Employees) */}
        <Card className="shadow-xs border-slate-200/80">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-600" />
              {isAdminOrHR ? "Most Active Employees" : "Your Activity Breakdown"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isAdminOrHR ? (
              <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {employeeAggregate.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-10">
                    No active statistics
                  </div>
                ) : (
                  employeeAggregate.slice(0, 5).map((item, idx) => (
                    <div key={item.employeeId} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-slate-400 w-4">#{idx + 1}</span>
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={item.avatar} />
                          <AvatarFallback className="bg-brand-light text-brand-teal text-xs font-bold">
                            {item.name?.split(" ").map((n: string) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-semibold text-slate-800 leading-tight">
                            {item.name}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Active {item.daysActive} day(s)
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-black text-slate-800">
                          {(item.clicks + item.keystrokes).toLocaleString()}
                        </div>
                        <div className="text-[9px] text-muted-foreground">
                          {item.clicks.toLocaleString()} C / {item.keystrokes.toLocaleString()} K
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              // Employee Stats Breakdowns
              <div className="space-y-6 py-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-sm text-slate-600 font-medium">Daily Average Clicks</span>
                  <span className="text-base font-extrabold text-slate-800">
                    {trendData.length ? Math.round(totalClicks / trendData.length).toLocaleString() : 0}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-sm text-slate-600 font-medium">Daily Average Keystrokes</span>
                  <span className="text-base font-extrabold text-slate-800">
                    {trendData.length ? Math.round(totalKeystrokes / trendData.length).toLocaleString() : 0}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-sm text-slate-600 font-medium">Click-to-Keystroke Ratio</span>
                  <span className="text-base font-extrabold text-slate-800">
                    {totalKeystrokes ? (totalClicks / totalKeystrokes).toFixed(2) : "0.00"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 font-medium">Total Tracked Days</span>
                  <span className="text-base font-extrabold text-slate-800">
                    {trendData.length} day(s)
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Applications and Websites */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Apps Card */}
        <Card className="shadow-xs border-slate-200/80">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Monitor className="h-5 w-5 text-indigo-600" />
              Most Used Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topApps.length === 0 ? (
                <div className="text-center text-muted-foreground text-xs py-10">
                  No application usage statistics tracked yet
                </div>
              ) : (
                topApps.map((item) => (
                  <div key={item.name} className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>{item.name}</span>
                      <span>{formatDuration(item.duration)}</span>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full"
                        style={{
                          width: `${(item.duration / (topApps[0]?.duration || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Websites Card */}
        <Card className="shadow-xs border-slate-200/80">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Globe className="h-5 w-5 text-teal-600" />
              Most Visited Websites
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topDomains.length === 0 ? (
                <div className="text-center text-muted-foreground text-xs py-10">
                  No website usage statistics tracked yet
                </div>
              ) : (
                topDomains.map((item) => (
                  <div key={item.name} className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>{item.name}</span>
                      <span>{formatDuration(item.duration)}</span>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-600 rounded-full"
                        style={{
                          width: `${(item.duration / (topDomains[0]?.duration || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtering & Detail Log Table */}
      <Card className="shadow-xs border-slate-200/80">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-4 gap-4 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-800">Detailed Logs</CardTitle>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* Admin Select Employee */}
            {isAdminOrHR && (
              <Select onValueChange={setSelectedEmployee} value={selectedEmployee}>
                <SelectTrigger className="w-full sm:w-[180px] bg-white">
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Employees</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Filter Date */}
            <Select onValueChange={setDateFilter} value={dateFilter}>
              <SelectTrigger className="w-full sm:w-[150px] bg-white">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Time</SelectItem>
                <SelectItem value="Today">Today</SelectItem>
                <SelectItem value="This Week">This Week</SelectItem>
                <SelectItem value="This Month">This Month</SelectItem>
              </SelectContent>
            </Select>

            {/* Search Input */}
            {isAdminOrHR && (
              <div className="relative w-full sm:w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search employee..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 bg-white"
                />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-xs font-semibold text-slate-700 border-b border-slate-100">
                <tr>
                  <th onClick={() => handleSort("date")} className="p-4 cursor-pointer hover:bg-slate-100 transition-colors select-none">
                    <div className="flex items-center gap-1">
                      Date <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th onClick={() => handleSort("employeeName")} className="p-4 cursor-pointer hover:bg-slate-100 transition-colors select-none">
                    <div className="flex items-center gap-1">
                      Employee <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th onClick={() => handleSort("clicks")} className="p-4 cursor-pointer hover:bg-slate-100 transition-colors select-none text-right">
                    <div className="flex items-center justify-end gap-1">
                      Clicks <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th onClick={() => handleSort("keystrokes")} className="p-4 cursor-pointer hover:bg-slate-100 transition-colors select-none text-right">
                    <div className="flex items-center justify-end gap-1">
                      Keystrokes <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="p-4 text-right">Last Sync Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-brand-teal" />
                      Loading logs...
                    </td>
                  </tr>
                ) : paginatedStats.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No logs found matching your filters
                    </td>
                  </tr>
                ) : (
                  paginatedStats.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-semibold text-slate-900">
                        {new Date(item.date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-800">{item.employeeName}</div>
                        <div className="text-[10px] text-muted-foreground">ID: {item.employeeId}</div>
                      </td>
                      <td className="p-4 text-right font-medium text-indigo-600">
                        {(item.clicks || 0).toLocaleString()}
                      </td>
                      <td className="p-4 text-right font-medium text-pink-600">
                        {(item.keystrokes || 0).toLocaleString()}
                      </td>
                      <td className="p-4 text-right text-xs text-muted-foreground">
                        {item.lastActive ? new Date(item.lastActive).toLocaleTimeString() : "N/A"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {processedStats.length > itemsPerPage && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-end">
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
