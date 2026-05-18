'use client'

import { useState, useRef, useEffect } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileText, Download, Printer, Save, RefreshCw, ChevronLeft, Layout, FileType, User, Calendar, Briefcase, DollarSign, Edit3 } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { toast } from 'sonner'
import Link from 'next/link'
import dayjs from 'dayjs'

const DOCUMENT_TEMPLATES = [
  {
    id: 'offer-letter',
    name: 'Internship Offer Letter',
    description: 'Offer letter specifically for internship positions.',
    fields: ['name', 'gender', 'department', 'stipend', 'startDate', 'endDate']
  },
  {
    id: 'employee-offer-letter',
    name: 'Employee Offer Letter',
    description: 'Standard offer letter for full-time employees.',
    fields: ['name', 'gender', 'designation', 'department', 'salary', 'startDate']
  },
  {
    id: 'completion-certificate',
    name: 'Internship Completion Certificate',
    description: 'Official certificate for successful completion of internship period.',
    fields: ['name', 'gender', 'designation', 'startDate', 'endDate']
  },
  {
    id: 'appointment-letter',
    name: 'Appointment Letter',
    description: 'Official appointment letter for full-time employment.',
    fields: ['name', 'gender', 'designation', 'department', 'workingHours', 'salary', 'noticePeriod', 'startDate']
  },
  {
    id: 'agreement-letter',
    name: 'NDA & Agreement Letter',
    description: 'Employment agreement cum non-disclosure agreement.',
    fields: ['name', 'gender', 'designation', 'salary', 'startDate', 'contactNo']
  }
]

