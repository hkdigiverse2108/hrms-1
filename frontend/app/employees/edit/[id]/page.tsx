'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { EmployeeForm, EmployeeFormData } from '@/components/hrms/employee-form'
import { API_URL } from '@/lib/config'

export default function EditEmployeePage() {
  const router = useRouter()
  const params = useParams()
  const employeeId = params.id as string
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [employeeData, setEmployeeData] = useState<Partial<EmployeeFormData> | null>(null)

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const response = await fetch(`${API_URL}/employees/${employeeId}`)
        if (response.ok) {
          const data = await response.json()
          setEmployeeData(data)
        } else {
          alert('Failed to fetch employee details')
          router.push('/employees')
        }
      } catch (error) {
        console.error('Error fetching employee:', error)
        alert('An error occurred while fetching employee details')
        router.push('/employees')
      } finally {
        setIsLoading(false)
      }
    }

    if (employeeId) {
      fetchEmployee()
    }
  }, [employeeId, router])

  const handleSubmit = async (formData: EmployeeFormData) => {
    setIsSubmitting(true)

    try {
      const response = await fetch(`${API_URL}/employees/${employeeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          salary: parseFloat(formData.salary) || 0,
        }),
      })

      if (response.ok) {
        router.push('/employees')
      } else {
        const error = await response.json()
        alert(`Error: ${error.detail || 'Failed to update employee'}`)
      }
    } catch (error) {
      console.error('Error updating employee:', error)
      alert('Failed to connect to the server')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-10">
        <div className="flex items-center gap-4">
          <Link href="/employees">
            <Button className="bg-brand-teal hover:bg-brand-teal-light text-white rounded-lg h-10 w-10 p-0 shadow-md">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">Edit Employee</h1>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-brand-teal" />
            <p className="text-gray-500 font-medium">Loading employee details...</p>
          </div>
        ) : employeeData ? (
          <EmployeeForm 
            initialData={employeeData} 
            onSubmit={handleSubmit} 
            isSubmitting={isSubmitting} 
            mode="edit" 
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-red-500">Employee not found.</p>
          </div>
        )}
      </div>
    </>
  )
}
