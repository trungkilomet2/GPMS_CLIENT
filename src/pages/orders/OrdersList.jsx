// src/pages/Orders.jsx
import { useState, useMemo, useEffect } from 'react'; // Thêm useEffect
import DashboardLayout from '@/layouts/DashboardLayout';
import { Search, Plus, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'; // Thêm Loader2 để làm loading
import { Link } from 'react-router-dom';
import OrderService from '@/services/OrderService'; // Import Service đã tạo

const STATUS_LABEL = {
    pending: 'Chờ xác nhận',
    producing: 'Đang sản xuất',
    completed: 'Hoàn thành',
    delivered: 'Đã giao',
};

function SortIcon({ direction }) {
    if (!direction) return <ChevronDown size={14} className="opacity-30" />;
    return direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
}

export default function Orders() {
    // 1. Quản lý trạng thái dữ liệu từ API
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(8);
    const [sortBy, setSortBy] = useState({ key: 'id', dir: 'asc' });

    // 2. Gọi API khi component mount
    useEffect(() => {
        const fetchOrders = async () => {
            try {
                setLoading(true);
                const response = await OrderService.getAllOrders();
                // Giả sử API trả về mảng đơn hàng trực tiếp hoặc trong response.data
                setOrders(response.data || response);
                setError(null);
            } catch (err) {
                console.error("Lỗi lấy dữ liệu đơn hàng:", err);
                setError("Không thể tải danh sách đơn hàng. Vui lòng thử lại!");
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);

    // 3. Filter (Sử dụng 'orders' thay vì 'mockOrders')
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return orders.filter((o) => {
            const matchesSearch =
                !q ||
                o.id.toString().toLowerCase().includes(q) ||
                (o.product && o.product.toLowerCase().includes(q)) ||
                (o.status && STATUS_LABEL[o.status]?.toLowerCase().includes(q));
            const matchesStatus = !statusFilter || statusFilter === o.status;
            return matchesSearch && matchesStatus;
        });
    }, [search, statusFilter, orders]);

    // 4. Sort
    const sorted = useMemo(() => {
        const arr = [...filtered];
        const { key, dir } = sortBy;
        arr.sort((a, b) => {
            let va = a[key] ?? '';
            let vb = b[key] ?? '';
            if (key === 'quantity') {
                va = Number(va); vb = Number(vb);
            }
            if (key === 'expectedDate') {
                va = new Date(va); vb = new Date(vb);
            }
            if (va < vb) return dir === 'asc' ? -1 : 1;
            if (va > vb) return dir === 'asc' ? 1 : -1;
            return 0;
        });
        return arr;
    }, [filtered, sortBy]);

    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));

    // Đồng bộ lại trang hiện tại nếu vượt quá tổng số trang sau khi filter
    useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [totalPages, currentPage]);

    const pageData = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return sorted.slice(start, start + pageSize);
    }, [sorted, currentPage, pageSize]);

    const toggleSort = (key) => {
        setSortBy((prev) => ({
            key,
            dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc'
        }));
    };

    const goToPage = (p) => setCurrentPage(Math.max(1, Math.min(totalPages, p)));

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Danh sách đơn hàng</h1>
                    <p className="text-gray-600 mt-1">Quản lý danh sách và thông tin đơn hàng</p>
                </div>

                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                            placeholder="Tìm kiếm theo mã, sản phẩm..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    </div>

                    <div className="flex gap-4 items-center">
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                            className="w-48 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="">-- Chọn trạng thái --</option>
                            {Object.entries(STATUS_LABEL).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>

                        <Link
                            to="/orders/create"
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
                        >
                            <Plus size={18} /> Tạo đơn hàng mới
                        </Link>
                    </div>
                </div>

                {/* Table Section */}
                <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-100">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">#</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer" onClick={() => toggleSort('product')}>
                                    Sản phẩm <SortIcon direction={sortBy.key === 'product' ? sortBy.dir : null} />
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer" onClick={() => toggleSort('quantity')}>
                                    Số lượng <SortIcon direction={sortBy.key === 'quantity' ? sortBy.dir : null} />
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer" onClick={() => toggleSort('expectedDate')}>
                                    Ngày dự kiến <SortIcon direction={sortBy.key === 'expectedDate' ? sortBy.dir : null} />
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Trạng thái</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Hành động</th>
                            </tr>
                        </thead>

                        <tbody className="bg-white divide-y divide-gray-200 relative">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-4 py-20 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="animate-spin text-emerald-600" size={32} />
                                            <span className="text-gray-500">Đang tải dữ liệu...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan="6" className="px-4 py-8 text-center text-red-500">{error}</td>
                                </tr>
                            ) : pageData.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500">Không có đơn hàng phù hợp.</td>
                                </tr>
                            ) : (
                                pageData.map((o) => (
                                    <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 text-sm text-gray-700 font-medium">{o.id}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{o.product}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{o.quantity}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">
                                            {new Date(o.expectedDate).toLocaleDateString('vi-VN')}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium
                                                ${o.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                                                ${o.status === 'producing' ? 'bg-blue-100 text-blue-800' : ''}
                                                ${o.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                                                ${o.status === 'delivered' ? 'bg-gray-100 text-gray-800' : ''}`}
                                            >
                                                {STATUS_LABEL[o.status] || o.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right">
                                            <Link to={`/orderdetail/${o.id}`} className="text-emerald-600 hover:text-emerald-800 hover:underline font-medium">
                                                Xem chi tiết
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {!loading && !error && sorted.length > 0 && (
                    <div className="flex items-center justify-between gap-4 mt-6">
                        <div className="text-sm text-gray-600">
                            Hiển thị <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> -{' '}
                            <span className="font-medium">{Math.min(currentPage * pageSize, sorted.length)}</span> trên{' '}
                            <span className="font-medium">{sorted.length}</span> đơn hàng
                        </div>

                        <div className="flex items-center gap-2">
                            <button onClick={() => goToPage(1)} disabled={currentPage === 1} className="px-3 py-1 border rounded disabled:opacity-30">«</button>
                            <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-1 border rounded disabled:opacity-30">‹</button>

                            {/* Page Numbers Logic */}
                            {Array.from({ length: totalPages }).map((_, i) => {
                                const p = i + 1;
                                if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1) {
                                    return (
                                        <button
                                            key={p}
                                            onClick={() => goToPage(p)}
                                            className={`px-3 py-1 rounded ${p === currentPage ? 'bg-emerald-600 text-white' : 'border hover:bg-gray-100'}`}
                                        >
                                            {p}
                                        </button>
                                    );
                                }
                                if (p === currentPage - 2 || p === currentPage + 2) return <span key={p}>...</span>;
                                return null;
                            })}

                            <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="px-3 py-1 border rounded disabled:opacity-30">›</button>
                            <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} className="px-3 py-1 border rounded disabled:opacity-30">»</button>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}