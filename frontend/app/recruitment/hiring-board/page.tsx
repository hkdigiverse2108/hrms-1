'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { 
  Plus, 
  MoreVertical, 
  FileText, 
  Calendar, 
  Loader2,
  Search,
  ArrowRight,
  Briefcase,
  Trash2,
  ExternalLink,
  Clock,
  Edit2,
  Upload,
  User,
  MessageSquare,
  Grab,
  X
} from 'lucide-react'
import { API_URL } from '@/lib/config'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'

interface Application {
  id: string
  candidateName: string
  email: string
  phone: string
  status: string
  appliedDate: string
  jobTitle: string
  resume?: string
  interviewDate?: string
  interviewTime?: string
  interviewerName?: string
  interviewNotes?: string
  interviewLink?: string
}

interface JobOpening {
  id: string
  title: string
}

interface Employee {
  id: string
  name: string
  role: string
  department: string
}

const STAGES = [
  { id: 'new', title: 'New Applied', color: 'bg-blue-500', lightColor: 'bg-blue-50', textColor: 'text-blue-700' },
  { id: 'interview', title: 'Interview', color: 'bg-purple-500', lightColor: 'bg-purple-50', textColor: 'text-purple-700' },
  { id: 'selected', title: 'Selected', color: 'bg-emerald-500', lightColor: 'bg-emerald-50', textColor: 'text-emerald-700' },
  { id: 'rejected', title: 'Rejected', color: 'bg-rose-500', lightColor: 'bg-rose-50', textColor: 'text-rose-700' }
]

