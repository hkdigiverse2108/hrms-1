import re

with open('frontend/app/employees/documents/generate/page.tsx', 'r') as f:
    content = f.read()

# 1. Remove DOCUMENT_TEMPLATES constant
content = re.sub(r'const DOCUMENT_TEMPLATES = \[\s*\{[\s\S]*?\]\n', '', content)

# 2. Add state and fetch logic
state_and_fetch = """  const [documentTemplates, setDocumentTemplates] = useState<any[]>([])

  useEffect(() => {
    fetch(`${API_URL}/document-templates`)
      .then(res => res.json())
      .then(data => setDocumentTemplates(data))
      .catch(err => console.error("Error fetching templates", err))
  }, [])

  const [selectedTemplate, setSelectedTemplate] = useState<string>('')"""

content = content.replace("  const [selectedTemplate, setSelectedTemplate] = useState<string>('')", state_and_fetch)

# 3. Replace generatePreview
new_generate_preview = """  const templateData = documentTemplates.find((t: any) => t.template_id === selectedTemplate)

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

    if (!templateData || !templateData.content) {
      setPreviewContent(`<div class="p-20 text-center text-gray-400 font-bold italic">Template content for ${templateData?.name || 'this template'} is under development...</div>`)
      toast.success('Document preview generated!')
      return
    }

    const todayFormatted = dayjs().format('DD/MM/YYYY')
    const empName = extraFields.name || currentEmployee.name || `${currentEmployee.firstName} ${currentEmployee.lastName}`
    const empAddress = currentEmployee.address || 'Resident Address, City'
    const startDateFormatted = extraFields.startDate ? dayjs(extraFields.startDate).format('DD/MM/YYYY') : dayjs().format('DD/MM/YYYY')
    const endDateFormatted = extraFields.endDate ? dayjs(extraFields.endDate).format('DD/MM/YYYY') : dayjs().format('DD/MM/YYYY')
    const genderValue = extraFields.gender || currentEmployee?.gender || 'Male'
    const honorific = genderValue === 'Female' ? 'Ms.' : 'Mr.'

    let htmlContent = templateData.content

    // Replace basic variables
    htmlContent = htmlContent.replace(/\\{\\{todayFormatted\\}\\}/g, todayFormatted)
    htmlContent = htmlContent.replace(/\\{\\{empName\\}\\}/g, empName)
    htmlContent = htmlContent.replace(/\\{\\{empAddress\\}\\}/g, empAddress)
    htmlContent = htmlContent.replace(/\\{\\{startDateFormatted\\}\\}/g, startDateFormatted)
    htmlContent = htmlContent.replace(/\\{\\{endDateFormatted\\}\\}/g, endDateFormatted)
    htmlContent = htmlContent.replace(/\\{\\{genderValue\\}\\}/g, genderValue)
    htmlContent = htmlContent.replace(/\\{\\{honorific\\}\\}/g, honorific)
    
    // Replace all extraFields
    Object.keys(extraFields).forEach(key => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
      htmlContent = htmlContent.replace(regex, extraFields[key] || '')
    })
    
    // Replace all currentEmployee fields
    Object.keys(currentEmployee).forEach(key => {
      const regex = new RegExp(`\\{\\{currentEmployee\\.${key}\\}\\}`, 'g')
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
    
    htmlContent = htmlContent.replace(/\\{\\{includeAcceptance\\}\\}/g, acceptanceHtml)

    setPreviewContent(htmlContent)
    toast.success('Document preview generated!')
  }"""

# Use regex to replace the old generatePreview and templateData lines
content = re.sub(r'  const templateData = DOCUMENT_TEMPLATES.*?toast\.success\(\'Document preview generated!\'\)\n  }', new_generate_preview, content, flags=re.DOTALL)

# 4. Replace DOCUMENT_TEMPLATES.map with documentTemplates.map
content = content.replace("DOCUMENT_TEMPLATES.map(t =>", "documentTemplates.map(t =>")
content = content.replace("value={t.id}", "value={t.template_id}")

with open('frontend/app/employees/documents/generate/page.tsx', 'w') as f:
    f.write(content)

print("Refactor successful")
