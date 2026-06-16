'use client'

import { useState, useRef, useEffect } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { FileText, Download, Printer, Save, RefreshCw, ChevronLeft, Layout, FileType, User, Calendar, Briefcase, IndianRupee, Edit3, Loader2, Send } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { usePermissions } from '@/hooks/usePermissions'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import dayjs from 'dayjs'
import { API_URL } from '@/lib/config'
import 'react-quill-new/dist/quill.snow.css'

export default function DocumentGeneratorPage() {
  const router = useRouter()
  const { checkPermission, isAdmin, loading: permissionsLoading } = usePermissions()
  const { data } = useApi()
  const employees = data?.employees || []

  useEffect(() => {
    if (!permissionsLoading) {
      if (!isAdmin && !checkPermission('employee-documents', 'canAdd')) {
        router.push('/')
      }
    }
  }, [permissionsLoading, isAdmin, router, checkPermission])


  
  const [documentTemplates, setDocumentTemplates] = useState<any[]>([])

  useEffect(() => {
    fetch(`${API_URL}/document-templates`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setDocumentTemplates(data)
        } else {
          console.error("Expected array for templates, got:", data)
          setDocumentTemplates([])
        }
      })
      .catch(err => console.error("Error fetching templates", err))
      
    fetch(`${API_URL}/system-settings`)
      .then(res => res.json())
      .then(data => setSystemSettings(data))
      .catch(err => console.error("Error fetching system settings", err))
  }, [])

  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')
  const [requestId, setRequestId] = useState<string>('')
  const [systemSettings, setSystemSettings] = useState<any>(null)
  const [estimatedPages, setEstimatedPages] = useState(1)

  // Parse query parameters for pre-filling employee and template fields
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const empId = params.get('employeeId')
      const tempId = params.get('template')
      const reqId = params.get('requestId')
      
      if (empId) setSelectedEmployee(empId)
      if (tempId) setSelectedTemplate(tempId)
      if (reqId) setRequestId(reqId)
    }
  }, [employees])

  const [extraFields, setExtraFields] = useState<any>({
    stipend: '10,000',
    startDate: dayjs().format('YYYY-MM-DD'),
    endDate: dayjs().add(3, 'month').format('YYYY-MM-DD'),
    gender: 'Male',
    name: '',
    address: '',
    contactNo: '',
    department: 'Developing',
    location: 'Surat',
    workingHours: '9:30 AM to 6:30 PM',
    salary: '25,000',
    noticePeriod: '30 Days',
    lastWorkingDay: dayjs().format('YYYY-MM-DD'),
    lastDesignation: '',
    performance: 'Excellent',
    resignationDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
    outstandingDues: 'None',
    probationPeriod: '3 Months',
    reportingTo: 'HR Manager',
  })

  // Auto-generate preview when prefilled variables are fully loaded
  useEffect(() => {
    if (selectedEmployee && selectedTemplate && extraFields.name && employees.length > 0) {
      const timer = setTimeout(() => {
        generatePreview()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [selectedEmployee, selectedTemplate, extraFields.name, employees])
  
  // Sync fields when employee is selected
  useEffect(() => {
    if (selectedEmployee && selectedEmployee !== 'manual') {
      const emp = employees.find((e: any) => e.id === selectedEmployee)
      if (emp) {
        setExtraFields((prev: any) => ({
          ...prev,
          name: emp.name || `${emp.firstName} ${emp.lastName}`,
          gender: (emp as any).gender || 'Male',
          designation: emp.designation || (emp as any).designationTitle || prev.designation,
          department: emp.department || (emp as any).departmentName || prev.department,
          address: (emp as any).address || 'Resident Address, City',
          contactNo: emp.phone || (emp as any).mobile || '+91 0000000000',
          startDate: emp.joinDate ? dayjs(emp.joinDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        }))
      }
    } else if (selectedEmployee === 'manual') {
      setExtraFields((prev: any) => ({
        ...prev,
        name: '',
        gender: 'Male',
        designation: '',
        department: 'Developing',
        address: '',
        contactNo: '',
        startDate: dayjs().format('YYYY-MM-DD'),
      }))
    }
  }, [selectedEmployee, employees])

  const [previewContent, setPreviewContent] = useState<string>('')
  const previewRef = useRef<HTMLDivElement>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [includeAcceptance, setIncludeAcceptance] = useState(false)

  const templateData = documentTemplates.find((t: any) => t.template_id === selectedTemplate)

  const isManual = selectedEmployee === 'manual'
  const currentEmployee: any = isManual ? {
    name: extraFields.name || 'Candidate Name',
    firstName: (extraFields.name || 'Candidate').split(' ')[0],
    lastName: (extraFields.name || '').split(' ').slice(1).join(' '),
    employeeId: 'MANUAL',
    department: extraFields.department || 'Developing',
    designation: extraFields.designation || 'Intern',
    gender: 'Male'
  } : employees.find((e: any) => e.id === selectedEmployee)

  const generatePreview = async () => {
    if (!selectedTemplate || !selectedEmployee) {
      toast.error('Please select a template and an employee or Manual Entry')
      return
    }

    if (!currentEmployee) {
      toast.error('Please select an employee')
      return
    }

    if (!templateData || !templateData.content) {
      setPreviewContent(`<div class="p-20 text-center text-gray-400 font-bold italic">Template content for ${templateData?.name || 'this template'} is under development...</div>`)
      toast.success('Document preview generated!')
      return
    }

    const todayFormatted = dayjs().format('DD/MM/YYYY')
    const empName = extraFields.name || currentEmployee.name || `${currentEmployee.firstName} ${currentEmployee.lastName}`
    const empAddress = currentEmployee.address || 'Resident Address, City'
    let userStartDate = extraFields.startDate
    let userEndDate = extraFields.endDate
    
    if (templateData?.fields) {
      const actualStartField = templateData.fields.find((f: string) => f.toLowerCase().replace(/\s+/g, '') === 'startdate' || f.toLowerCase() === 'start_date')
      if (actualStartField && extraFields[actualStartField]) {
        userStartDate = extraFields[actualStartField]
      }
      
      const actualEndField = templateData.fields.find((f: string) => f.toLowerCase().replace(/\s+/g, '') === 'enddate' || f.toLowerCase() === 'end_date')
      if (actualEndField && extraFields[actualEndField]) {
        userEndDate = extraFields[actualEndField]
      }
    }
    
    const startDateFormatted = userStartDate ? dayjs(userStartDate).format('DD/MM/YYYY') : dayjs().format('DD/MM/YYYY')
    const endDateFormatted = userEndDate ? dayjs(userEndDate).format('DD/MM/YYYY') : dayjs().format('DD/MM/YYYY')
    const genderValue = extraFields.gender || currentEmployee?.gender || 'Male'
    const honorific = genderValue === 'Female' ? 'Ms.' : 'Mr.'

    let htmlContent = templateData.content

    // Replace basic variables
    htmlContent = htmlContent.replace(/\{\{todayFormatted\}\}/g, todayFormatted)
    htmlContent = htmlContent.replace(/\{\{empName\}\}/g, empName)
    htmlContent = htmlContent.replace(/\{\{empAddress\}\}/g, empAddress)
    htmlContent = htmlContent.replace(/\{\{startDateFormatted\}\}/g, startDateFormatted)
    htmlContent = htmlContent.replace(/\{\{endDateFormatted\}\}/g, endDateFormatted)
    htmlContent = htmlContent.replace(/\{\{genderValue\}\}/g, genderValue)
    htmlContent = htmlContent.replace(/\{\{honorific\}\}/g, honorific)
    
    // Replace all extraFields
    Object.keys(extraFields).forEach(key => {
      let value = extraFields[key] || ''
      if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
        value = dayjs(value).format('DD/MM/YYYY')
      }
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
      htmlContent = htmlContent.replace(regex, value)
    })
    
    // Replace all currentEmployee fields
    Object.keys(currentEmployee).forEach(key => {
      const regex = new RegExp(`\{\{currentEmployee\.${key}\}\}`, 'g')
      htmlContent = htmlContent.replace(regex, currentEmployee[key] || '')
    })

    // Include Acceptance
    const acceptanceHtml = includeAcceptance ? `
      <div style="color: black; font-size: 14px; margin-bottom: 0px; margin-top: 40px; border-top: 1px dashed #ccc; padding-top: 20px;">
        <p style="font-weight: bold; font-size: 16px; margin-bottom: 8px;">Acceptance by Candidate</p>
        <p style="text-align: justify; line-height: 1.5; margin-bottom: 16px;">
          I, ______________________, accept the offer and agree to abide by the company policies and terms.
        </p>
        <p style="font-weight: bold; margin-bottom: 5px;">Candidate Signature: ______________________</p>
        <p style="font-weight: bold; margin: 0;">Date: ______________________</p>
      </div>
    ` : ''
    
    htmlContent = htmlContent.replace(/\{\{includeAcceptance\}\}/g, acceptanceHtml)

    setPreviewContent(htmlContent)
    toast.success('Document preview generated!')
  }

  const [isDownloading, setIsDownloading] = useState(false)

  useEffect(() => {
    const scripts = [
      'https://cdnjs.cloudflare.com/ajax/libs/dom-to-image/2.6.0/dom-to-image.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
    ]
    scripts.forEach(src => {
      if (!document.querySelector(`script[src="${src}"]`)) {
        const script = document.createElement('script')
        script.src = src
        script.async = true
        document.body.appendChild(script)
      }
    })
  }, [])

  useEffect(() => {
    if (!previewRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const target = entry.target as HTMLElement;
        const editor = target.querySelector('.ql-editor');
        let contentHeight = target.getBoundingClientRect().height;
        
        if (editor) {
          const elements = Array.from(editor.children) as HTMLElement[];
          let maxBottom = 0;
          let hasContent = false;
          
          for (const el of elements) {
            // Check if element has visible text or an image
            if (el.textContent?.trim() !== '' || el.querySelector('img')) {
              hasContent = true;
              const bottom = el.offsetTop + el.offsetHeight;
              if (bottom > maxBottom) {
                maxBottom = bottom;
              }
            }
          }
          
          if (hasContent) {
             const editorTop = (editor as HTMLElement).offsetTop || 0;
             // Add 80px buffer so we don't cut off descenders or margins tightly
             contentHeight = editorTop + maxBottom + 80; 
          }
        }
        
        // A4 page height is exactly 297mm. At 96 DPI, this is approx 1122.5px
        setEstimatedPages(Math.max(1, Math.ceil(contentHeight / 1122.5)));
      }
    });
    observer.observe(previewRef.current);
    return () => observer.disconnect();
  }, [previewContent, systemSettings, isEditing])

  const handleDownloadPDF = async () => {
    setIsDownloading(true)
    try {
      const node = document.querySelector('.document-preview') as HTMLElement
      if (!node) return

      const domtoimage = (window as any).domtoimage
      const { jsPDF } = (window as any).jspdf

      if (!domtoimage || !jsPDF) {
        toast.error('Libraries not loaded yet. Please wait a second.')
        return
      }

      // 1. Create a clean clone for capture to prevent "dirty DOM" artifacts
      const clone = node.cloneNode(true) as HTMLElement
      
      // Force A4 width in pixels (210mm at 96 DPI = ~794px)
      // This prevents the PDF text from becoming huge if the screen shrank the preview
      const a4WidthPx = 794
      
      // 2. Setup a temporary isolated container for the clone
      const container = document.createElement('div')
      container.style.position = 'fixed'
      container.style.left = '-10000px'
      container.style.top = '0'
      container.style.width = `${a4WidthPx}px`
      container.style.background = 'white'
      
      const qlContainer = document.createElement('div')
      qlContainer.className = 'ql-container ql-snow border-none !font-sans'
      qlContainer.appendChild(clone)
      
      container.appendChild(qlContainer)
      document.body.appendChild(container)

      // Ensure the clone has proper dimensions in the isolated container
      clone.style.width = `${a4WidthPx}px`
      clone.style.margin = '0'
      clone.style.position = 'relative'
      clone.style.transform = 'none'
      clone.style.boxShadow = 'none'
      
      // Get the actual height after setting the fixed width
      const nodeHeight = Math.max(1123, estimatedPages * 1123) // Force exact A4 page multiples
      container.style.height = `${nodeHeight}px`
      clone.style.height = `${nodeHeight}px`
      
      // Make repeating letterheads fully opaque for the PDF
      clone.querySelectorAll('.repeating-letterhead').forEach(el => {
        el.classList.remove('opacity-30')
      })

      const scale = 1
      const dataUrl = await domtoimage.toPng(clone, {
        bgcolor: '#ffffff',
        width: a4WidthPx * scale,
        height: nodeHeight * scale,
        cacheBust: true,
        style: {
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: `${a4WidthPx}px`,
          height: `${nodeHeight}px`,
        }
      })

      // 3. Cleanup the temporary container immediately
      document.body.removeChild(container)

      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (nodeHeight * pdfWidth) / a4WidthPx
      
      const pageHeight = pdf.internal.pageSize.getHeight()
      let heightLeft = pdfHeight
      let position = 0
      
      pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, pdfHeight)
      heightLeft -= pageHeight
      
      while (heightLeft > 1) {
        position -= pageHeight
        pdf.addPage()
        pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, pdfHeight)
        heightLeft -= pageHeight
      }
      
      // 4. Map links from the ORIGINAL node (to ensure coordinates are correct)
      const rect = node.getBoundingClientRect()
      node.querySelectorAll('a').forEach(link => {
        const linkRect = link.getBoundingClientRect()
        const relX = (linkRect.left - rect.left) / rect.width
        const relY = (linkRect.top - rect.top) / rect.height
        pdf.link(relX * pdfWidth, relY * pdfHeight, (linkRect.width / rect.width) * pdfWidth, (linkRect.height / rect.height) * pdfHeight, { url: link.href })
      })

      const rawName = extraFields.name || (currentEmployee ? `${currentEmployee.firstName} ${currentEmployee.lastName}` : 'Employee')
      const employeeName = rawName.trim().replace(/\s+/g, '_')
      const templateLabel = selectedTemplate.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join('_')
      const filename = `${templateLabel}_${employeeName}.pdf`
      
      pdf.save(filename)
      toast.success('Downloaded successfully!')
    } catch (error) {
      console.error('PDF Error:', error)
      toast.error('Download failed. Try printing instead.')
    } finally {
      setIsDownloading(false)
    }
  }

  const [isSending, setIsSending] = useState(false)

  const handleSendLetterToEmployee = async () => {
    if (!selectedTemplate || !selectedEmployee) {
      toast.error('Please select a template and an employee')
      return
    }
    if (selectedEmployee === 'manual') {
      toast.error('Cannot send a document to a manually entered recipient. Please select an employee.')
      return
    }

    setIsSending(true)
    try {
      let absoluteUrl = ''
      let filename = ''
      
      const rawName = extraFields.name || (currentEmployee ? `${currentEmployee.firstName} ${currentEmployee.lastName}` : 'Employee')
      const employeeName = rawName.trim().replace(/\s+/g, '_')
      const templateLabel = selectedTemplate.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join('_')
      
      const node = document.querySelector('.document-preview') as HTMLElement
      if (!node) {
        toast.error('Please generate a preview first')
        setIsSending(false)
        return
      }

        const domtoimage = (window as any).domtoimage
        const { jsPDF } = (window as any).jspdf

        if (!domtoimage || !jsPDF) {
          toast.error('Libraries not loaded yet. Please wait a second.')
          setIsSending(false)
          return
        }

        // 1. Create a clean clone for capture to prevent "dirty DOM" artifacts
        const clone = node.cloneNode(true) as HTMLElement
      
      // Force A4 width in pixels (210mm at 96 DPI = ~794px)
      // This prevents the PDF text from becoming huge if the screen shrank the preview
      const a4WidthPx = 794
      
      // 2. Setup a temporary isolated container for the clone
      const container = document.createElement('div')
      container.style.position = 'fixed'
      container.style.left = '-10000px'
      container.style.top = '0'
      container.style.width = `${a4WidthPx}px`
      container.style.background = 'white'
      
      const qlContainer = document.createElement('div')
      qlContainer.className = 'ql-container ql-snow border-none !font-sans'
      qlContainer.appendChild(clone)
      
      container.appendChild(qlContainer)
      document.body.appendChild(container)

      // Ensure the clone has proper dimensions in the isolated container
      clone.style.width = `${a4WidthPx}px`
      clone.style.margin = '0'
      clone.style.position = 'relative'
      clone.style.transform = 'none'
      clone.style.boxShadow = 'none'
      
      // Get the actual height after setting the fixed width
      const nodeHeight = Math.max(1123, estimatedPages * 1123) // Force exact A4 page multiples
      container.style.height = `${nodeHeight}px`
      clone.style.height = `${nodeHeight}px`
      
      // Make repeating letterheads fully opaque for the PDF
      clone.querySelectorAll('.repeating-letterhead').forEach(el => {
        el.classList.remove('opacity-30')
      })

      const scale = 1
      const dataUrl = await domtoimage.toPng(clone, {
        bgcolor: '#ffffff',
        width: a4WidthPx * scale,
        height: nodeHeight * scale,
        cacheBust: true,
        style: {
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: `${a4WidthPx}px`,
          height: `${nodeHeight}px`,
        }
      })

      // 3. Cleanup the temporary container immediately
      document.body.removeChild(container)

      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (nodeHeight * pdfWidth) / a4WidthPx
      
      const pageHeight = pdf.internal.pageSize.getHeight()
      let heightLeft = pdfHeight
      let position = 0
      
      pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, pdfHeight)
      heightLeft -= pageHeight
      
      while (heightLeft > 1) {
        position -= pageHeight
        pdf.addPage()
        pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, pdfHeight)
        heightLeft -= pageHeight
      }
      
      // 4. Map links from the ORIGINAL node
      const rect = node.getBoundingClientRect()
      node.querySelectorAll('a').forEach(link => {
        const linkRect = link.getBoundingClientRect()
        const relX = (linkRect.left - rect.left) / rect.width
        const relY = (linkRect.top - rect.top) / rect.height
        pdf.link(relX * pdfWidth, relY * pdfHeight, (linkRect.width / rect.width) * pdfWidth, (linkRect.height / rect.height) * pdfHeight, { url: link.href })
      })

        filename = `${templateLabel}_${employeeName}.pdf`
        
        // Get PDF Blob
        const pdfBlob = pdf.output('blob')
        const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' })
        
        const formDataUpload = new FormData()
        formDataUpload.append('file', pdfFile)
        
        // Upload PDF to server
        const uploadRes = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          body: formDataUpload
        })
        
        if (!uploadRes.ok) {
          throw new Error('Failed to upload generated PDF')
        }
        
        const uploadData = await uploadRes.json()
        absoluteUrl = uploadData.url.startsWith('http') 
          ? uploadData.url 
          : `${API_URL}${uploadData.url}`
        
      let matchedRequest = null
      
      if (requestId) {
        // Fetch specific request by ID
        const requestsRes = await fetch(`${API_URL}/document-requests`)
        if (requestsRes.ok) {
          const requests = await requestsRes.json()
          matchedRequest = requests.find((r: any) => r.id === requestId)
        }
      }
      
      if (!matchedRequest) {
        // Fetch employee requests to see if there is any pending request for this template
        const requestsRes = await fetch(`${API_URL}/document-requests?employeeId=${selectedEmployee}`)
        if (requestsRes.ok) {
          const requests = await requestsRes.json()
          matchedRequest = requests.find((r: any) => 
            r.documentType === templateData?.name && 
            r.status !== 'Sent'
          )
        }
      }
      
      if (matchedRequest) {
        // Update the existing request to 'Sent'
        const updateRes = await fetch(`${API_URL}/document-requests/${matchedRequest.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'Sent',
            fileName: filename,
            fileUrl: absoluteUrl,
            sentDate: new Date().toISOString().split('T')[0]
          })
        })
        
        if (updateRes.ok) {
          toast.success('Generated document sent successfully!')
        } else {
          throw new Error('Failed to update request status')
        }
      } else {
        // Create a new request directly marked as 'Sent'
        const empDisplayName = currentEmployee ? `${currentEmployee.firstName} ${currentEmployee.lastName}` : 'Employee'
        const createRes = await fetch(`${API_URL}/document-requests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId: selectedEmployee,
            employeeName: empDisplayName,
            documentType: templateData?.name || 'Official Letter',
            reason: 'Generated via built-in Document Generator',
            status: 'Sent',
            requestDate: new Date().toISOString().split('T')[0],
            fileName: filename,
            fileUrl: absoluteUrl,
            sentDate: new Date().toISOString().split('T')[0]
          })
        })
        
        if (createRes.ok) {
          // Notify the employee
          await fetch(`${API_URL}/notifications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              employee_id: selectedEmployee,
              title: 'Your Document is Ready',
              message: `Your ${templateData?.name || 'Official Letter'} has been generated and sent to you. You can download it from the Official Letters section.`,
              type: 'document',
              is_read: false
            })
          })
          toast.success('Generated document sent to employee successfully!')
        } else {
          throw new Error('Failed to create and send document')
        }
      }
      
    } catch (error) {
      console.error('Send PDF Error:', error)
      toast.error('Failed to send document to employee.')
    } finally {
      setIsSending(false)
    }
  }

  const handlePrint = () => {
    if (!previewContent) return
    
    const employeeName = currentEmployee ? `${currentEmployee.firstName} ${currentEmployee.lastName}` : 'Employee'
    const docTitle = `${selectedTemplate.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} - ${employeeName}`
    const printWindow = window.open('', '_blank')
    
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${docTitle}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');
              body { font-family: 'Calibri', Arial, sans-serif; margin: 0; padding: 0; background-color: #f1f5f9; }
              @media print {
                @page { size: A4; margin: 0; }
                body { background-color: white !important; margin: 0; padding: 0; }
                .no-print { display: none !important; }
                .document-preview { 
                  box-shadow: none !important; 
                  border: none !important; 
                  width: 100% !important; 
                  max-width: none !important; 
                  margin: 0 !important;
                  padding: 0 !important;
                  min-height: 0 !important; 
                }
              }
              .document-preview {
                box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
              }
            </style>
          </head>
          <body>
            <div class="no-print p-4 bg-white border-b border-slate-200 text-slate-800 flex justify-between items-center sticky top-0 z-50">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-[#3498db]/10 flex items-center justify-center">
                  <svg class="w-4 h-4 text-[#3498db]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                </div>
                <span class="font-bold text-sm tracking-tight">Print Preview - ${employeeName}</span>
              </div>
              <button onclick="window.print()" class="bg-[#3498db] hover:bg-[#2980b9] text-white px-6 py-2 rounded-lg font-bold transition-all flex items-center gap-2 shadow-sm">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                Print Document
              </button>
            </div>
            <div class="py-10 flex justify-center">
              <div class="document-preview bg-white min-h-[297mm] w-[210mm] p-[15mm] border border-slate-100">
                ${systemSettings?.companyLetterheadUrl ? `<div class="-mt-[15mm] -mx-[15mm] mb-[10mm]"><img src="${systemSettings.companyLetterheadUrl.startsWith('http') ? systemSettings.companyLetterheadUrl : `${API_URL}${systemSettings.companyLetterheadUrl}`}" class="w-full object-contain" /></div>` : ''}
                <div class="ql-editor p-0">
                  ${previewContent}
                </div>
              </div>
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-brand-teal" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Document Generator" 
        description="Automatically generate professional HR documents, letters, and certificates for employees."
      >
        <Link href="/employees/documents">
          <Button variant="outline" className="gap-2 font-bold border-brand-teal/50 text-brand-teal hover:bg-brand-teal hover:text-white transition-all shadow-sm">
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
                    {documentTemplates.map(t => (
                      <SelectItem key={t.id} value={t.template_id}>
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
                  {(selectedEmployee === 'manual' && !templateData?.fields?.includes('name')
                    ? ['name', ...(templateData?.fields || [])]
                    : (templateData?.fields || []))
                    .filter((field: string) => !(selectedEmployee !== 'manual' && field === 'name'))
                    .map((field: string) => (
                    <div key={field} className="space-y-2">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        {field === 'ctc' ? <IndianRupee className="w-3 h-3" /> : 
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
                      ) : field === 'gender' ? (
                        <Select 
                          value={extraFields[field] || 'Male'} 
                          onValueChange={(v) => setExtraFields({...extraFields, [field]: v})}
                        >
                          <SelectTrigger className="h-10 border-slate-200 bg-slate-50/30">
                            <SelectValue placeholder="Select gender..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : field === 'stipend' ? (
                        <div className="space-y-2">
                          <Select 
                            value={extraFields[field] === 'Unpaid' ? 'Unpaid' : 'Paid'} 
                            onValueChange={(v) => {
                              if (v === 'Unpaid') {
                                setExtraFields({...extraFields, [field]: 'Unpaid'})
                              } else {
                                setExtraFields({...extraFields, [field]: '10,000'})
                              }
                            }}
                          >
                            <SelectTrigger className="h-10 border-slate-200 bg-slate-50/30">
                              <SelectValue placeholder="Stipend type..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Unpaid">Unpaid</SelectItem>
                              <SelectItem value="Paid">Paid (Custom Amount)</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          {extraFields[field] !== 'Unpaid' && (
                            <Input 
                              type="text"
                              value={extraFields[field] || ''}
                              onChange={(e) => setExtraFields({...extraFields, [field]: e.target.value})}
                              className="h-10 border-slate-200 focus:bg-slate-50/50"
                              placeholder="Enter amount (e.g. 10,000)..."
                            />
                          )}
                        </div>
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

                {selectedTemplate === 'employee-offer-letter' && (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                    <Checkbox
                      id="include-acceptance"
                      checked={includeAcceptance}
                      onCheckedChange={(checked) => setIncludeAcceptance(checked === true)}
                    />
                    <Label htmlFor="include-acceptance" className="text-sm font-semibold text-slate-700 cursor-pointer">
                      Include Acceptance by Candidate
                    </Label>
                  </div>
                )}

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
                  <div className="w-10 h-10 rounded-xl bg-brand-teal/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-brand-teal" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 tracking-tight">Document Preview</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs font-medium text-slate-500">
                        {currentEmployee ? `${currentEmployee.firstName} ${currentEmployee.lastName} (${templateData?.name || 'Template'})` : 'No employee selected'}
                      </p>
                      {previewContent && (
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">
                          ~{estimatedPages} {estimatedPages === 1 ? 'Page' : 'Pages'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!templateData?.file_url && (
                    <Button 
                      variant={isEditing ? "default" : "outline"}
                      size="sm"
                      className={`font-bold gap-2 px-4 h-9 rounded-lg shadow-sm ${isEditing ? 'bg-amber-500 hover:bg-amber-600 text-white border-none' : 'border-amber-200 text-amber-600 hover:bg-amber-50 hover:text-amber-700'}`}
                      disabled={!previewContent || isDownloading}
                      onClick={() => {
                        if (isEditing && previewRef.current) {
                          setPreviewContent(previewRef.current.innerHTML)
                        }
                        setIsEditing(!isEditing)
                      }}
                    >
                      {isEditing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                      {isEditing ? 'Save Edits' : 'Edit Text'}
                    </Button>
                  )}
                  <Button 
                    variant="outline"
                    className="border-[#3498db] text-[#3498db] hover:bg-[#3498db]/5 font-bold gap-2 px-6 h-9 rounded-lg shadow-sm"
                    disabled={!previewContent || isDownloading}
                    onClick={handleDownloadPDF}
                  >
                    {isDownloading ? (
                      <><RefreshCw className="w-4 h-4 animate-spin" />Generating...</>
                    ) : (
                      <><Download className="w-4 h-4" />Download PDF</>
                    )}
                  </Button>
                  {selectedEmployee !== 'manual' && (
                    <Button 
                      className="bg-brand-teal hover:bg-brand-teal/90 text-white font-bold gap-2 px-6 h-9 rounded-lg shadow-sm"
                      disabled={!previewContent || isDownloading || isSending}
                      onClick={handleSendLetterToEmployee}
                    >
                      {isSending ? (
                        <><Loader2 className="w-4 h-4 animate-spin" />Sending...</>
                      ) : (
                        <><Send className="w-4 h-4" />Send to Employee</>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            

            <CardContent className="p-8 flex-1 overflow-y-auto scrollbar-hide">
              {previewContent ? (
                <div className="mx-auto relative" style={{ width: '794px' }}>
                  <div className="ql-container ql-snow border-none !font-sans">
                    <div 
                      ref={previewRef}
                      className={`document-preview bg-white shadow-xl shadow-slate-200/50 p-[15mm] transition-all relative border border-slate-100 ${isEditing ? 'ring-2 ring-amber-400 cursor-text shadow-2xl' : ''}`}
                      style={{ minHeight: '1123px' }}
                    >
                      {systemSettings?.companyLetterheadUrl && (
                        <div className="-mt-[15mm] -mx-[15mm] mb-[10mm]">
                          <img 
                            src={systemSettings.companyLetterheadUrl.startsWith('http') ? systemSettings.companyLetterheadUrl : `${API_URL}${systemSettings.companyLetterheadUrl}`} 
                            alt="Company Letterhead" 
                            className="w-full object-contain"
                          />
                        </div>
                      )}
                      <div className="relative mt-6 -mx-[15px] group">
                        <div 
                          dangerouslySetInnerHTML={{ __html: previewContent }} 
                          className="ql-editor"
                          contentEditable={isEditing}
                          suppressContentEditableWarning={true}
                          onBlur={(e) => {
                            if (isEditing) {
                              setPreviewContent(e.currentTarget.innerHTML);
                            }
                          }}
                        />
                      </div>
                      
                      {/* Repeating Letterheads for Page 2+ */}
                      {systemSettings?.companyLetterheadUrl && estimatedPages > 1 && Array.from({ length: estimatedPages - 1 }).map((_, i) => (
                        <div 
                          key={`lh-${i+1}`}
                          className="absolute left-0 w-full pointer-events-none z-0 repeating-letterhead transition-opacity"
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
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          backface-visibility: hidden;
        }
        .document-preview:hover {
          transform: translateY(-8px) scale(1.005);
          box-shadow: 0 30px 60px -15px rgba(0,0,0,0.15);
        }
        .document-preview a {
          transition: all 0.2s ease;
        }
        .document-preview a:hover {
          color: #3498db !important;
          text-decoration-thickness: 2px;
        }
        @media print {
          .no-print { display: none; }
        }
      `}</style>
    </div>
  )
}
