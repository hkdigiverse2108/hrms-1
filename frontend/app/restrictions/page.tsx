"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Monitor,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Send,
  RefreshCw,
  Search,
  CheckCircle,
  HelpCircle,
  Plus,
  Trash2,
  AlertTriangle,
  Bell,
} from "lucide-react";
import { API_URL } from "@/lib/config";
import { message } from "antd";

export default function RestrictionsPage() {
  const [pcs, setPcs] = useState<any[]>([]);
  const [localInfo, setLocalInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"pcs" | "broadcast" | "alerts">("pcs");

  // Security alerts state
  const [securityAlerts, setSecurityAlerts] = useState<any[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);

  // Edit states
  const [editingPc, setEditingPc] = useState<any>(null);
  const [blockChrome, setBlockChrome] = useState(false);
  const [blockYoutube, setBlockYoutube] = useState(false);
  const [blockApps, setBlockApps] = useState<string[]>([""]);
  const [blockUrls, setBlockUrls] = useState<string[]>([""]);

  // Broadcast states
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const handleAddApp = () => {
    setBlockApps([...blockApps, ""]);
  };

  const handleRemoveApp = (index: number) => {
    const newApps = blockApps.filter((_, i) => i !== index);
    setBlockApps(newApps.length > 0 ? newApps : [""]);
  };

  const handleAppChange = (index: number, value: string) => {
    const newApps = [...blockApps];
    newApps[index] = value;
    setBlockApps(newApps);
  };

  const handleAddUrl = () => {
    setBlockUrls([...blockUrls, ""]);
  };

  const handleRemoveUrl = (index: number) => {
    const newUrls = blockUrls.filter((_, i) => i !== index);
    setBlockUrls(newUrls.length > 0 ? newUrls : [""]);
  };

  const handleUrlChange = (index: number, value: string) => {
    const newUrls = [...blockUrls];
    newUrls[index] = value;
    setBlockUrls(newUrls);
  };

  const fetchPcsAndInfo = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

      // Get system info (current PC)
      const infoRes = await fetch(`${API_URL}/system/info`, { headers });
      if (infoRes.ok) {
        const info = await infoRes.json();
        setLocalInfo(info);
      }

      // Get registered PCs
      const pcsRes = await fetch(`${API_URL}/restrictions/pcs`, { headers });
      if (pcsRes.ok) {
        const data = await pcsRes.json();
        setPcs(data);
      }
    } catch (err) {
      console.error("Error fetching PCs and system info:", err);
      message.error("Failed to load restriction data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPcsAndInfo();
    fetchSecurityAlerts();
  }, []);

  const fetchSecurityAlerts = async () => {
    setAlertsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_URL}/security/alerts`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSecurityAlerts(data);
      }
    } catch (err) {
      console.error("Error fetching security alerts:", err);
    } finally {
      setAlertsLoading(false);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = token
        ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
        : { "Content-Type": "application/json" };
      const res = await fetch(`${API_URL}/security/alerts/${alertId}/resolve`, {
        method: "PUT",
        headers,
      });
      if (res.ok) {
        message.success("Alert marked as resolved.");
        fetchSecurityAlerts();
      }
    } catch (err) {
      message.error("Failed to resolve alert.");
    }
  };

  const handleEditPolicy = (pc: any) => {
    setEditingPc(pc);
    setBlockChrome(pc.blockChrome || false);
    setBlockYoutube(pc.blockYoutube || false);
    setBlockApps(pc.blockApps && pc.blockApps.length > 0 ? pc.blockApps : [""]);
    setBlockUrls(pc.blockUrls && pc.blockUrls.length > 0 ? pc.blockUrls : [""]);
  };

  const handleSavePolicy = async () => {
    if (!editingPc) return;
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = token
        ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
        : { "Content-Type": "application/json" };

      const updatedApps = blockApps
        .map((a) => a.trim())
        .filter((a) => a !== "");
      const updatedUrls = blockUrls
        .map((u) => u.trim())
        .filter((u) => u !== "");

      const body = {
        blockChrome,
        blockYoutube,
        blockApps: updatedApps,
        blockUrls: updatedUrls,
      };

      const res = await fetch(`${API_URL}/restrictions/pcs/${editingPc.hostname}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
      });

      if (res.ok) {
        message.success(`Restrictions updated for PC: ${editingPc.hostname}`);
        setEditingPc(null);
        fetchPcsAndInfo();
      } else {
        message.error("Failed to update restrictions.");
      }
    } catch (err) {
      console.error("Error saving policy:", err);
      message.error("Failed to save restrictions policy.");
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastMsg.trim()) {
      message.warning("Broadcast message cannot be empty.");
      return;
    }

    setIsBroadcasting(true);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = token
        ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
        : { "Content-Type": "application/json" };

      const body = {
        title: broadcastTitle.trim() || "System Broadcast",
        message: broadcastMsg.trim(),
      };

      const res = await fetch(`${API_URL}/system/broadcast`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (res.ok) {
        message.success("Live broadcast sent successfully!");
        setBroadcastTitle("");
        setBroadcastMsg("");
      } else {
        message.error("Failed to send broadcast announcement.");
      }
    } catch (err) {
      console.error("Error sending broadcast:", err);
      message.error("Broadcast failed.");
    } finally {
      setIsBroadcasting(false);
    }
  };

  const filteredPcs = pcs.filter((pc) =>
    pc.hostname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pc.ipAddress?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Restrictions & Policies"
        description="Configure PC-level restrictions, software blockers, and send system-wide announcements."
      />

      {localInfo && (
        <Card className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shadow-xl border-none">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600/30 p-3 rounded-lg border border-indigo-500/20">
                  <Monitor className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-100">This Computer</h4>
                  <p className="text-sm text-slate-300">
                    Hostname: <span className="font-mono text-indigo-300">{localInfo.hostname}</span> &bull; IP: <span className="font-mono text-indigo-300">{localInfo.ipAddress}</span>
                  </p>
                </div>
              </div>
              <div className="bg-slate-800/40 px-4 py-2 rounded-lg border border-slate-700/30 text-xs text-slate-300">
                OS: <span className="text-slate-100 font-semibold">{localInfo.os} ({localInfo.osVersion})</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab Selectors */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "pcs"
              ? "border-brand-teal text-brand-teal"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
          onClick={() => setActiveTab("pcs")}
        >
          PC Restrictions ({pcs.length})
        </button>
        <button
          className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "broadcast"
              ? "border-brand-teal text-brand-teal"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
          onClick={() => setActiveTab("broadcast")}
        >
          Live System Broadcast
        </button>
        <button
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "alerts"
              ? "border-red-500 text-red-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
          onClick={() => { setActiveTab("alerts"); fetchSecurityAlerts(); }}
        >
          <AlertTriangle className="w-4 h-4" />
          Security Alerts
          {securityAlerts.filter((a) => !a.resolved).length > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 ml-1">
              {securityAlerts.filter((a) => !a.resolved).length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "pcs" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* PC List Table Card */}
          <Card className="lg:col-span-2 shadow-sm border border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-base font-bold">Registered PC Devices</CardTitle>
              <div className="flex gap-2">
                <div className="relative w-48 sm:w-60">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search PC / IP..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
                <Button variant="outline" size="icon" onClick={fetchPcsAndInfo} className="h-9 w-9">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500 font-semibold bg-slate-50/50">
                      <th className="py-3 px-4">Hostname</th>
                      <th className="py-3 px-4">Active User</th>
                      <th className="py-3 px-4">IP Address</th>
                      <th className="py-3 px-4">OS</th>
                      <th className="py-3 px-4">Restrictions</th>
                      <th className="py-3 px-4 text-right sticky right-0 z-20 bg-slate-50 shadow-[-1px_0_0_0_#e2e8f0]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPcs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No registered PCs found.
                        </td>
                      </tr>
                    ) : (
                      filteredPcs.map((pc) => {
                        const hasRestrictions =
                          pc.blockChrome ||
                          pc.blockYoutube ||
                          pc.blockApps?.length > 0 ||
                          pc.blockUrls?.length > 0;

                        return (
                          <tr key={pc.id} className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors group">
                            <td className="py-3.5 px-4 font-mono font-medium text-slate-800">{pc.hostname}</td>
                            <td className="py-3.5 px-4 text-slate-600 font-semibold">{pc.activeEmployee || "None / Inactive"}</td>
                            <td className="py-3.5 px-4 font-mono text-slate-600">{pc.ipAddress}</td>
                            <td className="py-3.5 px-4 text-slate-600">{pc.os}</td>
                            <td className="py-3.5 px-4">
                              {hasRestrictions ? (
                                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                                  <ShieldAlert className="w-3.5 h-3.5" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Unrestricted
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right sticky right-0 z-10 bg-white group-hover:bg-slate-50 shadow-[-1px_0_0_0_#e2e8f0] transition-colors">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditPolicy(pc)}
                                className="h-8 text-xs font-semibold"
                              >
                                Edit Policy
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Edit Policy Card */}
          <Card className="shadow-sm border border-slate-200">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Shield className="w-5 h-5 text-brand-teal" />
                {editingPc ? `Policy: ${editingPc.hostname}` : "Select a PC"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editingPc ? (
                <div className="space-y-5">
                  <div className="space-y-4">
                    {/* Chrome Toggle */}
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="blockChrome"
                        checked={blockChrome}
                        onCheckedChange={(checked) => setBlockChrome(!!checked)}
                      />
                      <label
                        htmlFor="blockChrome"
                        className="text-xs font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-75 cursor-pointer text-slate-700"
                      >
                        Block Google Chrome entirely
                      </label>
                    </div>

                    {/* Youtube Toggle */}
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="blockYoutube"
                        checked={blockYoutube}
                        onCheckedChange={(checked) => setBlockYoutube(!!checked)}
                        disabled={blockChrome} // No need to block youtube if chrome is disabled completely
                      />
                      <label
                        htmlFor="blockYoutube"
                        className="text-xs font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-75 cursor-pointer text-slate-700"
                      >
                        Block YouTube (Chrome tab closure)
                      </label>
                    </div>

                    {/* Block Extra Apps */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Block Additional Applications
                      </label>
                      <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                        {blockApps.map((app, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <Input
                              placeholder="e.g. spotify.exe"
                              value={app}
                              onChange={(e) => handleAppChange(idx, e.target.value)}
                              className="h-9 text-xs flex-1"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => handleRemoveApp(idx)}
                              className="h-9 w-9 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            {idx === blockApps.length - 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={handleAddApp}
                                className="h-9 w-9 text-indigo-600 hover:text-indigo-800"
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            )}
                            {idx !== blockApps.length - 1 && (
                              <div className="w-9" />
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Executable names of background software (one per row).
                      </p>
                    </div>

                    {/* Block Extra URLs */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Block Additional Website Domains
                      </label>
                      <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                        {blockUrls.map((url, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <Input
                              placeholder="e.g. facebook.com"
                              value={url}
                              onChange={(e) => handleUrlChange(idx, e.target.value)}
                              className="h-9 text-xs flex-1"
                              disabled={blockChrome}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => handleRemoveUrl(idx)}
                              className="h-9 w-9 text-red-500 hover:text-red-700"
                              disabled={blockChrome}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            {idx === blockUrls.length - 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={handleAddUrl}
                                className="h-9 w-9 text-indigo-600 hover:text-indigo-800"
                                disabled={blockChrome}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            )}
                            {idx !== blockUrls.length - 1 && (
                              <div className="w-9" />
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Keywords or URLs of websites to block (one per row).
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleSavePolicy} className="flex-1 bg-brand-teal hover:bg-brand-teal/90 text-white text-xs h-9">
                      Apply Rules
                    </Button>
                    <Button variant="ghost" onClick={() => setEditingPc(null)} className="text-xs h-9">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                  <HelpCircle className="w-8 h-8 text-slate-300" />
                  <p className="text-xs">Click "Edit Policy" on any registered computer to configure app & URL restrictions.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "broadcast" && (
        <Card className="max-w-2xl mx-auto shadow-sm border border-slate-200">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Send className="w-5 h-5 text-brand-teal" />
              Broadcast Live Announcement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">Announcement Title</label>
              <Input
                placeholder="e.g. Scheduled Maintenance, Urgrent Notice"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                className="h-10 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">Message Content</label>
              <textarea
                placeholder="Type the message that will pop up on all logged-in PCs..."
                value={broadcastMsg}
                onChange={(e) => setBroadcastMsg(e.target.value)}
                rows={5}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <Button
              onClick={handleSendBroadcast}
              disabled={isBroadcasting}
              className="w-full bg-brand-teal hover:bg-brand-teal/90 text-white font-semibold text-xs h-10 mt-2"
            >
              {isBroadcasting ? "Broadcasting..." : "Broadcast Announcement"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Security Alerts Tab ─────────────────────────────────────────── */}
      {activeTab === "alerts" && (
        <div className="space-y-4">
          <Card className="shadow-sm border border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-500" />
                Security Tamper Alerts
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchSecurityAlerts}
                disabled={alertsLoading}
                className="h-8 text-xs"
              >
                <RefreshCw className={`w-3 h-3 mr-1.5 ${alertsLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {/* Info banner */}
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2 text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <strong>macOS Bypass Detection:</strong> When an employee goes to{" "}
                  <span className="font-mono bg-amber-100 px-1 rounded">
                    System Settings → Privacy &amp; Security → Accessibility
                  </span>{" "}
                  and removes HRMS, an alert is logged here automatically. The system also
                  re-opens the settings page on the employee&apos;s Mac to force re-granting.
                </div>
              </div>

              {alertsLoading ? (
                <div className="py-8 text-center text-slate-400 text-xs">Loading alerts...</div>
              ) : securityAlerts.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center gap-3">
                  <div className="bg-green-50 p-4 rounded-full">
                    <ShieldCheck className="w-8 h-8 text-green-500" />
                  </div>
                  <p className="text-sm font-medium text-slate-600">No Security Alerts</p>
                  <p className="text-xs text-slate-400">
                    All monitored PCs are operating normally.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {securityAlerts.map((alert: any) => {
                    const isRevoked = alert.eventType === "accessibility_permission_revoked";
                    const isRestored = alert.eventType === "accessibility_permission_restored";
                    return (
                      <div
                        key={alert._id}
                        className={`p-4 rounded-lg border flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
                          alert.resolved
                            ? "bg-slate-50 border-slate-200 opacity-60"
                            : isRevoked
                            ? "bg-red-50 border-red-200"
                            : "bg-green-50 border-green-200"
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className="shrink-0 mt-0.5">
                            {isRevoked ? (
                              <ShieldX className="w-5 h-5 text-red-500" />
                            ) : (
                              <ShieldCheck className="w-5 h-5 text-green-500" />
                            )}
                          </div>
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-sm font-bold text-slate-800">
                                {alert.hostname}
                              </span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                  isRevoked
                                    ? "bg-red-100 text-red-700"
                                    : "bg-green-100 text-green-700"
                                }`}
                              >
                                {isRevoked ? "Permission Revoked" : "Permission Restored"}
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                {alert.platform || "macOS"}
                              </span>
                              {alert.resolved && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-500">
                                  Resolved
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600">{alert.details}</p>
                            <p className="text-xs text-slate-400">
                              {alert.timestamp
                                ? new Date(alert.timestamp).toLocaleString("en-IN", {
                                    timeZone: "Asia/Kolkata",
                                  })
                                : "Unknown time"}
                            </p>
                          </div>
                        </div>
                        {!alert.resolved && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs shrink-0 border-slate-300 text-slate-600 hover:bg-slate-100"
                            onClick={() => handleResolveAlert(alert._id)}
                          >
                            Mark Resolved
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
