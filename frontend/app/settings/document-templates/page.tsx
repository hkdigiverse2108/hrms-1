'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Loader2, Save, Plus, ArrowLeft, Search, FileText, ChevronRight, Trash2, Edit } from 'lucide-react'

const ReactQuill = dynamic(
  async () => {
    const { default: RQ } = await import('react-quill-new');
    const { Quill } = await import('react-quill-new');
    if (typeof window !== 'undefined') {
      window.Quill = Quill;
      const ImageResize = (await import('quill-image-resize-module-react')).default;
      Quill.register('modules/imageResize', ImageResize);
      
      const Parchment = Quill.import('parchment');
      const StyleAttributor = Parchment.StyleAttributor || Quill.import('attributors/style/align').constructor;
      const BlockScope = Parchment.Scope ? Parchment.Scope.BLOCK : 2; // Fallback to 2 if Scope is undefined

      const LineHeightStyle = new StyleAttributor('lineHeight', 'line-height', {
        scope: BlockScope,
        whitelist: ['0.5', '1.0', '1.15', '1.5', '2.0', '2.5', '3.0']
      });
      Quill.register(LineHeightStyle, true);
    }
    return function ForwardedQuill(props: any) {
      return <RQ {...props} />;
    }
  },
  { ssr: false, loading: () => <div className="h-[300px] flex items-center justify-center text-slate-400">Loading editor...</div> }
)
import 'react-quill-new/dist/quill.snow.css'
import { Input } from '@/components/ui/input'
import { API_URL } from '@/lib/config'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useConfirm } from "@/context/ConfirmContext";

interface DocumentTemplate {
  id: string
  template_id: string
  name: string
  description: string
  fields: string[]
  content: string
  file_url?: string
}

const quillModules = {
  toolbar: [
    [{ 'font': [] }, { 'size': ['small', false, 'large', 'huge'] }],
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'lineHeight': ['0.5', '1.0', '1.15', '1.5', '2.0', '2.5', '3.0'] }],
    [{ 'script': 'sub'}, { 'script': 'super' }],
    ['blockquote', 'code-block'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'indent': '-1'}, { 'indent': '+1' }],
    [{ 'direction': 'rtl' }],
    [{ 'align': [] }],
    ['link', 'image', 'video'],
    ['clean']
  ],
  imageResize: {
    parchment: typeof window !== 'undefined' ? window.Quill?.import('parchment') : null,
    modules: ['Resize', 'DisplaySize']
  }
}

