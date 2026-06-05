'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/hrms/data-table'
import { StatusBadge } from '@/components/hrms/status-badge'
import { StatsCard } from '@/components/hrms/stats-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, Briefcase, Users, Clock, CheckCircle, MoreHorizontal, Eye, Pencil, Trash2, Loader2, Upload, FileText } from 'lucide-react'
import type { JobOpening, Department } from '@/lib/types'
import { DeleteConfirmDialog } from '@/components/hrms/delete-confirm-dialog'
import { useApi } from '@/hooks/useApi'
import { API_URL } from '@/lib/config'
import { usePermissions } from '@/hooks/usePermissions'
import { useUser } from '@/hooks/useUser'
import { toast } from "sonner";
import { useConfirm } from "@/context/ConfirmContext";

export default function RecruitmentPage() {
  const { confirm } = useConfirm();
  const router = useRouter()
  const { user } = useUser()
  const { data, isLoading: apiLoading, refresh } = useApi()
  const { checkPermission, isAdmin, loading: permissionsLoading } = usePermissions()
  const [jobs, setJobs] = useState<JobOpening[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Referrals states
  const [referrals, setReferrals] = useState<any[]>([])
  const [referralsLoading, setReferralsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'jobs' | 'referrals'>('jobs')
  
  // File upload state
  const [uploadingResume, setUploadingResume] = useState(false)

  const [referralModalOpen, setReferralModalOpen] = useState(false)
  const [referralFormData, setReferralFormData] = useState({
    candidateName: '',
    phone: '',
    jobTitle: 'General / Other',
    resumeUrl: ''
  })
  
  const [statusUpdateOpen, setStatusUpdateOpen] = useState(false)
  const [statusFormData, setStatusFormData] = useState({
    id: '',
    status: 'Pending',
    notes: ''
  })

  useEffect(() => {
    if (!permissionsLoading) {
      if (!user) {
        router.push('/')
      }
    }
  }, [permissionsLoading, user, router])

  useEffect(() => {
    if (data?.jobOpenings) setJobs(data.jobOpenings)
    if (data?.departments) setDepartments(data.departments)
  }, [data?.jobOpenings, data?.departments])

  const fetchReferrals = async () => {
    if (!user) return
    setReferralsLoading(true)
    try {
      const isHRorAdmin = isAdmin || user?.role?.toLowerCase() === 'hr' || checkPermission('hirings', 'canEdit')
      const url = isHRorAdmin
        ? `${API_URL}/referrals`
        : `${API_URL}/referrals?employee_id=${user.id || user._id}`
      const response = await fetch(url)
      if (response.ok) {
        setReferrals(await response.json())
      }
    } catch (error) {
      console.error('Error fetching referrals:', error)
    } finally {
      setReferralsLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchReferrals()
    }
  }, [user])

  const [modalOpen, setModalOpen] = useState(false)
  const [editingJob, setEditingJob] = useState<JobOpening | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [jobToDelete, setJobToDelete] = useState<JobOpening | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    location: '',
    type: 'full-time' as const,
    description: '',
    applications: 0,
    status: 'open',
    postedDate: '',
    experience: '',
    salaryRange: '',
  })

  const isHRorAdmin = isAdmin || user?.role?.toLowerCase() === 'hr' || checkPermission('hirings', 'canEdit')
  const displayedJobs = isHRorAdmin ? jobs : jobs.filter((j) => j.status === 'open')
  const openJobs = displayedJobs.filter((j) => j.status === 'open').length
  const totalApplications = displayedJobs.reduce((sum, j) => sum + j.applications, 0)

  const handleOpenModal = (job?: JobOpening) => {
    if (job) {
      setEditingJob(job)
      setFormData({
        title: job.title,
        department: job.department,
        location: job.location,
        type: job.type as any,
        description: '',
        applications: job.applications,
        status: job.status,
        postedDate: job.postedDate,
        experience: job.experience || '',
        salaryRange: job.salaryRange || '',
      })
    } else {
      setEditingJob(null)
      setFormData({ 
        title: '', 
        department: '', 
        location: '', 
        type: 'full-time', 
        description: '',
        applications: 0,
        status: 'open',
        postedDate: new Date().toISOString().split('T')[0],
        experience: '',
        salaryRange: '',
      })
    }
    setModalOpen(true)
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      if (editingJob) {
        const response = await fetch(`${API_URL}/job-openings/${editingJob.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (response.ok) refresh()
      } else {
        const response = await fetch(`${API_URL}/job-openings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (response.ok) refresh()
      }
      setModalOpen(false)
    } catch (error) {
      console.error('Error saving job:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteClick = (job: JobOpening) => {
    setJobToDelete(job)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (jobToDelete) {
      try {
        const response = await fetch(`${API_URL}/job-openings/${jobToDelete.id}`, {
          method: 'DELETE',
        })
        if (response.ok) {
          setJobs(jobs.filter((j) => j.id !== jobToDelete.id))
        }
      } catch (error) {
        console.error('Error deleting job:', error)
      }
    }
    setDeleteDialogOpen(false)
  }

  // Resume Upload Handler
  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingResume(true)
    const uploadData = new FormData()
    uploadData.append('file', file)

    const backendUrl = typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.hostname}:8000`
      : 'http://127.0.0.1:8000'

    try {
      // Direct upload bypasses Next.js proxy upload limits and EPIPE/Turbopack proxy issues
      let response = await fetch(`${backendUrl}/chat/upload`, {
        method: 'POST',
        body: uploadData,
      }).catch(() => null)

      if (!response || !response.ok) {
        // Fallback to proxy
        response = await fetch(`${API_URL}/chat/upload`, {
          method: 'POST',
          body: uploadData,
        })
      }

      if (response.ok) {
        const result = await response.json()
        setReferralFormData({ ...referralFormData, resumeUrl: result.url })
      } else {
        const details = await response.text().catch(() => 'Could not read details')
        toast.error(`File upload failed. Status: ${response.status} (${response.statusText}). Details: ${details}`)
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(`Error uploading file: ${error.message || error}`)
    } finally {
      setUploadingResume(false)
    }
  }

  // Referral Modal actions
  const handleOpenReferralModal = (jobTitle?: string) => {
    const openJobsList = jobs.filter(j => j.status === 'open')
    setReferralFormData({
      candidateName: '',
      phone: '',
      jobTitle: jobTitle || (openJobsList.length > 0 ? openJobsList[0].title : ''),
      resumeUrl: ''
    })
    setReferralModalOpen(true)
  }

  const handleSaveReferral = async () => {
    if (!referralFormData.candidateName || !referralFormData.phone) {
      toast.error('Please fill in both candidate name and mobile number')
      return
    }

    if (!referralFormData.resumeUrl) {
      toast.error('Please upload a resume first')
      return
    }

    setIsLoading(true)
    const payload = {
      candidateName: referralFormData.candidateName,
      phone: referralFormData.phone,
      jobTitle: referralFormData.jobTitle,
      resumeUrl: referralFormData.resumeUrl,
      referredById: user?.id || user?._id || 'unknown',
      referredByName: user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Employee',
      status: 'Pending',
      relationship: 'Friend',
      email: '',
      notes: '',
      submissionDate: new Date().toISOString().split('T')[0]
    }

    try {
      const response = await fetch(`${API_URL}/referrals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (response.ok) {
        fetchReferrals()
        setReferralModalOpen(false)
      }
    } catch (error) {
      console.error('Error saving referral:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenStatusModal = (referral: any) => {
    setStatusFormData({
      id: referral.id,
      status: referral.status,
      notes: referral.notes || ''
    })
    setStatusUpdateOpen(true)
  }

  const handleSaveStatusUpdate = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_URL}/referrals/${statusFormData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: statusFormData.status,
          notes: statusFormData.notes
        }),
      })
      if (response.ok) {
        fetchReferrals()
        setStatusUpdateOpen(false)
      }
    } catch (error) {
      console.error('Error updating status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteReferral = async (id: string) => {
    const isConfirmed = await confirm({
      title: "Confirm Action",
      message: 'Are you sure you want to delete this referral reference?',
      destructive: true,
      confirmText: "Confirm"
    });
    if (!isConfirmed) return
    try {
      const response = await fetch(`${API_URL}/referrals/${id}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        fetchReferrals()
      }
    } catch (error) {
      console.error('Error deleting referral:', error)
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'full-time':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'part-time':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'contract':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'intern':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const columns = [
    { key: 'title' as const, header: 'Job Title' },
    { key: 'department' as const, header: 'Department' },
    { key: 'location' as const, header: 'Location' },
    {
      key: 'type' as const,
      header: 'Type',
      render: (job: JobOpening) => (
        <Badge variant="outline" className={`capitalize ${getTypeColor(job.type)}`}>
          {job.type.replace('-', ' ')}
        </Badge>
      ),
    },
    {
      key: 'applications' as const,
      header: 'Applications',
      render: (job: JobOpening) => (
        <span className="font-medium">{job.applications}</span>
      ),
    },
    {
      key: 'experience' as const,
      header: 'Experience',
      render: (job: JobOpening) => (
        <span>{job.experience || 'Not specified'}</span>
      ),
    },
    {
      key: 'salaryRange' as const,
      header: 'Salary Range',
      render: (job: JobOpening) => (
        <span>{job.salaryRange || 'Not specified'}</span>
      ),
    },
    { key: 'postedDate' as const, header: 'Posted Date' },
    {
      key: 'status' as const,
      header: 'Status',
      render: (job: JobOpening) => <StatusBadge status={job.status} />,
    },
  ]

  const renderActions = (job: JobOpening) => {
    const showEdit = isAdmin || checkPermission('hirings', 'canEdit')
    const showDelete = isAdmin || checkPermission('hirings', 'canDelete')

    return (
      <div className="flex items-center justify-end gap-2">
        {showEdit && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleOpenModal(job)}
            title="Edit Job"
            className="h-8 w-8 text-slate-500 hover:text-brand-teal hover:bg-slate-100 rounded-lg"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
        {showDelete && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDeleteClick(job)}
            title="Delete Job"
            className="h-8 w-8 text-slate-500 hover:text-destructive hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    )
  }

  const referralColumns = [
    { key: 'candidateName' as const, header: 'Candidate Name' },
    { key: 'phone' as const, header: 'Mobile Number' },
    {
      key: 'resumeUrl' as const,
      header: 'Resume',
      render: (ref: any) => ref.resumeUrl ? (
        <a href={`${API_URL}${ref.resumeUrl}`} target="_blank" rel="noreferrer" className="text-blue-600 underline font-medium hover:text-blue-800 flex items-center gap-1">
          <FileText className="w-3.5 h-3.5" /> View Resume
        </a>
      ) : (
        <span className="text-gray-400">No Resume</span>
      )
    },
    { key: 'jobTitle' as const, header: 'Referred Position' },
    { key: 'referredByName' as const, header: 'Referred By' },
    { key: 'submissionDate' as const, header: 'Submission Date' },
    {
      key: 'status' as const,
      header: 'Status',
      render: (ref: any) => (
        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
          ref.status === 'Hired' ? 'bg-green-100 text-green-700' :
          ref.status === 'Contacted' ? 'bg-blue-100 text-blue-700' :
          ref.status === 'Interviewing' ? 'bg-purple-100 text-purple-700' :
          ref.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
        }`}>
          {ref.status}
        </span>
      )
    },
    { key: 'notes' as const, header: 'HR Remarks / Notes' }
  ]

  const renderReferralActions = (ref: any) => {
    const showEditStatus = isAdmin || checkPermission('hirings', 'canEdit')
    const showDelete = isAdmin || checkPermission('hirings', 'canDelete') || (user && (user.id === ref.referredById || user._id === ref.referredById))

    return (
      <div className="flex items-center justify-end gap-2">
        {showEditStatus && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleOpenStatusModal(ref)}
            title="Update Status / Notes"
            className="h-8 w-8 text-slate-500 hover:text-brand-teal hover:bg-slate-100 rounded-lg"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
        {showDelete && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDeleteReferral(ref.id)}
            title="Delete Reference"
            className="h-8 w-8 text-slate-500 hover:text-destructive hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    )
  }

  const hasJobActions = isAdmin || checkPermission('hirings', 'canEdit') || checkPermission('hirings', 'canDelete')
  const hasReferralActions = isAdmin || checkPermission('hirings', 'canEdit') || checkPermission('hirings', 'canDelete') || referrals.some(r => user && (r.referredById === user.id || r.referredById === user._id))

  if (permissionsLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
      <PageHeader title="Hirings" description="Manage job openings and candidate references.">
        <div className="flex gap-3">
          <Button onClick={() => handleOpenReferralModal()} variant="outline" className="border-brand-teal text-brand-teal hover:bg-brand-teal hover:text-white">
            <Plus className="mr-2 h-4 w-4" />
            Refer a Friend
          </Button>
          {(isAdmin || checkPermission('hirings', 'canAdd')) && (
            <Button onClick={() => handleOpenModal()}>
              <Plus className="mr-2 h-4 w-4" />
              Post New Hiring
            </Button>
          )}
        </div>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-3">
        <StatsCard
          title="Total Openings"
          value={jobs.length}
          icon={<Briefcase className="h-6 w-6" />}
        />
        <StatsCard
          title="Active Jobs"
          value={openJobs}
          icon={<CheckCircle className="h-6 w-6" />}
        />
        <StatsCard
          title="Submitted Referrals"
          value={referrals.length}
          icon={<Users className="h-6 w-6" />}
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mt-8 mb-4">
        <button
          onClick={() => setActiveTab('jobs')}
          className={`py-2 px-4 font-semibold text-sm border-b-2 transition-all ${
            activeTab === 'jobs' ? 'border-brand-teal text-brand-teal' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Job Openings
        </button>
        <button
          onClick={() => setActiveTab('referrals')}
          className={`py-2 px-4 font-semibold text-sm border-b-2 transition-all ${
            activeTab === 'referrals' ? 'border-brand-teal text-brand-teal' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Employee Referrals ({referrals.length})
        </button>
      </div>

      {activeTab === 'jobs' ? (
        (apiLoading && jobs.length === 0) ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="mt-2">
            <DataTable
              data={displayedJobs}
              columns={columns}
              searchKey="title"
              searchPlaceholder="Search jobs..."
              actions={hasJobActions ? renderActions : undefined}
            />
          </div>
        )
      ) : (
        referralsLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="mt-2">
            <DataTable
              data={referrals}
              columns={referralColumns}
              searchKey="candidateName"
              searchPlaceholder="Search candidate..."
              actions={hasReferralActions ? renderReferralActions : undefined}
            />
          </div>
        )
      )}

      {/* Edit/Post Job Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingJob ? 'Edit Job Opening' : 'Post New Job'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Job Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Senior React Developer"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={formData.department}
                  onValueChange={(value) => setFormData({ ...formData, department: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Surat, Remote"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Employment Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'full-time' | 'part-time' | 'contract' | 'intern') =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">Full Time</SelectItem>
                    <SelectItem value="part-time">Part Time</SelectItem>
                    <SelectItem value="intern">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Applications Count</Label>
                <Input
                  type="number"
                  value={formData.applications}
                  onChange={(e) => setFormData({ ...formData, applications: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Posted Date</Label>
                <Input
                  type="date"
                  value={formData.postedDate}
                  onChange={(e) => setFormData({ ...formData, postedDate: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Experience</Label>
                <Input
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  placeholder="e.g., 2-4 years"
                />
              </div>
              <div className="space-y-2">
                <Label>Salary Range</Label>
                <Input
                  value={formData.salaryRange}
                  onChange={(e) => setFormData({ ...formData, salaryRange: e.target.value })}
                  placeholder="e.g., $80k - $100k or 15L - 20L"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Job Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter job description..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? (editingJob ? 'Saving...' : 'Posting...') : (editingJob ? 'Save Changes' : 'Post Job')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Refer a Friend Dialog (Simplified: Name, Mobile Number, Upload Resume, Referred Position) */}
      <Dialog open={referralModalOpen} onOpenChange={setReferralModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Refer a Candidate / Add Reference</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Candidate Name</Label>
              <Input
                value={referralFormData.candidateName}
                onChange={(e) => setReferralFormData({ ...referralFormData, candidateName: e.target.value })}
                placeholder="Full Name"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Mobile Number</Label>
              <Input
                value={referralFormData.phone}
                onChange={(e) => setReferralFormData({ ...referralFormData, phone: e.target.value })}
                placeholder="Mobile / Phone Number"
              />
            </div>

            <div className="space-y-2">
              <Label>Referred Position</Label>
              <Select
                value={referralFormData.jobTitle}
                onValueChange={(val) => setReferralFormData({ ...referralFormData, jobTitle: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select referred position" />
                </SelectTrigger>
                <SelectContent>
                  {jobs.filter(j => j.status === 'open').map(j => (
                    <SelectItem key={j.id} value={j.title}>{j.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Upload Resume</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="resume-file-input"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleResumeUpload}
                  className="hidden"
                  disabled={uploadingResume}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('resume-file-input')?.click()}
                  disabled={uploadingResume}
                  className="w-full flex items-center justify-center gap-2"
                >
                  {uploadingResume ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Choose Resume file
                    </>
                  )}
                </Button>
              </div>
              {referralFormData.resumeUrl && (
                <p className="text-xs text-emerald-600 mt-1 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Resume uploaded successfully
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setReferralModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveReferral} disabled={isLoading || uploadingResume} className="bg-brand-teal hover:bg-brand-teal-light text-white font-bold">
                Submit Referral
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* HR/Admin Status Update Dialog */}
      <Dialog open={statusUpdateOpen} onOpenChange={setStatusUpdateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Referral Status & Notes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Referral Status</Label>
              <Select
                value={statusFormData.status}
                onValueChange={(val) => setStatusFormData({ ...statusFormData, status: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Contacted">Contacted</SelectItem>
                  <SelectItem value="Interviewing">Interviewing</SelectItem>
                  <SelectItem value="Hired">Hired</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>HR Notes / Contact Status Remarks</Label>
              <Textarea
                value={statusFormData.notes}
                onChange={(e) => setStatusFormData({ ...statusFormData, notes: e.target.value })}
                placeholder="Add contact details, interview schedule, or general remarks..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setStatusUpdateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveStatusUpdate} disabled={isLoading} className="bg-brand-teal hover:bg-brand-teal-light text-white font-bold">
                Save Status
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Job Opening"
        description={`Are you sure you want to delete "${jobToDelete?.title}"? This action cannot be undone.`}
      />
    </>
  )
}
