import OrdersList from '@/pages/orders/OrderHistory';

export default function OwnerOrdersList() {
    return (
        <OrdersList
            forceOwner
            title="Danh sách đơn hàng"
            subtitle="Quản lý toàn bộ đơn hàng trong hệ thống."
        />
    );
}
