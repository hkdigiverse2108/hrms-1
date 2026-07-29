from fastapi import APIRouter, HTTPException, Depends, status, Request
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Union, Dict
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
    total_employees = await db.employees.count_documents({})

    # Calculate total revenue dynamically from active companies' pricing plans
    pricing_plans = await db.pricing_plans.find({}).to_list(100)
    plan_price_map = {}
    for p in pricing_plans:
        p_name = p.get("name", "").strip().lower()
        try:
            val = float(str(p.get("pricePerPlan", 0)).replace("₹", "").replace(",", "").strip())
        except Exception:
            val = 0
        if p_name:
            plan_price_map[p_name] = val

    total_revenue = 0
    for c in valid_companies:
        if c.get("status", "active") == "active":
            c_plan = c.get("subscription_plan", "").strip().lower()
            total_revenue += plan_price_map.get(c_plan, 0)

    # Count real website inquiries from landing page contact submissions
    total_inquiries = await db.contact_submissions.count_documents({})

    return {
        "total_companies": total_companies,
        "active_companies": active_companies,
        "suspended_companies": suspended_companies,
        "total_employees": total_employees,
        "total_revenue": total_revenue,
        "total_inquiries": total_inquiries
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
    # Header & Footer section fields
    logo_url: Optional[str] = None
    company_name: Optional[str] = None
    company_subtitle: Optional[str] = None
    social_instagram: Optional[str] = None
    social_linkedin: Optional[str] = None
    social_facebook: Optional[str] = None
    social_twitter: Optional[str] = None
    success_title: Optional[str] = None
    success_message: Optional[str] = None
    success_button_text: Optional[str] = None

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
        elif section_key == "contact":
            updated = False
            if "success_title" not in section or not section.get("success_title"):
                section["success_title"] = "Demo Scheduled Successfully!"
                updated = True
            if "success_message" not in section or not section.get("success_message"):
                section["success_message"] = "Thank you for booking a demo with us. Your requirements have been persisted. An HR specialist from HK Digiverse will review and reach out within one business day."
                updated = True
            if "success_button_text" not in section or not section.get("success_button_text"):
                section["success_button_text"] = "Schedule Another Demo"
                updated = True
            if updated:
                await db.landing_sections.update_one({"key": "contact"}, {"$set": {
                    "success_title": section["success_title"],
                    "success_message": section["success_message"],
                    "success_button_text": section["success_button_text"]
                }})
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
            "map_url": "https://www.google.com/maps/embed?pb=",
            "success_title": "Demo Scheduled Successfully!",
            "success_message": "Thank you for booking a demo with us. Your requirements have been persisted. An HR specialist from HK Digiverse will review and reach out within one business day.",
            "success_button_text": "Schedule Another Demo"
        },
        "header_footer": {
            "logo_url": "",
            "company_name": "HKHRMS",
            "company_subtitle": "Digiverse Enterprise",
            "social_instagram": "https://instagram.com",
            "social_linkedin": "https://linkedin.com",
            "social_facebook": "https://facebook.com",
            "social_twitter": "https://twitter.com"
        },
        "modules_header": {
            "badge_text": "HRMS Modules",
            "headline": "24 modules, one connected platform",
            "subheadline": "Enable only what you need today and switch on the rest as your organisation grows."
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
    keys = ["hero", "about", "why_us", "benefits", "final_cta", "contact", "header_footer", "modules_header"]
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


# --- Public Landing Page Endpoints ---

@router.get("/public/landing/sections")
async def public_list_landing_sections():
    keys = ["hero", "about", "why_us", "benefits", "final_cta", "contact", "header_footer", "modules_header"]
    sections = {}
    for key in keys:
        sections[key] = await get_or_seed_section(key)
    return sections

@router.get("/public/landing/modules")
async def public_list_landing_modules():
    cursor = db.modules.find({})
    modules = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        modules.append(doc)
    return modules

@router.get("/public/landing/stats")
async def public_list_landing_stats():
    cursor = db.stats.find({})
    stats = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        stats.append(doc)
    return stats

@router.get("/public/landing/plans")
async def public_list_landing_plans():
    cursor = db.plans.find({})
    plans = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        plans.append(doc)
    return plans

@router.get("/public/landing/comparison")
async def public_list_landing_comparison():
    cursor = db.comparison.find({})
    comparisons = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        comparisons.append(doc)
    return comparisons

@router.get("/public/landing/faqs")
async def public_list_landing_faqs():
    cursor = db.faqs.find({})
    faqs = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        faqs.append(doc)
    return faqs

# --- Website Inquiries & Demo Requests ---
@router.get("/inquiries", dependencies=[Depends(require_superadmin)])
async def list_website_inquiries():
    cursor = db.contact_submissions.find({}).sort("createdAt", -1)
    inquiries = []
    async for doc in cursor:
        doc["id"] = str(doc.get("_id"))
        if "_id" in doc:
            del doc["_id"]
        if "createdAt" in doc and hasattr(doc["createdAt"], "isoformat"):
            doc["createdAt"] = doc["createdAt"].isoformat()
        inquiries.append(doc)
    return inquiries

@router.delete("/inquiries/{inquiry_id}", dependencies=[Depends(require_superadmin)])
async def delete_website_inquiry(inquiry_id: str):
    try:
        oid = ObjectId(inquiry_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid inquiry ID")
    result = await db.contact_submissions.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    return {"message": "Inquiry deleted successfully"}

# --- Default Seed Data for Pricing ---
DEFAULT_MODULES = [
    {"module_key": "employee-list", "display_name": "Employee Directory", "category": "Core HR & Attendance", "price_per_month": 300, "is_enabled": True, "description": "Manage employee profiles, onboarding, and directory."},
    {"module_key": "org-structure", "display_name": "Org Structure", "category": "Core HR & Attendance", "price_per_month": 200, "is_enabled": True, "description": "Departments, designations, and hierarchy structure."},
    {"module_key": "attendance", "display_name": "Attendance Tracking", "category": "Core HR & Attendance", "price_per_month": 400, "is_enabled": True, "description": "Daily attendance punch-in/out, shifts, late penalties."},
    {"module_key": "leave", "display_name": "Leave Management", "category": "Core HR & Attendance", "price_per_month": 300, "is_enabled": True, "description": "Leave requests, approvals, and balance tracking."},
    {"module_key": "employee-documents", "display_name": "Employee Documents", "category": "Core HR & Attendance", "price_per_month": 250, "is_enabled": True, "description": "Document management & auto document generator."},
    {"module_key": "payroll-processing", "display_name": "Payroll Processing & Payslips", "category": "Payroll & Finance", "price_per_month": 600, "is_enabled": True, "description": "Monthly salary calculation, bonuses, deductions, and payslips."},
    {"module_key": "company-finance-transactions", "display_name": "Company Finance & Audit", "category": "Payroll & Finance", "price_per_month": 500, "is_enabled": True, "description": "Income/expense transactions, audit logs, financial planning."},
    {"module_key": "invoice", "display_name": "Invoicing & Billing", "category": "Payroll & Finance", "price_per_month": 400, "is_enabled": True, "description": "Create proforma & tax invoices, client ledgers."},
    {"module_key": "projects", "display_name": "Project Management", "category": "Work & Project Management", "price_per_month": 500, "is_enabled": True, "description": "Projects, milestones, client feedback, and team assignment."},
    {"module_key": "tasks", "display_name": "Development & Tasks", "category": "Work & Project Management", "price_per_month": 400, "is_enabled": True, "description": "Sprint tasks, my tasks, and task logs."},
    {"module_key": "daily-progress", "display_name": "Daily Progress Logs", "category": "Work & Project Management", "price_per_month": 300, "is_enabled": True, "description": "Daily work submission and HR progress tracking."},
    {"module_key": "sales", "display_name": "Sales & Leads Management", "category": "Work & Project Management", "price_per_month": 400, "is_enabled": True, "description": "Sales pipeline, lead tracking, and deal analytics."},
    {"module_key": "clients", "display_name": "Client Directory", "category": "Work & Project Management", "price_per_month": 300, "is_enabled": True, "description": "Client profiles, transactions, and feedback."},
    {"module_key": "marketing", "display_name": "Digital Marketing & SMM", "category": "Work & Project Management", "price_per_month": 400, "is_enabled": True, "description": "Content calendar, social media management, daily remarks."},
    {"module_key": "chat", "display_name": "Team Chat", "category": "Collaboration & Productivity", "price_per_month": 300, "is_enabled": True, "description": "Real-time group & direct messaging."},
    {"module_key": "activity-tracker", "display_name": "Activity Tracker", "category": "Collaboration & Productivity", "price_per_month": 300, "is_enabled": True, "description": "Native PC input activity and app monitoring."},
    {"module_key": "hirings", "display_name": "Recruitment & Hiring Board", "category": "Collaboration & Productivity", "price_per_month": 400, "is_enabled": True, "description": "Job postings, applicant hiring board, and interviews."},
    {"module_key": "training", "display_name": "Course & Training Library", "category": "Collaboration & Productivity", "price_per_month": 300, "is_enabled": True, "description": "Internal employee courses, lessons, and quizzes."},
    {"module_key": "remarks", "display_name": "Penalty & Remarks", "category": "Collaboration & Productivity", "price_per_month": 200, "is_enabled": True, "description": "Disciplinary penalty points and manager remarks."}
]

DEFAULT_PLANS = [
    {"plan_key": "3_months", "display_name": "3 Months Plan", "months": 3, "discount_percent": 0, "is_active": True, "badge": "Standard"},
    {"plan_key": "6_months", "display_name": "6 Months Plan", "months": 6, "discount_percent": 10, "is_active": True, "badge": "Save 10%"},
    {"plan_key": "1_year", "display_name": "1 Year (12 Months)", "months": 12, "discount_percent": 20, "is_active": True, "badge": "Best Value (Save 20%)"}
]

async def seed_pricing_if_empty():
    mod_count = await db.system_module_prices.count_documents({})
    if mod_count == 0:
        for mod in DEFAULT_MODULES:
            mod_doc = {**mod, "created_at": get_current_time(), "updated_at": get_current_time()}
            await db.system_module_prices.insert_one(mod_doc)
    plan_count = await db.system_duration_plans.count_documents({})
    if plan_count == 0:
        for p in DEFAULT_PLANS:
            p_doc = {**p, "created_at": get_current_time(), "updated_at": get_current_time()}
            await db.system_duration_plans.insert_one(p_doc)

class ModuleCreate(BaseModel):
    module_key: str
    display_name: str
    category: Optional[str] = "General"
    price_per_month: float
    plan_prices: Optional[Dict[str, float]] = {}
    description: Optional[str] = ""
    is_enabled: Optional[bool] = True

class ModulePriceUpdate(BaseModel):
    display_name: Optional[str] = None
    category: Optional[str] = None
    price_per_month: float
    plan_prices: Optional[Dict[str, float]] = None
    description: Optional[str] = None
    is_enabled: Optional[bool] = True

class PlanCreate(BaseModel):
    plan_key: str
    display_name: str
    months: int
    discount_percent: float
    badge: Optional[str] = ""
    is_active: Optional[bool] = True

class PlanUpdate(BaseModel):
    display_name: Optional[str] = None
    months: Optional[int] = None
    discount_percent: float
    badge: Optional[str] = None
    is_active: Optional[bool] = True

@router.get("/pricing/modules")
async def get_all_module_prices(token: dict = Depends(require_superadmin)):
    await seed_pricing_if_empty()
    modules = await db.system_module_prices.find({}).to_list(length=200)
    result = []
    for m in modules:
        result.append({
            "id": str(m.get("_id")),
            "module_key": m.get("module_key"),
            "display_name": m.get("display_name"),
            "category": m.get("category", "General"),
            "price_per_month": m.get("price_per_month", 0),
            "plan_prices": m.get("plan_prices", {}),
            "is_enabled": m.get("is_enabled", True),
            "description": m.get("description", "")
        })
    return result

@router.post("/pricing/modules")
async def create_module_price(payload: ModuleCreate, token: dict = Depends(require_superadmin)):
    await seed_pricing_if_empty()
    key = payload.module_key.strip().lower().replace(" ", "-")
    existing = await db.system_module_prices.find_one({"module_key": key})
    if existing:
        update_data = {
            "display_name": payload.display_name.strip(),
            "category": payload.category.strip() if payload.category else "General",
            "price_per_month": payload.price_per_month,
            "plan_prices": payload.plan_prices or {},
            "description": payload.description.strip() if payload.description else "",
            "is_enabled": payload.is_enabled if payload.is_enabled is not None else True,
            "updated_at": get_current_time()
        }
        await db.system_module_prices.update_one({"module_key": key}, {"$set": update_data})
        updated = await db.system_module_prices.find_one({"module_key": key})
        updated["id"] = str(updated.get("_id"))
        updated.pop("_id", None)
        return updated
    doc = {
        "module_key": key,
        "display_name": payload.display_name.strip(),
        "category": payload.category.strip() if payload.category else "General",
        "price_per_month": payload.price_per_month,
        "plan_prices": payload.plan_prices or {},
        "description": payload.description.strip() if payload.description else "",
        "is_enabled": payload.is_enabled if payload.is_enabled is not None else True,
        "created_at": get_current_time(),
        "updated_at": get_current_time()
    }
    res = await db.system_module_prices.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    doc.pop("_id", None)
    return doc

@router.put("/pricing/modules/{module_key}")
async def update_module_price(module_key: str, payload: ModulePriceUpdate, token: dict = Depends(require_superadmin)):
    await seed_pricing_if_empty()
    update_data = {
        "price_per_month": payload.price_per_month,
        "is_enabled": payload.is_enabled if payload.is_enabled is not None else True,
        "updated_at": get_current_time()
    }
    if payload.display_name:
        update_data["display_name"] = payload.display_name.strip()
    if payload.category:
        update_data["category"] = payload.category.strip()
    if payload.description is not None:
        update_data["description"] = payload.description.strip()
    if payload.plan_prices is not None:
        update_data["plan_prices"] = payload.plan_prices
    res = await db.system_module_prices.update_one({"module_key": module_key}, {"$set": update_data})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Module not found")
    return {"success": True, "message": f"Pricing for module '{module_key}' updated"}

@router.delete("/pricing/modules/{module_key}")
async def delete_module_price(module_key: str, token: dict = Depends(require_superadmin)):
    res = await db.system_module_prices.delete_one({"module_key": module_key})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Module not found")
    return {"success": True, "message": f"Module '{module_key}' deleted successfully"}

@router.get("/pricing/plans")
async def get_all_duration_plans(token: dict = Depends(require_superadmin)):
    await seed_pricing_if_empty()
    plans = await db.system_duration_plans.find({}).to_list(length=50)
    result = []
    for p in plans:
        result.append({
            "id": str(p.get("_id")),
            "plan_key": p.get("plan_key"),
            "display_name": p.get("display_name"),
            "months": p.get("months", 1),
            "discount_percent": p.get("discount_percent", 0),
            "badge": p.get("badge", ""),
            "is_active": p.get("is_active", True)
        })
    return result

@router.post("/pricing/plans")
async def create_duration_plan(payload: PlanCreate, token: dict = Depends(require_superadmin)):
    await seed_pricing_if_empty()
    key = payload.plan_key.strip().lower().replace(" ", "_")
    existing = await db.system_duration_plans.find_one({"plan_key": key})
    if existing:
        raise HTTPException(status_code=400, detail=f"Plan with key '{key}' already exists.")
    doc = {
        "plan_key": key,
        "display_name": payload.display_name.strip(),
        "months": payload.months,
        "discount_percent": payload.discount_percent,
        "badge": payload.badge.strip() if payload.badge else "",
        "is_active": payload.is_active if payload.is_active is not None else True,
        "created_at": get_current_time(),
        "updated_at": get_current_time()
    }
    res = await db.system_duration_plans.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    doc.pop("_id", None)
    return doc

@router.put("/pricing/plans/{plan_key}")
async def update_duration_plan(plan_key: str, payload: PlanUpdate, token: dict = Depends(require_superadmin)):
    await seed_pricing_if_empty()
    update_data = {
        "discount_percent": payload.discount_percent,
        "is_active": payload.is_active if payload.is_active is not None else True,
        "updated_at": get_current_time()
    }
    if payload.display_name:
        update_data["display_name"] = payload.display_name.strip()
    if payload.months:
        update_data["months"] = payload.months
    if payload.badge is not None:
        update_data["badge"] = payload.badge.strip()
    res = await db.system_duration_plans.update_one({"plan_key": plan_key}, {"$set": update_data})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Plan not found")
    return {"success": True, "message": f"Plan '{plan_key}' updated"}

@router.delete("/pricing/plans/{plan_key}")
async def delete_duration_plan(plan_key: str, token: dict = Depends(require_superadmin)):
    res = await db.system_duration_plans.delete_one({"plan_key": plan_key})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Plan not found")
    return {"success": True, "message": f"Plan '{plan_key}' deleted successfully"}


