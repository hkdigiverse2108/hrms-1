from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
import os
from datetime import datetime, timedelta
from bson import ObjectId

from database import db, get_current_time
from auth import create_access_token, get_password_hash, require_superadmin
import crud

router = APIRouter(prefix="/purchase", tags=["purchase"])

# --- Default Seed Data ---
DEFAULT_MODULES = [
    # Category: Core HR & Attendance
    {"module_key": "employee-list", "display_name": "Employee Directory", "category": "Core HR & Attendance", "price_per_month": 300, "is_enabled": True, "description": "Manage employee profiles, onboarding, and directory."},
    {"module_key": "org-structure", "display_name": "Org Structure", "category": "Core HR & Attendance", "price_per_month": 200, "is_enabled": True, "description": "Departments, designations, and hierarchy structure."},
    {"module_key": "attendance", "display_name": "Attendance Tracking", "category": "Core HR & Attendance", "price_per_month": 400, "is_enabled": True, "description": "Daily attendance punch-in/out, shifts, late penalties."},
    {"module_key": "leave", "display_name": "Leave Management", "category": "Core HR & Attendance", "price_per_month": 300, "is_enabled": True, "description": "Leave requests, approvals, and balance tracking."},
    {"module_key": "employee-documents", "display_name": "Employee Documents", "category": "Core HR & Attendance", "price_per_month": 250, "is_enabled": True, "description": "Document management & auto document generator."},

    # Category: Payroll & Finance
    {"module_key": "payroll-processing", "display_name": "Payroll Processing & Payslips", "category": "Payroll & Finance", "price_per_month": 600, "is_enabled": True, "description": "Monthly salary calculation, bonuses, deductions, and payslips."},
    {"module_key": "company-finance-transactions", "display_name": "Company Finance & Audit", "category": "Payroll & Finance", "price_per_month": 500, "is_enabled": True, "description": "Income/expense transactions, audit logs, financial planning."},
    {"module_key": "invoice", "display_name": "Invoicing & Billing", "category": "Payroll & Finance", "price_per_month": 400, "is_enabled": True, "description": "Create proforma & tax invoices, client ledgers."},

    # Category: Work & Project Management
    {"module_key": "projects", "display_name": "Project Management", "category": "Work & Project Management", "price_per_month": 500, "is_enabled": True, "description": "Projects, milestones, client feedback, and team assignment."},
    {"module_key": "tasks", "display_name": "Development & Tasks", "category": "Work & Project Management", "price_per_month": 400, "is_enabled": True, "description": "Sprint tasks, my tasks, and task logs."},
    {"module_key": "daily-progress", "display_name": "Daily Progress Logs", "category": "Work & Project Management", "price_per_month": 300, "is_enabled": True, "description": "Daily work submission and HR progress tracking."},
    {"module_key": "sales", "display_name": "Sales & Leads Management", "category": "Work & Project Management", "price_per_month": 400, "is_enabled": True, "description": "Sales pipeline, lead tracking, and deal analytics."},
    {"module_key": "clients", "display_name": "Client Directory", "category": "Work & Project Management", "price_per_month": 300, "is_enabled": True, "description": "Client profiles, transactions, and feedback."},
    {"module_key": "marketing", "display_name": "Digital Marketing & SMM", "category": "Work & Project Management", "price_per_month": 400, "is_enabled": True, "description": "Content calendar, social media management, daily remarks."},

    # Category: Collaboration & Productivity
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

# --- Models ---
class ModulePriceUpdate(BaseModel):
    price_per_month: float
    is_enabled: Optional[bool] = True

class PlanUpdate(BaseModel):
    discount_percent: float
    is_active: Optional[bool] = True

class CalculateOrderRequest(BaseModel):
    selected_modules: List[str]
    plan_key: str  # 3_months, 6_months, 1_year

class CheckoutRequest(BaseModel):
    company_name: str
    company_code: str
    logo_url: Optional[str] = ""
    contact_email: EmailStr
    contact_phone: Optional[str] = ""
    address: Optional[str] = ""
    admin_name: str
    admin_email: EmailStr
    admin_password: str
    selected_modules: List[str]
    plan_key: str

# --- Helper Seeding ---
async def seed_pricing_if_empty():
    count_mods = await db.system_module_prices.count_documents({})
    if count_mods == 0:
        now = get_current_time()
        for m in DEFAULT_MODULES:
            doc = {**m, "created_at": now, "updated_at": now}
            await db.system_module_prices.insert_one(doc)

    count_plans = await db.system_duration_plans.count_documents({})
    if count_plans == 0:
        now = get_current_time()
        for p in DEFAULT_PLANS:
            doc = {**p, "created_at": now, "updated_at": now}
            await db.system_duration_plans.insert_one(doc)

# --- Endpoints ---

@router.get("/options")
async def get_public_purchase_options():
    await seed_pricing_if_empty()

    modules = await db.system_module_prices.find({"is_enabled": True}).to_list(length=100)
    plans = await db.system_duration_plans.find({"is_active": True}).to_list(length=10)

    # Format modules
    formatted_mods = []
    for m in modules:
        formatted_mods.append({
            "module_key": m.get("module_key"),
            "display_name": m.get("display_name"),
            "category": m.get("category", "General"),
            "price_per_month": m.get("price_per_month", 0),
            "description": m.get("description", "")
        })

    # Format plans
    formatted_plans = []
    for p in plans:
        formatted_plans.append({
            "plan_key": p.get("plan_key"),
            "display_name": p.get("display_name"),
            "months": p.get("months", 1),
            "discount_percent": p.get("discount_percent", 0),
            "badge": p.get("badge", "")
        })

    return {
        "modules": formatted_mods,
        "plans": formatted_plans
    }

@router.post("/calculate")
async def calculate_order_summary(payload: CalculateOrderRequest):
    await seed_pricing_if_empty()

    if not payload.selected_modules:
        raise HTTPException(status_code=400, detail="Please select at least one module")

    # Fetch selected modules
    modules = await db.system_module_prices.find({
        "module_key": {"$in": payload.selected_modules},
        "is_enabled": True
    }).to_list(length=100)

    plan = await db.system_duration_plans.find_one({
        "plan_key": payload.plan_key,
        "is_active": True
    })

    if not plan:
        raise HTTPException(status_code=400, detail="Invalid subscription plan selected")

    monthly_subtotal = sum([m.get("price_per_month", 0) for m in modules])
    months = plan.get("months", 1)
    raw_total = monthly_subtotal * months

    discount_percent = plan.get("discount_percent", 0)
    discount_amount = (raw_total * discount_percent) / 100.0
    final_total = max(0, raw_total - discount_amount)

    return {
        "selected_modules_count": len(modules),
        "monthly_subtotal": monthly_subtotal,
        "duration_months": months,
        "raw_total": raw_total,
        "discount_percent": discount_percent,
        "discount_amount": discount_amount,
        "final_total": final_total,
        "plan_display_name": plan.get("display_name")
    }

@router.post("/checkout")
async def checkout_purchase(payload: CheckoutRequest):
    await seed_pricing_if_empty()

    code = payload.company_code.strip().lower().replace(" ", "-")

    # Check if company code already exists
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
            detail=f"Admin email '{payload.admin_email}' is already registered."
        )

    # Calculate pricing
    summary = await calculate_order_summary(CalculateOrderRequest(
        selected_modules=payload.selected_modules,
        plan_key=payload.plan_key
    ))

    now = get_current_time()
    months = summary["duration_months"]
    expiry_date = now + timedelta(days=months * 30)

    # 1. Insert Company Document
    company_doc = {
        "company_name": payload.company_name.strip(),
        "company_code": code,
        "logo_url": payload.logo_url.strip() if payload.logo_url else "",
        "contact_email": payload.contact_email.strip().lower(),
        "contact_phone": payload.contact_phone.strip() if payload.contact_phone else "",
        "address": payload.address.strip() if payload.address else "",
        "subscription_plan": summary["plan_display_name"],
        "subscription_duration_months": months,
        "subscription_expiry_date": expiry_date.isoformat(),
        "enabled_modules": payload.selected_modules,
        "status": "active",
        "max_employees": 50,
        "total_paid": summary["final_total"],
        "created_at": now,
        "updated_at": now
    }
    comp_res = await db.companies.insert_one(company_doc)
    company_id = str(comp_res.inserted_id)

    # 2. Create Initial Company Admin User
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

    # 3. Grant Permissions ONLY for Selected Modules to the Admin
    permissions = []
    # Map selected_modules to permission entries
    for mod_key in payload.selected_modules:
        permissions.append({
            "moduleName": mod_key,
            "displayName": mod_key.replace("-", " ").title(),
            "canAdd": True,
            "canEdit": True,
            "canDelete": True,
            "canView": True
        })

    await db.user_permissions.insert_one({
        "employeeId": admin_id,
        "company_id": code,
        "presetId": "CompanyPurchasedAdmin",
        "permissions": permissions,
        "created_at": now
    })

    # 4. Provision Default Departments & Designations
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
        "message": f"Payment successful & Company '{payload.company_name}' provisioned!",
        "order": {
            "total_paid": summary["final_total"],
            "plan": summary["plan_display_name"],
            "duration_months": months,
            "expiry_date": expiry_date.strftime("%Y-%m-%d"),
            "enabled_modules": payload.selected_modules
        },
        "company": {
            "id": company_id,
            "company_name": payload.company_name,
            "company_code": code,
            "contact_email": payload.contact_email
        },
        "admin": {
            "id": admin_id,
            "name": payload.admin_name,
            "email": payload.admin_email,
            "role": "Admin"
        }
    }

