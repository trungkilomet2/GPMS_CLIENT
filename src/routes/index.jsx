import { lazy } from "react";
import CustomerLayout from "@/components/layout/CustomerLayout";

// Orders
const Orders = lazy(() => import("../pages/orders/OrdersList"));
const OrderDetail = lazy(() => import("../pages/orders/OrderDetail"));
const CreateOrder = lazy(() => import("../pages/orders/CreateOrder"));
const EditOrder = lazy(() => import("../pages/orders/EditOrder"));

// Profile
const ViewProfile = lazy(() => import("../pages/profile/ViewProfile"));
const ProfileEdit = lazy(() => import("../pages/profile/ProfileEdit"));

// Auth
const Login = lazy(() => import("../pages/auth/Login"));
const Register = lazy(() => import("../pages/auth/Register"));

export const routes = [

/* ========================
   AUTH
======================== */

{
  path: "/login",
  element: <Login/>
},

{
  path: "/register",
  element: <Register/>
},

/* ========================
   ORDERS
======================== */

{
  path: "/",
  element: <Orders/>
},

{
  path: "/orders",
  element: <Orders/>
},

{
  path: "/orders/create",
  element: <CreateOrder/>
},

{
  path: "/orders/edit/:id",
  element: <EditOrder/>
},

{
  path: "/orders/detail/:id",
  element: <OrderDetail/>
},

/* ========================
   PROFILE
======================== */

{
  path: "/profile",
  element: (
    <CustomerLayout title="Hồ sơ cá nhân">
      <ViewProfile/>
    </CustomerLayout>
  )
},

{
  path: "/profile/edit",
  element: (
    <CustomerLayout title="Chỉnh sửa hồ sơ">
      <ProfileEdit/>
    </CustomerLayout>
  )
},

/* ========================
   404
======================== */

{
  path: "*",
  element: (
    <div style={{
      display:"flex",
      justifyContent:"center",
      alignItems:"center",
      height:"100vh",
      fontSize:"24px"
    }}>
      Trang không tồn tại (404)
    </div>
  )
}

];