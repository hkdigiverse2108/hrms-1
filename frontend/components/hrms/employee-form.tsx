'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useApi } from '@/hooks/useApi'
import { Save, Plus, Loader2, Image as ImageIcon, X, Eye, EyeOff, Trash2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Checkbox } from '@/components/ui/checkbox'
import { API_URL, getAvatarUrl } from '@/lib/config'
import { toast } from "sonner";
import { TIME_OPTIONS } from '@/lib/constants'
import { useUser } from '@/hooks/useUser'

export interface EmployeeFormData {
  employeeId: string
  firstName: string
  middleName: string
  lastName: string
  email: string
  phone: string
  password?: string
  dob: string
  joinDate: string
  salary: string
  role: string
  upiId: string
  accountNumber: string
  ifscCode: string
  bankName: string
  accountHolderName: string
  parentName: string
  parentNumber: string
  relation: string
  aadharCard: string
  panCard: string
  department: string
  designation: string
  startTime: string
  endTime: string
  profilePhoto: string
  status: string
  gender: string
  position: string
  requiredDocuments: string[]
  hasBond: boolean
  bondStartDate: string
  bondEndDate: string
  hasNoticePeriod: boolean
  noticePeriodDays: string
  noticePeriodStartDate: string
  hasResignation: boolean
  resignationDate: string
  hasEmployment: boolean
  employmentStartDate: string
  bondsHistory: any[]
}

interface EmployeeFormProps {
  initialData?: Partial<EmployeeFormData>
  onSubmit: (data: EmployeeFormData) => Promise<void>
  isSubmitting: boolean
  mode: 'add' | 'edit'
}

