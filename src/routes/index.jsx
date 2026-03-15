import { lazy } from "react";

/* ── HOMEPAGE ── */
const HomePage = lazy(() => import("@/pages/HomePage"));

/* ── AUTH ── */
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));

/* ── ORDERS ── */
const OrdersList = lazy(() => import("@/pages/orders/OrderHistory"));
const OwnerOrdersList = lazy(() => import("@/pages/orders/OwnerOrdersList"));
const OrderDetail = lazy(() => import("@/pages/orders/OrderDetail"));
const CreateOrder = lazy(() => import("@/pages/orders/CreateOrder"));
const CreateManualOrder = lazy(() => import("@/pages/orders/CreateManualOrder"));
const EditOrder = lazy(() => import("@/pages/orders/EditOrder"));
const LeaveRequests = lazy(() => import("@/pages/owner/LeaveRequests"));
const LeaveRequestDetail = lazy(() => import("@/pages/owner/LeaveRequestDetail"));

/* ── PROFILE ── */
const ViewProfile = lazy(() => import("@/pages/profile/ViewProfile"));
const ProfileEdit = lazy(() => import("@/pages/profile/ProfileEdit"));

/* ── LEAVE ── */
const LeaveList = lazy(() => import("@/pages/leave/LeaveList"));
const LeaveDetail = lazy(() => import("@/pages/leave/LeaveDetail"));

export const routes = [

  { path: "/", element: <HomePage /> },

  /* HOMEPAGE */
  { path: "/home", element: <HomePage /> },

  /* AUTH */
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },

  /* ORDERS */
  { path: "/orders", element: <OrdersList /> },
  { path: "/orders/owner", element: <OwnerOrdersList /> },
  { path: "/orders/create", element: <CreateOrder /> },
  { path: "/orders/manual-create", element: <CreateManualOrder /> },
  { path: "/orders/edit/:id", element: <EditOrder /> },
  { path: "/orders/detail/:id", element: <OrderDetail /> },
  { path: "/leave-requests", element: <LeaveRequests /> },
  { path: "/leave-requests/:id", element: <LeaveRequestDetail /> },

  /* PROFILE */
  {
    path: "/profile",
    element: <ViewProfile />,
  },
  {
    path: "/profile/edit",
    element: <ProfileEdit />,
  },

  /* LEAVE */
  {
    path: "/leave",
    element: <LeaveList />,
  },
  {
    path: "/leave/:id",
    element: <LeaveDetail />,
  },

  /* 404 */
  {
    path: "*",
    element: (
      <div className="flex items-center justify-center h-screen text-2xl font-bold text-gray-600">
        Trang không tồn tại (404)
      </div>
    ),
  },
];
