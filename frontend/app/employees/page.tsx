"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { SearchBar } from "@/components/common/SearchBar";
import { TablePagination } from "@/components/common/TablePagination";
import { Button } from "@/components/ui/button";
import { Plus, Download, Pencil, Trash2, MoreVertical, Loader2, Eye, EyeOff, CreditCard, Shield, SlidersHorizontal, ArrowLeftRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_URL, getAvatarUrl } from "@/lib/config";
import { exportToCSV } from "@/lib/export-utils";
import { useApi } from "@/hooks/useApi";
import { useAppEvent } from "@/hooks/useAppEvent";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Key } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useUser } from "@/hooks/useUser";
import { EmployeeModal } from "@/components/hrms/employee-modal";
import { useConfirm } from "@/context/ConfirmContext";
import { toast } from "sonner";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const COLUMN_OPTIONS = [
  { key: "firstName", label: "First Name", default: false },
  { key: "middleName", label: "Middle Name", default: false },
  { key: "lastName", label: "Last Name", default: false },
  { key: "name", label: "Employee Name", default: true },
  { key: "phone", label: "Phone Number", default: false },
  { key: "password", label: "Password", default: true },
  { key: "dob", label: "Date of Birth", default: false },
  { key: "joinDate", label: "Join Date", default: true },
  { key: "salary", label: "Salary", default: false },
  { key: "gender", label: "Gender", default: true },
  { key: "role", label: "Role", default: true },
  { key: "upiId", label: "UPI ID", default: false },
  { key: "accountNumber", label: "Account Number", default: false },
  { key: "ifscCode", label: "IFSC Code", default: false },
  { key: "bankName", label: "Bank Name", default: false },
  { key: "accountHolderName", label: "Account Holder Name", default: false },
  { key: "parentName", label: "Parent/Guardian Name", default: false },
  { key: "parentNumber", label: "Parent/Guardian Number", default: false },
  { key: "relation", label: "Relation", default: false },
  { key: "employeeId", label: "Employee ID", default: true },
  { key: "aadharCard", label: "Aadhar Card", default: false },
  { key: "panCard", label: "PAN Card", default: false },
  { key: "department", label: "Department", default: true },
  { key: "designation", label: "Designation", default: false },
  { key: "status", label: "Status", default: true },
  { key: "startTime", label: "Start Time", default: false },
  { key: "endTime", label: "End Time", default: false },
  { key: "position", label: "Position", default: false },
  { key: "hasBond", label: "Has Bond", default: false },
  { key: "bondStartDate", label: "Bond Start Date", default: false },
  { key: "bondEndDate", label: "Bond End Date", default: false },
  { key: "hasNoticePeriod", label: "Has Notice Period", default: false },
  { key: "noticePeriodDays", label: "Notice Period Days", default: false },
  { key: "noticePeriodStartDate", label: "Notice Period Start Date", default: false },
  { key: "hasResignation", label: "Has Resignation", default: false },
  { key: "resignationDate", label: "Resignation Date", default: false },
  { key: "hasEmployment", label: "Has Employment Agreement", default: false },
  { key: "employmentStartDate", label: "Employment Start Date", default: false },
];

