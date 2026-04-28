"use client";

import React from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Briefcase, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Manage and track all company projects and their progress."
      >
        <Button className="bg-brand-teal hover:bg-brand-teal-light text-white">
          <Plus className="w-4 h-4 mr-2" />
          Create Project
        </Button>
      </PageHeader>
      
      <div className="bg-white border border-border rounded-xl p-20 flex flex-col items-center justify-center text-center space-y-4 shadow-sm">
        <div className="w-16 h-16 bg-brand-light rounded-full flex items-center justify-center text-brand-teal">
          <Briefcase className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">Projects Module</h2>
          <p className="text-muted-foreground max-w-md">
            The project management system is being initialized. You will soon be able to assign teams, set milestones, and track project health.
          </p>
        </div>
      </div>
    </div>
  );
}
