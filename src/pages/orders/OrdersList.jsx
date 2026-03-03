// src/pages/Orders.jsx
import { useState, useMemo } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Search, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';


const mockOrders = [
    { id: 'DH001', status: 'pending', product: 'Áo sơ mi nam', quantity: 50, expectedDate: '15/03/2024' },
    { id: 'DH002', status: 'producing', product: 'Váy công sở', quantity: 30, expectedDate: '20/03/2024' },
    { id: 'DH003', status: 'completed', product: 'Quần jean', quantity: 100, expectedDate: '10/03/2024' },
    { id: 'DH004', status: 'delivered', product: 'Áo thun nữ', quantity: 200, expectedDate: '05/03/2024' },
    { id: 'DH005', status: 'pending', product: 'Áo khoác', quantity: 20, expectedDate: '22/03/2024' },
    { id: 'DH006', status: 'producing', product: 'Đầm dạ hội', quantity: 10, expectedDate: '25/03/2024' },
    { id: 'DH007', status: 'completed', product: 'Quần short', quantity: 60, expectedDate: '12/03/2024' },
    { id: 'DH008', status: 'delivered', product: 'Áo len', quantity: 80, expectedDate: '02/03/2024' },
    { id: 'DH009', status: 'completed', product: 'Quần đùi hè', quantity: 200, expectedDate: '02/03/2024' },
    { id: 'DH010', status: 'pending', product: 'Áo dạ', quantity: 100, expectedDate: '02/03/2024' },
    { id: 'DH011', status: 'delivered', product: 'Mũ len', quantity: 100, expectedDate: '02/03/2024' },
    // Thêm mock nếu cần để kiểm tra phân trang
];

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
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(8); // Mặc định 10, không có selector
    const [sortBy, setSortBy] = useState({ key: 'id', dir: 'asc' });

    // Filter
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return mockOrders.filter((o) => {
            const matchesSearch =
                !q ||
                o.id.toLowerCase().includes(q) ||
                o.product.toLowerCase().includes(q) ||
                STATUS_LABEL[o.status].toLowerCase().includes(q);
            const matchesStatus = !statusFilter || statusFilter === o.status;
            return matchesSearch && matchesStatus;
        });
    }, [search, statusFilter]);

    // Sort
    const sorted = useMemo(() => {
        const arr = [...filtered];
        const { key, dir } = sortBy;
        arr.sort((a, b) => {
            let va = a[key];
            let vb = b[key];
            if (key === 'quantity') {
                va = Number(va); vb = Number(vb);
            }
            if (key === 'expectedDate') {
                const parse = (s) => {
                    const [d, m, y] = s.split('/').map(Number);
                    return new Date(y, m - 1, d);
                };
                va = parse(va); vb = parse(vb);
            }
            if (va < vb) return dir === 'asc' ? -1 : 1;
            if (va > vb) return dir === 'asc' ? 1 : -1;
            return 0;
        });
        return arr;
    }, [filtered, sortBy]);

    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
    if (currentPage > totalPages) setCurrentPage(totalPages);

    const pageData = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return sorted.slice(start, start + pageSize);
    }, [sorted, currentPage, pageSize]);

    const toggleSort = (key) => {
        setSortBy((prev) => {
            if (prev.key === key) {
                return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
            }
            return { key, dir: 'asc' };
        });
    };

    const goToPage = (p) => setCurrentPage(Math.max(1, Math.min(totalPages, p)));

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Danh sách đơn hàng</h1>
                    <p className="text-gray-600 mt-1">Quản lý danh sách và thông tin đơn hàng</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                            placeholder="Tìm kiếm theo mã, sản phẩm, trạng thái..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    </div>

                    <div className="flex gap-4 items-center">
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                            className="w-48 px-4 py-2 border border-gray-300 rounded-lg"
                        >
                            <option value="">-- Chọn trạng thái --</option>
                            <option value="pending">Chờ xác nhận</option>
                            <option value="producing">Đang sản xuất</option>
                            <option value="delivered">Đã giao</option>
                            <option value="completed">Hoàn thành</option>
                        </select>

                        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
                            <Plus size={16} /> Tạo đơn hàng mới
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto bg-white rounded-lg shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">#</th>
                                <th
                                    className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer"
                                    onClick={() => toggleSort('product')}
                                >
                                    Sản phẩm <SortIcon direction={sortBy.key === 'product' ? sortBy.dir : null} />
                                </th>
                                <th
                                    className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer"
                                    onClick={() => toggleSort('quantity')}
                                >
                                    Số lượng <SortIcon direction={sortBy.key === 'quantity' ? sortBy.dir : null} />
                                </th>
                                <th
                                    className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer"
                                    onClick={() => toggleSort('expectedDate')}
                                >
                                    Ngày dự kiến <SortIcon direction={sortBy.key === 'expectedDate' ? sortBy.dir : null} />
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Trạng thái</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Hành động</th>
                            </tr>
                        </thead>

                        <tbody className="bg-white divide-y divide-gray-200">
                            {pageData.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500">Không có đơn hàng phù hợp.</td>
                                </tr>
                            ) : (
                                pageData.map((o) => (
                                    <tr key={o.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-700 font-medium">{o.id}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{o.product}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{o.quantity}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{o.expectedDate}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <span
                                                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium
                          ${o.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                          ${o.status === 'producing' ? 'bg-blue-100 text-blue-800' : ''}
                          ${o.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                          ${o.status === 'delivered' ? 'bg-gray-100 text-gray-800' : ''}`}
                                            >
                                                {STATUS_LABEL[o.status]}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right">
                                            <Link
                                                to={`/orderdetail/${o.id}`}
                                                className="text-emerald-600 hover:underline mr-3"
                                            >
                                                Xem chi tiết
                                            </Link>
                                        </td>

                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between gap-4 mt-6">
                    <div className="text-sm text-gray-600">
                        Hiển thị <span className="font-medium">{sorted.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> -{' '}
                        <span className="font-medium">{Math.min(currentPage * pageSize, sorted.length)}</span> trên{' '}
                        <span className="font-medium">{sorted.length}</span> đơn hàng
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => goToPage(1)}
                            disabled={currentPage === 1}
                            className={`px-3 py-1 border rounded ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
                        >
                            «
                        </button>
                        <button
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className={`px-3 py-1 border rounded ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
                        >
                            ‹
                        </button>

                        {Array.from({ length: totalPages }).map((_, i) => {
                            const p = i + 1;
                            const show = p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1;
                            if (!show) {
                                const prev = i > 0 && (i === currentPage - 2 || i === currentPage + 2);
                                return prev ? <span key={p} className="px-2">…</span> : null;
                            }
                            return (
                                <button
                                    key={p}
                                    onClick={() => goToPage(p)}
                                    className={`px-3 py-1 rounded ${p === currentPage ? 'bg-emerald-600 text-white' : 'border hover:bg-gray-100'}`}
                                    aria-current={p === currentPage ? 'page' : undefined}
                                >
                                    {p}
                                </button>
                            );
                        })}

                        <button
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className={`px-3 py-1 border rounded ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
                        >
                            ›
                        </button>
                        <button
                            onClick={() => goToPage(totalPages)}
                            disabled={currentPage === totalPages}
                            className={`px-3 py-1 border rounded ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
                        >
                            »
                        </button>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}