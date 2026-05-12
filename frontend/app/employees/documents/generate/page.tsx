'use client'

import { useState, useRef } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileText, Download, Printer, Save, RefreshCw, ChevronLeft, Layout, FileType, User, Calendar, Briefcase, DollarSign } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { toast } from 'sonner'
import Link from 'next/link'
import dayjs from 'dayjs'

const DOCUMENT_TEMPLATES = [
  {
    id: 'offer-letter',
    name: 'Offer Letter',
    description: 'Letter sent to prospective employees offering a position.',
    fields: ['name', 'department', 'designation', 'stipend', 'joiningDate', 'techStack', 'location']
  },
  {
    id: 'experience-letter',
    name: 'Experience Letter',
    description: 'Confirmation of an employee\'s tenure and roles at the company.',
    fields: ['lastWorkingDay', 'lastDesignation', 'performance']
  },
  {
    id: 'relieving-letter',
    name: 'Relieving Letter',
    description: 'Official document issued upon resignation or termination.',
    fields: ['resignationDate', 'lastWorkingDay', 'outstandingDues']
  },
  {
    id: 'appointment-letter',
    name: 'Appointment Letter',
    description: 'Detailed contract issued after acceptance of offer.',
    fields: ['ctc', 'probationPeriod', 'reportingTo']
  }
]

