from fastapi import APIRouter, HTTPException, Depends, status, Request
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import os
import random
from datetime import datetime, timedelta
from bson import ObjectId

from database import db, get_current_time
from auth import create_access_token, get_password_hash, require_superadmin
from email_utils import send_otp_email

router = APIRouter(prefix="/super-admin", tags=["super-admin"])

DEFAULT_COMPANY_ID = "hk_digiverse_default"

# --- Models ---
class SuperAdminLoginRequest(BaseModel):
    email: EmailStr
    password: str

class SuperAdminOTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str

class CompanyCreateRequest(BaseModel):
    company_name: str
    company_code: str  # Unique slug/code e.g. "acme"
    logo_url: Optional[str] = ""
    contact_email: EmailStr
    contact_phone: Optional[str] = ""
    address: Optional[str] = ""
    subscription_plan: Optional[str] = "Standard"
    max_employees: Optional[int] = 50
    admin_name: str
    admin_email: EmailStr
    admin_password: str

class CompanyUpdateRequest(BaseModel):
    company_name: Optional[str] = None
    logo_url: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    subscription_plan: Optional[str] = None
    status: Optional[str] = None # "active", "suspended"
    max_employees: Optional[int] = None

class AdminResetPasswordRequest(BaseModel):
    new_password: str

# --- Endpoints ---

@router.post("/login")
async def super_admin_login(payload: SuperAdminLoginRequest):
    env_email = os.getenv("SUPERADMIN_EMAIL", "superadmin@hkdigiverse.com").strip().lower()
    env_password = os.getenv("SUPERADMIN_PASSWORD", "SuperAdmin@2026!Pass").strip()

    if payload.email.strip().lower() != env_email or payload.password.strip() != env_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Super Admin email or password"
        )

    # Generate 6-digit OTP
    otp = f"{random.randint(100000, 999999)}"
    now = datetime.utcnow()
    expires_at = now + timedelta(minutes=5)

    # Store OTP in DB
    await db.superadmin_otps.delete_many({"email": env_email})
    await db.superadmin_otps.insert_one({
        "email": env_email,
        "otp": otp,
        "created_at": now,
        "expires_at": expires_at
    })

    # Send OTP Email
    sent = send_otp_email(env_email, otp)
    if not sent:
        print(f"[SUPERADMIN OTP LOG] OTP for {env_email} is: {otp}")

    return {
        "success": True,
        "message": "OTP has been sent to your Super Admin email address.",
        "require_otp": True
    }

@router.post("/verify-otp")
async def super_admin_verify_otp(payload: SuperAdminOTPVerifyRequest):
    env_email = os.getenv("SUPERADMIN_EMAIL", "superadmin@hkdigiverse.com").strip().lower()
    
    if payload.email.strip().lower() != env_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email address for Super Admin verification"
        )

    otp_rec = await db.superadmin_otps.find_one({"email": env_email, "otp": payload.otp.strip()})
    if not otp_rec:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP code"
        )

    expires_at = otp_rec.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    
    if expires_at and expires_at < datetime.utcnow():
        await db.superadmin_otps.delete_one({"_id": otp_rec["_id"]})
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP code has expired. Please log in again."
        )

    # Clear OTP
    await db.superadmin_otps.delete_many({"email": env_email})

    # Create JWT Token with Super Admin Privileges
    token = create_access_token({
        "sub": "superadmin",
        "email": env_email,
        "name": "Super Admin",
        "role": "superadmin",
        "is_superadmin": True,
        "company_id": "master"
    })

    return {
        "success": True,
        "token": token,
        "user": {
            "id": "superadmin",
            "name": "Super Admin",
            "email": env_email,
            "role": "superadmin",
            "is_superadmin": True,
            "company_id": "master",
            "company_name": "HK DigiVerse Master"
        }
    }

@router.get("/me")
async def get_superadmin_me(token: dict = Depends(require_superadmin)):
    env_email = os.getenv("SUPERADMIN_EMAIL", "superadmin@hkdigiverse.com").strip().lower()
    return {
        "id": "superadmin",
        "name": "Super Admin",
        "email": env_email,
        "role": "superadmin",
        "is_superadmin": True,
        "company_id": "master",
        "company_name": "HK DigiVerse Master"
    }

