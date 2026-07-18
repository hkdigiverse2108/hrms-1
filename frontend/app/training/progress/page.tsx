"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/config";
import { Course, Employee, LectureProgress } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Loader2, Users, ChevronDown, CheckCircle2 } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";

export default function ProgressAndAccessPage() {
  const router = useRouter();
  const { checkPermission, isAdmin } = usePermissions();
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [allProgress, setAllProgress] = useState<LectureProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    // Check permission
    if (!isAdmin && !checkPermission("course-progress", "canView")) {
      router.push("/");
      return;
    }
    
    fetchInitialData();
  }, [isAdmin, checkPermission]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      // Fetch courses
      const coursesRes = await fetch(`${API_URL}/courses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (coursesRes.ok) {
        const coursesData = await coursesRes.json();
        setCourses(coursesData);
        if (coursesData.length > 0) {
          setSelectedCourseId(coursesData[0].id);
        }
      }

      // Fetch employees
      const empRes = await fetch(`${API_URL}/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (empRes.ok) {
        setAllEmployees(await empRes.json());
      }
    } catch (err) {
      console.error("Failed to load initial data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCourseId) {
      fetchAllProgress(selectedCourseId);
    }
  }, [selectedCourseId]);

  const fetchAllProgress = async (cId: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/courses/${cId}/progress/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setAllProgress(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch progress", err);
    }
  };

  const handleAssignEmployees = async (employeeIds: string[]) => {
    if (!selectedCourseId) return;
    try {
      setIsAssigning(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/courses/${selectedCourseId}/assign`, {
        method: "PUT",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ employee_ids: employeeIds })
      });
      if (res.ok) {
        // Update local course state
        setCourses(courses.map(c => 
          c.id === selectedCourseId ? { ...c, assigned_employee_ids: employeeIds } : c
        ));
      }
    } catch (err) {
      console.error("Failed to assign employees", err);
    } finally {
      setIsAssigning(false);
    }
  };

  const selectedCourse = courses.find(c => c.id === selectedCourseId);

  if (loading) {
    return (
      <div className="flex justify-center py-20 min-h-screen bg-gray-50 dark:bg-gray-950">
        <Loader2 className="h-10 w-10 animate-spin text-brand-teal" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
      <div className="relative overflow-hidden bg-gradient-to-r from-brand-teal to-teal-800 text-white">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2">
            Progress & Access
          </h1>
          <p className="text-teal-50 max-w-2xl leading-relaxed">
            Manage course assignments and track employee learning progress across all training modules.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Select Course</label>
          <div className="relative max-w-md">
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="block w-full appearance-none bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 py-3 px-4 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent transition-all shadow-sm"
            >
              {courses.map(course => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
        </div>

        {selectedCourse && (
          <div className="space-y-8">
            {/* Assign Access Section */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-brand-teal/10 p-2 rounded-lg">
                  <Users className="h-5 w-5 text-brand-teal" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Course Access</h3>
              </div>
              
              <p className="text-gray-600 dark:text-gray-400 mb-4">Assign employees who can view and take this course.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
                {allEmployees.map(emp => (
                  <label key={emp.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-brand-teal rounded border-gray-300 focus:ring-brand-teal"
                      checked={selectedCourse.assigned_employee_ids?.includes(emp.id) || false}
                      onChange={(e) => {
                        const current = selectedCourse.assigned_employee_ids || [];
                        const next = e.target.checked 
                          ? [...current, emp.id]
                          : current.filter((id: string) => id !== emp.id);
                        setCourses(courses.map(c => c.id === selectedCourseId ? { ...c, assigned_employee_ids: next } : c));
                      }}
                    />
                    <span className="font-medium text-sm text-gray-700 dark:text-gray-300">{emp.name || emp.firstName}</span>
                  </label>
                ))}
              </div>
              
              <Button 
                onClick={() => handleAssignEmployees(selectedCourse.assigned_employee_ids || [])}
                disabled={isAssigning}
                className="bg-brand-teal hover:bg-brand-teal/90 text-white rounded-xl px-8"
              >
                {isAssigning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Access List
              </Button>
            </div>

            {/* Progress Table */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-brand-teal" />
                  Employee Progress
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-950 text-gray-500 dark:text-gray-400 uppercase font-bold text-xs">
                    <tr>
                      <th className="px-6 py-4">Employee</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Watch Time</th>
                      <th className="px-6 py-4">Lectures Completed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {(!selectedCourse.assigned_employee_ids || selectedCourse.assigned_employee_ids.length === 0) && (
                       <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No employees assigned to this course.</td></tr>
                    )}
                    {selectedCourse.assigned_employee_ids?.map((empId: string) => {
                      const emp = allEmployees.find(e => e.id === empId);
                      const empProgress = allProgress.filter(p => p.employee_id === empId);
                      const completedLectures = empProgress.filter(p => p.is_completed).length;
                      const totalLecturesCount = selectedCourse.modules?.reduce((acc, m) => acc + (m.lectures?.length || 0), 0) || 1;
                      const progressPercent = Math.min(100, Math.round((completedLectures / totalLecturesCount) * 100));
                      const totalWatched = empProgress.reduce((acc, p) => acc + p.watched_seconds, 0);
                      
                      return (
                        <tr key={empId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                          <td className="px-6 py-4 font-bold text-gray-900 dark:text-gray-100">{emp?.name || emp?.firstName || empId}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                <div className="bg-brand-teal h-full rounded-full transition-all duration-500" style={{width: `${progressPercent}%`}}></div>
                              </div>
                              <span className="font-bold text-gray-600 dark:text-gray-400">{progressPercent}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-600 dark:text-gray-400 font-medium">{Math.round(totalWatched / 60)} mins</td>
                          <td className="px-6 py-4 font-medium">
                            <span className="text-gray-900 dark:text-gray-100">{completedLectures}</span>
                            <span className="text-gray-400 mx-1">/</span>
                            <span className="text-gray-500">{totalLecturesCount}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
