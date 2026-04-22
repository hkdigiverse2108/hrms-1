"use client";

import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Plus, Sun, Thermometer, Clock, MoreHorizontal, PartyPopper, Church, Briefcase, Flag, Gift, ChevronLeft, ChevronRight } from "lucide-react";
import { TablePagination } from "@/components/common/TablePagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "antd";
import dayjs from "dayjs";

const leaveHistory = [
  { id: 1, type: "Annual Leave", typeIcon: Sun, dateRange: "May 20 - May 26, 2026", reason: "Holidays", duration: "5 Days", requestedOn: "May 15, 2026", status: "Pending" },
  { id: 2, type: "Annual Leave", typeIcon: Sun, dateRange: "Feb 12 - Feb 13, 2026", reason: "Personal trip", duration: "2 Days", requestedOn: "Mar 28, 2026", status: "Approved" },
  { id: 3, type: "Sick Leave", typeIcon: Thermometer, dateRange: "Feb 07 - Feb 09, 2026", reason: "Flu", duration: "3 Days", requestedOn: "Feb 02, 2026", status: "Approved" },
  { id: 4, type: "Annual Leave", typeIcon: Sun, dateRange: "Jan 25 - Jan 27, 2026", reason: "Family event", duration: "3 Days", requestedOn: "Jan 20, 2026", status: "Approved" },
];

const upcomingTimeOff = [
  { id: 1, type: "Annual Leave", typeIcon: Sun, dateRange: "May 20 - May 26, 2026", reason: "Summer Vacation", duration: "5 Days", requestedOn: "Feb 15, 2026", status: "Approved" },
  { id: 2, type: "Annual Leave", typeIcon: Sun, dateRange: "Aug 10 - Aug 12, 2026", reason: "Personal trip", duration: "3 Days", requestedOn: "Mar 01, 2026", status: "Pending" },
  { id: 3, type: "Unpaid Leave", typeIcon: Clock, dateRange: "Sep 05 - Sep 06, 2026", reason: "Moving houses", duration: "2 Days", requestedOn: "Apr 10, 2026", status: "Approved" },
];

const publicHolidays = [
  { id: 1, name: "New Year's Day", icon: PartyPopper, date: "January 1, 2026", duration: "1 Day", day: "Wednesday", type: "National" },
  { id: 2, name: "Good Friday", icon: Church, date: "April 18, 2026", duration: "1 Day", day: "Friday", type: "National" },
  { id: 3, name: "Labour Day", icon: Briefcase, date: "May 01, 2026", duration: "1 Day", day: "Thursday", type: "National" },
  { id: 4, name: "Independence Day", icon: Flag, date: "Aug 15, 2026", duration: "1 Day", day: "Friday", type: "National" },
  { id: 5, name: "Christmas Day", icon: Gift, date: "December 25, 2026", duration: "1 Day", day: "Thursday", type: "National" },
];



