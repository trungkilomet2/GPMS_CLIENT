// src/pages/Orders.jsx
import { useState, useMemo, useEffect } from 'react';
import { Search, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import OrderService from '@/services/OrderService';
import { getAuthItem, getStoredUser } from '@/lib/authStorage';
import Pagination from '@/components/Pagination';
import { formatOrderDate } from '@/lib/orders/formatters';
import { getOrderStatusLabel, getOrderStatusStyle, ORDER_STATUS_LABELS } from '@/lib/orders/status';
import MainLayout from '../../layouts/MainLayout';
import '../../styles/homepage.css';

function SortIcon({ direction }) {
    if (!direction) return <ChevronDown size={14} className="opacity-50 inline ml-1" />;
    return direction === 'asc' ? <ChevronUp size={14} className="inline ml-1" /> : <ChevronDown size={14} className="inline ml-1" />;
}

export default function Orders({
    forceOwner = false,
    title = 'Lịch sử đặt hàng',
    subtitle = 'Theo dõi tiến độ sản xuất và truy cập chi tiết từng đơn nhanh hơn.',
}) {
    const user = getStoredUser();
    const tokenUserId = getAuthItem('userId');
    const userId = tokenUserId ?? user?.userId ?? user?.id ?? null;
    const role = String(user?.role ?? '').toLowerCase();
    const isOwner = forceOwner || role === 'owner';
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
            try {
                setLoading(true);
                const params = {
                    PageIndex: Math.max(0, currentPage - 1),
                    PageSize: pageSize,
                    SortColumn: sortBy.key === 'orderName' ? 'Name' : sortBy.key,
                    SortOrder: sortBy.dir.toUpperCase(),
                };
                const response = isOwner
                    ? await OrderService.getAllOrders(params)
                    : await OrderService.getOrdersByUser(params);
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
        if (!isOwner && !userId) {
            setError('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
            setLoading(false);
            return;
        }
        fetchOrders();
    }, [userId, isOwner, currentPage, pageSize, sortBy]);

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
        const inProgress = filtered.filter((o) => ['Chờ xét duyệt', 'Cần cập nhật'].includes(o.status)).length;
        const done = filtered.filter((o) => ['Chấp nhận', 'Từ chối'].includes(o.status)).length;

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

    return (
        <MainLayout>
            <div className="min-h-screen bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 space-y-6">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{title}</h1>
                        <p className="text-slate-600">{subtitle}</p>
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
                                {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
                                    <option key={k} value={k}>{v}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-275 w-full divide-y divide-slate-200 table-auto">
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
                                                <td className="px-4 py-3 text-sm text-slate-700 text-center">{formatOrderDate(o.endDate)}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`inline-block px-3.5 py-1 rounded-full text-xs font-medium border ${getOrderStatusStyle(o.status)}`}>
                                                        {getOrderStatusLabel(o.status)}
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
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={goToPage}
                            totalCount={totalCount || filtered.length}
                            pageSize={pageSize}
                        />
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
