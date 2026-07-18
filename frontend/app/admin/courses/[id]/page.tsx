"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { API_URL } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Loader2, ImagePlus, Plus, Trash2, FileVideo, FileText, Link as LinkIcon, BookOpen } from "lucide-react";
import { useConfirm } from "@/context/ConfirmContext";

interface LocalLecture {
  id: string;
  title: string;
  description: string;
  url: string;
  type: string;
}

interface LocalModule {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  lectures: LocalLecture[];
}

export default function EditCoursePage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [courseState, setCourseState] = useState({ title: "", description: "", image_url: "" });
  const [modules, setModules] = useState<LocalModule[]>([]);
  
  const [deletedModuleIds, setDeletedModuleIds] = useState<string[]>([]);
  const [deletedLectureIds, setDeletedLectureIds] = useState<string[]>([]);

  const { confirm } = useConfirm();

  const generateId = () => "temp-" + Math.random().toString(36).substr(2, 9);

  useEffect(() => {
    if (courseId) {
      fetchCourseDetails();
    }
  }, [courseId]);

  const fetchCourseDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        if (res.status === 404) {
          toast.error("Course not found");
          router.push("/admin/courses");
          return;
        }
        throw new Error("Failed to fetch course details");
      }
      const data = await res.json();
      
      setCourseState({
        title: data.title,
        description: data.description || "",
        image_url: data.image_url || ""
      });
      
      const fetchedModules: LocalModule[] = data.modules?.map((m: any) => ({
        id: m.id,
        title: m.title,
        description: m.description || "",
        image_url: m.image_url || "",
        lectures: m.lectures?.map((l: any) => ({
          id: l.id,
          title: l.title,
          description: l.description || "",
          url: l.url || "",
          type: l.type || "video"
        })) || []
      })) || [];
      
      setModules(fetchedModules);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const addModule = () => {
    setModules([...modules, { id: generateId(), title: "", description: "", lectures: [] }]);
  };

  const removeModule = async (moduleId: string) => {
    const isConfirmed = await confirm({
      title: "Remove Module",
      message: "Are you sure you want to remove this module and all its lectures?",
      confirmText: "Remove",
      destructive: true,
    });
    if (!isConfirmed) return;
    
    if (!moduleId.startsWith("temp-")) {
      setDeletedModuleIds([...deletedModuleIds, moduleId]);
    }
    setModules(modules.filter(m => m.id !== moduleId));
  };

  const updateModule = (moduleId: string, field: keyof LocalModule, value: any) => {
    setModules(modules.map(m => m.id === moduleId ? { ...m, [field]: value } : m));
  };

  const addLecture = (moduleId: string) => {
    setModules(modules.map(m => {
      if (m.id === moduleId) {
        return {
          ...m,
          lectures: [...m.lectures, { id: generateId(), title: "", description: "", url: "", type: "video" }]
        };
      }
      return m;
    }));
  };

  const removeLecture = async (moduleId: string, lectureId: string) => {
    const isConfirmed = await confirm({
      title: "Remove Lecture",
      message: "Are you sure you want to remove this lecture?",
      confirmText: "Remove",
      destructive: true,
    });
    if (!isConfirmed) return;
    
    if (!lectureId.startsWith("temp-")) {
      setDeletedLectureIds([...deletedLectureIds, lectureId]);
    }
    
    setModules(modules.map(m => {
      if (m.id === moduleId) {
        return { ...m, lectures: m.lectures.filter(l => l.id !== lectureId) };
      }
      return m;
    }));
  };

  const updateLecture = (moduleId: string, lectureId: string, field: keyof LocalLecture, value: any) => {
    setModules(modules.map(m => {
      if (m.id === moduleId) {
        return {
          ...m,
          lectures: m.lectures.map(l => l.id === lectureId ? { ...l, [field]: value } : l)
        };
      }
      return m;
    }));
  };

  const handleSaveChanges = async () => {
    if (!courseState.title.trim()) {
      toast.error("Course title is required");
      return;
    }
    try {
      setIsSubmitting(true);
      const token = localStorage.getItem("token");
      
      // 1. Update Course
      const res = await fetch(`${API_URL}/courses/${courseId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(courseState)
      });
      if (!res.ok) throw new Error("Failed to update course details");
      
      // 2. Process Deletions
      for (const id of deletedModuleIds) {
        await fetch(`${API_URL}/course-modules/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      }
      for (const id of deletedLectureIds) {
        await fetch(`${API_URL}/course-lectures/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      }
      
      // 3. Process Modules and Lectures
      for (let i = 0; i < modules.length; i++) {
        const mod = modules[i];
        if (!mod.title.trim()) continue;
        
        let actualModuleId = mod.id;
        
        // POST or PUT module
        if (mod.id.startsWith("temp-")) {
          const mRes = await fetch(`${API_URL}/course-modules`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              course_id: courseId,
              title: mod.title,
              description: mod.description,
              image_url: mod.image_url,
              order: i + 1
            })
          });
          if (mRes.ok) {
            const mData = await mRes.json();
            actualModuleId = mData.id;
          } else {
            continue;
          }
        } else {
          await fetch(`${API_URL}/course-modules/${mod.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              title: mod.title,
              description: mod.description,
              image_url: mod.image_url,
              order: i + 1
            })
          });
        }
        
        // POST or PUT lectures
        for (let j = 0; j < mod.lectures.length; j++) {
          const lec = mod.lectures[j];
          if (!lec.title.trim()) continue;
          
          if (lec.id.startsWith("temp-")) {
            await fetch(`${API_URL}/course-lectures`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                module_id: actualModuleId,
                title: lec.title,
                description: lec.description,
                url: lec.url,
                type: lec.type,
                order: j + 1
              })
            });
          } else {
            await fetch(`${API_URL}/course-lectures/${lec.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                title: lec.title,
                description: lec.description,
                url: lec.url,
                type: lec.type,
                order: j + 1
              })
            });
          }
        }
      }
      
      toast.success("Changes saved successfully!");
      
      // Reset deletion tracking and refresh
      setDeletedModuleIds([]);
      setDeletedLectureIds([]);
      fetchCourseDetails();
      
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setCourseState({...courseState, image_url: data.url});
      toast.success("Image uploaded successfully");
    } catch (err) {
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-teal" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto w-full pb-10">
      <div className="flex justify-between items-center mb-6">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/admin/courses')}
          className="-ml-4 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Courses
        </Button>
        
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => fetchCourseDetails()} disabled={isSubmitting}>
            Discard Changes
          </Button>
          <Button onClick={handleSaveChanges} disabled={isSubmitting} className="bg-brand-teal hover:bg-brand-teal/90 text-white min-w-40">
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Basic Information Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-brand-teal" /> Edit Course Information
            </h2>
          </div>
          
          <div className="p-6 md:p-8 space-y-8">
            <div className="space-y-3">
              <Label className="text-base font-semibold">Course Title <span className="text-red-500">*</span></Label>
              <Input 
                className="text-lg py-6"
                placeholder="e.g. Complete Digital Marketing Masterclass" 
                value={courseState.title}
                onChange={(e) => setCourseState({...courseState, title: e.target.value})}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold">Course Cover Image</Label>
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="w-full md:w-64 aspect-video rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 overflow-hidden flex flex-col items-center justify-center relative">
                  {courseState.image_url ? (
                    <img src={courseState.image_url} alt="Cover Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-gray-400">
                      <ImagePlus className="h-8 w-8 mb-2" />
                      <span className="text-sm">No Image</span>
                    </div>
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 bg-white/70 dark:bg-black/70 flex items-center justify-center backdrop-blur-sm">
                      <Loader2 className="h-6 w-6 animate-spin text-brand-teal" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-4">
                  <Input type="file" accept="image/*" onChange={handleImageUpload} className="max-w-sm" disabled={isUploading} />
                  <p className="text-sm text-gray-500">Upload a 16:9 ratio image for best results.</p>
                  {courseState.image_url && (
                    <Button variant="outline" size="sm" onClick={() => setCourseState({...courseState, image_url: ""})} className="text-red-500 hover:text-red-600">Remove Image</Button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold">Description</Label>
              <Textarea 
                rows={4}
                className="resize-y text-base p-4 leading-relaxed"
                placeholder="Describe what the course is about..." 
                value={courseState.description}
                onChange={(e) => setCourseState({...courseState, description: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* Curriculum Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 p-6 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Course Curriculum
              </h2>
              <p className="text-sm text-gray-500 mt-1">Add modules and lectures to build your course content.</p>
            </div>
            <Button onClick={addModule} variant="outline" className="border-brand-teal text-brand-teal hover:bg-brand-teal/5">
              <Plus className="h-4 w-4 mr-2" /> Add Module
            </Button>
          </div>

          <div className="p-6 md:p-8 space-y-6">
            {modules.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                <p className="text-gray-500">No modules added yet. Click "Add Module" to start building.</p>
              </div>
            ) : (
              modules.map((mod, mIndex) => (
                <div key={mod.id} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-5">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-brand-teal whitespace-nowrap">Section {mIndex + 1}:</span>
                        <Input 
                          placeholder="Module Title (e.g. Introduction)" 
                          value={mod.title} 
                          onChange={(e) => updateModule(mod.id, 'title', e.target.value)}
                          className="bg-white dark:bg-gray-900 font-medium"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Textarea 
                          placeholder="Module Description (Optional)" 
                          value={mod.description}
                          onChange={(e) => updateModule(mod.id, 'description', e.target.value)}
                          className="bg-white dark:bg-gray-900"
                          rows={2}
                        />
                        <div className="flex items-center gap-4 border border-gray-200 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900">
                          {mod.image_url && (
                            <img src={mod.image_url} alt="Preview" className="h-12 w-20 object-cover rounded" />
                          )}
                          <div className="flex-1">
                            <Label className="text-xs text-gray-500 mb-1 block">Module Image (Optional)</Label>
                            <Input 
                              type="file" 
                              accept="image/*"
                              className="text-xs h-8"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                  const formData = new FormData();
                                  formData.append("file", file);
                                  const token = localStorage.getItem("token");
                                  const res = await fetch(`${API_URL}/upload`, {
                                    method: "POST",
                                    headers: { Authorization: `Bearer ${token}` },
                                    body: formData
                                  });
                                  if (!res.ok) throw new Error("Upload failed");
                                  const data = await res.json();
                                  updateModule(mod.id, 'image_url', data.url);
                                } catch (err) {
                                  toast.error("Failed to upload module image");
                                }
                              }} 
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeModule(mod.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>

                  {/* Lectures inside Module */}
                  <div className="pl-4 md:pl-10 space-y-4 border-l-2 border-gray-200 dark:border-gray-700 ml-2">
                    {mod.lectures.map((lec, lIndex) => (
                      <div key={lec.id} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4 relative group">
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => removeLecture(mod.id, lec.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center gap-3 pr-10">
                          <span className="text-gray-400 text-sm font-medium">{lIndex + 1}.</span>
                          <Input 
                            placeholder="Lecture Title" 
                            value={lec.title} 
                            onChange={(e) => updateLecture(mod.id, lec.id, 'title', e.target.value)}
                          />
                        </div>
                        
                        <div className="pl-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2 col-span-2 md:col-span-1">
                            <Input 
                              placeholder="Lecture Image URL (Optional)" 
                              value={lec.image_url || ''} 
                              onChange={(e) => updateLecture(mod.id, lec.id, 'image_url', e.target.value)}
                              className="text-sm"
                            />
                          </div>
                          <div className="space-y-2 col-span-2">
                            <Textarea 
                              placeholder="Lecture Description (Optional)" 
                              value={lec.description} 
                              onChange={(e) => updateLecture(mod.id, lec.id, 'description', e.target.value)}
                              rows={2}
                              className="text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <Button onClick={() => addLecture(mod.id)} variant="ghost" size="sm" className="text-brand-teal hover:text-brand-teal/80 hover:bg-brand-teal/5">
                      <Plus className="h-4 w-4 mr-1" /> Add Lecture
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
