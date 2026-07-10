"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectSeparator } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
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
  const [activityType, setActivityType] = useState<string>("");
  const [activitySubtype, setActivitySubtype] = useState<string>("");
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
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && userId) {
      fetchData();
      setActivityType(initialActivityType || "");
      setActivitySubtype(initialActivitySubtype || "");
      setActivityValue(initialActivityValue || "");
      setTaskId(initialTaskId || "");
    }
  }, [open, userId, initialActivityType, initialActivitySubtype, initialActivityValue, initialTaskId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [tasksRes, settingsRes] = await Promise.all([
        fetch(`${API_URL}/wm-tasks`),
        fetch(`${API_URL}/system-settings`)
      ]);

      if (settingsRes.ok) {
        setSettings(await settingsRes.json());
      }
      if (tasksRes.ok) {
        const allTasks = await tasksRes.json();
        let myTasks = allTasks.filter((t: any) => {
          if (t.assignedToId !== userId) return false;
          if (t.status === "completed" || t.status === "pending" || t.status === "onhold") return false;
          return true;
        });

        // Fetch SMM tasks if applicable
        try {
          const userStr = localStorage.getItem("user");
          const userObj = userStr ? JSON.parse(userStr) : null;
          const userDept = userObj?.department?.toLowerCase() || "";
          const isSmmUser = ["smm", "digital marketing", "creative", "graphics", "social media marketing"].includes(userDept);

          if (isSmmUser) {
            const [ccRes, owRes, projRes, clientRes] = await Promise.all([
              fetch(`${API_URL}/content-calendar/all`),
              fetch(`${API_URL}/other-work/all`),
              fetch(`${API_URL}/projects`),
              fetch(`${API_URL}/clients`)
            ]);
            
            if (ccRes.ok && owRes.ok && projRes.ok && clientRes.ok) {
              const [ccList, owList, projList, clientList] = await Promise.all([ccRes.json(), owRes.json(), projRes.json(), clientRes.json()]);
              const smmTasks: any[] = [];
              
              const myOw = owList.filter((o: any) => o.assigneeId === userId && o.status !== 'Approved' && o.status !== 'Completed');
              myOw.forEach((o: any) => {
                smmTasks.push({
                  id: o.id,
                  title: o.taskName || 'Other Work Task',
                  projectName: "",
                  dueDate: o.deadline,
                  status: o.status
                });
              });
              
              if (userDept === "digital marketing" || userDept === "marketing") {
                const myProjects = projList.filter((p: any) => p.assignedEmployeeId === userId && p.status !== 'Completed');
                myProjects.forEach((p: any) => {
                  const client = clientList.find((c: any) => String(c.id) === String(p.clientId));
                  const cName = client?.companyName || client?.clientName || p.clientName || "Unknown Client";
                  smmTasks.push({
                    id: p.id,
                    title: cName,
                    projectName: p.projectName || p.title || "",
                    dueDate: p.endDate || p.deadline || "",
                    status: "pending"
                  });
                });
              } else {
                ccList.forEach((entry: any) => {
                  const client = clientList.find((c: any) => c.id === entry.clientId);
                  const project = projList.find((p: any) => p.id === entry.projectId);
                  const cName = client?.companyName || client?.clientName || "Unknown Client";
                  
                  const checkStage = (stageName: string, idField: string, dateField: string, linkField: string, linkCheck?: (e:any)=>boolean) => {
                    const assigneeId = entry[idField] || project?.[idField] || client?.[idField];
                    const isDone = linkCheck ? linkCheck(entry) : !!entry[linkField];
                    if (assigneeId === userId && !isDone && entry[dateField]) {
                      smmTasks.push({
                        id: `${entry.id}-${stageName}`,
                        title: `${stageName} - ${cName}`,
                        projectName: project?.projectName || "",
                        dueDate: entry[dateField],
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
    const data: any = { type: activityType };
    if (activityType === "Work") {
      data.taskId = taskId;
      const selectedTask = tasks.find(t => t.id === taskId);
      if (selectedTask) {
        data.value = selectedTask.projectName ? `${selectedTask.title} (${selectedTask.projectName})` : selectedTask.title;
      }
    } else if (activityType === "Other") {
      data.subtype = activitySubtype;
      data.value = activityValue;
    } else if (activityType === "Research") {
      data.value = activityValue;
    }
    onConfirm(data);
  };

  const isValid = () => {
    if (!activityType) return false;
    if (activityType === "Work" && !taskId) return false;
    if (activityType === "Other") {
      if (!activitySubtype || !activityValue) return false;
    }
    if (activityType === "Research" && !activityValue) return false;
    return true;
  };

  const today = dayjs().startOf('day');
  const todayTasks = tasks.filter(t => {
    const taskDate = t.dueDate || t.postingDate || t.moduleDeadline;
    if (!taskDate) return true; // if no date, consider it today's work to bring attention
    const dateObj = dayjs(taskDate).startOf('day');
    return dateObj.isBefore(today) || dateObj.isSame(today, 'day');
  });
  
  const upcomingTasks = tasks.filter(t => {
    const taskDate = t.dueDate || t.postingDate || t.moduleDeadline;
    if (!taskDate) return false;
    return dayjs(taskDate).startOf('day').isAfter(today);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
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
            <div className="space-y-2">
              <Label>Activity Type</Label>
              <Select value={activityType} onValueChange={(val) => {
                setActivityType(val);
                setActivitySubtype("");
                setActivityValue("");
                setTaskId("");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select activity type" />
                </SelectTrigger>
                <SelectContent>
                  {userDept !== 'hr' && userDept !== 'sales' && (
                    <SelectItem value="Work">Work</SelectItem>
                  )}
                  <SelectItem value="Research">Research</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {activityType === "Work" && (
              <div className="space-y-2">
                <Label>{userDept === 'digital marketing' || userDept === 'marketing' ? 'Select Brand' : 'Select Task'}</Label>
                <Select value={taskId} onValueChange={setTaskId}>
                  <SelectTrigger>
                    <SelectValue placeholder={userDept === 'digital marketing' || userDept === 'marketing' ? 'Select a brand' : 'Select a task from your board'} />
                  </SelectTrigger>
                  <SelectContent>
                    {tasks.length === 0 && (
                      <SelectItem value="none" disabled>No active tasks found</SelectItem>
                    )}
                    
                    {todayTasks.length > 0 && (
                      <SelectGroup>
                        <SelectLabel className="font-bold text-brand-teal">Today's Work</SelectLabel>
                        {todayTasks.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.title} {t.projectName ? `(${t.projectName})` : ''}</SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                    
                    {todayTasks.length > 0 && upcomingTasks.length > 0 && <SelectSeparator />}
                    
                    {upcomingTasks.length > 0 && (
                      <SelectGroup>
                        <SelectLabel className="font-bold text-gray-500">Upcoming Work</SelectLabel>
                        {upcomingTasks.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.title} {t.projectName ? `(${t.projectName})` : ''}</SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {activityType === "Research" && (
              <div className="space-y-2">
                <Label>Research Topic</Label>
                <Input 
                  placeholder="Enter research topic..." 
                  value={activityValue}
                  onChange={(e) => setActivityValue(e.target.value)}
                  className="w-full"
                />
              </div>
            )}

            {activityType === "Other" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Subcategory</Label>
                  <Select value={activitySubtype} onValueChange={(val) => {
                    setActivitySubtype(val);
                    setActivityValue("");
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {(settings?.otherCategories || ["Activity", "Meeting"]).map((cat: string) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {activitySubtype && (
                  <div className="space-y-2">
                    <Label>{activitySubtype} Details</Label>
                    <Input 
                      placeholder={`Enter ${activitySubtype.toLowerCase()} description...`} 
                      value={activityValue}
                      onChange={(e) => setActivityValue(e.target.value)}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            )}
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
