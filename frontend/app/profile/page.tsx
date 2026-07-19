'use client'

import { useState, useRef, useEffect } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useUser } from '@/hooks/useUser'
import { useApi } from '@/hooks/useApi'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Camera, 
  Mail, 
  Phone, 
  Briefcase, 
  Building2, 
  Calendar, 
  Loader2, 
  User, 
  Lock, 
  Unlock, 
  Users, 
  CreditCard, 
  Banknote, 
  Clock, 
  X,
  Save,
  Eye,
  EyeOff,
  Upload,
  Trash2,
  PenTool,
  Plus
} from 'lucide-react'
import { API_URL, getAvatarUrl } from '@/lib/config'
import { QuickActionsWidget } from '@/components/dashboard/QuickActionsWidget'
import { useUserContext } from "@/context/UserContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

import { TIME_OPTIONS } from "@/lib/constants";

// Utility helpers for time input conversions
function convertTo24Hour(timeStr: string): string {
  if (!timeStr) return "09:00"
  timeStr = timeStr.trim()
  if (/^\d{2}:\d{2}$/.test(timeStr)) return timeStr
  
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (match) {
    let hours = parseInt(match[1], 10)
    const minutes = match[2]
    const ampm = match[3].toUpperCase()
    
    if (ampm === 'PM' && hours < 12) hours += 12
    if (ampm === 'AM' && hours === 12) hours = 0
    
    return `${String(hours).padStart(2, '0')}:${minutes}`
  }
  return timeStr
}