@router.get("/companies")
async def list_companies(token: dict = Depends(require_superadmin)):
    companies = await db.companies.find({}).to_list(length=1000)
    
    # Calculate employee counts for each company
    result = []
    for c in companies:
        c_name = c.get("company_name") or c.get("name") or ""
        c_code = c.get("company_code") or c.get("code") or ""
        
        # Skip incomplete or empty test records missing valid name/code
        if not c_name and not c_code:
            continue

        c_id = str(c_code or c.get("_id"))
        
        # Count employees in this company
        emp_count = await db.employees.count_documents({
            "$or": [
                {"company_id": c_id},
                {"company_code": c_id}
            ]
        })
        
        c_data = {
            "id": str(c.get("_id")),
            "company_name": c_name,
            "company_code": c_code or c_id,
            "logo_url": c.get("logo_url", ""),
            "contact_email": c.get("contact_email", ""),
            "contact_phone": c.get("contact_phone", ""),
            "address": c.get("address", ""),
            "subscription_plan": c.get("subscription_plan", "Standard"),
            "status": c.get("status", "active"),
            "max_employees": c.get("max_employees", 50),
            "employee_count": emp_count,
            "created_at": c.get("created_at")
        }
        result.append(c_data)
        
    return result

@router.post("/companies")
async def create_company(payload: CompanyCreateRequest, token: dict = Depends(require_superadmin)):
    return await provision_new_company(payload)

@router.post("/public-purchase")
async def public_purchase_company(payload: CompanyCreateRequest):
    """Public API for companies to purchase/register HRMS"""
    return await provision_new_company(payload)

async def provision_new_company(payload: CompanyCreateRequest):
    code = payload.company_code.strip().lower().replace(" ", "-")
    
    # Check if code already exists
    existing = await db.companies.find_one({"company_code": code})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Company code '{code}' already exists. Please choose a different code."
        )

    # Check if admin email already exists in employees
    existing_emp = await db.employees.find_one({"email": payload.admin_email.strip().lower()})
    if existing_emp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Employee email '{payload.admin_email}' is already registered."
        )

    now = get_current_time()
    
    # 1. Create Company
    company_doc = {
        "company_name": payload.company_name.strip(),
        "company_code": code,
        "logo_url": payload.logo_url.strip() if payload.logo_url else "",
        "contact_email": payload.contact_email.strip().lower(),
        "contact_phone": payload.contact_phone.strip() if payload.contact_phone else "",
        "address": payload.address.strip() if payload.address else "",
        "subscription_plan": payload.subscription_plan or "Standard",
        "status": "active",
        "max_employees": payload.max_employees or 50,
        "created_at": now,
        "updated_at": now
    }
    comp_res = await db.companies.insert_one(company_doc)
    company_id = str(comp_res.inserted_id)

    # 2. Create Initial Company Admin Employee
    hashed_pwd = get_password_hash(payload.admin_password)
    admin_emp_doc = {
        "name": payload.admin_name.strip(),
        "email": payload.admin_email.strip().lower(),
        "password": hashed_pwd,
        "role": "Admin",
        "designation": "Administrator",
        "department": "Management",
        "company_id": code,
        "company_code": code,
        "company_name": payload.company_name.strip(),
        "status": "active",
        "created_at": now,
        "updated_at": now
    }
    admin_res = await db.employees.insert_one(admin_emp_doc)
    admin_id = str(admin_res.inserted_id)

    # 3. Provision Default Departments & Designations for this tenant
    default_depts = ["Management", "Engineering", "Human Resources", "Sales & Marketing", "Finance"]
    for d in default_depts:
        await db.departments.insert_one({
            "name": d,
            "company_id": code,
            "created_at": now
        })

    default_desigs = ["Administrator", "Manager", "Senior Developer", "HR Manager", "Executive"]
    for des in default_desigs:
        await db.designations.insert_one({
            "title": des,
            "company_id": code,
            "created_at": now
        })

    return {
        "success": True,
        "message": f"Company '{payload.company_name}' provisioned successfully!",
        "company": {
            "id": company_id,
            "company_name": payload.company_name,
            "company_code": code,
            "logo_url": payload.logo_url,
            "contact_email": payload.contact_email,
            "subscription_plan": payload.subscription_plan,
            "status": "active"
        },
        "admin": {
            "id": admin_id,
            "name": payload.admin_name,
            "email": payload.admin_email,
            "role": "Admin"
        }
    }

@router.get("/companies/{company_id}")
async def get_company_detail(company_id: str, token: dict = Depends(require_superadmin)):
    filter_query = {"_id": ObjectId(company_id)} if len(company_id) == 24 else {"company_code": company_id}
    company = await db.companies.find_one(filter_query)
    
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    code = company.get("company_code") or str(company["_id"])
    employees = await db.employees.find({
        "$or": [{"company_id": code}, {"company_code": code}]
    }).to_list(length=1000)

    # Format employees for UI
    emp_list = []
    for e in employees:
        emp_list.append({
            "id": str(e.get("_id")),
            "name": e.get("name", ""),
            "email": e.get("email", ""),
            "role": e.get("role", "Employee"),
            "department": e.get("department", ""),
            "designation": e.get("designation", ""),
            "status": e.get("status", "active")
        })

    return {
        "id": str(company.get("_id")),
        "company_name": company.get("company_name", ""),
        "company_code": company.get("company_code", ""),
        "logo_url": company.get("logo_url", ""),
        "contact_email": company.get("contact_email", ""),
        "contact_phone": company.get("contact_phone", ""),
        "address": company.get("address", ""),
        "subscription_plan": company.get("subscription_plan", "Standard"),
        "status": company.get("status", "active"),
        "max_employees": company.get("max_employees", 50),
        "employees": emp_list
    }

