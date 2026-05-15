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
  Timer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/common/PageHeader";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { API_URL } from "@/lib/config";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";

export default function SettingsPage() {
  const { user, updateUser } = useUserContext();
  const { checkPermission, isAdmin } = usePermissions();
  const router = useRouter();
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (user) {
      const role = user.role?.toLowerCase();
      const hasPermission = user.permissions?.find((p: any) => p.moduleName === 'settings')?.canView;
      
      if (role !== 'admin' && role !== 'hr' && !hasPermission) {
        router.push('/');
        return;
      }
      fetchSettings();
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
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader 
        title="Settings" 
        description="Manage your account preferences, system security, and module access."
      />

      <div className="max-w-4xl mx-auto space-y-6">
          {/* Access Control Card */}
          {isAdmin && (
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
                      disabled={isUpdating || user?.role !== 'Admin'}
                    />
                  )}
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
                  <div className="flex gap-2">
                    <input 
                      type="time" 
                      className="flex-1 h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-brand-teal text-sm"
                      value={settings?.officeStartTime || "09:30"}
                      onChange={(e) => setSettings({...settings, officeStartTime: e.target.value})}
                      onBlur={(e) => handleUpdateShiftSettings('officeStartTime', e.target.value)}
                      disabled={isUpdating || user?.role !== 'Admin'}
                    />
                    <div className="bg-gray-50 border border-border px-3 rounded-lg flex items-center text-[10px] font-bold text-muted-foreground">AM</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-bold">Office End Time</Label>
                  <div className="flex gap-2">
                    <input 
                      type="time" 
                      className="flex-1 h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-brand-teal text-sm"
                      value={settings?.officeEndTime || "18:30"}
                      onChange={(e) => setSettings({...settings, officeEndTime: e.target.value})}
                      onBlur={(e) => handleUpdateShiftSettings('officeEndTime', e.target.value)}
                      disabled={isUpdating || user?.role !== 'Admin'}
                    />
                    <div className="bg-gray-50 border border-border px-3 rounded-lg flex items-center text-[10px] font-bold text-muted-foreground">PM</div>
                  </div>
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
                        value={settings?.lateBufferMins || 10}
                        onChange={(e) => setSettings({...settings, lateBufferMins: parseInt(e.target.value)})}
                        onBlur={(e) => handleUpdateShiftSettings('lateBufferMins', parseInt(e.target.value))}
                        disabled={isUpdating || user?.role !== 'Admin'}
                      />
                      <span className="text-xs text-muted-foreground font-medium">minutes</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Employees punching in after <span className="font-bold text-foreground">{settings?.officeStartTime || "09:30"}</span> + this buffer will be automatically marked as <span className="text-amber-600 font-bold">Late Entry</span>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>



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
