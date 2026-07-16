"use client";

import React, { useState, useEffect } from "react";
import { useUserContext } from "@/context/UserContext";
import { 
  ShieldCheck, 
  UserCircle, 
  Users, 
  ShieldAlert, 
  LayoutDashboard,
  Check,
  ArrowRight,
  Settings2,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Building2,
  Clock,
  Timer,
  Save,
  FileText,
  Upload,
  Image as ImageIcon,
  Calendar,
  X
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/common/PageHeader";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { API_URL } from "@/lib/config";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { INDIAN_STATES, TIME_OPTIONS } from "@/lib/constants";


export default function SettingsPage() {
  const { user, updateUser } = useUserContext();
  const { checkPermission, isAdmin } = usePermissions();
  const canViewSettings = isAdmin || checkPermission('settings', 'canView');
  const canEditSettings = isAdmin || checkPermission('settings', 'canEdit');
  const router = useRouter();
  const [settings, setSettings] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeIdForSign, setSelectedEmployeeIdForSign] = useState<string>("");
  const [selectedSignFile, setSelectedSignFile] = useState<File | null>(null);
  const [signPreviewUrl, setSignPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deptInput, setDeptInput] = useState<string | null>(null);
  const [activitiesInput, setActivitiesInput] = useState<string | null>(null);
  const [meetingsInput, setMeetingsInput] = useState<string | null>(null);
  const [categoriesInput, setCategoriesInput] = useState<string | null>(null);

  useEffect(() => {
    if (selectedEmployeeIdForSign) {
      const emp = employees.find(e => e.id === selectedEmployeeIdForSign);
      if (emp && emp.signatureUrl) {
        setSignPreviewUrl(emp.signatureUrl.startsWith('http') ? emp.signatureUrl : `${API_URL}${emp.signatureUrl}`);
      } else {
        setSignPreviewUrl(null);
      }
      setSelectedSignFile(null);
    } else {
      setSignPreviewUrl(null);
      setSelectedSignFile(null);
    }
  }, [selectedEmployeeIdForSign, employees]);

  useEffect(() => {
    if (user) {
      const role = user.role?.toLowerCase();
      const hasPermission = user.permissions?.find((p: any) => p.moduleName === 'settings')?.canView;
      
      if (role !== 'admin' && role !== 'hr' && !hasPermission) {
        router.push('/');
        return;
      }
      fetchSettings();
      fetchEmployees();
    }
  }, [user, router]);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/system-settings`);
      if (res.ok) {
        setSettings(await res.json());
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_URL}/employees`);
      if (res.ok) {
        setEmployees(await res.json());
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  const handleToggleClientVisibility = async (checked: boolean) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`${API_URL}/system-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientVisibilityAdminOnly: checked })
      });
      if (res.ok) {
        setSettings(await res.json());
      }
    } catch (err) {
      console.error("Error updating settings:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleLatePunchDeduction = async (checked: boolean) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`${API_URL}/system-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latePunchDeductionEnabled: checked })
      });
      if (res.ok) {
        setSettings(await res.json());
      }
    } catch (err) {
      console.error("Error updating settings:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleDailyProgressRejectDeduction = async (checked: boolean) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`${API_URL}/system-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyProgressRejectDeductionEnabled: checked })
      });
      if (res.ok) {
        setSettings(await res.json());
      }
    } catch (err) {
      console.error("Error updating settings:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleShowNamesInRemarksToAdmin = async (checked: boolean) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`${API_URL}/system-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showNamesInRemarksToAdmin: checked })
      });
      if (res.ok) {
        setSettings(await res.json());
      }
    } catch (err) {
      console.error("Error updating settings:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleAutoInactiveAfterResignation = async (checked: boolean) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`${API_URL}/system-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoInactiveAfterResignation: checked })
      });
      if (res.ok) {
        setSettings(await res.json());
      }
    } catch (err) {
      console.error("Error updating settings:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleOtpRole = async (role: string, checked: boolean) => {
    setIsUpdating(true);
    try {
      const currentRoles = settings?.otpRequiredRoles || [];
      let newRoles = [...currentRoles];
      if (checked && !newRoles.includes(role)) {
        newRoles.push(role);
      } else if (!checked && newRoles.includes(role)) {
        newRoles = newRoles.filter(r => r !== role);
      }
      const res = await fetch(`${API_URL}/system-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otpRequiredRoles: newRoles })
      });
      if (res.ok) {
        setSettings(await res.json());
      }
    } catch (err) {
      console.error("Error updating settings:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateShiftSettings = async (key: string, value: any) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`${API_URL}/system-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value })
      });
      if (res.ok) {
        setSettings(await res.json());
      }
    } catch (err) {
      console.error("Error updating shift settings:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveAllSettings = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch(`${API_URL}/system-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
           officeStartTime: settings?.officeStartTime || "09:30",
          officeEndTime: settings?.officeEndTime || "18:30",
          lateBufferMins: settings?.lateBufferMins !== undefined ? settings.lateBufferMins : 10,
          inactivityTimeoutEnabled: settings?.inactivityTimeoutEnabled ?? false,
          inactivityTimeoutMins: settings?.inactivityTimeoutMins !== undefined ? settings.inactivityTimeoutMins : 5,
          allowedMonthlyPaidLeaves: settings?.allowedMonthlyPaidLeaves !== undefined ? settings.allowedMonthlyPaidLeaves : 1,
          companyGstin: settings?.companyGstin || "",
          companyAddress: settings?.companyAddress || "",
          companyPhone: settings?.companyPhone || "",
          companyEmail: settings?.companyEmail || "",
          companyPan: settings?.companyPan || "",
          companyLlpin: settings?.companyLlpin || "",
          companyState: settings?.companyState || "",
          bankName: settings?.bankName || "",
          bankAccountNumber: settings?.bankAccountNumber || "",
          bankIfscCode: settings?.bankIfscCode || "",
          taxInvoicePrefix: settings?.taxInvoicePrefix || "INV",
          proformaInvoicePrefix: settings?.proformaInvoicePrefix || "PINV",
          noTaxInvoicePrefix: settings?.noTaxInvoicePrefix || "NINV",
          invoiceClientDepartments: deptInput !== null ? deptInput.split(",").map(s => s.trim()).filter(Boolean) : (settings?.invoiceClientDepartments || []),
          otherActivities: activitiesInput !== null ? activitiesInput.split(",").map(s => s.trim()).filter(Boolean) : (settings?.otherActivities || []),
          otherMeetings: meetingsInput !== null ? meetingsInput.split(",").map(s => s.trim()).filter(Boolean) : (settings?.otherMeetings || []),
          otherCategories: categoriesInput !== null ? categoriesInput.split(",").map(s => s.trim()).filter(Boolean) : (settings?.otherCategories || ["Activity", "Meeting"]),
          companyLetterheadUrl: settings?.companyLetterheadUrl || null,
          companySignatureUrl: settings?.companySignatureUrl || null,
          invoiceColor1: settings?.invoiceColor1 || "#08304b",
          invoiceColor2: settings?.invoiceColor2 || "#08304b",
          defaultSac: settings?.defaultSac || "",
          defaultScriptDateOffset: settings?.defaultScriptDateOffset !== undefined ? settings.defaultScriptDateOffset : null,
          defaultShootDateOffset: settings?.defaultShootDateOffset !== undefined ? settings.defaultShootDateOffset : null,
          defaultEditingStartOffset: settings?.defaultEditingStartOffset !== undefined ? settings.defaultEditingStartOffset : null,
          defaultApprovalOffset: settings?.defaultApprovalOffset !== undefined ? settings.defaultApprovalOffset : null,
          addHoldDaysToEndDate: settings?.addHoldDaysToEndDate !== undefined ? settings.addHoldDaysToEndDate : true,
          otpRequiredRoles: settings?.otpRequiredRoles || []
        })
      });
      if (res.ok) {
        setSettings(await res.json());
        toast.success("Settings saved successfully!");
      } else {
        toast.error("Failed to save settings.");
      }
    } catch (err) {
      console.error("Error saving settings:", err);
      toast.error("An error occurred while saving settings.");
    } finally {
      setIsUpdating(false);
    }
  };
 
  const handleLetterheadUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUpdating(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setSettings({ ...settings, companyLetterheadUrl: data.url });
        toast.success("Letterhead uploaded successfully! Don't forget to click Save Settings.");
      } else {
        toast.error("Failed to upload image.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during upload.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUpdating(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setSettings({ ...settings, companySignatureUrl: data.url });
        toast.success("Signature uploaded successfully! Don't forget to click Save Settings.");
      } else {
        toast.error("Failed to upload image.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during upload.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEmployeeSignatureUpload = async (employeeId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUpdating(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        
        const updateRes = await fetch(`${API_URL}/employees/${employeeId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ signatureUrl: data.url })
        });
        
        if (updateRes.ok) {
          toast.success("Employee signature uploaded successfully!");
          fetchEmployees();
        } else {
          toast.error("Failed to update employee.");
        }
      } else {
        toast.error("Failed to upload image.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during upload.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedSignFile(file);
      setSignPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSaveSignature = async () => {
    if (!selectedEmployeeIdForSign || !selectedSignFile) return;
    
    setIsUpdating(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedSignFile);
      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        const updateRes = await fetch(`${API_URL}/employees/${selectedEmployeeIdForSign}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ signatureUrl: data.url })
        });
        
        if (updateRes.ok) {
          toast.success("Employee signature saved successfully!");
          fetchEmployees();
          setSelectedSignFile(null);
        } else {
          toast.error("Failed to update employee.");
        }
      } else {
        toast.error("Failed to upload image.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during save.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveEmployeeSignature = async (employeeId: string) => {
    setIsUpdating(true);
    try {
      const updateRes = await fetch(`${API_URL}/employees/${employeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureUrl: null })
      });
      
      if (updateRes.ok) {
        toast.success("Employee signature removed successfully!");
        fetchEmployees();
      } else {
        toast.error("Failed to remove employee signature.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred.");
    } finally {
      setIsUpdating(false);
    }
  };

  const roles = [
    {
      id: "Admin",
      name: "Administrator",
      icon: <ShieldCheck className="w-5 h-5 text-brand-teal" />,
      description: "Full access to all modules, financial data, and organization settings.",
      capabilities: ["Manage Employees", "CRUD Events", "View All Attendance", "Financial Reports"]
    },
    {
      id: "HR",
      name: "HR Manager",
      icon: <Users className="w-5 h-5 text-blue-600" />,
      description: "Manage recruitment, employee data, and standard organization events.",
      capabilities: ["Add Employees", "Manage Recruitment", "CRUD Events", "Leave Approvals"]
    },
    {
      id: "Employee",
      name: "Employee",
      icon: <UserCircle className="w-5 h-5 text-amber-600" />,
      description: "Standard access for personal attendance, tasks, and viewing events.",
      capabilities: ["Punch In/Out", "Request Leave", "View Events", "Personal Profile"]
    }
  ];

  const handleRoleSwitch = (roleId: string) => {
    updateUser({ role: roleId });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 md:px-0">
      <PageHeader 
        title="Settings" 
        description="Manage your account preferences, system security, and module access."
      >
        {canEditSettings && (
          <Button 
            onClick={handleSaveAllSettings}
            disabled={isUpdating}
            className="bg-brand-teal hover:bg-brand-teal-light text-white px-5 py-2.5 font-bold shadow-md flex items-center gap-2 transition-all active:scale-95 text-sm"
          >
            {isUpdating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Settings
          </Button>
        )}
      </PageHeader>

      <div className="space-y-6">
          {/* Access Control Card */}
          {canViewSettings && (
            <Card className="p-6 border-border shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-brand-light rounded-lg">
                  <Lock className="w-5 h-5 text-brand-teal" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">Access Control</h3>
                  <p className="text-xs text-muted-foreground">Manage visibility of core modules for different roles.</p>
                </div>
              </div>

              <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/30">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Label className="text-[14px] font-bold">Late Punch Salary Cut</Label>
                          <Badge variant="outline" className="text-[9px] h-4 font-bold bg-white">PAYROLL</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground max-w-[400px]">
                          When enabled, system will automatically deduct salary for late punch-ins based on penalty rules.
                        </p>
                      </div>
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-brand-teal" />
                      ) : (
                        <Switch 
                          checked={settings?.latePunchDeductionEnabled ?? true}
                          onCheckedChange={handleToggleLatePunchDeduction}
                          disabled={isUpdating || !canEditSettings}
                        />
                      )}
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/30 mt-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Label className="text-[14px] font-bold">Daily Progress Reject Salary Cut</Label>
                          <Badge variant="outline" className="text-[9px] h-4 font-bold bg-white">PAYROLL</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground max-w-[400px]">
                          When enabled, system will automatically deduct 1 day salary if an employee's Daily Progress is rejected.
                        </p>
                      </div>
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-brand-teal" />
                      ) : (
                        <Switch 
                          checked={settings?.dailyProgressRejectDeductionEnabled ?? false}
                          onCheckedChange={handleToggleDailyProgressRejectDeduction}
                          disabled={isUpdating || !canEditSettings}
                        />
                      )}
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/30 mt-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Label className="text-[14px] font-bold">Show Names in Remarks to Admins</Label>
                          <Badge variant="outline" className="text-[9px] h-4 font-bold bg-white">REMARKS</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground max-w-[400px]">
                          When disabled, employee names will be hidden (anonymous) in the remarks logs, even for Admins.
                        </p>
                      </div>
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-brand-teal" />
                      ) : (
                        <Switch 
                          checked={settings?.showNamesInRemarksToAdmin ?? true}
                          onCheckedChange={handleToggleShowNamesInRemarksToAdmin}
                          disabled={isUpdating || !canEditSettings}
                        />
                      )}
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/30 mt-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Label className="text-[14px] font-bold">Auto Inactivate After Resignation</Label>
                          <Badge variant="outline" className="text-[9px] h-4 font-bold bg-white">EMPLOYEES</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground max-w-[400px]">
                          When enabled, the system will automatically change employee status to Inactive after their resignation date.
                        </p>
                      </div>
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-brand-teal" />
                      ) : (
                        <Switch 
                          checked={settings?.autoInactiveAfterResignation ?? false}
                          onCheckedChange={handleToggleAutoInactiveAfterResignation}
                          disabled={isUpdating || !canEditSettings}
                        />
                      )}
                    </div>
                    <div className="flex flex-col p-4 rounded-xl border border-slate-100 bg-slate-50/30 mt-4 gap-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Label className="text-[14px] font-bold">Require OTP Validation on Login</Label>
                          <Badge variant="outline" className="text-[9px] h-4 font-bold bg-white">SECURITY</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground max-w-[400px]">
                          Select which roles require an OTP sent to their email during login.
                        </p>
                      </div>
                      
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-brand-teal" />
                      ) : (
                        <div className="flex flex-col gap-3 ml-2">
                          <div className="flex items-center gap-2">
                            <Switch 
                              checked={settings?.otpRequiredRoles?.includes("admin") ?? false}
                              onCheckedChange={(c) => handleToggleOtpRole("admin", c)}
                              disabled={isUpdating || !canEditSettings}
                            />
                            <Label className="text-xs cursor-pointer">Admin</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch 
                              checked={settings?.otpRequiredRoles?.includes("hr") ?? false}
                              onCheckedChange={(c) => handleToggleOtpRole("hr", c)}
                              disabled={isUpdating || !canEditSettings}
                            />
                            <Label className="text-xs cursor-pointer">HR</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch 
                              checked={settings?.otpRequiredRoles?.includes("employee") ?? false}
                              onCheckedChange={(c) => handleToggleOtpRole("employee", c)}
                              disabled={isUpdating || !canEditSettings}
                            />
                            <Label className="text-xs cursor-pointer">Employee (and others)</Label>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-100">
                    <div className="flex items-center justify-between p-4 rounded-xl border border-brand-teal/20 bg-[#EAF7F6]/50">
                      <div className="space-y-0.5">
                        <Label className="text-[14px] font-bold text-brand-teal">Custom Permission Presets</Label>
                        <p className="text-xs text-brand-teal/70 max-w-[400px]">
                          Manage reusable permission templates like "Manager" or "HR Admin" to quickly assign access levels to employees.
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        className="border-brand-teal/20 text-brand-teal hover:bg-brand-teal hover:text-white"
                        onClick={() => router.push('/settings/presets')}
                      >
                        Manage Presets
                      </Button>
                    </div>
              </div>
            </Card>
          )}

          {/* Shift Configuration Card */}
          <Card className="p-6 border-border shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">Shift Configuration</h3>
                <p className="text-xs text-muted-foreground">Define standard working hours and late entry rules.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-bold">Office Start Time</Label>
                  <Select value={settings?.officeStartTime || "09:30"} onValueChange={(v) => setSettings({...settings, officeStartTime: v})} disabled={isUpdating || !canEditSettings}>
                    <SelectTrigger className="flex-1 h-10 px-3 rounded-lg border border-border text-sm w-full">
                      <SelectValue placeholder="Start Time" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[250px]">
                      {TIME_OPTIONS.map(opt => <SelectItem key={`start-${opt.valueNoSec}`} value={opt.valueNoSec}>{opt.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-bold">Office End Time</Label>
                  <Select value={settings?.officeEndTime || "18:30"} onValueChange={(v) => setSettings({...settings, officeEndTime: v})} disabled={isUpdating || !canEditSettings}>
                    <SelectTrigger className="flex-1 h-10 px-3 rounded-lg border border-border text-sm w-full">
                      <SelectValue placeholder="End Time" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[250px]">
                      {TIME_OPTIONS.map(opt => <SelectItem key={`end-${opt.valueNoSec}`} value={opt.valueNoSec}>{opt.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Timer className="w-4 h-4 text-amber-600" />
                    <Label className="text-sm font-bold">Late Entry Buffer</Label>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <input 
                        type="number" 
                        className="w-20 h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-brand-teal text-sm font-bold"
                        value={settings?.lateBufferMins !== undefined ? settings.lateBufferMins : 10}
                        onChange={(e) => setSettings({...settings, lateBufferMins: parseInt(e.target.value) || 0})}
                        disabled={isUpdating || !canEditSettings}
                      />
                      <span className="text-xs text-muted-foreground font-medium">minutes</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Employees punching in after <span className="font-bold text-foreground">{settings?.officeStartTime || "09:30"}</span> + this buffer will be automatically marked as <span className="text-amber-600 font-bold">Late Entry</span>.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/30">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-brand-teal" />
                      <Label className="text-sm font-bold">Inactivity Auto-Punch-Out Recovery</Label>
                    </div>
                    <Switch
                      checked={settings?.inactivityTimeoutEnabled ?? false}
                      onCheckedChange={(checked) => setSettings({ ...settings, inactivityTimeoutEnabled: checked })}
                      disabled={isUpdating || !canEditSettings}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    When enabled, the system will track user inactivity. If a user is inactive for the specified duration, they will be automatically punched out and shown the recovery popup.
                  </p>
                  
                  {settings?.inactivityTimeoutEnabled && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          className="w-20 h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-brand-teal text-sm font-bold bg-white"
                          value={settings?.inactivityTimeoutMins !== undefined ? settings.inactivityTimeoutMins : 5}
                          onChange={(e) => setSettings({ ...settings, inactivityTimeoutMins: parseInt(e.target.value) || 0 })}
                          disabled={isUpdating || !canEditSettings}
                          min={1}
                        />
                        <span className="text-xs text-muted-foreground font-medium">minutes</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Specify after how many minutes of inactivity the user should be prompted for recovery.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Leave Configuration Card */}
          {canViewSettings && (
            <Card className="p-6 border-border shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-brand-light rounded-lg">
                  <ShieldAlert className="w-5 h-5 text-brand-teal" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">Leave Configuration</h3>
                  <p className="text-xs text-muted-foreground">Define allowances and rules for monthly leaves.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold">Free Leaves per Month (No Salary Cut)</Label>
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        className="flex-1 h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-brand-teal text-sm font-bold"
                        value={settings?.allowedMonthlyPaidLeaves !== undefined ? settings.allowedMonthlyPaidLeaves : 1}
                        onChange={(e) => setSettings({...settings, allowedMonthlyPaidLeaves: parseInt(e.target.value) || 0})}
                        disabled={isUpdating || !canEditSettings}
                        min={0}
                      />
                      <div className="bg-gray-50 border border-border px-3 rounded-lg flex items-center text-[10px] font-bold text-muted-foreground">DAYS</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/30">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Monthly leaves up to <span className="font-bold text-foreground">{settings?.allowedMonthlyPaidLeaves !== undefined ? settings.allowedMonthlyPaidLeaves : 1}</span> day(s) are given <span className="text-brand-teal font-bold">free by the company (no salary cut)</span>. Any extra monthly leaves will be automatically treated as <span className="text-amber-600 font-bold">Unpaid Leave (salary cut)</span>.
                    </p>
                  </div>
                </div>
              </div>

            </Card>
          )}

          {/* Company Configuration Card */}
          {canViewSettings && (
            <Card className="p-6 border-border shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg text-foreground">Company Information</h3>
                    <Badge variant="outline" className="text-[9px] h-4 font-bold bg-white text-blue-600 border-blue-200">FINANCIALS</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Manage organization settings and billing details.</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* General Info & Address */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-brand-teal uppercase tracking-wider">General & Address Details</h4>
                  
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">Company Address (for Invoice Header)</Label>
                    <Textarea 
                      className="w-full bg-white border-border focus-visible:ring-brand-teal min-h-[80px]"
                      placeholder="Enter company's physical address"
                      value={settings?.companyAddress || ""}
                      onChange={(e) => setSettings({...settings, companyAddress: e.target.value})}
                      disabled={isUpdating || !canEditSettings}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Company Phone</Label>
                      <Input 
                        type="text" 
                        className="w-full bg-white border-border focus-visible:ring-brand-teal"
                        placeholder="e.g. +91 87805 64463"
                        value={settings?.companyPhone || ""}
                        onChange={(e) => setSettings({...settings, companyPhone: e.target.value})}
                        disabled={isUpdating || !canEditSettings}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Company Email</Label>
                      <Input 
                        type="email" 
                        className="w-full bg-white border-border focus-visible:ring-brand-teal"
                        placeholder="e.g. billing@hkdigiverse.com"
                        value={settings?.companyEmail || ""}
                        onChange={(e) => setSettings({...settings, companyEmail: e.target.value})}
                        disabled={isUpdating || !canEditSettings}
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Tax & ID Registrations */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-brand-teal uppercase tracking-wider">Tax & Registration IDs</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Company GSTIN</Label>
                      <Input 
                        type="text" 
                        className="w-full bg-white border-border font-semibold uppercase focus-visible:ring-brand-teal"
                        placeholder="e.g. 24AAXFN3372M1ZK"
                        value={settings?.companyGstin || ""}
                        onChange={(e) => setSettings({...settings, companyGstin: e.target.value})}
                        disabled={isUpdating || !canEditSettings}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Company PAN</Label>
                      <Input 
                        type="text" 
                        className="w-full bg-white border-border font-semibold uppercase focus-visible:ring-brand-teal"
                        placeholder="e.g. AAXFN3372M"
                        value={settings?.companyPan || ""}
                        onChange={(e) => setSettings({...settings, companyPan: e.target.value})}
                        disabled={isUpdating || !canEditSettings}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Company LLPIN</Label>
                      <Input 
                        type="text" 
                        className="w-full bg-white border-border font-semibold uppercase focus-visible:ring-brand-teal"
                        placeholder="e.g. ACK-1143"
                        value={settings?.companyLlpin || ""}
                        onChange={(e) => setSettings({...settings, companyLlpin: e.target.value})}
                        disabled={isUpdating || !canEditSettings}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">State / UT Code</Label>
                      <select 
                        className="w-full h-10 px-3 border border-border rounded-md text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-teal cursor-pointer font-medium text-slate-700"
                        value={settings?.companyState || ""}
                        onChange={(e) => setSettings({...settings, companyState: e.target.value})}
                        disabled={isUpdating || !canEditSettings}
                      >
                        <option value="">Select State...</option>
                        {INDIAN_STATES.map((state) => (
                          <option key={state.code} value={state.code}>
                            {state.code} - {state.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Note: Changing GSTIN updates the generated invoices.
                  </p>
                </div>

                <hr className="border-slate-100" />

                {/* Bank Details */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-brand-teal uppercase tracking-wider">Invoice Bank Details</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Bank Name</Label>
                      <Input 
                        type="text" 
                        className="w-full bg-white border-border focus-visible:ring-brand-teal"
                        placeholder="e.g. Axis Bank"
                        value={settings?.bankName || ""}
                        onChange={(e) => setSettings({...settings, bankName: e.target.value})}
                        disabled={isUpdating || !canEditSettings}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Account Number</Label>
                      <Input 
                        type="text" 
                        className="w-full bg-white border-border focus-visible:ring-brand-teal font-mono"
                        placeholder="e.g. 924020057377415"
                        value={settings?.bankAccountNumber || ""}
                        onChange={(e) => setSettings({...settings, bankAccountNumber: e.target.value})}
                        disabled={isUpdating || !canEditSettings}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">IFSC Code</Label>
                      <Input 
                        type="text" 
                        className="w-full bg-white border-border focus-visible:ring-brand-teal font-mono uppercase"
                        placeholder="e.g. UTIB0002891"
                        value={settings?.bankIfscCode || ""}
                        onChange={(e) => setSettings({...settings, bankIfscCode: e.target.value})}
                        disabled={isUpdating || !canEditSettings}
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Letterhead & Signature Uploads */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-foreground flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-brand-teal" /> Company Letterhead
                    </Label>
                    <p className="text-xs text-muted-foreground mb-4">
                      Upload a wide banner image to be automatically placed at the top of all generated documents (Offer Letters, Certificates, etc.).
                    </p>
                    
                    {settings?.companyLetterheadUrl && (
                      <div className="relative mb-4 border border-slate-200 rounded-xl overflow-hidden bg-white/50 p-4">
                        <img 
                          src={settings.companyLetterheadUrl.startsWith('http') ? settings.companyLetterheadUrl : `${API_URL}${settings.companyLetterheadUrl}`} 
                          alt="Letterhead Preview" 
                          className="w-full object-contain max-h-32 rounded border border-slate-100" 
                        />
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="absolute top-2 right-2 h-7 px-3 text-[10px]"
                          onClick={() => setSettings({...settings, companyLetterheadUrl: null})}
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4">
                      <Button asChild variant="outline" className="border-brand-teal text-brand-teal cursor-pointer">
                        <label>
                          <Upload className="w-4 h-4 mr-2" />
                          {settings?.companyLetterheadUrl ? 'Replace Letterhead' : 'Upload Letterhead'}
                          <input type="file" accept="image/*" className="hidden" onChange={handleLetterheadUpload} disabled={isUpdating} />
                        </label>
                      </Button>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-6 space-y-2">
                    <Label className="text-sm font-bold text-foreground flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-brand-teal" /> Authorized Signature for Invoices
                    </Label>
                    <p className="text-xs text-muted-foreground mb-4">
                      Upload an image of the authorized signature to be displayed on all company invoices.
                    </p>
                    
                    {settings?.companySignatureUrl && (
                      <div className="relative mb-4 border border-slate-200 rounded-xl overflow-hidden bg-white/50 p-4 max-w-xs">
                        <img 
                          src={settings.companySignatureUrl.startsWith('http') ? settings.companySignatureUrl : `${API_URL}${settings.companySignatureUrl}`} 
                          alt="Signature Preview" 
                          className="max-h-20 object-contain rounded border border-slate-100" 
                        />
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="absolute top-2 right-2 h-7 px-3 text-[10px]"
                          onClick={() => setSettings({...settings, companySignatureUrl: null})}
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4">
                      <Button asChild variant="outline" className="border-brand-teal text-brand-teal cursor-pointer">
                        <label>
                          <Upload className="w-4 h-4 mr-2" />
                          {settings?.companySignatureUrl ? 'Replace Signature' : 'Upload Signature'}
                          <input type="file" accept="image/*" className="hidden" onChange={handleSignatureUpload} disabled={isUpdating} />
                        </label>
                      </Button>
                    </div>
                  </div>

                  {/* Employee Signatures */}
                  <div className="border-t border-slate-100 pt-6 space-y-4">
                    <Label className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Users className="w-4 h-4 text-brand-teal" /> Employee Signatures
                    </Label>
                    <p className="text-xs text-muted-foreground mb-4">
                      Manage signatures for all employees. These can be used in dynamic documents like Offer Letters.
                    </p>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="border-brand-teal text-brand-teal h-10 px-4">
                          <Users className="w-4 h-4 mr-2" />
                          Manage Employee Signatures
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md" aria-describedby={undefined}>
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-brand-teal" />
                            Add Employee Signature
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6 mt-4">
                          <div className="space-y-2">
                            <Label>Select Employee</Label>
                            <Select value={selectedEmployeeIdForSign} onValueChange={setSelectedEmployeeIdForSign}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select an employee..." />
                              </SelectTrigger>
                              <SelectContent>
                                {employees.map(emp => (
                                  <SelectItem key={emp.id} value={emp.id}>{emp.name} ({emp.position || emp.role})</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Upload Signature Image</Label>
                            <div className="flex flex-col gap-4">
                              {signPreviewUrl ? (
                                <div className="relative border border-slate-200 rounded-lg bg-slate-50 p-4 flex justify-center items-center">
                                  <img 
                                    src={signPreviewUrl} 
                                    alt="Signature Preview"
                                    className="max-h-24 object-contain"
                                  />
                                  {employees.find(e => e.id === selectedEmployeeIdForSign)?.signatureUrl && !selectedSignFile && (
                                    <Button 
                                      variant="destructive" 
                                      size="sm" 
                                      className="absolute top-2 right-2 h-7 px-2"
                                      onClick={() => handleRemoveEmployeeSignature(selectedEmployeeIdForSign)}
                                      disabled={isUpdating}
                                    >
                                      <X className="w-4 h-4 mr-1" />
                                      Remove
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                <div className="border border-dashed border-slate-300 rounded-lg bg-slate-50 h-24 flex items-center justify-center">
                                  <span className="text-sm text-slate-400">No signature</span>
                                </div>
                              )}
                              
                              <div className="flex items-center gap-3">
                                <Button asChild variant="outline" className={`flex-1 border-brand-teal text-brand-teal h-10 cursor-pointer ${!selectedEmployeeIdForSign ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                  <label>
                                    <Upload className="w-4 h-4 mr-2" />
                                    {signPreviewUrl ? 'Select Different Image' : 'Select Signature'}
                                    <input 
                                      type="file" 
                                      accept="image/*" 
                                      className="hidden" 
                                      onChange={handleFileSelect} 
                                      disabled={!selectedEmployeeIdForSign || isUpdating} 
                                    />
                                  </label>
                                </Button>
                                
                                {selectedSignFile && (
                                  <Button 
                                    className="flex-1 bg-brand-teal hover:bg-brand-teal-light text-white h-10"
                                    onClick={handleSaveSignature}
                                    disabled={isUpdating}
                                  >
                                    {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                    Save Signature
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            </Card>
          )}
          {/* Invoice Configuration Card */}
          {canViewSettings && (
            <Card className="p-6 border-border shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-brand-light rounded-lg">
                  <FileText className="w-5 h-5 text-brand-teal" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">Invoice Configuration</h3>
                  <p className="text-xs text-muted-foreground">Define prefixes used for the invoice numbering series.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold">Tax Invoice Prefix</Label>
                    <input 
                      type="text" 
                      className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-brand-teal text-sm font-bold uppercase"
                      value={settings?.taxInvoicePrefix || ""}
                      onChange={(e) => setSettings({...settings, taxInvoicePrefix: e.target.value.toUpperCase()})}
                      disabled={isUpdating || !canEditSettings}
                      placeholder="e.g. INV"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold">Proforma Invoice Prefix</Label>
                    <input 
                      type="text" 
                      className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-brand-teal text-sm font-bold uppercase"
                      value={settings?.proformaInvoicePrefix || ""}
                      onChange={(e) => setSettings({...settings, proformaInvoicePrefix: e.target.value.toUpperCase()})}
                      disabled={isUpdating || !canEditSettings}
                      placeholder="e.g. PINV"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold">No-Tax Invoice Prefix</Label>
                    <input 
                      type="text" 
                      className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-brand-teal text-sm font-bold uppercase"
                      value={settings?.noTaxInvoicePrefix || ""}
                      onChange={(e) => setSettings({...settings, noTaxInvoicePrefix: e.target.value.toUpperCase()})}
                      disabled={isUpdating || !canEditSettings}
                      placeholder="e.g. NINV"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                    <div>
                      <Label className="text-sm font-bold">Add on-hold days to Digital Marketing Department Project End Date</Label>
                      <p className="text-[10px] text-muted-foreground">Automatically add on-hold days to the calculated end date (Digital Marketing only).</p>
                    </div>
                    <Switch
                      checked={settings?.addHoldDaysToEndDate !== undefined ? settings.addHoldDaysToEndDate : true}
                      onCheckedChange={(checked) => setSettings({...settings, addHoldDaysToEndDate: checked})}
                      disabled={isUpdating || !canEditSettings}
                    />
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold">Client Departments (Comma Separated)</Label>
                    <p className="text-[10px] text-muted-foreground mb-1">These departments will appear in a dropdown when creating or editing an Invoice.</p>
                    <input 
                      type="text" 
                      className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-brand-teal text-sm font-bold"
                      value={deptInput !== null ? deptInput : (settings?.invoiceClientDepartments || []).join(", ")}
                      onChange={(e) => setDeptInput(e.target.value)}
                      onBlur={(e) => {
                        setSettings({...settings, invoiceClientDepartments: e.target.value.split(",").map(s => s.trim()).filter(Boolean)});
                        setDeptInput(null);
                      }}
                      disabled={isUpdating || !canEditSettings}
                      placeholder="e.g. Billing Department, Support, Sales"
                    />
                  </div>
                
                  <div className="space-y-1">
                    <Label className="text-sm font-bold">Other Categories (Comma Separated)</Label>
                    <p className="text-[10px] text-muted-foreground mb-1">These are the main subcategories that appear under 'Other' when punching in.</p>
                    <input 
                      type="text" 
                      className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-brand-teal text-sm font-bold"
                      value={categoriesInput !== null ? categoriesInput : (settings?.otherCategories || ["Activity", "Meeting"]).join(", ")}
                      onChange={(e) => setCategoriesInput(e.target.value)}
                      onBlur={(e) => {
                        setSettings({...settings, otherCategories: e.target.value.split(",").map(s => s.trim()).filter(Boolean)});
                        setCategoriesInput(null);
                      }}
                      disabled={isUpdating || !canEditSettings}
                      placeholder="e.g. Activity, Meeting, Training"
                    />
                  </div>
                </div>
                <div className="col-span-1 md:col-span-2 border-t border-slate-100 pt-6 mt-4">
                  <Label className="text-sm font-bold text-foreground block mb-2">Invoice Theme Gradient</Label>
                  <p className="text-xs text-muted-foreground mb-4">Choose two colors to customize the gradient background of invoice badges, table headers, and total banners.</p>
                  
                  <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-muted-foreground">Color 1 (Start)</Label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="color" 
                            className="w-10 h-10 rounded-lg cursor-pointer border border-border p-1 bg-white"
                            value={settings?.invoiceColor1 || "#08304b"}
                            onChange={(e) => setSettings({...settings, invoiceColor1: e.target.value})}
                            disabled={isUpdating || !canEditSettings}
                          />
                          <input 
                            type="text" 
                            className="w-24 h-10 px-2 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-brand-teal text-xs font-mono uppercase"
                            value={settings?.invoiceColor1 || "#08304b"}
                            onChange={(e) => setSettings({...settings, invoiceColor1: e.target.value})}
                            disabled={isUpdating || !canEditSettings}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-muted-foreground">Color 2 (End)</Label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="color" 
                            className="w-10 h-10 rounded-lg cursor-pointer border border-border p-1 bg-white"
                            value={settings?.invoiceColor2 || "#08304b"}
                            onChange={(e) => setSettings({...settings, invoiceColor2: e.target.value})}
                            disabled={isUpdating || !canEditSettings}
                          />
                          <input 
                            type="text" 
                            className="w-24 h-10 px-2 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-brand-teal text-xs font-mono uppercase"
                            value={settings?.invoiceColor2 || "#08304b"}
                            onChange={(e) => setSettings({...settings, invoiceColor2: e.target.value})}
                            disabled={isUpdating || !canEditSettings}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Gradient Preview Box */}
                    <div className="flex-1 min-w-[200px] h-[52px] rounded-lg border border-border relative flex items-center justify-center font-bold text-white text-xs select-none shadow-sm"
                      style={{ background: `linear-gradient(135deg, ${settings?.invoiceColor1 || '#08304b'}, ${settings?.invoiceColor2 || '#08304b'})` }}>
                      TAX INVOICE GRADIENT PREVIEW
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {canViewSettings && (
            <Card className="bg-white border border-border/40 shadow-sm overflow-hidden mb-6">
              <div className="border-b border-border/40 bg-slate-50/50 p-4 px-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-brand-teal/10 flex items-center justify-center text-brand-teal">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 text-sm">SMM Content Calendar Defaults</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Global default day offsets for automatic date calculations.</p>
                  </div>
                </div>
                {canEditSettings && (
                  <Button 
                    size="sm" 
                    className="h-8 text-xs bg-brand-teal hover:bg-brand-teal/90"
                    onClick={handleSaveAllSettings}
                    disabled={isUpdating}
                  >
                    {isUpdating ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Save className="w-3 h-3 mr-1.5" />}
                    Save Changes
                  </Button>
                )}
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">Script Date Offset</Label>
                    <Input 
                      type="number" 
                      className="w-full bg-white border-border focus-visible:ring-brand-teal"
                      value={settings?.defaultScriptDateOffset ?? ""}
                      onChange={(e) => setSettings({...settings, defaultScriptDateOffset: e.target.value ? Number(e.target.value) : undefined})}
                      disabled={isUpdating || !canEditSettings}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">Shoot Date Offset</Label>
                    <Input 
                      type="number" 
                      className="w-full bg-white border-border focus-visible:ring-brand-teal"
                      value={settings?.defaultShootDateOffset ?? ""}
                      onChange={(e) => setSettings({...settings, defaultShootDateOffset: e.target.value ? Number(e.target.value) : undefined})}
                      disabled={isUpdating || !canEditSettings}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">Editing Start Offset</Label>
                    <Input 
                      type="number" 
                      className="w-full bg-white border-border focus-visible:ring-brand-teal"
                      value={settings?.defaultEditingStartOffset ?? ""}
                      onChange={(e) => setSettings({...settings, defaultEditingStartOffset: e.target.value ? Number(e.target.value) : undefined})}
                      disabled={isUpdating || !canEditSettings}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">Approval Offset</Label>
                    <Input 
                      type="number" 
                      className="w-full bg-white border-border focus-visible:ring-brand-teal"
                      value={settings?.defaultApprovalOffset ?? ""}
                      onChange={(e) => setSettings({...settings, defaultApprovalOffset: e.target.value ? Number(e.target.value) : undefined})}
                      disabled={isUpdating || !canEditSettings}
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}

      </div>
    </div>
  );
}

function Badge({ children, variant, className }: any) {
  const styles: any = {
    outline: "border border-slate-200 text-slate-500",
    default: "bg-brand-teal text-white"
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] inline-flex items-center ${styles[variant || 'default']} ${className}`}>
      {children}
    </span>
  );
}
