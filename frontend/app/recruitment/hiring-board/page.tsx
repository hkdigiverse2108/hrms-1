'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Plus, 
  MoreVertical, 
  Mail, 
  Phone, 
  FileText, 
  Calendar, 
  ChevronRight, 
  ChevronLeft,
  Loader2,
  Filter,
  Search,
  ArrowRight,
  Trash2,
  X,
  Briefcase,
  Layers,
  Link as LinkIcon,
  Clock,
  User,
  ExternalLink,
  MessageSquare,
  Upload,
  File as FileIcon
} from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { Application, JobOpening, Employee } from '@/lib/types'
import { API_URL } from '@/lib/config'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from "sonner"

const STAGES = [
  { id: 'new', title: 'New Applied', color: 'bg-blue-500' },
  { id: 'screening', title: 'Screening', color: 'bg-amber-500' },
  { id: 'interview', title: 'Interview', color: 'bg-purple-500' },
  { id: 'offered', title: 'Offered', color: 'bg-emerald-500' },
  { id: 'hired', title: 'Hired', color: 'bg-brand-teal' },
  { id: 'rejected', title: 'Rejected', color: 'bg-rose-500' },
]

export default function HiringBoardPage() {
  const { data, isLoading, refresh } = useApi()
  const [applications, setApplications] = useState<Application[]>([])
  const [jobs, setJobs] = useState<JobOpening[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  
  const [formData, setFormData] = useState({
    candidateName: '',
    status: 'new',
    appliedDate: new Date().toISOString().split('T')[0],
    jobTitle: '',
  })

  const [scheduleData, setScheduleData] = useState({
    interviewDate: '',
    interviewTime: '',
    interviewerName: '',
    interviewLink: '',
    interviewNotes: '',
  })

  useEffect(() => {
    if (data?.applications) setApplications(data.applications)
    if (data?.jobOpenings) setJobs(data.jobOpenings)
    if (data?.employees) setEmployees(data.employees)
  }, [data])

  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      const matchesSearch = app.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (app.jobTitle || '').toLowerCase().includes(searchQuery.toLowerCase())
      return matchesSearch
    })
  }, [applications, searchQuery])

  const handleMoveStage = async (appId: string, currentStatus: string, direction: 'next' | 'prev') => {
    const currentIndex = STAGES.findIndex(s => s.id === currentStatus)
    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1
    
    if (nextIndex < 0 || nextIndex >= STAGES.length) return

    const newStatus = STAGES[nextIndex].id
    
    if (newStatus === 'interview') {
      const app = applications.find(a => a.id === appId)
      if (app) {
        setSelectedApp(app)
        setScheduleData({
          interviewDate: app.interviewDate || '',
          interviewTime: app.interviewTime || '',
          interviewerName: app.interviewerName || '',
          interviewLink: app.interviewLink || '',
          interviewNotes: app.interviewNotes || '',
        })
        setIsScheduleModalOpen(true)
        return
      }
    }
    
    try {
      const res = await fetch(`${API_URL}/applications/${appId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) {
        refresh()
        toast.success(`Candidate moved to ${STAGES[nextIndex].title}`)
      }
    } catch (err) {
      console.error("Failed to move application:", err)
      toast.error("Failed to update status")
    }
  }

  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedApp) return
    setIsSubmitting(true)
    
    try {
      const res = await fetch(`${API_URL}/applications/${selectedApp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...scheduleData,
          status: 'interview'
        })
      })
      
      if (res.ok) {
        refresh()
        setIsScheduleModalOpen(false)
        toast.success("Interview scheduled successfully")
      }
    } catch (err) {
      console.error("Schedule error:", err)
      toast.error("Failed to schedule interview")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteApplication = async (appId: string) => {
    if (!confirm("Are you sure you want to delete this candidate?")) return
    
    try {
      const res = await fetch(`${API_URL}/applications/${appId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        refresh()
        toast.success("Candidate removed successfully")
      }
    } catch (err) {
      console.error("Delete error:", err)
      toast.error("Failed to delete candidate")
    }
  }

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    let resumeUrl = ''
    if (selectedFile) {
      const fileData = new FormData()
      fileData.append('file', selectedFile)
      try {
        const uploadRes = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          body: fileData
        })
        const uploadResult = await uploadRes.json()
        resumeUrl = uploadResult.url
      } catch (err) {
        console.error("Upload error:", err)
        toast.error("Failed to upload resume")
        setIsSubmitting(false)
        return
      }
    }
    
    try {
      const res = await fetch(`${API_URL}/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          email: 'not_provided@example.com', // Placeholder for removed required fields
          phone: 'N/A', // Placeholder
          resume: resumeUrl
        })
      })
      
      if (res.ok) {
        refresh()
        setIsAddModalOpen(false)
        setSelectedFile(null)
        setFormData({
          candidateName: '',
          status: 'new',
          appliedDate: new Date().toISOString().split('T')[0],
          jobTitle: '',
        })
        toast.success("Candidate added successfully")
      }
    } catch (err) {
      console.error("Add error:", err)
      toast.error("Failed to add candidate")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getFullResumeUrl = (url?: string) => {
    if (!url) return '#'
    if (url.startsWith('http')) return url
    return `${API_URL}${url}`
  }

  if (isLoading && applications.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-teal" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Hiring Board" 
        description="Visualize and manage your recruitment pipeline."
      >
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search candidates..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button 
            className="bg-brand-teal hover:bg-brand-teal/90"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" /> Add Candidate
          </Button>
        </div>
      </PageHeader>

      <div className="flex gap-4 overflow-x-auto pb-6 -mx-6 px-6 custom-scrollbar">
        {STAGES.map((stage) => {
          const stageApps = filteredApplications.filter(app => app.status === stage.id)
          
          return (
            <div key={stage.id} className="flex-shrink-0 w-80 flex flex-col gap-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", stage.color)} />
                  <h3 className="font-bold text-sm text-foreground uppercase tracking-wider">{stage.title}</h3>
                  <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-[10px] px-1.5 h-5 min-w-[20px] justify-center">
                    {stageApps.length}
                  </Badge>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={() => {
                    setFormData({...formData, status: stage.id})
                    setIsAddModalOpen(true)
                  }}
                >
                  <Plus className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>

              <div className={cn(
                "flex-1 rounded-xl p-2 space-y-3 min-h-[500px]",
                "bg-gray-50/50 border border-dashed border-gray-200"
              )}>
                {stageApps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-xs opacity-50 italic">
                    No candidates
                  </div>
                ) : (
                  stageApps.map((app) => (
                    <Card key={app.id} className="shadow-sm border-border hover:shadow-md transition-all group relative overflow-hidden">
                      <CardHeader className="p-4 pb-2 space-y-0">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 ring-2 ring-white">
                              <AvatarFallback className="bg-brand-teal/10 text-brand-teal text-xs font-bold uppercase">
                                {app.candidateName.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm truncate">{app.candidateName}</h4>
                              <p className="text-[10px] text-brand-teal font-bold uppercase tracking-tight flex items-center gap-1">
                                <Briefcase className="w-2.5 h-2.5" /> {app.jobTitle || 'General Applicant'}
                              </p>
                            </div>
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onClick={() => {
                                setSelectedApp(app)
                                setScheduleData({
                                  interviewDate: app.interviewDate || '',
                                  interviewTime: app.interviewTime || '',
                                  interviewerName: app.interviewerName || '',
                                  interviewLink: app.interviewLink || '',
                                  interviewNotes: app.interviewNotes || '',
                                })
                                setIsScheduleModalOpen(true)
                              }}>
                                <Calendar className="w-4 h-4 mr-2" /> Schedule
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => window.open(getFullResumeUrl(app.resume), '_blank')}>
                                <FileText className="w-4 h-4 mr-2" /> View Resume
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-rose-600 focus:text-rose-600"
                                onClick={() => handleDeleteApplication(app.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-2 space-y-3">
                        <div className="space-y-1.5">
                          {app.status === 'interview' && app.interviewDate && (
                            <div className="mt-2 p-2 rounded-lg bg-purple-50 border border-purple-100 space-y-1">
                              <div className="flex items-center gap-2 text-[10px] font-bold text-purple-700 uppercase tracking-tight">
                                <Calendar className="w-3 h-3" /> {app.interviewDate} @ {app.interviewTime}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-purple-600 font-medium">
                                <User className="w-3 h-3" /> Interv: {app.interviewerName || 'TBD'}
                              </div>
                              {app.interviewLink && (
                                <Button 
                                  variant="link" 
                                  className="h-auto p-0 text-[10px] text-purple-600 hover:text-purple-800"
                                  onClick={() => window.open(app.interviewLink, '_blank')}
                                >
                                  Join Meeting <ExternalLink className="w-2 h-2 ml-1" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-border/50">
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 rounded-lg hover:bg-brand-teal/5 hover:text-brand-teal"
                              onClick={() => window.open(getFullResumeUrl(app.resume), '_blank')}
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className={cn(
                                "h-7 w-7 rounded-lg hover:bg-brand-teal/5 hover:text-brand-teal",
                                app.status === 'interview' && "text-purple-600 bg-purple-50"
                              )}
                              onClick={() => {
                                setSelectedApp(app)
                                setScheduleData({
                                  interviewDate: app.interviewDate || '',
                                  interviewTime: app.interviewTime || '',
                                  interviewerName: app.interviewerName || '',
                                  interviewLink: app.interviewLink || '',
                                  interviewNotes: app.interviewNotes || '',
                                })
                                setIsScheduleModalOpen(true)
                              }}
                            >
                              <Calendar className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-1">
                            {stage.id !== STAGES[0].id && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 rounded-lg"
                                onClick={() => handleMoveStage(app.id, app.status, 'prev')}
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </Button>
                            )}
                            {stage.id !== STAGES[STAGES.length - 1].id && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 text-[10px] px-2 font-bold uppercase tracking-wider text-brand-teal border-brand-teal/20 hover:bg-brand-teal hover:text-white"
                                onClick={() => handleMoveStage(app.id, app.status, 'next')}
                              >
                                Next <ArrowRight className="w-3 h-3 ml-1" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Candidate Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-brand-teal" /> Add New Candidate
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCandidate} className="space-y-6 py-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="candidateName" className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Candidate Name</Label>
                <Input 
                  id="candidateName" 
                  placeholder="e.g. John Doe"
                  required
                  value={formData.candidateName}
                  onChange={(e) => setFormData({...formData, candidateName: e.target.value})}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobTitle" className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Job Position</Label>
                <select 
                  id="jobTitle"
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({...formData, jobTitle: e.target.value})}
                  required
                >
                  <option value="">Select Position</option>
                  {jobs.map(job => (
                    <option key={job.id} value={job.title}>{job.title}</option>
                  ))}
                  <option value="General">General Application</option>
                </select>
              </div>
            </div>

            {/* Resume File Upload */}
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Resume File (PDF/DOC)</Label>
              <div 
                className={cn(
                  "border-2 border-dashed rounded-xl p-6 transition-all cursor-pointer flex flex-col items-center justify-center gap-3",
                  selectedFile ? "border-brand-teal bg-brand-teal/5" : "border-gray-200 hover:border-brand-teal/50 hover:bg-gray-50"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
                {selectedFile ? (
                  <>
                    <div className="w-12 h-12 rounded-full bg-brand-teal/10 flex items-center justify-center">
                      <FileIcon className="w-6 h-6 text-brand-teal" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-gray-900">{selectedFile.name}</p>
                      <p className="text-[10px] text-muted-foreground">Click to change file</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <Upload className="w-6 h-6 text-gray-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">Click to upload resume</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">PDF, DOC up to 10MB</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Initial Stage</Label>
              <select 
                id="status"
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
              >
                {STAGES.map(s => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>

            <DialogFooter className="pt-4 border-t border-gray-100">
              <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
              <Button 
                type="submit" 
                className="bg-brand-teal hover:bg-brand-teal/90 text-white px-8 h-11 font-bold"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Add Candidate
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Schedule Interview Modal */}
      <Dialog open={isScheduleModalOpen} onOpenChange={setIsScheduleModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-purple-700 flex items-center gap-2">
              <Calendar className="w-5 h-5" /> Schedule Interview
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 mb-4 bg-purple-50 rounded-xl border border-purple-100 flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
              <AvatarFallback className="bg-purple-100 text-purple-700 font-bold">
                {selectedApp?.candidateName.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-bold text-gray-900">{selectedApp?.candidateName}</p>
              <p className="text-[10px] text-purple-600 font-bold uppercase tracking-wider">{selectedApp?.jobTitle}</p>
            </div>
          </div>
          <form onSubmit={handleScheduleInterview} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Interview Date</Label>
                <Input 
                  type="date" 
                  required
                  value={scheduleData.interviewDate}
                  onChange={(e) => setScheduleData({...scheduleData, interviewDate: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Interview Time</Label>
                <Input 
                  type="time" 
                  required
                  value={scheduleData.interviewTime}
                  onChange={(e) => setScheduleData({...scheduleData, interviewTime: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Assigned Interviewer (Team Leader)</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={scheduleData.interviewerName}
                onChange={(e) => setScheduleData({...scheduleData, interviewerName: e.target.value})}
                required
              >
                <option value="">Select Team Leader</option>
                {employees.filter(emp => emp.role === 'Team Leader' || emp.role === 'Manager' || emp.role === 'Admin').map(emp => (
                  <option key={emp.id} value={emp.name}>{emp.name} ({emp.designation})</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Meeting Link (Zoom/Google Meet)</Label>
              <div className="relative">
                <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input 
                  placeholder="https://meet.google.com/..."
                  className="pl-9"
                  value={scheduleData.interviewLink}
                  onChange={(e) => setScheduleData({...scheduleData, interviewLink: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Internal Notes for TL</Label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 w-3.5 h-3.5 text-muted-foreground" />
                <Textarea 
                  placeholder="Focus on React performance and state management skills..."
                  className="pl-9 min-h-[80px]"
                  value={scheduleData.interviewNotes}
                  onChange={(e) => setScheduleData({...scheduleData, interviewNotes: e.target.value})}
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsScheduleModalOpen(false)}>Cancel</Button>
              <Button 
                type="submit" 
                className="bg-purple-600 hover:bg-purple-700 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calendar className="w-4 h-4 mr-2" />}
                Confirm & Schedule
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
