import { lazy } from "react";
import AdminRouteGuard from "@/routes/AdminRouteGuard";
import LeaveRouteGuard from "@/routes/LeaveRouteGuard";
import RoleRouteGuard from "@/routes/RoleRouteGuard";

// HOMEPAGE
const HomePage = lazy(() => import("@/pages/HomePage"));
const InternalDashboard = lazy(() => import("@/pages/dashboard/InternalDashboard"));

// AUTH
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));

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
const WorkerAssignment = lazy(() => import("@/pages/production/WorkerAssignment"));
const OutputHistory = lazy(() => import("@/pages/production/OutputHistory"));
const LeaveRequests = lazy(() => import("@/pages/owner/LeaveRequests"));
const EmployeeDirectory = lazy(() => import("@/pages/employees/EmployeeDirectory"));
const EmployeeList = lazy(() => import("@/pages/employees/EmployeeList"));
const EmployeeCreate = lazy(() => import("@/pages/employees/EmployeeCreate"));
const EmployeeDetail = lazy(() => import("@/pages/employees/EmployeeDetail"));
const EmployeeUpdate = lazy(() => import("@/pages/employees/EmployeeUpdate"));
const PayrollList = lazy(() => import("@/pages/payroll/PayrollList"));
const PayrollDetail = lazy(() => import("@/pages/payroll/PayrollDetail"));
const LeaveRequestDetail = lazy(() => import("@/pages/owner/LeaveRequestDetail"));
const WorkerRoleList = lazy(() => import("@/pages/worker-roles/WorkerRoleList"));
const WorkerRoleCreate = lazy(() => import("@/pages/worker-roles/WorkerRoleCreate"));
const AdminUserList = lazy(() => import("@/pages/admin/AdminUserList"));
const AdminUserCreate = lazy(() => import("@/pages/admin/AdminUserCreate"));
const AdminUserDetail = lazy(() => import("@/pages/admin/AdminUserDetail"));
const AdminUserUpdate = lazy(() => import("@/pages/admin/AdminUserUpdate"));
const AdminSystemLog = lazy(() => import("@/pages/admin/AdminSystemLog"));
const AdminManagePermission = lazy(() => import("@/pages/admin/AdminManagePermission"));

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

export const routes = [
  { path: "/", element: <HomePage /> },

  // HOMEPAGE
  { path: "/home", element: <HomePage /> },
  { path: "/dashboard", element: guardByRoles(["Owner"], <InternalDashboard />) },

  // AUTH
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },

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
  { path: "/production-plan", element: guardByRoles(["Owner", "PM"], <ProductionPlanList />) },
  { path: "/production-plan/create", element: guardByRoles(["Owner", "PM"], <ProductionPlan />) },
  { path: "/production-plan/:id", element: guardByRoles(["Owner", "PM"], <ProductionPlanDetail />) },
  { path: "/production-plan/assign", element: guardByRoles(["Owner", "PM"], <ProductionAssignment />) },
  { path: "/production-plan/assign/:id", element: guardByRoles(["Owner", "PM"], <ProductionAssignment />) },
  { path: "/worker/daily-report", element: guardByRoles(["Owner", "Worker"], <WorkerDailyReport />) },
  { path: "/worker/daily-report/edit", element: guardByRoles(["Worker"], <WorkerDailyReportEdit />) },
  { path: "/worker/error-report", element: guardByRoles(["Worker"], <WorkerErrorReport />) },
  { path: "/worker/cutting-book", element: guardByRoles(["Worker"], <WorkerCuttingBook />) },
  { path: "/worker/assignments", element: guardByRoles(["Owner", "Worker"], <WorkerAssignment />) },
  { path: "/worker/production-plan", element: guardByRoles(["Owner", "Worker"], <ProductionPlanList />) },
  { path: "/worker/production-plan/:id", element: guardByRoles(["Owner", "Worker"], <ProductionPlanDetail />) },
  { path: "/worker/output-history", element: guardByRoles(["Owner", "Worker"], <OutputHistory />) },
  { path: "/worker/leave-requests", element: guardByRoles(["Owner", "Worker"], <LeaveRequests />) },
  { path: "/worker/leave-requests/:id", element: guardByRoles(["Owner", "Worker"], <LeaveRequestDetail />) },
  { path: "/output-history", element: guardByRoles(["Owner", "PM"], <OutputHistory />) },
  { path: "/leave-requests", element: guardByRoles(["Owner", "PM"], <LeaveRequests />) },
  { path: "/employees", element: guardByRoles(["Owner", "PM"], <EmployeeDirectory />) },
  { path: "/employees/management", element: guardByRoles(["Owner"], <EmployeeList />) },
  { path: "/employees/workers", element: guardByRoles(["Owner", "PM"], <EmployeeList />) },
  { path: "/employees/create", element: guardByRoles(["Owner"], <EmployeeCreate />) },
  { path: "/employees/:id/edit", element: guardByRoles(["Owner"], <EmployeeUpdate />) },
  { path: "/employees/:id", element: guardByRoles(["Owner", "PM"], <EmployeeDetail />) },
  { path: "/salary", element: guardByRoles(["Owner"], <PayrollList />) },
  { path: "/salary/:employeeId", element: guardByRoles(["Owner"], <PayrollDetail />) },
  { path: "/leave-requests/:id", element: guardByRoles(["Owner", "PM"], <LeaveRequestDetail />) },
  { path: "/worker-roles", element: guardByRoles(["Owner", "PM"], <WorkerRoleList />) },
  { path: "/worker-roles/create", element: guardByRoles(["Owner"], <WorkerRoleCreate />) },
  { path: "/admin/users", element: <AdminRouteGuard><AdminUserList /></AdminRouteGuard> },
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
    element: guardByRoles(["Owner", "PM"], <LeaveRequestHistoryList />),
  },
  {
    path: "/leave-history/:id",
    element: guardByRoles(["Owner", "PM"], <LeaveRequestHistoryDetail />),
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
