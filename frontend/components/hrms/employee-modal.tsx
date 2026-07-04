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
import { TIME_OPTIONS } from '@/lib/constants'

interface EmployeeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee?: any | null
  onSave: (employee: any) => void
  mode: 'add' | 'edit' | 'view'
}

const calculateResignationDate = (startDateStr: string, daysCountStr: string, holidays: any[]) => {
  if (!startDateStr || !daysCountStr) return '';
  const daysCount = parseInt(daysCountStr);
  if (isNaN(daysCount) || daysCount <= 0) return '';

  const parts = startDateStr.split('-');
  let currentDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  let daysAdded = 0;
  
  while (daysAdded < daysCount) {
    const dayOfWeek = currentDate.getDay(); // 0 is Sunday
    
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const dStr = `${year}-${month}-${day}`;
    
    const isHoliday = holidays.some(h => h.date && h.date.startsWith(dStr));
    
    if (dayOfWeek !== 0 && !isHoliday) {
      daysAdded++;
    }
    
    if (daysAdded < daysCount) {
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
  
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  const day = String(currentDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
  const documentTypes = (data as any)?.documentTypes || []
  const holidays = (data as any)?.holidays || []

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
    startTime: '09:30',
    endTime: '18:30',
    requiredDocuments: [],
    hasBond: false,
    bondStartDate: '',
    bondEndDate: '',
    hasNoticePeriod: false,
    noticePeriodDays: '',
    noticePeriodStartDate: '',
    hasResignation: false,
    resignationDate: '',
    hasEmployment: false,
    employmentStartDate: '',
  }

  const [formData, setFormData] = useState<any>(initialData)

  useEffect(() => {
    if (employee) {
      let reqDocs = employee.requiredDocuments || []
      if (typeof reqDocs === 'string') {
        try {
          if (reqDocs.trim().startsWith('[')) reqDocs = JSON.parse(reqDocs);
          else reqDocs = reqDocs.split(',').map((s: string) => s.trim()).filter(Boolean);
        } catch { reqDocs = []; }
      } else if (Array.isArray(reqDocs) && reqDocs.length > 0) {
        const isArrayOfChars = reqDocs.every((x: any) => typeof x === 'string' && x.length === 1);
        if (isArrayOfChars && reqDocs.length > 1) {
          const joinedStr = reqDocs.join('');
          if (joinedStr.trim().startsWith('[')) {
            try { const parsed = JSON.parse(joinedStr); if (Array.isArray(parsed)) reqDocs = parsed; } catch {}
          } else {
            reqDocs = joinedStr.split(',').map((s: string) => s.trim()).filter(Boolean);
          }
        }
      }
      if (!Array.isArray(reqDocs)) reqDocs = [];
      let startTime = employee.startTime || '';
      let endTime = employee.endTime || '';
      if (startTime.includes(':')) {
        const parts = startTime.split(':');
        startTime = `${parts[0]}:${parts[1]}`;
      }
      if (endTime.includes(':')) {
        const parts = endTime.split(':');
        endTime = `${parts[0]}:${parts[1]}`;
      }
      setFormData({ ...initialData, ...employee, startTime, endTime, requiredDocuments: reqDocs })
    } else {
      setFormData(initialData)
    }
  }, [employee, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const handleModalChange = (field: string, value: any) => {
    setFormData((prev: any) => {
      const next = { ...prev, [field]: value }
      if (field === 'noticePeriodDays' || field === 'noticePeriodStartDate' || field === 'hasNoticePeriod') {
        if (next.hasNoticePeriod && next.noticePeriodStartDate && next.noticePeriodDays) {
          const calculatedDate = calculateResignationDate(next.noticePeriodStartDate, next.noticePeriodDays, holidays)
          if (calculatedDate) {
            next.hasResignation = true
            next.resignationDate = calculatedDate
          }
        }
      }
      return next
    })
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
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="Social Media Manager">Social Media Manager</SelectItem>
                    <SelectItem value="HR">HR</SelectItem>
                    <SelectItem value="Team Leader">Team Leader</SelectItem>
                    <SelectItem value="Employee">Employee</SelectItem>
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
                <Select value={formData.startTime} onValueChange={(v) => setFormData({ ...formData, startTime: v })}>
                  <SelectTrigger className="bg-slate-50/50 border-slate-200">
                    <SelectValue placeholder="Start Time" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[250px]">
                    {TIME_OPTIONS.map(opt => <SelectItem key={`start-${opt.valueNoSec}`} value={opt.valueNoSec}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-6 text-slate-400 font-bold">to</div>
              <div className="flex-1 space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">End Time</Label>
                <Select value={formData.endTime} onValueChange={(v) => setFormData({ ...formData, endTime: v })}>
                  <SelectTrigger className="bg-slate-50/50 border-slate-200">
                    <SelectValue placeholder="End Time" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[250px]">
                    {TIME_OPTIONS.map(opt => <SelectItem key={`end-${opt.valueNoSec}`} value={opt.valueNoSec}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
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

          {/* Bond, Notice Period & Resignation Section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <SectionTitle icon={FileText} title="Service Terms" />
            <div className="flex flex-col gap-6">
              {/* Bond Checkbox and fields */}
              <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="modal-hasBond"
                    checked={formData.hasBond}
                    onCheckedChange={(checked) => handleModalChange('hasBond', checked)}
                    className="data-[state=checked]:bg-brand-teal data-[state=checked]:border-brand-teal"
                  />
                  <Label htmlFor="modal-hasBond" className="text-sm font-semibold text-slate-700 cursor-pointer">
                    Employee is under Bond
                  </Label>
                </div>
                {formData.hasBond && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7 animate-in fade-in slide-in-from-left-2 duration-200">
                    <div className="space-y-2">
                      <Label htmlFor="modal-bondStartDate" className="text-xs font-bold text-slate-500 uppercase tracking-tight">Bond Start Date</Label>
                      <Input
                        id="modal-bondStartDate"
                        type="date"
                        value={formData.bondStartDate || ''}
                        onChange={(e) => handleModalChange('bondStartDate', e.target.value)}
                        className="bg-white border-slate-200 focus:bg-white transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="modal-bondEndDate" className="text-xs font-bold text-slate-500 uppercase tracking-tight">Bond End Date</Label>
                      <Input
                        id="modal-bondEndDate"
                        type="date"
                        value={formData.bondEndDate || ''}
                        onChange={(e) => handleModalChange('bondEndDate', e.target.value)}
                        className="bg-white border-slate-200 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Notice Period Checkbox and fields */}
              <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="modal-hasNoticePeriod"
                    checked={formData.hasNoticePeriod}
                    onCheckedChange={(checked) => handleModalChange('hasNoticePeriod', checked)}
                    className="data-[state=checked]:bg-brand-teal data-[state=checked]:border-brand-teal"
                  />
                  <Label htmlFor="modal-hasNoticePeriod" className="text-sm font-semibold text-slate-700 cursor-pointer">
                    Employee is on Notice Period
                  </Label>
                </div>
                {formData.hasNoticePeriod && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7 animate-in fade-in slide-in-from-left-2 duration-200">
                    <div className="space-y-2">
                      <Label htmlFor="modal-noticePeriodStartDate" className="text-xs font-bold text-slate-500 uppercase tracking-tight">Notice Period Start Date</Label>
                      <Input
                        id="modal-noticePeriodStartDate"
                        type="date"
                        value={formData.noticePeriodStartDate || ''}
                        onChange={(e) => handleModalChange('noticePeriodStartDate', e.target.value)}
                        className="bg-white border-slate-200 focus:bg-white transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="modal-noticePeriodDays" className="text-xs font-bold text-slate-500 uppercase tracking-tight">Notice Period Days</Label>
                      <Input
                        id="modal-noticePeriodDays"
                        type="number"
                        placeholder="e.g. 30"
                        value={formData.noticePeriodDays || ''}
                        onChange={(e) => handleModalChange('noticePeriodDays', e.target.value)}
                        className="bg-white border-slate-200 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Resignation Checkbox and fields */}
              <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="modal-hasResignation"
                    checked={formData.hasResignation}
                    onCheckedChange={(checked) => handleModalChange('hasResignation', checked)}
                    className="data-[state=checked]:bg-brand-teal data-[state=checked]:border-brand-teal"
                  />
                  <Label htmlFor="modal-hasResignation" className="text-sm font-semibold text-slate-700 cursor-pointer">
                    Employee has Resigned
                  </Label>
                </div>
                {formData.hasResignation && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7 animate-in fade-in slide-in-from-left-2 duration-200">
                    <div className="space-y-2">
                      <Label htmlFor="modal-resignationDate" className="text-xs font-bold text-slate-500 uppercase tracking-tight">Resignation Date</Label>
                      <Input
                        id="modal-resignationDate"
                        type="date"
                        value={formData.resignationDate || ''}
                        onChange={(e) => handleModalChange('resignationDate', e.target.value)}
                        className="bg-white border-slate-200 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Employment Checkbox and fields */}
              <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="modal-hasEmployment"
                    checked={formData.hasEmployment}
                    onCheckedChange={(checked) => handleModalChange('hasEmployment', checked)}
                    className="data-[state=checked]:bg-brand-teal data-[state=checked]:border-brand-teal"
                  />
                  <Label htmlFor="modal-hasEmployment" className="text-sm font-semibold text-slate-700 cursor-pointer">
                    Employee Accepted Employment
                  </Label>
                </div>
                {formData.hasEmployment && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7 animate-in fade-in slide-in-from-left-2 duration-200">
                    <div className="space-y-2">
                      <Label htmlFor="modal-employmentStartDate" className="text-xs font-bold text-slate-500 tracking-tight">Employment Start Date</Label>
                      <Input
                        id="modal-employmentStartDate"
                        type="date"
                        value={formData.employmentStartDate || ''}
                        onChange={(e) => handleModalChange('employmentStartDate', e.target.value)}
                        className="bg-white border-slate-200 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                )}
              </div>
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
