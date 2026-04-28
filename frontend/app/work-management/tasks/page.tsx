"use client";

import React from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { ClipboardList, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="Assign, track and manage daily tasks for your team members."
      >
        <Button className="bg-brand-teal hover:bg-brand-teal-light text-white">
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </Button>
      </PageHeader>
      
      <div className="bg-white border border-border rounded-xl p-20 flex flex-col items-center justify-center text-center space-y-4 shadow-sm">
        <div className="w-16 h-16 bg-brand-light rounded-full flex items-center justify-center text-brand-teal">
          <ClipboardList className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">Task Management</h2>
          <p className="text-muted-foreground max-w-md">
            Our comprehensive task management system is coming soon. Features will include sub-tasks, priority levels, and real-time status updates.
          </p>
        </div>
      </div>
    </div>
  );
}
