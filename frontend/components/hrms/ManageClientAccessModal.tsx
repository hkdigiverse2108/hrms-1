'use client'

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { API_URL } from "@/lib/config";
import { Checkbox } from "@/components/ui/checkbox";

interface ManageClientAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientNames: string[];
}

export function ManageClientAccessModal({ isOpen, onClose, clientNames }: ManageClientAccessModalProps) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [fetchingPerms, setFetchingPerms] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [permissions, setPermissions] = useState<any[]>([]);
  const [restrictClients, setRestrictClients] = useState(false);
  const [allowedClients, setAllowedClients] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchEmployees();
      setSelectedEmployeeId("");
      setPermissions([]);
      setRestrictClients(false);
      setAllowedClients([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedEmployeeId) {
      fetchPermissions(selectedEmployeeId);
    } else {
      setPermissions([]);
    }
  }, [selectedEmployeeId]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const [empRes, permRes] = await Promise.all([
        fetch(`${API_URL}/employees`),
        fetch(`${API_URL}/user-permissions/all`)
      ]);
      
      if (empRes.ok && permRes.ok) {
        const empData = await empRes.json();
        const permData = await permRes.json();
        
        const allowedEmployeeIds = new Set(
          (permData || [])
            .filter((up: any) => {
              const mod = up.permissions?.find((p: any) => p.moduleName === 'company-finance-client-transactions');
              return mod && mod.canView === true;
            })
            .map((up: any) => up.employeeId)
        );

        setEmployees(empData.filter((e: any) => e.role?.toLowerCase() !== 'admin' && allowedEmployeeIds.has(e.id || e._id)));
      } else {
        toast.error("Failed to fetch employee permissions");
      }
    } catch (error) {
      toast.error("Failed to fetch employees");
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async (empId: string) => {
    setFetchingPerms(true);
    try {
      const res = await fetch(`${API_URL}/user-permissions/${empId}`);
      if (res.ok) {
        const data = await res.json();
        const perms = data?.permissions || [];
        setPermissions(perms);
        
        const modulePerm = perms.find((p: any) => p.moduleName === 'company-finance-client-transactions');
        setRestrictClients(modulePerm?.restrictClients || false);
        setAllowedClients(modulePerm?.allowedClients || []);
      }
    } catch (error) {
      toast.error("Failed to fetch permissions");
    } finally {
      setFetchingPerms(false);
    }
  };

  const handleToggleClient = (clientName: string) => {
    setAllowedClients(prev => {
      if (prev.includes(clientName)) {
        return prev.filter(c => c !== clientName);
      } else {
        return [...prev, clientName];
      }
    });
  };

  const handleSave = async () => {
    if (!selectedEmployeeId) return;
    
    const moduleIndex = permissions.findIndex((p: any) => p.moduleName === 'company-finance-client-transactions');
    let newPermissions = [...permissions];
    
    if (moduleIndex >= 0) {
      newPermissions[moduleIndex] = {
        ...newPermissions[moduleIndex],
        restrictClients,
        allowedClients: restrictClients ? allowedClients : []
      };
    } else {
      newPermissions.push({
        moduleName: 'company-finance-client-transactions',
        displayName: 'Other Transactions',
        tabUrl: '/company-finance/client-transactions',
        canAdd: false,
        canEdit: false,
        canDelete: false,
        canView: false,
        restrictClients,
        allowedClients: restrictClients ? allowedClients : []
      });
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const headers: any = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/user-permissions/${selectedEmployeeId}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ permissions: newPermissions })
      });

      if (res.ok) {
        toast.success("Client access updated successfully");
        onClose();
      } else {
        toast.error("Failed to update access");
      }
    } catch (error) {
      toast.error("Error saving access control");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            Manage Client Access
          </DialogTitle>
          <DialogDescription>
            Restrict which clients a specific employee can view and manage in Other Transactions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Select Employee</label>
            {loading ? (
              <div className="h-10 border rounded-lg flex items-center px-3 text-slate-400 bg-slate-50">Loading...</div>
            ) : (
              <select
                className="w-full border-slate-200 rounded-lg shadow-sm h-10 px-3 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
              >
                <option value="">-- Choose Employee --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.designation})</option>
                ))}
              </select>
            )}
          </div>

          {selectedEmployeeId && (
            fetchingPerms ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <Checkbox 
                    id="restrict-clients"
                    checked={restrictClients}
                    onCheckedChange={(c) => setRestrictClients(!!c)}
                    className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                  />
                  <div className="grid gap-0.5 leading-none">
                    <label htmlFor="restrict-clients" className="font-bold text-slate-800 cursor-pointer">
                      Enable Client Restriction
                    </label>
                    <p className="text-sm text-slate-500">
                      If enabled, this user will only see transactions for the selected clients below.
                    </p>
                  </div>
                </div>

                {restrictClients && (
                  <div className="space-y-3 border border-slate-200 rounded-xl p-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                    <label className="text-sm font-bold text-slate-700 block mb-2">Allowed Clients</label>
                    {clientNames.length === 0 ? (
                      <p className="text-sm text-slate-500 italic">No clients found in the system.</p>
                    ) : (
                      clientNames.map(name => (
                        <div key={name} className="flex items-center gap-3">
                          <Checkbox
                            id={`client-${name}`}
                            checked={allowedClients.includes(name)}
                            onCheckedChange={() => handleToggleClient(name)}
                          />
                          <label htmlFor={`client-${name}`} className="text-sm font-medium leading-none cursor-pointer">
                            {name}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                )}

                <div className="pt-4 flex justify-end gap-3 border-t">
                  <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
                  <Button 
                    onClick={handleSave} 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Access
                  </Button>
                </div>
              </div>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