export default function DocumentGeneratorPage() {
  const { data } = useApi()
  const employees = data?.employees || []
  
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')
  const [extraFields, setExtraFields] = useState<any>({
    ctc: '',
    position: '',
    joiningDate: dayjs().format('YYYY-MM-DD'),
    location: 'Surat, Gujarat',
    expiryDate: dayjs().add(7, 'day').format('YYYY-MM-DD'),
    lastWorkingDay: dayjs().format('YYYY-MM-DD'),
    lastDesignation: '',
    performance: 'Excellent',
    resignationDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
    outstandingDues: 'None',
    probationPeriod: '3 Months',
    reportingTo: 'HR Manager',
    name: '',
    department: '',
    designation: ''
  })

  const [previewContent, setPreviewContent] = useState<string>('')
  const previewRef = useRef<HTMLDivElement>(null)

  const templateData = DOCUMENT_TEMPLATES.find(t => t.id === selectedTemplate)

  const generatePreview = () => {
    if (!selectedTemplate || !selectedEmployee) {
      toast.error('Please select a template and an employee or Manual Entry')
      return
    }

    const isManual = selectedEmployee === 'manual'
    const totalCount = (data?.employees?.length || 0) + (data?.interns?.length || 0) + 1
    const generatedId = `HKINT${String(totalCount).padStart(3, '0')}`

    const currentEmployee = isManual ? {
      name: extraFields.name || 'Candidate Name',
      firstName: (extraFields.name || 'Candidate').split(' ')[0],
      employeeId: generatedId,
      department: extraFields.department || 'Developing',
      designation: extraFields.designation || 'Intern',
      gender: 'Male'
    } : employees.find((e: any) => e.id === selectedEmployee)

    if (!currentEmployee) {
      toast.error('Please select an employee')
      return
    }

    const today = dayjs().format('DD MMMM, YYYY')
    const empName = extraFields.name || currentEmployee.name || `${currentEmployee.firstName} ${currentEmployee.lastName}`
    const empAddress = currentEmployee.address || 'Resident Address, City'
    
    let content = ''

    if (selectedTemplate === 'offer-letter') {
      content = `
        <div class="document-preview font-sans p-12 bg-white shadow-lg mx-auto max-w-[800px] text-gray-800 leading-relaxed min-h-[1100px] text-[13px]">
          <div class="flex justify-between items-start mb-6 border-b border-gray-300 pb-4">
            <div class="flex items-center gap-3">
              <div class="p-1 bg-white">
                <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 20L40 50L20 80" stroke="#0D9488" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M45 20V80" stroke="#4B5563" stroke-width="12" stroke-linecap="round"/>
                  <path d="M45 50L80 50" stroke="#4B5563" stroke-width="12" stroke-linecap="round"/>
                  <path d="M80 20V80" stroke="#4B5563" stroke-width="12" stroke-linecap="round"/>
                </svg>
              </div>
              <div>
                <h1 class="text-xl font-bold text-gray-700 leading-none">HariKrushn</h1>
                <p class="text-[14px] font-bold text-gray-600 tracking-tight">DigiVerse LLP</p>
              </div>
            </div>
            <div class="text-right text-[11px] text-gray-600 font-medium">
              <p>+91 88660 05029</p>
              <p class="text-brand-teal underline">hkdigiversellp@gmail.com</p>
              <p>www.hkdigiverse.com</p>
            </div>
          </div>

          <div class="mb-8 text-gray-700 font-medium">
            <p>HariKrushn DigiVerse LLP</p>
            <p>501-502, Silver Trade Center,</p>
            <p>Mota Varachha, Surat - 394101</p>
            <p>Website: www.hkdigiverse.com</p>
            <p>Email: hr@hkdigiverse.com</p>
          </div>

          <h2 class="text-left text-[16px] font-bold mb-3 uppercase tracking-wide">INTERNSHIP OFFER LETTER</h2>

          <div class="mb-3 font-bold">
            <p class="mb-3">Date: ${dayjs(extraFields.joiningDate).format('DD MMMM YYYY')}</p>
            <p>Intern ID: ${currentEmployee.employeeId}</p>
          </div>

          <div class="mb-3">
            <p class="font-bold">To,</p>
            <p class="font-bold">${currentEmployee.gender === 'Female' ? 'Ms.' : 'Mr.'} ${empName}</p>
          </div>

          <p class="mb-3 font-bold">Dear ${currentEmployee.firstName || empName.split(' ')[0]},</p>
          
          <p class="mb-10 text-justify">
            We are pleased to offer you an <strong>Internship Opportunity</strong> at <strong>HariKrushn DigiVerse LLP</strong> in the <strong>${extraFields.department || currentEmployee.department || 'Developing'} Department</strong>, where you will be working as a <strong>${extraFields.designation || extraFields.position || currentEmployee.designation || 'Python Developer (Intern)'}</strong>. This internship is structured to provide you with practical experience in ${extraFields.techStack || 'Python programming'} and real-world software development practices.
          </p>
          
          <div class="mb-8">
            <h3 class="font-bold mb-3 text-[14px]">Internship Details</h3>
            <ul class="list-disc ml-8 space-y-1 font-medium">
              <li><strong>Intern ID:</strong> ${currentEmployee.employeeId}</li>
              <li><strong>Designation:</strong> ${extraFields.designation || extraFields.position || currentEmployee.designation || 'Developer (Intern)'}</li>
              <li><strong>Department:</strong> ${extraFields.department || currentEmployee.department || 'Developing'}</li>
              <li><strong>Joining Date:</strong> ${dayjs(extraFields.joiningDate).format('DD MMMM YYYY')}</li>
              <li><strong>Stipend:</strong> ${extraFields.stipend || '15,000'}/-</li>
              <li><strong>Working Hours:</strong> ${currentEmployee.startTime || '09:30 AM'} to ${currentEmployee.endTime || '06:30 PM'}</li>
              <li><strong>Working Location:</strong> HariKrushn DigiVerse LLP Office,<br/>501-502, Silver Trade Center,<br/>Mota Varachha, Surat</li>
              <li><strong>Reporting Person / HR Contact:</strong> HR Department - hr@hkdigiverse.com</li>
            </ul>
          </div>

          <div class="mb-10">
            <h3 class="font-bold mb-3 text-[14px]">Basic Rules & Guidelines</h3>
            <ol class="list-decimal ml-8 space-y-2 font-medium text-justify">
              <li>Regular attendance and discipline are mandatory throughout the internship period.</li>
              <li>Interns must follow coding standards, development guidelines, and instructions provided by the reporting supervisor.</li>
              <li>Professional conduct, punctuality, and a strong learning mindset are expected at all times.</li>
              <li>Any leave must be taken with prior approval from HR; uninformed leave may lead to disciplinary action.</li>
              <li>All source code, project data, and company information must remain strictly confidential.</li>
              <li>Performance will be evaluated based on learning progress, task completion, and overall involvement.</li>
            </ol>
          </div>

          <div class="mb-3">
            <h3 class="font-bold mb-3 text-[14px]">Completion & Certification</h3>
            <p class="mb-4 text-justify font-medium">
              Upon successful completion of the internship, based on your attendance, learning performance, and dedication, you will receive an <strong>Internship Completion Certificate</strong> from <strong>HariKrushn DigiVerse LLP</strong>.
            </p>
            <p class="mb-3 font-medium">
              We welcome you to the Development Team and wish you a productive and enriching learning journey with us.
            </p>
          </div>

          <div class="mt-4">
            <div class="mb-10">
              <p class="font-bold mb-1 text-[14px]">Warm regards,</p>
              <div class="h-10"></div>
              <p class="font-bold text-[14px]">For HariKrushn DigiVerse LLP</p>
              <p class="font-bold text-[14px]">(Authorized Signatory)</p>
            </div>

            <div class="mt-14">
              <div class="h-10"></div>
              <p class="font-bold text-[14px]">${currentEmployee.gender === 'Female' ? 'Ms.' : 'Mr.'} ${empName}</p>
              <p class="font-bold text-[14px]">(Signature of Intern)</p>
            </div>
          </div>
        </div>
      `
    } else if (selectedTemplate === 'experience-letter') {
      content = `
        <div class="document-preview font-serif p-12 bg-white shadow-lg mx-auto max-w-[800px] text-gray-800 leading-relaxed min-h-[1100px]">
           <div class="flex justify-between items-start mb-12 border-b-2 border-brand-teal pb-6">
            <div>
              <h1 class="text-3xl font-black text-brand-teal tracking-tighter">HariKrushn</h1>
              <p class="text-xs font-bold text-gray-500 uppercase tracking-widest">DigiVerse LLP</p>
            </div>
          </div>

          <div class="mb-10">
            <p class="font-bold mb-1">${today}</p>
          </div>

          <h2 class="text-center text-2xl font-black underline mb-16 tracking-widest uppercase">Experience Certificate</h2>

          <p class="mb-8 text-lg">TO WHOMSOEVER IT MAY CONCERN</p>
          
          <p class="mb-8 leading-loose text-justify">
            This is to certify that <strong>Mr./Ms. ${empName}</strong> was an employee of <strong>HariKrushn DigiVerse LLP</strong> from <strong>${dayjs(currentEmployee.joinDate).format('DD MMMM, YYYY')}</strong> to <strong>${dayjs(extraFields.lastWorkingDay).format('DD MMMM, YYYY')}</strong>. 
            During this period, he/she served in the capacity of <strong>${extraFields.lastDesignation || currentEmployee.designation}</strong>.
          </p>
          
          <p class="mb-8 leading-loose text-justify">
            During his/her tenure with us, we found him/her to be hardworking, honest, and dedicated. His/her performance was <strong>${extraFields.performance}</strong>. He/she consistently demonstrated strong professional skills and maintained excellent interpersonal relationships with colleagues and management.
          </p>
          
          <p class="mb-16 leading-loose text-justify">
            We wish him/her every success in all his/her future endeavors.
          </p>
          
          <div class="mt-24">
            <p class="font-black mb-16 uppercase tracking-tighter">For HariKrushn DigiVerse LLP,</p>
            <div class="space-y-1">
              <p class="font-bold text-lg">Director / HR Manager</p>
              <p class="text-brand-teal font-bold tracking-widest text-sm uppercase">Authorized Signatory</p>
            </div>
          </div>
        </div>
      `
    } else {
      content = `<div class="p-20 text-center text-gray-400 font-bold italic">Template content for ${templateData?.name} is under development...</div>`
    }

    setPreviewContent(content)
    toast.success('Document preview generated!')
  }

  const handlePrint = () => {
    if (!previewContent) return
    
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Generate Document - HariKrushn</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
              @media print {
                body { margin: 0; padding: 0; }
                .no-print { display: none; }
                .document-preview { box-shadow: none !important; border: none !important; width: 100% !important; max-width: none !important; }
              }
              .text-brand-teal { color: #0D9488 !important; }
              .bg-brand-teal { background-color: #0D9488 !important; }
              .border-brand-teal { border-color: #0D9488 !important; }
            </style>
          </head>
          <body class="bg-gray-100">
            <div class="no-print p-4 bg-brand-teal text-white flex justify-between items-center shadow-md">
              <span class="font-bold tracking-tight">Print Preview - HariKrushn DigiVerse</span>
              <button onclick="window.print()" class="bg-white text-brand-teal px-6 py-2 rounded-lg font-bold hover:bg-gray-100 transition-all flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                Print Document
              </button>
            </div>
            <div class="py-10">
              ${previewContent}
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Document Generator" 
        description="Automatically generate professional HR documents, letters, and certificates for employees."
      >
        <Link href="/employees/documents">
          <Button variant="outline" className="gap-2 font-bold border-slate-200">
            <ChevronLeft className="w-4 h-4" />
            Back to Documents
          </Button>
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Col: Configuration */}
        <div className="xl:col-span-1 space-y-6">
          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <Layout className="w-4 h-4 text-brand-teal" />
              <h3 className="font-bold text-sm text-slate-700 uppercase tracking-wider">Step 1: Template Selection</h3>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-500 uppercase tracking-tighter flex items-center gap-2">
                  <FileType className="w-3 h-3" /> Document Template
                </Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger className="h-12 border-slate-200 bg-slate-50/30">
                    <SelectValue placeholder="Select template type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TEMPLATES.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        <div className="flex flex-col text-left py-1">
                          <span className="font-bold text-slate-800">{t.name}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{t.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-500 uppercase tracking-tighter flex items-center gap-2">
                  <User className="w-3 h-3" /> Select Employee
                </Label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger className="h-12 border-slate-200 bg-slate-50/30">
                    <SelectValue placeholder="Choose employee..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">
                      <div className="flex items-center gap-2 py-1">
                        <User className="w-4 h-4 text-brand-teal" />
                        <span className="font-bold text-brand-teal italic">Manual Entry / New Candidate</span>
                      </div>
                    </SelectItem>
                    {employees.map((emp: any) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name || `${emp.firstName} ${emp.lastName}`} ({emp.employeeId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {selectedTemplate && (
            <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-brand-teal" />
                <h3 className="font-bold text-sm text-slate-700 uppercase tracking-wider">Step 2: Template Variables</h3>
              </div>
              <CardContent className="p-6 space-y-6">
                <div className="grid gap-4">
                  {templateData?.fields.map(field => (
                    <div key={field} className="space-y-2">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        {field === 'ctc' ? <DollarSign className="w-3 h-3" /> : 
                         field.toLowerCase().includes('date') ? <Calendar className="w-3 h-3" /> : 
                         <Briefcase className="w-3 h-3" />}
                        {field.replace(/([A-Z])/g, ' $1').trim()}
                      </Label>
                      {field === 'department' ? (
                        <Select 
                          value={extraFields[field] || ''} 
                          onValueChange={(v) => setExtraFields({...extraFields, [field]: v})}
                        >
                          <SelectTrigger className="h-10 border-slate-200 bg-slate-50/30">
                            <SelectValue placeholder="Select department..." />
                          </SelectTrigger>
                          <SelectContent>
                            {data?.departments?.map((d: any) => (
                              <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : field === 'designation' ? (
                        <Select 
                          value={extraFields[field] || ''} 
                          onValueChange={(v) => setExtraFields({...extraFields, [field]: v})}
                        >
                          <SelectTrigger className="h-10 border-slate-200 bg-slate-50/30">
                            <SelectValue placeholder="Select designation..." />
                          </SelectTrigger>
                          <SelectContent>
                            {(extraFields.department 
                              ? data?.designations?.filter((d: any) => d.department === extraFields.department)
                              : data?.designations
                            )?.map((d: any) => (
                              <SelectItem key={d.id} value={d.title}>{d.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input 
                          type={field.toLowerCase().includes('date') ? 'date' : 'text'}
                          value={extraFields[field] || ''}
                          onChange={(e) => setExtraFields({...extraFields, [field]: e.target.value})}
                          className="h-10 border-slate-200 focus:bg-slate-50/50"
                          placeholder={`Enter ${field}...`}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <Button 
                  className="w-full bg-brand-teal hover:bg-brand-teal/90 text-white font-bold h-12 shadow-lg shadow-brand-teal/20"
                  onClick={generatePreview}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate Preview
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Col: Preview */}
        <div className="xl:col-span-2 space-y-6">
          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden min-h-[800px] flex flex-col bg-slate-100/50">
             <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-teal/10 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-brand-teal" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800 tracking-tight">Document Preview</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">WYSWYG Editor</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="font-bold text-slate-500 hover:text-brand-teal" onClick={() => setPreviewContent('')}>
                  Clear
                </Button>
                <Button 
                  className="bg-brand-teal hover:bg-brand-teal/90 text-white font-bold gap-2 px-6 h-9 rounded-lg shadow-md"
                  disabled={!previewContent}
                  onClick={handlePrint}
                >
                  <Printer className="w-4 h-4" />
                  Print / Export
                </Button>
              </div>
            </div>

            <CardContent className="p-8 flex-1 overflow-y-auto scrollbar-hide">
              {previewContent ? (
                <div 
                  dangerouslySetInnerHTML={{ __html: previewContent }} 
                  className="document-container"
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 py-40">
                  <div className="w-20 h-20 rounded-3xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                    <FileText className="w-10 h-10 text-slate-200" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-slate-400">No Preview Generated</p>
                    <p className="text-xs font-medium text-slate-300">Complete Step 1 & 2 on the left to generate a preview here.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <style jsx global>{`
        .document-container {
          perspective: 1000px;
        }
        .document-preview {
          box-shadow: 0 10px 40px -15px rgba(0,0,0,0.1);
          border: 1px solid #e2e8f0;
          transition: transform 0.3s ease;
        }
        .document-preview:hover {
          transform: translateY(-5px);
        }
        @media print {
          .no-print { display: none; }
        }
      `}</style>
    </div>
  )
}
