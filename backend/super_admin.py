from fastapi import APIRouter, HTTPException, Depends, status, Request
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Union
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

async def ensure_default_company_exists():
    count = await db.companies.count_documents({})
    if count == 0:
        now = get_current_time()
        default_company = {
            "company_name": "HariKrushn DigiVerse",
            "company_code": "HK-DIGIVERSE",
            "logo_url": "/logo.png",
            "contact_email": "contact@hkdigiverse.com",
            "contact_phone": "+91 98765 43210",
            "address": "Surat, Gujarat, India",
            "subscription_plan": "Enterprise",
            "status": "active",
            "max_employees": 100,
            "total_paid": 15000,
            "enabled_modules": [
                "employee-list", "org-structure", "attendance", "leave", "employee-documents",
                "payroll-processing", "company-finance-transactions", "invoice",
                "projects", "tasks", "daily-progress", "sales", "clients", "marketing",
                "chat", "activity-tracker", "hirings", "training", "remarks"
            ],
            "created_at": now,
            "updated_at": now
        }
        await db.companies.insert_one(default_company)
        
        await db.employees.update_many(
            {"$or": [{"company_code": {"$exists": False}}, {"company_code": ""}, {"company_code": None}]},
            {"$set": {"company_code": "HK-DIGIVERSE", "company_id": "HK-DIGIVERSE", "company_name": "HariKrushn DigiVerse"}}
        )

@router.get("/companies")
async def list_companies(token: dict = Depends(require_superadmin)):
    await ensure_default_company_exists()
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
        query = {
            "$or": [
                {"company_id": c_id},
                {"company_code": c_id},
                {"company_name": c_name}
            ]
        }
        if c_code == "HK-DIGIVERSE":
            query["$or"].extend([
                {"company_id": {"$exists": False}},
                {"company_code": {"$exists": False}}
            ])

        emp_count = await db.employees.count_documents(query)
        
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
    await ensure_default_company_exists()
    companies = await db.companies.find({}).to_list(length=1000)

    # Filter out invalid empty docs
    valid_companies = [c for c in companies if c.get("company_name") or c.get("company_code") or c.get("name")]

    total_companies = len(valid_companies)
    active_companies = sum(1 for c in valid_companies if c.get("status", "active") == "active")
    suspended_companies = total_companies - active_companies

    # Count total system employees across all tenant companies
    total_employees = await db.employees.count_documents({})

    # Calculate total revenue dynamically from company payments & tenant purchases
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

    # Activity logs count directly from db.activity_logs
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

# --- Landing Page CRUD Models ---
class LandingModuleCreate(BaseModel):
    icon_name: str
    name: str
    description: str

class LandingStatCreate(BaseModel):
    value: str
    label: str

class LandingPlanCreate(BaseModel):
    name: str
    description: str
    priceYearly: str
    priceOnetime: str
    limit: str
    isPopular: bool
    features: List[str]

class LandingComparisonCreate(BaseModel):
    category: str
    featureName: str
    lite: Union[str, bool]
    starter: Union[str, bool]
    pro: Union[str, bool]
    elite: Union[str, bool]
    hybrid: Union[str, bool]

class LandingFAQCreate(BaseModel):
    question: str
    answer: str

class LandingSectionUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    cta_primary_text: Optional[str] = None
    cta_primary_link: Optional[str] = None
    cta_secondary_text: Optional[str] = None
    cta_secondary_link: Optional[str] = None
    image_url: Optional[str] = None
    badge_text: Optional[str] = None
    trust_badge_1: Optional[str] = None
    trust_badge_2: Optional[str] = None
    trust_badge_3: Optional[str] = None
    headline: Optional[str] = None
    subheadline: Optional[str] = None
    bullets: Optional[List[str]] = None
    cards: Optional[List[dict]] = None
    items: Optional[List[dict]] = None
    button_text: Optional[str] = None
    button_link: Optional[str] = None
    address: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    map_url: Optional[str] = None
    stats: Optional[List[dict]] = None
    trust_features: Optional[List[dict]] = None
    badge: Optional[str] = None
    working_hours: Optional[str] = None
    form_title: Optional[str] = None
    form_subtitle: Optional[str] = None
    employee_options: Optional[List[str]] = None

# --- Landing Page CRUD Endpoints ---

# 1. Modules
@router.get("/landing/modules")
async def list_landing_modules(token: dict = Depends(require_superadmin)):
    cursor = db.modules.find({})
    modules = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        modules.append(doc)
    return modules