export default function EmployeeListPage() {
  const router = useRouter();
  const { data: apiData } = useApi();
  const { user } = useUser();
  const { checkPermission, isAdmin, loading: permissionsLoading } = usePermissions();
  const { confirm } = useConfirm();
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    COLUMN_OPTIONS.forEach(col => {
      initial[col.key] = col.default;
    });
    return initial;
  });
  const [isColModalOpen, setIsColModalOpen] = useState(false);
  const [tempVisibleColumns, setTempVisibleColumns] = useState<Record<string, boolean>>({});
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [fromEmployeeId, setFromEmployeeId] = useState("");
  const [toEmployeeId, setToEmployeeId] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);

  const isColVisible = (colKey: string) => {
    if (!visibleColumns[colKey]) return false;
    if (viewType === "admins" && (colKey === "department" || colKey === "role")) {
      return false;
    }
    return true;
  };

  const renderHeader = (colKey: string) => {
    const found = COLUMN_OPTIONS.find(c => c.key === colKey);
    return found ? found.label : colKey;
  };

  const renderCell = (emp: any, colKey: string) => {
    switch (colKey) {
      case "name": {
        const isTargeted = targetedEmployeeIds.has(emp.id);
        return (
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              {isTargeted && (
                <div className="absolute -inset-[2.5px] rounded-full bg-gradient-to-tr from-yellow-400 via-amber-300 to-yellow-600 shadow-sm animate-pulse"></div>
              )}
              <Avatar className={`relative z-10 w-9 h-9 ${isTargeted ? 'border-2 border-white' : ''}`}>
                <AvatarImage src={getAvatarUrl(emp.profilePhoto, emp.name)} alt={emp.name} />
                <AvatarFallback>{emp.name?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
            </div>
            <div>
              <div className="font-semibold text-foreground">{emp.name}</div>
              <div className="text-xs text-muted-foreground">
                {emp.role?.toLowerCase().includes('admin')
                  ? emp.designation || emp.role
                  : (emp.designation && (emp.sub_department || emp.subDepartment))
                    ? `${emp.designation} ${emp.sub_department || emp.subDepartment}`
                    : (emp.designation && emp.department)
                      ? `${emp.designation} ${emp.department}`
                      : emp.designation || emp.email}
              </div>
            </div>
          </div>
        );
      }
      case "employeeId":
        return <span className="font-medium">{emp.employeeId}</span>;
      case "gender":
        return (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            emp.gender === 'Female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
          }`}>
            {emp.gender || 'Male'}
          </span>
        );
      case "password":
        return emp.password ? (
          <div className="flex items-center justify-between w-full min-w-[140px] max-w-[200px] bg-gray-100 px-2.5 py-1.5 rounded border border-gray-200/60" onClick={(e) => e.stopPropagation()}>
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
        );
      case "department":
        return (
          <span className="text-muted-foreground hover:text-brand-teal transition-colors" onClick={(e) => e.stopPropagation()}>
            <Link href="/employees/organization/departments">
              {emp.department || <span className="text-gray-400 italic">-</span>}
            </Link>
          </span>
        );
      case "role":
        return (
          <span className="text-muted-foreground hover:text-brand-teal transition-colors" onClick={(e) => e.stopPropagation()}>
            <Link href="/employees/organization/designations">
              {emp.role || emp.designation || <span className="text-gray-400 italic">-</span>}
            </Link>
          </span>
        );
      case "status":
        return (
          <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-md border ${
            emp.status === 'active' 
              ? 'bg-brand-light text-brand-teal border-brand-teal/20' 
              : 'bg-red-50 text-brand-danger border-red-100'
          }`}>
            {emp.status}
          </span>
        );
      case "joinDate":
        return <span className="text-muted-foreground">{emp.joinDate || <span className="text-gray-400 italic">-</span>}</span>;
      case "firstName":
        return <span className="text-foreground">{emp.firstName || <span className="text-gray-400 italic">-</span>}</span>;
      case "middleName":
        return <span className="text-foreground">{emp.middleName || <span className="text-gray-400 italic">-</span>}</span>;
      case "lastName":
        return <span className="text-foreground">{emp.lastName || <span className="text-gray-400 italic">-</span>}</span>;
      case "phone":
        return <span className="text-foreground">{emp.phone || <span className="text-gray-400 italic">-</span>}</span>;
      case "dob":
        return <span className="text-foreground">{emp.dob || <span className="text-gray-400 italic">-</span>}</span>;
      case "salary":
        return <span className="text-foreground font-semibold">{emp.salary ? `₹${emp.salary}` : <span className="text-gray-400 italic">-</span>}</span>;
      case "upiId":
        return <span className="text-foreground font-mono">{emp.upiId || <span className="text-gray-400 italic">-</span>}</span>;
      case "accountNumber":
        return <span className="text-foreground font-mono">{emp.accountNumber || <span className="text-gray-400 italic">-</span>}</span>;
      case "ifscCode":
        return <span className="text-foreground font-mono uppercase">{emp.ifscCode || <span className="text-gray-400 italic">-</span>}</span>;
      case "bankName":
        return <span className="text-foreground">{emp.bankName || <span className="text-gray-400 italic">-</span>}</span>;
      case "accountHolderName":
        return <span className="text-foreground uppercase">{emp.accountHolderName || <span className="text-gray-400 italic">-</span>}</span>;
      case "parentName":
        return <span className="text-foreground">{emp.parentName || <span className="text-gray-400 italic">-</span>}</span>;
      case "parentNumber":
        return <span className="text-foreground">{emp.parentNumber || <span className="text-gray-400 italic">-</span>}</span>;
      case "relation":
        return <span className="text-foreground">{emp.relation || <span className="text-gray-400 italic">-</span>}</span>;
      case "aadharCard":
        return <span className="text-foreground font-mono">{emp.aadharCard || <span className="text-gray-400 italic">-</span>}</span>;
      case "panCard":
        return <span className="text-foreground font-mono uppercase">{emp.panCard || <span className="text-gray-400 italic">-</span>}</span>;
      case "startTime":
        return <span className="text-foreground">{emp.startTime || <span className="text-gray-400 italic">-</span>}</span>;
      case "endTime":
        return <span className="text-foreground">{emp.endTime || <span className="text-gray-400 italic">-</span>}</span>;
      case "position":
        return <span className="text-foreground">{emp.position || <span className="text-gray-400 italic">-</span>}</span>;
      case "hasBond":
        return <span className="text-foreground">{emp.hasBond ? "Yes" : "No"}</span>;
      case "bondStartDate":
        return <span className="text-foreground">{emp.bondStartDate || <span className="text-gray-400 italic">-</span>}</span>;
      case "bondEndDate":
        return <span className="text-foreground">{emp.bondEndDate || <span className="text-gray-400 italic">-</span>}</span>;
      case "hasNoticePeriod":
        return <span className="text-foreground">{emp.hasNoticePeriod ? "Yes" : "No"}</span>;
      case "noticePeriodDays":
        return <span className="text-foreground">{emp.noticePeriodDays || <span className="text-gray-400 italic">-</span>}</span>;
      case "noticePeriodStartDate":
        return <span className="text-foreground">{emp.noticePeriodStartDate || <span className="text-gray-400 italic">-</span>}</span>;
      case "hasResignation":
        return <span className="text-foreground">{emp.hasResignation ? "Yes" : "No"}</span>;
      case "resignationDate":
        return <span className="text-foreground">{emp.resignationDate || <span className="text-gray-400 italic">-</span>}</span>;
      case "hasEmployment":
        return <span className="text-foreground">{emp.hasEmployment ? "Yes" : "No"}</span>;
      case "employmentStartDate":
        return <span className="text-foreground">{emp.employmentStartDate || <span className="text-gray-400 italic">-</span>}</span>;
      default:
        return <span className="text-foreground">{emp[colKey] || <span className="text-gray-400 italic">-</span>}</span>;
    }
  };

  useEffect(() => {
    if (!permissionsLoading) {
      if (!isAdmin && !checkPermission('employee-list', 'canView')) {
        router.push('/');
      }
    }
  }, [permissionsLoading, isAdmin, router, checkPermission]);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDept, setFilterDept] = useState("All Departments");
  const [filterRole, setFilterRole] = useState("All Roles");
  const [filterStatus, setFilterStatus] = useState("active");
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [viewType, setViewType] = useState<"employees" | "admins">("employees");

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterDept, filterRole, filterStatus, viewType]);

  const handleTransferSubmit = async () => {
    if (!fromEmployeeId || !toEmployeeId) {
      toast.error("Please select both employees");
      return;
    }
    if (fromEmployeeId === toEmployeeId) {
      toast.error("Source and target employees cannot be the same");
      return;
    }

    setIsTransferring(true);
    try {
      const res = await fetch(`${API_URL}/employees/transfer-responsibilities`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fromEmployeeId,
          toEmployeeId
        })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || "Responsibilities transferred successfully");
        setIsTransferOpen(false);
        setFromEmployeeId("");
        setToEmployeeId("");
      } else {
        const errData = await res.json();
        toast.error(errData.detail || "Failed to transfer responsibilities");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during transfer");
    } finally {
      setIsTransferring(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true)
    try {
      const doc = new jsPDF('l', 'mm', 'a4')
 
      // Header styling
      doc.setFont("Helvetica", "bold")
      doc.setFontSize(22)
      doc.setTextColor(9, 160, 138) // Brand Teal: #09A08A
      doc.text("HK DIGIVERSE LLP", 14, 16)
 
      doc.setFont("Helvetica", "normal")
      doc.setFontSize(10)
      doc.setTextColor(110, 110, 110)
      doc.text("Complete Employee Directory & Account Registry", 14, 22)
      
      const formattedDate = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      doc.text(`Generated: ${formattedDate}`, 220, 22)
 
      // Separator
      doc.setDrawColor(9, 160, 138)
      doc.setLineWidth(0.8)
      doc.line(14, 26, 283, 26)
 
      // Prepare Table Data
      const visibleColsList = COLUMN_OPTIONS.filter(col => isColVisible(col.key));
      const headers = [visibleColsList.map(col => renderHeader(col.key))];
      const rows = filteredEmployees.map(emp => {
        return visibleColsList.map(col => {
          if (col.key === "name") {
            return `${emp.name || ""} (${emp.email || ""})`;
          }
          if (col.key === "role") {
            return emp.role || emp.designation || "";
          }
          if (col.key === "hasBond" || col.key === "hasNoticePeriod" || col.key === "hasResignation" || col.key === "hasEmployment") {
            return emp[col.key] ? "Yes" : "No";
          }
          return emp[col.key] || "";
        });
      });
 
      autoTable(doc, {
        head: headers,
        body: rows,
        startY: 32,
        theme: 'striped',
        styles: {
          fontSize: 9,
          cellPadding: 3.5,
          textColor: [51, 65, 85], // slate-700
          lineColor: [241, 245, 249],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [9, 160, 138], // brand-teal
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9.5,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252], // slate-50
        },
        columnStyles: {
          0: { fontStyle: 'bold', textColor: [15, 23, 42] }, // Slate-900 for name
        },
        margin: { left: 14, right: 14 }
      })
 
      doc.save(`Employee_Directory_${new Date().toISOString().slice(0,10)}.pdf`)
    } catch (err) {
      console.error("PDF Export error:", err)
      toast.error("Failed to export PDF file.")
    } finally {
      setIsExporting(false)
    }
  }

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

  const [targetedEmployeeIds, setTargetedEmployeeIds] = useState<Set<string>>(new Set());

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${API_URL}/employees?include_inactive=true`);
      if (!response.ok) throw new Error("Failed to fetch employees");
      const data = await response.json();
      setEmployees(data);
      
      // Fetch settings for banners
      const settingsRes = await fetch(`${API_URL}/system-settings`);
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        const banners = settingsData.dashboardBanners || [];
        const todayStr = dayjs().format('YYYY-MM-DD');
        const active = banners.filter((b: any) => {
          if (!b.isActive) return false;
          if (!b.employeeId || b.employeeId === "all") return false;
          const hasStartDate = !!b.startDate;
          const hasEndDate = !!b.endDate;
          if (!hasStartDate && !hasEndDate) return true;
          if (hasStartDate && !hasEndDate) return dayjs(todayStr).isSameOrAfter(b.startDate);
          if (!hasStartDate && hasEndDate) return dayjs(todayStr).isSameOrBefore(b.endDate);
          return dayjs(todayStr).isSameOrAfter(b.startDate) && dayjs(todayStr).isSameOrBefore(b.endDate);
        });
        const targetedSet = new Set<string>();
        active.forEach((b: any) => targetedSet.add(b.employeeId));
        setTargetedEmployeeIds(targetedSet);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useAppEvent("data_refresh", (data) => {
    if (data?.entity === "employees") {
      fetchEmployees();
    }
  });

  const handleDelete = async (id: string, name: string) => {
    const isConfirmed = await confirm({
      title: "Delete Employee",
      message: `Are you sure you want to delete ${name}? This action cannot be undone.`,
      destructive: true,
      confirmText: "Delete"
    });
    
    if (!isConfirmed) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/employees/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setEmployees(employees.filter(emp => emp.id !== id));
        toast.success("Employee deleted successfully");
      } else {
        const data = await response.json();
        toast.error(data.detail || "Failed to delete employee");
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("An error occurred while deleting the employee");
    }
  };

  const handleAddEmployee = async (employeeData: any) => {
    try {
      const response = await fetch(`${API_URL}/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(employeeData),
      });

      if (response.ok) {
        const newEmployee = await response.json();
        setEmployees([newEmployee, ...employees]);
        setIsAddModalOpen(false);
        toast.success("Employee added successfully");
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || "Failed to add employee");
      }
    } catch (err) {
      console.error("Add error:", err);
      toast.error("An error occurred while adding the employee");
    }
  };

  // Calculate counts for tabs
  const isRoleAdmin = (r?: string) => {
    if (!r) return false;
    const clean = r.toLowerCase().trim();
    return clean === 'admin' || clean === 'super admin' || clean === 'superadmin' || clean === 'administrator' || clean === 'founder' || clean === 'super_admin' || clean === 'sub-admin' || clean === 'sub admin';
  };

  const getRoleLevel = (r?: string) => {
    if (!r) return 5;
    const clean = r.toLowerCase().trim();
    const ROLE_HIERARCHY: Record<string, number> = {
      'admin': 0, 'super admin': 0, 'superadmin': 0, 'administrator': 0, 'founder': 0, 'super_admin': 0,
      'sub-admin': 1,
      'employee': 5
    };
    return ROLE_HIERARCHY[clean] ?? 5;
  };
  const actorLevel = getRoleLevel(user?.role);

  const activeCount = employees.filter(emp => !isRoleAdmin(emp.role) && emp.status?.toLowerCase() !== 'inactive').length;
  const inactiveCount = employees.filter(emp => !isRoleAdmin(emp.role) && emp.status?.toLowerCase() === 'inactive').length;
  const adminCount = employees.filter(emp => isRoleAdmin(emp.role)).length;

  const filteredEmployees = employees.filter(emp => {
    const isAdminUser = isRoleAdmin(emp.role);
    if (viewType === "employees" && isAdminUser) return false;
    if (viewType === "admins" && !isAdminUser) return false;

    const matchesSearch = 
      emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDept = filterDept === "All Departments" || emp.department === filterDept;
    const matchesRole = filterRole === "All Roles" || emp.role === filterRole || emp.designation === filterRole;
    const matchesStatus = filterStatus === "Status" || emp.status?.toLowerCase() === filterStatus.toLowerCase();

    // Do not apply active/inactive filter on admin tab, only on regular employees tab
    return matchesSearch && matchesDept && matchesRole && (viewType === "admins" || matchesStatus);
  });

  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Use API data for filters if available, otherwise fallback to existing employee data
  const departments = apiData?.departments?.map((d: any) => d.name) || 
                      Array.from(new Set(employees.map(e => e.department).filter(Boolean)));
  
  const roles = apiData?.roles?.map((r: any) => r.name) || 
                Array.from(new Set(employees.map(e => e.role || e.designation).filter(Boolean)));



  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-brand-teal" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee List"
        description="Manage your team members and their account permissions here."
      >
        <div className="flex items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
          <Button 
            variant="outline" 
            className="shadow-sm flex-1 sm:flex-none font-medium h-10 px-4" 
            onClick={handleExportPDF}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Export PDF
          </Button>
          {isAdmin && (
            <Button 
              variant="outline"
              className="shadow-sm border-brand-teal text-brand-teal hover:bg-brand-teal/10 font-medium h-10 px-4 flex-1 sm:flex-none"
              onClick={() => setIsTransferOpen(true)}
            >
              <ArrowLeftRight className="w-4 h-4 mr-2" />
              Transfer Work
            </Button>
          )}
          {(isAdmin || checkPermission('employee-list', 'canAdd')) && (
            <Link href="/employees/add" className="flex-1 sm:flex-none">
              <Button 
                className="w-full bg-brand-teal hover:bg-brand-teal-light text-white font-medium shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Employee
              </Button>
            </Link>
          )}
        </div>
      </PageHeader>

      <div className="bg-white border border-border rounded-xl shadow-sm">
        {/* Toggle between Employees and Admins */}
        <div className="p-4 border-b border-border">
          <Tabs value={viewType} onValueChange={(val: any) => setViewType(val)} className="w-full sm:w-auto">
            <TabsList className="grid w-full sm:w-[400px] grid-cols-2">
              <TabsTrigger value="employees" className="data-[state=active]:bg-brand-teal data-[state=active]:text-white flex items-center justify-center gap-2">
                Regular Employees
                <span className="bg-black/10 px-1.5 py-0.5 rounded-full text-[10px] font-bold">{activeCount + inactiveCount}</span>
              </TabsTrigger>
              <TabsTrigger value="admins" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white flex items-center justify-center gap-2">
                <Shield className="w-3.5 h-3.5" />
                Administrators
                <span className="bg-black/10 px-1.5 py-0.5 rounded-full text-[10px] font-bold">{adminCount}</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Filters and Search */}
        <div className="p-4 border-b border-border bg-gray-50/30 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full xl:w-auto">
            {viewType !== "admins" && (
              <>
                <select 
                  className="w-full sm:w-auto px-3 py-2.5 sm:py-2 border border-border rounded-md text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-teal cursor-pointer"
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                >
                  <option>All Departments</option>
                  {departments.map((dept: any) => (
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
                    {roles.map((role: any) => (
                      <option key={role}>{role}</option>
                    ))}
                  </select>
                  <div className="flex items-center space-x-2 px-3 py-2.5 sm:py-2 bg-white border border-border rounded-md sm:h-[38px]">
                    <Switch 
                      id="status-toggle" 
                      checked={filterStatus === "inactive"}
                      onCheckedChange={(checked) => setFilterStatus(checked ? "inactive" : "active")}
                      className="data-[state=checked]:bg-brand-teal"
                    />
                    <Label htmlFor="status-toggle" className="text-sm font-medium cursor-pointer text-muted-foreground whitespace-nowrap flex items-center gap-1.5">
                      Show Inactive
                      <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full text-[10px] font-bold">{inactiveCount}</span>
                    </Label>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 w-full xl:w-auto">
            <Button 
              variant="outline" 
              className="shadow-sm font-medium h-10 px-4 gap-2 bg-white border-border whitespace-nowrap" 
              onClick={() => {
                setTempVisibleColumns({...visibleColumns});
                setIsColModalOpen(true);
              }}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Columns Filter
            </Button>
            <SearchBar 
              placeholder="Search employees..." 
              className="w-full" 
              containerClassName={viewType === "admins" ? "w-full" : "w-full xl:w-64"} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[400px] w-full max-w-full">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-muted-foreground font-semibold bg-gray-50/50 border-b border-border">
              <tr>
                {COLUMN_OPTIONS.map((col) => isColVisible(col.key) && (
                  <th key={col.key} className="px-6 py-4 font-medium">{renderHeader(col.key)}</th>
                ))}
                <th className="px-6 py-4 font-medium text-right sticky right-0 z-20 bg-slate-50 shadow-[-1px_0_0_0_#e2e8f0]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={COLUMN_OPTIONS.filter(col => isColVisible(col.key)).length + 1} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
                      <p>Loading employees...</p>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={COLUMN_OPTIONS.filter(col => isColVisible(col.key)).length + 1} className="px-6 py-20 text-center text-destructive">
                    {error}
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={COLUMN_OPTIONS.filter(col => isColVisible(col.key)).length + 1} className="px-6 py-20 text-center text-muted-foreground">
                    No employees found matching your criteria.
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-muted/50 transition-colors group cursor-pointer">
                    {COLUMN_OPTIONS.map((col) => isColVisible(col.key) && (
                      <td key={col.key} className="px-6 py-4">
                        {renderCell(emp, col.key)}
                      </td>
                    ))}
                    <td className="px-6 py-4 text-right sticky right-0 z-10 bg-white group-hover:bg-slate-50 shadow-[-1px_0_0_0_#e2e8f0] transition-colors">
                      <div className="flex items-center justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-brand-teal">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32">
                            {(isAdmin || checkPermission('employee-list', 'canEdit')) && (actorLevel === 0 || getRoleLevel(emp.role) >= actorLevel || user?.id === emp.id) && (
                              <DropdownMenuItem 
                                onClick={() => router.push(`/employees/edit/${emp.id}`)}
                                className="cursor-pointer"
                              >
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            {(isAdmin || checkPermission('employee-list', 'canDelete')) && (actorLevel === 0 || getRoleLevel(emp.role) >= actorLevel) && user?.id !== emp.id && (
                              <DropdownMenuItem 
                                onClick={() => handleDelete(emp.id, emp.name)}
                                className="cursor-pointer text-brand-danger focus:text-brand-danger"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                            {(isAdmin || checkPermission('access-control', 'canView')) && emp.role?.toLowerCase() !== 'admin' && (actorLevel === 0 || getRoleLevel(emp.role) >= actorLevel) && (
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
        <TablePagination 
          totalItems={filteredEmployees.length} 
          itemsPerPage={itemsPerPage} 
          currentPage={currentPage} 
          onPageChange={setCurrentPage} 
          onItemsPerPageChange={(v) => { setItemsPerPage(v); setCurrentPage(1); }}
          itemName="employees" 
        />
      </div>

      <EmployeeModal 
        open={isAddModalOpen} 
        onOpenChange={setIsAddModalOpen} 
        onSave={handleAddEmployee} 
        mode="add" 
      />

      {/* Column Selection Dialog */}
      <Dialog open={isColModalOpen} onOpenChange={setIsColModalOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold text-lg">Filter Table Columns</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
              <button 
                type="button" 
                onClick={() => {
                  const allSelected: Record<string, boolean> = {};
                  COLUMN_OPTIONS.forEach(col => {
                    allSelected[col.key] = true;
                  });
                  setTempVisibleColumns(allSelected);
                }}
                className="text-sm font-semibold text-brand-teal hover:underline"
              >
                Select All
              </button>
              <button 
                type="button" 
                onClick={() => {
                  const noneSelected: Record<string, boolean> = {};
                  COLUMN_OPTIONS.forEach(col => {
                    noneSelected[col.key] = false;
                  });
                  setTempVisibleColumns(noneSelected);
                }}
                className="text-sm font-semibold text-muted-foreground hover:underline"
              >
                Clear All
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {COLUMN_OPTIONS.map((col) => (
                <div key={col.key} className="flex items-center space-x-3 p-1 hover:bg-slate-50 rounded transition-colors">
                  <Checkbox 
                    id={`col-${col.key}`} 
                    checked={tempVisibleColumns[col.key] || false}
                    onCheckedChange={(checked) => {
                      setTempVisibleColumns(prev => ({
                        ...prev,
                        [col.key]: !!checked
                      }));
                    }}
                  />
                  <Label 
                    htmlFor={`col-${col.key}`}
                    className="text-sm font-medium text-slate-700 cursor-pointer select-none"
                  >
                    {renderHeader(col.key)}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="border-t border-gray-100 pt-4 flex gap-2 justify-end">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsColModalOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={() => {
                setVisibleColumns(tempVisibleColumns);
                setIsColModalOpen(false);
              }}
              className="bg-brand-teal hover:bg-brand-teal-light text-white font-medium"
            >
              Apply Columns
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Responsibilities Dialog */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold text-lg">Transfer Employee Responsibilities</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-slate-500">
              This action will transfer all active projects, clients, creative roles, and pending tasks from the resigning employee to the new employee.
            </p>
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Transfer From (Resigning Employee)</Label>
              <select
                className="w-full px-3 py-2 border border-border rounded-md text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-teal cursor-pointer"
                value={fromEmployeeId}
                onChange={(e) => setFromEmployeeId(e.target.value)}
              >
                <option value="">Select Employee...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.department || "No Dept"})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Transfer To (Replacement Employee)</Label>
              <select
                className="w-full px-3 py-2 border border-border rounded-md text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-teal cursor-pointer"
                value={toEmployeeId}
                onChange={(e) => setToEmployeeId(e.target.value)}
              >
                <option value="">Select Employee...</option>
                {employees
                  .filter((emp) => emp.id !== fromEmployeeId)
                  .map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.department || "No Dept"})
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <DialogFooter className="border-t border-gray-100 pt-4 flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setIsTransferOpen(false)} disabled={isTransferring}>
              Cancel
            </Button>
            <Button
              className="bg-brand-teal hover:bg-brand-teal/80 text-white font-medium shadow-sm"
              onClick={handleTransferSubmit}
              disabled={isTransferring || !fromEmployeeId || !toEmployeeId}
            >
              {isTransferring ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Transferring...
                </>
              ) : (
                "Confirm Transfer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
