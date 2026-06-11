'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Calendar, Download, Loader2, TrendingUp, Users, Target, CheckCircle2, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { exportToPDF } from "@/lib/export-utils"
import { API_URL } from '@/lib/config'
import dayjs from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween'

dayjs.extend(isBetween)

interface Lead {
  id: string;
  company: string;
  status: string;
  date: string;
  closedDate?: string;
  assignedTo: string | string[];
  expectedIncome?: string | number;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  name?: string;
  department?: string;
  employeeId?: string;
}

interface SalesTarget {
  id: string;
  employeeId: string;
  incentiveAmount?: number;
  targetAmount?: number;
  month?: string;
  year?: number | string;
  // ... other fields
}

type SortKey = 'name' | 'duration' | 'assigned' | 'active' | 'hot' | 'lost' | 'won' | 'winRate' | 'target' | 'revenue' | 'incentivesEarned';

export function SalesAnalytics() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [targets, setTargets] = useState<SalesTarget[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filters
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all')
  const [selectedSource, setSelectedSource] = useState<string>('all')

  // Sorting
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'duration',
    direction: 'desc'
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token')
        const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {}

        const [leadsRes, empRes, targetsRes] = await Promise.all([
          fetch(`${API_URL}/leads`, { headers }),
          fetch(`${API_URL}/employees`, { headers }),
          fetch(`${API_URL}/sales-targets`, { headers })
        ])

        if (leadsRes.ok) {
          const leadsData = await leadsRes.json()
          setLeads(leadsData)
        }
        if (empRes.ok) {
          const empData = await empRes.json()
          setEmployees(empData)
        }
        if (targetsRes.ok) {
          const targetsData = await targetsRes.json()
          setTargets(targetsData)
        }
      } catch (err) {
        console.error("Failed to load sales data", err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const parseIncome = (income: any): number => {
    if (!income) return 0;
    const str = String(income).replace(/[^0-9.]/g, '');
    return parseFloat(str) || 0;
  }

  // Memoized filtered data
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // Date Filter
      let matchesDate = true;
      if (dateRange.start && dateRange.end) {
        const leadDate = dayjs(lead.date);
        matchesDate = leadDate.isBetween(dateRange.start, dateRange.end, 'day', '[]');
      } else if (dateRange.start) {
        matchesDate = dayjs(lead.date).isAfter(dayjs(dateRange.start).subtract(1, 'day'));
      } else if (dateRange.end) {
        matchesDate = dayjs(lead.date).isBefore(dayjs(dateRange.end).add(1, 'day'));
      }

      // Employee Filter
      let matchesEmp = true;
      if (selectedEmployee !== 'all') {
        const assignedList = Array.isArray(lead.assignedTo) ? lead.assignedTo : (lead.assignedTo ? [lead.assignedTo] : []);
        matchesEmp = assignedList.some(name => name.toLowerCase() === selectedEmployee.toLowerCase());
      }

      // Source Filter
      let matchesSource = true;
      if (selectedSource !== 'all') {
        matchesSource = (lead.source || "Unknown").toLowerCase() === selectedSource.toLowerCase();
      }

      return matchesDate && matchesEmp && matchesSource;
    });
  }, [leads, dateRange, selectedEmployee, selectedSource]);

  // Derived Metrics (Month by Month)
  const metrics = useMemo(() => {
    const totalLeads = filteredLeads.length;
    const wonLeads = filteredLeads.filter(l => l.status === "Client Won");
    const activeStatuses = ["lead", "contacted", "proposal sent"];
    const activePipeline = filteredLeads.filter(l => activeStatuses.includes((l.status || "").toLowerCase())).length;
    const totalRevenue = wonLeads.reduce((sum, l) => sum + parseIncome(l.expectedIncome), 0);
    const winRate = totalLeads > 0 ? ((wonLeads.length / totalLeads) * 100).toFixed(1) : "0.0";

    const empStats: Record<string, any> = {};

    // Group leads by Employee AND Month
    filteredLeads.forEach(l => {
      const assignedList = Array.isArray(l.assignedTo) ? l.assignedTo : (l.assignedTo ? [l.assignedTo] : []);
      if (assignedList.length === 0) assignedList.push("Unassigned");
      const leadDate = dayjs(l.date);
      if (!leadDate.isValid()) return;
      
      const monthStr = leadDate.format('MMMM');
      const yearStr = leadDate.year().toString();
      const monthKeySuffix = `${monthStr}-${yearStr}`;

      assignedList.forEach(empNameRaw => {
        const nameStr = typeof empNameRaw === 'string' ? empNameRaw : String(empNameRaw || "Unassigned");
        const empName = nameStr;
        const normalizedName = empName.trim().toLowerCase().replace(/\s+/g, ' ');
        const key = `${normalizedName}_${monthKeySuffix}`;
        
        if (!empStats[key]) {
          const emp = employees.find(e => {
            const eName = e.name || `${e.firstName} ${e.lastName}`;
            return eName.trim().toLowerCase().replace(/\s+/g, ' ') === normalizedName;
          });
          
          const empTargets = targets.filter(t => {
            const tName = t.employeeName?.trim().toLowerCase().replace(/\s+/g, ' ');
            return tName === normalizedName && 
                   t.month === monthStr && 
                   t.year?.toString() === yearStr;
          });
          let totalIncentive = empTargets.reduce((sum, t) => sum + parseFloat((t.incentiveAmount || 0).toString()), 0);
          let totalTarget = empTargets.reduce((sum, t) => sum + parseFloat((t.targetAmount || 0).toString()), 0);

          empStats[key] = { 
            name: empName, 
            empId: emp?.employeeId || emp?.id || 'N/A',
            department: emp?.department || 'Sales',
            monthStr,
            yearStr,
            duration: `${monthStr.substring(0,3)} ${yearStr}`,
            monthDateValue: leadDate.startOf('month').valueOf(), // numeric value for sorting
            assigned: 0, 
            active: 0,
            hot: 0,
            lost: 0,
            won: 0, 
            target: totalTarget,
            revenue: 0,
            incentivesEarned: totalIncentive
          };
        }
        
        empStats[key].assigned += 1;
        const income = parseIncome(l.expectedIncome);

        if (l.status === "Client Won") {
          empStats[key].won += 1;
          empStats[key].revenue += income;
        } else if (l.status === "Client Lost" || l.status === "Lost") {
          empStats[key].lost += 1;
        } else if (l.status === "Hot") {
          empStats[key].hot += 1;
        } else if (["lead", "contacted", "proposal sent"].includes((l.status || "").toLowerCase())) {
          empStats[key].active += 1;
        }
      });
    });

    const employeeData = Object.values(empStats).map(emp => {
      return {
        ...emp,
        winRate: emp.assigned > 0 ? (emp.won / emp.assigned) * 100 : 0
      };
    });

    const totalTargetValue = employeeData.reduce((sum, emp) => sum + emp.target, 0);

    let topPerformer = "N/A";
    let maxRev = 0;
    employeeData.forEach(emp => {
      if (emp.revenue > maxRev) {
        maxRev = emp.revenue;
        topPerformer = emp.name;
      }
    });
    if (maxRev === 0 && employeeData.length > 0) topPerformer = "No Revenue Yet";

    return { totalLeads, wonLeads: wonLeads.length, totalRevenue, winRate, employeeData, totalTargetValue, activePipeline, topPerformer };
  }, [filteredLeads, employees, targets]);

  // Apply Sort
  const displayData = useMemo(() => {
    let data = [...metrics.employeeData];

    if (sortConfig.key) {
      data.sort((a, b) => {
        // Special handling for chronological sorting of months
        let valA = sortConfig.key === 'duration' ? a.monthDateValue : a[sortConfig.key];
        let valB = sortConfig.key === 'duration' ? b.monthDateValue : b[sortConfig.key];
        
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [metrics.employeeData, sortConfig]);

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40 group-hover:opacity-100" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-3 h-3 ml-1 text-brand-teal" /> 
      : <ArrowDown className="w-3 h-3 ml-1 text-brand-teal" />;
  };

  const setQuickDate = (type: 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'ytd') => {
    const now = dayjs();
    switch (type) {
      case 'thisMonth':
        setDateRange({ start: now.startOf('month').format('YYYY-MM-DD'), end: now.endOf('month').format('YYYY-MM-DD') });
        break;
      case 'lastMonth':
        const lastM = now.subtract(1, 'month');
        setDateRange({ start: lastM.startOf('month').format('YYYY-MM-DD'), end: lastM.endOf('month').format('YYYY-MM-DD') });
        break;
      case 'thisQuarter':
        const quarterStartMonth = Math.floor(now.month() / 3) * 3;
        const startOfQ = now.month(quarterStartMonth).startOf('month');
        const endOfQ = startOfQ.add(2, 'month').endOf('month');
        setDateRange({ start: startOfQ.format('YYYY-MM-DD'), end: endOfQ.format('YYYY-MM-DD') });
        break;
      case 'ytd':
        setDateRange({ start: now.startOf('year').format('YYYY-MM-DD'), end: now.endOf('year').format('YYYY-MM-DD') });
        break;
    }
  };

  const handleExport = () => {
    const exportData = displayData.map(row => ({
      'Employee Details': row.name,
      'Month': row.duration,
      'Assigned': row.assigned,
      'Active': row.active,
      'Hot': row.hot,
      'Won': row.won,
      'Lost': row.lost,
      'Win Rate': row.winRate.toFixed(1) + '%',
      'Target': row.target,
      'Revenue': row.revenue,
      'Incentive': row.incentive
    }));
    exportToPDF(exportData, 'monthly-sales-performance')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <Input 
              type="date" 
              className="h-9 text-xs w-[140px]" 
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              placeholder="Start Date"
            />
            <span className="text-slate-400 text-xs">to</span>
            <Input 
              type="date" 
              className="h-9 text-xs w-[140px]" 
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              placeholder="End Date"
            />
          </div>
          <div className="flex items-center gap-1.5 pl-6">
            <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 rounded-full" onClick={() => setQuickDate('thisMonth')}>This Month</Button>
            <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 rounded-full" onClick={() => setQuickDate('lastMonth')}>Last Month</Button>
            <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 rounded-full" onClick={() => setQuickDate('thisQuarter')}>This Quarter</Button>
            <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 rounded-full" onClick={() => setQuickDate('ytd')}>YTD</Button>
          </div>
        </div>

        <div className="flex items-center gap-2 border-l pl-4 border-slate-200">
          <Users className="w-4 h-4 text-slate-400" />
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger className="h-9 w-[180px] text-xs">
              <SelectValue placeholder="Filter Employee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {Array.from(new Set(employees.filter(e => e.department?.toLowerCase() === 'sales').map(emp => emp.name || `${emp.firstName} ${emp.lastName}`))).map((name, idx) => (
                <SelectItem key={idx} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 border-l pl-4 border-slate-200">
          <Select value={selectedSource} onValueChange={setSelectedSource}>
            <SelectTrigger className="h-9 w-[160px] text-xs">
              <SelectValue placeholder="Filter Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {Array.from(new Set(leads.map(l => l.source || "Unknown").filter(Boolean))).map((src, idx) => (
                <SelectItem key={idx} value={src}>{src}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto flex gap-2">
          {(dateRange.start || dateRange.end || selectedEmployee !== 'all' || selectedSource !== 'all') && (
            <Button 
              variant="ghost" 
              className="h-9 text-xs" 
              onClick={() => { 
                setDateRange({ start: '', end: '' }); 
                setSelectedEmployee('all'); 
                setSelectedSource('all');
              }}
            >
              Clear Filters
            </Button>
          )}
          <Button variant="outline" className="h-9 text-xs bg-slate-50" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" /> Download PDF
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        
        <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow relative overflow-hidden">
          <CardContent className="p-4 relative z-10">
            <div className="flex items-center justify-between mb-1">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Target className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Leads</p>
            <p className="text-xl font-black text-slate-800 mt-0.5">{metrics.totalLeads}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow relative overflow-hidden">
          <CardContent className="p-4 relative z-10">
            <div className="flex items-center justify-between mb-1">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Converted</p>
            <p className="text-xl font-black text-slate-800 mt-0.5">{metrics.wonLeads}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow relative overflow-hidden">
          <CardContent className="p-4 relative z-10">
            <div className="flex items-center justify-between mb-1">
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Win Rate</p>
            <p className="text-xl font-black text-slate-800 mt-0.5">{metrics.winRate}%</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow relative overflow-hidden">
          <CardContent className="p-4 relative z-10">
            <div className="flex items-center justify-between mb-1">
              <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
                <Target className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Leads</p>
            <p className="text-xl font-black text-slate-800 mt-0.5">{metrics.activePipeline}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow relative overflow-hidden">
          <CardContent className="p-4 relative z-10">
            <div className="flex items-center justify-between mb-1">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <span className="font-serif font-bold text-base leading-none w-4 h-4 flex items-center justify-center">₹</span>
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Rev</p>
            <p className="text-xl font-black text-slate-800 mt-0.5">₹{metrics.totalRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow relative overflow-hidden">
          <CardContent className="p-4 relative z-10">
            <div className="flex items-center justify-between mb-1">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <Target className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Target</p>
            <p className="text-xl font-black text-slate-800 mt-0.5">₹{metrics.totalTargetValue.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>


      {/* Employee Data Table */}
      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between py-4">
          <CardTitle className="text-sm font-bold text-slate-700">Monthly Performance Details</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[11px] tracking-wider cursor-pointer group" onClick={() => handleSort('name')}>
                  <div className="flex items-center">Employee Details {renderSortIcon('name')}</div>
                </th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[11px] tracking-wider cursor-pointer group text-center" onClick={() => handleSort('duration')}>
                  <div className="flex items-center justify-center">Month {renderSortIcon('duration')}</div>
                </th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[11px] tracking-wider cursor-pointer group text-center" onClick={() => handleSort('assigned')}>
                  <div className="flex items-center justify-center">Assigned {renderSortIcon('assigned')}</div>
                </th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[11px] tracking-wider cursor-pointer group text-center" onClick={() => handleSort('active')}>
                  <div className="flex items-center justify-center">Active {renderSortIcon('active')}</div>
                </th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[11px] tracking-wider cursor-pointer group text-center" onClick={() => handleSort('hot')}>
                  <div className="flex items-center justify-center">Hot {renderSortIcon('hot')}</div>
                </th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[11px] tracking-wider cursor-pointer group text-center" onClick={() => handleSort('won')}>
                  <div className="flex items-center justify-center">Won {renderSortIcon('won')}</div>
                </th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[11px] tracking-wider cursor-pointer group text-center" onClick={() => handleSort('lost')}>
                  <div className="flex items-center justify-center">Lost {renderSortIcon('lost')}</div>
                </th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[11px] tracking-wider cursor-pointer group text-right" onClick={() => handleSort('winRate')}>
                  <div className="flex items-center justify-end">Win Rate {renderSortIcon('winRate')}</div>
                </th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[11px] tracking-wider cursor-pointer group text-right" onClick={() => handleSort('target')}>
                  <div className="flex items-center justify-end">Target {renderSortIcon('target')}</div>
                </th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[11px] tracking-wider cursor-pointer group text-right" onClick={() => handleSort('revenue')}>
                  <div className="flex items-center justify-end">Revenue {renderSortIcon('revenue')}</div>
                </th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[11px] tracking-wider cursor-pointer group text-right bg-indigo-50/50" onClick={() => handleSort('incentivesEarned')}>
                  <div className="flex items-center justify-end text-indigo-700">Incentive {renderSortIcon('incentivesEarned')}</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayData.map((emp, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-3">
                    <p className="font-bold text-slate-700">{emp.name}</p>
                  </td>
                  <td className="px-6 py-3 text-center text-xs font-medium text-slate-500">{emp.duration}</td>
                  <td className="px-6 py-3 text-center text-slate-600">{emp.assigned}</td>
                  <td className="px-6 py-3 text-center text-slate-600">{emp.active}</td>
                  <td className="px-6 py-3 text-center">
                    <span className={emp.hot > 0 ? "text-orange-600 font-medium" : "text-slate-400"}>{emp.hot}</span>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className="bg-emerald-50 text-emerald-600 px-2.5 py-0.5 rounded-md text-xs font-bold">{emp.won}</span>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className={emp.lost > 0 ? "text-red-500 font-medium" : "text-slate-400"}>{emp.lost}</span>
                  </td>
                  <td className="px-6 py-3 text-right text-slate-600 font-medium">{emp.winRate.toFixed(1)}%</td>
                  <td className="px-6 py-3 text-right font-medium text-slate-700">₹{emp.target.toLocaleString()}</td>
                  <td className="px-6 py-3 text-right font-bold text-emerald-600">₹{emp.revenue.toLocaleString()}</td>
                  <td className="px-6 py-3 text-right font-bold text-indigo-600 bg-indigo-50/20 border-l border-slate-50">₹{emp.incentivesEarned.toLocaleString()}</td>
                </tr>
              ))}
              {displayData.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center">
                    <p className="text-slate-500 font-medium">No results found</p>
                    <p className="text-slate-400 text-xs mt-1">Try adjusting your filters or search query.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