export default function LeavePage() {
  const [activeTab, setActiveTab] = useState("history");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave"
        description="View your leave balances, history, and upcoming time off."
      >
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
          <Button variant="outline" className="shadow-sm w-full sm:w-auto">
            <CalendarIcon className="w-4 h-4 mr-2" />
            View Calendar
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-brand-teal hover:bg-brand-teal-light text-white font-medium shadow-sm w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Request Time Off
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Request Time Off</DialogTitle>
              <DialogDescription className="sr-only">Submit a new request for time off</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="leave-type">Leave Type</Label>
                <Select defaultValue="annual">
                  <SelectTrigger id="leave-type" className="w-full">
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual">Annual Leave</SelectItem>
                    <SelectItem value="sick">Sick Leave</SelectItem>
                    <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Balance: 9 Days Available</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 flex flex-col">
                  <Label htmlFor="start-date">Start Date</Label>
                  <DatePicker 
                    id="start-date" 
                    defaultValue={dayjs()} 
                    className="w-full h-9 hover:border-brand-teal focus-within:border-brand-teal focus-within:ring-brand-teal" 
                    format="DD-MM-YYYY"
                  />
                </div>
                <div className="space-y-2 flex flex-col">
                  <Label htmlFor="end-date">End Date</Label>
                  <DatePicker 
                    id="end-date" 
                    defaultValue={dayjs()} 
                    className="w-full h-9 hover:border-brand-teal focus-within:border-brand-teal focus-within:ring-brand-teal" 
                    format="DD-MM-YYYY"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <Label className="text-base">Half Day Request</Label>
                  <p className="text-xs text-muted-foreground">Apply as a half day for the start or end date</p>
                </div>
                <Switch />
              </div>

              <div className="bg-brand-light rounded-lg p-3 flex gap-3 border border-brand-teal/20 mt-4">
                <CalendarIcon className="w-5 h-5 text-brand-teal shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-brand-teal">
                  5 days will be deducted from your Annual Leave balance.<br />
                  <span className="font-normal">(Excludes weekends)</span>
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea 
                  id="reason" 
                  placeholder="Reason for leave..." 
                  defaultValue="Christmas holidays"
                  className="resize-none min-h-[80px]" 
                />
              </div>
            </div>
            <DialogFooter>
              <DialogTrigger asChild>
                <Button variant="outline">Cancel</Button>
              </DialogTrigger>
              <Button className="bg-brand-teal hover:bg-brand-teal-light text-white">Submit Request</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </PageHeader>

      {/* Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Annual Leave Card */}
        <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <span className="font-medium text-sm">Annual Leave</span>
            <div className="p-1.5 bg-brand-light rounded-md">
              <Sun className="w-4 h-4 text-brand-teal" />
            </div>
          </div>
          <div className="mb-6">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-foreground">9</span>
              <span className="text-sm text-muted-foreground">Days Available</span>
            </div>
          </div>
          <div className="flex justify-between text-sm pt-4 border-t border-border">
            <div>
              <div className="text-muted-foreground mb-1">Used</div>
              <div className="font-medium">5 Days</div>
            </div>
            <div className="text-right">
              <div className="text-muted-foreground mb-1">Allowance</div>
              <div className="font-medium">14 Days</div>
            </div>
          </div>
        </div>

        {/* Sick Leave Card */}
        <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <span className="font-medium text-sm">Sick Leave</span>
            <div className="p-1.5 bg-brand-light rounded-md">
              <Thermometer className="w-4 h-4 text-brand-teal" />
            </div>
          </div>
          <div className="mb-6">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-foreground">4</span>
              <span className="text-sm text-muted-foreground">Days Available</span>
            </div>
          </div>
          <div className="flex justify-between text-sm pt-4 border-t border-border">
            <div>
              <div className="text-muted-foreground mb-1">Used</div>
              <div className="font-medium">3 Days</div>
            </div>
            <div className="text-right">
              <div className="text-muted-foreground mb-1">Allowance</div>
              <div className="font-medium">7 Days</div>
            </div>
          </div>
        </div>

        {/* Unpaid Leave Card */}
        <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <span className="font-medium text-sm">Unpaid Leave</span>
            <div className="p-1.5 bg-brand-light rounded-md">
              <Clock className="w-4 h-4 text-brand-teal" />
            </div>
          </div>
          <div className="mb-6">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-foreground">0</span>
              <span className="text-sm text-muted-foreground">Days Taken</span>
            </div>
          </div>
          <div className="flex justify-between text-sm pt-4 border-t border-border">
            <div>
              <div className="text-muted-foreground mb-1">Current Year</div>
              <div className="font-medium">0 Days</div>
            </div>
            <div className="text-right">
              <div className="text-muted-foreground mb-1">Limit</div>
              <div className="font-medium">No limit</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <div className="bg-transparent mt-8">
        <Tabs defaultValue="history" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="bg-transparent border-b border-border w-full justify-start rounded-none p-0 h-auto space-x-4 sm:space-x-6 overflow-x-auto flex-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <TabsTrigger 
              value="history" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand-teal data-[state=active]:text-brand-teal text-muted-foreground data-[state=active]:bg-transparent px-1 py-3 data-[state=active]:shadow-none font-medium"
            >
              Leave History
            </TabsTrigger>
            <TabsTrigger 
              value="upcoming" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand-teal data-[state=active]:text-brand-teal text-muted-foreground data-[state=active]:bg-transparent px-1 py-3 data-[state=active]:shadow-none font-medium"
            >
              Upcoming Time Off
            </TabsTrigger>
            <TabsTrigger 
              value="public" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand-teal data-[state=active]:text-brand-teal text-muted-foreground data-[state=active]:bg-transparent px-1 py-3 data-[state=active]:shadow-none font-medium"
            >
              Public Holidays
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="history" className="mt-6 bg-white border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-border gap-4">
              <h3 className="font-bold text-lg">Recent Requests</h3>
              <div className="flex w-full sm:w-auto gap-3">
                <Select defaultValue="all">
                  <SelectTrigger className="flex-1 sm:w-[140px] h-9 bg-gray-50/50">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="2026">
                  <SelectTrigger className="flex-1 sm:w-[120px] h-9 bg-gray-50/50">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2026">Year: 2026</SelectItem>
                    <SelectItem value="2025">Year: 2025</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-xs text-muted-foreground font-semibold bg-brand-light/40 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-medium tracking-wider">Leave Type</th>
                    <th className="px-6 py-4 font-medium tracking-wider">Date Range</th>
                    <th className="px-6 py-4 font-medium tracking-wider">Duration</th>
                    <th className="px-6 py-4 font-medium tracking-wider">Requested On</th>
                    <th className="px-6 py-4 font-medium tracking-wider">Status</th>
                    <th className="px-6 py-4 font-medium tracking-wider text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {leaveHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-brand-light rounded-md">
                            <item.typeIcon className="w-4 h-4 text-brand-teal" />
                          </div>
                          <span className="font-medium text-foreground">{item.type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium">{item.dateRange}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{item.reason}</div>
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground">{item.duration}</td>
                      <td className="px-6 py-4 text-muted-foreground">{item.requestedOn}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-md ${
                          item.status === 'Approved' 
                            ? 'bg-brand-light text-brand-teal' 
                            : 'bg-orange-50 text-orange-600'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination />
          </TabsContent>

          <TabsContent value="upcoming" className="mt-6 bg-white border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-border gap-4">
              <h3 className="font-bold text-lg">Upcoming Requests</h3>
              <div className="flex w-full sm:w-auto gap-3">
                <Select defaultValue="all">
                  <SelectTrigger className="flex-1 sm:w-[140px] h-9 bg-gray-50/50">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="2026">
                  <SelectTrigger className="w-[120px] h-9 bg-gray-50/50">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2026">Year: 2026</SelectItem>
                    <SelectItem value="2025">Year: 2025</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-xs text-muted-foreground font-semibold bg-brand-light/40 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-medium tracking-wider">Leave Type</th>
                    <th className="px-6 py-4 font-medium tracking-wider">Date Range</th>
                    <th className="px-6 py-4 font-medium tracking-wider">Duration</th>
                    <th className="px-6 py-4 font-medium tracking-wider">Requested On</th>
                    <th className="px-6 py-4 font-medium tracking-wider">Status</th>
                    <th className="px-6 py-4 font-medium tracking-wider text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {upcomingTimeOff.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-brand-light rounded-md">
                            <item.typeIcon className="w-4 h-4 text-brand-teal" />
                          </div>
                          <span className="font-medium text-foreground">{item.type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium">{item.dateRange}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{item.reason}</div>
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground">{item.duration}</td>
                      <td className="px-6 py-4 text-muted-foreground">{item.requestedOn}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-md ${
                          item.status === 'Approved' 
                            ? 'bg-brand-light text-brand-teal' 
                            : 'bg-orange-50 text-orange-600'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination />
          </TabsContent>

          <TabsContent value="public" className="mt-6 bg-white border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-border gap-4">
              <h3 className="font-bold text-lg">Public Holidays</h3>
              <div className="flex w-full sm:w-auto gap-3">
                <Select defaultValue="2026">
                  <SelectTrigger className="flex-1 sm:w-[120px] h-9 bg-gray-50/50">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2026">Year: 2026</SelectItem>
                    <SelectItem value="2025">Year: 2025</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-xs text-muted-foreground font-semibold bg-brand-light/40 border-b border-border uppercase">
                  <tr>
                    <th className="px-6 py-4 font-medium tracking-wider">Holiday Name</th>
                    <th className="px-6 py-4 font-medium tracking-wider">Date</th>
                    <th className="px-6 py-4 font-medium tracking-wider">Duration</th>
                    <th className="px-6 py-4 font-medium tracking-wider">Day of Week</th>
                    <th className="px-6 py-4 font-medium tracking-wider">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {publicHolidays.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-brand-light rounded-md">
                            <item.icon className="w-4 h-4 text-brand-teal" />
                          </div>
                          <span className="font-medium text-foreground">{item.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-foreground">{item.date}</span>
                      </td>
                      <td className="px-6 py-4 font-medium text-muted-foreground">{item.duration}</td>
                      <td className="px-6 py-4 font-medium text-foreground">{item.day}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-indigo-50 text-indigo-600">
                          {item.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