export default function DocumentGeneratorPage() {
  const { data } = useApi()
  const employees = data?.employees || []
  
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')
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
  
  // Sync fields when employee is selected
  useEffect(() => {
    if (selectedEmployee && selectedEmployee !== 'manual') {
      const emp = employees.find((e: any) => e.id === selectedEmployee)
      if (emp) {
        setExtraFields(prev => ({
          ...prev,
          name: emp.name || `${emp.firstName} ${emp.lastName}`,
          gender: emp.gender || 'Male',
          designation: emp.designation || emp.designationTitle || prev.designation,
          department: emp.department || emp.departmentName || prev.department,
          address: emp.address || 'Resident Address, City',
          contactNo: emp.phone || emp.mobile || '+91 0000000000',
          startDate: emp.joinDate ? dayjs(emp.joinDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        }))
      }
    } else if (selectedEmployee === 'manual') {
      setExtraFields(prev => ({
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

  const templateData = DOCUMENT_TEMPLATES.find(t => t.id === selectedTemplate)

  const isManual = selectedEmployee === 'manual'
  const currentEmployee = isManual ? {
    name: extraFields.name || 'Candidate Name',
    firstName: (extraFields.name || 'Candidate').split(' ')[0],
    lastName: (extraFields.name || '').split(' ').slice(1).join(' '),
    employeeId: 'MANUAL',
    department: extraFields.department || 'Developing',
    designation: extraFields.designation || 'Intern',
    gender: 'Male'
  } : employees.find((e: any) => e.id === selectedEmployee)

  const generatePreview = () => {
    if (!selectedTemplate || !selectedEmployee) {
      toast.error('Please select a template and an employee or Manual Entry')
      return
    }

    if (!currentEmployee) {
      toast.error('Please select an employee')
      return
    }

    const today = dayjs().format('DD MMMM, YYYY')
    const empName = extraFields.name || currentEmployee.name || `${currentEmployee.firstName} ${currentEmployee.lastName}`
    const empAddress = currentEmployee.address || 'Resident Address, City'
    
    let content = ''

    if (selectedTemplate === 'offer-letter') {
      const startDateFormatted = dayjs(extraFields.startDate).format('DD/MM/YYYY')
      const endDateFormatted = dayjs(extraFields.endDate).format('DD/MM/YYYY')
      const todayFormatted = dayjs().format('DD/MM/YYYY')
      const genderValue = extraFields.gender || currentEmployee?.gender || 'Male'
      const honorific = genderValue === 'Female' ? 'Ms.' : 'Mr.'

      content = `
        <div class="document-preview font-sans p-0 bg-white mx-auto text-black leading-[1.5] relative overflow-hidden" style="width: 210mm; height: 297mm; font-family: Calibri, Arial, sans-serif; font-size: 14px; color: #000000; border: none !important; box-shadow: none !important; outline: none !important;">
          <!-- Official Header Image -->
          <div class="w-full h-28 bg-white overflow-hidden relative">
            <img src="/header.png" alt="Company Header" class="w-[102%] h-[102%] object-fill absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>

          <div style="padding: 24px 48px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px;">
              <h2 style="font-size: 18px; font-weight: bold; color: black; margin: 0;">Internship Offer Letter</h2>
              <p style="font-weight: bold; font-size: 14px; margin: 0;">Date: <span style="font-weight: 500;">${todayFormatted}</span></p>
            </div>

            <div style="display: flex; justify-content: flex-end;">
              <div style="text-align: right; color: black; font-size: 14px; line-height: 1.3; font-weight: 500;">
                <p style="font-weight: bold; color: black; font-size: 14px; margin: 0;">HK DigiVerse LLP</p>
                <p style="margin: 0;">501-502, Silver Trade Center,</p>
                <p style="margin: 0;">Mota Varachha, Surat - 394101</p>
                <p style="margin: 0;">Website: <a href="https://www.hkdigiverse.com" target="_blank" style="color: #3498db; text-decoration: underline;">HK DigiVerse LLP</a></p>
                <p style="margin: 0;">Email: <a href="mailto:hr@hkdigiverse.com" style="color: #3498db; text-decoration: underline;">hr@hkdigiverse.com</a></p>
              </div>
            </div>

            <div style="margin-bottom: 16px; margin-top: 16px;">
              <p style="font-weight: bold; color: black; margin-bottom: 2px;">To,</p>
              <p style="font-weight: bold; color: black; font-size: 14px; margin: 0;">${honorific} ${empName}</p>
            </div>

            <p style="margin-bottom: 12px; font-weight: bold; font-size: 14px; color: black;">Subject: Offer for Internship Position</p>

            <div style="margin-bottom: 12px; color: black; font-size: 14px;">
              <p style="margin-bottom: 12px;">Dear Candidate,</p>
              <p style="text-align: justify; line-height: 1.6; margin: 0;">
                We are pleased to offer you an opportunity to join <span style="font-weight: bold;">HK DigiVerse LLP</span> as an Intern in the <span style="font-weight: bold;">${extraFields.department || 'Developing'}</span> Department.
              </p>
            </div>

            <div style="margin-bottom: 16px; color: black; font-size: 14px;">
              <p style="margin-bottom: 8px;">Your internship details are as follows:</p>
              <ul style="margin-left: 32px; list-style-type: none; padding: 0;">
                <li style="display: flex; margin-bottom: 4px;"><span style="font-weight: bold; width: 176px; flex-shrink: 0;">• Position:</span> <span>Intern</span></li>
                <li style="display: flex; margin-bottom: 4px;"><span style="font-weight: bold; width: 176px; flex-shrink: 0;">• Department:</span> <span>${extraFields.department || 'Developing'}</span></li>
                <li style="display: flex; margin-bottom: 4px;"><span style="font-weight: bold; width: 176px; flex-shrink: 0;">• Internship Duration:</span> <span>${startDateFormatted} to ${endDateFormatted}</span></li>
                <li style="display: flex; margin-bottom: 4px;"><span style="font-weight: bold; width: 176px; flex-shrink: 0;">• Working Hours:</span> <span>9:30AM to 6:30PM</span></li>
                <li style="display: flex; margin-bottom: 4px;"><span style="font-weight: bold; width: 176px; flex-shrink: 0;">• Location:</span> <span>HK DigiVerse LLP, Surat</span></li>
                <li style="display: flex; margin-bottom: 4px;"><span style="font-weight: bold; width: 176px; flex-shrink: 0;">• Stipend:</span> <span>${extraFields.stipend === 'Unpaid' ? 'Unpaid' : `₹ ${extraFields.stipend || '0'} /- per month`}</span></li>
              </ul>
            </div>

            <div style="margin-bottom: 16px; color: black; font-size: 14px; text-align: justify; line-height: 1.6;">
              <p style="margin-bottom: 12px;">During your internship period, you will be expected to perform your duties sincerely, maintain professional behavior, and follow all company rules and policies.</p>
              <p style="margin: 0;">Your internship may include training, project work, practical exposure, and performance evaluations. Based on your performance and company requirements, future opportunities may be considered.</p>
            </div>

            <div style="margin-bottom: 12px; color: black; font-size: 14px;">
              <p style="margin-bottom: 8px;">Please note the following conditions:</p>
              <ol style="margin-left: 32px; padding: 0;">
                <li style="margin-bottom: 4px;">You shall maintain confidentiality regarding all company data and information.</li>
                <li style="margin-bottom: 4px;">The company reserves the right to terminate the internship at any time in case of misconduct or unsatisfactory performance.</li>
                <li style="margin-bottom: 4px;">This internship does not guarantee permanent employment with the company.</li>
              </ol>
            </div>

            <div style="margin-bottom: 72px; color: black; font-size: 14px;">
              <p style="margin: 0;">We welcome you to the team and wish you a successful learning experience with us.</p>
              <p style="margin-top: 12px; margin-bottom: 0;">Sincerely,</p>
              <div style="margin-top: 12px;">
                <p style="font-weight: bold; margin: 0;">For HK DigiVerse LLP</p>
                <div style="margin-top: 32px;">
                  <p style="margin: 0;">Authorized Signatory</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="absolute mb-4 bottom-0 left-0 w-full p-4 bg-white flex justify-center items-center gap-4 text-[14px] font-bold text-[#3498db]">
            <span>HK DigiVerse LLP</span>
            <span class="text-gray-300">|</span>
            <span class="flex items-center gap-1">
              <svg class="w-3.5 h-3.5 text-[#3498db]" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"></path></svg>
              <span class="text-[#3498db]">+91 87805 64463</span>
            </span>
            <span class="text-gray-300">|</span>
            <span class="flex items-center gap-1">
              <svg class="w-3.5 h-3.5 text-[#3498db]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              <span><a href="mailto:hr@hkdigiverse.com" style="color: #3498db;">hr@hkdigiverse.com</a></span>
            </span>
            <span class="text-gray-300">|</span>
            <span class="flex items-center gap-1 uppercase">
              <svg class="w-3.5 h-3.5 text-[#3498db]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
              <span><a href="https://www.hkdigiverse.com" target="_blank" style="color: #3498db;">WWW.HKDIGIVERSE.COM</a></span>
            </span>
          </div>
        </div>
      `
    } else if (selectedTemplate === 'employee-offer-letter') {
      const startDateFormatted = dayjs(extraFields.startDate).format('DD/MM/YYYY')
      const todayFormatted = dayjs().format('DD/MM/YYYY')
      const genderValue = extraFields.gender || currentEmployee?.gender || 'Male'
      const honorific = genderValue === 'Female' ? 'Ms.' : 'Mr.'

      content = `
        <div class="document-preview font-sans p-0 bg-white mx-auto text-black leading-[1.5] relative overflow-hidden" style="width: 210mm; height: 297mm; font-family: Calibri, Arial, sans-serif; font-size: 14px; color: #000000; border: none !important; box-shadow: none !important; outline: none !important;">
          <!-- Official Header Image -->
          <div class="w-full h-28 bg-white overflow-hidden relative">
            <img src="/header.png" alt="Company Header" class="w-[102%] h-[102%] object-fill absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>

          <div style="padding: 16px 48px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px;">
              <h2 style="font-size: 20px; font-weight: bold; color: black; margin: 0; text-transform: uppercase;">Offer Letter</h2>
              <p style="font-weight: bold; font-size: 14px; margin: 0;">Date: <span style="font-weight: 500;">${todayFormatted}</span></p>
            </div>

            <div style="display: flex; justify-content: flex-end;">
              <div style="text-align: right; color: black; font-size: 14px; line-height: 1.3; font-weight: 500;">
                <p style="font-weight: bold; color: black; font-size: 14px; margin: 0;">HK DigiVerse LLP</p>
                <p style="margin: 0;">501-502, Silver Trade Center,</p>
                <p style="margin: 0;">Mota Varachha, Surat - 394101</p>
                <p style="margin: 0;">Website: <a href="https://www.hkdigiverse.com" target="_blank" style="color: #3498db; text-decoration: underline;">HK DigiVerse LLP</a></p>
                <p style="margin: 0;">Email: hr@hkdigiverse.com</p>
              </div>
            </div>

            <div style="margin-bottom: 10px;">
              <p style="color: black; margin-bottom: 2px;">To,</p>
              <p style="font-weight: bold; color: black; font-size: 14px; margin: 0;">${honorific} ${empName}</p>
            </div>

            <p style="margin-bottom: 8px; font-weight: bold; font-size: 14px; color: black;">Subject: Offer Letter for the position of <span>${extraFields.designation || currentEmployee?.designation || '__________'}</span></p>

            <div style="margin-bottom: 10px; color: black; font-size: 14px;">
              <p style="margin-bottom: 8px;">Dear ${empName},</p>
              <p style="text-align: justify; line-height: 1.5; margin: 0;">
                We are pleased to offer you the position of <span style="font-weight: bold;">${extraFields.designation || currentEmployee?.designation || '__________'}</span> at <span style="font-weight: bold;">HK DigiVerse LLP</span>. We believe your skills, knowledge, and experience will be a valuable addition to our organization.
              </p>
            </div>

            <div style="margin-bottom: 10px; color: black; font-size: 14px;">
              <p style="margin-bottom: 8px;">Your employment details are as follows:</p>
              <ul style="margin-left: 24px; list-style-type: disc; padding: 0;">
                <li style="margin-bottom: 2px;"><span style="font-weight: bold;">Designation:</span> ${extraFields.designation || currentEmployee?.designation || 'Employee'}</li>
                <li style="margin-bottom: 2px;"><span style="font-weight: bold;">Department:</span> ${extraFields.department || 'Developing'}</li>
                <li style="margin-bottom: 2px;"><span style="font-weight: bold;">Joining Date:</span> ${startDateFormatted}</li>
                <li style="margin-bottom: 2px;"><span style="font-weight: bold;">Work Location:</span> Office</li>
                <li style="margin-bottom: 2px;"><span style="font-weight: bold;">Working Hours:</span> 9:30AM to 6:30PM</li>
                <li style="margin-bottom: 2px;"><span style="font-weight: bold;">Salary/Stipend:</span> ₹ ${extraFields.salary || '25,000'} per month</li>
              </ul>
            </div>

            <div style="margin-bottom: 10px; color: black; font-size: 14px;">
              <p style="margin-bottom: 8px; font-weight: bold; font-size: 16px;">Terms & Conditions:</p>
              <ol style="list-style-type: decimal; padding-left: 24px; margin-left: 0;">
                <li style="margin-bottom: 2px; padding-left: 8px; text-align: justify;">During your employment, you are expected to maintain professionalism, confidentiality, and company ethics.</li>
                <li style="margin-bottom: 2px; padding-left: 8px; text-align: justify;">Any violation of company policies may result in disciplinary action.</li>
                <li style="margin-bottom: 2px; padding-left: 8px; text-align: justify;">Either party may terminate employment by providing notice as per company policy.</li>
                <li style="margin-bottom: 2px; padding-left: 8px; text-align: justify;">You will be required to submit all necessary documents at the time of joining.</li>
              </ol>
            </div>

            <p style="margin-bottom: 8px; color: black; font-size: 14px; text-align: justify;">
              Please sign and return a copy of this letter as a token of your acceptance of the offer.
            </p>

            <p style="margin-bottom: 8px; color: black; font-size: 14px; text-align: justify;">
              We are excited to welcome you to the team and look forward to a successful journey together.
            </p>

            <div style="margin-bottom: 10px; color: black; font-size: 14px;">
              <p style="margin-bottom: 8px;">Sincerely,</p>
              <p style="font-weight: bold; margin-bottom: 4px;">HR Department</p>
              <p style="margin: 0;">HK DigiVerse & IT Consultancy Pvt Ltd.</p>
            </div>

            <div style="color: black; font-size: 14px; margin-bottom: 0px;">
              <p style="font-weight: bold; font-size: 16px; margin-bottom: 8px;">Acceptance by Candidate</p>
              <p style="text-align: justify; line-height: 1.5; margin-bottom: 16px;">
                I, ______________________, accept the offer for the position of ______________________ at HK DigiVerse & IT Consultancy Pvt Ltd. and agree to abide by the company policies and terms mentioned above.
              </p>
              <p style="font-weight: bold; margin: 0;">Candidate Signature: ______________________</p>
            </div>
          </div>

          <!-- Footer -->
          <div class="absolute mb-4 bottom-0 left-0 w-full p-4 bg-white flex justify-center items-center gap-4 text-[14px] font-bold text-[#3498db]">
            <span>HK DigiVerse LLP</span>
            <span class="text-gray-300">|</span>
            <span class="flex items-center gap-1">
              <svg class="w-3.5 h-3.5 text-[#3498db]" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"></path></svg>
              <span class="text-[#3498db]">+91 87805 64463</span>
            </span>
            <span class="text-gray-300">|</span>
            <span class="flex items-center gap-1">
              <svg class="w-3.5 h-3.5 text-[#3498db]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              <span><a href="mailto:hr@hkdigiverse.com" style="color: #3498db;">hr@hkdigiverse.com</a></span>
            </span>
            <span class="text-gray-300">|</span>
            <span class="flex items-center gap-1 uppercase">
              <svg class="w-3.5 h-3.5 text-[#3498db]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
              <span><a href="https://www.hkdigiverse.com" target="_blank" style="color: #3498db;">WWW.HKDIGIVERSE.COM</a></span>
            </span>
          </div>
        </div>
      `
    } else if (selectedTemplate === 'completion-certificate') {
      const startDateFormatted = dayjs(extraFields.startDate).format('DD/MM/YYYY')
      const endDateFormatted = dayjs(extraFields.endDate).format('DD/MM/YYYY')
      const todayFormatted = dayjs().format('DD/MM/YYYY')
      const genderValue = extraFields.gender || currentEmployee?.gender || 'Male'
      const honorific = genderValue === 'Female' ? 'Ms.' : 'Mr.'

      content = `
        <div class="document-preview font-sans p-0 bg-white mx-auto text-black leading-[1.5] relative overflow-hidden" style="width: 210mm; height: 297mm; font-family: Calibri, Arial, sans-serif; font-size: 14px; color: #000000; border: none !important; box-shadow: none !important; outline: none !important;">
          <!-- Official Header Image -->
          <div class="w-full h-28 bg-white overflow-hidden relative">
            <img src="/header.png" alt="Company Header" class="w-[102%] h-[102%] object-fill absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>

          <div style="padding: 24px 48px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px;">
              <h2 style="font-size: 18px; font-weight: bold; color: black; margin: 0;">Internship Completion Certificate</h2>
              <p style="font-weight: bold; font-size: 14px; margin: 0;">Date: <span style="font-weight: 500;">${todayFormatted}</span></p>
            </div>

            <div style="display: flex; justify-content: flex-end;">
              <div style="text-align: right; color: black; font-size: 14px; line-height: 1.3; font-weight: 500;">
                <p style="font-weight: bold; color: black; font-size: 14px; margin: 0;">HK DigiVerse LLP</p>
                <p style="margin: 0;">501-502, Silver Trade Center,</p>
                <p style="margin: 0;">Mota Varachha, Surat - 394101</p>
                <p style="margin: 0;">Website: <a href="https://www.hkdigiverse.com" target="_blank" style="color: #3498db; text-decoration: underline;">HK DigiVerse LLP</a></p>
                <p style="margin: 0;">Email: <a href="mailto:hr@hkdigiverse.com" style="color: #000000;">hr@hkdigiverse.com</a></p>
              </div>
            </div>

            <div style="margin-bottom: 16px;">
              <p style="color: black; margin-bottom: 4px;">To,</p>
              <p style="font-weight: bold; color: black; font-size: 14px; margin: 0;">${honorific} ${empName}</p>
            </div>

            <div style="margin-bottom: 16px; color: black; font-size: 14px; text-align: justify; line-height: 1.6;">
              <p style="margin-bottom: 12px;">
                This is to certify that <span style="font-weight: bold;">${honorific} ${empName}</span> has successfully completed their internship at <span style="font-weight: bold;">HK DigiVerse LLP</span> as a <span style="font-weight: bold;">${extraFields.designation || currentEmployee?.designation || 'Intern'}</span> from <span style="font-weight: bold;">${startDateFormatted}</span> to <span style="font-weight: bold;">${endDateFormatted}</span>.
              </p>
              
              <p style="margin-bottom: 12px;">
                During the internship period, they worked on various assignments and projects related to their domain and demonstrated sincerity, dedication, and a willingness to learn. Their performance and conduct throughout the internship were found to be satisfactory.
              </p>
              
              <p style="margin-bottom: 14px;">
                We appreciate their contribution to the organization and wish them success in their future career and academic endeavors.
              </p>
            </div>

            <div style="margin-top: 14px; color: black; font-size: 14px;">
              <p style="margin: 0;">Sincerely,</p>
              <div style="margin-top: 12px;">
                <p style="font-weight: bold; font-size: 16px; margin: 0;">Het Mangukiya</p>
                <div style="margin-top: 30px; line-height: 1.2;">
                  <p style="font-weight: 500; margin: 0;">CEO & Founder</p>
                  <p style="margin: 0;">HK DigiVerse LLP</p>
                </div>
                <div style="margin-top: 14px;">
                  <p style="margin: 0;">(Signature & Company Seal)</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="absolute mb-4 bottom-0 left-0 w-full p-4 bg-white flex justify-center items-center gap-4 text-[14px] font-bold text-[#3498db]">
            <span>HK DigiVerse LLP</span>
            <span class="text-gray-300">|</span>
            <span class="flex items-center gap-1">
              <svg class="w-3.5 h-3.5 text-[#3498db]" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"></path></svg>
              <span class="text-[#3498db]">+91 87805 64463</span>
            </span>
            <span class="text-gray-300">|</span>
            <span class="flex items-center gap-1">
              <svg class="w-3.5 h-3.5 text-[#3498db]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              <span><a href="mailto:hr@hkdigiverse.com" style="color: #3498db;">hr@hkdigiverse.com</a></span>
            </span>
            <span class="text-gray-300">|</span>
            <span class="flex items-center gap-1 uppercase">
              <svg class="w-3.5 h-3.5 text-[#3498db]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
              <span><a href="https://www.hkdigiverse.com" target="_blank" style="color: #3498db;">WWW.HKDIGIVERSE.COM</a></span>
            </span>
          </div>
        </div>
      `
    } else if (selectedTemplate === 'appointment-letter') {
      const startDateFormatted = dayjs(extraFields.startDate).format('DD/MM/YYYY')
      const todayFormatted = dayjs().format('DD/MM/YYYY')
      const genderValue = extraFields.gender || currentEmployee?.gender || 'Male'
      const honorific = genderValue === 'Female' ? 'Ms.' : 'Mr.'
      
      content = `
        <div class="document-preview font-sans p-0 bg-white mx-auto text-black leading-[1.5] relative overflow-hidden" style="width: 210mm; height: 297mm; font-family: Calibri, Arial, sans-serif; font-size: 14px; color: #000000; border: none !important; box-shadow: none !important; outline: none !important;">
          <!-- Official Header Image -->
          <div class="w-full h-28 bg-white overflow-hidden relative">
            <img src="/header.png" alt="Company Header" class="w-[102%] h-[102%] object-fill absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>

          <div style="padding: 24px 48px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px;">
              <h2 style="font-size: 18px; font-weight: bold; color: black; margin: 0;">Appointment Letter</h2>
              <p style="font-weight: bold; font-size: 14px; margin: 0;">Date: <span style="font-weight: 500;">${todayFormatted}</span></p>
            </div>

            <div style="display: flex; justify-content: flex-end;">
              <div style="text-align: right; color: black; font-size: 14px; line-height: 1.3; font-weight: 500;">
                <p style="font-weight: bold; color: black; font-size: 14px; margin: 0;">HK DigiVerse LLP</p>
                <p style="margin: 0;">501-502, Silver Trade Center,</p>
                <p style="margin: 0;">Mota Varachha, Surat - 394101</p>
                <p style="margin: 0;">Website: <a href="https://www.hkdigiverse.com" target="_blank" style="color: #3498db; text-decoration: underline;">HK DigiVerse LLP</a></p>
                <p style="margin: 0;">Email: <a href="mailto:hr@hkdigiverse.com" style="color: #000000;">hr@hkdigiverse.com</a></p>
              </div>
            </div>

            <div style="margin-bottom: 16px;">
              <p style="color: black; margin-bottom: 4px;">To,</p>
              <p style="font-weight: bold; color: black; font-size: 14px; margin: 0;">${honorific} ${empName}</p>
            </div>

            <p style="margin-bottom: 12px; font-weight: bold; font-size: 14px; color: black;">Subject: Appointment Letter</p>

            <div style="margin-bottom: 16px; color: black; font-size: 14px; line-height: 1.6;">
              <p style="margin-bottom: 12px;">Dear <span style="font-weight: bold;">${empName}</span>,</p>
              <p style="text-align: justify; margin: 0;">
                We are pleased to appoint you as <span style="font-weight: bold;">${extraFields.designation || currentEmployee?.designation || 'Employee'}</span> at <span style="font-weight: bold;">HK DigiVerse LLP</span> effective from <span style="font-weight: bold;">${startDateFormatted}</span>.
              </p>
            </div>

            <div style="margin-bottom: 16px; color: black; font-size: 14px; line-height: 1.6;">
              <p style="margin-bottom: 12px;">Your employment will be governed by the following terms and conditions:</p>
              <ol style="margin-left: 16px; padding-left: 24px; list-style-type: decimal;">
                <li style="padding-left: 8px;"><span style="font-weight: bold;">Designation:</span> ${extraFields.designation || currentEmployee?.designation || 'Employee'}</li>
                <li style="padding-left: 8px;"><span style="font-weight: bold;">Department:</span> ${extraFields.department || currentEmployee?.department || 'Developing'}</li>
                <li style="padding-left: 8px;"><span style="font-weight: bold;">Work Location:</span> Office</li>
                <li style="padding-left: 8px;"><span style="font-weight: bold;">Working Hours:</span> ${extraFields.workingHours || '9:30 AM to 6:30 PM'}</li>
                <li style="padding-left: 8px;"><span style="font-weight: bold;">Salary:</span> ${extraFields.salary || '25,000'} as discussed and agreed upon.</li>
                <li style="padding-left: 8px;"><span style="font-weight: bold;">Leave Policy:</span> Leaves will be applicable as per company policies.</li>
                <li style="text-align: justify; padding-left: 8px;"><span style="font-weight: bold;">Confidentiality:</span> You shall maintain confidentiality regarding company data, clients, and internal processes during and after your employment.</li>
                <li style="text-align: justify; padding-left: 8px;"><span style="font-weight: bold;">Termination:</span> Either party may terminate this employment by giving ${extraFields.noticePeriod || '30 Days'} notice or salary in lieu thereof, as per company policy.</li>
                <li style="text-align: justify; padding-left: 8px;"><span style="font-weight: bold;">Company Policies:</span> You are required to comply with all rules, regulations, and policies of the company.</li>
              </ol>
            </div>

            <div style="margin-bottom: 16px; color: black; font-size: 14px; text-align: justify; line-height: 1.6;">
              <p style="margin-bottom: 12px;">You are requested to sign and return a copy of this letter as a token of your acceptance of the above terms and conditions.</p>
              <p style="margin: 0;">We welcome you to the team and wish you a successful career with us.</p>
            </div>

            <div style="margin-top: 14px; color: black; font-size: 14px;">
              <p style="margin: 0;">Sincerely,</p>
              <div style="margin-top: 12px;">
                <p style="margin: 0;">For</p>
                <p style="font-weight: bold; margin: 0;">HK DigiVerse LLP</p>
                <div style="margin-top: 40px; line-height: 1.2;">
                  <p style="font-weight: bold; margin: 0;">Het Mangukiya</p>
                  <p style="margin: 0;">CEO & Founder</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="absolute mb-4 bottom-0 left-0 w-full p-4 bg-white flex justify-center items-center gap-4 text-[14px] font-bold text-[#3498db]">
            <span>HK DigiVerse LLP</span>
            <span class="text-gray-300">|</span>
            <span class="flex items-center gap-1">
              <svg class="w-3.5 h-3.5 text-[#3498db]" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"></path></svg>
              <span class="text-[#3498db]">+91 87805 64463</span>
            </span>
            <span class="text-gray-300">|</span>
            <span class="flex items-center gap-1">
              <svg class="w-3.5 h-3.5 text-[#3498db]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              <span><a href="mailto:hr@hkdigiverse.com" style="color: #3498db;">hr@hkdigiverse.com</a></span>
            </span>
            <span class="text-gray-300">|</span>
            <span class="flex items-center gap-1 uppercase">
              <svg class="w-3.5 h-3.5 text-[#3498db]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
              <span><a href="https://www.hkdigiverse.com" target="_blank" style="color: #3498db;">WWW.HKDIGIVERSE.COM</a></span>
            </span>
          </div>
        </div>
      `
    } else if (selectedTemplate === 'agreement-letter') {
      const startDateFormatted = dayjs(extraFields.startDate).format('DD/MM/YYYY')
      const todayFormatted = dayjs().format('DD/MM/YYYY')
      const genderValue = extraFields.gender || currentEmployee?.gender || 'Male'
      const honorific = genderValue === 'Female' ? 'Ms.' : 'Mr.'
      
      content = `
        <div class="document-preview font-sans p-0 bg-white mx-auto text-black leading-[1.5] relative overflow-hidden" style="width: 210mm; font-family: Calibri, Arial, sans-serif; font-size: 14px; color: #000000; border: none !important; box-shadow: none !important; outline: none !important;">
          <!-- Page 1 Content -->
          <div style="height: 297mm; position: relative;">
            <div class="w-full h-28 bg-white overflow-hidden relative">
              <img src="/header.png" alt="Company Header" class="w-[102%] h-[102%] object-fill absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>

            <div style="padding: 24px 48px;">
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 24px;">
                <h2 style="font-size: 16px; font-weight: bold; color: black; margin: 0; max-width: 60%;">EMPLOYMENT AGREEMENT CUM NON-DISCLOSURE AGREEMENT (NDA)</h2>
                <p style="font-weight: bold; font-size: 14px; margin: 0;">Date: <span style="font-weight: 500;">${todayFormatted}</span></p>
              </div>

              <div style="display: flex; justify-content: flex-end;">
                <div style="text-align: right; color: black; font-size: 14px; line-height: 1.3; font-weight: 500;">
                  <p style="font-weight: bold; color: black; font-size: 14px; margin: 0;">HK DigiVerse LLP</p>
                  <p style="margin: 0;">501-502, Silver Trade Center,</p>
                  <p style="margin: 0;">Mota Varachha, Surat - 394101</p>
                  <p style="margin: 0;">Website: <a href="https://www.hkdigiverse.com" target="_blank" style="color: #3498db; text-decoration: underline;">HK DigiVerse LLP</a></p>
                  <p style="margin: 0;">Email: <a href="mailto:hr@hkdigiverse.com" style="color: #000000;">hr@hkdigiverse.com</a></p>
                </div>
              </div>

              <div style="margin-bottom: 24px;">
                <p style="color: black; margin-bottom: 4px;">To,</p>
                <p style="font-weight: bold; color: black; font-size: 14px; margin: 0;">${honorific} ${empName}</p>
              </div>

              <p style="margin-bottom: 16px; font-weight: bold; font-size: 14px; color: black; text-transform: uppercase;">EMPLOYMENT AGREEMENT CUM NON-DISCLOSURE AGREEMENT (NDA)</p>
              <p style="margin-bottom: 16px; text-align: justify;">This Employment Agreement Cum Non-Disclosure Agreement ("Agreement") is made and entered into between:</p>

              <div style="margin-bottom: 16px;">
                <p style="font-weight: bold; margin-bottom: 8px; font-size: 18px;">Employer:</p>
                <p style="text-align: justify; margin: 0;">
                  <span style="font-weight: bold;">HK DigiVerse LLP</span>, having its registered office at 501-502, Silver Trade Center, Mota Varachha, Surat - 394101, Gujarat, India (hereinafter referred to as the "Company").
                </p>
              </div>

              <p style="margin-bottom: 16px;">AND</p>

              <div style="margin-bottom: 16px;">
                <p style="font-weight: bold; margin-bottom: 8px; font-size: 18px;">Employee:</p>
                <p style="margin-bottom: 4px;"><span style="font-weight: bold;">${honorific} ${empName}</span></p>
                <p style="margin-bottom: 4px;">Address: _________________________________________</p>
                <p style="margin-bottom: 16px;">Contact No.: ${extraFields.contactNo || '___________________________'}</p>
                <p style="margin: 0;">(hereinafter referred to as the "Employee").</p>
              </div>

              <p style="margin-bottom: 24px;">Both parties agree to the following terms and conditions:</p>

              <div style="margin-bottom: 24px;">
                <p style="font-weight: bold; margin-bottom: 8px;">1. APPOINTMENT</p>
                <p style="text-align: justify; margin: 0;">
                  The Company hereby appoints the Employee as <span style="font-weight: bold;">${extraFields.designation || currentEmployee?.designation || 'Employee'}</span> and the Employee agrees to work under the rules, regulations, and policies of the Company.
                </p>
              </div>

              <div style="margin-bottom: 24px;">
                <p style="font-weight: bold; margin-bottom: 8px;">2. DATE OF JOINING</p>
                <p style="margin: 0;">The Employee's date of joining shall be <span style="font-weight: bold;">${startDateFormatted}</span>.</p>
              </div>

              <div style="margin-bottom: 24px;">
                <p style="font-weight: bold; margin-bottom: 8px;">3. WORKING HOURS</p>
                <p style="text-align: justify; margin: 0;">
                  The Employee shall work as per the Company's official working schedule and may be required to work additional hours when necessary for business requirements.
                </p>
              </div>
            </div>
            <div class="absolute mb-4 bottom-0 left-0 w-full p-4 bg-white flex justify-center items-center gap-4 text-[14px] font-bold text-[#3498db]">
              <span>HK DigiVerse LLP</span>
              <span class="text-gray-300">|</span>
              <span class="flex items-center gap-1">
                <svg class="w-3.5 h-3.5 text-[#3498db]" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"></path></svg>
                <span class="text-[#3498db]">+91 87805 64463</span>
              </span>
              <span class="text-gray-300">|</span>
              <span class="flex items-center gap-1">
                <svg class="w-3.5 h-3.5 text-[#3498db]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                <span><a href="mailto:hr@hkdigiverse.com" style="color: #3498db;">hr@hkdigiverse.com</a></span>
              </span>
              <span class="text-gray-300">|</span>
              <span class="flex items-center gap-1 uppercase">
                <svg class="w-3.5 h-3.5 text-[#3498db]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
                <span><a href="https://www.hkdigiverse.com" target="_blank" style="color: #3498db;">WWW.HKDIGIVERSE.COM</a></span>
              </span>
            </div>
          </div>

          <!-- Page 2 Content -->
          <div style="height: 297mm; position: relative;">
            <div class="w-full h-28 bg-white overflow-hidden relative">
              <img src="/header.png" alt="Company Header" class="w-[102%] h-[102%] object-fill absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div style="padding: 24px 48px;">
              <div style="margin-bottom: 24px;">
                <p style="font-weight: bold; margin-bottom: 8px;">4. SALARY & BENEFITS</p>
                <ul style="margin-left: 24px; list-style-type: disc; margin-bottom: 0;">
                  <li>Monthly Salary: ₹ <span style="font-weight: bold;">${extraFields.salary || '___________'}</span></li>
                  <li>Salary shall be paid subject to statutory deductions and company policies.</li>
                  <li>Any incentives, bonuses, or allowances shall be governed by Company rules.</li>
                </ul>
              </div>

              <div style="margin-bottom: 24px;">
                <p style="font-weight: bold; margin-bottom: 8px;">5. CONFIDENTIALITY / NON-DISCLOSURE</p>
                <p style="text-align: justify; margin-bottom: 12px;">
                  The Employee agrees that during and after employment, they shall not disclose, share, copy, misuse, or transfer any confidential information relating to:
                </p>
                <ul style="margin-left: 24px; list-style-type: disc; margin-bottom: 12px;">
                  <li>Clients and customer data</li>
                  <li>Source code, software, credentials, or systems</li>
                  <li>Business strategies and operations</li>
                  <li>Financial information</li>
                  <li>Marketing plans and internal documents</li>
                  <li>Any proprietary information of the Company</li>
                </ul>
                <p style="text-align: justify; margin: 0;">The Employee shall maintain complete confidentiality of all Company data and materials.</p>
              </div>

              <div style="margin-bottom: 24px;">
                <p style="font-weight: bold; margin-bottom: 8px;">6. INTELLECTUAL PROPERTY</p>
                <p style="text-align: justify; margin: 0;">
                  Any work, design, code, content, software, graphics, documents, ideas, inventions, or materials created by the Employee during employment shall remain the sole property of the Company.
                </p>
              </div>

              <div style="margin-bottom: 24px;">
                <p style="font-weight: bold; margin-bottom: 8px;">7. COMPANY ASSETS</p>
                <p style="text-align: justify; margin-bottom: 12px;">
                  The Employee shall properly maintain and return all Company property including:
                </p>
                <ul style="margin-left: 24px; list-style-type: disc; margin-bottom: 12px;">
                  <li>Laptop/Desktop</li>
                  <li>ID Card</li>
                  <li>Documents</li>
                  <li>Software Access</li>
                  <li>Login Credentials</li>
                  <li>Other official assets</li>
                </ul>
                <p style="text-align: justify; margin: 0;">upon resignation or termination.</p>
              </div>

              <div style="margin-bottom: 24px;">
                <p style="font-weight: bold; margin-bottom: 8px;">8. NOTICE PERIOD</p>
                <p style="text-align: justify; margin: 0;">
                  If the Employee leaves employment without serving the required notice period, the Company reserves the right to recover applicable dues as per Company policy.
                </p>
              </div>
            </div>
            <div class="absolute mb-4 bottom-0 left-0 w-full p-4 bg-white flex justify-center items-center gap-4 text-[14px] font-bold text-[#3498db]">
              <span>HK DigiVerse LLP</span>
              <span class="text-gray-300">|</span>
              <span class="flex items-center gap-1">
                <svg class="w-3.5 h-3.5 text-[#3498db]" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"></path></svg>
                <span class="text-[#3498db]">+91 87805 64463</span>
              </span>
              <span class="text-gray-300">|</span>
              <span class="flex items-center gap-1">
                <svg class="w-3.5 h-3.5 text-[#3498db]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                <span><a href="mailto:hr@hkdigiverse.com" style="color: #3498db;">hr@hkdigiverse.com</a></span>
              </span>
              <span class="text-gray-300">|</span>
              <span class="flex items-center gap-1 uppercase">
                <svg class="w-3.5 h-3.5 text-[#3498db]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
                <span><a href="https://www.hkdigiverse.com" target="_blank" style="color: #3498db;">WWW.HKDIGIVERSE.COM</a></span>
              </span>
            </div>
          </div>

          <!-- Page 3 Content -->
          <div style="height: 297mm; position: relative;">
            <div class="w-full h-28 bg-white overflow-hidden relative">
              <img src="/header.png" alt="Company Header" class="w-[102%] h-[102%] object-fill absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div style="padding: 24px 48px;">
              <div style="margin-bottom: 24px;">
                <p style="font-weight: bold; margin-bottom: 8px;">9. TERMINATION</p>
                <p style="text-align: justify; margin-bottom: 12px;">
                  The Company may terminate employment immediately in cases involving:
                </p>
                <ul style="margin-left: 24px; list-style-type: disc; margin-bottom: 0;">
                  <li>Misconduct</li>
                  <li>Data breach</li>
                  <li>Confidentiality violation</li>
                  <li>Fraudulent activity</li>
                  <li>Poor performance</li>
                  <li>Unauthorized absence</li>
                  <li>Violation of Company policies</li>
                </ul>
              </div>

              <div style="margin-bottom: 24px;">
                <p style="font-weight: bold; margin-bottom: 8px;">10. NON-COMPETE & NON-SOLICITATION</p>
                <p style="text-align: justify; margin-bottom: 12px;">
                  During employment the Employee shall not:
                </p>
                <ul style="margin-left: 24px; list-style-type: disc; margin-bottom: 0;">
                  <li>Directly solicit Company clients or employees</li>
                  <li>Use Company confidential information for personal/business gain</li>
                  <li>Misrepresent association with the Company</li>
                </ul>
              </div>

              <div style="margin-bottom: 24px;">
                <p style="font-weight: bold; margin-bottom: 8px;">11. GOVERNING LAW</p>
                <p style="text-align: justify; margin: 0;">
                  This Agreement shall be governed under the laws of India and jurisdiction shall remain in Surat, Gujarat.
                </p>
              </div>

              <div style="margin-bottom: 20px;">
                <p style="font-weight: bold; margin-bottom: 8px;">12. ACCEPTANCE</p>
                <p style="text-align: justify; margin: 0;">
                  I hereby confirm that I have read, understood, and agreed to all the terms and conditions mentioned above.
                </p>
              </div>

              <div style="margin-top: 20px;">
                <p style="font-weight: bold; font-size: 20px; margin-bottom: 15px;">EMPLOYER</p>
                <p style="margin-bottom: 10px;">For <span style="font-weight: bold;">HK DigiVerse LLP</span></p>
                <p style="margin-bottom: 4px;">Authorized Signatory</p>
                <p>Name: __________________________</p>
                <p>Designation: _____________________</p>
                <p style="margin-bottom: 32px;">Signature: _______________________</p>

                <hr style="border: none; border-top: 1px solid #ccc; margin-bottom: 32px;" />

                <p style="font-weight: bold; font-size: 16px; margin-bottom: 20px;">EMPLOYEE</p>
                <p style="margin-bottom: 20px;">Employee Name: ___________________________</p>
                <p style="margin-bottom: 20px;">Signature: _______________________________</p>
                <p style="margin-bottom: 20px;">Date: ____________________________________</p>
              </div>
            </div>
            
            <div class="absolute mb-4 bottom-0 left-0 w-full p-4 bg-white flex justify-center items-center gap-4 text-[14px] font-bold text-[#3498db]">
              <span>HK DigiVerse LLP</span>
              <span class="text-gray-300">|</span>
              <span class="flex items-center gap-1">
                <svg class="w-3.5 h-3.5 text-[#3498db]" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"></path></svg>
                <span class="text-[#3498db]">+91 87805 64463</span>
              </span>
              <span class="text-gray-300">|</span>
              <span class="flex items-center gap-1">
                <svg class="w-3.5 h-3.5 text-[#3498db]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                <span><a href="mailto:hr@hkdigiverse.com" style="color: #3498db;">hr@hkdigiverse.com</a></span>
              </span>
              <span class="text-gray-300">|</span>
              <span class="flex items-center gap-1 uppercase">
                <svg class="w-3.5 h-3.5 text-[#3498db]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
                <span><a href="https://www.hkdigiverse.com" target="_blank" style="color: #3498db;">WWW.HKDIGIVERSE.COM</a></span>
              </span>
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
      const rect = node.getBoundingClientRect()
      const nodeWidth = rect.width || 800
      const nodeHeight = rect.height || 1131
      
      const clone = node.cloneNode(true) as HTMLElement
      
      // 2. Setup a temporary isolated container for the clone
      const container = document.createElement('div')
      container.style.position = 'fixed'
      container.style.left = '-10000px'
      container.style.top = '0'
      container.style.width = `${nodeWidth}px`
      container.style.height = `${nodeHeight}px`
      container.style.overflow = 'hidden'
      container.style.background = 'white'
      container.appendChild(clone)
      document.body.appendChild(container)

      // Ensure the clone has proper dimensions in the isolated container
      clone.style.width = `${nodeWidth}px`
      clone.style.height = `${nodeHeight}px`
      clone.style.margin = '0'
      clone.style.padding = '0'
      clone.style.position = 'relative'
      clone.style.transform = 'none'

      const scale = 2
      const dataUrl = await domtoimage.toPng(clone, {
        bgcolor: '#ffffff',
        width: nodeWidth * scale,
        height: nodeHeight * scale,
        cacheBust: true,
        style: {
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: `${nodeWidth}px`,
          height: `${nodeHeight}px`,
        }
      })

      // 3. Cleanup the temporary container immediately
      document.body.removeChild(container)

      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (nodeHeight * pdfWidth) / nodeWidth
      
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
      node.querySelectorAll('a').forEach(link => {
        const linkRect = link.getBoundingClientRect()
        const relX = (linkRect.left - rect.left) / nodeWidth
        const relY = (linkRect.top - rect.top) / nodeHeight
        pdf.link(relX * pdfWidth, relY * pdfHeight, (linkRect.width / nodeWidth) * pdfWidth, (linkRect.height / nodeHeight) * pdfHeight, { url: link.href })
      })

      const employeeName = currentEmployee ? `${currentEmployee.firstName} ${currentEmployee.lastName}`.replace(/\s+/g, '_') : 'Employee'
      const filename = `${selectedTemplate.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('_')}_${employeeName}.pdf`
      
      pdf.save(filename)
      toast.success('Downloaded successfully!')
    } catch (error) {
      console.error('PDF Error:', error)
      toast.error('Download failed. Try printing instead.')
    } finally {
      setIsDownloading(false)
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
                  {templateData?.fields
                    .filter(field => !(selectedEmployee !== 'manual' && field === 'name'))
                    .map(field => (
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
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="font-bold text-slate-500 hover:text-brand-teal" onClick={() => { setPreviewContent(''); setIsEditing(false); }}>
                  Clear
                </Button>
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
              </div>
            </div>

            <CardContent className="p-8 flex-1 overflow-y-auto scrollbar-hide">
              {previewContent ? (
                <div 
                  ref={previewRef}
                  dangerouslySetInnerHTML={{ __html: previewContent }} 
                  className={`document-container ${isEditing ? '[&>div]:outline-dashed [&>div]:outline-2 [&>div]:outline-amber-400 [&>div]:cursor-text [&>div]:shadow-2xl' : ''}`}
                  contentEditable={isEditing}
                  suppressContentEditableWarning={true}
                  onBlur={(e) => {
                    if (isEditing) {
                      setPreviewContent(e.currentTarget.innerHTML);
                    }
                  }}
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
