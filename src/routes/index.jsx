// src/routes/index.js
import { lazy } from 'react';
import OrderDetail from '../pages/orders/OrderDetail';

// Lazy load các page
const Orders = lazy(() => import('@/pages/orders/OrdersList')); // trang danh sách đơn hàng bạn đã code trước đó

export const routes = [
    {
        path: '/',
        element: <Orders />, // trang mặc định khi vào root
    },
    {
        path: '/orders', // route để hiển thị danh sách đơn hàng
        element: <Orders />,
    },
    {
        path: 'orderdetail/:id', // route để hiển thị chi tiết đơn hàng, :id là tham số động
        element: <OrderDetail />,
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