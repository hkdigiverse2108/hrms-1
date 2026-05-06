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
import { Plus, Edit2, Loader2, Save } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { API_URL } from '@/lib/config'
import { toast } from 'sonner'

export default function SalaryStructurePage() {
  const { data, isLoading: loadingEmployees } = useApi()
  const employees = data?.employees || []
  const [structures, setStructures] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    basic: 0,
    hra: 0,
    conveyance: 0,
    medical: 0,
    specialAllowance: 0,
    pf: 0,
    esi: 0,
    professionalTax: 0,
    tds: 0,
    monthlyGross: 0,
  })

  useEffect(() => {
    fetchStructures()
  }, [])

  const fetchStructures = async () => {
    try {
      const response = await fetch(`${API_URL}/salary-structures`)
      if (response.ok) {
        setStructures(await response.json())
      }
    } catch (error) {
      console.error('Error fetching structures:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = async (employee: any) => {
    setSelectedEmployee(employee)
    setFormData({
      basic: 0,
      hra: 0,
      conveyance: 0,
      medical: 0,
      specialAllowance: 0,
      pf: 0,
      esi: 0,
      professionalTax: 0,
      tds: 0,
      monthlyGross: 0,
    })

    // Try to find existing structure
    const existing = structures.find((s) => s.employeeId === employee.id)
    if (existing) {
      setFormData({
        basic: existing.basic,
        hra: existing.hra,
        conveyance: existing.conveyance,
        medical: existing.medical,
        specialAllowance: existing.specialAllowance,
        pf: existing.pf,
        esi: existing.esi,
        professionalTax: existing.professionalTax,
        tds: existing.tds,
        monthlyGross: existing.monthlyGross,
      })
    }
    setModalOpen(true)
  }

  const handleSave = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`${API_URL}/salary-structures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          employeeId: selectedEmployee.id,
        }),
      })

      if (response.ok) {
        toast.success('Salary structure saved')
        fetchStructures()
        setModalOpen(false)
      } else {
        toast.error('Failed to save salary structure')
      }
    } catch (error) {
      console.error('Error saving structure:', error)
      toast.error('Error saving salary structure')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCalculateGross = () => {
    const gross = 
      Number(formData.basic) + 
      Number(formData.hra) + 
      Number(formData.conveyance) + 
      Number(formData.medical) + 
      Number(formData.specialAllowance)
    setFormData({ ...formData, monthlyGross: gross })
  }

  const columns = [
    { key: 'employeeId' as const, header: 'Employee ID', render: (record: any) => {
        const emp = (employees as any[])?.find(e => e.id === record.employeeId)
        return emp?.employeeId || record.employeeId
    }},
    { key: 'employeeName' as const, header: 'Employee Name', render: (record: any) => {
        const emp = (employees as any[])?.find(e => e.id === record.employeeId)
        return emp?.name || 'Unknown'
    }},
    { key: 'monthlyGross' as const, header: 'Monthly Gross', render: (record: any) => `$${record.monthlyGross?.toLocaleString() || 0}` },
    { key: 'basic' as const, header: 'Basic', render: (record: any) => `$${record.basic?.toLocaleString() || 0}` },
    { key: 'pf' as const, header: 'PF', render: (record: any) => `$${record.pf?.toLocaleString() || 0}` },
    { key: 'tds' as const, header: 'TDS', render: (record: any) => `$${record.tds?.toLocaleString() || 0}` },
  ]

  const renderActions = (record: any) => (
    <Button variant="ghost" size="icon" onClick={() => handleOpenModal({ id: record.employeeId })}>
      <Edit2 className="h-4 w-4" />
    </Button>
  )

  return (
    <>
      <PageHeader title="Salary Structures" description="Manage salary components for employees.">
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-800">All Employees</h3>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <DataTable
              data={employees || []}
              columns={[
                { key: 'employeeId' as const, header: 'ID' },
                { key: 'name' as const, header: 'Name' },
                { key: 'department' as const, header: 'Dept' },
              ]}
              searchKey="name"
              searchPlaceholder="Search employees..."
              actions={(emp: any) => (
                <Button variant="outline" size="sm" onClick={() => handleOpenModal(emp)}>
                  {structures.find(s => s.employeeId === emp.id) ? 'Edit Structure' : 'Set Structure'}
                </Button>
              )}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-800">Assigned Structures</h3>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <DataTable
              data={structures}
              columns={columns}
              searchKey="employeeId"
              searchPlaceholder="Search by ID..."
              actions={renderActions}
            />
          </div>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Salary Structure - {selectedEmployee?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-4 border-r pr-4">
              <h4 className="font-bold text-brand-teal uppercase text-xs tracking-wider">Earnings</h4>
              <div className="space-y-2">
                <Label>Basic Salary</Label>
                <Input type="number" value={formData.basic} onChange={(e) => setFormData({...formData, basic: Number(e.target.value)})} onBlur={handleCalculateGross} />
              </div>
              <div className="space-y-2">
                <Label>HRA</Label>
                <Input type="number" value={formData.hra} onChange={(e) => setFormData({...formData, hra: Number(e.target.value)})} onBlur={handleCalculateGross} />
              </div>
              <div className="space-y-2">
                <Label>Conveyance</Label>
                <Input type="number" value={formData.conveyance} onChange={(e) => setFormData({...formData, conveyance: Number(e.target.value)})} onBlur={handleCalculateGross} />
              </div>
              <div className="space-y-2">
                <Label>Medical Allowance</Label>
                <Input type="number" value={formData.medical} onChange={(e) => setFormData({...formData, medical: Number(e.target.value)})} onBlur={handleCalculateGross} />
              </div>
              <div className="space-y-2">
                <Label>Special Allowance</Label>
                <Input type="number" value={formData.specialAllowance} onChange={(e) => setFormData({...formData, specialAllowance: Number(e.target.value)})} onBlur={handleCalculateGross} />
              </div>
              <div className="pt-2">
                <Label className="font-bold">Total Monthly Gross: ${formData.monthlyGross}</Label>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-rose-500 uppercase text-xs tracking-wider">Deductions</h4>
              <div className="space-y-2">
                <Label>Provident Fund (PF)</Label>
                <Input type="number" value={formData.pf} onChange={(e) => setFormData({...formData, pf: Number(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>ESI</Label>
                <Input type="number" value={formData.esi} onChange={(e) => setFormData({...formData, esi: Number(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>Professional Tax</Label>
                <Input type="number" value={formData.professionalTax} onChange={(e) => setFormData({...formData, professionalTax: Number(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>Income Tax (TDS)</Label>
                <Input type="number" value={formData.tds} onChange={(e) => setFormData({...formData, tds: Number(e.target.value)})} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button className="bg-brand-teal hover:bg-brand-teal/90" onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Structure
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
