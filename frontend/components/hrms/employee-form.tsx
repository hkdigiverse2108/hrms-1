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
import { useApi } from '@/hooks/useApi'
import { Save, Plus, Loader2, Image as ImageIcon, X, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { API_URL } from '@/lib/config'

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
  designation: '',
  startTime: '',
  endTime: '',
  profilePhoto: '',
  status: 'active',
}

export function EmployeeForm({ initialData, onSubmit, isSubmitting, mode }: EmployeeFormProps) {
  const { data } = useApi()
  const departments = data?.departments || []
  const designations = data?.designations || []
  const roles = data?.roles || []
  const relations = data?.relations || []
  
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
            sanitizedData[k] = String(value)
          } else if (k === 'password') {
            sanitizedData[k] = String(value)
          } else if (typeof value === 'object' && value !== null) {
            // Handle if backend returns an object for a field (e.g., department: {name: '...'})
            sanitizedData[k] = String((value as any).name || (value as any).title || (value as any).label || JSON.stringify(value))
          } else {
            sanitizedData[k] = String(value)
          }
        } else {
          sanitizedData[k] = (defaultFormData as any)[k] || ''
        }
      })
      
      console.log("DEBUG: Final sanitizedData", sanitizedData);
      setFormData(sanitizedData)
    }
  }, [initialData])


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleChange = (field: keyof EmployeeFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

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
        // Store the full URL returned by the backend
        handleChange('profilePhoto', data.url)
      } else {
        alert('Failed to upload image')
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Error uploading file')
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
        <FormField label="First Name" id="firstName" required value={formData.firstName} onChange={v => handleChange('firstName', v)} />
        <FormField label="Middle Name" id="middleName" value={formData.middleName} onChange={v => handleChange('middleName', v)} />
        <FormField label="Last Name" id="lastName" required value={formData.lastName} onChange={v => handleChange('lastName', v)} />

        {/* Row 2 */}
        <FormField label="Email" id="email" type="email" required value={formData.email} onChange={v => handleChange('email', v)} placeholder="example@email.com" />
        <FormField label="Phone Number" id="phone" required value={formData.phone} onChange={v => handleChange('phone', v)} placeholder="Enter phone number" />
        <FormField 
          label="Password" 
          id="password" 
          type={showPassword ? "text" : "password"} 
          required={mode === 'add'} 
          value={formData.password} 
          onChange={v => handleChange('password', v)} 
          placeholder={mode === 'edit' ? "Leave blank to keep current" : "............"} 
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
        <FormField label="DOB" id="dob" type="date" required value={formData.dob} onChange={v => handleChange('dob', v)} />
        <FormField label="Joining Date" id="joinDate" type="date" required value={formData.joinDate} onChange={v => handleChange('joinDate', v)} />
        <FormField label="Salary" id="salary" type="number" required value={formData.salary} onChange={v => handleChange('salary', v)} placeholder="Enter salary" />

        <FormSelect
          key={`role-${roles.length}`}
          label="Role"
          id="role"
          required
          value={formData.role}
          onValueChange={(v) => handleChange('role', v)}
          options={roles.map((r: any) => ({ label: r.name, value: r.name }))}
          placeholder="Select role"
        />
      </div>
 
      {/* Dynamic Conditional Sections */}
      {formData.role !== 'Admin' && (
        <>
          {/* Bank Details Card */}
          <Card className="relative pt-6 border border-gray-200 shadow-sm rounded-xl overflow-visible mt-12">
            <div className="absolute -top-4 left-4 bg-white px-6 py-2 border border-gray-200 rounded-lg shadow-sm text-sm font-semibold text-gray-700">
              Bank Details
            </div>
            <CardContent className="pt-8 px-8 pb-10">
              <div className="grid gap-x-16 gap-y-6 md:grid-cols-2">
                <FormField label="UPI ID" id="upiId" required={formData.role !== 'Admin'} value={formData.upiId} onChange={v => handleChange('upiId', v)} />
                <FormField label="Account Number" id="accountNumber" required={formData.role !== 'Admin'} value={formData.accountNumber} onChange={v => handleChange('accountNumber', v)} />
                <FormField label="IFSC Code" id="ifscCode" required={formData.role !== 'Admin'} value={formData.ifscCode} onChange={v => handleChange('ifscCode', v)} />
                <FormField label="Bank Name" id="bankName" required={formData.role !== 'Admin'} value={formData.bankName} onChange={v => handleChange('bankName', v)} />
                <FormField label="Account Holder Name" id="accountHolderName" required={formData.role !== 'Admin'} value={formData.accountHolderName} onChange={v => handleChange('accountHolderName', v)} />
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
                <FormField label="Parent Name" id="parentName" required={formData.role !== 'Admin'} value={formData.parentName} onChange={v => handleChange('parentName', v)} />
                <FormField label="Parent Number" id="parentNumber" required={formData.role !== 'Admin'} value={formData.parentNumber} onChange={v => handleChange('parentNumber', v)} />
                <FormSelect
                  key={`rel-${relations.length}`}
                  label="Relationship"
                  id="relation"
                  value={formData.relation}
                  onValueChange={(v) => handleChange('relation', v)}
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
          <Label className="w-32 text-gray-500 font-medium">Employee ID:</Label>
          <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600 font-mono text-sm">
            {formData.employeeId || 'System Generated'}
          </div>
        </div>
        
        {formData.role !== 'Admin' && (
          <>
            <FormField label="Aadhar Card" id="aadharCard" value={formData.aadharCard} onChange={v => handleChange('aadharCard', v)} />
            <FormField label="PAN Card" id="panCard" value={formData.panCard} onChange={v => handleChange('panCard', v)} />
          </>
        )}
        
        <FormSelect key={`dept-${departments.length}`} label="Department" id="department" required value={formData.department} onValueChange={v => handleChange('department', v)} options={departments.map((d: any) => ({ label: d.name, value: d.name }))} placeholder="Select department" />
        <FormSelect key={`des-${designations.length}-${formData.department}`} label="Designation" id="designation" required value={formData.designation} onValueChange={v => handleChange('designation', v)} options={designations.filter((d: any) => d.department === formData.department).map((d: any) => ({ label: d.title, value: d.title }))} placeholder="Select designation" />
        
        <FormSelect 
          label="Status" 
          id="status" 
          required 
          value={formData.status} 
          onValueChange={v => handleChange('status', v)} 
          options={[
            { label: 'Active', value: 'active' },
            { label: 'Inactive', value: 'inactive' }
          ]} 
          placeholder="Select status" 
        />

        {/* Working Hours */}
        <div className="flex items-center gap-4">
          <Label className="w-44 text-right pr-4 font-medium text-gray-700">
            <span className="text-red-500 mr-2 text-lg font-bold">*</span>Working Hours:
          </Label>
          <div className="flex items-center gap-4 flex-1 max-w-[400px]">
            <Input type="time" value={formData.startTime} onChange={(e) => handleChange('startTime', e.target.value)} />
            <span className="text-gray-400 font-medium whitespace-nowrap">to</span>
            <Input type="time" value={formData.endTime} onChange={(e) => handleChange('endTime', e.target.value)} />
          </div>
        </div>

        {/* Profile Photo */}
        <div className="flex items-start gap-4">
          <Label className="w-44 text-right pr-4 font-medium text-gray-700 pt-3">
            <span className="text-red-500 mr-2 text-lg font-bold">*</span>Profile Photo:
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
                  src={formData.profilePhoto.startsWith('http') ? formData.profilePhoto : `${API_URL}/uploads/${formData.profilePhoto}`} 
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
              accept="image/*"
              onChange={handleFileUpload}
            />
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
      <Label htmlFor={id} className="w-44 text-right pr-2 font-medium text-gray-700 whitespace-nowrap">
        {required && <span className="text-red-500 mr-2 text-lg font-bold">*</span>}
        {label}:
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
      <Label htmlFor={id} className="w-44 text-right pr-2 font-medium text-gray-700 whitespace-nowrap">
        {required && <span className="text-red-500 mr-2 text-lg font-bold">*</span>}
        {label}:
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
