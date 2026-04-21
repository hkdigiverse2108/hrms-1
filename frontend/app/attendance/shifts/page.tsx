'use client'

import { useState } from 'react'
import { HRMSLayout } from '@/components/hrms/hrms-layout'
import { PageHeader } from '@/components/hrms/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Clock, Pencil, Trash2, Users } from 'lucide-react'
import { DeleteConfirmDialog } from '@/components/hrms/delete-confirm-dialog'

interface Shift {
  id: string
  name: string
  startTime: string
  endTime: string
  breakDuration: string
  employeeCount: number
  color: string
}

const initialShifts: Shift[] = [
  { id: '1', name: 'Morning Shift', startTime: '06:00', endTime: '14:00', breakDuration: '30 min', employeeCount: 25, color: 'bg-blue-500' },
  { id: '2', name: 'Day Shift', startTime: '09:00', endTime: '18:00', breakDuration: '1 hr', employeeCount: 45, color: 'bg-green-500' },
  { id: '3', name: 'Evening Shift', startTime: '14:00', endTime: '22:00', breakDuration: '30 min', employeeCount: 15, color: 'bg-orange-500' },
  { id: '4', name: 'Night Shift', startTime: '22:00', endTime: '06:00', breakDuration: '1 hr', employeeCount: 8, color: 'bg-purple-500' },
]

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>(initialShifts)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingShift, setEditingShift] = useState<Shift | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [shiftToDelete, setShiftToDelete] = useState<Shift | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    startTime: '',
    endTime: '',
    breakDuration: '',
  })

  const handleOpenModal = (shift?: Shift) => {
    if (shift) {
      setEditingShift(shift)
      setFormData({
        name: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
        breakDuration: shift.breakDuration,
      })
    } else {
      setEditingShift(null)
      setFormData({ name: '', startTime: '', endTime: '', breakDuration: '' })
    }
    setModalOpen(true)
  }

  const handleSave = () => {
    if (editingShift) {
      setShifts(
        shifts.map((s) =>
          s.id === editingShift.id
            ? { ...s, ...formData }
            : s
        )
      )
    } else {
      const newShift: Shift = {
        id: String(shifts.length + 1),
        ...formData,
        employeeCount: 0,
        color: 'bg-gray-500',
      }
      setShifts([...shifts, newShift])
    }
    setModalOpen(false)
  }

  const handleDeleteClick = (shift: Shift) => {
    setShiftToDelete(shift)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (shiftToDelete) {
      setShifts(shifts.filter((s) => s.id !== shiftToDelete.id))
      setShiftToDelete(null)
    }
    setDeleteDialogOpen(false)
  }

  return (
    <HRMSLayout>
      <PageHeader title="Shift Management" description="Manage work shifts and timings.">
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Shift
        </Button>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {shifts.map((shift) => (
          <Card key={shift.id} className="group relative overflow-hidden">
            <div className={`absolute left-0 top-0 h-full w-1 ${shift.color}`} />
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{shift.name}</CardTitle>
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleOpenModal(shift)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleDeleteClick(shift)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {shift.startTime} - {shift.endTime}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">Break: {shift.breakDuration}</Badge>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {shift.employeeCount}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Shift Schedule Overview */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Weekly Shift Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-8 gap-2 text-sm">
                <div className="font-medium p-2">Shift</div>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <div key={day} className="font-medium p-2 text-center">{day}</div>
                ))}
                
                {shifts.map((shift) => (
                  <>
                    <div key={shift.id} className="p-2 flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${shift.color}`} />
                      {shift.name}
                    </div>
                    {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                      <div
                        key={`${shift.id}-${day}`}
                        className={`p-2 text-center rounded ${
                          day <= 5 ? 'bg-primary/10' : 'bg-muted'
                        }`}
                      >
                        {day <= 5 ? `${shift.employeeCount}` : '-'}
                      </div>
                    ))}
                  </>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingShift ? 'Edit Shift' : 'Add New Shift'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Shift Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="breakDuration">Break Duration</Label>
              <Input
                id="breakDuration"
                value={formData.breakDuration}
                onChange={(e) => setFormData({ ...formData, breakDuration: e.target.value })}
                placeholder="e.g., 30 min, 1 hr"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingShift ? 'Save Changes' : 'Add Shift'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Shift"
        description={`Are you sure you want to delete "${shiftToDelete?.name}"? This action cannot be undone.`}
      />
    </HRMSLayout>
  )
}
