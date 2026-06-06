'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useApi } from '@/hooks/useApi'
import { Checkbox } from '@/components/ui/checkbox'
import { Building2, Landmark, Users2, Clock, ShieldCheck, CreditCard, UserCircle, FileText } from 'lucide-react'

interface EmployeeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee?: any | null
  onSave: (employee: any) => void
  mode: 'add' | 'edit' | 'view'
}

export function EmployeeModal({
  open,
  onOpenChange,
  employee,
  onSave,
  mode,
}: EmployeeModalProps) {
  const { data } = useApi()
  const departments = data?.departments || []
  const designations = data?.designations || []
  const documentTypes = data?.documentTypes || []

  const initialData = {
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    dob: '',
    joinDate: '',
    salary: '',
    role: 'Employee',
    upiId: '',
    accountNumber: '',
    ifscCode: '',
    bankName: '',
    accountHolderName: '',
    parentName: '',
    parentNumber: '',
    relationship: 'Father',
    employeeId: '',
    aadharCard: '',
    panCard: '',
    department: '',
    designation: '',
    status: 'active',
    workingHoursStart: '09:30 AM',
    workingHoursEnd: '06:30 PM',
    requiredDocuments: [],
  }

  const [formData, setFormData] = useState<any>(initialData)

  useEffect(() => {
    if (employee) {
      setFormData({ ...initialData, ...employee })
    } else {
      setFormData(initialData)
    }
  }, [employee, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const isViewMode = mode === 'view'

  const SectionTitle = ({ icon: Icon, title }: { icon: any, title: string }) => (
    <div className="flex items-center gap-2 pb-2 mb-4 border-b border-slate-100">
      <div className="p-1.5 rounded-lg bg-brand-teal/10">
        <Icon className="w-4 h-4 text-brand-teal" />
      </div>
      <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">{title}</h3>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-50/50">
        <DialogHeader className="bg-white p-6 -m-6 mb-6 border-b border-slate-100">
          <DialogTitle className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-teal flex items-center justify-center shadow-lg shadow-brand-teal/20 text-white">
              <UserCircle className="w-6 h-6" />
            </div>
            {mode === 'add' ? 'Add New Employee' : mode === 'edit' ? 'Edit Employee' : 'Employee Details'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8 px-2 pb-6">
          {/* Basic Information */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <SectionTitle icon={UserCircle} title="Basic Information" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">First Name *</Label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Enter first name"
                  className="bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Middle Name</Label>
                <Input
                  value={formData.middleName}
                  onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                  placeholder="Enter middle name"
                  className="bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Last Name *</Label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Enter last name"
                  className="bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@company.com"
                  className="bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Phone Number *</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 XXXXX XXXXX"
                  className="bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Password</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Date of Birth *</Label>
                <Input
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  className="bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Joining Date *</Label>
                <Input
                  type="date"
                  value={formData.joinDate}
                  onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                  className="bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Salary *</Label>
                <Input
                  type="number"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  placeholder="Monthly Salary"
                  className="bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Role *</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                  <SelectTrigger className="bg-slate-50/50 border-slate-200">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="HR">HR</SelectItem>
                    <SelectItem value="Employee">Employee</SelectItem>
                    <SelectItem value="Team Leader">Team Leader</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <SectionTitle icon={Landmark} title="Bank Details" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">UPI ID *</Label>
                <Input
                  value={formData.upiId}
                  onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                  placeholder="user@upi"
                  className="bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Account Number *</Label>
                <Input
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  placeholder="XXXX XXXX XXXX XXXX"
                  className="bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">IFSC Code *</Label>
                <Input
                  value={formData.ifscCode}
                  onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })}
                  placeholder="BANK0000123"
                  className="bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Bank Name *</Label>
                <Input
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder="Bank Name"
                  className="bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                  required
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Account Holder Name *</Label>
                <Input
                  value={formData.accountHolderName}
                  onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
                  placeholder="As per bank records"
                  className="bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                  required
                />
              </div>
            </div>
          </div>

          {/* Parent Details */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <SectionTitle icon={Users2} title="Parent Details" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Parent Name *</Label>
                <Input
                  value={formData.parentName}
                  onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                  placeholder="Father/Mother Name"
                  className="bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Parent Number *</Label>
                <Input
                  value={formData.parentNumber}
                  onChange={(e) => setFormData({ ...formData, parentNumber: e.target.value })}
                  placeholder="Emergency contact"
                  className="bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Relationship</Label>
                <Select value={formData.relationship} onValueChange={(v) => setFormData({ ...formData, relationship: v })}>
                  <SelectTrigger className="bg-slate-50/50 border-slate-200">
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Father">Father</SelectItem>
                    <SelectItem value="Mother">Mother</SelectItem>
                    <SelectItem value="Guardian">Guardian</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Identification & Org */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <SectionTitle icon={ShieldCheck} title="Identification & Organization" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Employee ID</Label>
                <Input
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  placeholder="EMP001"
                  className="bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Aadhar Card Number</Label>
                <Input
                  value={formData.aadharCard}
                  onChange={(e) => setFormData({ ...formData, aadharCard: e.target.value })}
                  placeholder="XXXX XXXX XXXX"
                  className="bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">PAN Card Number</Label>
                <Input
                  value={formData.panCard}
                  onChange={(e) => setFormData({ ...formData, panCard: e.target.value })}
                  placeholder="ABCDE1234F"
                  className="bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Department *</Label>
                <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v })}>
                  <SelectTrigger className="bg-slate-50/50 border-slate-200">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d: any) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Designation *</Label>
                <Select value={formData.designation} onValueChange={(v) => setFormData({ ...formData, designation: v })}>
                  <SelectTrigger className="bg-slate-50/50 border-slate-200">
                    <SelectValue placeholder="Select designation" />
                  </SelectTrigger>
                  <SelectContent>
                    {designations.filter((d:any) => d.department === formData.department || !formData.department).map((d: any) => (
                      <SelectItem key={d.id} value={d.title}>{d.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Status *</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger className="bg-slate-50/50 border-slate-200">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="probation">Probation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Gender *</Label>
                <Select value={formData.gender || 'Male'} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                  <SelectTrigger className="bg-slate-50/50 border-slate-200">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Working Hours */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <SectionTitle icon={Clock} title="Working Hours" />
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Start Time</Label>
                <Input
                  type="time"
                  value={formData.workingHoursStart}
                  onChange={(e) => setFormData({ ...formData, workingHoursStart: e.target.value })}
                  className="bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                />
              </div>
              <div className="pt-6 text-slate-400 font-bold">to</div>
              <div className="flex-1 space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">End Time</Label>
                <Input
                  type="time"
                  value={formData.workingHoursEnd}
                  onChange={(e) => setFormData({ ...formData, workingHoursEnd: e.target.value })}
                  className="bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                />
              </div>
            </div>
          </div>

          {/* Required Documents Checklist */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <SectionTitle icon={FileText} title="Required Documents Checklist" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documentTypes.map((docType: any) => {
                const isChecked = formData.requiredDocuments?.includes(docType.name)
                return (
                  <div key={docType.id} className="flex items-center space-x-3 p-3 rounded-xl border border-slate-100 hover:border-brand-teal/30 hover:bg-slate-50 transition-colors">
                    <Checkbox
                      id={`doc-${docType.id}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        const currentDocs = formData.requiredDocuments || []
                        if (checked) {
                          setFormData({ ...formData, requiredDocuments: [...currentDocs, docType.name] })
                        } else {
                          setFormData({ ...formData, requiredDocuments: currentDocs.filter((name: string) => name !== docType.name) })
                        }
                      }}
                      className="data-[state=checked]:bg-brand-teal data-[state=checked]:border-brand-teal"
                    />
                    <Label htmlFor={`doc-${docType.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-slate-700">
                      {docType.name}
                    </Label>
                  </div>
                )
              })}
              {documentTypes.length === 0 && (
                <div className="col-span-full text-slate-500 text-sm italic">
                  No document types available. Please add some in the Admin Settings.
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4 sticky bottom-0 bg-slate-50/90 backdrop-blur-sm p-4 -m-4 border-t border-slate-200 z-10">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="px-8 h-12 rounded-xl font-bold text-slate-600 hover:bg-slate-100 border-slate-200">
              Cancel
            </Button>
            <Button type="submit" className="px-8 h-12 rounded-xl font-bold bg-brand-teal hover:bg-brand-teal/90 text-white shadow-lg shadow-brand-teal/20 transition-all">
              {mode === 'add' ? 'Save Employee' : 'Update Employee'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