export default function HiringBoardPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [jobs, setJobs] = useState<JobOpening[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingAppId, setEditingAppId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    candidateName: '',
    status: 'new',
    appliedDate: new Date().toISOString().split('T')[0],
    jobTitle: '',
    interviewDate: '',
    interviewTime: '',
    interviewerName: '',
    interviewNotes: '',
    interviewLink: '',
    resume: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [appRes, jobRes, empRes] = await Promise.all([
        fetch(`${API_URL}/applications`),
        fetch(`${API_URL}/job-openings`),
        fetch(`${API_URL}/employees`)
      ])
      
      if (appRes.ok) setApplications(await appRes.json())
      if (jobRes.ok) setJobs(await jobRes.json())
      if (empRes.ok) setEmployees(await empRes.json())
    } catch (err) {
      console.error("Fetch error:", err)
      toast.error("Failed to load data")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditClick = (app: Application) => {
    setEditingAppId(app.id)
    setFormData({
      candidateName: app.candidateName || '',
      status: app.status || 'new',
      appliedDate: app.appliedDate || new Date().toISOString().split('T')[0],
      jobTitle: app.jobTitle || '',
      interviewDate: app.interviewDate || '',
      interviewTime: app.interviewTime || '',
      interviewerName: app.interviewerName || '',
      interviewNotes: app.interviewNotes || '',
      interviewLink: app.interviewLink || '',
      resume: app.resume || '',
    })
    setIsAddModalOpen(true)
  }

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result

    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const newStatus = destination.droppableId
    
    // Optimistic Update
    const updatedApps = applications.map(app => 
      app.id === draggableId ? { ...app, status: newStatus } : app
    )
    setApplications(updatedApps)

    try {
      const res = await fetch(`${API_URL}/applications/${draggableId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (!res.ok) throw new Error("Failed to update status")
      toast.success(`Candidate moved to ${STAGES.find(s => s.id === newStatus)?.title}`)
    } catch (err) {
      console.error("Drag update error:", err)
      toast.error("Failed to update status")
      fetchData() // Rollback
    }
  }

  const handleDeleteApplication = async (appId: string) => {
    if (!confirm("Are you sure you want to delete this candidate?")) return
    try {
      const res = await fetch(`${API_URL}/applications/${appId}`, { method: 'DELETE' })
      if (res.ok) {
        setApplications(apps => apps.filter(a => a.id !== appId))
        toast.success("Candidate deleted")
      }
    } catch (err) {
      toast.error("Delete failed")
    }
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    let resumeUrl = formData.resume

    if (selectedFile) {
      const fileData = new FormData()
      fileData.append('file', selectedFile)
      try {
        const uploadRes = await fetch(`${API_URL}/upload`, { method: 'POST', body: fileData })
        const uploadResult = await uploadRes.json()
        resumeUrl = uploadResult.url
      } catch (err) {
        toast.error("Resume upload failed")
        setIsSubmitting(false)
        return
      }
    }
    
    try {
      const url = editingAppId ? `${API_URL}/applications/${editingAppId}` : `${API_URL}/applications`
      const method = editingAppId ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          email: 'not_provided@example.com',
          phone: 'N/A',
          resume: resumeUrl
        })
      })
      
      if (res.ok) {
        fetchData()
        setIsAddModalOpen(false)
        setEditingAppId(null)
        setSelectedFile(null)
        setFormData({
          candidateName: '',
          status: 'new',
          appliedDate: new Date().toISOString().split('T')[0],
          jobTitle: '',
          interviewDate: '',
          interviewTime: '',
          interviewerName: '',
          interviewNotes: '',
          interviewLink: '',
          resume: '',
        })
        toast.success(editingAppId ? "Candidate updated successfully" : "Candidate added successfully")
      }
    } catch (err) {
      toast.error(editingAppId ? "Update failed" : "Add failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredApplications = useMemo(() => {
    return applications.filter(app => 
      app.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.jobTitle.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [applications, searchQuery])

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
        title="Interviews" 
        description="Drag and drop candidates to manage your recruitment pipeline."
      >
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search candidates..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 ring-offset-brand-teal/20"
            />
          </div>
          <Button 
            className="bg-brand-teal hover:bg-brand-teal/90 shadow-md shadow-brand-teal/10"
            onClick={() => {
              setEditingAppId(null)
              setIsAddModalOpen(true)
            }}
          >
            <Plus className="w-4 h-4 mr-2" /> Add Candidate
          </Button>
        </div>
      </PageHeader>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-6 -mx-6 px-6 custom-scrollbar min-h-[calc(100vh-250px)]">
          {STAGES.map((stage) => {
            const stageApps = filteredApplications.filter(app => app.status === stage.id)
            
            return (
              <div key={stage.id} className="flex-shrink-0 w-80 flex flex-col gap-4">
                <div className="flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-3 h-3 rounded-full", stage.color)} />
                    <h3 className="font-bold text-sm text-slate-700 uppercase tracking-wider">{stage.title}</h3>
                    <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-bold border-none h-5 px-1.5 min-w-[20px] flex justify-center">
                      {stageApps.length}
                    </Badge>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-slate-400 hover:text-brand-teal hover:bg-brand-teal/5"
                    onClick={() => {
                      setEditingAppId(null)
                      setFormData(prev => ({ ...prev, status: stage.id }))
                      setIsAddModalOpen(true)
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={cn(
                        "flex-1 rounded-2xl p-2.5 space-y-4 transition-colors",
                        snapshot.isDraggingOver ? "bg-brand-teal/5 ring-2 ring-brand-teal/20" : "bg-slate-50/50 border-2 border-dashed border-slate-200"
                      )}
                    >
                      {stageApps.map((app, index) => (
                        <Draggable key={app.id} draggableId={app.id} index={index}>
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cn(
                                "shadow-sm border-slate-200 hover:shadow-md transition-all group relative overflow-hidden bg-white cursor-grab active:cursor-grabbing",
                                snapshot.isDragging && "shadow-xl ring-2 ring-brand-teal border-brand-teal/50 scale-105"
                              )}
                            >
                              {/* Selection Indicator */}
                              <div className={cn("absolute top-0 left-0 w-1 h-full transition-all", stage.color)} />
                              
                              <CardHeader className="p-3 pb-1 space-y-0 relative">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Avatar className="h-8 w-8 ring-1 ring-slate-100 shrink-0">
                                      <AvatarFallback className="bg-brand-teal/5 text-brand-teal text-[10px] font-bold">
                                        {app.candidateName.split(' ').map(n => n[0]).join('')}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                      <h4 className="font-bold text-xs text-slate-800 truncate leading-tight group-hover:text-brand-teal transition-colors">
                                        {app.candidateName}
                                      </h4>
                                      <p className="text-[9px] text-brand-teal/80 font-bold uppercase truncate">{app.jobTitle || 'General'}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-1">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                          <MoreVertical className="w-3.5 h-3.5" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-36">
                                        <DropdownMenuItem className="text-xs py-1.5" onClick={() => handleEditClick(app)}>
                                          <Edit2 className="w-3.5 h-3.5 mr-2 text-brand-teal" /> Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-xs py-1.5" onClick={() => window.open(getFullResumeUrl(app.resume), '_blank')}>
                                          <FileText className="w-3.5 h-3.5 mr-2 text-slate-500" /> Resume
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                          className="text-xs py-1.5 text-rose-600 focus:text-rose-600"
                                          onClick={() => handleDeleteApplication(app.id)}
                                        >
                                          <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                              </CardHeader>

                              <CardContent className="p-3 pt-1 space-y-2">
                                <div className="space-y-1.5">
                                  {app.interviewDate && (
                                    <div className="px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-100/50 space-y-1">
                                      <div className="flex items-center justify-between text-[9px] font-bold text-brand-teal uppercase tracking-tighter">
                                        <span>Interview</span>
                                        <div className="w-1 h-1 rounded-full bg-brand-teal animate-pulse" />
                                      </div>
                                      <div className="flex flex-col gap-0.5">
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-700">
                                          <Calendar className="w-3 h-3 text-brand-teal/70" /> {app.interviewDate} @ {app.interviewTime}
                                        </div>
                                        {app.interviewerName && (
                                          <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-medium truncate">
                                            <User className="w-3 h-3 text-brand-teal/70" /> {app.interviewerName}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {app.interviewNotes && (
                                    <div className="flex gap-1.5 p-1.5 rounded bg-brand-teal/[0.02] border border-brand-teal/[0.05]">
                                      <MessageSquare className="w-3 h-3 text-brand-teal/30 shrink-0 mt-0.5" />
                                      <p className="text-[9px] text-slate-500 leading-tight line-clamp-1 italic">
                                        "{app.interviewNotes}"
                                      </p>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-slate-100/50">
                                  <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-bold uppercase">
                                    <Clock className="w-3 h-3" /> {new Date(app.appliedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6 rounded hover:bg-brand-teal/10 hover:text-brand-teal text-slate-400"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        window.open(getFullResumeUrl(app.resume), '_blank')
                                      }}
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                    </Button>
                                    {app.interviewLink && (
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6 rounded hover:bg-brand-teal/10 hover:text-brand-teal text-brand-teal"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          window.open(app.interviewLink, '_blank')
                                        }}
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {stageApps.length === 0 && !snapshot.isDraggingOver && (
                        <div className="flex flex-col items-center justify-center h-24 text-slate-400 text-[10px] font-bold uppercase tracking-widest opacity-40">
                          Empty
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            )
          })}
        </div>
      </DragDropContext>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              {editingAppId ? <Edit2 className="w-5 h-5 text-brand-teal" /> : <Plus className="w-5 h-5 text-brand-teal" />}
              {editingAppId ? "Edit Candidate Info" : "Add New Candidate"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-6 py-2 overflow-y-auto max-h-[80vh] px-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status" className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Initial Stage</Label>
                <select 
                  id="status"
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                >
                  {STAGES.map(s => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Resume File</Label>
                <div 
                  className={cn(
                    "border-2 border-dashed rounded-xl h-11 px-3 transition-all cursor-pointer flex items-center justify-between gap-2",
                    selectedFile ? "border-brand-teal bg-brand-teal/5" : "border-gray-200 hover:border-brand-teal/50 hover:bg-gray-50"
                  )}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                  <span className="text-xs truncate">
                    {selectedFile ? selectedFile.name : (formData.resume ? formData.resume.split('/').pop() : "Upload Resume")}
                  </span>
                  {selectedFile || formData.resume ? (
                    <X 
                      className="w-4 h-4 text-rose-500 hover:text-rose-700 cursor-pointer" 
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedFile(null)
                        setFormData({...formData, resume: ''})
                      }}
                    />
                  ) : (
                    <Upload className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-brand-teal mb-4 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" /> Interview Details (Optional)
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Interview Date</Label>
                  <Input 
                    type="date" 
                    value={formData.interviewDate}
                    onChange={(e) => setFormData({...formData, interviewDate: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Interview Time</Label>
                  <Input 
                    type="time" 
                    value={formData.interviewTime}
                    onChange={(e) => setFormData({...formData, interviewTime: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Interviewer</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.interviewerName}
                    onChange={(e) => setFormData({...formData, interviewerName: e.target.value})}
                  >
                    <option value="">Select Interviewer</option>
                    {employees.filter(emp => emp.role === 'Team Leader' || emp.role === 'Manager' || emp.role === 'Admin').map(emp => (
                      <option key={emp.id} value={emp.name || emp.id}>{emp.name || emp.id}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interviewNotes" className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Internal Notes</Label>
                  <Textarea 
                    placeholder="Notes for the interviewer..."
                    className="min-h-[80px]"
                    value={formData.interviewNotes}
                    onChange={(e) => setFormData({...formData, interviewNotes: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-gray-100">
              <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
              <Button 
                type="submit" 
                className="bg-brand-teal hover:bg-brand-teal/90 text-white px-8 h-11 font-bold"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : (editingAppId ? <Edit2 className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />)}
                {editingAppId ? "Update Candidate" : "Add Candidate"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
