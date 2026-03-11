// src/pages/Orders.jsx
import { useState, useMemo, useEffect } from 'react';
import { Search, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import OrderService from '@/services/OrderService';
import MainLayout from '../../layouts/MainLayout';
import '../../styles/homepage.css';

const STATUS_LABEL = {
    pending: 'Chờ xác nhận',
    producing: 'Đang sản xuất',
    completed: 'Hoàn thành',
    delivered: 'Đã giao',
    Process: 'Đang xử lý',
    'Chờ Xét Duyệt': 'Chờ xét duyệt',
    'Yêu Cầu Chỉnh Sửa': 'Yêu cầu chỉnh sửa',
};

const STATUS_COLOR = {
    pending: 'bg-blue-50 text-blue-700 border-blue-200',
    producing: 'bg-amber-50 text-amber-700 border-amber-200',
    Process: 'bg-amber-50 text-amber-700 border-amber-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    delivered: 'bg-gray-100 text-gray-700 border-gray-200',
    'Chờ Xét Duyệt': 'bg-orange-50 text-orange-700 border-orange-200',
    'Yêu Cầu Chỉnh Sửa': 'bg-red-50 text-red-700 border-red-200',
    default: 'bg-gray-50 text-gray-700 border-gray-200',
};

function SortIcon({ direction }) {
    if (!direction) return <ChevronDown size={14} className="opacity-50 inline ml-1" />;
    return direction === 'asc' ? <ChevronUp size={14} className="inline ml-1" /> : <ChevronDown size={14} className="inline ml-1" />;
}

export default function Orders() {
    const getUserId = () => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            return user.userId ?? user.id ?? null;
        }
        return null;
    };

    const userId = getUserId();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);

    const [sortBy, setSortBy] = useState({ key: 'id', dir: 'asc' });

    useEffect(() => {
        const fetchOrders = async () => {
            if (!userId) {
                setError('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const params = {
                    PageIndex: Math.max(0, currentPage - 1),
                    PageSize: pageSize,
                    SortColumn: sortBy.key === 'orderName' ? 'Name' : sortBy.key,
                    SortOrder: sortBy.dir.toUpperCase(),
                };
                const response = await OrderService.getOrdersByUser(userId, params);
                const data =
                    response?.recordCount !== undefined ||
                    response?.pageIndex !== undefined ||
                    response?.RecordCount !== undefined ||
                    response?.PageIndex !== undefined
                        ? response
                        : (response?.data ?? response);
                const items = data?.items ?? data?.data ?? data?.records ?? data?.Items ?? data?.Records ?? data ?? [];
                const meta = data?.pagination ?? data?.paging ?? data?.meta ?? data?.metadata ?? {};
                const count =
                    data?.totalCount ??
                    data?.TotalCount ??
                    data?.totalRecords ??
                    data?.TotalRecords ??
                    data?.recordCount ??
                    data?.RecordCount ??
                    data?.total ??
                    data?.Total ??
                    meta?.totalCount ??
                    meta?.TotalCount ??
                    meta?.totalRecords ??
                    meta?.TotalRecords ??
                    meta?.total ??
                    meta?.Total ??
                    (data?.totalPages && data?.pageSize ? data.totalPages * data.pageSize : null) ??
                    (meta?.totalPages && meta?.pageSize ? meta.totalPages * meta.pageSize : null) ??
                    items.length;
                setOrders(items);
                setTotalCount(count);
                if (data?.pageIndex !== undefined && data?.pageIndex !== null) {
                    const serverPage = Number(data.pageIndex) + 1;
                    if (!Number.isNaN(serverPage) && serverPage !== currentPage) {
                        setCurrentPage(serverPage);
                    }
                }
                setError(null);
            } catch (err) {
                console.error('Lỗi lấy dữ liệu:', err);
                setError('Không thể tải dữ liệu. Vui lòng thử lại!');
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, [userId, currentPage, pageSize, sortBy]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return orders.filter((o) => {
            return (
                (!q || String(o.id || '').includes(q) || (o.orderName || '').toLowerCase().includes(q))
                && (!statusFilter || statusFilter === o.status)
            );
        });
    }, [search, statusFilter, orders]);

    const totalPages = Math.max(1, Math.ceil((totalCount || filtered.length) / pageSize));

    useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(totalPages || 1);
    }, [totalPages, currentPage]);

    const pageData = useMemo(() => filtered, [filtered]);

    const stats = useMemo(() => {
        const inProgress = filtered.filter((o) => ['pending', 'producing', 'Process', 'Chờ Xét Duyệt', 'Yêu Cầu Chỉnh Sửa'].includes(o.status)).length;
        const done = filtered.filter((o) => ['completed', 'delivered'].includes(o.status)).length;

        return {
            total: totalCount || orders.length,
            showing: filtered.length,
            inProgress,
            done,
        };
    }, [orders, filtered.length, totalCount]);

    const toggleSort = (key) => {
        setSortBy((prev) => ({
            key,
            dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc',
        }));
        setCurrentPage(1);
    };

    const goToPage = (p) => setCurrentPage(Math.max(1, Math.min(totalPages, p)));

    const resetFilters = () => {
        setSearch('');
        setStatusFilter('');
        setCurrentPage(1);
    };

    const formatDate = (value) => {
        if (!value) return '-';
        return new Date(value).toLocaleDateString('vi-VN');
    };

    return (
        <MainLayout>
            <div className="min-h-screen bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 space-y-6">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Danh sách đơn hàng</h1>
                        <p className="text-slate-600">Theo dõi tiến độ sản xuất và truy cập chi tiết từng đơn nhanh hơn.</p>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_260px_auto] gap-3">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    placeholder="Tìm mã đơn, tên sản phẩm..."
                                    className="w-full pl-11 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                            </div>
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full py-2.5 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            >
                                <option value="">Tất cả trạng thái</option>
                                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                                    <option key={k} value={k}>{v}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 table-fixed">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="w-20 px-5 py-3 text-left text-sm font-semibold text-slate-700 cursor-pointer" onClick={() => toggleSort('id')}>
                                            Mã đơn <SortIcon direction={sortBy.key === 'id' ? sortBy.dir : null} />
                                        </th>
                                        <th className="w-20 px-4 py-3 text-center text-sm font-semibold text-slate-700">Ảnh</th>
                                        <th className="w-64 px-4 py-3 text-left text-sm font-semibold text-slate-700 cursor-pointer" onClick={() => toggleSort('orderName')}>
                                            Sản phẩm <SortIcon direction={sortBy.key === 'orderName' ? sortBy.dir : null} />
                                        </th>
                                        <th className="w-24 px-3 py-3 text-center text-sm font-semibold text-slate-700 cursor-pointer" onClick={() => toggleSort('size')}>
                                            Kích cỡ <SortIcon direction={sortBy.key === 'size' ? sortBy.dir : null} />
                                        </th>
                                        <th className="w-28 px-3 py-3 text-left text-sm font-semibold text-slate-700 cursor-pointer" onClick={() => toggleSort('color')}>
                                            Màu <SortIcon direction={sortBy.key === 'color' ? sortBy.dir : null} />
                                        </th>
                                        <th className="w-20 px-3 py-3 text-center text-sm font-semibold text-slate-700 cursor-pointer" onClick={() => toggleSort('quantity')}>
                                            Số lượng <SortIcon direction={sortBy.key === 'quantity' ? sortBy.dir : null} />
                                        </th>
                                        <th className="w-36 px-4 py-3 text-center text-sm font-semibold text-slate-700 cursor-pointer" onClick={() => toggleSort('endDate')}>
                                            Ngày dự kiến <SortIcon direction={sortBy.key === 'endDate' ? sortBy.dir : null} />
                                        </th>
                                        <th className="w-44 px-4 py-3 text-center text-sm font-semibold text-slate-700">Trạng thái</th>
                                        <th className="w-32 px-4 py-3 text-right text-sm font-semibold text-slate-700">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={9} className="py-24 text-center">
                                                <div className="flex flex-col items-center gap-4">
                                                    <Loader2 className="animate-spin text-emerald-600" size={48} />
                                                    <span className="text-slate-600">Đang tải dữ liệu...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : error ? (
                                        <tr><td colSpan={9} className="py-16 text-center text-red-600">{error}</td></tr>
                                    ) : pageData.length === 0 ? (
                                        <tr><td colSpan={9} className="py-16 text-center text-slate-600">Không có đơn hàng phù hợp</td></tr>
                                    ) : (
                                        pageData.map((o) => (
                                            <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 text-sm text-slate-600 font-medium">{o.id ? `#ĐH-${o.id}` : '-'}</td>
                                                <td className="px-4 py-3 text-center">
                                                    {o.image ? (
                                                        <div className="w-12 h-12 border border-slate-200 bg-slate-50 rounded overflow-hidden flex items-center justify-center mx-auto">
                                                            <img src={o.image} alt="" className="w-full h-full object-cover" />
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400">-</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-900 font-medium truncate">{o.orderName || '-'}</td>
                                                <td className="px-3 py-3 text-sm text-slate-700 text-center">{o.size || '-'}</td>
                                                <td className="px-3 py-3 text-sm text-slate-700">{o.color || '-'}</td>
                                                <td className="px-3 py-3 text-sm text-slate-700 text-center font-medium">{o.quantity ?? '-'}</td>
                                                <td className="px-4 py-3 text-sm text-slate-700 text-center">{formatDate(o.endDate)}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`inline-block px-3.5 py-1 rounded-full text-xs font-medium border ${STATUS_COLOR[o.status] || STATUS_COLOR.default}`}>
                                                        {STATUS_LABEL[o.status] || o.status || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Link to={`/orders/detail/${o.id}`} className="text-emerald-600 hover:text-emerald-800 text-sm font-medium">
                                                        Chi tiết →
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {!loading && !error && (totalCount || filtered.length) > 0 && (
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-slate-600">
                            <div>
                                Hiển thị {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalCount || filtered.length)} / {totalCount || filtered.length}
                            </div>
                            <div className="flex gap-2 flex-wrap justify-center">
                                <button onClick={() => goToPage(1)} disabled={currentPage === 1} className="px-3 py-2 border rounded-lg disabled:opacity-40 hover:bg-slate-50 transition">Đầu</button>
                                <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-2 border rounded-lg disabled:opacity-40 hover:bg-slate-50 transition">Trước</button>

                                {Array.from({ length: totalPages }).map((_, i) => {
                                    const p = i + 1;
                                    if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2) {
                                        return (
                                            <button
                                                key={p}
                                                onClick={() => goToPage(p)}
                                                className={`px-3 py-2 min-w-10 rounded-lg border ${p === currentPage ? 'bg-emerald-600 text-white border-emerald-600' : 'hover:bg-slate-50'}`}
                                            >
                                                {p}
                                            </button>
                                        );
                                    }
                                    if (Math.abs(p - currentPage) === 3) return <span key={p}>...</span>;
                                    return null;
                                })}

                                <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="px-3 py-2 border rounded-lg disabled:opacity-40 hover:bg-slate-50 transition">Sau</button>
                                <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} className="px-3 py-2 border rounded-lg disabled:opacity-40 hover:bg-slate-50 transition">Cuối</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
