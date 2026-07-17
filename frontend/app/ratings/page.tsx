"use client";

import { useState, useMemo } from 'react';
import { useApi } from '@/hooks/useApi';
import { useUser } from '@/hooks/useUser';
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, ArrowLeft, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";

export default function RatingsPage() {
  const { data } = useApi();
  const { user } = useUser();
  const router = useRouter();
  
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date()
  });

  const employees = data?.employees || [];
  const allReports = (data as any)?.employeeDailyReports || [];
  
  const ratingData = useMemo(() => {
    let filteredReports = allReports.filter((r: any) => r.rating);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let start = new Date(today);
    let end = new Date(today);
    let applyDateFilter = false;

    if (ratingFilter === 'today') {
      applyDateFilter = true;
    } else if (ratingFilter === 'yesterday') {
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
      applyDateFilter = true;
    } else if (ratingFilter === 'last_week') {
      const day = today.getDay() || 7;
      start.setDate(today.getDate() - day - 6);
      end = new Date(start);
      end.setDate(end.getDate() + 6);
      applyDateFilter = true;
    } else if (ratingFilter === 'this_month') {
      start.setDate(1);
      applyDateFilter = true;
    } else if (ratingFilter === 'last_month') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
      applyDateFilter = true;
    } else if (ratingFilter === 'custom' && dateRange?.from) {
      start = new Date(dateRange.from);
      start.setHours(0,0,0,0);
      end = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
      end.setHours(0,0,0,0);
      applyDateFilter = true;
    }

    if (applyDateFilter) {
       const startStr = format(start, "yyyy-MM-dd");
       const endStr = format(end, "yyyy-MM-dd");
       filteredReports = filteredReports.filter((r: any) => r.date >= startStr && r.date <= endStr);
    }

    const employeeMap = new Map();
    employees.filter((e: any) => e.status?.trim()?.toLowerCase() === 'active').forEach((e: any) => {
      employeeMap.set(e.id, {
        id: e.id,
        name: e.name || `${e.firstName} ${e.lastName}`,
        department: e.department,
        totalRating: 0,
        count: 0
      });
    });

    filteredReports.forEach((r: any) => {
      const emp = employeeMap.get(r.employeeId);
      if (emp) {
        emp.totalRating += Number(r.rating);
        emp.count += 1;
      }
    });

    let result = Array.from(employeeMap.values())
      .filter(e => e.count > 0)
      .map(e => ({
        ...e,
        avgRating: (e.totalRating / e.count).toFixed(1)
      }))
      .sort((a, b) => Number(b.avgRating) - Number(a.avgRating));

    if (selectedEmployee !== 'all') {
      result = result.filter(e => e.id === selectedEmployee);
    }
    
    return result;
  }, [allReports, employees, ratingFilter, dateRange, selectedEmployee]);

  return (
    <div className="space-y-6 pb-10 mt-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
           <Button 
             variant="ghost" 
             className="p-2 h-9 w-9 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl border border-slate-200"
             onClick={() => router.back()}
           >
             <ArrowLeft className="w-4 h-4" />
           </Button>
           <div>
             <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
               <Star className="w-6 h-6 text-brand-teal fill-brand-teal" />
               Employee Ratings Overview
             </h1>
             <p className="text-xs text-slate-500 mt-1">View the average performance ratings of employees.</p>
           </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Select value={selectedEmployee} onValueChange={(v: any) => setSelectedEmployee(v)}>
            <SelectTrigger className="w-[200px] h-9 text-xs font-semibold bg-white border border-slate-200 rounded-xl">
              <SelectValue placeholder="All Employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employees
                .filter((e: any) => e.status?.trim()?.toLowerCase() === 'active')
                .map((emp: any) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name || `${emp.firstName} ${emp.lastName}`}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <Select value={ratingFilter} onValueChange={(v: any) => setRatingFilter(v)}>
            <SelectTrigger className="w-[160px] h-9 text-xs font-semibold bg-white border border-slate-200 rounded-xl">
              <SelectValue placeholder="Filter Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="last_week">Last Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          
          {ratingFilter === 'custom' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 px-3 text-xs font-bold text-slate-700 bg-white border-slate-200 rounded-xl">
                  <Calendar className="w-3.5 h-3.5 mr-2 text-slate-500" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}`
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    "Select Date Range"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 font-bold text-slate-500 text-[11px] uppercase tracking-wider">Employee</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-[11px] uppercase tracking-wider">Department</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-[11px] uppercase tracking-wider text-center">Days Verified</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-[11px] uppercase tracking-wider text-right">Avg Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ratingData.length > 0 ? (
                ratingData.map((emp, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                          {emp.name?.charAt(0)}
                        </div>
                        <span className="font-medium text-slate-700">{emp.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-500 border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                        {emp.department || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <span className="font-semibold text-slate-600 text-sm">{emp.count}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="px-3 py-1.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-xl font-black text-sm shadow-sm min-w-[60px] inline-flex items-center justify-center gap-1.5">
                        {emp.avgRating} <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic text-sm bg-slate-50/30">
                    No ratings found for the selected period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
