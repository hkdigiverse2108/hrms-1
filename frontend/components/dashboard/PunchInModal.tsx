"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { API_URL } from "@/lib/config";

interface PunchInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: { type: string; subtype?: string; value?: string; taskId?: string }) => void;
  userId: string;
}

export function PunchInModal({ open, onOpenChange, onConfirm, userId }: PunchInModalProps) {
  const [activityType, setActivityType] = useState<string>("");
  const [activitySubtype, setActivitySubtype] = useState<string>("");
  const [activityValue, setActivityValue] = useState<string>("");
  const [taskId, setTaskId] = useState<string>("");
  
  const [tasks, setTasks] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && userId) {
      fetchData();
      setActivityType("");
      setActivitySubtype("");
      setActivityValue("");
      setTaskId("");
    }
  }, [open, userId]);

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
        const myTasks = allTasks.filter((t: any) => {
          if (t.assignedToId !== userId) return false;
          if (t.status === "completed" || t.status === "pending" || t.status === "onhold") return false;
          return true;
        });
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
    } else if (activityType === "Other") {
      data.subtype = activitySubtype;
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
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Punch In Activity</DialogTitle>
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
                  <SelectItem value="Work">Work (Tasks)</SelectItem>
                  <SelectItem value="Research">Research</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {activityType === "Work" && (
              <div className="space-y-2">
                <Label>Select Task</Label>
                <Select value={taskId} onValueChange={setTaskId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a task from your board" />
                  </SelectTrigger>
                  <SelectContent>
                    {tasks.length > 0 ? tasks.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.title} {t.projectName ? `(${t.projectName})` : ''}</SelectItem>
                    )) : (
                      <SelectItem value="none" disabled>No active tasks found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
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
                      <SelectItem value="Activity">Activity</SelectItem>
                      <SelectItem value="Meeting">Meeting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {activitySubtype === "Activity" && (
                  <div className="space-y-2">
                    <Label>Activity Option</Label>
                    <Select value={activityValue} onValueChange={setActivityValue}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select activity" />
                      </SelectTrigger>
                      <SelectContent>
                        {settings?.otherActivities?.length > 0 ? (
                          settings.otherActivities.map((act: string) => (
                            <SelectItem key={act} value={act}>{act}</SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>No activities configured in settings</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {activitySubtype === "Meeting" && (
                  <div className="space-y-2">
                    <Label>Meeting Option</Label>
                    <Select value={activityValue} onValueChange={setActivityValue}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select meeting" />
                      </SelectTrigger>
                      <SelectContent>
                        {settings?.otherMeetings?.length > 0 ? (
                          settings.otherMeetings.map((meet: string) => (
                            <SelectItem key={meet} value={meet}>{meet}</SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>No meetings configured in settings</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
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
            Confirm Punch In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