@router.put("/companies/{company_id}")
async def update_company(company_id: str, payload: CompanyUpdateRequest, token: dict = Depends(require_superadmin)):
    filter_query = {"_id": ObjectId(company_id)} if len(company_id) == 24 else {"company_code": company_id}
    company = await db.companies.find_one(filter_query)
    
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    update_fields = {}
    if payload.company_name is not None:
        update_fields["company_name"] = payload.company_name.strip()
    if payload.logo_url is not None:
        update_fields["logo_url"] = payload.logo_url.strip()
    if payload.contact_email is not None:
        update_fields["contact_email"] = payload.contact_email.strip().lower()
    if payload.contact_phone is not None:
        update_fields["contact_phone"] = payload.contact_phone.strip()
    if payload.address is not None:
        update_fields["address"] = payload.address.strip()
    if payload.subscription_plan is not None:
        update_fields["subscription_plan"] = payload.subscription_plan
    if payload.status is not None:
        update_fields["status"] = payload.status # "active" or "suspended"
    if payload.max_employees is not None:
        update_fields["max_employees"] = payload.max_employees

    if update_fields:
        await db.companies.update_one(filter_query, {"$set": update_fields})

    return {"success": True, "message": "Company updated successfully"}

@router.post("/companies/{company_id}/reset-admin-password")
async def reset_company_admin_password(company_id: str, payload: AdminResetPasswordRequest, token: dict = Depends(require_superadmin)):
    filter_query = {"_id": ObjectId(company_id)} if len(company_id) == 24 else {"company_code": company_id}
    company = await db.companies.find_one(filter_query)
    
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    code = company.get("company_code") or str(company["_id"])
    
    # Find Admin employee
    admin_emp = await db.employees.find_one({
        "$or": [{"company_id": code}, {"company_code": code}],
        "role": {"$regex": "^Admin$", "$options": "i"}
    })
    
    if not admin_emp:
        raise HTTPException(status_code=404, detail="Admin user not found for this company")

    hashed_pwd = get_password_hash(payload.new_password)
    await db.employees.update_one(
        {"_id": admin_emp["_id"]},
        {"$set": {"password": hashed_pwd}}
    )

    return {"success": True, "message": f"Password for Admin '{admin_emp.get('email')}' updated successfully"}

@router.get("/stats")
async def get_superadmin_dashboard_stats(token: dict = Depends(require_superadmin)):
    companies = await db.companies.find({}).to_list(length=1000)

    # Filter out invalid empty docs
    valid_companies = [c for c in companies if c.get("company_name") or c.get("company_code") or c.get("name")]

    total_companies = len(valid_companies)
    active_companies = sum(1 for c in valid_companies if c.get("status", "active") == "active")
    suspended_companies = total_companies - active_companies

    # Count total system employees across all tenant companies
    total_employees = await db.employees.count_documents({"employee_id": {"$ne": "superadmin"}})

    # Calculate total revenue
    total_revenue = sum(c.get("total_paid", 0) for c in valid_companies)

    # Plan distribution
    plan_distribution = {}
    for c in valid_companies:
        plan = c.get("subscription_plan", "Standard")
        plan_distribution[plan] = plan_distribution.get(plan, 0) + 1

    # Top enabled modules
    module_counts = {}
    for c in valid_companies:
        enabled_mods = c.get("enabled_modules", [])
        for mod in enabled_mods:
            module_counts[mod] = module_counts.get(mod, 0) + 1

    # Sort top modules
    sorted_modules = sorted(
        [{"module_key": k, "display_name": k.replace("-", " ").title(), "count": v} for k, v in module_counts.items()],
        key=lambda x: x["count"],
        reverse=True
    )

    # Activity logs count
    total_activity_logs = await db.activity_logs.count_documents({})

    return {
        "total_companies": total_companies,
        "active_companies": active_companies,
        "suspended_companies": suspended_companies,
        "total_employees": total_employees,
        "total_revenue": total_revenue,
        "total_activity_logs": total_activity_logs,
        "plan_distribution": plan_distribution,
        "top_modules": sorted_modules[:6]
    }

