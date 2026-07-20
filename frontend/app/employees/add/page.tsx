'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { EmployeeForm, EmployeeFormData } from '@/components/hrms/employee-form'
import { API_URL } from '@/lib/config'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from "sonner";

export default function AddEmployeePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { checkPermission, isAdmin, loading: permissionsLoading } = usePermissions()

  useEffect(() => {
    if (!permissionsLoading) {
      if (!isAdmin && !checkPermission('employee-list', 'canAdd')) {
        router.push('/employees')
      }
    }
  }, [permissionsLoading, isAdmin, router, checkPermission])

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-brand-teal" />
      </div>
    )
  }

  const handleSubmit = async (formData: EmployeeFormData) => {
    setIsSubmitting(true)

    try {
      const payload: any = {
        ...formData,
        salary: parseFloat(formData.salary) || 0,
      }

      if (payload.noticePeriodDays === '' || payload.noticePeriodDays === null || payload.noticePeriodDays === undefined) {
        payload.noticePeriodDays = null;
      } else {
        payload.noticePeriodDays = parseInt(payload.noticePeriodDays) || null;
      }

      const dateFields = [
        'dob', 'joinDate', 'bondStartDate', 'bondEndDate', 
        'noticePeriodStartDate', 'resignationDate', 'employmentStartDate'
      ];
      dateFields.forEach(field => {
        if (payload[field] === '') {
          payload[field] = null;
        }
      });

      const response = await fetch(`${API_URL}/employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        router.push('/employees')
      } else {
        const error = await response.json()
        let errMsg = 'Failed to add employee';
        if (error.detail) {
          if (typeof error.detail === 'string') {
            errMsg = error.detail;
          } else if (Array.isArray(error.detail)) {
            errMsg = error.detail.map((e: any) => {
              const field = e.loc ? e.loc.filter((l: any) => l !== 'body').join('.') : '';
              return `${field ? field + ': ' : ''}${e.msg}`;
            }).join(' | ');
          } else {
            errMsg = JSON.stringify(error.detail);
          }
        }
        toast.error(`Error: ${errMsg}`, { duration: 10000 });
      }
    } catch (error) {
      console.error('Error adding employee:', error)
      toast.error('Failed to connect to the server')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-10">
      <div className="flex items-center gap-4">
        <Button onClick={() => router.back()} className="bg-brand-teal hover:bg-brand-teal-light text-white rounded-lg h-10 w-10 p-0 shadow-md" title="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold text-gray-800">Add New Employee</h1>
          <p className="text-sm text-gray-500 font-medium">Create a new employee profile with full details.</p>
        </div>
      </div>

      <EmployeeForm 
        onSubmit={handleSubmit} 
        isSubmitting={isSubmitting} 
        mode="add" 
      />
    </div>
  )
}