export default function DocumentTemplatesPage() {
  const { confirm } = useConfirm();
  const router = useRouter()
  
  const [templates, setTemplates] = useState<DocumentTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null)
  const [systemSettings, setSystemSettings] = useState<any>(null)
  const [estimatedPages, setEstimatedPages] = useState(1)
  const previewRef = useRef<HTMLDivElement>(null)
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [searchTerm, setSearchTerm] = useState('')

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  
  const [isLiveEditing, setIsLiveEditing] = useState(false)
  const [liveContent, setLiveContent] = useState('')
  const [savingLive, setSavingLive] = useState(false)

  const [formData, setFormData] = useState({
    template_id: '',
    name: '',
    description: '',
    fields: '',
    content: ''
  })

  useEffect(() => {
    fetchTemplates()
    fetchSystemSettings()
  }, [])

  const fetchSystemSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/system-settings`)
      if (res.ok) setSystemSettings(await res.json())
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    if (!previewRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const height = entry.target.getBoundingClientRect().height;
        // A4 page height is exactly 297mm. At 96 DPI, this is approx 1122.5px
        setEstimatedPages(Math.max(1, Math.ceil(height / 1122.5)));
      }
    });
    observer.observe(previewRef.current);
    return () => observer.disconnect();
  }, [selectedTemplate?.content, systemSettings])

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

  const startLiveEditing = () => {
    if (!selectedTemplate) return
    setLiveContent(selectedTemplate.content || '')
    setIsLiveEditing(true)
  }

  const saveLiveEditing = async () => {
    if (!selectedTemplate) return
    setSavingLive(true)
    try {
      const payload = {
        template_id: selectedTemplate.template_id,
        name: selectedTemplate.name,
        description: selectedTemplate.description,
        fields: selectedTemplate.fields,
        content: liveContent
      }
      const response = await fetch(`${API_URL}/document-templates/${selectedTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (response.ok) {
        toast.success('Template content updated')
        setIsLiveEditing(false)
        fetchTemplates()
      } else {
        toast.error('Failed to update template content')
      }
    } catch (error) {
      toast.error('Error saving template content')
    } finally {
      setSavingLive(false)
    }
  }

  const handleDeleteTemplate = async (id: string) => {
    const isConfirmed = await confirm({
      title: "Confirm Action",
      message: 'Are you sure you want to delete this template?',
      destructive: true,
      confirmText: "Confirm"
    });
    if (!isConfirmed) return
    
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
                  {isLiveEditing ? (
                    <>
                      <Button variant="outline" onClick={() => setIsLiveEditing(false)}>
                        Cancel
                      </Button>
                      <Button 
                        className="bg-brand-teal hover:bg-brand-teal/90 text-white px-8 font-bold shadow-lg shadow-brand-teal/20" 
                        onClick={saveLiveEditing}
                        disabled={savingLive}
                      >
                        {savingLive ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Content
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteTemplate(selectedTemplate.id)}>
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </Button>
                      <Button 
                        className="bg-brand-teal hover:bg-brand-teal/90 text-white px-8 font-bold shadow-lg shadow-brand-teal/20" 
                        onClick={() => openEditModal(selectedTemplate)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Template Settings
                      </Button>
                    </>
                  )}
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

                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg text-slate-800">Document Content Preview</h3>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">
                      ~{estimatedPages} {estimatedPages === 1 ? 'Page' : 'Pages'}
                    </span>
                  </div>
                  
                  <div className="bg-slate-50 rounded-xl p-8 border border-slate-200 overflow-hidden flex justify-center">
                    <div className="relative" style={{ width: '794px' }}>
                      <div className="ql-container ql-snow border-none !font-sans">
                        <div ref={previewRef} className="bg-white shadow-xl shadow-slate-200/50 p-[15mm] transition-all relative border border-slate-100" style={{ minHeight: '1123px' }}>
                          {systemSettings?.companyLetterheadUrl && (
                            <div className="-mt-[15mm] -mx-[15mm] mb-[10mm]">
                              <img 
                                src={systemSettings.companyLetterheadUrl.startsWith('http') ? systemSettings.companyLetterheadUrl : `${API_URL}${systemSettings.companyLetterheadUrl}`} 
                                alt="Company Letterhead" 
                                className="w-full object-contain"
                              />
                            </div>
                          )}
                          
                          {isLiveEditing ? (
                            <div className="relative mt-6 -mx-[15px] group">
                              <ReactQuill 
                                theme="snow"
                                modules={quillModules}
                                value={liveContent}
                                onChange={setLiveContent}
                                className="bg-transparent [&_.ql-editor]:min-h-[500px] [&_.ql-container]:border-none [&_.ql-toolbar]:sticky [&_.ql-toolbar]:top-4 [&_.ql-toolbar]:bg-white/95 [&_.ql-toolbar]:backdrop-blur [&_.ql-toolbar]:border [&_.ql-toolbar]:border-slate-200 [&_.ql-toolbar]:rounded-xl [&_.ql-toolbar]:shadow-lg [&_.ql-toolbar]:z-[100] [&_.ql-toolbar]:mb-6"
                              />
                            </div>
                          ) : (
                            <div className="relative mt-6 -mx-[15px] group">
                              <div 
                                onClick={startLiveEditing}
                                dangerouslySetInnerHTML={{ __html: selectedTemplate.content || '<div class="text-slate-400 italic">Click here to add document content...</div>' }} 
                                className="ql-editor cursor-text hover:bg-amber-50/50 hover:ring-2 hover:ring-brand-teal/20 transition-all rounded-lg min-h-[300px]" 
                                title="Click to edit document content directly"
                              />
                            </div>
                          )}
                          
                          {/* Repeating Letterheads for Page 2+ */}
                          {systemSettings?.companyLetterheadUrl && estimatedPages > 1 && Array.from({ length: estimatedPages - 1 }).map((_, i) => (
                            <div 
                              key={`lh-${i+1}`}
                              className="absolute left-0 w-full pointer-events-none z-0 repeating-letterhead opacity-30 transition-opacity"
                              style={{ 
                                top: `${(i + 1) * 1122.5}px`
                              }}
                            >
                              <img 
                                src={systemSettings.companyLetterheadUrl.startsWith('http') ? systemSettings.companyLetterheadUrl : `${API_URL}${systemSettings.companyLetterheadUrl}`} 
                                alt="Company Letterhead" 
                                className="w-full"
                                style={{ objectFit: 'contain', objectPosition: 'top' }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Page break indicators */}
                      {estimatedPages > 1 && Array.from({ length: estimatedPages - 1 }).map((_, i) => (
                        <div 
                          key={`pb-${i}`}
                          className="absolute left-0 w-full border-t-2 border-dashed border-red-400 pointer-events-none flex flex-col items-center justify-start opacity-70 z-50"
                          style={{ top: `${(i + 1) * 1122.5}px`, height: '100px' }}
                        >
                          <span className="bg-red-50 text-red-500 font-bold text-[10px] px-3 py-1 rounded-full shadow-sm border border-red-200 mt-2 text-center">
                            Page {i + 2} Starts Here<br/>
                            <span className="font-normal opacity-80">(Hit Enter to push text below letterhead)</span>
                          </span>
                        </div>
                      ))}
                    </div>
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
                placeholder="e.g. stipend, noticePeriod, bonusAmount, interviewDate" 
                value={formData.fields} 
                onChange={e => setFormData({...formData, fields: e.target.value})} 
              />
              
              <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl p-3">
                <p className="text-xs font-bold text-blue-800 mb-1 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Variable Cheat Sheet
                </p>
                <div className="text-[11px] text-blue-700 leading-relaxed grid grid-cols-2 gap-x-4 gap-y-2">
                  <div>
                    <span className="font-bold underline">Built-in (DO NOT ADD above):</span>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5 text-blue-800/80">
                      <li><code className="bg-white/60 px-1 py-0.5 rounded font-mono text-[10px]">{'{{empName}}'}</code> - Employee Name</li>
                      <li><code className="bg-white/60 px-1 py-0.5 rounded font-mono text-[10px]">{'{{todayFormatted}}'}</code> - Today's Date</li>
                      <li><code className="bg-white/60 px-1 py-0.5 rounded font-mono text-[10px]">{'{{startDateFormatted}}'}</code> - Join Date</li>
                      <li><code className="bg-white/60 px-1 py-0.5 rounded font-mono text-[10px]">{'{{currentEmployee.email}}'}</code> - Email</li>
                      <li><code className="bg-white/60 px-1 py-0.5 rounded font-mono text-[10px]">{'{{currentEmployee.phone}}'}</code> - Phone</li>
                    </ul>
                  </div>
                  <div>
                    <span className="font-bold underline">Special Custom Fields (ADD above):</span>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5 text-blue-800/80">
                      <li><code className="bg-white/60 px-1 py-0.5 rounded font-mono text-[10px]">department</code> (creates dropdown)</li>
                      <li><code className="bg-white/60 px-1 py-0.5 rounded font-mono text-[10px]">gender</code> (creates dropdown)</li>
                      <li><code className="bg-white/60 px-1 py-0.5 rounded font-mono text-[10px]">stipend</code> (creates Paid/Unpaid dropdown)</li>
                      <li>Any field with "date" (creates calendar)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 flex-1 min-h-[400px] flex flex-col">
              <div className="flex items-center justify-between">
                <Label>Document Content (use {`{{variableName}}`} for dynamic fields)</Label>
              </div>

              <div className="flex-1 rounded-xl overflow-hidden border border-slate-200 bg-white" style={{ minHeight: '350px' }}>
                  <ReactQuill 
                    theme="snow"
                    modules={quillModules}
                    value={formData.content}
                    onChange={(content) => setFormData({...formData, content})}
                    className="h-full bg-white [&_.ql-editor]:min-h-[300px] [&_.ql-container]:border-b-0 [&_.ql-container]:border-x-0 [&_.ql-container]:rounded-b-xl [&_.ql-toolbar]:border-t-0 [&_.ql-toolbar]:border-x-0 [&_.ql-toolbar]:bg-slate-50"
                    placeholder="Type your document template here. Use {{variableName}} for dynamic fields like {{empName}}, {{startDate}}, etc."
                  />
                </div>
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
      <style jsx global>{`
        .ql-editor {
          /* keeping default size */
        }
      `}</style>
    </div>
  )
}