const defaultFormData: EmployeeFormData = {
  employeeId: '',
  firstName: '',
  middleName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  dob: '',
  joinDate: '',
  salary: '',
  role: '',
  upiId: '',
  accountNumber: '',
  ifscCode: '',
  bankName: '',
  accountHolderName: '',
  parentName: '',
  parentNumber: '',
  relation: '',
  aadharCard: '',
  panCard: '',
  department: '',
  sub_department: '',
  designation: '',
  startTime: '',
  endTime: '',
  profilePhoto: '',
  status: 'active',
  gender: 'Male',
  position: 'Intern',
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
  bondsHistory: [],
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

export function EmployeeForm({ initialData, onSubmit, isSubmitting, mode }: EmployeeFormProps) {
  const { user } = useUser()
  const { data, mutate, isLoading } = useApi<{ 
    departments: any[], 
    subDepartments: any[],
    designations: any[], 
    roles: any[] 
  }>('/api/company-settings')
  
  const departments = data?.departments || []
  const subDepartments = (data as any)?.subDepartments || []
  const designations = data?.designations || []
  const relations = data?.relations || []
  const documentTypes = (data as any)?.documentTypes || []
  const holidays = (data as any)?.holidays || []
  const roles = data?.roles || []
  
  const [formData, setFormData] = useState<EmployeeFormData>(defaultFormData)
  const [showPassword, setShowPassword] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (initialData) {
      console.log("DEBUG: Loading initialData into form", initialData);
      const sanitizedData = { ...defaultFormData }
      
      // Aggressive mapping to ensure all fields are handled, including potential case mismatches
      const dataKeys = Object.keys(initialData)
      
      Object.keys(defaultFormData).forEach((key) => {
        const k = key as keyof EmployeeFormData
        
        // Try exact match
        let value = initialData[k]
        
        // Try case-insensitive match if not found
        if (value === undefined || value === null) {
          const lowerKey = k.toLowerCase()
          const foundKey = dataKeys.find(dk => dk.toLowerCase() === lowerKey)
          if (foundKey) {
            value = (initialData as any)[foundKey]
          }
        }
        
        if (value !== undefined && value !== null) {
          if (k === 'salary') {
            sanitizedData[k] = String(value) as any
          } else if (k === 'password') {
            sanitizedData[k] = String(value) as any
          } else if (k === 'requiredDocuments') {
            let reqDocs: any = value;
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
            sanitizedData[k] = (Array.isArray(reqDocs) ? reqDocs : []) as any;
          } else if (k === 'startTime' || k === 'endTime') {
            const strVal = String(value);
            if (strVal.includes(':')) {
              const parts = strVal.split(':');
              sanitizedData[k] = `${parts[0]}:${parts[1]}`;
            } else {
              sanitizedData[k] = strVal;
            }
          } else if (k === 'hasBond' || k === 'hasNoticePeriod' || k === 'hasResignation' || k === 'hasEmployment') {
            sanitizedData[k] = (value === true || value === 'true') as any
          } else if (k === 'bondsHistory') {
            sanitizedData[k] = (Array.isArray(value) ? value : []) as any;
          } else if (typeof value === 'object' && value !== null) {
            // Handle if backend returns an object for a field (e.g., department: {name: '...'})
            sanitizedData[k] = String((value as any).name || (value as any).title || (value as any).label || JSON.stringify(value)) as any
          } else {
            sanitizedData[k] = String(value) as any
          }
        } else {
          const defVal = (defaultFormData as any)[k];
          const target: any = sanitizedData;
          target[k] = defVal !== undefined ? defVal : '';
        }
      })
      
      console.log("DEBUG: Final sanitizedData", sanitizedData);
      setFormData(sanitizedData)
    }
  }, [initialData])


  const isRoleAdmin = (r?: string) => {
    if (!r) return false;
    const clean = r.toLowerCase().trim();
    return clean === 'admin' || clean === 'super admin' || clean === 'superadmin' || clean === 'administrator' || clean === 'founder' || clean === 'super_admin' || clean === 'sub-admin';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isRoleAdmin(formData.role) && (!formData.startTime || !formData.endTime)) {
      toast.error('Please enter both Start Time and End Time.')
      return
    }
    onSubmit(formData)
  }

  const handleChange = (field: keyof EmployeeFormData, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'department') {
        next.sub_department = ''
        next.designation = ''
      }
      if (field === 'sub_department') {
        next.designation = ''
      }
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 512 * 1024 * 1024) {
      toast.error('File size cannot exceed 512 MB')
      e.target.value = ''
      return
    }

    setIsUploading(true)
    const formDataUpload = new FormData()
    formDataUpload.append('file', file)

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formDataUpload,
      })

      if (response.ok) {
        const data = await response.json()
        const filename = data.url.split('/').pop()
        handleChange('profilePhoto', filename)
      } else {
        toast.error('Failed to upload image')
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      toast.error('Error uploading file')
    } finally {
      setIsUploading(false)
    }
  }

  const triggerFileUpload = () => {
    fileInputRef.current?.click()
  }

  const removePhoto = (e: React.MouseEvent) => {
    e.stopPropagation()
    handleChange('profilePhoto', '')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-12">
      {/* Main Information Grid (3 Columns) */}
      <div className="grid gap-x-12 gap-y-6 md:grid-cols-3">
        {/* Row 1 */}
        <FormField label="First Name" id="firstName" required value={formData.firstName} onChange={(v: string) => handleChange('firstName', v)} />
        <FormField label="Middle Name" id="middleName" required value={formData.middleName} onChange={(v: string) => handleChange('middleName', v)} />
        <FormField label="Last Name" id="lastName" required value={formData.lastName} onChange={(v: string) => handleChange('lastName', v)} />

        {/* Row 2 */}
        <FormField label="Email" id="email" type="email" required value={formData.email} onChange={(v: string) => handleChange('email', v)} placeholder="example@email.com" />
        <FormField label="Phone Number" id="phone" required value={formData.phone} onChange={(v: string) => handleChange('phone', v)} placeholder="Enter phone number" />
        <FormField 
          label="Password" 
          id="password" 
          type={showPassword ? "text" : "password"} 
          required={mode === 'add'} 
          value={formData.password} 
          onChange={(v: string) => handleChange('password', v)} 
          placeholder={mode === 'edit' ? "Enter new password (leave blank to keep current)" : "............"} 
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-brand-teal"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
        />

        {/* Row 3 */}
        <FormField label="DOB" id="dob" type="date" required value={formData.dob} onChange={(v: string) => handleChange('dob', v)} />
        {!isRoleAdmin(formData.role) && (
          <>
            <FormField label="Joining Date" id="joinDate" type="date" required value={formData.joinDate} onChange={(v: string) => handleChange('joinDate', v)} />
            <FormField label="Salary" id="salary" type="number" required value={formData.salary} onChange={(v: string) => handleChange('salary', v)} placeholder="Enter salary" />
          </>
        )}

        <FormSelect
          label="Gender"
          id="gender"
          required
          value={formData.gender}
          onValueChange={(v: string) => {
            console.log("Gender changed to:", v);
            handleChange('gender', v);
          }}
          options={[
            { label: 'Male', value: 'Male' },
            { label: 'Female', value: 'Female' },
            { label: 'Other', value: 'Other' }
          ]}
          placeholder="Select gender"
        />

        <FormSelect
          key={`role-${roles.length}`}
          label="Role"
          id="role"
          required
          value={formData.role}
          onValueChange={(v: string) => handleChange('role', v)}
          options={[
            ...roles.map((r: any) => ({ label: r.name, value: r.name })),
            ...(roles.some((r: any) => r.name?.toLowerCase() === 'intern') ? [] : [{ label: 'Intern', value: 'Intern' }])
          ].filter(roleOption => {
            const rName = roleOption.value.toLowerCase().trim();
            const uRole = user?.role?.toLowerCase().trim() || '';
            
            const ROLE_HIERARCHY: Record<string, number> = {
              'admin': 0, 'super admin': 0, 'superadmin': 0, 'administrator': 0, 'founder': 0, 'super_admin': 0,
              'sub-admin': 1,
              'hr': 2,
              'manager': 3,
              'team leader': 4,
              'employee': 5,
              'intern': 6
            };
            const getRoleLevel = (r: string) => ROLE_HIERARCHY[r] ?? 5;
            
            const actorLevel = getRoleLevel(uRole);
            const targetLevel = getRoleLevel(rName);
            
            return actorLevel === 0 || targetLevel >= actorLevel;
          }).sort((a, b) => {
            const order = ['admin', 'sub-admin', 'hr', 'team leader', 'employee', 'intern'];
            const indexA = order.indexOf(a.value.toLowerCase());
            const indexB = order.indexOf(b.value.toLowerCase());
            
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.label.localeCompare(b.label);
          })}
          placeholder="Select role"
        />
      </div>
 
      {/* Dynamic Conditional Sections */}
      {!isRoleAdmin(formData.role) && (
        <>
          {/* Bank Details Card */}
          <Card className="relative pt-6 border border-gray-200 shadow-sm rounded-xl overflow-visible mt-12">
            <div className="absolute -top-4 left-4 bg-white px-6 py-2 border border-gray-200 rounded-lg shadow-sm text-sm font-semibold text-gray-700">
              Bank Details
            </div>
            <CardContent className="pt-8 px-8 pb-10">
              <div className="grid gap-x-16 gap-y-6 md:grid-cols-2">
                <FormField label="UPI ID" id="upiId" required={!isRoleAdmin(formData.role)} value={formData.upiId} onChange={(v: string) => handleChange('upiId', v)} />
                <FormField label="Account Number" id="accountNumber" required={!isRoleAdmin(formData.role)} value={formData.accountNumber} onChange={(v: string) => handleChange('accountNumber', v)} />
                <FormField label="IFSC Code" id="ifscCode" required={!isRoleAdmin(formData.role)} value={formData.ifscCode} onChange={(v: string) => handleChange('ifscCode', v)} />
                <FormField label="Bank Name" id="bankName" required={!isRoleAdmin(formData.role)} value={formData.bankName} onChange={(v: string) => handleChange('bankName', v)} />
                <FormField label="Account Holder Name" id="accountHolderName" required={!isRoleAdmin(formData.role)} value={formData.accountHolderName} onChange={(v: string) => handleChange('accountHolderName', v)} />
              </div>
            </CardContent>
          </Card>
 
          {/* Parent Details Card */}
          <Card className="relative pt-6 border border-gray-200 shadow-sm rounded-xl overflow-visible mt-12">
            <div className="absolute -top-4 left-4 bg-white px-6 py-2 border border-gray-200 rounded-lg shadow-sm text-sm font-semibold text-gray-700">
              Parent Details
            </div>
            <CardContent className="pt-8 px-8 pb-10">
              <div className="grid gap-x-16 gap-y-6 md:grid-cols-2">
                <FormField label="Parent Name" id="parentName" required={!isRoleAdmin(formData.role)} value={formData.parentName} onChange={(v: string) => handleChange('parentName', v)} />
                <FormField label="Parent Number" id="parentNumber" required={!isRoleAdmin(formData.role)} value={formData.parentNumber} onChange={(v: string) => handleChange('parentNumber', v)} />
                <FormSelect
                  key={`rel-${relations.length}`}
                  label="Relationship"
                  id="relation"
                  value={formData.relation}
                  onValueChange={(v: string) => handleChange('relation', v)}
                  options={relations.map((r: any) => ({ label: r.name, value: r.name }))}
                  placeholder="Select relationship"
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Professional Details Section */}
      <div className="space-y-6 pt-6 max-w-4xl">
        <div className="flex items-center gap-4">
          <Label className="w-44 text-left font-medium text-gray-700">Employee ID:</Label>
          {isRoleAdmin(formData.role) ? (
            <Input
              value={formData.employeeId}
              onChange={(e) => handleChange('employeeId', e.target.value)}
              placeholder="Enter Admin ID (e.g., ADMIN001)"
              className="flex-1 bg-white border-gray-200 focus-visible:ring-brand-teal h-10 shadow-sm max-w-[400px]"
              disabled={mode === 'edit'}
            />
          ) : (
            <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600 font-mono text-sm max-w-[400px]">
              {formData.employeeId || 'System Generated'}
            </div>
          )}
        </div>
        
        {!isRoleAdmin(formData.role) && (
          <>
            <FormField label="Aadhar Card" id="aadharCard" value={formData.aadharCard} onChange={(v: string) => handleChange('aadharCard', v)} />
            <FormField label="PAN Card" id="panCard" value={formData.panCard} onChange={(v: string) => handleChange('panCard', v)} />
          </>
        )}
        
        {!isRoleAdmin(formData.role) && (
          <>
            <FormSelect 
              key={`dept-${departments.length}`} 
              label="Department" 
              id="department" 
              required 
              value={formData.department} 
              onValueChange={(v: string) => handleChange('department', v)} 
              options={departments.map((d: any) => ({ label: d.name, value: d.name }))} 
              placeholder="Select department" 
            />
            <FormSelect 
              key={`subdept-${subDepartments.length}-${formData.department}`} 
              label="Sub Department" 
              id="sub_department" 
              required
              value={formData.sub_department || ''} 
              onValueChange={(v: string) => handleChange('sub_department', v)} 
              options={subDepartments.filter((d: any) => d.department === formData.department).map((d: any) => ({ label: d.name, value: d.name }))} 
              placeholder="Select sub department" 
            />
            <FormSelect key={`des-${designations.length}-${formData.sub_department}`} label="Designation" id="designation" required value={formData.designation} onValueChange={(v: string) => handleChange('designation', v)} options={designations.filter((d: any) => d.sub_department === formData.sub_department).map((d: any) => ({ label: d.title, value: d.title }))} placeholder="Select designation" />
            
            <FormSelect 
              label="Status" 
              id="status" 
              required 
              value={formData.status} 
              onValueChange={(v: string) => handleChange('status', v)} 
              options={[
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' }
              ]} 
              placeholder="Select status" 
            />

            {/* Working Hours */}
            <div className="flex items-center gap-4">
              <Label className="w-44 text-left font-medium text-gray-700">
                Working Hours{<span className="text-red-500 ml-1 text-lg font-bold">*</span>}:
              </Label>
              <div className="flex items-center gap-4 flex-1 max-w-[400px]">
                <Select key={`start-${formData.startTime}`} value={formData.startTime} onValueChange={(v) => handleChange('startTime', v)} required>
                  <SelectTrigger className="flex-1 bg-white border-gray-200 focus:ring-brand-teal h-10 shadow-sm">
                    <SelectValue placeholder="Start Time" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[250px]">
                    {TIME_OPTIONS.map(opt => <SelectItem key={`start-${opt.valueNoSec}`} value={opt.valueNoSec}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <span className="text-gray-400 font-medium whitespace-nowrap">to</span>
                <Select key={`end-${formData.endTime}`} value={formData.endTime} onValueChange={(v) => handleChange('endTime', v)} required>
                  <SelectTrigger className="flex-1 bg-white border-gray-200 focus:ring-brand-teal h-10 shadow-sm">
                    <SelectValue placeholder="End Time" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[250px]">
                    {TIME_OPTIONS.map(opt => <SelectItem key={`end-${opt.valueNoSec}`} value={opt.valueNoSec}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}

        {/* Profile Photo */}
        <div className="flex items-start gap-4">
          <Label className="w-44 text-left font-medium text-gray-700 pt-3">
            Profile Photo:
          </Label>
          <div 
            onClick={triggerFileUpload}
            className="border-2 border-dashed border-gray-200 rounded-xl w-32 h-32 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-all group overflow-hidden relative shadow-inner"
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 text-brand-teal animate-spin" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Uploading...</span>
              </div>
            ) : formData.profilePhoto ? (
              <div className="relative w-full h-full group">
                <img 
                  src={getAvatarUrl(formData.profilePhoto)} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="flex flex-col items-center gap-1">
                    <ImageIcon className="h-5 w-5 text-white" />
                    <span className="text-[10px] font-bold text-white uppercase">Change</span>
                  </div>
                </div>
                <button
                  onClick={removePhoto}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md"
                  title="Remove Photo"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 group-hover:scale-110 transition-all duration-300">
                <div className="bg-gray-100 p-2 rounded-full mb-1 group-hover:bg-brand-light transition-colors">
                  <Plus className="h-6 w-6 text-gray-400 group-hover:text-brand-teal" />
                </div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Upload</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
            />
          </div>
        </div>
      </div>

      {/* Required Documents Checklist Section */}
      <div className="space-y-6 pt-6 max-w-4xl border-t border-gray-100">
        <div className="flex items-start gap-4">
          <Label className="w-44 text-left font-medium text-gray-700 pt-3">
            Required Documents:
          </Label>
          <div className="flex-1 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documentTypes.map((docType: any) => {
                const isChecked = formData.requiredDocuments?.includes(docType.name)
                return (
                  <div key={docType.id} className="flex items-center space-x-3 p-3 rounded-xl border border-gray-100 hover:border-brand-teal/30 hover:bg-gray-50 transition-colors">
                    <Checkbox
                      id={`doc-${docType.id}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        const currentDocs = formData.requiredDocuments || []
                        if (checked) {
                          handleChange('requiredDocuments', [...currentDocs, docType.name] as any)
                        } else {
                          handleChange('requiredDocuments', currentDocs.filter((name: string) => name !== docType.name) as any)
                        }
                      }}
                      className="data-[state=checked]:bg-brand-teal data-[state=checked]:border-brand-teal"
                    />
                    <Label htmlFor={`doc-${docType.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-gray-700">
                      {docType.name}
                    </Label>
                  </div>
                )
              })}
              {documentTypes.length === 0 && (
                <div className="col-span-full text-gray-500 text-sm italic">
                  No document types available. Please add some in the Admin Settings.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bond, Notice Period & Resignation Section */}
      <div className="space-y-6 pt-6 max-w-4xl border-t border-gray-100">
        <div className="flex items-start gap-4">
          <Label className="w-44 text-left font-medium text-gray-700 pt-3">
            Service Terms:
          </Label>
          <div className="flex-1 space-y-6">
            {/* Bond Checkbox and fields */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="hasBond"
                  checked={formData.hasBond}
                  onCheckedChange={(checked) => {
                    handleChange('hasBond', checked)
                    if (checked && (!formData.bondsHistory || formData.bondsHistory.length === 0)) {
                      handleChange('bondsHistory', [{ id: String(Date.now()), startDate: '', endDate: '', status: 'active' }])
                    }
                  }}
                  className="data-[state=checked]:bg-brand-teal data-[state=checked]:border-brand-teal"
                />
                <Label htmlFor="hasBond" className="text-sm font-semibold text-gray-700 cursor-pointer">
                  Employee is under Bond
                </Label>
              </div>
              {formData.hasBond && (
                <div className="space-y-4 pl-7 animate-in fade-in slide-in-from-left-2 duration-200">
                  <div className="space-y-3">
                    {(formData.bondsHistory || []).map((bond: any, index: number) => {
                      const todayStr = new Date().toLocaleDateString('en-CA')
                      const isExpired = bond.endDate && bond.endDate < todayStr
                      return (
                        <div key={bond.id || index} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                          <div className="md:col-span-5 space-y-2">
                            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Bond Start Date</Label>
                            <Input
                              type="date"
                              value={bond.startDate || ''}
                              disabled={isExpired}
                              onChange={(e) => {
                                const newHistory = [...formData.bondsHistory]
                                newHistory[index].startDate = e.target.value
                                handleChange('bondsHistory', newHistory)
                              }}
                              className="h-10 rounded-lg border-gray-200 focus:border-brand-teal focus:ring-brand-teal disabled:bg-slate-50 disabled:text-slate-400"
                            />
                          </div>
                          <div className="md:col-span-5 space-y-2">
                            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Bond End Date</Label>
                            <Input
                              type="date"
                              value={bond.endDate || ''}
                              disabled={isExpired}
                              onChange={(e) => {
                                const newHistory = [...formData.bondsHistory]
                                newHistory[index].endDate = e.target.value
                                handleChange('bondsHistory', newHistory)
                              }}
                              className="h-10 rounded-lg border-gray-200 focus:border-brand-teal focus:ring-brand-teal disabled:bg-slate-50 disabled:text-slate-400"
                            />
                          </div>
                        <div className="md:col-span-2 flex items-center justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 h-10 w-10 rounded-lg"
                            onClick={() => {
                              const newHistory = formData.bondsHistory.filter((_: any, idx: number) => idx !== index)
                              handleChange('bondsHistory', newHistory)
                              if (newHistory.length === 0) {
                                handleChange('hasBond', false)
                              }
                            }}
                            title="Delete Bond Record"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                    })}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="border-dashed border-brand-teal text-brand-teal hover:bg-brand-teal/5 font-bold h-10 rounded-lg flex items-center gap-2"
                    onClick={() => {
                      const newHistory = [...(formData.bondsHistory || []), { id: String(Date.now()), startDate: '', endDate: '', status: 'active' }]
                      handleChange('bondsHistory', newHistory)
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Renew / Add New Bond
                  </Button>
                </div>
              )}
            </div>

            {/* Notice Period Checkbox and fields */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="hasNoticePeriod"
                  checked={formData.hasNoticePeriod}
                  onCheckedChange={(checked) => handleChange('hasNoticePeriod', checked)}
                  className="data-[state=checked]:bg-brand-teal data-[state=checked]:border-brand-teal"
                />
                <Label htmlFor="hasNoticePeriod" className="text-sm font-semibold text-gray-700 cursor-pointer">
                  Employee is on Notice Period
                </Label>
              </div>
              {formData.hasNoticePeriod && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7 animate-in fade-in slide-in-from-left-2 duration-200">
                  <div className="space-y-2">
                    <Label htmlFor="noticePeriodStartDate" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Notice Period Start Date</Label>
                    <Input
                      id="noticePeriodStartDate"
                      type="date"
                      value={formData.noticePeriodStartDate || ''}
                      onChange={(e) => handleChange('noticePeriodStartDate', e.target.value)}
                      className="h-10 rounded-lg border-gray-200 focus:border-brand-teal focus:ring-brand-teal"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="noticePeriodDays" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Notice Period Days</Label>
                    <Input
                      id="noticePeriodDays"
                      type="number"
                      placeholder="e.g. 30"
                      value={formData.noticePeriodDays || ''}
                      onChange={(e) => handleChange('noticePeriodDays', e.target.value)}
                      className="h-10 rounded-lg border-gray-200 focus:border-brand-teal focus:ring-brand-teal"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Resignation Checkbox and fields */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="hasResignation"
                  checked={formData.hasResignation}
                  onCheckedChange={(checked) => handleChange('hasResignation', checked)}
                  className="data-[state=checked]:bg-brand-teal data-[state=checked]:border-brand-teal"
                />
                <Label htmlFor="hasResignation" className="text-sm font-semibold text-gray-700 cursor-pointer">
                  Employee has Resigned
                </Label>
              </div>
              {formData.hasResignation && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7 animate-in fade-in slide-in-from-left-2 duration-200">
                  <div className="space-y-2">
                    <Label htmlFor="resignationDate" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Resignation Date</Label>
                    <Input
                      id="resignationDate"
                      type="date"
                      value={formData.resignationDate || ''}
                      onChange={(e) => handleChange('resignationDate', e.target.value)}
                      className="h-10 rounded-lg border-gray-200 focus:border-brand-teal focus:ring-brand-teal"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Employment Checkbox and fields */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="hasEmployment"
                  checked={formData.hasEmployment}
                  onCheckedChange={(checked) => handleChange('hasEmployment', checked)}
                  className="data-[state=checked]:bg-brand-teal data-[state=checked]:border-brand-teal"
                />
                <Label htmlFor="hasEmployment" className="text-sm font-semibold text-gray-700 cursor-pointer">
                  Employee Accepted Employment
                </Label>
              </div>
              {formData.hasEmployment && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7 animate-in fade-in slide-in-from-left-2 duration-200">
                  <div className="space-y-2">
                    <Label htmlFor="employmentStartDate" className="text-xs font-semibold text-gray-500 tracking-wider">Employment Start Date</Label>
                    <Input
                      id="employmentStartDate"
                      type="date"
                      value={formData.employmentStartDate || ''}
                      onChange={(e) => handleChange('employmentStartDate', e.target.value)}
                      className="h-10 rounded-lg border-gray-200 focus:border-brand-teal focus:ring-brand-teal"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-6 pt-12">
        <Button
          type="submit"
          className="bg-brand-teal hover:bg-brand-teal-light text-white min-w-[140px] h-11 text-lg font-bold rounded-lg shadow-lg shadow-brand-teal/20 transition-all active:scale-95"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
        <Link href="/employees">
          <Button
            type="button"
            className="bg-brand-teal hover:bg-brand-teal-light text-white min-w-[140px] h-11 text-lg font-bold rounded-lg shadow-lg shadow-brand-teal/20 transition-all active:scale-95 border-none"
          >
            Cancel
          </Button>
        </Link>
      </div>
    </form>
  )
}

function FormField({ label, id, required, value, onChange, placeholder, type = 'text', className = "", rightElement }: any) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <Label htmlFor={id} className="w-44 text-left font-medium text-gray-700 whitespace-nowrap">
        {label}{required && <span className="text-red-500 ml-1 text-lg font-bold">*</span>}:
      </Label>
      <div className="relative flex-1">
        <Input
          id={id}
          type={type}
          placeholder={placeholder || `Enter ${label.toLowerCase()}`}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="w-full bg-white border-gray-200 focus-visible:ring-brand-teal h-10 shadow-sm pr-10"
        />
        {rightElement}
      </div>
    </div>
  )
}

function FormSelect({ label, id, required, value, onValueChange, options, placeholder, className = "" }: any) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <Label htmlFor={id} className="w-44 text-left font-medium text-gray-700 whitespace-nowrap">
        {label}{required && <span className="text-red-500 ml-1 text-lg font-bold">*</span>}:
      </Label>
      <Select 
        key={`${id}-${value}-${options.length}`} 
        value={value || ''} 
        onValueChange={onValueChange} 
        required={required}
      >
        <SelectTrigger className="flex-1 bg-white border-gray-200 focus:ring-brand-teal h-10 shadow-sm">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.length === 0 ? (
            <div className="p-2 text-xs text-muted-foreground text-center">Loading options...</div>
          ) : (
            options.map((opt: any) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

    </div>
  )
}

function QuickAddDept({ onAdded }: { onAdded: () => void }) {
  const [name, setName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setIsSaving(true)
    try {
      const res = await fetch(`${API_URL}/departments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })
      if (res.ok) {
        onAdded()
        setName('')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label>Department Name</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. HR, Tech" />
      </div>
      <Button 
        type="button"
        className="w-full bg-brand-teal text-white hover:bg-brand-teal-light" 
        onClick={handleSave}
        disabled={isSaving}
      >
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Department'}
      </Button>
    </div>
  )
}
