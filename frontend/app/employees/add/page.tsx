'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { HRMSLayout } from '@/components/hrms/hrms-layout'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { EmployeeForm, EmployeeFormData } from '@/components/hrms/employee-form'

export default function AddEmployeePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (formData: EmployeeFormData) => {
    setIsSubmitting(true)

    try {
      const response = await fetch('http://localhost:8000/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          salary: parseFloat(formData.salary) || 0,
          status: 'probation',
        }),
      })

      if (response.ok) {
        router.push('/employees')
      } else {
        const error = await response.json()
        alert(`Error: ${error.detail || 'Failed to add employee'}`)
      }
    } catch (error) {
      console.error('Error adding employee:', error)
      alert('Failed to connect to the server')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <HRMSLayout>
      <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-10">
        <div>
          <Link href="/employees">
            <Button className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg h-10 w-10 p-0 shadow-md">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
        </div>

        <EmployeeForm 
          onSubmit={handleSubmit} 
          isSubmitting={isSubmitting} 
          mode="add" 
        />
      </div>
    </HRMSLayout>
  )
}
