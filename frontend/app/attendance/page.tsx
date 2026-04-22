"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TablePagination } from "@/components/common/TablePagination";
import { DatePicker, TimePicker } from "antd";
import dayjs from "dayjs";
import { 
  Download, 
  Clock, 
  Calendar as CalendarIcon, 
  Briefcase, 
  CheckCircle2, 
  Eye,
  MapPin
} from "lucide-react";

const attendanceData = [
  { id: '01', date: 'April 18, 2026', currentStatus: 'break-out', status: 'Present', checkIn: '09:34 AM', checkOut: '-', break: '46Min', late: '-', overtime: '-', prodHrs: '3H 45Min', isProdGreen: true },
  { id: '02', date: 'April 17, 2026', currentStatus: 'punch-out', status: 'Present', checkIn: '09:30 AM', checkOut: '06:45 PM', break: '8Min', late: '-', overtime: '1H 6Min', prodHrs: '9H 6Min', isProdGreen: true },
  { id: '03', date: 'April 16, 2026', currentStatus: 'punch-out', status: 'Present', checkIn: '09:36 AM', checkOut: '07:15 PM', break: '1H 33Min', late: '-', overtime: '5Min', prodHrs: '8H 5Min', isProdGreen: true },
  { id: '04', date: 'April 15, 2026', currentStatus: 'punch-out', status: 'Present', checkIn: '09:32 AM', checkOut: '06:39 PM', break: '55Min', late: '-', overtime: '12Min', prodHrs: '8H 12Min', isProdGreen: true },
  { id: '05', date: 'April 14, 2026', currentStatus: 'punch-out', status: 'Present', checkIn: '09:32 AM', checkOut: '06:32 PM', break: '53Min', late: '-', overtime: '7Min', prodHrs: '8H 7Min', isProdGreen: true },
  { id: '06', date: 'April 13, 2026', currentStatus: 'punch-out', status: 'Present', checkIn: '09:29 AM', checkOut: '06:31 PM', break: '57Min', late: '-', overtime: '4Min', prodHrs: '8H 4Min', isProdGreen: true },
  { id: '07', date: 'April 12, 2026', currentStatus: 'punch-out', status: 'Present', checkIn: '09:41 AM', checkOut: '06:38 PM', break: '52Min', late: '-', overtime: '4Min', prodHrs: '8H 4Min', isProdGreen: true },
  { id: '08', date: 'April 11, 2026', currentStatus: 'punch-out', status: 'Present', checkIn: '09:30 AM', checkOut: '06:32 PM', break: '57Min', late: '-', overtime: '4Min', prodHrs: '8H 4Min', isProdGreen: true },
];

