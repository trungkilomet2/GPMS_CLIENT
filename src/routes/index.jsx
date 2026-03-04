// src/routes/index.js
import { lazy } from 'react';

// Lazy load các page
const Orders = lazy(() => import('@/pages/orders/OrdersList')); // trang danh sách đơn hàng bạn đã code trước đó
// Auth pages (đúng theo bạn đã tạo)
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
export const routes = [
    {
        path: '/',
        element: <Orders />, // trang mặc định khi vào root
    },
    {
        path: '/orders', // route để hiển thị danh sách đơn hàng
        element: <Orders />,
    },
     // Auth
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: < RegisterPage />,
  },
    // Thêm route khác nếu cần
    {
        path: '*', // 404
        element: (
            <div className="flex items-center justify-center h-screen text-2xl font-bold text-gray-600">
                Trang không tồn tại (404)
            </div>
        ),
    },
];