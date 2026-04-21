"use client";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, Users, Clock, UserX, GraduationCap, Calendar as CalendarIcon, MessageSquare, Gift, ArrowUpRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser } from "@/hooks/useUser";

export default function DashboardPage() {
  const { user } = useUser();
  const userName = user?.name || "Guest";
  const firstName = user?.firstName || userName.split(' ')[0];
  const designation = user?.designation || "Employee";
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Here's what's happening in your organization today."
      >
        <Button className="bg-brand-teal hover:bg-brand-teal-light text-white font-medium">
          <Plus className="w-4 h-4 mr-2" />
          New Report
        </Button>
      </PageHeader>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Employees" value="48" trend="+12" trendLabel="from last month" icon={<Users className="w-5 h-5 text-muted-foreground" />} />
        <StatCard title="On Time Employees" value="16" trend="87%" trendLabel="arrived on schedule today" icon={<Clock className="w-5 h-5 text-muted-foreground" />} trendUp/>
        <StatCard title="Absent Employees" value="14" trend="6%" trendLabel="not checked in today" icon={<UserX className="w-5 h-5 text-muted-foreground" />} trendUp={false} />
        <StatCard title="Interns" value="18" trend="+3" trendLabel="joined this month" icon={<GraduationCap className="w-5 h-5 text-muted-foreground" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Workspace Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Punching Widget */}
          <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <Avatar className="w-14 h-14 border border-border">
                  <AvatarImage src={user?.profilePhoto || `https://i.pravatar.cc/150?u=${userName}`} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-xs font-semibold text-brand-teal bg-brand-light px-2 py-0.5 rounded-full inline-block mb-1">
                    Good morning, {firstName}
                  </div>
                  <h3 className="font-bold text-lg text-foreground">{userName}</h3>
                  <p className="text-sm text-muted-foreground">{designation}</p>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs text-muted-foreground">Live working time</span>
                <span className="font-bold text-lg font-mono">01:24:18 <span className="text-xs bg-brand-light text-brand-teal px-1.5 py-0.5 rounded-md ml-1 align-middle">Live</span></span>
              </div>
            </div>

            <div className="bg-brand-light/40 rounded-xl p-6 mb-6 text-center border border-border/50">
              <span className="text-sm text-muted-foreground font-medium block mb-1">Current Time</span>
              <div className="text-4xl font-bold text-foreground tracking-tight mb-2">10:24 AM</div>
              <div className="text-sm text-muted-foreground">Friday, April 24, 2026</div>
            </div>

            <div className="bg-brand-light text-brand-dark px-4 py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 mb-6 shadow-none">
              <Clock className="w-4 h-4" /> Punched in at 09:30 AM
            </div>

            <div className="flex items-center gap-4">
              <Button variant="outline" className="flex-1 py-6 text-base font-medium shadow-sm">
                Take Break
              </Button>
              <Button variant="outline" className="flex-1 py-6 text-base font-medium text-brand-danger hover:text-brand-danger hover:bg-red-50 border-red-200 shadow-sm">
                Punch Out
              </Button>
            </div>
          </div>

          {/* Time Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm text-muted-foreground font-medium">Today's Hours</span>
                  <div className="p-1.5 bg-brand-light text-brand-teal rounded-md"><Clock className="w-4 h-4" /></div>
                </div>
                <div className="text-2xl font-bold text-foreground mb-1">1h 24m</div>
                <div className="flex items-center gap-1 text-xs text-brand-success font-medium">
                  <ArrowUpRight className="w-3 h-3" /> 12% <span className="text-muted-foreground font-normal">vs yesterday</span>
                </div>
             </div>
             <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm text-muted-foreground font-medium">All Time Hours</span>
                  <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md"><Clock className="w-4 h-4" /></div>
                </div>
                <div className="text-2xl font-bold text-foreground mb-1">1,284h 30m</div>
                <div className="text-xs text-muted-foreground mt-1">Since joining the company</div>
             </div>
             <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm text-muted-foreground font-medium">Break Time (Today)</span>
                  <div className="p-1.5 bg-amber-50 text-amber-600 rounded-md"><Clock className="w-4 h-4" /></div>
                </div>
                <div className="text-2xl font-bold text-foreground mb-1">15m</div>
                <div className="text-xs text-muted-foreground mt-1">Allowed: 60m daily</div>
             </div>
          </div>

          <div className="bg-brand-light/30 border border-border rounded-xl p-5 flex justify-between shadow-sm">
            <div>
              <div className="text-xs text-muted-foreground mb-1">First In</div>
              <div className="font-bold">09:00 AM</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Last Out</div>
              <div className="font-bold text-brand-teal">Active</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Break Time</div>
              <div className="font-bold">13m</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Worked Time</div>
              <div className="font-bold text-brand-teal">Active</div>
            </div>
          </div>

        </div>

        {/* Right Sidebar Widget */}
        <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-lg">Add & View Events</h3>
              <p className="text-sm text-muted-foreground">This month events</p>
            </div>
            <Button variant="outline" size="sm" className="h-8 shadow-sm">View all</Button>
          </div>

          {/* Simple Static Calendar Representation */}
          <div className="mb-6">
             <div className="flex justify-between items-center mb-4">
               <button className="p-1 hover:bg-muted rounded"><CalendarIcon className="w-4 h-4" /></button>
               <span className="font-semibold text-sm">February 2022</span>
               <button className="p-1 hover:bg-muted rounded"><CalendarIcon className="w-4 h-4" /></button>
             </div>
             <div className="grid grid-cols-7 text-center text-xs text-muted-foreground mb-2">
                <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
             </div>
             <div className="grid grid-cols-7 text-center text-sm font-medium gap-y-2">
                {/* Just mocking visual days */}
                <div className="text-muted-foreground/30">30</div>
                <div className="text-muted-foreground/30">31</div>
                <div>1</div><div>2</div><div>3</div><div>4</div><div>5</div>
                <div>6</div><div>7</div><div>8</div><div>9</div><div>10</div><div>11</div><div>12</div>
                <div>13</div><div>14</div><div>15</div>
                <div className="bg-brand-teal text-white rounded-md w-7 h-7 mx-auto flex items-center justify-center">16</div>
                <div>17</div><div>18</div><div>19</div>
                <div>20</div><div>21</div><div>22</div><div>23</div><div>24</div><div>25</div><div>26</div>
                <div>27</div><div>28</div>
             </div>
          </div>
          
          <Button className="w-full bg-brand-teal hover:bg-brand-teal-light text-white mb-6 shadow-sm">
            Add New Event
          </Button>

          <div className="space-y-3">
             <div className="flex gap-4 p-3 rounded-lg bg-green-50/50 border border-border">
               <div className="bg-brand-light p-2 rounded-md"><Users className="w-5 h-5 text-brand-teal" /></div>
               <div className="flex-1">
                 <h4 className="font-semibold text-sm">Team Meeting</h4>
                 <p className="text-xs text-muted-foreground">Marketing planning</p>
               </div>
               <div className="text-right">
                 <div className="font-semibold text-sm">16 Feb</div>
                 <div className="text-xs text-muted-foreground">10:00 AM</div>
               </div>
             </div>

             <div className="flex gap-4 p-3 rounded-lg bg-blue-50/50 border border-border">
               <div className="bg-blue-100 p-2 rounded-md"><MessageSquare className="w-5 h-5 text-blue-600" /></div>
               <div className="flex-1">
                 <h4 className="font-semibold text-sm">Event Discussion</h4>
                 <p className="text-xs text-muted-foreground">Quarterly review</p>
               </div>
               <div className="text-right">
                 <div className="font-semibold text-sm">20 Feb</div>
                 <div className="text-xs text-muted-foreground">02:00 PM</div>
               </div>
             </div>

             <div className="flex gap-4 p-3 rounded-lg bg-amber-50/50 border border-border">
               <div className="bg-amber-100 p-2 rounded-md"><Gift className="w-5 h-5 text-amber-600" /></div>
               <div className="flex-1">
                 <h4 className="font-semibold text-sm">Theresa Birthday</h4>
                 <p className="text-xs text-muted-foreground">Office celebration</p>
               </div>
               <div className="text-right">
                 <div className="font-semibold text-sm">27 Feb</div>
                 <div className="text-xs text-muted-foreground">12:30 PM</div>
               </div>
             </div>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 flex justify-between items-center border-b border-border">
          <h3 className="font-bold text-lg">Recent Attendance</h3>
          <Button variant="outline" size="sm" className="shadow-sm">Export</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground font-semibold bg-gray-50/50 uppercase border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium tracking-wider">Date</th>
                <th className="px-6 py-4 font-medium tracking-wider">Punch In</th>
                <th className="px-6 py-4 font-medium tracking-wider">Punch Out</th>
                <th className="px-6 py-4 font-medium tracking-wider">Break</th>
                <th className="px-6 py-4 font-medium tracking-wider">Total</th>
                <th className="px-6 py-4 font-medium tracking-wider text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr className="hover:bg-muted/50 transition-colors">
                <td className="px-6 py-4 font-medium text-foreground">Today, Oct 24</td>
                <td className="px-6 py-4 text-muted-foreground">09:00 AM</td>
                <td className="px-6 py-4 text-muted-foreground">--</td>
                <td className="px-6 py-4 text-muted-foreground">15m</td>
                <td className="px-6 py-4 font-medium">1h 24m</td>
                <td className="px-6 py-4 text-right">
                  <span className="inline-flex px-2 py-1 bg-brand-light text-brand-teal text-xs font-medium rounded-md">Active</span>
                </td>
              </tr>
              <tr className="hover:bg-muted/50 transition-colors">
                <td className="px-6 py-4 font-medium text-foreground">Wed, Oct 23</td>
                <td className="px-6 py-4 text-muted-foreground">08:55 AM</td>
                <td className="px-6 py-4 text-muted-foreground">05:10 PM</td>
                <td className="px-6 py-4 text-muted-foreground">1h 00m</td>
                <td className="px-6 py-4 font-medium">7h 15m</td>
                <td className="px-6 py-4 text-right">
                  <span className="inline-flex px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-md border border-gray-200">Logged</span>
                </td>
              </tr>
              <tr className="hover:bg-muted/50 transition-colors">
                <td className="px-6 py-4 font-medium text-foreground">Tue, Oct 22</td>
                <td className="px-6 py-4 text-muted-foreground">09:10 AM</td>
                <td className="px-6 py-4 text-muted-foreground">05:00 PM</td>
                <td className="px-6 py-4 text-muted-foreground">45m</td>
                <td className="px-6 py-4 font-medium">7h 05m</td>
                <td className="px-6 py-4 text-right">
                  <span className="inline-flex px-2 py-1 bg-amber-50 text-amber-600 text-xs font-medium rounded-md border border-amber-100">Late Entry</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, trend, trendLabel, icon, trendUp = true }: { title: string, value: string, trend: string, trendLabel: string, icon: React.ReactNode, trendUp?: boolean }) {
  return (
    <div className="p-5 bg-white border border-border rounded-xl shadow-sm flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <span className="font-medium text-sm text-muted-foreground">{title}</span>
        <div className="p-2 border border-border rounded-lg bg-gray-50/50">
          {icon}
        </div>
      </div>
      <div>
        <div className="text-3xl font-bold text-foreground mb-2">{value}</div>
        <div className="flex items-center text-xs">
          <span className={`px-1.5 py-0.5 rounded-md font-medium text-[10px] mr-2 flex items-center ${trendUp ? 'bg-brand-light text-brand-teal' : 'bg-red-50 text-brand-danger'}`}>
             {trendUp ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : null}
             {trend}
          </span>
          <span className="text-muted-foreground">{trendLabel}</span>
        </div>
      </div>
    </div>
  );
}
