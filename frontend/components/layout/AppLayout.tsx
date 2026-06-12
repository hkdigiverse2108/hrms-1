"use client";
 
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { ReactNode } from "react";
import { Layout } from "antd";
import { useUserContext } from "@/context/UserContext";
import { usePermissions } from "@/hooks/usePermissions";
import { AccessDenied } from "@/components/common/AccessDenied";
 
const { Content } = Layout;

function getRequiredModuleForPath(pathname: string): string | null {
  if (pathname === "/") return null; // Always allow landing on the dashboard
  if (pathname.startsWith("/work-management/projects")) return "projects";
  if (pathname.startsWith("/work-management/tasks")) return "tasks";
  if (pathname.startsWith("/work-management/daily-progress")) return "daily-progress";
  if (pathname.startsWith("/work-management/sales")) return "sales";
  if (pathname.startsWith("/work-management/clients")) return "clients";
  if (pathname.startsWith("/work-management/marketing-reports")) return "marketing";
  if (pathname.startsWith("/work-management/smm")) return "creative";
  
  if (pathname.startsWith("/employees/organization")) return "org-structure";
  if (pathname.startsWith("/employees/attendance")) return "employee-attendance";
  if (pathname.startsWith("/employees/leave")) return "leave-requests";
  if (pathname.startsWith("/employees/documents/generate")) return "document-generator";
  if (pathname.startsWith("/employees/documents")) return "employee-documents";
  if (pathname.startsWith("/employees/edit") || pathname.startsWith("/employees/add") || pathname.startsWith("/employees/permissions")) {
    return "employee-list";
  }
  if (pathname === "/employees" || pathname.startsWith("/employees/")) return "employee-list";
  
  if (pathname.startsWith("/payroll/salary-structure")) return "salary-structure";
  if (pathname.startsWith("/payroll/payslips")) return "payslips";
  if (pathname.startsWith("/payroll/bonuses")) return "bonuses-deductions";
  if (pathname.startsWith("/payroll")) return "payroll-processing";
  
  if (pathname.startsWith("/recruitment/hiring-board")) return "interviews";
  if (pathname.startsWith("/recruitment")) return "hirings";
  
  if (pathname.startsWith("/attendance")) return "attendance";
  if (pathname.startsWith("/leave")) return "leave";
  
  if (pathname.startsWith("/workspace/blank-canvas")) return "blank-canvas";
  if (pathname.startsWith("/workspace/seating")) return "seating-arrangement";
  if (pathname.startsWith("/workspace/resource")) return "resource-management";
  
  if (pathname.startsWith("/remarks")) return "remarks";
  if (pathname.startsWith("/review")) return "review";
  if (pathname.startsWith("/invoice")) return "invoice";
  if (pathname.startsWith("/chat")) return "chat";
  if (pathname.startsWith("/settings")) return "settings";
  
  return null;
}
 
export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useUserContext();
  const { checkPermission, isAdmin, loading: permissionsLoading } = usePermissions();
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
 
  // Authentication Guard
  useEffect(() => {
    if (!isLoading && !user && !isAuthPage) {
      router.push("/login");
    }
  }, [user, isLoading, isAuthPage, router]);
 
  if (isAuthPage) {
    return <main className="flex-1 w-full h-screen bg-white">{children}</main>;
  }
 
  if (isLoading || (!user && !isAuthPage) || (user && permissionsLoading)) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-white">
        <div className="w-10 h-10 border-4 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const requiredModule = getRequiredModuleForPath(pathname);
  const hasAccess = !requiredModule || isAdmin || checkPermission(requiredModule, 'canView');
 
  return (
    <Layout hasSider className="h-screen overflow-hidden w-full">
      <Sidebar />
      <Layout className="site-layout h-screen overflow-y-auto relative custom-scrollbar">
        <Header />
        <Content className="px-4 sm:px-6 lg:px-8 pb-8 mx-auto w-full max-w-[1600px]">
          {hasAccess ? children : <AccessDenied />}
        </Content>
      </Layout>
    </Layout>
  );
}