# --- Super Admin Pricing CRUD Endpoints ---

@router.get("/super-admin/pricing/modules")
async def get_all_module_prices(token: dict = Depends(require_superadmin)):
    await seed_pricing_if_empty()
    modules = await db.system_module_prices.find({}).to_list(length=100)
    result = []
    for m in modules:
        result.append({
            "id": str(m.get("_id")),
            "module_key": m.get("module_key"),
            "display_name": m.get("display_name"),
            "category": m.get("category", "General"),
            "price_per_month": m.get("price_per_month", 0),
            "is_enabled": m.get("is_enabled", True),
            "description": m.get("description", "")
        })
    return result

@router.put("/super-admin/pricing/modules/{module_key}")
async def update_module_price(module_key: str, payload: ModulePriceUpdate, token: dict = Depends(require_superadmin)):
    await seed_pricing_if_empty()
    res = await db.system_module_prices.update_one(
        {"module_key": module_key},
        {"$set": {
            "price_per_month": payload.price_per_month,
            "is_enabled": payload.is_enabled if payload.is_enabled is not None else True,
            "updated_at": get_current_time()
        }}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Module not found")
    return {"success": True, "message": f"Pricing for module '{module_key}' updated"}

@router.get("/super-admin/pricing/plans")
async def get_all_duration_plans(token: dict = Depends(require_superadmin)):
    await seed_pricing_if_empty()
    plans = await db.system_duration_plans.find({}).to_list(length=20)
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

@router.put("/super-admin/pricing/plans/{plan_key}")
async def update_duration_plan(plan_key: str, payload: PlanUpdate, token: dict = Depends(require_superadmin)):
    await seed_pricing_if_empty()
    res = await db.system_duration_plans.update_one(
        {"plan_key": plan_key},
        {"$set": {
            "discount_percent": payload.discount_percent,
            "is_active": payload.is_active if payload.is_active is not None else True,
            "updated_at": get_current_time()
        }}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Plan not found")
    return {"success": True, "message": f"Plan '{plan_key}' updated"}
