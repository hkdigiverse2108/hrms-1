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
}const parseLocalDate = (dateStr: string) => {
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

export function PunchInModal({ open, onOpenChange, onConfirm, userId, initialActivityType, initialActivitySubtype, initialActivityValue, initialTaskId, isUpdateMode }: PunchInModalProps) {
  const [selectedTab, setSelectedTab] = useState<string>("today_work");
  
  const [activityValue, setActivityValue] = useState<string>("");
  const [taskId, setTaskId] = useState<string>("");
  const [customTaskName, setCustomTaskName] = useState<string>("");
  
  let userDept = "";
  if (typeof window !== "undefined") {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        userDept = (JSON.parse(userStr).department || "").toLowerCase().trim();
      } catch (e) {}
    }
  }
  const isHR = userDept === 'hr' || userDept.includes('hr') || userDept.includes('human resources') || userDept.includes('human-resources');
  
  const [tasks, setTasks] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [pastResearch, setPastResearch] = useState<string[]>([]);
  const [pastWorkTasks, setPastWorkTasks] = useState<string[]>([]);
  const [isNewResearch, setIsNewResearch] = useState(false);
  const [isNewWorkTask, setIsNewWorkTask] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && userId) {
      fetchData();
      
      let initialTab = "today_work";
      const isDigitalMarketing = ['digital marketing', 'dm'].includes(userDept);
      
      if (isUpdateMode && initialActivityType) {
        if (initialActivityType === "Work") {
          if (userDept.includes('sales')) {
            initialTab = "hr_sales_work";
          } else {
            initialTab = isDigitalMarketing ? "assigned_brands" : "today_work";
          }
        } else if (initialActivityType === "Research") {
          initialTab = "research";
        } else if (initialActivityType === "Other" && initialActivitySubtype) {
          initialTab = `other_${initialActivitySubtype}`;
        }
      } else {
        if (userDept.includes('sales')) initialTab = "hr_sales_work";
        else if (isDigitalMarketing) initialTab = "assigned_brands";
      }
      
      setSelectedTab(initialTab);
      
      setActivityValue(initialActivityValue || "");
      setTaskId(initialTaskId || "");
      if (initialActivityType === "Research" && initialActivityValue) {
        setIsNewResearch(true);
      }
    }
  }, [open, userId, initialActivityType, initialActivitySubtype, initialActivityValue, initialTaskId, isUpdateMode, userDept]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const userStr = localStorage.getItem("user");
      const userObj = userStr ? JSON.parse(userStr) : null;
      const userRole = userObj?.role || "";

      const [viewDataRes, settingsRes, attRes] = await Promise.all([
        fetch(`${API_URL}/my-tasks-view-data?userId=${userId}&role=${userRole}`),
        fetch(`${API_URL}/system-settings`),
        fetch(`${API_URL}/attendance`)
      ]);

      if (settingsRes.ok) {
        setSettings(await settingsRes.json());
      }
      if (attRes.ok) {
        const allAtt = await attRes.json();
        const uniqueTitles = new Set<string>();
        const uniqueWorkTitles = new Set<string>();
        allAtt.forEach((a: any) => {
          if (a.employeeId === userId && Array.isArray(a.punches)) {
            a.punches.forEach((punch: any) => {
              if (punch.activityType === "Research" && punch.activityValue) {
                uniqueTitles.add(punch.activityValue);
              } else if (punch.activityType === "Work" && punch.activityValue && !punch.taskId) {
                uniqueWorkTitles.add(punch.activityValue);
              }
            });
          }
        });
        setPastResearch(Array.from(uniqueTitles));
        setPastWorkTasks(Array.from(uniqueWorkTitles));
      }
      if (viewDataRes.ok) {
        const data = await viewDataRes.json();
        const {
          tasks: rawTasks,
          wmTasks: rawWmTasks,
          contentCalendar: rawCC,
          otherWork: rawOtherWork,
          projects: rawProjects,
          clients: rawClients,
          employees: rawEmployees,
        } = data;

        const consolidated: any[] = [];
        const uId = userId;

        // 1. General & HR Tasks
        (rawTasks || []).forEach((t: any) => {
          let assIds: string[] = [];
          if (Array.isArray(t.assignedToIds)) {
            assIds = t.assignedToIds;
          } else if (typeof t.assignedToIds === 'string') {
            try {
              assIds = t.assignedToIds.split(',').map((id: string) => id.trim()).filter(Boolean);
            } catch (e) {
              assIds = t.assignedToIds.split(',').map((id: string) => id.trim()).filter(Boolean);
            }
          }

          const isAssigned = t.assignedToId === uId || assIds.includes(uId);

          if (isAssigned) {
            let isProjectOnHold = false;
            if (t.projectId) {
              const assocProject = (rawProjects || []).find((p: any) => p.id === t.projectId);
              isProjectOnHold = assocProject && (assocProject.status === 'on-hold' || assocProject.status === 'onhold' || assocProject.status?.toLowerCase() === 'on-hold');
            }
            
            if (!isProjectOnHold) {
              const isHRTask = t.department === 'HR' || t.department?.toUpperCase() === 'HR';
              consolidated.push({
                id: t.id,
                title: t.title,
                description: t.description,
                dueDate: t.dueDate ? (t.dueDate.includes('T') ? t.dueDate.split('T')[0] : t.dueDate) : '',
                priority: t.priority || 'medium',
                status: t.status,
                frequency: t.frequency || 'one-time',
                department: isHRTask ? 'HR Tasks' : 'General Tasks',
                sourceType: 'general-task',
                originalTask: t
              });
            }
          }
        });

        // 2. Development Tasks
        (rawWmTasks || []).forEach((t: any) => {
          const isAssigned = t.assignedToId === uId || t.assignedToIds?.includes(uId);
          if (isAssigned) {
            const assocProject = (rawProjects || []).find((p: any) => p.id === t.projectId);
            const isProjectOnHold = assocProject && (assocProject.status === 'on-hold' || assocProject.status === 'onhold' || assocProject.status?.toLowerCase() === 'on-hold');
            
            if (!isProjectOnHold) {
              consolidated.push({
                id: t.id,
                title: t.title,
                description: t.description,
                dueDate: t.dueDate ? (t.dueDate.includes('T') ? t.dueDate.split('T')[0] : t.dueDate) : '',
                priority: t.priority || 'medium',
                status: t.status,
                department: 'Development',
                sourceType: 'wm-task',
                projectName: t.projectName || assocProject?.title || 'Unknown Project',
                originalTask: t
              });
            }
          }
        });

        // 3. SMM Creative Tasks
        const isCreativeUser = ['creative', 'smm', 'social media marketing', 'graphics'].includes(userDept);
        const isDigitalMarketingUser = ['digital marketing', 'dm'].includes(userDept);

        if (isCreativeUser) {
          (rawCC || []).forEach((entry: any) => {
            const client = (rawClients || []).find((c: any) => c.id === entry.clientId);
            let assocProject = null;
            if (entry.projectId) {
              assocProject = (rawProjects || []).find((p: any) => p.id === entry.projectId);
            }
            if (!assocProject) {
              assocProject = (rawProjects || []).find((p: any) => 
                p.clientId === entry.clientId && 
                (p.department === 'Creative' || p.department?.toLowerCase() === 'smm' || p.department?.toLowerCase() === 'social media management')
              );
            }

            const isProjectOnHold = assocProject && (assocProject.status === 'on-hold' || assocProject.status === 'onhold' || assocProject.status?.toLowerCase() === 'on-hold');
            
            if (!isProjectOnHold) {
              const checkAndAddCreativeTask = (stageName: string, deadline: string, isDone: boolean) => {
                let assigneeId = null;
                if (stageName === 'Script') assigneeId = entry.assignedScriptwriterId || assocProject?.assignedScriptwriterId || client?.assignedScriptwriterId;
                if (stageName === 'Shoot') assigneeId = entry.assignedShooterId || assocProject?.assignedShooterId || client?.assignedShooterId;
                if (stageName === 'Caption') assigneeId = entry.assignedCaptionWriterId || assocProject?.assignedCaptionWriterId || client?.assignedCaptionWriterId;
                if (stageName === 'Thumbnail') assigneeId = entry.assignedThumbnailDesignerId || assocProject?.assignedThumbnailDesignerId || client?.assignedThumbnailDesignerId;
                if (stageName === 'Editing') {
                  if (entry.postReel === 'Post') {
                    assigneeId = entry.assignedPostDesignerId || assocProject?.assignedPostDesignerId || client?.assignedPostDesignerId;
                  } else {
                    assigneeId = entry.assignedReelEditorId || assocProject?.assignedReelEditorId || client?.assignedReelEditorId;
                  }
                }
                if (stageName === 'Approval') assigneeId = entry.assignedApproverId || assocProject?.assignedApproverId || client?.assignedApproverId;
                if (stageName === 'Posting') assigneeId = entry.assignedPosterId || assocProject?.assignedPosterId || client?.assignedPosterId;

                if (assigneeId === uId && !isDone && deadline) {
                  const creatorName = entry.logs?.[0]?.userName || 'Admin';
                  const empName = (rawEmployees || []).find((e: any) => e.id === assigneeId)?.name || userObj?.name || 'User';
                  const enrichedEntry = { ...entry, assignerName: creatorName, assigneeName: empName };

                  consolidated.push({
                    id: `${entry.id}-${stageName}`,
                    title: entry.concept || entry.topic || (entry.postReel ? `${entry.postReel} Content` : 'SMM Task'),
                    projectName: `${stageName} - ${assocProject ? assocProject.title : (client ? (client.companyName || client.clientName) : 'SMM Client')}`,
                    dueDate: deadline.includes('T') ? deadline.split('T')[0] : deadline,
                    priority: 'medium',
                    status: 'todo',
                    department: 'Social Media Management',
                    sourceType: 'smm-creative',
                    clientId: entry.clientId || client?.id,
                    projectId: entry.projectId || assocProject?.id,
                    originalTask: enrichedEntry
                  });
                }
              };

              if (entry.postReel !== 'Post' && entry.scriptDate) {
                checkAndAddCreativeTask('Script', entry.scriptDate, !!entry.scriptLink);
              }
              if (entry.postReel !== 'Post' && entry.shootDate) {
                checkAndAddCreativeTask('Shoot', entry.shootDate, !!entry.shootLink && entry.shootLink !== '-');
              }
              
              // Brand Person Check
              if (entry.assignedBrandPersonIds && (!entry.shootLink || entry.shootLink === '-')) {
                const bpIdsRaw = entry.assignedBrandPersonIds;
                const bpIds = Array.isArray(bpIdsRaw) ? bpIdsRaw : (typeof bpIdsRaw === 'string' ? bpIdsRaw.split(',').map((id: string) => id.trim()).filter(Boolean) : []);
                bpIds.forEach((bpId: string) => {
                  if (bpId === uId) {
                    const taskDeadline = entry.shootDate || entry.postingDate || (entry.monthYear ? `${entry.monthYear}-28` : new Date().toISOString().split('T')[0]);
                    const creatorName = entry.logs?.[0]?.userName || 'Admin';
                    const empName = (rawEmployees || []).find((e: any) => e.id === bpId)?.name || userObj?.name || 'User';
                    const enrichedEntry = { ...entry, assignerName: creatorName, assigneeName: empName };
                    
                    consolidated.push({
                      id: `${entry.id}-BrandPerson`,
                      title: entry.concept || entry.topic || (entry.postReel ? `${entry.postReel} Content` : 'SMM Task'),
                      projectName: `Brand Person - ${assocProject ? assocProject.title : (client ? (client.companyName || client.clientName) : 'SMM Client')}`,
                      dueDate: taskDeadline,
                      priority: 'medium',
                      status: 'todo',
                      department: 'Social Media Management',
                      sourceType: 'smm-creative',
                      clientId: entry.clientId || client?.id,
                      projectId: entry.projectId || assocProject?.id,
                      originalTask: enrichedEntry
                    });
                  }
                });
              }

              const captionDate = entry.captionDate || entry.editingStart;
              if (captionDate) {
                checkAndAddCreativeTask('Caption', captionDate, !!entry.caption);
              }
              if (entry.postReel !== 'Post' && entry.thumbnailDate) {
                checkAndAddCreativeTask('Thumbnail', entry.thumbnailDate, !!entry.thumbnailLink);
              }
              if (entry.editingStart) {
                const isDone = entry.postReel === 'Post' ? !!entry.finalPostLink : !!entry.finalReelLink;
                checkAndAddCreativeTask('Editing', entry.editingStart, isDone);
              }
              if (entry.approval) {
                checkAndAddCreativeTask('Approval', entry.approval, entry.isApproved === 'Yes');
              }
              if (entry.postingDate) {
                checkAndAddCreativeTask('Posting', entry.postingDate, !!entry.postingLinkOfIg);
              }
            }
          });
        }

        // 4. Digital Marketing Client Projects
        if (isDigitalMarketingUser) {
          const dmProjects = (rawProjects || []).filter((p: any) => {
            if (p.department && p.department.trim().toLowerCase() === 'digital marketing') {
              const pStatus = (p.status || "").toLowerCase().trim();
              if (pStatus === "onhold" || pStatus === "on-hold" || pStatus === "on hold" || pStatus === "completed") return false;
              return true;
            }
            return false;
          });
          const myProjects = dmProjects.filter((p: any) => {
            return String(p.assignedEmployeeId).trim() === String(uId).trim();
          });
          
          myProjects.forEach((p: any) => {
            const client = (rawClients || []).find((c: any) => c.id === p.clientId);
            const cName = client?.companyName || client?.clientName || p.clientName || "Unknown Client";
            consolidated.push({
              id: p.id,
              title: cName,
              projectName: p.projectName || p.title || "",
              dueDate: p.endDate || p.deadline || "",
              status: "pending",
              department: 'Digital Marketing',
              sourceType: 'dm-missing-metric',
              originalTask: p
            });
          });
        }

        // 5. SMM Other Work & DM Other Work
        const targetEmpName = userObj ? (userObj.name || `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim()) : '';
        (rawOtherWork || []).forEach((ow: any) => {
          const isAssignee = String(ow.assigneeId) === String(uId) || (targetEmpName && ow.assigneeName && ow.assigneeName.toLowerCase().includes(targetEmpName.toLowerCase()));
          if (isAssignee && ow.status !== 'Approved') {
            let isProjectOnHold = false;
            if (ow.projectId) {
              const assocProject = (rawProjects || []).find((p: any) => p.id === ow.projectId);
              isProjectOnHold = assocProject && (assocProject.status === 'on-hold' || assocProject.status === 'onhold' || assocProject.status?.toLowerCase() === 'on-hold');
            }
            
            if (!isProjectOnHold) {
              const creatorName = ow.assignerName || ow.logs?.[0]?.userName || 'Manager';
              const empName = ow.assigneeName || userObj?.name || 'User';
              const enrichedOw = { ...ow, assignerName: creatorName, assigneeName: empName };

              consolidated.push({
                id: ow.id,
                title: ow.title,
                projectName: ow.taskType === 'digital-marketing' ? 'Digital Marketing' : 'Other Work',
                description: ow.description || 'SMM other work task',
                dueDate: ow.deadline ? (ow.deadline.includes('T') ? ow.deadline.split('T')[0] : ow.deadline) : '',
                priority: ow.priority || 'medium',
                status: ow.status,
                stage: ow.status,
                department: ow.taskType === 'digital-marketing' ? 'Digital Marketing' : 'Social Media Management',
                sourceType: 'smm-other',
                isDmOtherWork: ow.taskType === 'digital-marketing',
                clientId: ow.clientId,
                projectId: ow.projectId,
                originalTask: enrichedOw
              });
            }
          }
        });

        // 6. SMM Client Project Follow-ups
        (rawProjects || []).forEach((project: any) => {
          const isCreative = project.department === 'Creative' || project.department?.toLowerCase() === 'smm';
          if (isCreative) {
            const isProjectOnHold = project.status === 'on-hold' || project.status === 'onhold' || project.status?.toLowerCase() === 'on-hold';
            if (!isProjectOnHold && project.nextFollowupDate) {
              const client = (rawClients || []).find((c: any) => c.id === project.clientId);
              const followUpAssigneeId = project.assignedFollowUpId || client?.assignedFollowUpId || project.teamLeaderId;
              if (followUpAssigneeId === uId) {
                const nextDate = project.nextFollowupDate.split("T")[0].split(" ")[0];
                const empName = (rawEmployees || []).find((e: any) => e.id === followUpAssigneeId)?.name || userObj?.name || 'User';
                const tlName = (rawEmployees || []).find((e: any) => e.id === project.teamLeaderId)?.name || 'Manager';
                const enrichedProject = { ...project, assignerName: tlName, assigneeName: empName };

                consolidated.push({
                  id: `${project.id}-Followup`,
                  title: `Follow-up: ${project.title || client?.companyName || 'Project'}`,
                  projectName: client?.companyName || 'Unknown Client',
                  dueDate: nextDate,
                  priority: 'medium',
                  status: 'todo',
                  department: 'Social Media Management',
                  sourceType: 'smm-followup',
                  originalTask: enrichedProject
                });
              }
            }
          }
        });

        setTasks(consolidated);
      }
    } catch (err) {
      console.error("Error fetching data for punch in modal:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    let type = "Work";
    let subtype = "";

    if (selectedTab === "today_work" || selectedTab === "upcoming_work" || selectedTab === "assigned_brands" || selectedTab === "hr_sales_work" || selectedTab === "dm_other_work" || selectedTab === "pending_task") {
      type = "Work";
    } else if (selectedTab === "research") {
      type = "Research";
    } else if (selectedTab.startsWith("other_")) {
      type = "Other";
      subtype = selectedTab.replace("other_", "");
    }

    const data: any = { type };
    if (type === "Work") {
      if (selectedTab === "hr_sales_work" && !isNewWorkTask) {
        data.taskId = undefined;
        data.value = activityValue;
      } else if (selectedTab === "dm_other_work" && !isNewWorkTask) {
        data.taskId = taskId;
        const selectedTask = tasks.find(t => t.id === taskId);
        if (selectedTask) {
          data.value = selectedTask.title;
        } else {
          data.value = activityValue || "Other Work";
        }
      } else if (taskId === "custom" || (selectedTab === "dm_other_work" && isNewWorkTask) || (selectedTab === "hr_sales_work" && isNewWorkTask)) {
        setIsLoading(true);
        try {
          const userStr = localStorage.getItem("user");
          const userObj = userStr ? JSON.parse(userStr) : {};
          const userName = userObj.name || (userObj.firstName ? `${userObj.firstName} ${userObj.lastName || ''}`.trim() : "Unknown User");
          const deptStr = (userObj.department || "").toLowerCase();
          const desigStr = (userObj.designation || "").toLowerCase();
          const isDM = deptStr.includes('marketing') || deptStr.includes('dm') || desigStr.includes('marketing');
          
          const titleToUse = selectedTab === "dm_other_work" ? activityValue : (selectedTab === "hr_sales_work" ? activityValue : (customTaskName || activityValue));
          
          const payload = {
            title: titleToUse,
            description: "Custom task created from Punch-In",
            assigneeId: String(userId),
            assigneeName: userName,
            assignerId: String(userId),
            assignerName: userName,
            deadline: new Date().toISOString().split('T')[0],
            status: "In Progress",
            taskType: (isDM || selectedTab === "dm_other_work") ? "dm-other-work" : "other-work"
          };
          
          const isDev = userDept.includes('development');
          const isSales = userDept.includes('sales');
          let url = isDev && selectedTab !== "dm_other_work" ? `${API_URL}/wm-tasks` : `${API_URL}/other-work`;
          if (isSales && selectedTab === "hr_sales_work") {
            url = `${API_URL}/tasks`;
          }

          let bodyPayload;
          if (isDev && selectedTab !== "dm_other_work") {
            bodyPayload = {
              title: titleToUse,
              description: "Custom task created from Punch-In",
              projectId: "custom",
              projectName: "Custom Task",
              assignedToId: userId,
              assignedToName: userName,
              department: "Development",
              dueDate: new Date().toISOString().split('T')[0],
              status: "in-progress",
              priority: "medium",
              performedBy: userId,
              userName: userName
            };
          } else if (isSales && selectedTab === "hr_sales_work") {
            bodyPayload = {
              title: titleToUse,
              description: "Custom task created from Punch-In",
              dueDate: new Date().toISOString().split('T')[0],
              status: "in-progress",
              priority: "medium",
              assignedToIds: [userId],
              performedBy: userId,
              userName: userName,
              department: "Sales"
            };
          } else {
            bodyPayload = payload;
          }
          
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyPayload)
          });
          
          if (res.ok) {
            const newWork = await res.json();
            data.taskId = newWork.id || newWork._id;
            data.value = titleToUse;
          } else {
            console.error("Failed to create custom task");
            data.taskId = selectedTab === "dm_other_work" ? undefined : "custom";
            data.value = titleToUse;
          }
        } catch (err) {
          console.error("Error creating custom task:", err);
          data.taskId = selectedTab === "dm_other_work" ? undefined : "custom";
          data.value = selectedTab === "dm_other_work" ? activityValue : (selectedTab === "hr_sales_work" ? activityValue : customTaskName);
        } finally {
          setIsLoading(false);
        }
      } else {
        data.taskId = taskId;
        const selectedTask = tasks.find(t => t.id === taskId);
        if (selectedTask) {
          data.value = selectedTask.projectName ? `${selectedTask.title} (${selectedTask.projectName})` : selectedTask.title;
        }
      }
    } else if (type === "Other") {
      data.subtype = subtype;
      data.value = activityValue;
    } else if (type === "Research") {
      data.value = activityValue;
    }
    
    if ((taskId !== "custom" && !isNewWorkTask) || (data.taskId !== "custom" && data.taskId !== undefined)) {
      onConfirm(data);
    } else {
      // Fallback if creating failed, still punch in
      onConfirm(data);
    }
  };

  const isValid = () => {
    if (selectedTab === "today_work" || selectedTab === "upcoming_work" || selectedTab === "assigned_brands" || selectedTab === "pending_task") {
      if (taskId === "custom") return !!customTaskName.trim();
      return !!taskId;
    }
    if (selectedTab === "hr_sales_work") {
      return !!activityValue;
    }
    if (selectedTab === "dm_other_work") {
      if (isNewWorkTask) return !!activityValue;
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

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const todayTasks: any[] = [];
  const pendingTasks: any[] = [];
  const upcomingTasks: any[] = [];

  tasks.forEach((t) => {
    const deadlineDate = t.dueDate ? parseLocalDate(t.dueDate) : todayDate;

    if (t.sourceType === 'smm-creative' || t.sourceType === 'smm-followup' || t.sourceType === 'smm-other' || t.sourceType === 'dm-missing-metric') {
      if (t.status === 'Completed' || t.status === 'Approved') return;
      if (deadlineDate <= todayDate) {
        todayTasks.push(t);
      } else {
        upcomingTasks.push(t);
      }
    } else {
      if (!t.dueDate) {
        if (t.frequency === 'daily') {
          todayTasks.push(t);
        } else {
          pendingTasks.push(t);
        }
      } else {
        if (deadlineDate.getTime() === todayDate.getTime() || (t.frequency === 'daily' && deadlineDate <= todayDate)) {
          todayTasks.push(t);
        } else if (deadlineDate < todayDate) {
          todayTasks.push(t);
          pendingTasks.push(t);
        } else {
          upcomingTasks.push(t);
        }
      }
    }
  });

  todayTasks.sort((a, b) => {
    const dateA = a.dueDate ? parseLocalDate(a.dueDate) : new Date(0);
    const dateB = b.dueDate ? parseLocalDate(b.dueDate) : new Date(0);
    return dateA.getTime() - dateB.getTime();
  });

  upcomingTasks.sort((a, b) => {
    const dateA = a.dueDate ? parseLocalDate(a.dueDate) : new Date(0);
    const dateB = b.dueDate ? parseLocalDate(b.dueDate) : new Date(0);
    return dateA.getTime() - dateB.getTime();
  });

  pendingTasks.sort((a, b) => {
    const dateA = a.dueDate ? parseLocalDate(a.dueDate) : new Date(0);
    const dateB = b.dueDate ? parseLocalDate(b.dueDate) : new Date(0);
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
              setIsNewWorkTask(false);
            }} className="w-full">
              <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1 bg-muted/50 rounded-lg justify-start">
                {!userDept.includes('sales') && !['digital marketing', 'dm'].includes(userDept) && (
                  <>
                    <TabsTrigger value="today_work" className="data-[state=active]:bg-brand-teal data-[state=active]:text-white">Today's Work</TabsTrigger>
                    <TabsTrigger value="upcoming_work" className="data-[state=active]:bg-brand-teal data-[state=active]:text-white">Upcoming Work</TabsTrigger>
                    {(userDept === 'creative' || isHR) && (
                      <TabsTrigger value="pending_task" className="data-[state=active]:bg-brand-teal data-[state=active]:text-white">Pending Tasks</TabsTrigger>
                    )}
                  </>
                )}
                {['digital marketing', 'dm'].includes(userDept) && (
                  <>
                    <TabsTrigger value="assigned_brands" className="data-[state=active]:bg-brand-teal data-[state=active]:text-white">Projects</TabsTrigger>
                    <TabsTrigger value="dm_other_work" className="data-[state=active]:bg-brand-teal data-[state=active]:text-white">Work</TabsTrigger>
                  </>
                )}
                {userDept.includes('sales') && (
                  <TabsTrigger value="hr_sales_work" className="data-[state=active]:bg-brand-teal data-[state=active]:text-white">Work</TabsTrigger>
                )}
                <TabsTrigger value="research" className="data-[state=active]:bg-brand-teal data-[state=active]:text-white">Research</TabsTrigger>
                {(settings?.otherCategories || ["Activity", "Meeting"]).map((cat: string) => (
                  <TabsTrigger key={`other_${cat}`} value={`other_${cat}`} className="data-[state=active]:bg-brand-teal data-[state=active]:text-white">{cat}</TabsTrigger>
                ))}
              </TabsList>

              <div className="mt-6">
                {(selectedTab === "today_work" || selectedTab === "upcoming_work" || selectedTab === "assigned_brands" || selectedTab === "pending_task") && (
                  <div className="space-y-3">
                    <Label className="text-base">{selectedTab === "assigned_brands" ? 'Select Brand' : 'Select Task'}</Label>
                    <div className="max-h-[500px] overflow-y-scroll flex flex-col gap-1.5 pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-100/50 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-brand-teal/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-brand-teal/50 transition-colors" style={{ scrollbarWidth: 'thin', scrollbarColor: '#09A08A4D transparent' }}>
                      {(() => {
                        let activeTasks = [];
                        if (selectedTab === "assigned_brands") {
                          activeTasks = tasks.filter(t => !t.isDmOtherWork); // All active projects are shown regardless of date
                        } else if (selectedTab === "pending_task") {
                          activeTasks = pendingTasks;
                        } else {
                          activeTasks = selectedTab === "today_work" ? todayTasks : upcomingTasks;
                        }
                        
                        const elements = [];
                        
                        if (activeTasks.length === 0) {
                          elements.push(
                            <div key="empty" className="col-span-full py-8 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                              No {selectedTab === "assigned_brands" ? "assigned brands" : selectedTab === "today_work" ? "tasks for today" : selectedTab === "pending_task" ? "pending tasks" : "upcoming tasks"}
                            </div>
                          );
                        } else {
                          elements.push(...activeTasks.map(t => (
                            <div 
                              key={t.id} 
                              onClick={() => setTaskId(t.id)}
                              className={`px-3 py-1.5 rounded-lg cursor-pointer border transition-all duration-200 flex items-center justify-between min-h-[38px] ${
                                taskId === t.id 
                                  ? 'border-brand-teal bg-brand-teal/10 shadow-sm ring-1 ring-brand-teal' 
                                  : 'border-border/50 hover:border-brand-teal/50 hover:bg-muted/30'
                              }`}
                            >
                              <div className="font-medium text-sm flex-1 flex items-center gap-2 min-w-0">
                                <span className="whitespace-normal break-words" title={t.title}>{t.title}</span>
                                {t.dueDate && (
                                  <span className="text-[10px] font-semibold bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap">
                                    {typeof t.dueDate === 'string' && t.dueDate.includes('T') ? t.dueDate.split('T')[0] : String(t.dueDate)}
                                  </span>
                                )}
                              </div>
                              {t.projectName && <div className="text-[11px] text-muted-foreground ml-3 bg-muted/40 px-1.5 py-0.5 rounded flex-shrink-0 max-w-[35%] line-clamp-1">{t.projectName}</div>}
                            </div>
                          )));
                        }
                        
                        if (selectedTab === "today_work" && (userDept === 'creative' || userDept === 'development')) {
                          elements.push(
                            <div 
                              key="custom" 
                              onClick={() => setTaskId('custom')}
                              className={`px-3 py-1.5 mt-2 rounded-lg cursor-pointer border transition-all duration-200 flex items-center justify-between min-h-[38px] border-dashed ${
                                taskId === 'custom' 
                                  ? 'border-brand-teal bg-brand-teal/10 shadow-sm ring-1 ring-brand-teal' 
                                  : 'border-slate-300 hover:border-brand-teal/50 hover:bg-muted/30'
                              }`}
                            >
                              <div className="font-medium text-sm line-clamp-1 flex-1 flex items-center gap-2 text-brand-teal">
                                <span>+ Add Custom Work (Not Listed)</span>
                              </div>
                            </div>
                          );
                        }
                        
                        return elements;
                      })()}
                    </div>
                    {taskId === "custom" && (
                      <div className="space-y-2 mt-4 animate-in fade-in zoom-in duration-200">
                        <Label>Custom Task Name</Label>
                        <Input 
                          placeholder="Enter task name (e.g., Client meeting, Quick revision)" 
                          value={customTaskName}
                          onChange={e => setCustomTaskName(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                )}

                {selectedTab === "hr_sales_work" && (
                  <div className="space-y-3">
                    <Label className="text-base">Select Task</Label>
                    <div className="max-h-[500px] overflow-y-scroll flex flex-col gap-1.5 pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-100/50 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-brand-teal/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-brand-teal/50 transition-colors" style={{ scrollbarWidth: 'thin', scrollbarColor: '#09A08A4D transparent' }}>
                      {pastWorkTasks.map(topic => (
                        <div 
                          key={topic} 
                          onClick={() => {
                            setIsNewWorkTask(false);
                            setActivityValue(topic);
                          }}
                          className={`px-3 py-1.5 rounded-lg cursor-pointer border transition-all duration-200 flex items-center justify-between min-h-[38px] ${
                            activityValue === topic && !isNewWorkTask
                              ? 'border-brand-teal bg-brand-teal/10 shadow-sm ring-1 ring-brand-teal' 
                              : 'border-border/50 hover:border-brand-teal/50 hover:bg-muted/30'
                          }`}
                        >
                          <div className="font-medium text-sm flex-1 flex items-center gap-2 min-w-0">
                            <span className="whitespace-normal break-words" title={topic}>{topic}</span>
                          </div>
                        </div>
                      ))}
                      
                      <div 
                        key="custom_work" 
                        onClick={() => {
                          setIsNewWorkTask(true);
                          setActivityValue("");
                        }}
                        className={`px-3 py-1.5 mt-2 rounded-lg cursor-pointer border transition-all duration-200 flex items-center justify-between min-h-[38px] border-dashed ${
                          isNewWorkTask 
                            ? 'border-brand-teal bg-brand-teal/10 shadow-sm ring-1 ring-brand-teal' 
                            : 'border-slate-300 hover:border-brand-teal/50 hover:bg-muted/30'
                        }`}
                      >
                        <div className="font-medium text-sm line-clamp-1 flex-1 flex items-center gap-2 text-brand-teal">
                          <span>+ Add New Work Task</span>
                        </div>
                      </div>
                    </div>
                    
                    {isNewWorkTask && (
                      <div className="space-y-2 mt-4 animate-in fade-in zoom-in duration-200">
                        <Label>New Task Name</Label>
                        <Input 
                          placeholder="Enter new work task..." 
                          value={activityValue}
                          onChange={e => setActivityValue(e.target.value)}
                          autoFocus
                        />
                      </div>
                    )}
                  </div>
                )}

                {selectedTab === "dm_other_work" && (
                  <div className="space-y-3">
                    <Label className="text-base">Select Work Task</Label>
                    <div className="max-h-[500px] overflow-y-scroll flex flex-col gap-1.5 pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-100/50 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-brand-teal/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-brand-teal/50 transition-colors" style={{ scrollbarWidth: 'thin', scrollbarColor: '#09A08A4D transparent' }}>
                      {tasks.filter(t => t.isDmOtherWork).map(t => (
                        <div 
                          key={t.id} 
                          onClick={() => {
                            setIsNewWorkTask(false);
                            setTaskId(t.id);
                          }}
                          className={`px-3 py-1.5 rounded-lg cursor-pointer border transition-all duration-200 flex items-center justify-between min-h-[38px] ${
                            taskId === t.id && !isNewWorkTask
                              ? 'border-brand-teal bg-brand-teal/10 shadow-sm ring-1 ring-brand-teal' 
                              : 'border-border/50 hover:border-brand-teal/50 hover:bg-muted/30'
                          }`}
                        >
                          <div className="font-medium text-sm flex-1 flex items-center gap-2 min-w-0">
                            <span className="whitespace-normal break-words" title={t.title}>{t.title}</span>
                          </div>
                        </div>
                      ))}
                      {tasks.filter(t => t.isDmOtherWork).length === 0 && (
                        <div className="col-span-full py-4 text-center text-sm text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                          No pending work tasks
                        </div>
                      )}
                      
                      <div 
                        key="custom_work" 
                        onClick={() => {
                          setIsNewWorkTask(true);
                          setTaskId("");
                          setActivityValue("");
                        }}
                        className={`px-3 py-1.5 mt-2 rounded-lg cursor-pointer border transition-all duration-200 flex items-center justify-between min-h-[38px] border-dashed ${
                          isNewWorkTask 
                            ? 'border-brand-teal bg-brand-teal/10 shadow-sm ring-1 ring-brand-teal' 
                            : 'border-slate-300 hover:border-brand-teal/50 hover:bg-muted/30'
                        }`}
                      >
                        <div className="font-medium text-sm line-clamp-1 flex-1 flex items-center gap-2 text-brand-teal">
                          <span>+ Add New Work Task</span>
                        </div>
                      </div>
                    </div>
                    
                    {isNewWorkTask && (
                      <div className="space-y-2 mt-4 animate-in fade-in zoom-in duration-200">
                        <Label>New Task Name</Label>
                        <Input 
                          placeholder="Enter new work task..." 
                          value={activityValue}
                          onChange={e => setActivityValue(e.target.value)}
                          autoFocus
                        />
                      </div>
                    )}
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
