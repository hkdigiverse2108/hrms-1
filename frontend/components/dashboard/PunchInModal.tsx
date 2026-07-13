"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectSeparator } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { API_URL } from "@/lib/config";
import dayjs from "dayjs";

interface PunchInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: { type: string; subtype?: string; value?: string; taskId?: string }) => void;
  userId: string;
  initialActivityType?: string;
  initialActivitySubtype?: string;
  initialActivityValue?: string;
  initialTaskId?: string;
  isUpdateMode?: boolean;
}

export function PunchInModal({ open, onOpenChange, onConfirm, userId, initialActivityType, initialActivitySubtype, initialActivityValue, initialTaskId, isUpdateMode }: PunchInModalProps) {
  const [selectedTab, setSelectedTab] = useState<string>("today_work");
  
  useEffect(() => {
    if (open) {
      const userStr = localStorage.getItem("user");
      const userObj = userStr ? JSON.parse(userStr) : null;
      const dept = userObj?.department?.toLowerCase() || "";
      if (['hr', 'sales'].includes(dept)) setSelectedTab("research");
      else if (['digital marketing', 'dm'].includes(dept)) setSelectedTab("assigned_brands");
      else setSelectedTab("today_work");
    }
  }, [open]);
  const [activityValue, setActivityValue] = useState<string>("");
  const [taskId, setTaskId] = useState<string>("");
  
  let userDept = "";
  if (typeof window !== "undefined") {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        userDept = (JSON.parse(userStr).department || "").toLowerCase();
      } catch (e) {}
    }
  }
  
  const [tasks, setTasks] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [pastResearch, setPastResearch] = useState<string[]>([]);
  const [isNewResearch, setIsNewResearch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && userId) {
      fetchData();
      let initialTab = "today_work";
      if (initialActivityType === "Work") {
        initialTab = "today_work";
      } else if (initialActivityType === "Research") {
        initialTab = "research";
      } else if (initialActivityType === "Other" && initialActivitySubtype) {
        initialTab = `other_${initialActivitySubtype}`;
      }
      setSelectedTab(initialTab);
      
      setActivityValue(initialActivityValue || "");
      setTaskId(initialTaskId || "");
      if (initialActivityType === "Research" && initialActivityValue) {
        setIsNewResearch(true); // Default to input if there's an initial value to be safe, or we can check later
      }
    }
  }, [open, userId, initialActivityType, initialActivitySubtype, initialActivityValue, initialTaskId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [tasksRes, settingsRes, attRes] = await Promise.all([
        fetch(`${API_URL}/wm-tasks`),
        fetch(`${API_URL}/system-settings`),
        fetch(`${API_URL}/attendance`)
      ]);

      if (settingsRes.ok) {
        setSettings(await settingsRes.json());
      }
      if (attRes.ok) {
        const allAtt = await attRes.json();
        const uniqueTitles = new Set<string>();
        allAtt.forEach((a: any) => {
          if (a.employeeId === userId && Array.isArray(a.punches)) {
            a.punches.forEach((punch: any) => {
              if (punch.activityType === "Research" && punch.activityValue) {
                uniqueTitles.add(punch.activityValue);
              }
            });
          }
        });
        setPastResearch(Array.from(uniqueTitles));
      }
      if (tasksRes.ok) {
        const allTasks = await tasksRes.json();
        let myTasks = allTasks.filter((t: any) => {
          if (String(t.assignedToId) !== String(userId)) return false;
          if (t.status === "completed" || t.status === "onhold" || t.status === "Approved") return false;
          return true;
        });

        // Fetch SMM tasks if applicable
        try {
          const userStr = localStorage.getItem("user");
          const userObj = userStr ? JSON.parse(userStr) : null;
          const userDept = (userObj?.department || "").toLowerCase().trim();
          const isCreativeUser = ['creative', 'smm', 'social media marketing', 'graphics'].includes(userDept);
          const isDigitalMarketingUser = ['digital marketing', 'dm'].includes(userDept);

          if (isCreativeUser || isDigitalMarketingUser) {
            const [ccRes, owRes, projRes, clientRes] = await Promise.all([
              fetch(`${API_URL}/content-calendar/all`),
              fetch(`${API_URL}/other-work/all`),
              fetch(`${API_URL}/projects`),
              fetch(`${API_URL}/clients`)
            ]);
            
            if (ccRes.ok && owRes.ok && projRes.ok && clientRes.ok) {
              const [ccList, owList, projList, clientList] = await Promise.all([ccRes.json(), owRes.json(), projRes.json(), clientRes.json()]);
              const smmTasks: any[] = [];
              if (isCreativeUser) {
                const myOw = owList.filter((o: any) => String(o.assigneeId).trim() === String(userId).trim() && o.status !== 'Approved');
                myOw.forEach((o: any) => {
                  const client = clientList.find((c: any) => String(c.id || c._id).trim() === String(o.clientId).trim());
                  const project = projList.find((p: any) => String(p.id || p._id).trim() === String(o.projectId).trim());
                  let displayName = "Other Work";
                  if (o.taskType === 'digital-marketing') displayName = 'Digital Marketing';
                  else if (client) displayName = project ? `${client.companyName || client.clientName} (${project.projectName})` : (client.companyName || client.clientName);

                  smmTasks.push({
                    id: o.id || o._id,
                    title: o.title || o.taskName || 'Other Work Task',
                    projectName: displayName,
                    dueDate: o.deadline || "",
                    status: o.status
                  });
                });
              }
              
              if (isDigitalMarketingUser) {
                const myProjects = projList.filter((p: any) => String(p.assignedEmployeeId).trim() === String(userId).trim() && p.status !== 'Completed');
                myProjects.forEach((p: any) => {
                  const client = clientList.find((c: any) => String(c.id || c._id) === String(p.clientId));
                  const cName = client?.companyName || client?.clientName || p.clientName || "Unknown Client";
                  smmTasks.push({
                    id: p.id || p._id,
                    title: cName,
                    projectName: p.projectName || p.title || "",
                    dueDate: p.endDate || p.deadline || "",
                    status: "pending"
                  });
                });
              }
              
              if (isCreativeUser) {
                ccList.forEach((entry: any) => {
                  const client = clientList.find((c: any) => String(c.id || c._id).trim() === String(entry.clientId).trim());
                  // In SMM, CC tasks use the client's Creative project
                  const project = projList.find((p: any) => String(p.clientId).trim() === String(entry.clientId).trim() && p.department?.toLowerCase().trim() === 'creative');
                  if (!project) return; // Only show if active creative project (matching SMM)
                  
                  const cName = client?.companyName || client?.clientName || "Unknown Client";
                  
                  const checkStage = (stageName: string, idField: string, dateField: string, linkField: string, linkCheck?: (e:any)=>boolean) => {
                    const assigneeId = entry[idField] || project?.[idField] || client?.[idField];
                    const isDone = linkCheck ? linkCheck(entry) : !!entry[linkField];
                    
                    const hasApplicableRemark = entry.remark && entry.remark.trim() !== '' && (
                      !entry.remarkStage || 
                      (() => {
                        const stages = ['Script', 'Shoot', 'Caption', 'Thumbnail', 'Editing', 'Post/Graphics', 'Approval', 'Posting'];
                        const idx1 = stages.indexOf(stageName === 'Editing' && entry.postReel === 'Post' ? 'Post/Graphics' : stageName);
                        const idx2 = stages.indexOf(entry.remarkStage);
                        return idx1 >= idx2;
                      })()
                    );
                    const isClientIssue = hasApplicableRemark && entry.remark.startsWith('[CLIENT ISSUE] ');
                    if (isClientIssue) return; // SMM moves these to Pending Work

                    if (String(assigneeId).trim() === String(userId).trim() && !isDone) {
                      let dateStr = entry[dateField];
                      if (!dateStr && (stageName === 'Caption' || stageName === 'Thumbnail')) {
                        dateStr = entry.editingStart;
                      }
                      
                      if (!dateStr) return; // SMM strictly requires a date for CC tasks

                      const taskName = entry.concept || entry.topic || (entry.postReel ? `${entry.postReel} Content` : `Task for ${entry.postingDate || entry.monthYear || 'Unknown Date'}`);
                      
                      smmTasks.push({
                        id: `${entry.id || entry._id}-${stageName}`,
                        title: taskName,
                        projectName: `${stageName} - ${cName}`,
                        dueDate: dateStr,
                        status: "pending"
                      });
                    }
                  };
                  
                  const isPost = entry.postReel === "Post";
                  if (!isPost) checkStage('Script', 'assignedScriptwriterId', 'scriptDate', 'scriptLink');
                  if (!isPost) checkStage('Shoot', 'assignedShooterId', 'shootDate', 'shootLink');
                  checkStage('Caption', 'assignedCaptionWriterId', 'captionDate', 'caption');
                  if (!isPost) checkStage('Thumbnail', 'assignedThumbnailDesignerId', 'thumbnailDate', 'thumbnailLink');
                  
                  const editIdField = isPost ? 'assignedPostDesignerId' : 'assignedReelEditorId';
                  const editLinkField = isPost ? 'finalPostLink' : 'finalReelLink';
                  checkStage('Editing', editIdField, 'editingStart', editLinkField);
                  checkStage('Approval', 'assignedApproverId', 'approval', 'isApproved', (e) => e.isApproved === 'Yes');
                  checkStage('Posting', 'assignedPosterId', 'postingDate', 'postingLinkOfIg');
                });
              }
              
              myTasks = [...myTasks, ...smmTasks];
            }
          }
        } catch (e) {
          console.error("Error fetching SMM tasks", e);
        }

        setTasks(myTasks);
      }
    } catch (err) {
      console.error("Error fetching data for punch in modal:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    let type = "Work";
    let subtype = "";

    if (selectedTab === "today_work" || selectedTab === "upcoming_work") {
      type = "Work";
    } else if (selectedTab === "research") {
      type = "Research";
    } else if (selectedTab.startsWith("other_")) {
      type = "Other";
      subtype = selectedTab.replace("other_", "");
    }

    const data: any = { type };
    if (type === "Work") {
      data.taskId = taskId;
      const selectedTask = tasks.find(t => t.id === taskId);
      if (selectedTask) {
        data.value = selectedTask.projectName ? `${selectedTask.title} (${selectedTask.projectName})` : selectedTask.title;
      }
    } else if (type === "Other") {
      data.subtype = subtype;
      data.value = activityValue;
    } else if (type === "Research") {
      data.value = activityValue;
    }
    onConfirm(data);
  };

  const isValid = () => {
    if (selectedTab === "today_work" || selectedTab === "upcoming_work") {
      return !!taskId;
    }
    if (selectedTab === "research") {
      return !!activityValue;
    }
    if (selectedTab.startsWith("other_")) {
      return !!activityValue;
    }
    return false;
  };

  const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return new Date(0);
    if (dateStr.includes('T')) {
      const d = new Date(dateStr);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    const delimiter = dateStr.includes('-') ? '-' : '/';
    const parts = dateStr.split(delimiter);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 0, 0, 0, 0);
      } else if (parts[2].length === 4) {
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]), 0, 0, 0, 0);
      }
    }
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const todayTasks = tasks.filter(t => {
    const taskDate = t.dueDate || t.postingDate || t.moduleDeadline;
    if (!taskDate) return false;
    const dateObj = parseLocalDate(taskDate);
    return dateObj <= todayDate;
  }).sort((a, b) => {
    const dateA = parseLocalDate(a.dueDate || a.postingDate || a.moduleDeadline);
    const dateB = parseLocalDate(b.dueDate || b.postingDate || b.moduleDeadline);
    return dateA.getTime() - dateB.getTime();
  });
  
  const upcomingTasks = tasks.filter(t => {
    const taskDate = t.dueDate || t.postingDate || t.moduleDeadline;
    if (!taskDate) return false;
    const dateObj = parseLocalDate(taskDate);
    return dateObj > todayDate;
  }).sort((a, b) => {
    const dateA = parseLocalDate(a.dueDate || a.postingDate || a.moduleDeadline);
    const dateB = parseLocalDate(b.dueDate || b.postingDate || b.moduleDeadline);
    return dateA.getTime() - dateB.getTime();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[750px] w-[95vw]">
        <DialogHeader>
          <DialogTitle>{isUpdateMode ? "Update Activity" : "Punch In Activity"}</DialogTitle>
          <DialogDescription>
            What will you be working on right now?
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <Tabs value={selectedTab} onValueChange={(val) => {
              setSelectedTab(val);
              setTaskId("");
              setActivityValue("");
              setIsNewResearch(false);
            }} className="w-full">
              <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1 bg-muted/50 rounded-lg justify-start">
                {userDept !== 'hr' && userDept !== 'sales' && !['digital marketing', 'dm'].includes(userDept) && (
                  <>
                    <TabsTrigger value="today_work" className="data-[state=active]:bg-brand-teal data-[state=active]:text-white">Today's Work</TabsTrigger>
                    <TabsTrigger value="upcoming_work" className="data-[state=active]:bg-brand-teal data-[state=active]:text-white">Upcoming Work</TabsTrigger>
                  </>
                )}
                {['digital marketing', 'dm'].includes(userDept) && (
                  <TabsTrigger value="assigned_brands" className="data-[state=active]:bg-brand-teal data-[state=active]:text-white">Projects</TabsTrigger>
                )}
                <TabsTrigger value="research" className="data-[state=active]:bg-brand-teal data-[state=active]:text-white">Research</TabsTrigger>
                {(settings?.otherCategories || ["Activity", "Meeting"]).map((cat: string) => (
                  <TabsTrigger key={`other_${cat}`} value={`other_${cat}`} className="data-[state=active]:bg-brand-teal data-[state=active]:text-white">{cat}</TabsTrigger>
                ))}
              </TabsList>

              <div className="mt-6">
                {(selectedTab === "today_work" || selectedTab === "upcoming_work" || selectedTab === "assigned_brands") && (
                  <div className="space-y-3">
                    <Label className="text-base">{selectedTab === "assigned_brands" ? 'Select Brand' : 'Select Task'}</Label>
                    <div className="max-h-[500px] overflow-y-scroll flex flex-col gap-1.5 pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-100/50 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-brand-teal/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-brand-teal/50 transition-colors" style={{ scrollbarWidth: 'thin', scrollbarColor: '#09A08A4D transparent' }}>
                      {(() => {
                        let activeTasks = [];
                        if (selectedTab === "assigned_brands") {
                          activeTasks = tasks; // All active projects are shown regardless of date
                        } else {
                          activeTasks = selectedTab === "today_work" ? todayTasks : upcomingTasks;
                        }
                        
                        if (activeTasks.length === 0) {
                          return (
                            <div className="col-span-full py-8 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                              No {selectedTab === "assigned_brands" ? "assigned brands" : selectedTab === "today_work" ? "tasks for today" : "upcoming tasks"}
                            </div>
                          );
                        }
                        
                        return activeTasks.map(t => (
                          <div 
                            key={t.id} 
                            onClick={() => setTaskId(t.id)}
                            className={`px-3 py-1.5 rounded-lg cursor-pointer border transition-all duration-200 flex items-center justify-between min-h-[38px] ${
                              taskId === t.id 
                                ? 'border-brand-teal bg-brand-teal/10 shadow-sm ring-1 ring-brand-teal' 
                                : 'border-border/50 hover:border-brand-teal/50 hover:bg-muted/30'
                            }`}
                          >
                            <div className="font-medium text-sm line-clamp-1 flex-1 flex items-center gap-2">
                              <span className="truncate">{t.title}</span>
                              {t.dueDate && (
                                <span className="text-[10px] font-semibold bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap">
                                  {typeof t.dueDate === 'string' && t.dueDate.includes('T') ? t.dueDate.split('T')[0] : String(t.dueDate)}
                                </span>
                              )}
                            </div>
                            {t.projectName && <div className="text-[11px] text-muted-foreground ml-3 bg-muted/40 px-1.5 py-0.5 rounded flex-shrink-0 max-w-[35%] line-clamp-1">{t.projectName}</div>}
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}

                {selectedTab === "research" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Research Topic</Label>
                      {pastResearch.length > 0 && !isNewResearch ? (
                        <div className="flex gap-2">
                          <Select value={activityValue} onValueChange={(val) => {
                            if (val === "ADD_NEW_RESEARCH_TOPIC") {
                              setIsNewResearch(true);
                              setActivityValue("");
                            } else {
                              setActivityValue(val);
                            }
                          }}>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select previous research topic" />
                            </SelectTrigger>
                            <SelectContent>
                              {pastResearch.map(topic => (
                                <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                              ))}
                              <SelectSeparator />
                              <SelectItem value="ADD_NEW_RESEARCH_TOPIC" className="text-brand-teal font-medium">
                                + Add New Research Topic
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input 
                              placeholder="Enter new research topic..." 
                              value={activityValue}
                              onChange={(e) => setActivityValue(e.target.value)}
                              className="flex-1"
                              autoFocus
                            />
                            {pastResearch.length > 0 && (
                              <Button 
                                variant="outline" 
                                onClick={() => {
                                  setIsNewResearch(false);
                                  setActivityValue("");
                                }}
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedTab.startsWith("other_") && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>{selectedTab.replace("other_", "")} Details</Label>
                      <Input 
                        placeholder={`Enter ${selectedTab.replace("other_", "").toLowerCase()} description...`} 
                        value={activityValue}
                        onChange={(e) => setActivityValue(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            </Tabs>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            className="bg-brand-teal hover:bg-brand-teal-light text-white" 
            disabled={!isValid() || isLoading}
            onClick={handleConfirm}
          >
            {isUpdateMode ? "Save" : "Confirm Punch In"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
