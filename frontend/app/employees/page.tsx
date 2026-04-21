import { PageHeader } from "@/components/common/PageHeader";
import { SearchBar } from "@/components/common/SearchBar";
import { PaginationBar } from "@/components/common/PaginationBar";
import { Button } from "@/components/ui/button";
import { Plus, Download, Pencil, Trash2, MoreVertical } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";

export default function EmployeeListPage() {
  const employees = [
    { id: "EMP-001", name: "Sarah Jenkins", email: "sarah.j@nexushr.com", dept: "Human Resources", role: "HR Manager", status: "Active", joinDate: "12 Jan 2020", avatar: "https://i.pravatar.cc/150?img=1" },
    { id: "EMP-042", name: "Michael Chang", email: "michael.c@nexushr.com", dept: "Engineering", role: "Senior Developer", status: "Active", joinDate: "04 Mar 2021", avatar: "https://i.pravatar.cc/150?img=11" },
    { id: "EMP-087", name: "Emma Wilson", email: "emma.w@nexushr.com", dept: "Design", role: "UI/UX Designer", status: "On Leave", joinDate: "15 Aug 2021", avatar: "https://i.pravatar.cc/150?img=5" },
    { id: "EMP-105", name: "David Rodriguez", email: "david.r@nexushr.com", dept: "Marketing", role: "Content Strategist", status: "Active", joinDate: "22 Nov 2021", avatar: "https://i.pravatar.cc/150?img=8" },
    { id: "EMP-134", name: "Lisa Patel", email: "lisa.p@nexushr.com", dept: "Engineering", role: "QA Engineer", status: "Active", joinDate: "10 Feb 2022", avatar: "https://i.pravatar.cc/150?img=9" },
    { id: "EMP-162", name: "James Thompson", email: "james.t@nexushr.com", dept: "Sales", role: "Account Executive", status: "Active", joinDate: "05 May 2022", avatar: "https://i.pravatar.cc/150?img=12" },
    { id: "EMP-188", name: "Anna Kowalski", email: "anna.k@nexushr.com", dept: "Engineering", role: "Frontend Developer", status: "Active", joinDate: "18 Jul 2022", avatar: "https://i.pravatar.cc/150?img=20" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee List"
        description="Manage your team members and their account permissions here."
      >
        <div className="flex items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
          <Button variant="outline" className="shadow-sm flex-1 sm:flex-none">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Link href="/employees/add" className="flex-1 sm:flex-none flex">
            <Button className="bg-brand-teal hover:bg-brand-teal-light text-white font-medium shadow-sm w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Employee
            </Button>
          </Link>
        </div>
      </PageHeader>

      <div className="bg-white border border-border rounded-xl shadow-sm">
        {/* Filters and Search */}
        <div className="p-4 border-b border-border bg-gray-50/30 rounded-t-xl flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full xl:w-auto">
            <select className="w-full sm:w-auto px-3 py-2.5 sm:py-2 border border-border rounded-md text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-teal cursor-pointer">
              <option>All Departments</option>
              <option>Engineering</option>
              <option>Human Resources</option>
            </select>
            <div className="grid grid-cols-2 gap-3 w-full sm:w-auto">
              <select className="px-3 py-2.5 sm:py-2 border border-border rounded-md text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-teal cursor-pointer">
                <option>All Roles</option>
                <option>Manager</option>
                <option>Developer</option>
              </select>
              <select className="px-3 py-2.5 sm:py-2 border border-border rounded-md text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-teal cursor-pointer">
                <option>Status</option>
                <option>Active</option>
                <option>On Leave</option>
              </select>
            </div>
          </div>
          <SearchBar placeholder="Search employees..." className="w-full" containerClassName="w-full xl:w-64" />
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[400px] w-full max-w-full">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-muted-foreground font-semibold bg-gray-50/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 w-12"><input type="checkbox" className="rounded border-gray-300 text-brand-teal focus:ring-brand-teal accent-brand-teal" /></th>
                <th className="px-6 py-4 font-medium">Employee Name</th>
                <th className="px-6 py-4 font-medium">Employee ID</th>
                <th className="px-6 py-4 font-medium">Department</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Join Date</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-muted/50 transition-colors group cursor-pointer">
                  <td className="px-6 py-4">
                    <input type="checkbox" className="rounded border-gray-300 text-brand-teal focus:ring-brand-teal accent-brand-teal" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-9 h-9">
                        <AvatarImage src={emp.avatar} alt={emp.name} />
                        <AvatarFallback>{emp.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-foreground">{emp.name}</div>
                        <div className="text-xs text-muted-foreground">{emp.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium">{emp.id}</td>
                  <td className="px-6 py-4 text-muted-foreground">{emp.dept}</td>
                  <td className="px-6 py-4 text-muted-foreground">{emp.role}</td>
                  <td className="px-6 py-4">
                    {emp.status === 'Active' ? (
                      <span className="inline-flex px-2.5 py-1 bg-brand-light text-brand-teal text-xs font-semibold rounded-md border border-brand-teal/20">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex px-2.5 py-1 bg-red-50 text-brand-danger text-xs font-semibold rounded-md border border-red-100">
                        On Leave
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{emp.joinDate}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2 text-muted-foreground">
                      <button className="p-1.5 hover:bg-gray-100 hover:text-brand-teal rounded-md transition-colors"><Pencil className="w-4 h-4" /></button>
                      <button className="p-1.5 hover:bg-gray-100 hover:text-brand-danger rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                      <button className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"><MoreVertical className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Setup */}
        <div className="p-4 border-t border-border">
          <PaginationBar totalItems={48} itemsPerPage={7} currentPage={1} />
        </div>
      </div>
    </div>
  );
}
