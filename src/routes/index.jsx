import { lazy } from "react";
import CustomerLayout from "@/components/layout/CustomerLayout";

/* ── HOMEPAGE ── */
const HomePage = lazy(() => import("@/pages/HomePage"));

/* ── AUTH ── */
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));

/* ── ORDERS ── */
const OrdersList = lazy(() => import("@/pages/orders/OrdersList"));
const OrderDetail = lazy(() => import("@/pages/orders/OrderDetail"));
const CreateOrder = lazy(() => import("@/pages/orders/CreateOrder"));
const EditOrder = lazy(() => import("@/pages/orders/EditOrder"));

/* ── PROFILE ── */
const ViewProfile = lazy(() => import("@/pages/profile/ViewProfile"));
const ProfileEdit = lazy(() => import("@/pages/profile/ProfileEdit"));

export const routes = [

  { path: "/", element: <HomePage /> },

  /* HOMEPAGE */
  { path: "/home", element: <HomePage /> },

  /* AUTH */
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },

  /* ORDERS */
  { path: "/orders", element: <OrdersList /> },
  { path: "/orders/create", element: <CreateOrder /> },
  { path: "/orders/edit/:id", element: <EditOrder /> },
  { path: "/orders/detail/:id", element: <OrderDetail /> },

  /* PROFILE */
  {
    path: "/profile",
    element: (
      <CustomerLayout title="Hồ sơ cá nhân">
        <ViewProfile />
      </CustomerLayout>
    ),
  },
  {
    path: "/profile/edit",
    element: (
      <CustomerLayout title="Chỉnh sửa hồ sơ">
        <ProfileEdit />
      </CustomerLayout>
    ),
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