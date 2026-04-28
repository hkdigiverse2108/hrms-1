'use client'

import { useState } from 'react'
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
import { Plus, Briefcase, Users, Clock, CheckCircle, MoreHorizontal, Eye, Pencil, Trash2, Loader2 } from 'lucide-react'
import type { JobOpening, Department } from '@/lib/types'
import { DeleteConfirmDialog } from '@/components/hrms/delete-confirm-dialog'
import { useApi } from '@/hooks/useApi'
import { useEffect } from 'react'
import { API_URL } from '@/lib/config'

export default function RecruitmentPage() {
  const { data, isLoading: apiLoading, refresh } = useApi()
  const [jobs, setJobs] = useState<JobOpening[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (data?.jobOpenings) setJobs(data.jobOpenings)
    if (data?.departments) setDepartments(data.departments)
  }, [data?.jobOpenings, data?.departments])

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
  })

  const openJobs = jobs.filter((j) => j.status === 'open').length
  const totalApplications = jobs.reduce((sum, j) => sum + j.applications, 0)

  const handleOpenModal = (job?: JobOpening) => {
    if (job) {
      setEditingJob(job)
      setFormData({
        title: job.title,
        department: job.department,
        location: job.location,
        type: job.type,
        description: '',
      })
    } else {
      setEditingJob(null)
      setFormData({ title: '', department: '', location: '', type: 'full-time', description: '' })
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
          body: JSON.stringify({
            ...formData,
            applications: 0,
            status: 'open',
            postedDate: new Date().toISOString().split('T')[0],
          }),
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
    { key: 'postedDate' as const, header: 'Posted Date' },
    {
      key: 'status' as const,
      header: 'Status',
      render: (job: JobOpening) => <StatusBadge status={job.status} />,
    },
  ]

  const renderActions = (job: JobOpening) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>
          <Eye className="mr-2 h-4 w-4" />
          View Applications
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleOpenModal(job)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleDeleteClick(job)}
          className="text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <>
      <PageHeader title="Job Openings" description="Manage job openings and recruitment.">
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" />
          Post New Job
        </Button>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-4">
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
          title="Total Applications"
          value={totalApplications}
          icon={<Users className="h-6 w-6" />}
        />
        <StatsCard
          title="Avg. Time to Fill"
          value="21 days"
          icon={<Clock className="h-6 w-6" />}
        />
      </div>

      {(apiLoading && jobs.length === 0) ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="mt-6">
          <DataTable
            data={jobs}
            columns={columns}
            searchKey="title"
            searchPlaceholder="Search jobs..."
            actions={renderActions}
          />
        </div>
      )}

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
                  placeholder="e.g., New York, Remote"
                />
              </div>
            </div>
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
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="intern">Internship</SelectItem>
                </SelectContent>
              </Select>
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
