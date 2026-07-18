"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/config";
import { Course } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Search, Loader2 } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useConfirm } from "@/context/ConfirmContext";

export default function AdminCoursesPage() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  useEffect(() => {
    // Only admins should access this route, ideally protected by middleware/layout
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/courses`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to fetch courses");
      const data = await res.json();
      setCourses(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const { confirm } = useConfirm();

  const handleDeleteCourse = async (id: string) => {
    const isConfirmed = await confirm({
      title: "Delete Course",
      message: "Are you sure you want to delete this course? All modules and lectures inside it will be deleted permanently.",
      confirmText: "Delete",
      destructive: true,
    });
    
    if (!isConfirmed) return;
    
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/courses/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!res.ok) throw new Error("Failed to delete course");
      
      toast.success("Course deleted successfully");
      fetchCourses();
    } catch (error: any) {
      toast.error(error.message || "Error deleting course");
    }
  };

  const filteredCourses = courses.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Course Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage training courses, modules, and lectures.</p>
        </div>
        <Button onClick={() => router.push('/admin/courses/new')} className="bg-brand-teal hover:bg-brand-teal/90 text-white">
          <Plus className="h-4 w-4 mr-2" /> Add Course
        </Button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-brand-teal" />
                  </TableCell>
                </TableRow>
              ) : filteredCourses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-gray-500">
                    No courses found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCourses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell>
                      {course.image_url ? (
                        <div className="w-16 h-12 rounded overflow-hidden bg-gray-100">
                          <img src={course.image_url} alt={course.title} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-16 h-12 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-500">
                          No Img
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{course.title}</TableCell>
                    <TableCell className="max-w-xs truncate text-gray-500" title={course.description}>
                      {course.description || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => router.push(`/admin/courses/${course.id}`)}
                        >
                          <Edit2 className="h-4 w-4 mr-2" /> Manage Content
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteCourse(course.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