export default function AttendancePage() {
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [recoverModalOpen, setRecoverModalOpen] = useState(false);

  const CalendarWidget = () => (
    <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-foreground text-lg">October 2024</h3>
        <div className="bg-brand-light/50 text-brand-teal text-xs font-medium px-2 py-1 rounded-md">
          22 present
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-2 text-center text-sm mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={i} className="text-muted-foreground font-semibold text-xs py-2">{day}</div>
        ))}
        
        <div className="py-2 text-foreground bg-gray-50 rounded-md m-0.5">1</div>
        <div className="py-2 text-brand-teal bg-brand-light/40 rounded-md m-0.5 font-medium">2</div>
        <div className="py-2 text-brand-teal bg-brand-light/40 rounded-md m-0.5 font-medium">3</div>
        <div className="py-2 text-brand-teal bg-brand-light/40 rounded-md m-0.5 font-medium">4</div>
        <div className="py-2 text-brand-teal bg-brand-light/40 rounded-md m-0.5 font-medium">5</div>
        <div className="py-2 text-brand-teal bg-brand-light/40 rounded-md m-0.5 font-medium">6</div>
        <div className="py-2 text-brand-teal bg-brand-light/40 rounded-md m-0.5 font-medium">7</div>
        
        <div className="py-2 text-foreground bg-gray-50 rounded-md m-0.5">8</div>
        <div className="py-2 text-brand-teal bg-brand-light/40 rounded-md m-0.5 font-medium">9</div>
        <div className="py-2 text-brand-teal bg-brand-light/40 rounded-md m-0.5 font-medium">10</div>
        <div className="py-2 text-brand-teal bg-brand-light/40 rounded-md m-0.5 font-medium">11</div>
        <div className="py-2 text-brand-teal bg-brand-light/40 rounded-md m-0.5 font-medium">12</div>
        <div className="py-2 text-brand-teal bg-brand-light/40 rounded-md m-0.5 font-medium">13</div>
        <div className="py-2 text-brand-teal bg-brand-light/40 rounded-md m-0.5 font-medium">14</div>
        
        <div className="py-2 text-foreground bg-gray-50 rounded-md m-0.5">15</div>
        <div className="py-2 text-brand-teal bg-brand-light/40 rounded-md m-0.5 font-medium">16</div>
        <div className="py-2 text-brand-teal bg-brand-light/40 rounded-md m-0.5 font-medium">17</div>
        <div className="py-2 text-brand-teal bg-brand-light/40 rounded-md m-0.5 font-medium">18</div>
        <div className="py-2 text-brand-teal bg-brand-light/40 rounded-md m-0.5 font-medium">19</div>
        <div className="py-2 text-brand-teal bg-brand-light/40 rounded-md m-0.5 font-medium">20</div>
        <div className="py-2 text-brand-teal bg-brand-light/40 rounded-md m-0.5 font-medium">21</div>
        
        <div className="py-2 text-foreground bg-gray-50 rounded-md m-0.5">22</div>
        <div className="py-2 text-brand-teal bg-brand-light/40 rounded-md m-0.5 font-medium">23</div>
        <div className="py-2 text-white bg-brand-teal rounded-md m-0.5 font-bold shadow-sm">24</div>
        <div className="py-2 text-foreground m-0.5">25</div>
        <div className="py-2 text-foreground m-0.5">26</div>
        <div className="py-2 text-foreground m-0.5">27</div>
        <div className="py-2 text-foreground m-0.5">28</div>
        
        <div className="py-2 text-foreground m-0.5">29</div>
        <div className="py-2 text-foreground m-0.5">30</div>
        <div className="py-2 text-foreground m-0.5">31</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="Manage your team members and their account permissions here."
      >
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
          <Dialog open={recoverModalOpen} onOpenChange={setRecoverModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="shadow-sm w-full sm:w-auto font-medium">
                <Clock className="w-4 h-4 mr-2" />
                Recover Time
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Recover Time Request</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Submit a request to recover your missing break-out time for your attendance record.
                </p>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2 flex flex-col">
                  <label className="text-sm font-medium text-foreground">Date of Record</label>
                  <DatePicker 
                    defaultValue={dayjs("2026-04-18", "YYYY-MM-DD")}
                    className="w-full h-9 hover:border-brand-teal focus-within:border-brand-teal focus-within:ring-brand-teal"
                    format="MMMM D, YYYY"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 flex flex-col">
                    <label className="text-sm font-medium text-foreground">Recorded Break-In</label>
                    <TimePicker 
                      defaultValue={dayjs("13:15", "HH:mm")}
                      className="w-full h-9 hover:border-brand-teal focus-within:border-brand-teal focus-within:ring-brand-teal"
                      format="hh:mm A"
                      use12Hours
                    />
                  </div>
                  <div className="space-y-2 flex flex-col">
                    <label className="text-sm font-medium text-foreground">Actual Break-Out Time</label>
                    <TimePicker 
                      defaultValue={dayjs("14:00", "HH:mm")}
                      className="w-full h-9 hover:border-brand-teal focus-within:border-brand-teal focus-within:ring-brand-teal"
                      format="hh:mm A"
                      use12Hours
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Reason for Request</label>
                  <Select defaultValue="forgot">
                    <SelectTrigger className="w-full h-9">
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="forgot">I am forgot break out please recoverd my time.</SelectItem>
                      <SelectItem value="system">System error/Glitch</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-2 mt-4">
                <Button variant="outline" onClick={() => setRecoverModalOpen(false)}>Cancel</Button>
                <Button className="bg-brand-teal hover:bg-brand-teal-light text-white" onClick={() => setRecoverModalOpen(false)}>
                  Send Request
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" className="shadow-sm w-full sm:w-auto font-medium">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </PageHeader>

      <div className="flex flex-col gap-6">
        
        {/* Top Section */}
        <div className="flex flex-col xl:flex-row gap-6">
          <div className="flex-1 space-y-6">
          
          {/* Top Info Banner */}
          <div className="bg-white border border-border rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16 border border-border">
                <AvatarImage src="/avatars/sarah.jpg" />
                <AvatarFallback className="bg-brand-light text-brand-teal font-bold text-xl">SJ</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-bold text-foreground mb-1">Sarah Jenkins</h2>
                <p className="text-sm text-muted-foreground mb-2">HR Manager • Employee ID #EMP-001</p>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brand-light/50 border border-brand-teal/20 text-brand-teal text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Present today
                </div>
              </div>
            </div>

            <div className="flex items-stretch gap-2 sm:gap-3 w-full md:w-auto">
              <div className="flex-1 md:flex-none md:min-w-[100px] bg-gray-50 border border-border rounded-lg p-2 sm:p-3 flex flex-col justify-center">
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium mb-0.5 sm:mb-1">Today</span>
                <span className="text-sm sm:text-lg font-bold text-foreground">7h 42m</span>
              </div>
              <div className="flex-1 md:flex-none md:min-w-[100px] bg-gray-50 border border-border rounded-lg p-2 sm:p-3 flex flex-col justify-center">
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium mb-0.5 sm:mb-1">Check-in</span>
                <span className="text-sm sm:text-lg font-bold text-foreground">08:52</span>
              </div>
              <div className="flex-1 md:flex-none md:min-w-[100px] bg-brand-light/30 border border-brand-teal/10 rounded-lg p-2 sm:p-3 flex flex-col justify-center">
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium mb-0.5 sm:mb-1">Status</span>
                <span className="text-sm sm:text-lg font-bold text-brand-teal">Active</span>
              </div>
            </div>
          </div>

          {/* Calendar on Mobile Only */}
          <div className="w-full xl:hidden shrink-0">
            <CalendarWidget />
          </div>

          {/* 4 Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-medium text-muted-foreground">Present Days</span>
                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-3xl font-bold text-foreground mb-2">22</div>
              <p className="text-xs text-muted-foreground leading-snug">Out of 24 working days this month</p>
            </div>
            <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-medium text-muted-foreground">Late Check-ins</span>
                <Clock className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-3xl font-bold text-foreground mb-2">2</div>
              <p className="text-xs text-muted-foreground leading-snug">Improved from 4 late arrivals last month</p>
            </div>
            <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-medium text-muted-foreground">Avg Daily Hours</span>
                <Clock className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-3xl font-bold text-foreground mb-2">8.1h</div>
              <p className="text-xs text-muted-foreground leading-snug">Consistent attendance across the last 30 days</p>
            </div>
            <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-medium text-muted-foreground">Leave Balance</span>
                <Briefcase className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-3xl font-bold text-foreground mb-2">7</div>
              <p className="text-xs text-muted-foreground leading-snug">Paid leave days remaining this quarter</p>
            </div>
          </div>

          {/* Totals Row */}
          <div className="bg-white border border-border rounded-xl shadow-sm flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border">
            <div className="flex-1 p-4">
              <div className="text-xs font-medium text-muted-foreground mb-1">Total Time</div>
              <div className="text-base font-bold text-foreground">1329H 5Min</div>
            </div>
            <div className="flex-1 p-4">
              <div className="text-xs font-medium text-muted-foreground mb-1">Total Break Time</div>
              <div className="text-base font-bold text-foreground">170H 57Min</div>
            </div>
            <div className="flex-1 p-4">
              <div className="text-xs font-medium text-muted-foreground mb-1">Total Late Time</div>
              <div className="text-base font-bold text-foreground">48H 11Min</div>
            </div>
            <div className="flex-1 p-4">
              <div className="text-xs font-medium text-muted-foreground mb-1">Total Overtime</div>
              <div className="text-base font-bold text-foreground">36H 4Min</div>
            </div>
          </div>
          </div>

          {/* Calendar on Desktop Only */}
          <div className="hidden xl:block w-full xl:w-[320px] shrink-0">
            <CalendarWidget />
          </div>
        </div>

        {/* Table - Full Width Bottom */}
        <div className="w-full">
          <div className="bg-white border border-border rounded-xl shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-xs text-muted-foreground font-semibold bg-gray-50/50 border-b border-border">
                  <tr>
                    <th className="px-5 py-4 font-medium">Sr. No.</th>
                    <th className="px-5 py-4 font-medium">Date</th>
                    <th className="px-5 py-4 font-medium">Current Status</th>
                    <th className="px-5 py-4 font-medium">Status</th>
                    <th className="px-5 py-4 font-medium">Check In</th>
                    <th className="px-5 py-4 font-medium">Check Out</th>
                    <th className="px-5 py-4 font-medium">Break</th>
                    <th className="px-5 py-4 font-medium">Late</th>
                    <th className="px-5 py-4 font-medium">Overtime</th>
                    <th className="px-5 py-4 font-medium">Production Hrs</th>
                    <th className="px-5 py-4 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {attendanceData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-muted/50 transition-colors">
                      <td className="px-5 py-4 text-foreground">{row.id}</td>
                      <td className="px-5 py-4 text-foreground font-medium">{row.date}</td>
                      <td className="px-5 py-4 text-foreground">{row.currentStatus}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-light/50 border border-brand-teal/20 text-brand-teal text-xs font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          {row.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-foreground">{row.checkIn}</td>
                      <td className="px-5 py-4 text-foreground">{row.checkOut}</td>
                      <td className="px-5 py-4 text-foreground">{row.break}</td>
                      <td className="px-5 py-4 text-foreground">{row.late}</td>
                      <td className="px-5 py-4 text-foreground">{row.overtime}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-brand-light/50 border border-brand-teal/20 text-brand-teal text-xs font-semibold">
                          {row.prodHrs}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {idx === 0 ? (
                          <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-brand-teal bg-brand-light/50 hover:bg-brand-light">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[480px]">
                              <DialogHeader className="pb-4 border-b border-border">
                                <DialogTitle className="text-xl font-bold">Attendance Details</DialogTitle>
                                <div className="flex items-center gap-3 mt-2">
                                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                    <CalendarIcon className="w-4 h-4" />
                                    April 18, 2026
                                  </div>
                                  <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                                    <Avatar className="w-5 h-5">
                                      <AvatarImage src="/avatars/sarah.jpg" />
                                      <AvatarFallback>SJ</AvatarFallback>
                                    </Avatar>
                                    Sarah Jenkins
                                  </div>
                                </div>
                              </DialogHeader>
                              
                              <div className="py-2">
                                <div className="flex items-center justify-between border border-border rounded-xl p-3 mb-4 shadow-sm">
                                  <div className="text-sm">
                                    <span className="text-muted-foreground">Current Status: </span>
                                    <span className="font-semibold text-foreground">Break-out</span>
                                  </div>
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-light/50 border border-brand-teal/20 text-brand-teal text-xs font-semibold">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Present
                                  </span>
                                </div>

                                <div className="grid grid-cols-4 gap-3 mb-6">
                                  <div className="border border-border rounded-lg p-2 text-center">
                                    <div className="text-xs text-muted-foreground mb-1">Check In</div>
                                    <div className="font-bold text-sm text-foreground">09:34 AM</div>
                                  </div>
                                  <div className="border border-border rounded-lg p-2 text-center">
                                    <div className="text-xs text-muted-foreground mb-1">Check Out</div>
                                    <div className="font-bold text-sm text-muted-foreground">--:--</div>
                                  </div>
                                  <div className="border border-border rounded-lg p-2 text-center">
                                    <div className="text-xs text-muted-foreground mb-1">Break</div>
                                    <div className="font-bold text-sm text-foreground">46 Min</div>
                                  </div>
                                  <div className="border border-brand-teal/30 bg-brand-light/20 rounded-lg p-2 text-center">
                                    <div className="text-xs text-brand-teal font-medium mb-1">Prod. Hrs</div>
                                    <div className="font-bold text-sm text-brand-teal">3H 45Min</div>
                                  </div>
                                </div>

                                <div>
                                  <h4 className="font-semibold text-foreground mb-4">Activity Timeline</h4>
                                  <div className="space-y-0 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                                    
                                    <div className="relative flex items-start justify-between mb-6">
                                      <div className="flex items-start gap-4">
                                        <div className="w-6 h-6 rounded-full bg-brand-teal border-4 border-white flex-shrink-0 z-10 relative"></div>
                                        <div>
                                          <div className="font-semibold text-sm text-foreground">Punched In</div>
                                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                            Web Portal • IP: 192.168.1.45
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-sm font-medium text-foreground">09:34 AM</div>
                                    </div>

                                    <div className="relative flex items-start justify-between mb-6">
                                      <div className="flex items-start gap-4">
                                        <div className="w-6 h-6 rounded-full bg-amber-400 border-4 border-white flex-shrink-0 z-10 relative"></div>
                                        <div>
                                          <div className="font-semibold text-sm text-foreground">Break Start</div>
                                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                            Lunch Break
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-sm font-medium text-foreground">12:15 PM</div>
                                    </div>

                                    <div className="relative flex items-start justify-between mb-6">
                                      <div className="flex items-start gap-4">
                                        <div className="w-6 h-6 rounded-full bg-amber-400 border-4 border-white flex-shrink-0 z-10 relative"></div>
                                        <div>
                                          <div className="font-semibold text-sm text-foreground">Break End</div>
                                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                            Duration: 46 Min
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-sm font-medium text-foreground">01:01 PM</div>
                                    </div>

                                    <div className="relative flex items-start justify-between">
                                      <div className="flex items-start gap-4">
                                        <div className="w-6 h-6 rounded-full bg-gray-300 border-4 border-white flex-shrink-0 z-10 relative"></div>
                                        <div>
                                          <div className="font-semibold text-sm text-foreground">Punched Out</div>
                                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                            Pending
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-sm font-medium text-muted-foreground">--:--</div>
                                    </div>

                                  </div>
                                </div>
                              </div>
                              <DialogFooter className="pt-4 border-t border-border sm:justify-end">
                                <Button variant="outline" onClick={() => setDetailsModalOpen(false)}>Close</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        ) : (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-brand-teal bg-brand-light/50 hover:bg-brand-light">
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination totalItems={195} itemsPerPage={8} currentPage={1} itemName="entries" />
          </div>
        </div>

      </div>
    </div>
  );
}
