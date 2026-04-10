import { lazy } from "react";
import AdminRouteGuard from "@/routes/AdminRouteGuard";
import LeaveRouteGuard from "@/routes/LeaveRouteGuard";
import PublicCustomerRouteGuard from "@/routes/PublicCustomerRouteGuard";
import RoleRouteGuard from "@/routes/RoleRouteGuard";

// HOMEPAGE
const HomePage = lazy(() => import("@/pages/HomePage"));
const AboutPage = lazy(() => import("@/pages/AboutPage"));
const ServicesPage = lazy(() => import("@/pages/ServicesPage"));
const FactoryPage = lazy(() => import("@/pages/FactoryPage"));
const ContactPage = lazy(() => import("@/pages/ContactPage"));
const InternalDashboard = lazy(() => import("@/pages/dashboard/InternalDashboard"));

// AUTH
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage"));

// ORDERS
const OrdersList = lazy(() => import("@/pages/orders/OrderHistory"));
const OwnerOrdersList = lazy(() => import("@/pages/orders/OwnerOrdersList"));
const OrderDetail = lazy(() => import("@/pages/orders/OrderDetail"));
const CreateOrder = lazy(() => import("@/pages/orders/CreateOrder"));
const CreateManualOrder = lazy(() => import("@/pages/orders/CreateManualOrder"));
const EditOrder = lazy(() => import("@/pages/orders/EditOrder"));
const CreateProduction = lazy(() => import("@/pages/production/CreateProduction"));
const ProductionList = lazy(() => import("@/pages/production/ProductionList"));
const ProductionDetail = lazy(() => import("@/pages/production/ProductionDetail"));
const UpdateProduction = lazy(() => import("@/pages/production/UpdateProduction"));
const ProductionPlan = lazy(() => import("@/pages/production/ProductionPlan"));
const ProductionPlanList = lazy(() => import("@/pages/production/ProductionPlanList"));
const ProductionPlanDetail = lazy(() => import("@/pages/production/ProductionPlanDetail"));
const ProductionErrorSummary = lazy(() => import("@/pages/production/ProductionErrorSummary"));
const ProductionAssignment = lazy(() => import("@/pages/production/ProductionAssignment"));
const WorkerDailyReport = lazy(() => import("@/pages/production/WorkerDailyReport"));
const WorkerDailyReportEdit = lazy(() => import("@/pages/production/WorkerDailyReportEdit"));
const WorkerErrorReport = lazy(() => import("@/pages/production/WorkerErrorReport"));
const WorkerCuttingBook = lazy(() => import("@/pages/production/WorkerCuttingBook"));
const WorkerCuttingBookDetail = lazy(() => import("@/pages/production/WorkerCuttingBookDetail"));
const WorkerAssignment = lazy(() => import("@/pages/production/WorkerAssignment"));
const OutputHistory = lazy(() => import("@/pages/production/OutputHistory"));
const ProductionPartHistory = lazy(() => import("@/pages/production/ProductionPartHistory"));
const LeaveRequests = lazy(() => import("@/pages/owner/LeaveRequests"));
const CustomerManagement = lazy(() => import("@/pages/customers/CustomerManagement"));
const EmployeeDirectory = lazy(() => import("@/pages/employees/EmployeeDirectory"));
const EmployeeList = lazy(() => import("@/pages/employees/EmployeeList"));
const EmployeeCreate = lazy(() => import("@/pages/employees/EmployeeCreate"));
const EmployeeDetail = lazy(() => import("@/pages/employees/EmployeeDetail"));
const EmployeeUpdate = lazy(() => import("@/pages/employees/EmployeeUpdate"));
const EmployeeSkillAssignment = lazy(() => import("@/pages/employees/EmployeeSkillAssignment"));
const LeaveRequestDetail = lazy(() => import("@/pages/owner/LeaveRequestDetail"));
const WorkerRoleList = lazy(() => import("@/pages/worker-roles/WorkerRoleList"));
const WorkerRoleCreate = lazy(() => import("@/pages/worker-roles/WorkerRoleCreate"));
const AdminUserList = lazy(() => import("@/pages/admin/AdminUserList"));
const AdminUserActivate = lazy(() => import("@/pages/admin/AdminUserActivate"));
const AdminUserCreate = lazy(() => import("@/pages/admin/AdminUserCreate"));
const AdminUserDetail = lazy(() => import("@/pages/admin/AdminUserDetail"));
const AdminUserUpdate = lazy(() => import("@/pages/admin/AdminUserUpdate"));
const AdminSystemLog = lazy(() => import("@/pages/admin/AdminSystemLog"));
const AdminManagePermission = lazy(() => import("@/pages/admin/AdminManagePermission"));
const PayrollList = lazy(() => import("@/pages/payroll/PayrollList"));
const PayrollDetail = lazy(() => import("@/pages/payroll/PayrollDetail"));

