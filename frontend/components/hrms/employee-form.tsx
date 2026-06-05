import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export type EmployeeFormData = any;

export function EmployeeForm({ initialData, onSubmit, isSubmitting, mode }: any) {
  const [formData, setFormData] = useState<any>(initialData || {
    firstName: "",
    lastName: "",
    email: "",
    department: "",
    designation: ""
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-semibold">First Name</label>
          <Input name="firstName" value={formData.firstName || ""} onChange={handleChange} required />
        </div>
        <div>
          <label className="text-sm font-semibold">Last Name</label>
          <Input name="lastName" value={formData.lastName || ""} onChange={handleChange} required />
        </div>
      </div>
      <div>
        <label className="text-sm font-semibold">Email</label>
        <Input name="email" type="email" value={formData.email || ""} onChange={handleChange} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-semibold">Department</label>
          <Input name="department" value={formData.department || ""} onChange={handleChange} />
        </div>
        <div>
          <label className="text-sm font-semibold">Designation</label>
          <Input name="designation" value={formData.designation || ""} onChange={handleChange} />
        </div>
      </div>
      <div>
        <label className="text-sm font-semibold">Password {mode === 'edit' && '(leave blank to keep)'}</label>
        <Input name="password" type="password" value={formData.password || ""} onChange={handleChange} />
      </div>
      <Button type="submit" className="w-full bg-brand-teal hover:bg-brand-teal-light text-white" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save Employee"}
      </Button>
    </form>
  )
}
