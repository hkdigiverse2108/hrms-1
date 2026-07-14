"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { API_URL } from "@/lib/config";
import { Course } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, PlayCircle, BookOpen, FileText, ChevronDown, ChevronUp, Link as LinkIcon, Share2, Layers, ShieldCheck, Play } from "lucide-react";

type TabType = 'about' | 'lectures' | 'modules';

export default function CourseViewerPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('about');
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [selectedLectureModuleId, setSelectedLectureModuleId] = useState<string | null>(null);

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

        {/* Title & Share */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 uppercase tracking-tight">
            {course.title}
          </h1>
          <Button variant="outline" className="text-gray-700 border-gray-300 shrink-0 rounded-full px-6">
            <Share2 className="h-4 w-4 mr-2" /> Share
          </Button>
        </div>

        {/* Feature Cards Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-10">
          {/* Module List Card */}
          <div className="bg-gray-100/70 rounded-xl p-6 flex gap-4 items-start">
            <div className="bg-brand-teal/10 rounded-full p-3 shrink-0">
              <Layers className="h-6 w-6 text-brand-teal" />
            </div>
            <div className="w-full">
              <h3 className="font-semibold text-gray-900 mb-2">Modules</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-800 font-medium">
                {course.modules?.slice(0, 4).map((mod, idx) => (
                  <div key={mod.id} className="truncate" title={mod.title}>
                    {idx + 1}. {mod.title}
                  </div>
                ))}
                {course.modules && course.modules.length > 4 && (
                  <div className="text-gray-500 italic">
                    +{course.modules.length - 4} more modules
                  </div>
                )}
                {course.modules?.length === 0 && (
                  <div className="text-gray-500 italic font-normal">No modules yet.</div>
                )}
              </div>
            </div>
          </div>

          {/* Guarantee Card */}
          <div className="bg-gray-100/70 rounded-xl p-6 flex items-center gap-5">
            <div className="bg-brand-teal/10 rounded-full p-4 shrink-0">
              <ShieldCheck className="h-8 w-8 text-brand-teal" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 leading-snug">
                Complete Company Training Guarantee otherwise please refer to HR for further clarification.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <div className="flex justify-between w-full md:px-12">
            {(['ABOUT', 'LECTURES', 'MODULES'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab.toLowerCase() as TabType)}
                className={`pb-4 px-2 md:px-8 text-sm md:text-base font-bold transition-colors relative ${
                  activeTab === tab.toLowerCase() 
                    ? "text-brand-teal" 
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {tab}
                {activeTab === tab.toLowerCase() && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-teal rounded-t-md" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="w-full">
          {activeTab === 'about' && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-2xl font-bold mb-4">About this Course</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {course.description || "No description provided."}
              </p>
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

                  return activeModule.lectures.map((lec, index) => (
                    <a
                      key={lec.id}
                      href={lec.url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
                    >
                      <div className="flex flex-col sm:flex-row">
                        {/* Image / Thumbnail (Only show if image exists) */}
                        {(lec.image_url || activeModule.image_url) && (
                          <div className="w-full sm:w-[280px] aspect-[16/9] relative bg-gray-100 flex-shrink-0">
                            <img src={lec.image_url || activeModule.image_url} alt={lec.title} className="w-full h-full object-cover" />
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
                        <div className="p-5 flex-1 flex flex-col justify-center">
                          <div className="flex items-center gap-3 mb-2.5">
                            <span className="bg-gray-100 text-gray-700 text-[11px] font-bold px-2 py-0.5 rounded uppercase">English</span>
                            <span className="text-[12px] font-bold text-brand-teal uppercase truncate max-w-[200px]">{activeModule.title}</span>
                          </div>
                          
                          <h4 className="text-lg font-extrabold text-gray-900 mb-2 group-hover:text-brand-teal transition-colors line-clamp-1">
                            {lec.title}
                          </h4>
                          
                          {lec.description && (
                            <p className="text-sm text-gray-500 line-clamp-2 font-medium mb-3">
                              {lec.description}
                            </p>
                          )}
                          
                          <div className="text-[13px] font-bold text-brand-teal mt-auto">
                            Lecture {index + 1}
                          </div>
                        </div>
                      </div>
                    </a>
                  ));
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
                    {/* Module Header Block (Clickable to toggle) */}
                    <div 
                      className="p-4 flex flex-col md:flex-row gap-6 items-center bg-white cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleModule(module.id)}
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
                          <div className="w-px h-10 bg-gray-200"></div>
                          <div className="flex flex-col items-start">
                            <span className="text-[28px] font-bold text-[#1a8870] leading-none">0</span>
                            <span className="text-[13px] font-medium text-gray-500 mt-1">Tests</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Lectures List */}
                    <div 
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        expandedModules[module.id] ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="bg-gray-50 border-t border-gray-200">
                        {module.lectures?.length === 0 ? (
                          <div className="p-6 text-center text-gray-500 italic text-sm">
                            No lectures available in this section.
                          </div>
                        ) : (
                          <ul className="divide-y divide-gray-200/60">
                            {module.lectures?.map((lecture, lIndex) => (
                              <li key={lecture.id}>
                                <a 
                                  href={lecture.url || "#"} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center p-4 pl-6 hover:bg-gray-100 transition-colors group/item"
                                >
                                  <div className="flex-shrink-0 mr-4 h-10 w-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100">
                                    {getLectureIcon(lecture.type)}
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="text-[15px] font-bold text-gray-800 group-hover/item:text-brand-teal transition-colors">
                                      {lIndex + 1}. {lecture.title}
                                    </h4>
                                    {lecture.description && (
                                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                                        {lecture.description}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex-shrink-0 ml-4 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                    <Button size="sm" className="bg-brand-teal text-white rounded-full px-4">
                                      <Play className="h-3 w-3 mr-1" /> View
                                    </Button>
                                  </div>
                                </a>
                              </li>
                            ))}
                          </ul>
                        )}
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
