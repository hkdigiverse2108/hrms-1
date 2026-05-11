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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Access Control Card */}
          {(isAdmin || checkPermission('access-control', 'canView')) && (
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

          {/* Role Simulator Card */}
          <Card className="p-0 overflow-hidden border-border shadow-sm">
            <div className="p-6 border-b border-border bg-gray-50/50">
              <h3 className="font-bold text-lg text-foreground">Role Simulator</h3>
              <p className="text-sm text-muted-foreground">Switch your role to preview different dashboard views.</p>
            </div>
            <div className="p-6 space-y-4">
              {roles.map((role) => (
                <div 
                  key={role.id}
                  onClick={() => handleRoleSwitch(role.id)}
                  className={`group relative flex items-start gap-4 p-5 rounded-xl border transition-all cursor-pointer ${
                    user?.role === role.id 
                    ? 'border-brand-teal bg-brand-light/30 ring-1 ring-brand-teal' 
                    : 'border-border hover:border-brand-teal/50 hover:bg-gray-50'
                  }`}
                >
                  <div className={`p-3 rounded-xl border ${
                    user?.role === role.id ? 'bg-white border-brand-teal/20' : 'bg-gray-50 border-border'
                  }`}>
                    {role.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-[15px] text-foreground">{role.name}</h4>
                      {user?.role === role.id && (
                        <span className="bg-brand-teal text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> Active
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-muted-foreground leading-relaxed pr-8">{role.description}</p>
                    
                    <div className="mt-4 flex flex-wrap gap-2">
                       {role.capabilities.map((cap, i) => (
                         <span key={i} className="text-[10px] font-bold text-muted-foreground bg-gray-100 px-2 py-1 rounded-md">
                           {cap}
                         </span>
                       ))}
                    </div>
                  </div>
                  <div className={`absolute right-5 top-1/2 -translate-y-1/2 transition-all ${
                    user?.role === role.id ? 'text-brand-teal translate-x-0' : 'text-gray-300 translate-x-2 opacity-0 group-hover:opacity-100'
                  }`}>
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              ))}
            </div>
          </Card>

        </div>

        <div className="space-y-6">
          <Card className="p-6 border-border shadow-sm">
            <h3 className="font-bold text-lg mb-4">Quick Stats</h3>
            <div className="space-y-4">
               <div className="flex justify-between items-center py-2 border-b border-gray-50">
                 <span className="text-sm text-muted-foreground">Current Role</span>
                 <span className="text-sm font-bold text-brand-teal uppercase">{user?.role}</span>
               </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-sm text-muted-foreground">Late Punch Cut</span>
                  <span className="text-sm font-bold text-foreground">
                    {settings?.latePunchDeductionEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
               <div className="flex justify-between items-center py-2">
                 <span className="text-sm text-muted-foreground">Last Settings Sync</span>
                 <span className="text-sm font-bold text-foreground">Success</span>
               </div>
            </div>
            <Button className="w-full mt-6 bg-brand-teal hover:bg-brand-teal-light text-white font-bold h-11 rounded-xl" onClick={fetchSettings}>
               Sync Settings
            </Button>
          </Card>

          <Card className="p-6 border-border shadow-sm overflow-hidden relative">
             <ShieldAlert className="absolute -right-4 -bottom-4 w-24 h-24 text-amber-50 -rotate-12" />
             <h4 className="font-bold text-[15px] mb-2 relative z-10">Access Notice</h4>
             <p className="text-xs text-muted-foreground mb-4 relative z-10 leading-relaxed">
               Module restriction toggles allow administrators to control which departments or roles can see sensitive business data.
             </p>
             <Button variant="outline" className="w-full relative z-10 h-10 font-bold border-border text-xs rounded-lg" disabled>
                View Audit Logs
             </Button>
          </Card>
        </div>
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
