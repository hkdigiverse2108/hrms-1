'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { HRMSLayout } from '@/components/hrms/hrms-layout'
import { PageHeader } from '@/components/hrms/page-header'
import { DataTable } from '@/components/hrms/data-table'
import { StatusBadge } from '@/components/hrms/status-badge'
import { EmployeeModal } from '@/components/hrms/employee-modal'
import { DeleteConfirmDialog } from '@/components/hrms/delete-confirm-dialog'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, MoreHorizontal, Eye, Pencil, Trash2, Download } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { useEffect } from 'react'
import type { Employee } from '@/lib/types'

export default function EmployeesPage() {
  const router = useRouter()
  const { data, isLoading } = useApi()
  const [employees, setEmployees] = useState<Employee[]>([])

  useEffect(() => {
    if (data?.employees) {
      setEmployees(data.employees)
    }
  }, [data?.employees])

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add')
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null)

  const handleAddEmployee = () => {
    setSelectedEmployee(null)
    setModalMode('add')
    setModalOpen(true)
  }

  const handleViewEmployee = (employee: Employee) => {
    setSelectedEmployee(employee)
    setModalMode('view')
    setModalOpen(true)
  }

  const handleEditEmployee = (employee: Employee) => {
    router.push(`/employees/edit/${employee.id}`)
  }

  const handleDeleteClick = (employee: Employee) => {
    setEmployeeToDelete(employee)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (employeeToDelete) {
      try {
        const response = await fetch(`http://localhost:8000/employees/${employeeToDelete.id}`, {
          method: 'DELETE',
        })
        if (response.ok) {
          setEmployees(employees.filter((e) => e.id !== employeeToDelete.id))
          setEmployeeToDelete(null)
        } else {
          alert('Failed to delete employee')
        }
      } catch (error) {
        console.error('Error deleting employee:', error)
        alert('An error occurred while deleting the employee')
      }
    }
    setDeleteDialogOpen(false)
  }

  const handleSaveEmployee = (employeeData: Partial<Employee>) => {
    if (modalMode === 'add') {
      const newEmployee: Employee = {
        id: String(employees.length + 1),
        employeeId: `EMP${String(employees.length + 1).padStart(3, '0')}`,
        name: employeeData.name || '',
        email: employeeData.email || '',
        phone: employeeData.phone || '',
        department: employeeData.department || '',
        designation: employeeData.designation || '',
        joinDate: new Date().toISOString().split('T')[0],
        status: employeeData.status || 'active',
        salary: employeeData.salary || 0,
      }
      setEmployees([...employees, newEmployee])
    } else if (modalMode === 'edit' && selectedEmployee) {
      setEmployees(
        employees.map((e) =>
          e.id === selectedEmployee.id ? { ...e, ...employeeData } : e
        )
      )
    }
  }

  const columns = [
    {
      key: 'name' as const,
      header: 'Employee',
      render: (employee: Employee) => (
        <div className="flex items-center gap-3">
          <Avatar>
            {employee.profilePhoto && (
              <AvatarImage 
                src={`http://localhost:8000/uploads/${employee.profilePhoto}`} 
                alt={employee.name} 
                className="object-cover"
              />
            )}
            <AvatarFallback className="bg-primary/10 text-primary">
              {employee.name
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{employee.name}</p>
            <p className="text-sm text-muted-foreground">{employee.employeeId}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'email' as const,
      header: 'Email',
    },
    {
      key: 'department' as const,
      header: 'Department',
    },
    {
      key: 'designation' as const,
      header: 'Designation',
    },
    {
      key: 'joinDate' as const,
      header: 'Join Date',
    },
    {
      key: 'status' as const,
      header: 'Status',
      render: (employee: Employee) => <StatusBadge status={employee.status} />,
    },
  ]

  const renderActions = (employee: Employee) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleViewEmployee(employee)}>
          <Eye className="mr-2 h-4 w-4" />
          View
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleEditEmployee(employee)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleDeleteClick(employee)}
          className="text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <HRMSLayout>
      <PageHeader title="All Employees" description="Manage and view all employees in the organization.">
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
        <Button onClick={() => router.push('/employees/add')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Employee
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <DataTable
          data={employees}
          columns={columns}
          searchKey="name"
          searchPlaceholder="Search employees..."
          actions={renderActions}
        />
      )}

      <EmployeeModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        employee={selectedEmployee}
        onSave={handleSaveEmployee}
        mode={modalMode}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Employee"
        description={`Are you sure you want to delete ${employeeToDelete?.name}? This action cannot be undone.`}
      />
    </HRMSLayout>
  )
}
