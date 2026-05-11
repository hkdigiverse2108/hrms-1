"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchBar } from "@/components/common/SearchBar";
import { TablePagination } from "@/components/common/TablePagination";
import { Button } from "@/components/ui/button";
import { Plus, Download, Pencil, Trash2, MoreVertical, Loader2, Eye, EyeOff } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/config";
import { exportToCSV } from "@/lib/export";
import { useApi } from "@/hooks/useApi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Key } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";

export default function EmployeeListPage() {
  const router = useRouter();
  const { data: apiData } = useApi();
  const { checkPermission, isAdmin } = usePermissions();
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDept, setFilterDept] = useState("All Departments");
  const [filterRole, setFilterRole] = useState("All Roles");
  const [filterStatus, setFilterStatus] = useState("Status");
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

  const togglePasswordVisibility = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setVisiblePasswords(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch(`${API_URL}/employees`);
        if (!response.ok) throw new Error("Failed to fetch employees");
        const data = await response.json();
        setEmployees(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/employees/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setEmployees(employees.filter(emp => emp.id !== id));
      } else {
        const data = await response.json();
        alert(data.detail || "Failed to delete employee");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("An error occurred while deleting the employee");
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDept = filterDept === "All Departments" || emp.department === filterDept;
    const matchesRole = filterRole === "All Roles" || emp.role === filterRole || emp.designation === filterRole;
    const matchesStatus = filterStatus === "Status" || emp.status?.toLowerCase() === filterStatus.toLowerCase();

    return matchesSearch && matchesDept && matchesRole && matchesStatus;
  });

  // Use API data for filters if available, otherwise fallback to existing employee data
  const departments = apiData?.departments?.map((d: any) => d.name) || 
                      Array.from(new Set(employees.map(e => e.department).filter(Boolean)));
  
  const roles = apiData?.roles?.map((r: any) => r.name) || 
                Array.from(new Set(employees.map(e => e.role || e.designation).filter(Boolean)));



  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee List"
        description="Manage your team members and their account permissions here."
      >
        <div className="flex items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
          <Button variant="outline" className="shadow-sm flex-1 sm:flex-none" onClick={() => exportToCSV(employees, 'employees')}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          {(isAdmin || checkPermission('add-employee', 'canAdd') || checkPermission('add-employee', 'canView')) && (
            <Link href="/employees/add" className="flex-1 sm:flex-none flex">
              <Button className="bg-brand-teal hover:bg-brand-teal-light text-white font-medium shadow-sm w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Employee
              </Button>
            </Link>
          )}
        </div>
      </PageHeader>

      <div className="bg-white border border-border rounded-xl shadow-sm">
        {/* Filters and Search */}
        <div className="p-4 border-b border-border bg-gray-50/30 rounded-t-xl flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full xl:w-auto">
            <select 
              className="w-full sm:w-auto px-3 py-2.5 sm:py-2 border border-border rounded-md text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-teal cursor-pointer"
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
            >
              <option>All Departments</option>
              {departments.map(dept => (
                <option key={dept}>{dept}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3 w-full sm:w-auto">
              <select 
                className="px-3 py-2.5 sm:py-2 border border-border rounded-md text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-teal cursor-pointer"
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
              >
                <option>All Roles</option>
                {roles.map(role => (
                  <option key={role}>{role}</option>
                ))}
              </select>
              <select 
                className="px-3 py-2.5 sm:py-2 border border-border rounded-md text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-teal cursor-pointer border-brand-teal ring-1 ring-brand-teal"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option>Status</option>
                <option>active</option>
                <option>inactive</option>
              </select>
            </div>
          </div>
          <SearchBar 
            placeholder="Search employees..." 
            className="w-full" 
            containerClassName="w-full xl:w-64" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[400px] w-full max-w-full">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-muted-foreground font-semibold bg-gray-50/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">Employee Name</th>
                <th className="px-6 py-4 font-medium">Employee ID</th>
                <th className="px-6 py-4 font-medium">Password</th>
                <th className="px-6 py-4 font-medium">Department</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Join Date</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
                      <p>Loading employees...</p>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={9} className="px-6 py-20 text-center text-destructive">
                    {error}
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-20 text-center text-muted-foreground">
                    No employees found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-muted/50 transition-colors group cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9">
                          <AvatarImage src={emp.profilePhoto} alt={emp.name} />
                          <AvatarFallback>{emp.name?.charAt(0) || "U"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-foreground">{emp.name}</div>
                          <div className="text-xs text-muted-foreground">{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">{emp.employeeId}</td>
                    <td className="px-6 py-4">
                      {emp.password ? (
                        <div className="flex items-center justify-between w-full min-w-[140px] max-w-[200px] bg-gray-100 px-2.5 py-1.5 rounded border border-gray-200/60">
                          <span className="font-mono text-xs text-muted-foreground truncate mr-2">
                            {visiblePasswords.has(emp.id) ? emp.password : "••••••••"}
                          </span>
                          <button
                            onClick={(e) => togglePasswordVisibility(e, emp.id)}
                            className="text-gray-400 hover:text-gray-600 transition-colors shrink-0 flex items-center justify-center"
                          >
                            {visiblePasswords.has(emp.id) ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-xs">Not set</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground hover:text-brand-teal transition-colors">
                      <Link href="/employees/organization/departments">
                        {emp.department}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground hover:text-brand-teal transition-colors">
                      <Link href="/employees/organization/designations">
                        {emp.designation}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-md border ${
                        emp.status === 'active' 
                          ? 'bg-brand-light text-brand-teal border-brand-teal/20' 
                          : 'bg-red-50 text-brand-danger border-red-100'
                      }`}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{emp.joinDate}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-brand-teal">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32">
                            <DropdownMenuItem 
                              onClick={() => router.push(`/employees/edit/${emp.id}`)}
                              className="cursor-pointer"
                            >
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(emp.id, emp.name)}
                              className="cursor-pointer text-brand-danger focus:text-brand-danger"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                            {(isAdmin || checkPermission('access-control', 'canView')) && (
                              <DropdownMenuItem 
                                onClick={() => router.push(`/employees/permissions/${emp.id}`)}
                                className="cursor-pointer text-brand-teal focus:text-brand-teal"
                              >
                                <Key className="w-4 h-4 mr-2" />
                                Permissions
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Setup */}
        <TablePagination totalItems={filteredEmployees.length} itemsPerPage={filteredEmployees.length} currentPage={1} itemName="employees" />
      </div>
    </div>
  );
}
