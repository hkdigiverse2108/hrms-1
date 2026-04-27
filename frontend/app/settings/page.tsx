"use client";
 
import React from "react";
import { useUserContext } from "@/context/UserContext";
import { 
  ShieldCheck, 
  UserCircle, 
  Users, 
  ShieldAlert, 
  LayoutDashboard,
  Check,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/common/PageHeader";
 
export default function SettingsPage() {
  const { user, updateUser } = useUserContext();
 
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
        description="Manage your account preferences and dashboard access levels."
      />
 
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
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
 
          <Card className="p-6 border-border shadow-sm bg-amber-50/30 border-amber-100">
             <div className="flex gap-4">
               <div className="p-3 bg-amber-100 rounded-xl h-fit">
                 <ShieldAlert className="w-6 h-6 text-amber-700" />
               </div>
               <div>
                 <h4 className="font-bold text-amber-900 text-[15px] mb-1">About Role Based Access</h4>
                 <p className="text-[13px] text-amber-800/80 leading-relaxed">
                   Changes made here will update your current session instantly. In a production environment, 
                   these permissions are strictly enforced by the server based on the user's permanent role in the database.
                 </p>
               </div>
             </div>
          </Card>
        </div>
 
        <div className="space-y-6">
          <Card className="p-6 border-border shadow-sm">
            <h3 className="font-bold text-lg mb-4">Quick Stats</h3>
            <div className="space-y-4">
               <div className="flex justify-between items-center py-2 border-b border-gray-50">
                 <span className="text-sm text-muted-foreground">Current Role</span>
                 <span className="text-sm font-bold text-brand-teal">{user?.role}</span>
               </div>
               <div className="flex justify-between items-center py-2 border-b border-gray-50">
                 <span className="text-sm text-muted-foreground">Permissions</span>
                 <span className="text-sm font-bold text-foreground">Custom</span>
               </div>
               <div className="flex justify-between items-center py-2">
                 <span className="text-sm text-muted-foreground">Last Update</span>
                 <span className="text-sm font-bold text-foreground">Just now</span>
               </div>
            </div>
            <Button className="w-full mt-6 bg-brand-teal hover:bg-brand-teal-light text-white font-bold h-11 rounded-xl">
               Apply Globally
            </Button>
          </Card>
 
          <Card className="p-6 border-border shadow-sm overflow-hidden relative">
             <LayoutDashboard className="absolute -right-4 -bottom-4 w-24 h-24 text-gray-100 -rotate-12" />
             <h4 className="font-bold text-[15px] mb-2 relative z-10">Dashboard View</h4>
             <p className="text-xs text-muted-foreground mb-4 relative z-10 leading-relaxed">
               Each role has a unique dashboard tailored to their daily tasks and responsibilities.
             </p>
             <Button variant="outline" className="w-full relative z-10 h-10 font-bold border-border text-xs rounded-lg">
                Preview Layouts
             </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
