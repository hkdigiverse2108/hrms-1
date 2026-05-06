
import os

file_path = r'c:\Users\HP\Downloads\HRMS\backend\schemas.py'
with open(file_path, 'r') as f:
    content = f.read()

old_block = """class ApplicationBase(BaseModel):
    candidateName: str
    email: str
    phone: str
    status: str
    appliedDate: str
    resume: Optional[str] = None

class ApplicationCreate(ApplicationBase):
    pass

class ApplicationUpdate(BaseModel):
    status: Optional[str] = None"""

new_block = """class ApplicationBase(BaseModel):
    candidateName: str
    email: str
    phone: str
    status: str
    appliedDate: str
    resume: Optional[str] = None
    jobTitle: Optional[str] = None
    skills: Optional[str] = None
    source: Optional[str] = None

class ApplicationCreate(ApplicationBase):
    pass

class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    jobTitle: Optional[str] = None
    skills: Optional[str] = None
    source: Optional[str] = None
    resume: Optional[str] = None"""

if old_block in content:
    new_content = content.replace(old_block, new_block)
    with open(file_path, 'w') as f:
        f.write(new_content)
    print("Successfully updated schemas.py")
else:
    # Try with \r\n
    old_block_rn = old_block.replace('\n', '\r\n')
    if old_block_rn in content:
        new_block_rn = new_block.replace('\n', '\r\n')
        new_content = content.replace(old_block_rn, new_block_rn)
        with open(file_path, 'w') as f:
            f.write(new_content)
        print("Successfully updated schemas.py (with CRLF)")
    else:
        print("Could not find old_block in schemas.py")
        # Print a snippet of what it found to debug
        start = content.find("class ApplicationBase")
        if start != -1:
            print("Snippet found:")
            print(repr(content[start:start+200]))
