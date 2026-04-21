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
import { Save, Plus, Loader2, Image as ImageIcon, X } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { API_URL } from '@/lib/config'

export interface EmployeeFormData {
  firstName: string
  middleName: string
  lastName: string
  email: string
  phone: string
  password?: string
  dob: string
  joinDate: string
  salary: string
  company: string
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
  position: string
  department: string
  designation: string
  startTime: string
  endTime: string
  profilePhoto: string
}

interface EmployeeFormProps {
  initialData?: Partial<EmployeeFormData>
  onSubmit: (data: EmployeeFormData) => Promise<void>
  isSubmitting: boolean
  mode: 'add' | 'edit'
}

const defaultFormData: EmployeeFormData = {
  firstName: '',
  middleName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  dob: '',
  joinDate: '',
  salary: '',
  company: '',
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
  position: '',
  department: '',
  designation: '',
  startTime: '',
  endTime: '',
  profilePhoto: '',
}

export function EmployeeForm({ initialData, onSubmit, isSubmitting, mode }: EmployeeFormProps) {
  const { data } = useApi()
  const departments = data?.departments || []
  const designations = data?.designations || []
  const companies = data?.companies || []
  const roles = data?.roles || []
  const relations = data?.relations || []
  const positions = data?.positions || []
  
  const [formData, setFormData] = useState<EmployeeFormData>(defaultFormData)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (initialData) {
      const sanitizedData = { ...defaultFormData }
      
      // Map all keys from initialData, ensuring null/undefined become empty strings
      Object.keys(defaultFormData).forEach((key) => {
        const k = key as keyof EmployeeFormData
        if (initialData[k] !== undefined && initialData[k] !== null) {
          if (k === 'salary') {
            sanitizedData[k] = initialData[k]?.toString() || ''
          } else {
            // @ts-ignore
            sanitizedData[k] = initialData[k]
          }
        } else {
          // @ts-ignore
          sanitizedData[k] = ''
        }
      })
      
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
        handleChange('profilePhoto', data.filename)
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
        <FormField label="Password" id="password" type="password" required={mode === 'add'} value={formData.password} onChange={v => handleChange('password', v)} placeholder={mode === 'edit' ? "Leave blank to keep current" : "............"} />

        {/* Row 3 */}
        <FormField label="DOB" id="dob" type="date" required value={formData.dob} onChange={v => handleChange('dob', v)} />
        <FormField label="Joining Date" id="joinDate" type="date" required value={formData.joinDate} onChange={v => handleChange('joinDate', v)} />
        <FormField label="Salary" id="salary" type="number" required value={formData.salary} onChange={v => handleChange('salary', v)} placeholder="Enter salary" />

        {/* Row 4 */}
        <FormSelect
          label="Company"
          id="company"
          value={formData.company}
          onValueChange={(v) => handleChange('company', v)}
          options={companies.map((c: any) => ({ label: c.name, value: c.name }))}
          placeholder="Select company"
        />
        <FormSelect
          label="Role"
          id="role"
          value={formData.role}
          onValueChange={(v) => handleChange('role', v)}
          options={roles.map((r: any) => ({ label: r.name, value: r.name }))}
          placeholder="Select role"
        />
  </div>

      {/* Bank Details Card */}
      <Card className="relative pt-6 border border-gray-200 shadow-sm rounded-xl overflow-visible mt-12">
        <div className="absolute -top-4 left-4 bg-white px-6 py-2 border border-gray-200 rounded-lg shadow-sm text-sm font-semibold text-gray-700">
          Bank Details
        </div>
        <CardContent className="pt-8 px-8 pb-10">
          <div className="grid gap-x-16 gap-y-6 md:grid-cols-2">
            <FormField label="UPI ID" id="upiId" required value={formData.upiId} onChange={v => handleChange('upiId', v)} />
            <FormField label="Account Number" id="accountNumber" required value={formData.accountNumber} onChange={v => handleChange('accountNumber', v)} />
            <FormField label="IFSC Code" id="ifscCode" required value={formData.ifscCode} onChange={v => handleChange('ifscCode', v)} />
            <FormField label="Bank Name" id="bankName" required value={formData.bankName} onChange={v => handleChange('bankName', v)} />
            <FormField label="Account Holder Name" id="accountHolderName" required value={formData.accountHolderName} onChange={v => handleChange('accountHolderName', v)} />
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
            <FormField label="Parent Name" id="parentName" required value={formData.parentName} onChange={v => handleChange('parentName', v)} />
            <FormField label="Parent Number" id="parentNumber" required value={formData.parentNumber} onChange={v => handleChange('parentNumber', v)} />
            <FormSelect
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

      {/* Professional Details Section */}
      <div className="space-y-6 pt-6 max-w-4xl">
        <FormField label="Aadhar Card" id="aadharCard" value={formData.aadharCard} onChange={v => handleChange('aadharCard', v)} />
        <FormField label="PAN Card" id="panCard" value={formData.panCard} onChange={v => handleChange('panCard', v)} />
        
        <FormSelect label="Position" id="position" required value={formData.position} onValueChange={v => handleChange('position', v)} options={positions.map((p: any) => ({ label: p.name, value: p.name }))} placeholder="Select position" />
        <FormSelect label="Department" id="department" required value={formData.department} onValueChange={v => handleChange('department', v)} options={departments.map((d: any) => ({ label: d.name, value: d.name }))} placeholder="Select department" />
        <FormSelect label="Designation" id="designation" required value={formData.designation} onValueChange={v => handleChange('designation', v)} options={designations.filter((d: any) => d.department === formData.department).map((d: any) => ({ label: d.title, value: d.title }))} placeholder="Select designation" />

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
                <Loader2 className="h-6 w-6 text-orange-500 animate-spin" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Uploading...</span>
              </div>
            ) : formData.profilePhoto ? (
              <div className="relative w-full h-full group">
                <img 
                  src={`${API_URL}/uploads/${formData.profilePhoto}`} 
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
                <div className="bg-gray-100 p-2 rounded-full mb-1 group-hover:bg-orange-50 transition-colors">
                  <Plus className="h-6 w-6 text-gray-400 group-hover:text-orange-500" />
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
          className="bg-orange-500 hover:bg-orange-600 text-white min-w-[140px] h-11 text-lg font-bold rounded-lg shadow-lg shadow-orange-500/20 transition-all active:scale-95"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
        <Link href="/employees">
          <Button
            type="button"
            className="bg-orange-500 hover:bg-orange-600 text-white min-w-[140px] h-11 text-lg font-bold rounded-lg shadow-lg shadow-orange-500/20 transition-all active:scale-95 border-none"
          >
            Cancel
          </Button>
        </Link>
      </div>
    </form>
  )
}

function FormField({ label, id, required, value, onChange, placeholder, type = 'text', className = "" }: any) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <Label htmlFor={id} className="w-44 text-right pr-2 font-medium text-gray-700 whitespace-nowrap">
        {required && <span className="text-red-500 mr-2 text-lg font-bold">*</span>}
        {label}:
      </Label>
      <Input
        id={id}
        type={type}
        placeholder={placeholder || `Enter ${label.toLowerCase()}`}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="flex-1 bg-white border-gray-200 focus-visible:ring-orange-500 h-10 shadow-sm"
      />
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
      <Select value={value || ''} onValueChange={onValueChange} required={required}>
        <SelectTrigger className="flex-1 bg-white border-gray-200 focus:ring-orange-500 h-10 shadow-sm">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt: any) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
