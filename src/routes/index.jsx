// src/routes/index.js
import { lazy } from 'react';
import OrderDetail from '../pages/orders/OrderDetail';
import CreateOrder from '../pages/orders/CreateOrder';
import { Edit } from 'lucide-react';
import EditOrder from '../pages/orders/EditOrder';

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
    {
        path: '/orders/create', // route để tạo đơn hàng mới, :id có thể là id của đơn hàng mẫu hoặc null nếu tạo mới hoàn toàn
        element: <CreateOrder />,
    },
    {
        path: '/orders/edit/:id', // route để chỉnh sửa đơn hàng, :id là id của đơn hàng cần chỉnh sửa
        element: <EditOrder />,
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