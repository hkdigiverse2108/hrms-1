'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Loader2, Save, Plus, ArrowLeft, Search, FileText, ChevronRight, Trash2, Edit } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { API_URL } from '@/lib/config'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

interface DocumentTemplate {
  id: string
  template_id: string
  name: string
  description: string
  fields: string[]
  content: string
}

export default function DocumentTemplatesPage() {
  const router = useRouter()
  
  const [templates, setTemplates] = useState<DocumentTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null)
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [searchTerm, setSearchTerm] = useState('')

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  
  const [formData, setFormData] = useState({
    template_id: '',
    name: '',
    description: '',
    fields: '',
    content: ''
  })

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/document-templates`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setTemplates(data)
          if (data.length > 0 && !selectedTemplate) {
            setSelectedTemplate(data[0])
          }
        } else {
          console.error('Expected array of templates, got:', data)
          setTemplates([])
        }
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
      toast.error('Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.template_id.trim()) {
      toast.error('Name and Template ID are required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        template_id: formData.template_id,
        name: formData.name,
        description: formData.description,
        fields: formData.fields.split(',').map(f => f.trim()).filter(f => f),
        content: formData.content
      }

      const url = isEditing && selectedTemplate 
        ? `${API_URL}/document-templates/${selectedTemplate.id}`
        : `${API_URL}/document-templates`
        
      const method = isEditing && selectedTemplate ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      
      if (response.ok) {
        toast.success(isEditing ? 'Template updated successfully' : 'Template created successfully')
        setIsAddOpen(false)
        setIsEditing(false)
        await fetchTemplates()
      } else {
        toast.error('Failed to save template')
      }
    } catch (error) {
      toast.error('Error saving template')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return
    
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/document-templates/${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        toast.success('Template deleted')
        if (selectedTemplate?.id === id) {
          setSelectedTemplate(null)
        }
        fetchTemplates()
      }
    } catch (err) {
      toast.error('Error deleting template')
    } finally {
      setSaving(false)
    }
  }

  const openCreateModal = () => {
    setIsEditing(false)
    setFormData({
      template_id: '',
      name: '',
      description: '',
      fields: '',
      content: ''
    })
    setIsAddOpen(true)
  }

  const openEditModal = (template: DocumentTemplate) => {
    setSelectedTemplate(template)
    setIsEditing(true)
    setFormData({
      template_id: template.template_id,
      name: template.name,
      description: template.description || '',
      fields: template.fields ? template.fields.join(', ') : '',
      content: template.content || ''
    })
    setIsAddOpen(true)
  }

  if (loading && templates.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-brand-teal" />
      </div>
    )
  }

  const filteredTemplates = templates.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="flex flex-col h-full -mt-6">
      <div className="grid grid-cols-1 xl:grid-cols-4 min-h-[calc(100vh-100px)]">
        {/* Left Side: Templates List */}
        <div className="xl:col-span-1 border-r border-slate-200 bg-white flex flex-col h-full">
          <div className="p-6 border-b border-slate-100">
            <Button variant="ghost" className="mb-4 text-slate-500 h-8 px-2 text-xs" onClick={() => router.push('/settings')}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Settings
            </Button>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2"><FileText className="w-5 h-5 text-brand-teal" /> Templates</span>
              <Button size="sm" className="bg-brand-teal hover:bg-brand-teal/90" onClick={openCreateModal}>
                <Plus className="w-4 h-4" />
              </Button>
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search templates..." 
                className="pl-9 h-11 bg-slate-50 border-none ring-0 focus-visible:ring-1 focus-visible:ring-brand-teal/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {filteredTemplates.map(template => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                  template.id === selectedTemplate?.id 
                    ? 'bg-brand-teal text-white shadow-lg shadow-brand-teal/20' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  template.id === selectedTemplate?.id ? 'bg-white/20' : 'bg-slate-100'
                }`}>
                  <FileText className={`w-5 h-5 ${template.id === selectedTemplate?.id ? 'text-white' : 'text-slate-400'}`} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="font-bold text-sm truncate">{template.name}</div>
                  <div className={`text-[10px] uppercase font-bold tracking-wider truncate ${
                    template.id === selectedTemplate?.id ? 'text-white/60' : 'text-slate-400'
                  }`}>{template.description || 'Document Template'}</div>
                </div>
                <ChevronRight className={`w-4 h-4 shrink-0 ${template.id === selectedTemplate?.id ? 'text-white/60' : 'text-slate-300'}`} />
              </button>
            ))}
            {filteredTemplates.length === 0 && (
              <div className="text-center p-8 text-sm text-slate-400 font-medium">
                No templates found. Create one!
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Template Details */}
        <div className="xl:col-span-3 bg-slate-50/50 flex flex-col h-full overflow-hidden">
          {selectedTemplate ? (
            <>
              <div className="p-8 border-b border-slate-200 bg-white flex items-center justify-between sticky top-0 z-10">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    Template: {selectedTemplate.name}
                  </h1>
                  <p className="text-slate-500 text-sm font-medium mt-1">
                    {selectedTemplate.description || 'View and manage this document template.'}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteTemplate(selectedTemplate.id)}>
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </Button>
                  <Button 
                    className="bg-brand-teal hover:bg-brand-teal/90 text-white px-8 font-bold shadow-lg shadow-brand-teal/20" 
                    onClick={() => openEditModal(selectedTemplate)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Template
                  </Button>
                </div>
              </div>

              <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-bold text-lg mb-4 text-slate-800">Template Fields</h3>
                  <div className="flex flex-wrap gap-2 mb-8">
                    {selectedTemplate.fields?.map(field => (
                      <span key={field} className="px-3 py-1 bg-brand-teal/10 text-brand-teal text-xs font-bold rounded-full">
                        {field}
                      </span>
                    )) || <span className="text-slate-400 text-sm">No fields defined</span>}
                  </div>

                  <h3 className="font-bold text-lg mb-4 text-slate-800">Raw HTML Content Preview</h3>
                  <div className="bg-slate-900 rounded-xl p-4 text-slate-300 font-mono text-sm overflow-x-auto">
                    <pre className="whitespace-pre-wrap">{selectedTemplate.content}</pre>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <FileText className="w-16 h-16 text-slate-200 mb-4" />
              <h3 className="text-xl font-bold text-slate-600 mb-2">No Template Selected</h3>
              <p className="max-w-xs text-center text-sm">Select a template from the sidebar or create a new one to start configuring documents.</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Template' : 'Create New Template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 overflow-y-auto custom-scrollbar px-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template ID (e.g. offer-letter)</Label>
                <Input 
                  placeholder="offer-letter" 
                  value={formData.template_id} 
                  onChange={e => setFormData({...formData, template_id: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input 
                  placeholder="e.g. Internship Offer Letter" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Input 
                placeholder="Optional description" 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})} 
              />
            </div>

            <div className="space-y-2">
              <Label>Custom Fields (comma separated)</Label>
              <Input 
                placeholder="e.g. name, gender, department, stipend, startDate" 
                value={formData.fields} 
                onChange={e => setFormData({...formData, fields: e.target.value})} 
              />
              <p className="text-xs text-slate-500">Variables like empName, department, gender, startDate, etc.</p>
            </div>

            <div className="space-y-2 flex-1 min-h-[300px] flex flex-col">
              <Label>HTML Content (use {`{{variableName}}`} for dynamic fields)</Label>
              <textarea 
                className="flex-1 w-full p-4 font-mono text-sm bg-slate-900 text-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-brand-teal"
                placeholder="<div class='...'>...{{empName}}...</div>"
                value={formData.content}
                onChange={e => setFormData({...formData, content: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !formData.name.trim()} className="bg-brand-teal text-white">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
