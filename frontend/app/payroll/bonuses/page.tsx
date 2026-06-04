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
import { Plus, Loader2, Save, Trash2, Tag, Search, Filter, Calendar, Edit } from 'lucide-react'
import { useUserContext } from '@/context/UserContext'
import { useApi } from '@/hooks/useApi'
import { API_URL } from '@/lib/config'
import { toast } from 'sonner'
import { useConfirm } from "@/context/ConfirmContext";
export default function BonusesPage() {
  const { confirm } = useConfirm();
  const { user } = useUserContext()
  const canManage = (() => {
    if (user) {
      return user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'hr' || user.name === 'Admin Admin'
    }
    if (typeof window !== 'undefined') {
      const uStr = localStorage.getItem('user')
      if (uStr) {
        const u = JSON.parse(uStr)
        return u.role?.toLowerCase() === 'admin' || u.role?.toLowerCase() === 'hr' || u.name === 'Admin Admin'
      }
    }
    return false
  })()
  const { data, isLoading: loadingEmployees } = useApi()
  const employees = data?.employees || []
  const [adjustments, setAdjustments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)

  // Screenshot Matching Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedEmpId, setSelectedEmpId] = useState<string>('all')
  const [timePeriod, setTimePeriod] = useState<string>('This Month')
  const [filterDate, setFilterDate] = useState<string>('')

  const [formData, setFormData] = useState({
    employeeId: '',
    month: 'May',
    year: 2026,
    type: 'bonus',
    amount: 0,
    reason: '',
    status: 'active',
    date: new Date().toISOString().split('T')[0]
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

  const handleOpenAddModal = () => {
    setEditingItem(null)
    setFormData({
      employeeId: '',
      month: 'May',
      year: 2026,
      type: 'bonus',
      amount: 0,
      reason: '',
      status: 'active',
      date: new Date().toISOString().split('T')[0]
    })
    setModalOpen(true)
  }

  const handleEdit = (record: any) => {
    setEditingItem(record)
    setFormData({
      employeeId: record.employeeId,
      month: record.month,
      year: record.year,
      type: record.type,
      amount: record.amount,
      reason: record.reason,
      status: record.status || 'active',
      date: record.date || new Date().toISOString().split('T')[0]
    })
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: "Confirm Action",
      message: 'Are you sure you want to delete this adjustment?',
      destructive: true,
      confirmText: "Confirm"
    });
    if (!isConfirmed) return
    try {
      const response = await fetch(`${API_URL}/bonus-deductions/${id}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        toast.success('Adjustment deleted successfully')
        fetchAdjustments()
      } else {
        toast.error('Failed to delete adjustment')
      }
    } catch (e) {
      console.error(e)
      toast.error('Error deleting adjustment')
    }
  }

  const handleSave = async () => {
    if (!formData.employeeId || !formData.amount) {
      toast.error('Please fill required fields')
      return
    }
    setIsSubmitting(true)
    try {
      const url = editingItem ? `${API_URL}/bonus-deductions/${editingItem.id}` : `${API_URL}/bonus-deductions`
      const method = editingItem ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success(editingItem ? 'Adjustment updated successfully' : 'Adjustment added successfully')
        fetchAdjustments()
        setModalOpen(false)
      } else {
        toast.error('Failed to save adjustment')
      }
    } catch (error) {
      console.error('Error saving adjustment:', error)
      toast.error('Error saving adjustment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderActions = (record: any) => {
    if (!canManage) return null
    return (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => handleEdit(record)} className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50">
          <Edit className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => handleDelete(record.id)} className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  const columns = [
    { key: 'employeeId' as const, header: 'Employee', render: (record: any) => {
        const emp = (employees as any[])?.find(e => e.id === record.employeeId)
        return emp?.name || record.employeeId
    }},
    { key: 'type' as const, header: 'Type', render: (record: any) => (
        <span className={record.type === 'bonus' ? 'text-emerald-600 font-bold uppercase text-[10px]' : 'text-rose-600 font-bold uppercase text-[10px]'}>
            {record.type}
        </span>
    )},
    { key: 'amount' as const, header: 'Amount', render: (record: any) => `₹${record.amount?.toLocaleString() || 0}` },
    { key: 'date' as const, header: 'Date', render: (record: any) => {
        if (record.date) {
          const d = new Date(record.date);
          return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        }
        return `${record.month} ${record.year}`;
    }},
    { key: 'reason' as const, header: 'Reason' },
  ]

  // Filter adjustment records dynamically
  const filteredAdjustments = adjustments
    .filter(a => {
      return canManage || a.employeeId === user?.id || a.employeeId === user?.employeeId
    })
    .filter(a => {
      if (!searchQuery) return true
      return a.reason?.toLowerCase().includes(searchQuery.toLowerCase())
    })
    .filter(a => {
      return selectedEmpId === 'all' || a.employeeId === selectedEmpId
    })
    .filter(a => {
      return selectedType === 'all' || a.type === selectedType
    })
    .filter(a => {
      if (timePeriod === 'All Time') return true
      const now = new Date()
      const currentMonthName = now.toLocaleString('default', { month: 'long' })
      const currentYear = now.getFullYear()
      const todayStr = now.toISOString().split('T')[0]
      
      if (timePeriod === 'Today') {
        if (a.date) return a.date === todayStr
        return a.month === currentMonthName && a.year === currentYear
      }
      if (timePeriod === 'This Month') {
        if (a.date) {
          const ad = new Date(a.date)
          return ad.getMonth() === now.getMonth() && ad.getFullYear() === now.getFullYear()
        }
        return a.month === currentMonthName && a.year === currentYear
      }
      if (timePeriod === 'Specific Date...' && filterDate) {
        return a.date === filterDate
      }
      return true
    })

  return (
    <>
      <PageHeader title="Bonuses & Deductions" description="Add ad-hoc salary adjustments for specific months.">
        {canManage && (
          <Button className="bg-brand-teal hover:bg-brand-teal/90 font-bold" onClick={handleOpenAddModal}>
            <Plus className="mr-2 h-4 w-4" />
            Add Adjustment
          </Button>
        )}
      </PageHeader>

      {/* Screenshot Matching Inline Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6 bg-transparent">
        {/* Search input with loupe icon */}
        <div className="relative w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search by reason..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-teal focus:border-brand-teal transition-all placeholder:text-slate-400 text-gray-700 shadow-sm"
          />
        </div>

        {/* Employee Dropdown */}
        {canManage && (
          <div className="w-[200px]">
            <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
              <SelectTrigger className="h-10 text-sm font-semibold border-slate-200 rounded-lg bg-white text-gray-700 focus:ring-brand-teal shadow-sm">
                <SelectValue placeholder="All Employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {(employees as any[])?.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Type Dropdown */}
        <div className="w-[200px]">
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="h-10 text-sm font-semibold border-slate-200 rounded-lg bg-white text-gray-700 focus:ring-brand-teal shadow-sm flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <span>Type: {selectedType === 'all' ? 'All' : selectedType === 'bonus' ? 'Bonus' : 'Deduction'}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Type: All</SelectItem>
              <SelectItem value="bonus">Type: Bonus</SelectItem>
              <SelectItem value="deduction">Type: Deduction</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Period Dropdown */}
        <div className="w-[200px]">
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="h-10 text-sm font-semibold border-slate-200 rounded-lg bg-white text-gray-700 focus:ring-brand-teal shadow-sm flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>{timePeriod}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Time">All Time</SelectItem>
              <SelectItem value="Today">Today</SelectItem>
              <SelectItem value="This Month">This Month</SelectItem>
              <SelectItem value="Specific Date...">Specific Date...</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {timePeriod === 'Specific Date...' && (
          <div className="w-[180px] animate-in fade-in slide-in-from-left-2 duration-200">
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="h-10 text-sm border-slate-200 rounded-lg bg-white text-gray-700 focus-visible:ring-brand-teal shadow-sm"
            />
          </div>
        )}

        {(searchQuery || selectedType !== 'all' || selectedEmpId !== 'all' || timePeriod !== 'This Month' || filterDate) && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              setSearchQuery('')
              setSelectedType('all')
              setSelectedEmpId('all')
              setTimePeriod('This Month')
              setFilterDate('')
            }}
            className="text-brand-teal h-10 px-3 text-xs font-bold hover:bg-brand-light/50"
          >
            Clear Filters
          </Button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <DataTable
          data={filteredAdjustments}
          columns={columns}
          isLoading={loading}
          actions={renderActions}
        />
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Bonus or Deduction' : 'Add Bonus or Deduction'}</DialogTitle>
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

            <div className="space-y-2">
              <Label>Date</Label>
              <Input 
                type="date" 
                value={formData.date || ''} 
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) return;
                  const d = new Date(val);
                  const mNames = [
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'
                  ];
                  setFormData({
                    ...formData,
                    date: val,
                    month: mNames[d.getMonth()],
                    year: d.getFullYear()
                  });
                }} 
              />
            </div>

            <div className="space-y-2">
              <Label>Reason / Description</Label>
              <Input placeholder="e.g. Performance Bonus Q1" value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button className="bg-brand-teal hover:bg-brand-teal/90" onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingItem ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />)}
              {editingItem ? 'Save Changes' : 'Add Adjustment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