function convertTo12Hour(timeStr: string): string {
  if (!timeStr) return "09:00 AM"
  timeStr = timeStr.trim()
  const match = timeStr.match(/^(\d{2}):(\d{2})$/)
  if (match) {
    let hours = parseInt(match[1], 10)
    const minutes = match[2]
    const ampm = hours >= 12 ? 'PM' : 'AM'
    
    hours = hours % 12
    if (hours === 0) hours = 12
    
    return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`
  }
  return timeStr
}

export default function ProfilePage() {
  const { user, setUser, isLoading: userLoading } = useUser()
  const { data: apiData } = useApi()
  
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isUploadingSignature, setIsUploadingSignature] = useState(false)
  const [activeTab, setActiveTab] = useState<'personal' | 'professional' | 'bank_family'>('personal')
  const [formData, setFormData] = useState<any>({})
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return

    setIsUploadingSignature(true)
    try {
      const fileFormData = new FormData()
      fileFormData.append('file', file)

      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: fileFormData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload signature')
      }

      const data = await response.json()
      
      const updateRes = await fetch(`${API_URL}/employees/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureUrl: data.url })
      })

      if (updateRes.ok) {
        const updatedUser = await updateRes.json()
        const pRes = await fetch(`${API_URL}/user-permissions/${user.id}`)
        const pData = pRes.ok ? await pRes.json() : { permissions: [] }
        const finalUser = {
          ...updatedUser,
          permissions: pData?.permissions || []
        }
        setUser(finalUser)
        localStorage.setItem('user', JSON.stringify(finalUser))
        toast.success("Signature uploaded successfully!")
      } else {
        toast.error("Failed to update profile with signature.")
      }
    } catch (error) {
      console.error('Signature upload error:', error)
      toast.error("An error occurred during upload.")
    } finally {
      setIsUploadingSignature(false)
    }
  }

  const handleRemoveSignature = async () => {
    if (!user?.id) return
    setIsUploadingSignature(true)
    try {
      const updateRes = await fetch(`${API_URL}/employees/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureUrl: null })
      })

      if (updateRes.ok) {
        const updatedUser = await updateRes.json()
        const pRes = await fetch(`${API_URL}/user-permissions/${user.id}`)
        const pData = pRes.ok ? await pRes.json() : { permissions: [] }
        const finalUser = {
          ...updatedUser,
          permissions: pData?.permissions || []
        }
        setUser(finalUser)
        localStorage.setItem('user', JSON.stringify(finalUser))
        toast.success("Signature removed successfully!")
      } else {
        toast.error("Failed to remove signature.")
      }
    } catch (error) {
      console.error('Remove signature error:', error)
      toast.error("An error occurred.")
    } finally {
      setIsUploadingSignature(false)
    }
  }

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const departments = apiData?.departments || []
  const designations = apiData?.designations || []
  const roles = apiData?.roles || []
  const relations = apiData?.relations || []

  const genderOptions = [
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' },
    { label: 'Other', value: 'Other' }
  ]

  const relationOptions = relations.length > 0 
    ? relations.map((r: any) => ({ label: r.name, value: r.name }))
    : [
        { label: 'Father', value: 'Father' },
        { label: 'Mother', value: 'Mother' },
        { label: 'Spouse', value: 'Spouse' },
        { label: 'Guardian', value: 'Guardian' }
      ]

  const departmentOptions = departments.map((d: any) => ({ label: d.name, value: d.name }))
  
  const currentDept = isEditing ? formData.department : user?.department
  const designationOptions = designations
    .filter((d: any) => d.department === currentDept)
    .map((d: any) => ({ label: d.title, value: d.title }))

  useEffect(() => {
    if (!isEditing) {
      setFocusedField(null)
    }
  }, [isEditing])

  if (userLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-teal" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Please log in to view your profile.</p>
      </div>
    )
  }

  const userName = user.name || "Guest"
  const initials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase()
  const isAdmin = user.role === 'Admin'

  const handleEditClick = (fieldId?: string) => {
    setFormData({
      firstName: user.firstName || '',
      middleName: user.middleName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: user.phone || '',
      dob: user.dob || '',
      gender: user.gender || 'Male',
      department: user.department || '',
      designation: user.designation || '',
      position: user.position || 'Intern',
      role: user.role || '',
      status: user.status || 'active',
      joinDate: user.joinDate || '',
      salary: user.salary ? String(user.salary) : '',
      company: user.company || 'Hk DigiVerse',
      startTime: convertTo24Hour(user.startTime),
      endTime: convertTo24Hour(user.endTime),
      upiId: user.upiId || '',
      accountNumber: user.accountNumber || '',
      ifscCode: user.ifscCode || '',
      bankName: user.bankName || '',
      accountHolderName: user.accountHolderName || '',
      parentName: user.parentName || '',
      parentNumber: user.parentNumber || '',
      relation: user.relation || '',
      aadharCard: user.aadharCard || '',
      panCard: user.panCard || '',
      profilePhoto: user.profilePhoto || ''
    })
    setIsEditing(true)
    if (fieldId && typeof fieldId === 'string') {
      setFocusedField(fieldId)
    } else {
      setFocusedField(null)
    }
  }

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      if (!formData.firstName || !formData.lastName) {
        setIsSaving(false)
        return
      }

      const payload = { ...formData }
      
      if (payload.startTime) {
        payload.startTime = convertTo12Hour(payload.startTime)
      }
      if (payload.endTime) {
        payload.endTime = convertTo12Hour(payload.endTime)
      }

      if (payload.salary === "" || payload.salary === undefined || payload.salary === null) {
        payload.salary = null
      } else {
        const parsed = parseFloat(payload.salary)
        payload.salary = isNaN(parsed) ? null : parsed
      }

      if (payload.dob === "") payload.dob = null
      if (payload.joinDate === "") payload.joinDate = null

      const response = await fetch(`${API_URL}/employees/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      const updatedUser = await response.json()
      
      const pRes = await fetch(`${API_URL}/user-permissions/${user.id}`)
      const pData = pRes.ok ? await pRes.json() : { permissions: [] }
      const finalUser = {
        ...updatedUser,
        permissions: pData?.permissions || []
      }

      setUser(finalUser)
      localStorage.setItem('user', JSON.stringify(finalUser))
      setIsEditing(false)
    } catch (error) {
      console.error('Update error:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    
    setIsChangingPassword(true)
    try {
      const response = await fetch(`${API_URL}/employees/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: newPassword }),
      })

      if (!response.ok) {
        throw new Error('Failed to update password')
      }
      
      toast.success('Password changed successfully')
      setIsPasswordModalOpen(false)
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      console.error('Password update error:', error)
      toast.error('Failed to update password')
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      return
    }

    const fileFormData = new FormData()
    fileFormData.append('file', file)

    setIsUploading(true)
    try {
      const response = await fetch(`${API_URL}/upload-profile-photo/${user.id}`, {
        method: 'POST',
        body: fileFormData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload photo')
      }

      const updatedUser = await response.json()
      
      const pRes = await fetch(`${API_URL}/user-permissions/${user.id}`)
      const pData = pRes.ok ? await pRes.json() : { permissions: [] }
      const finalUser = {
        ...updatedUser,
        permissions: pData?.permissions || []
      }

      setUser(finalUser)
      localStorage.setItem('user', JSON.stringify(finalUser))
      
      if (isEditing) {
        setFormData((prev: any) => ({ ...prev, profilePhoto: finalUser.profilePhoto }))
      }
    } catch (error) {
      console.error('Upload error:', error)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const tabs = [
    { id: 'personal', label: 'Personal & Identity' },
    ...(!isAdmin ? [
      { id: 'professional', label: 'Professional Info' },
      { id: 'bank_family', label: 'Bank & Family' },
    ] : [])
  ]

  return (
    <div className="space-y-4 w-full">
      <PageHeader title="My Profile" description="Manage your personal details and bank info. Sensitive administrative, identity, and salary parameters are locked for standard employees." />

      <form onSubmit={handleSave} className="grid gap-4 lg:grid-cols-4 w-full items-stretch">
        {/* Left Column - Profile Card */}
        <div className="lg:col-span-1">
          <Card className="min-h-[500px] lg:h-[calc(100vh-180px)] border border-gray-100 shadow-sm rounded-xl bg-white flex flex-col">
            <CardContent className="pt-8 pb-8 flex flex-col items-center flex-1 px-6 space-y-6 overflow-y-auto custom-scrollbar">
              {/* Top Profile block */}
              <div className="flex flex-col items-center text-center">
                <div className="relative group cursor-pointer" onClick={handleAvatarClick} title="Click to upload a new profile photo">
                  <Avatar className="h-28 w-28 border-4 border-white shadow-xl group-hover:scale-102 transition-transform duration-300">
                    <AvatarImage 
                      src={getAvatarUrl(isEditing ? formData.profilePhoto : user.profilePhoto, userName)} 
                      alt={userName} 
                    />
                    <AvatarFallback className="text-2xl bg-brand-teal text-white font-bold">{initials}</AvatarFallback>
                  </Avatar>

                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {isUploading ? (
                      <Loader2 className="h-7 w-7 animate-spin text-white" />
                    ) : (
                      <Camera className="h-7 w-7 text-white scale-90 group-hover:scale-100 transition-transform duration-300" />
                    )}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    disabled={isUploading}
                  />
                </div>
                
                <h3 className="mt-4 text-lg font-extrabold text-gray-800 tracking-tight">{userName}</h3>
                <p className="text-brand-teal font-semibold text-xs mt-0.5">{user.designation}</p>
                
                <div className="mt-3">
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200/50 font-bold px-2.5 py-0.5 text-[9px] uppercase tracking-wider">
                    {user.status ? user.status.toUpperCase() : 'ACTIVE'}
                  </Badge>
                </div>
              </div>

              {/* Bottom contact block - stacked directly under avatar */}
              <div className="w-full bg-gray-50/50 border border-gray-100 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <div className="p-1.5 bg-white border border-gray-100 rounded-lg">
                    <Mail className="h-3.5 w-3.5 text-gray-400" />
                  </div>
                  <span className="font-semibold break-all text-[11px]">{user.email}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <div className="p-1.5 bg-white border border-gray-100 rounded-lg">
                    <Phone className="h-3.5 w-3.5 text-gray-400" />
                  </div>
                  <span className="font-semibold text-[11px]">{user.phone || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <div className="p-1.5 bg-white border border-gray-100 rounded-lg">
                    <Building2 className="h-3.5 w-3.5 text-gray-400" />
                  </div>
                  <span className="font-semibold text-[11px]">{user.department}</span>
                </div>
                
                <div className="pt-2 w-full">
                  <Button 
                    type="button"
                    onClick={() => setIsPasswordModalOpen(true)}
                    variant="outline"
                    className="w-full text-brand-teal border-brand-teal/20 hover:bg-brand-teal/5 font-bold h-10 text-xs rounded-xl transition-all"
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Change Password
                  </Button>
                </div>
              </div>

              {/* Signature block */}
              <div className="w-full bg-gray-50/50 border border-gray-100 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                  <PenTool className="h-3.5 w-3.5 text-brand-teal" />
                  <span>My Signature</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-normal">
                  This signature is used when generating dynamic documents like Offer Letters.
                </p>
                {user.signatureUrl ? (
                  <div className="relative border border-slate-200 rounded-lg bg-white p-2 flex justify-center items-center h-16">
                    <img 
                      src={user.signatureUrl.startsWith('http') ? user.signatureUrl : `${API_URL}${user.signatureUrl}`} 
                      alt="My Signature"
                      className="max-h-12 object-contain"
                    />
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-300 rounded-lg bg-white h-16 flex items-center justify-center">
                    <span className="text-[10px] text-slate-400 font-medium">No signature uploaded</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2 pt-1">
                  <Button asChild variant="outline" size="sm" className="flex-1 border-brand-teal text-brand-teal text-xs h-8 cursor-pointer hover:bg-brand-teal/5 hover:text-brand-teal">
                    <label className="cursor-pointer flex items-center justify-center w-full h-full">
                      {isUploadingSignature ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 mr-1" />
                      )}
                      {user.signatureUrl ? 'Change' : 'Upload'}
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleSignatureUpload} 
                        disabled={isUploadingSignature} 
                      />
                    </label>
                  </Button>
                  {user.signatureUrl && (
                    <Button 
                      type="button"
                      variant="destructive" 
                      size="sm" 
                      className="h-8 text-xs px-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 shadow-none hover:text-red-700"
                      onClick={handleRemoveSignature}
                      disabled={isUploadingSignature}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Shortcut configuration block */}
              <div className="w-full bg-gray-50/50 border border-gray-100 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                  <Plus className="h-3.5 w-3.5 text-brand-teal" />
                  <span>Configure Header Shortcuts</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-normal">
                  Pin your favorite pages and tools to the top header for easy, one-click access.
                </p>
                <div className="pt-1">
                  <QuickActionsWidget 
                    user={user} 
                    onlyConfigButton={true}
                    onUpdate={(newUser) => {
                      setUser(newUser);
                    }} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Details with Tab System */}
        <div className="lg:col-span-3">
          <Card className="min-h-[500px] lg:h-[calc(100vh-180px)] border border-gray-100 shadow-sm rounded-xl overflow-hidden bg-white flex flex-col justify-between">
            <div className="flex flex-col h-full overflow-hidden">
              <CardHeader className="pb-0 border-b border-gray-100 px-6 flex-shrink-0">
                <div className="flex flex-wrap gap-2 -mb-px">
                  {tabs.map((tab) => {
                    const isActive = activeTab === tab.id
                    return (
                      <button
                        type="button"
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id as any)
                          setFocusedField(null)
                        }}
                        className={`pb-3 px-4 font-bold text-xs border-b-2 transition-all relative ${
                          isActive 
                            ? 'border-brand-teal text-brand-teal font-extrabold' 
                            : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200'
                        }`}
                      >
                        {tab.label}
                      </button>
                    )
                  })}
                </div>
              </CardHeader>
              
              <CardContent className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                {/* 1. PERSONAL TAB */}
                {activeTab === 'personal' && (
                  <div className="grid gap-x-6 gap-y-5 sm:grid-cols-3">
                    <ProfileField 
                      label="First Name" 
                      id="firstName" 
                      value={isEditing ? formData.firstName : user.firstName} 
                      isEditing={isEditing} 
                      onChange={(v) => handleFieldChange('firstName', v)} 
                      required 
                      icon={User} 
                      onEditInitiate={handleEditClick}
                      focusedField={focusedField}
                    />
                    <ProfileField 
                      label="Middle Name" 
                      id="middleName" 
                      value={isEditing ? formData.middleName : user.middleName} 
                      isEditing={isEditing} 
                      onChange={(v) => handleFieldChange('middleName', v)} 
                      icon={User} 
                      onEditInitiate={handleEditClick}
                      focusedField={focusedField}
                    />
                    <ProfileField 
                      label="Last Name" 
                      id="lastName" 
                      value={isEditing ? formData.lastName : user.lastName} 
                      isEditing={isEditing} 
                      onChange={(v) => handleFieldChange('lastName', v)} 
                      required 
                      icon={User} 
                      onEditInitiate={handleEditClick}
                      focusedField={focusedField}
                    />
                    <ProfileField 
                      label="Email Address" 
                      id="email" 
                      type="email" 
                      value={isEditing ? formData.email : user.email} 
                      isEditing={isEditing} 
                      onChange={(v) => handleFieldChange('email', v)} 
                      required 
                      icon={Mail} 
                      onEditInitiate={handleEditClick}
                      focusedField={focusedField}
                    />
                    <ProfileField 
                      label="Phone Number" 
                      id="phone" 
                      value={isEditing ? formData.phone : user.phone} 
                      isEditing={isEditing} 
                      onChange={(v) => handleFieldChange('phone', v)} 
                      required 
                      icon={Phone} 
                      onEditInitiate={handleEditClick}
                      focusedField={focusedField}
                    />
                    <ProfileField 
                      label="Date of Birth" 
                      id="dob" 
                      type="date" 
                      value={isEditing ? formData.dob : user.dob} 
                      isEditing={isEditing} 
                      onChange={(v) => handleFieldChange('dob', v)} 
                      required 
                      icon={Calendar} 
                      onEditInitiate={handleEditClick}
                      focusedField={focusedField}
                    />
                    <ProfileField 
                      label="Gender" 
                      id="gender" 
                      value={isEditing ? formData.gender : user.gender} 
                      isEditing={isEditing} 
                      onChange={(v) => handleFieldChange('gender', v)} 
                      required 
                      options={genderOptions} 
                      icon={Users} 
                      onEditInitiate={handleEditClick}
                      focusedField={focusedField}
                    />
                    {!isAdmin && (
                      <>
                        <ProfileField 
                          label="Aadhar Card Number" 
                          id="aadharCard" 
                          value={isEditing ? formData.aadharCard : user.aadharCard} 
                          isEditing={isEditing} 
                          onChange={(v) => handleFieldChange('aadharCard', v)} 
                          disabled={!isAdmin} 
                          icon={CreditCard} 
                          onEditInitiate={handleEditClick}
                          focusedField={focusedField}
                        />
                        <ProfileField 
                          label="PAN Card Number" 
                          id="panCard" 
                          value={isEditing ? formData.panCard : user.panCard} 
                          isEditing={isEditing} 
                          onChange={(v) => handleFieldChange('panCard', v)} 
                          disabled={!isAdmin} 
                          icon={CreditCard} 
                          onEditInitiate={handleEditClick}
                          focusedField={focusedField}
                        />
                      </>
                    )}
                  </div>
                )}

                {/* 2. PROFESSIONAL TAB (Role removed completely) */}
                {activeTab === 'professional' && (
                  <div className="grid gap-x-6 gap-y-5 sm:grid-cols-3">
                    <ProfileField 
                      label="Department" 
                      id="department" 
                      value={isEditing ? formData.department : user.department} 
                      isEditing={isEditing} 
                      onChange={(v) => handleFieldChange('department', v)} 
                      required 
                      disabled={!isAdmin} 
                      options={departmentOptions} 
                      icon={Building2} 
                      onEditInitiate={handleEditClick}
                      focusedField={focusedField}
                    />
                    <ProfileField 
                      label="Designation" 
                      id="designation" 
                      value={isEditing ? formData.designation : user.designation} 
                      isEditing={isEditing} 
                      onChange={(v) => handleFieldChange('designation', v)} 
                      required 
                      disabled={!isAdmin} 
                      options={designationOptions} 
                      icon={Briefcase} 
                      onEditInitiate={handleEditClick}
                      focusedField={focusedField}
                    />
                    <ProfileField 
                      label="Status" 
                      id="status" 
                      value={isEditing ? formData.status : user.status} 
                      isEditing={isEditing} 
                      onChange={(v) => handleFieldChange('status', v)} 
                      required 
                      disabled={!isAdmin} 
                      options={[
                        { label: 'Active', value: 'active' },
                        { label: 'Inactive', value: 'inactive' }
                      ]} 
                      icon={Lock} 
                      onEditInitiate={handleEditClick}
                      focusedField={focusedField}
                    />
                    <ProfileField 
                      label="Joining Date" 
                      id="joinDate" 
                      type="date" 
                      value={isEditing ? formData.joinDate : user.joinDate} 
                      isEditing={isEditing} 
                      onChange={(v) => handleFieldChange('joinDate', v)} 
                      required 
                      disabled={!isAdmin} 
                      icon={Calendar} 
                      onEditInitiate={handleEditClick}
                      focusedField={focusedField}
                    />
                    <ProfileField 
                      label="Salary" 
                      id="salary" 
                      type="number" 
                      value={isEditing ? formData.salary : (user.salary ? `₹${user.salary.toLocaleString()}` : '—')} 
                      isEditing={isEditing} 
                      onChange={(v) => handleFieldChange('salary', v)} 
                      required 
                      disabled={!isAdmin} 
                      icon={Banknote} 
                      onEditInitiate={handleEditClick}
                      focusedField={focusedField}
                    />
                    <ProfileField 
                      label="Start Time" 
                      id="startTime" 
                      value={isEditing ? formData.startTime : (user.startTime ? convertTo12Hour(user.startTime) : '—')} 
                      isEditing={isEditing} 
                      onChange={(v) => handleFieldChange('startTime', v)} 
                      disabled={!isAdmin} 
                      icon={Clock} 
                      options={TIME_OPTIONS.map(opt => ({ label: opt.label, value: opt.valueNoSec }))}
                      onEditInitiate={handleEditClick}
                      focusedField={focusedField}
                    />
                    <ProfileField 
                      label="End Time" 
                      id="endTime" 
                      value={isEditing ? formData.endTime : (user.endTime ? convertTo12Hour(user.endTime) : '—')} 
                      isEditing={isEditing} 
                      onChange={(v) => handleFieldChange('endTime', v)} 
                      disabled={!isAdmin} 
                      icon={Clock} 
                      options={TIME_OPTIONS.map(opt => ({ label: opt.label, value: opt.valueNoSec }))}
                      onEditInitiate={handleEditClick}
                      focusedField={focusedField}
                    />
                  </div>
                )}

                {/* 3. BANK & FAMILY TAB */}
                {activeTab === 'bank_family' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-bold text-gray-800 text-xs mb-3.5 pb-1 border-b border-gray-100 flex items-center gap-1.5">
                        <Banknote className="h-3.5 w-3.5 text-brand-teal" />
                        Bank Account Details
                      </h4>
                      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-3">
                        <ProfileField 
                          label="Account Holder Name" 
                          id="accountHolderName" 
                          value={isEditing ? formData.accountHolderName : user.accountHolderName} 
                          isEditing={isEditing} 
                          onChange={(v) => handleFieldChange('accountHolderName', v)} 
                          required 
                          icon={User} 
                          onEditInitiate={handleEditClick}
                          focusedField={focusedField}
                        />
                        <ProfileField 
                          label="Bank Name" 
                          id="bankName" 
                          value={isEditing ? formData.bankName : user.bankName} 
                          isEditing={isEditing} 
                          onChange={(v) => handleFieldChange('bankName', v)} 
                          required 
                          icon={Building2} 
                          onEditInitiate={handleEditClick}
                          focusedField={focusedField}
                        />
                        <ProfileField 
                          label="Account Number" 
                          id="accountNumber" 
                          value={isEditing ? formData.accountNumber : user.accountNumber} 
                          isEditing={isEditing} 
                          onChange={(v) => handleFieldChange('accountNumber', v)} 
                          required 
                          icon={CreditCard} 
                          onEditInitiate={handleEditClick}
                          focusedField={focusedField}
                        />
                        <ProfileField 
                          label="IFSC Code" 
                          id="ifscCode" 
                          value={isEditing ? formData.ifscCode : user.ifscCode} 
                          isEditing={isEditing} 
                          onChange={(v) => handleFieldChange('ifscCode', v)} 
                          required 
                          icon={CreditCard} 
                          onEditInitiate={handleEditClick}
                          focusedField={focusedField}
                        />
                        <ProfileField 
                          label="UPI ID" 
                          id="upiId" 
                          value={isEditing ? formData.upiId : user.upiId} 
                          isEditing={isEditing} 
                          onChange={(v) => handleFieldChange('upiId', v)} 
                          required 
                          icon={Banknote} 
                          onEditInitiate={handleEditClick}
                          focusedField={focusedField}
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <h4 className="font-bold text-gray-800 text-xs mb-3.5 pb-1 border-b border-gray-100 flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-brand-teal" />
                        Parent Details
                      </h4>
                      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-3">
                        <ProfileField 
                          label="Parent Name" 
                          id="parentName" 
                          value={isEditing ? formData.parentName : user.parentName} 
                          isEditing={isEditing} 
                          onChange={(v) => handleFieldChange('parentName', v)} 
                          required 
                          icon={User} 
                          onEditInitiate={handleEditClick}
                          focusedField={focusedField}
                        />
                        <ProfileField 
                          label="Parent Phone Number" 
                          id="parentNumber" 
                          value={isEditing ? formData.parentNumber : user.parentNumber} 
                          isEditing={isEditing} 
                          onChange={(v) => handleFieldChange('parentNumber', v)} 
                          required 
                          icon={Phone} 
                          onEditInitiate={handleEditClick}
                          focusedField={focusedField}
                        />
                        <ProfileField 
                          label="Relationship" 
                          id="relation" 
                          value={isEditing ? formData.relation : user.relation} 
                          isEditing={isEditing} 
                          onChange={(v) => handleFieldChange('relation', v)} 
                          required 
                          options={relationOptions} 
                          icon={Users} 
                          onEditInitiate={handleEditClick}
                          focusedField={focusedField}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </div>
            
            {/* Actions Footer */}
            {isEditing && (
              <CardContent className="pb-4 pt-2 border-t border-gray-50 flex items-center justify-end gap-3 px-6 flex-shrink-0">
                <Button 
                  type="button" 
                  onClick={() => setIsEditing(false)} 
                  variant="outline"
                  className="border-gray-200 text-gray-700 hover:bg-gray-50 font-bold active:scale-95 transition-all h-9 px-4 text-xs rounded-xl"
                  disabled={isSaving}
                >
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-brand-teal hover:bg-brand-teal-light text-white font-bold active:scale-95 transition-all shadow-md shadow-brand-teal/20 h-9 px-4 text-xs rounded-xl"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5 mr-1.5" />
                      Save Changes
                    </>
                  )}
                </Button>
              </CardContent>
            )}
          </Card>
        </div>
      </form>

      {/* Password Change Dialog */}
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsPasswordModalOpen(false)}
                disabled={isChangingPassword}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isChangingPassword} className="bg-brand-teal hover:bg-brand-teal-light text-white">
                {isChangingPassword ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Updating...</>
                ) : 'Update Password'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ProfileField({
  label,
  value,
  id,
  isEditing,
  onChange,
  type = 'text',
  disabled = false,
  required = false,
  placeholder = '',
  options = null,
  icon: Icon = null,
  onEditInitiate,
  focusedField
}: {
  label: string
  value: any
  id: string
  isEditing: boolean
  onChange?: (v: string) => void
  type?: string
  disabled?: boolean
  required?: boolean
  placeholder?: string
  options?: { label: string; value: string }[] | null
  icon?: any
  onEditInitiate?: (id: string) => void
  focusedField?: string | null
}) {
  if (!isEditing) {
    if (disabled) {
      return (
        <div className="h-[92px] flex flex-col justify-center bg-gray-50/40 p-4.5 rounded-xl border border-gray-100 transition-all duration-200">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
            {Icon && <Icon className="h-3.5 w-3.5 text-gray-300" />}
            {label}
            <span title="Restricted field">
              <Lock className="h-2.5 w-2.5 text-gray-300 ml-1" />
            </span>
          </p>
          <p className="font-semibold text-gray-400 break-words text-xs">{value || '—'}</p>
        </div>
      )
    }

    return (
      <div 
        onClick={() => onEditInitiate?.(id)}
        className="h-[92px] flex flex-col justify-center bg-gray-50/20 p-4.5 rounded-xl border border-gray-100 hover:border-brand-teal/30 hover:bg-white hover:shadow-sm cursor-pointer transition-all duration-200 group/field"
        title={`Click to edit ${label}`}
      >
        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center justify-between mb-1.5">
          <span className="flex items-center gap-1.5">
            {Icon && <Icon className="h-3.5 w-3.5 text-gray-400 group-hover/field:text-brand-teal transition-colors" />}
            {label}
          </span>
          <span className="text-[8px] text-brand-teal opacity-0 group-hover/field:opacity-100 transition-opacity font-bold uppercase tracking-wider">
            Edit
          </span>
        </p>
        <p className="font-bold text-gray-800 break-words text-xs">{value || '—'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-[10px] font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1 pl-0.5">
        {Icon && <Icon className="h-3.5 w-3.5 text-gray-500" />}
        {label}
        {required && <span className="text-red-500 font-bold">*</span>}
        {disabled && (
          <span title="Restricted field">
            <Lock className="h-2.5 w-2.5 text-muted-foreground ml-1" />
          </span>
        )}
      </label>
      
      {options ? (
        <Select 
          value={value || ''} 
          onValueChange={onChange} 
          disabled={disabled}
        >
          <SelectTrigger className="w-full bg-white border-gray-200 focus:ring-brand-teal h-9 shadow-sm text-xs rounded-xl">
            <SelectValue placeholder={placeholder || `Select ${label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {options.length === 0 ? (
              <div className="p-2 text-[10px] text-muted-foreground text-center">Loading options...</div>
            ) : (
              options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      ) : (
        <div className="relative">
          <Input
            id={id}
            type={type}
            value={value || ''}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={disabled}
            required={required}
            autoFocus={focusedField === id}
            placeholder={placeholder || `Enter ${label.toLowerCase()}`}
            className={`w-full bg-white border-gray-200 focus-visible:ring-brand-teal h-9 shadow-sm text-xs rounded-xl ${disabled ? 'bg-gray-50 cursor-not-allowed text-muted-foreground/80' : ''}`}
          />
        </div>
      )}
    </div>
  )
}

function Badge({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full border shadow-sm ${className}`}>
      {children}
    </span>
  )
}