// PROFILE
const ProfileViewGate = lazy(() => import("@/pages/profile/ProfileViewGate"));
const ProfileEditGate = lazy(() => import("@/pages/profile/ProfileEditGate"));

// LEAVE
const LeaveList = lazy(() => import("@/pages/leave/LeaveList"));
const LeaveDetail = lazy(() => import("@/pages/leave/LeaveDetail"));
const LeaveRequestHistoryList = lazy(() => import("@/pages/leave-history/LeaveRequestHistoryList"));
const LeaveRequestHistoryDetail = lazy(() => import("@/pages/leave-history/LeaveRequestHistoryDetail"));

const guardByRoles = (allowedRoles, element) => (
  <RoleRouteGuard allowedRoles={allowedRoles}>{element}</RoleRouteGuard>
);

const guardPublicCustomer = (element) => (
  <PublicCustomerRouteGuard>{element}</PublicCustomerRouteGuard>
);

export const routes = [
  { path: "/", element: guardPublicCustomer(<HomePage />) },

  // HOMEPAGE
  { path: "/home", element: guardPublicCustomer(<HomePage />) },
  { path: "/about", element: guardPublicCustomer(<AboutPage />) },
  { path: "/services", element: guardPublicCustomer(<ServicesPage />) },
  { path: "/factory", element: guardPublicCustomer(<FactoryPage />) },
  { path: "/contact", element: guardPublicCustomer(<ContactPage />) },
  { path: "/dashboard", element: guardByRoles(["Owner"], <InternalDashboard />) },

  // AUTH
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },

  // ORDERS
  { path: "/orders", element: guardByRoles(["Owner", "Customer"], <OrdersList />) },
  { path: "/orders/owner", element: guardByRoles(["Owner"], <OwnerOrdersList />) },
  { path: "/orders/create", element: guardByRoles(["Customer"], <CreateOrder />) },
  { path: "/orders/manual-create", element: guardByRoles(["Owner"], <CreateManualOrder />) },
  { path: "/orders/edit/:id", element: guardByRoles(["Customer"], <EditOrder />) },
  { path: "/orders/detail/:id", element: guardByRoles(["Owner", "PM", "Customer"], <OrderDetail />) },
  { path: "/production/create", element: guardByRoles(["Owner", "PM"], <CreateProduction />) },
  { path: "/production/create/:orderId", element: guardByRoles(["Owner", "PM"], <CreateProduction />) },
  { path: "/production", element: guardByRoles(["Owner", "PM"], <ProductionList />) },
  { path: "/production/:id", element: guardByRoles(["Owner", "PM"], <ProductionDetail />) },
  { path: "/production/:id/edit", element: guardByRoles(["Owner", "PM"], <UpdateProduction />) },
  { path: "/production/:id/errors", element: guardByRoles(["Owner", "PM"], <ProductionErrorSummary />) },
  { path: "/production-plan", element: guardByRoles(["Owner", "PM", "Team Leader"], <ProductionPlanList />) },
  { path: "/production-plan/create", element: guardByRoles(["Owner", "PM"], <ProductionPlan />) },
  { path: "/production-plan/:id", element: guardByRoles(["Owner", "PM", "Team Leader"], <ProductionPlanDetail />) },
  { path: "/production-plan/assign", element: guardByRoles(["Team Leader", "Owner", "PM"], <ProductionAssignment />) },
  { path: "/production-plan/assign/:id", element: guardByRoles(["Team Leader", "Owner", "PM"], <ProductionAssignment />) },
  { path: "/worker/daily-report", element: guardByRoles(["Owner", "PM", "Worker", "KCS"], <WorkerDailyReport />) },
  { path: "/worker/daily-report/edit", element: guardByRoles(["Worker", "KCS"], <WorkerDailyReportEdit />) },
  { path: "/worker/error-report", element: guardByRoles(["Owner", "PM", "Manager", "Team Leader", "Worker", "KCS"], <WorkerErrorReport />) },
  { path: "/worker/cutting-book", element: guardByRoles(["owner", "pm", "team leader", "worker", "kcs"], <WorkerCuttingBook />) },
  { path: "/worker/cutting-book/detail/:id", element: guardByRoles(["owner", "pm", "team leader", "worker", "kcs"], <WorkerCuttingBookDetail />) },
  { path: "/worker/assignments", element: guardByRoles(["Owner", "PM", "Manager", "Worker", "KCS"], <WorkerAssignment />) },
  { path: "/worker/production-plan", element: guardByRoles(["Owner", "PM", "Manager", "Worker", "KCS"], <ProductionPlanList />) },
  { path: "/worker/production-plan/:id", element: guardByRoles(["Owner", "PM", "Manager", "Worker", "KCS"], <ProductionPlanDetail />) },
  { path: "/worker/output-history", element: guardByRoles(["Owner", "PM", "Manager", "Worker", "KCS"], <OutputHistory />) },
  { path: "/worker/leave-requests", element: guardByRoles(["Owner", "PM", "Manager", "Worker", "KCS"], <LeaveRequests />) },
  { path: "/worker/leave-requests/:id", element: guardByRoles(["Owner", "PM", "Manager", "Worker", "KCS"], <LeaveRequestDetail />) },
  { path: "/output-history", element: guardByRoles(["Owner", "PM", "Team Leader"], <OutputHistory />) },
  { path: "/production/part/:partId/history", element: guardByRoles(["Owner", "PM", "Manager", "Team Leader"], <ProductionPartHistory />) },
  { path: "/leave-requests", element: guardByRoles(["PM", "Team Leader"], <LeaveRequests />) },
  { path: "/customers", element: guardByRoles(["Owner"], <CustomerManagement />) },
  { path: "/payroll", element: guardByRoles(["Owner"], <PayrollList />) },
  { path: "/payroll/:workerId", element: guardByRoles(["Owner"], <PayrollDetail />) },
  { path: "/employees", element: guardByRoles(["Owner", "PM"], <EmployeeDirectory />) },
  { path: "/employees/management", element: guardByRoles(["Owner"], <EmployeeList />) },
  { path: "/employees/workers", element: guardByRoles(["Owner", "PM"], <EmployeeList />) },
  { path: "/employees/create", element: guardByRoles(["Owner"], <EmployeeCreate />) },
  { path: "/employees/:id/edit", element: guardByRoles(["Owner"], <EmployeeUpdate />) },
  { path: "/employees/:id/skills", element: guardByRoles(["Owner", "PM"], <EmployeeSkillAssignment />) },
  { path: "/employees/:id", element: guardByRoles(["Owner", "PM"], <EmployeeDetail />) },
  { path: "/leave-requests/:id", element: guardByRoles(["PM", "Team Leader"], <LeaveRequestDetail />) },
  { path: "/worker-roles", element: guardByRoles(["Owner", "PM"], <WorkerRoleList />) },
  { path: "/worker-roles/create", element: guardByRoles(["Owner", "PM"], <WorkerRoleCreate />) },
  { path: "/admin/users", element: <AdminRouteGuard><AdminUserList /></AdminRouteGuard> },
  { path: "/admin/users/active", element: <AdminRouteGuard><AdminUserActivate /></AdminRouteGuard> },
  { path: "/admin/users/create", element: <AdminRouteGuard><AdminUserCreate /></AdminRouteGuard> },
  { path: "/admin/users/:id/edit", element: <AdminRouteGuard><AdminUserUpdate /></AdminRouteGuard> },
  { path: "/admin/users/:id", element: <AdminRouteGuard><AdminUserDetail /></AdminRouteGuard> },
  { path: "/admin/logs", element: <AdminRouteGuard><AdminSystemLog /></AdminRouteGuard> },
  { path: "/admin/permissions", element: <AdminRouteGuard><AdminManagePermission /></AdminRouteGuard> },

  // PROFILE
  { path: "/profile", element: <ProfileViewGate /> },
  { path: "/profile/edit", element: <ProfileEditGate /> },

  /* LEAVE */
  {
    path: "/leave",
    element: guardByRoles(["Owner", "PM"], <LeaveRouteGuard><LeaveList /></LeaveRouteGuard>),
  },
  {
    path: "/leave/:id",
    element: guardByRoles(["Owner", "PM"], <LeaveRouteGuard><LeaveDetail /></LeaveRouteGuard>),
  },
  {
    path: "/leave-history",
    element: guardByRoles(["Owner", "PM", "Team Leader", "Worker", "KCS"], <LeaveRequestHistoryList />),
  },
  {
    path: "/leave-history/:id",
    element: guardByRoles(["Owner", "PM", "Team Leader", "Worker", "KCS"], <LeaveRequestHistoryDetail />),
  },

  // 404
  {
    path: "*",
    element: (
      <div className="flex items-center justify-center h-screen text-2xl font-bold text-gray-600">
        Trang không tồn tại (404)
      </div>
    ),
  },
];
