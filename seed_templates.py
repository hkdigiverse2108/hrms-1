import requests

templates = [
    {
        "template_id": "offer-letter",
        "name": "Internship Offer Letter",
        "description": "Offer letter specifically for internship positions.",
        "fields": ["empName", "department", "stipend", "startDateFormatted", "endDateFormatted", "genderValue"],
        "content": """
        <div class="document-preview font-sans p-0 bg-white mx-auto text-black leading-[1.5] relative overflow-hidden" style="width: 210mm; height: 297mm; font-family: Calibri, Arial, sans-serif; font-size: 14px; color: #000000; border: none !important; box-shadow: none !important; outline: none !important;">
          <!-- Official Header Image -->
          <div class="w-full h-28 bg-white overflow-hidden relative">
            <img src="/header.png" alt="Company Header" class="w-[102%] h-[102%] object-fill absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>

          <div style="padding: 24px 48px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px;">
              <h2 style="font-size: 18px; font-weight: bold; color: black; margin: 0;">Internship Offer Letter</h2>
              <p style="font-weight: bold; font-size: 14px; margin: 0;">Date: <span style="font-weight: 500;">{{todayFormatted}}</span></p>
            </div>

            <div style="display: flex; justify-content: flex-end;">
              <div style="text-align: right; color: black; font-size: 14px; line-height: 1.3; font-weight: 500;">
                <p style="font-weight: bold; color: black; font-size: 14px; margin: 0;">HK DigiVerse LLP</p>
                <p style="margin: 0;">501-502, Silver Trade Center,</p>
                <p style="margin: 0;">Mota Varachha, Surat - 394101</p>
              </div>
            </div>

            <div style="margin-bottom: 16px; margin-top: 16px;">
              <p style="font-weight: bold; color: black; margin-bottom: 2px;">To,</p>
              <p style="font-weight: bold; color: black; font-size: 14px; margin: 0;">{{honorific}} {{empName}}</p>
            </div>

            <p style="margin-bottom: 12px; font-weight: bold; font-size: 14px; color: black;">Subject: Offer for Internship Position</p>

            <div style="margin-bottom: 12px; color: black; font-size: 14px;">
              <p style="margin-bottom: 12px;">Dear Candidate,</p>
              <p style="text-align: justify; line-height: 1.6; margin: 0;">
                We are pleased to offer you an opportunity to join <span style="font-weight: bold;">HK DigiVerse LLP</span> as an Intern in the <span style="font-weight: bold;">{{department}}</span> Department.
              </p>
            </div>

            <div style="margin-bottom: 16px; color: black; font-size: 14px;">
              <p style="margin-bottom: 8px;">Your internship details are as follows:</p>
              <ul style="margin-left: 32px; list-style-type: none; padding: 0;">
                <li style="display: flex; margin-bottom: 4px;"><span style="font-weight: bold; width: 176px; flex-shrink: 0;">• Position:</span> <span>Intern</span></li>
                <li style="display: flex; margin-bottom: 4px;"><span style="font-weight: bold; width: 176px; flex-shrink: 0;">• Department:</span> <span>{{department}}</span></li>
                <li style="display: flex; margin-bottom: 4px;"><span style="font-weight: bold; width: 176px; flex-shrink: 0;">• Internship Duration:</span> <span>{{startDateFormatted}} to {{endDateFormatted}}</span></li>
                <li style="display: flex; margin-bottom: 4px;"><span style="font-weight: bold; width: 176px; flex-shrink: 0;">• Stipend:</span> <span>{{stipend}}</span></li>
              </ul>
            </div>
          </div>
          {{includeAcceptance}}
        </div>
        """
    },
    {
        "template_id": "employee-offer-letter",
        "name": "Employee Offer Letter",
        "description": "Standard offer letter for full-time employees.",
        "fields": ["empName", "designation", "department", "salary", "startDateFormatted"],
        "content": """
        <div class="document-preview font-sans p-0 bg-white mx-auto text-black leading-[1.5] relative overflow-hidden" style="width: 210mm; height: 297mm; font-family: Calibri, Arial, sans-serif; font-size: 14px; color: #000000; border: none !important; box-shadow: none !important; outline: none !important;">
          <div style="padding: 16px 48px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px;">
              <h2 style="font-size: 20px; font-weight: bold; color: black; margin: 0; text-transform: uppercase;">Offer Letter</h2>
              <p style="font-weight: bold; font-size: 14px; margin: 0;">Date: <span style="font-weight: 500;">{{todayFormatted}}</span></p>
            </div>

            <div style="margin-bottom: 10px;">
              <p style="color: black; margin-bottom: 2px;">To,</p>
              <p style="font-weight: bold; color: black; font-size: 14px; margin: 0;">{{honorific}} {{empName}}</p>
            </div>

            <p style="margin-bottom: 8px; font-weight: bold; font-size: 14px; color: black;">Subject: Offer Letter for the position of <span>{{designation}}</span></p>

            <div style="margin-bottom: 10px; color: black; font-size: 14px;">
              <p style="margin-bottom: 8px;">Dear {{empName}},</p>
              <p style="text-align: justify; line-height: 1.5; margin: 0;">
                We are pleased to offer you the position of <span style="font-weight: bold;">{{designation}}</span> at <span style="font-weight: bold;">HK DigiVerse LLP</span>.
              </p>
            </div>
            
            <div style="margin-bottom: 10px; color: black; font-size: 14px;">
              <p style="margin-bottom: 8px;">Your employment details are as follows:</p>
              <ul style="margin-left: 24px; list-style-type: disc; padding: 0;">
                <li style="margin-bottom: 2px;"><span style="font-weight: bold;">Designation:</span> {{designation}}</li>
                <li style="margin-bottom: 2px;"><span style="font-weight: bold;">Department:</span> {{department}}</li>
                <li style="margin-bottom: 2px;"><span style="font-weight: bold;">Joining Date:</span> {{startDateFormatted}}</li>
                <li style="margin-bottom: 2px;"><span style="font-weight: bold;">Salary:</span> ₹ {{salary}} per month</li>
              </ul>
            </div>
            {{includeAcceptance}}
          </div>
        </div>
        """
    }
]

for template in templates:
    res = requests.post("http://localhost:8000/document-templates", json=template)
    print(res.status_code, res.text)
