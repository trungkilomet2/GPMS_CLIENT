import { lazy } from "react";

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
const LeaveRequests = lazy(() => import("@/pages/owner/LeaveRequests"));
const EmployeeList = lazy(() => import("@/pages/employees/EmployeeList"));
const EmployeeCreate = lazy(() => import("@/pages/employees/EmployeeCreate"));
const EmployeeDetail = lazy(() => import("@/pages/employees/EmployeeDetail"));
const EmployeeUpdate = lazy(() => import("@/pages/employees/EmployeeUpdate"));
const AdminUserList = lazy(() => import("@/pages/admin/AdminUserList"));
const AdminUserCreate = lazy(() => import("@/pages/admin/AdminUserCreate"));
const AdminUserDetail = lazy(() => import("@/pages/admin/AdminUserDetail"));
const AdminUserUpdate = lazy(() => import("@/pages/admin/AdminUserUpdate"));
const AdminSystemLog = lazy(() => import("@/pages/admin/AdminSystemLog"));
const AdminManagePermission = lazy(() => import("@/pages/admin/AdminManagePermission"));

// PROFILE
const ViewProfile = lazy(() => import("@/pages/profile/ViewProfile"));
const ProfileEdit = lazy(() => import("@/pages/profile/ProfileEdit"));

// LEAVE
const LeaveList = lazy(() => import("@/pages/leave/LeaveList"));
const LeaveDetail = lazy(() => import("@/pages/leave/LeaveDetail"));

export const routes = [
  { path: "/", element: <HomePage /> },

  // HOMEPAGE
  { path: "/home", element: <HomePage /> },
  { path: "/dashboard", element: <InternalDashboard /> },

  // AUTH
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },

  // ORDERS
  { path: "/orders", element: <OrdersList /> },
  { path: "/orders/owner", element: <OwnerOrdersList /> },
  { path: "/orders/create", element: <CreateOrder /> },
  { path: "/orders/manual-create", element: <CreateManualOrder /> },
  { path: "/orders/edit/:id", element: <EditOrder /> },
  { path: "/orders/detail/:id", element: <OrderDetail /> },
  { path: "/production/create", element: <CreateProduction /> },
  { path: "/production/create/:orderId", element: <CreateProduction /> },
  { path: "/production", element: <ProductionList /> },
  { path: "/production/:id", element: <ProductionDetail /> },
  { path: "/production/:id/edit", element: <UpdateProduction /> },
  { path: "/monitoring", element: <ProductionPlanList /> },
  { path: "/monitoring/create", element: <ProductionPlan /> },
  { path: "/monitoring/:id", element: <ProductionPlanDetail /> },
  { path: "/leave-requests", element: <LeaveRequests /> },
  { path: "/employees", element: <EmployeeList /> },
  { path: "/employees/create", element: <EmployeeCreate /> },
  { path: "/employees/:id/edit", element: <EmployeeUpdate /> },
  { path: "/employees/:id", element: <EmployeeDetail /> },
  { path: "/admin/users", element: <AdminUserList /> },
  { path: "/admin/users/create", element: <AdminUserCreate /> },
  { path: "/admin/users/:id/edit", element: <AdminUserUpdate /> },
  { path: "/admin/users/:id", element: <AdminUserDetail /> },
  { path: "/admin/logs", element: <AdminSystemLog /> },
  { path: "/admin/permissions", element: <AdminManagePermission /> },

  // PROFILE
  { path: "/profile", element: <ViewProfile /> },
  { path: "/profile/edit", element: <ProfileEdit /> },

  // LEAVE
  { path: "/leave", element: <LeaveList /> },
  { path: "/leave/:id", element: <LeaveDetail /> },

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
