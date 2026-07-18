"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { API_URL } from "@/lib/config";
import { Course } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, PlayCircle, BookOpen, FileText, ChevronDown, ChevronUp, Link as LinkIcon, Share2, Layers, ShieldCheck, Play, Users, CheckCircle2 } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { usePermissions } from "@/hooks/usePermissions";
import dynamic from "next/dynamic";

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });

export type TabType = 'about' | 'lectures' | 'modules';

export default function CourseViewerPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  
  const { user } = useUser();
  const { isAdmin } = usePermissions();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('about');
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [selectedLectureModuleId, setSelectedLectureModuleId] = useState<string | null>(null);
  const [activeLecture, setActiveLecture] = useState<any>(null);
  
  // Progress & Access States
  const [myProgress, setMyProgress] = useState<any[]>([]);

  useEffect(() => {
    if (courseId) {
      fetchCourseDetails();
      fetchMyProgress();
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
          router.push("/training");
          return;
        }
        throw new Error("Failed to fetch course details");
      }
      const data = await res.json();
      setCourse(data);
      
      // Expand all modules by default
      if (data.modules && data.modules.length > 0) {
        const expandedState: Record<string, boolean> = {};
        data.modules.forEach((mod: any) => {
          expandedState[mod.id] = true;
        });
        setExpandedModules(expandedState);
        setSelectedLectureModuleId(data.modules[0].id);
      }
    } catch (error: any) {
      console.log("Course fetch error:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyProgress = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/courses/${courseId}/progress/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMyProgress(data);
      }
    } catch (err) {
      console.error("Failed to fetch my progress", err);
    }
  };

  const fetchAllProgress = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/courses/${courseId}/progress/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAllProgress(data);
      }
    } catch (err) {
      console.error("Failed to fetch all progress", err);
    }
  };

  const fetchAllEmployees = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAllEmployees(data);
      }
    } catch (err) {
      console.error("Failed to fetch employees", err);
    }
  };

  const handleAssignEmployees = async (employeeIds: string[]) => {
    try {
      setIsAssigning(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/courses/${courseId}/assign`, {
        method: "PUT",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ employee_ids: employeeIds })
      });
      if (res.ok) {
        fetchCourseDetails(); // refresh course
      }
    } catch (err) {
      console.error("Failed to assign employees", err);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleVideoProgress = async (state: any) => {
    if (!activeLecture) return;
    
    // state.playedSeconds is how much watched currently in this session
    // Send progress to backend
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API_URL}/courses/${courseId}/progress/${activeLecture.id}`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          watched_seconds: state.playedSeconds,
          total_seconds: state.loadedSeconds || 1 // Avoid division by zero
        })
      });
      
      // Optionally refresh progress occasionally, but usually we just update locally
      // to avoid hitting API too much, but for now we won't refresh `myProgress` on every tick.
    } catch (err) {
      console.error("Failed to update progress", err);
    }
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const getLectureIcon = (type: string) => {
    switch (type) {
      case 'video': return <PlayCircle className="h-5 w-5 text-brand-teal" />;
      case 'document': return <FileText className="h-5 w-5 text-brand-teal" />;
      default: return <LinkIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-brand-teal" />
      </div>
    );
  }

  if (!course) return null;

  const totalLectures = course.modules?.reduce((acc, mod) => acc + (mod.lectures?.length || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20 font-sans">
      {/* Top Navigation */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/training')}
            className="text-gray-600 hover:text-gray-900 -ml-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" /> Back to Library
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
        
        {/* Hero Banner */}
        <div className="w-full h-48 md:h-80 bg-gray-900 rounded-2xl overflow-hidden mb-6 relative">
          {course.image_url ? (
            <img 
              src={course.image_url} 
              alt={course.title} 
              className="w-full h-full object-cover opacity-90" 
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-slate-800 to-slate-900 flex items-center justify-center">
              <BookOpen className="h-20 w-20 text-white/20" />
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="flex items-center gap-3 mb-4">
          <div className="border border-gray-300 rounded px-3 py-1 text-sm font-medium text-gray-700 bg-white">
            English
          </div>
          <div className="text-sm font-bold text-brand-teal uppercase tracking-wide">
            TRAINING MODULE
          </div>
        </div>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 uppercase tracking-tight">
            {course.title}
          </h1>
        </div>


        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <div className="flex justify-between w-full md:px-12">
            {(['ABOUT', 'LECTURES', 'MODULES'] as TabType[]).map((tab) => {
              const tabId = tab.toLowerCase();
              return (
              <button
                key={tab}
                onClick={() => setActiveTab(tabId as TabType)}
                className={`pb-4 px-2 md:px-8 text-sm md:text-base font-bold transition-colors relative ${
                  activeTab === tabId 
                    ? "text-brand-teal" 
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {tab}
                {activeTab === tabId && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-teal rounded-t-md" />
                )}
              </button>
            )})}
          </div>
        </div>

        {/* Tab Content */}
        <div className="w-full">
          {activeTab === 'about' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-brand-teal/10 to-transparent p-6 md:p-8 border-b border-brand-teal/10">
                <div className="flex items-center gap-4">
                  <div className="bg-brand-teal/20 p-3 rounded-xl shadow-sm">
                    <BookOpen className="h-6 w-6 text-brand-teal" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Course Overview</h2>
                </div>
              </div>
              <div className="p-6 md:p-8">
                <div className="text-gray-700 leading-relaxed whitespace-pre-wrap text-[17px]">
                  {course.description || "No description provided."}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'lectures' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Sidebar: Modules */}
              <div className="col-span-1 md:col-span-4 lg:col-span-3">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden sticky top-24">
                  {course.modules?.map((mod) => (
                    <button
                      key={mod.id}
                      onClick={() => setSelectedLectureModuleId(mod.id)}
                      className={`w-full text-left px-5 py-4 text-sm font-bold border-b border-gray-100 last:border-b-0 transition-colors uppercase ${
                        selectedLectureModuleId === mod.id
                          ? 'bg-teal-50/80 text-brand-teal'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {mod.title}
                    </button>
                  ))}
                  {(!course.modules || course.modules.length === 0) && (
                    <div className="p-4 text-sm text-gray-500 italic text-center">No modules</div>
                  )}
                </div>
              </div>

              {/* Main Content: Lectures */}
              <div className="col-span-1 md:col-span-8 lg:col-span-9 space-y-4">
                {(() => {
                  const activeModule = course.modules?.find(m => m.id === selectedLectureModuleId);
                  
                  if (!activeModule) {
                    return <div className="text-gray-500 italic bg-white p-6 rounded-xl border border-gray-200 shadow-sm">Please select a module to view lectures.</div>;
                  }

                  if (!activeModule.lectures || activeModule.lectures.length === 0) {
                    return <div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-200 shadow-sm">No lectures found in this module.</div>;
                  }

                  return (
                    <div key="lectures-container" className="space-y-6">
                      {activeLecture && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
                          <div className="bg-slate-900 aspect-video w-full relative">
                            <ReactPlayer
                              url={activeLecture.url}
                              width="100%"
                              height="100%"
                              controls
                              playing
                              onProgress={handleVideoProgress}
                            />
                          </div>
                          <div className="p-4 border-t border-gray-100">
                            <h3 className="font-bold text-lg">{activeLecture.title}</h3>
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-4">
                        {activeModule.lectures.map((lec: any, index: number) => {
                          const progressInfo = myProgress.find(p => p.lecture_id === lec.id);
                          const isCompleted = progressInfo?.is_completed;
                          const percent = progressInfo ? Math.min(100, (progressInfo.watched_seconds / (progressInfo.total_seconds || 1)) * 100) : 0;
                          
                          return (
                            <div
                              key={lec.id}
                              onClick={() => setActiveLecture(lec)}
                              className={`block bg-white rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow group cursor-pointer ${activeLecture?.id === lec.id ? 'border-brand-teal ring-1 ring-brand-teal' : 'border-gray-200'}`}
                            >
                              <div className="flex flex-col sm:flex-row h-full">
                                {/* Image / Thumbnail */}
                                {(lec.image_url || activeModule.image_url) && (
                                  <div className="w-full sm:w-[280px] aspect-[16/9] relative bg-gray-100 flex-shrink-0">
                                    <img src={lec.image_url || activeModule.image_url} alt={lec.title} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                                      <PlayCircle className="h-12 w-12 text-white/90 group-hover:scale-110 transition-transform" />
                                    </div>
                                    <div className="absolute top-3 left-3 bg-white/90 p-1.5 rounded-md shadow-sm">
                                      <ShieldCheck className="h-4 w-4 text-brand-teal" />
                                    </div>
                                    <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                                       <div className="bg-brand-teal text-white text-[11px] font-bold px-3 py-1 rounded-sm uppercase tracking-wide shadow-md">
                                         Lecture-{index + 1}
                                       </div>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Content */}
                                <div className="p-5 flex-1 flex flex-col justify-center relative">
                                  {isCompleted && (
                                    <div className="absolute top-4 right-4 flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-bold">
                                      <CheckCircle2 className="h-4 w-4" /> Completed
                                    </div>
                                  )}
                                  <div className="flex items-center gap-3 mb-2.5">
                                    <span className="text-[12px] font-bold text-brand-teal uppercase truncate max-w-[200px]">{activeModule.title}</span>
                                  </div>
                                  
                                  <h4 className="text-lg font-extrabold text-gray-900 mb-2 group-hover:text-brand-teal transition-colors line-clamp-1 pr-24">
                                    {lec.title}
                                  </h4>
                                  
                                  {lec.description && (
                                    <p className="text-sm text-gray-500 line-clamp-2 font-medium mb-3">
                                      {lec.description}
                                    </p>
                                  )}
                                  
                                  <div className="mt-auto pt-4">
                                    <div className="flex justify-between items-center text-[12px] font-bold mb-1">
                                      <span className="text-gray-500">Progress</span>
                                      <span className={isCompleted ? "text-green-600" : "text-brand-teal"}>{Math.round(percent)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                                      <div className={`h-1.5 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-brand-teal'}`} style={{ width: `${percent}%` }}></div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {activeTab === 'modules' && (
            <div className="space-y-6">
              {course.modules?.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl text-center text-gray-500 border border-gray-100">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>This course doesn't have any modules yet.</p>
                </div>
              ) : (
                course.modules?.map((module, index) => (
                  <div key={module.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
                    {/* Module Header Block */}
                    <div 
                      className="p-4 flex flex-col md:flex-row gap-6 items-center bg-white transition-colors"
                    >
                      {/* Left visual block */}
                      <div className="w-full md:w-[280px] aspect-[16/9] relative overflow-hidden bg-slate-900 rounded-lg flex-shrink-0">
                        {module.image_url ? (
                          <img src={module.image_url} alt={module.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col justify-center items-center p-6 text-center">
                            <div className="absolute top-2 left-2 text-[10px] font-bold bg-brand-teal text-white px-2 py-0.5 rounded uppercase">
                              MODULE {index + 1}
                            </div>
                            <h3 className="text-brand-teal font-black text-xl mt-4 uppercase leading-tight">
                              {module.title.split(' ')[0]}
                            </h3>
                            <p className="text-white font-bold text-sm uppercase mt-1 leading-tight">
                              {module.title.split(' ').slice(1).join(' ')}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {/* Right info block */}
                      <div className="flex-1 flex flex-col justify-center w-full py-2">
                        <h2 className="text-[22px] font-bold text-gray-900 mb-1.5 leading-tight">
                          {module.title}
                        </h2>
                        
                        {module.description && (
                          <p className="text-gray-500 text-[15px] mb-6">
                            {module.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-6 mt-auto">
                          <div className="flex flex-col items-start">
                            <span className="text-[28px] font-bold text-[#1a8870] leading-none">{module.lectures?.length || 0}</span>
                            <span className="text-[13px] font-medium text-gray-500 mt-1">lectures</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