@router.post("/landing/modules")
async def create_landing_module(payload: LandingModuleCreate, token: dict = Depends(require_superadmin)):
    result = await db.modules.insert_one(payload.dict())
    new_doc = await db.modules.find_one({"_id": result.inserted_id})
    new_doc["id"] = str(new_doc["_id"])
    del new_doc["_id"]
    return new_doc

@router.put("/landing/modules/{module_id}")
async def update_landing_module(module_id: str, payload: LandingModuleCreate, token: dict = Depends(require_superadmin)):
    try:
        oid = ObjectId(module_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")
    result = await db.modules.find_one_and_update(
        {"_id": oid},
        {"$set": payload.dict()},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Module not found")
    result["id"] = str(result["_id"])
    del result["_id"]
    return result

@router.delete("/landing/modules/{module_id}")
async def delete_landing_module(module_id: str, token: dict = Depends(require_superadmin)):
    try:
        oid = ObjectId(module_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")
    result = await db.modules.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Module not found")
    return {"success": True, "message": "Module deleted successfully"}

# 2. Stats
@router.get("/landing/stats")
async def list_landing_stats(token: dict = Depends(require_superadmin)):
    cursor = db.stats.find({})
    stats = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        stats.append(doc)
    return stats

@router.post("/landing/stats")
async def create_landing_stat(payload: LandingStatCreate, token: dict = Depends(require_superadmin)):
    result = await db.stats.insert_one(payload.dict())
    new_doc = await db.stats.find_one({"_id": result.inserted_id})
    new_doc["id"] = str(new_doc["_id"])
    del new_doc["_id"]
    return new_doc

@router.put("/landing/stats/{stat_id}")
async def update_landing_stat(stat_id: str, payload: LandingStatCreate, token: dict = Depends(require_superadmin)):
    try:
        oid = ObjectId(stat_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")
    result = await db.stats.find_one_and_update(
        {"_id": oid},
        {"$set": payload.dict()},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Stat not found")
    result["id"] = str(result["_id"])
    del result["_id"]
    return result

@router.delete("/landing/stats/{stat_id}")
async def delete_landing_stat(stat_id: str, token: dict = Depends(require_superadmin)):
    try:
        oid = ObjectId(stat_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")
    result = await db.stats.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Stat not found")
    return {"success": True, "message": "Stat deleted successfully"}

# 3. Plans
@router.get("/landing/plans")
async def list_landing_plans(token: dict = Depends(require_superadmin)):
    cursor = db.pricing_plans.find({})
    plans = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        plans.append(doc)
    return plans

@router.post("/landing/plans")
async def create_landing_plan(payload: LandingPlanCreate, token: dict = Depends(require_superadmin)):
    result = await db.pricing_plans.insert_one(payload.dict())
    new_doc = await db.pricing_plans.find_one({"_id": result.inserted_id})
    new_doc["id"] = str(new_doc["_id"])
    del new_doc["_id"]
    return new_doc

@router.put("/landing/plans/{plan_id}")
async def update_landing_plan(plan_id: str, payload: LandingPlanCreate, token: dict = Depends(require_superadmin)):
    try:
        oid = ObjectId(plan_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")
    result = await db.pricing_plans.find_one_and_update(
        {"_id": oid},
        {"$set": payload.dict()},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Plan not found")
    result["id"] = str(result["_id"])
    del result["_id"]
    return result

@router.delete("/landing/plans/{plan_id}")
async def delete_landing_plan(plan_id: str, token: dict = Depends(require_superadmin)):
    try:
        oid = ObjectId(plan_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")
    result = await db.pricing_plans.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Plan not found")
    return {"success": True, "message": "Plan deleted successfully"}

# 4. Comparison Matrix
@router.get("/landing/comparison")
async def list_landing_comparison(token: dict = Depends(require_superadmin)):
    cursor = db.comparison_matrix.find({})
    comparison = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        comparison.append(doc)
    return comparison

@router.post("/landing/comparison")
async def create_landing_comparison(payload: LandingComparisonCreate, token: dict = Depends(require_superadmin)):
    result = await db.comparison_matrix.insert_one(payload.dict())
    new_doc = await db.comparison_matrix.find_one({"_id": result.inserted_id})
    new_doc["id"] = str(new_doc["_id"])
    del new_doc["_id"]
    return new_doc

@router.put("/landing/comparison/{comp_id}")
async def update_landing_comparison(comp_id: str, payload: LandingComparisonCreate, token: dict = Depends(require_superadmin)):
    try:
        oid = ObjectId(comp_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")
    result = await db.comparison_matrix.find_one_and_update(
        {"_id": oid},
        {"$set": payload.dict()},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Comparison row not found")
    result["id"] = str(result["_id"])
    del result["_id"]
    return result

@router.delete("/landing/comparison/{comp_id}")
async def delete_landing_comparison(comp_id: str, token: dict = Depends(require_superadmin)):
    try:
        oid = ObjectId(comp_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")
    result = await db.comparison_matrix.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Comparison row not found")
    return {"success": True, "message": "Comparison row deleted successfully"}

# 5. FAQs
@router.get("/landing/faqs")
async def list_landing_faqs(token: dict = Depends(require_superadmin)):
    cursor = db.faqs.find({})
    faqs = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        faqs.append(doc)
    return faqs

@router.post("/landing/faqs")
async def create_landing_faq(payload: LandingFAQCreate, token: dict = Depends(require_superadmin)):
    result = await db.faqs.insert_one(payload.dict())
    new_doc = await db.faqs.find_one({"_id": result.inserted_id})
    new_doc["id"] = str(new_doc["_id"])
    del new_doc["_id"]
    return new_doc

@router.put("/landing/faqs/{faq_id}")
async def update_landing_faq(faq_id: str, payload: LandingFAQCreate, token: dict = Depends(require_superadmin)):
    try:
        oid = ObjectId(faq_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")
    result = await db.faqs.find_one_and_update(
        {"_id": oid},
        {"$set": payload.dict()},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="FAQ not found")
    result["id"] = str(result["_id"])
    del result["_id"]
    return result

@router.delete("/landing/faqs/{faq_id}")
async def delete_landing_faq(faq_id: str, token: dict = Depends(require_superadmin)):
    try:
        oid = ObjectId(faq_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")
    result = await db.faqs.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="FAQ not found")
    return {"success": True, "message": "FAQ deleted successfully"}

async def get_or_seed_section(section_key: str):
    section = await db.landing_sections.find_one({"key": section_key})
    if section:
        section["id"] = str(section["_id"])
        del section["_id"]
        if section_key == "about":
            cursor = db.stats.find({})
            stats = []
            async for doc in cursor:
                doc["id"] = str(doc["_id"])
                del doc["_id"]
                stats.append(doc)
            section["stats"] = stats
        return section
    
    if section_key == "about":
        stats_count = await db.stats.count_documents({})
        if stats_count == 0:
            default_stats = [
                { "value": "500+", "label": "Companies onboarded" },
                { "value": "1.2M+", "label": "Payslips processed" },
                { "value": "99.9%", "label": "Platform uptime" },
                { "value": "12 days", "label": "Average go-live" }
            ]
            await db.stats.insert_many(default_stats)
    
    # Define defaults
    defaults = {
        "hero": {
            "title": "Complete HRMS Software for Modern Businesses",
            "subtitle": "Manage employees, attendance, payroll, leave, recruitment, assets, performance, and every HR process from one powerful cloud-based HRMS platform.",
            "cta_primary_text": "Book Free Demo",
            "cta_primary_link": "/contact",
            "cta_secondary_text": "View Pricing",
            "cta_secondary_link": "/pricing",
            "image_url": "/hero-dashboard.png",
            "badge_text": "Cloud HRMS Platform",
            "trust_badge_1": "Zero Setup Fee",
            "trust_badge_2": "Instant Onboarding",
            "trust_badge_3": "24/7 Support",
            "trust_features": [
                { "title": "Centralized HR Hub", "description": "One master platform for all employee records & organization data.", "icon_name": "Building2" },
                { "title": "Automated Workflows", "description": "Zero manual friction for leave approvals, payroll, and onboarding.", "icon_name": "Cpu" },
                { "title": "Real-Time Insights", "description": "Instant workforce reporting, attendance analytics & cost tracking.", "icon_name": "BarChart3" },
                { "title": "Bank-Grade Security", "description": "Role-based encryption, audit logs & compliance protection.", "icon_name": "ShieldCheck" }
            ]
        },
        "about": {
            "headline": "One system for every people process",
            "subheadline": "A Human Resource Management System replaces scattered spreadsheets, registers and email threads with a single connected platform. Every employee record, attendance log, leave request and payslip lives in one auditable place.",
            "bullets": [
                "Real-time attendance & live tracking",
                "Dynamic leave request approvals",
                "Comprehensive automated payroll system",
                "Interactive self-service portals"
            ],
            "image_url": "/about-img.png"
        },
        "why_us": {
            "headline": "Why Choose HK HRMS?",
            "subheadline": "Designed for growing companies requiring reliability, compliance, and streamlined operations.",
            "cards": [
                {
                    "title": "Reduce Manual HR Labor",
                    "description": "Eliminate repetitive spreadsheets and automated routine HR approvals by up to 80%.",
                    "icon_name": "Clock"
                },
                {
                    "title": "Centralize Employee Data",
                    "description": "Maintain a single source of truth for employee profiles, documents, and records.",
                    "icon_name": "FolderKey"
                },
                {
                    "title": "Simplify Attendance & Leaves",
                    "description": "Real-time biometric/geo punch-ins, customizable leave policies, and shift management.",
                    "icon_name": "CalendarCheck"
                },
                {
                    "title": "Streamline Payroll Processes",
                    "description": "Automate salary calculation, statutory deductions, tax reports, and single-click payslips.",
                    "icon_name": "CreditCard"
                },
                {
                    "title": "Elevate Employee Experience",
                    "description": "Self-service portals empower staff to request leave, access tax docs, and track claims.",
                    "icon_name": "HeartHandshake"
                },
                {
                    "title": "Actionable Workforce Analytics",
                    "description": "Make confident strategic decisions with real-time headcount, turnover, and cost metrics.",
                    "icon_name": "LineChart"
                }
            ]
        },
        "benefits": {
            "headline": "Less admin. More people work.",
            "subheadline": "Unlock high-impact benefits by transitioning from manual processes to automated workflows.",
            "items": [
                {
                    "title": "Save Time",
                    "description": "Reduce hours spent on manual entries and paperwork."
                },
                {
                    "title": "Accurate Attendance",
                    "description": "Track shifts, overtime, and leaves with 100% precision."
                },
                {
                    "title": "Easy Payroll",
                    "description": "Process payroll and generate payslips with a single click."
                },
                {
                    "title": "Secure Data",
                    "description": "Enterprise-grade security ensures employee details are safe."
                }
            ]
        },
        "final_cta": {
            "title": "Ready to Simplify Your HR Operations?",
            "subtitle": "Bring your people, processes, attendance, and payroll data together in one clean, powerful platform.",
            "button_text": "View Pricing & Plans",
            "button_link": "/pricing"
        },
        "contact": {
            "badge": "Contact",
            "headline": "Let's Talk",
            "subheadline": "We'd love to understand your HR needs and help your organization streamline every HR process.",
            "email": "hello@hkdigiverse.com",
            "phone": "+91 98765 43210",
            "address": "402, Silver Business Point, Utran, Surat, Gujarat 394105",
            "working_hours": "Mon - Sat, 10:00 AM - 7:00 PM IST",
            "form_title": "Book a Demo",
            "form_subtitle": "Fill in the form and our team will get back within one business day.",
            "employee_options": [
                "1 - 50 Employees",
                "51 - 200 Employees",
                "201 - 500 Employees",
                "500+ Enterprise"
            ],
            "map_url": "https://www.google.com/maps/embed?pb="
        }
    }
    
    if section_key not in defaults:
        raise HTTPException(status_code=400, detail="Invalid section key")
        
    import copy
    data = copy.deepcopy(defaults[section_key])
    data["key"] = section_key
    await db.landing_sections.insert_one(data)
    
    inserted = await db.landing_sections.find_one({"key": section_key})
    inserted["id"] = str(inserted["_id"])
    del inserted["_id"]
    if section_key == "about":
        cursor = db.stats.find({})
        stats = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            stats.append(doc)
        inserted["stats"] = stats
    return inserted

@router.get("/landing/sections")
async def list_landing_sections(token: dict = Depends(require_superadmin)):
    keys = ["hero", "about", "why_us", "benefits", "final_cta", "contact"]
    sections = {}
    for key in keys:
        sections[key] = await get_or_seed_section(key)
    return sections

@router.put("/landing/sections/{section_key}")
async def update_landing_section(section_key: str, payload: LandingSectionUpdate, token: dict = Depends(require_superadmin)):
    await get_or_seed_section(section_key)
    update_data = {k: v for k, v in payload.dict().items() if v is not None}
    
    if section_key == "about" and "stats" in update_data:
        stats_list = update_data.pop("stats")
        await db.stats.delete_many({})
        if stats_list:
            for item in stats_list:
                clean_item = {
                    "value": item.get("value", ""),
                    "label": item.get("label", "")
                }
                await db.stats.insert_one(clean_item)
                
    result = await db.landing_sections.find_one_and_update(
        {"key": section_key},
        {"$set": update_data},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Section not found")
        
    result["id"] = str(result["_id"])
    del result["_id"]
    
    if section_key == "about":
        cursor = db.stats.find({})
        stats = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            stats.append(doc)
        result["stats"] = stats
        
    return result


