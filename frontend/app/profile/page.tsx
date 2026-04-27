'use client'

import { useState, useRef } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useUser } from '@/hooks/useUser'
import { Camera, Mail, Phone, MapPin, Briefcase, Building2, Calendar, Loader2 } from 'lucide-react'
import { API_URL } from '@/lib/config'

export default function ProfilePage() {
  const { user, setUser, isLoading: userLoading } = useUser()
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase()

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Basic validation
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size should be less than 5MB.')
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    setIsUploading(true)
    try {
      const response = await fetch(`${API_URL}/upload-profile-photo/${user.id}`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload photo')
      }

      const updatedUser = await response.json()
      
      // Update local state and storage
      setUser(updatedUser)
      localStorage.setItem('user', JSON.stringify(updatedUser))
      alert('Profile photo updated successfully!')
    } catch (error) {
      console.error('Upload error:', error)
      alert('An error occurred while uploading your photo.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" description="Manage your personal information and account settings." />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Profile Card */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-8">
              <div className="flex flex-col items-center">
                <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                  <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                    <AvatarImage 
                      src={user.profilePhoto ? (user.profilePhoto.startsWith('http') ? user.profilePhoto : `${API_URL}/uploads/${user.profilePhoto}`) : `https://i.pravatar.cc/150?u=${userName}`} 
                      alt={userName} 
                    />
                    <AvatarFallback className="text-2xl bg-primary text-primary-foreground">{initials}</AvatarFallback>
                  </Avatar>

                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isUploading ? (
                      <Loader2 className="h-8 w-8 animate-spin text-white" />
                    ) : (
                      <Camera className="h-8 w-8 text-white" />
                    )}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={isUploading}
                  />
                </div>
                <h3 className="mt-4 text-xl font-bold">{userName}</h3>
                <p className="text-muted-foreground">{user.designation}</p>
                <div className="mt-4 flex gap-2">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    {user.employeeId}
                  </Badge>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Active
                  </Badge>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{user.phone || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{user.department}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Details */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Personal Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2">
                <DetailItem label="First Name" value={user.firstName} />
                <DetailItem label="Last Name" value={user.lastName} />
                <DetailItem label="Role" value={user.role || 'Standard Employee'} />
                <DetailItem label="Joining Date" value={new Date(user.joinDate).toLocaleDateString()} />
                <DetailItem label="Date of Birth" value={user.dob || 'Not set'} />
                <DetailItem label="Salary" value={`$${user.salary.toLocaleString()}`} />
              </div>

              <div className="mt-8">
                <h4 className="mb-4 font-semibold text-foreground">Account Information</h4>
                <div className="grid gap-6 sm:grid-cols-2">
                  <DetailItem label="Workplace" value={user.company || 'Hk DigiVerse'} />
                  <DetailItem label="Position" value={user.position || 'N/A'} />
                  <DetailItem label="Start Time" value={user.startTime || '09:00 AM'} />
                  <DetailItem label="End Time" value={user.endTime || '06:00 PM'} />
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-border">
                <Button className="bg-primary hover:bg-primary-light">
                  Edit Profile Information
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}

function Badge({ children, variant = 'outline', className = '' }: { children: React.ReactNode, variant?: string, className?: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${className}`}>
      {children}
    </span>
  )
}
