'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/hrms/data-table'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Loader2, Save, Trash2, Tag } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { API_URL } from '@/lib/config'
import { toast } from 'sonner'

export default function BonusesPage() {
  const { data, isLoading: loadingEmployees } = useApi()
  const employees = data?.employees || []
  const [adjustments, setAdjustments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    employeeId: '',
    month: 'May',
    year: 2026,
    type: 'bonus',
    amount: 0,
    reason: '',
    status: 'active'
  })

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  useEffect(() => {
    fetchAdjustments()
  }, [])

  const fetchAdjustments = async () => {
    try {
      const response = await fetch(`${API_URL}/bonus-deductions`)
      if (response.ok) {
        setAdjustments(await response.json())
      }
    } catch (error) {
      console.error('Error fetching adjustments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.employeeId || !formData.amount) {
      toast.error('Please fill required fields')
      return
    }
    setIsSubmitting(true)
    try {
      const response = await fetch(`${API_URL}/bonus-deductions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success('Adjustment added successfully')
        fetchAdjustments()
        setModalOpen(false)
      }
    } catch (error) {
      console.error('Error saving adjustment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const columns = [
    { key: 'employeeId' as const, header: 'Employee', render: (id: string) => {
        const emp = (employees as any[])?.find(e => e.id === id)
        return emp?.name || id
    }},
    { key: 'type' as const, header: 'Type', render: (val: string) => (
        <span className={val === 'bonus' ? 'text-emerald-600 font-bold uppercase text-[10px]' : 'text-rose-600 font-bold uppercase text-[10px]'}>
            {val}
        </span>
    )},
    { key: 'amount' as const, header: 'Amount', render: (val: number) => `$${val.toLocaleString()}` },
    { key: 'month' as const, header: 'Period', render: (val: string, record: any) => `${val} ${record.year}` },
    { key: 'reason' as const, header: 'Reason' },
  ]

  return (
    <>
      <PageHeader title="Bonuses & Deductions" description="Add ad-hoc salary adjustments for specific months.">
        <Button className="bg-brand-teal hover:bg-brand-teal/90" onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Adjustment
        </Button>
      </PageHeader>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <DataTable
          data={adjustments}
          columns={columns}
          isLoading={loading}
          searchKey="reason"
          searchPlaceholder="Search by reason..."
        />
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bonus or Deduction</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Employee</Label>
              <Select value={formData.employeeId} onValueChange={(val) => setFormData({...formData, employeeId: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose employee..." />
                </SelectTrigger>
                <SelectContent>
                  {(employees as any[])?.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name} ({emp.employeeId})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Adjustment Type</Label>
                <Select value={formData.type} onValueChange={(val) => setFormData({...formData, type: val})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bonus">Bonus / Addition</SelectItem>
                    <SelectItem value="deduction">Deduction / Penalty</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" value={formData.amount} onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Month</Label>
                <Select value={formData.month} onValueChange={(val) => setFormData({...formData, month: val})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Input type="number" value={formData.year} onChange={(e) => setFormData({...formData, year: Number(e.target.value)})} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reason / Description</Label>
              <Input placeholder="e.g. Performance Bonus Q1" value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button className="bg-brand-teal hover:bg-brand-teal/90" onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Add Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
