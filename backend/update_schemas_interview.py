
import os

file_path = r'c:\Users\HP\Downloads\HRMS\backend\schemas.py'
with open(file_path, 'r') as f:
    content = f.read()

# Update ApplicationBase
old_base = """    resume: Optional[str] = None
    jobTitle: Optional[str] = None
    skills: Optional[str] = None
    source: Optional[str] = None"""

new_base = """    resume: Optional[str] = None
    jobTitle: Optional[str] = None
    skills: Optional[str] = None
    source: Optional[str] = None
    interviewDate: Optional[str] = None
    interviewTime: Optional[str] = None
    interviewerName: Optional[str] = None
    interviewLink: Optional[str] = None
    interviewNotes: Optional[str] = None"""

# Update ApplicationUpdate
old_update = """    source: Optional[str] = None
    resume: Optional[str] = None"""

new_update = """    source: Optional[str] = None
    resume: Optional[str] = None
    interviewDate: Optional[str] = None
    interviewTime: Optional[str] = None
    interviewerName: Optional[str] = None
    interviewLink: Optional[str] = None
    interviewNotes: Optional[str] = None"""

if old_base in content:
    content = content.replace(old_base, new_base)
    if old_update in content:
        content = content.replace(old_update, new_update)
    
    with open(file_path, 'w') as f:
        f.write(content)
    print("Successfully updated schemas.py")
else:
    # Try with CRLF
    old_base_rn = old_base.replace('\n', '\r\n')
    if old_base_rn in content:
        new_base_rn = new_base.replace('\n', '\r\n')
        content = content.replace(old_base_rn, new_base_rn)
        
        old_update_rn = old_update.replace('\n', '\r\n')
        new_update_rn = new_update.replace('\n', '\r\n')
        content = content.replace(old_update_rn, new_update_rn)
        
        with open(file_path, 'w') as f:
            f.write(content)
        print("Successfully updated schemas.py (CRLF)")
    else:
        print("Could not find blocks in schemas.py")
