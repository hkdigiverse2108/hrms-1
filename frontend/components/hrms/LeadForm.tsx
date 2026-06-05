import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export type LeadFormData = any;

export function LeadForm({ initialData, onSubmit, isSubmitting }: any) {
  const [formData, setFormData] = useState<any>(initialData || { name: "" })
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData) }} className="space-y-4">
      <Input value={formData.name || ""} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Lead Name" />
      <Button type="submit" disabled={isSubmitting}>Save</Button>
    </form>
  )
}
