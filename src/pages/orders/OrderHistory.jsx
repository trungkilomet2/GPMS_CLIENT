// src/pages/Orders.jsx
import { useState, useMemo, useEffect } from 'react';
import { Search, Loader2, ChevronDown, ChevronUp, FileText, Clock3, CheckCircle2, XCircle, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import OrderService from '@/services/OrderService';
import { getAuthItem, getStoredUser } from '@/lib/authStorage';
import Pagination from '@/components/Pagination';
import { formatOrderDate } from '@/lib/orders/formatters';
import { getOrderStatusLabel, getOrderStatusStyle, normalizeOrderStatus, ORDER_STATUS_LABELS } from '@/lib/orders/status';
import OwnerLayout from '@/layouts/OwnerLayout';
import '@/styles/leave.css';
import '../../styles/homepage.css';

function SortIcon({ direction }) {
  if (!direction) return <ChevronDown size={14} className="opacity-50 inline ml-1" />;
  return direction === 'asc' ? <ChevronUp size={14} className="inline ml-1" /> : <ChevronDown size={14} className="inline ml-1" />;
}

const SURMMARY_CARD_THEMES = {
  emerald: {
    wrapper: 'border-emerald-500 ring-2 ring-emerald-100',
    iconHover: 'border-emerald-100 bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100'
  },
  sky: {
    wrapper: 'border-sky-500 ring-2 ring-sky-100',
    iconHover: 'border-sky-100 bg-sky-50 text-sky-700 group-hover:bg-sky-100'
  },
  teal: {
    wrapper: 'border-teal-500 ring-2 ring-teal-100',
    iconHover: 'border-teal-100 bg-teal-50 text-teal-700 group-hover:bg-teal-100'
  },
  rose: {
    wrapper: 'border-rose-500 ring-2 ring-rose-100',
    iconHover: 'border-rose-100 bg-rose-50 text-rose-700 group-hover:bg-rose-100'
  }
};

function SummaryCard({ label, value, icon, active, onClick, theme = 'emerald' }) {
  const Icon = icon;
  const themeStyles = SURMMARY_CARD_THEMES[theme] || SURMMARY_CARD_THEMES.emerald;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group cursor-pointer rounded-[1.75rem] border bg-white px-5 py-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
        active ? themeStyles.wrapper : 'border-slate-200'
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-500">{label}</div>
          <div className="mt-2 text-4xl font-bold leading-none text-slate-900">{value}</div>
        </div>

        <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.35rem] border transition-colors ${themeStyles.iconHover}`}>
          <Icon size={26} strokeWidth={2.1} />
        </div>
      </div>
    </button>
  );
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

  const [sortBy, setSortBy] = useState({ key: 'id', dir: 'desc' });

  const shouldFetchAll = true;

  useEffect(() => {
    let active = true;
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const buildItems = (data) =>
          data?.items ?? data?.data ?? data?.records ?? data?.Items ?? data?.Records ?? data ?? [];
        const buildCount = (data, items) => {
          const meta = data?.pagination ?? data?.paging ?? data?.meta ?? data?.metadata ?? {};
          return (
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
            items.length
          );
        };

        const allItems = [];
        let pageIndex = 0;
        let recordCount = null;
        while (true) {
          const params = {
            PageIndex: pageIndex,
            PageSize: 100,
            SortColumn: sortBy.key === 'orderName' ? 'Name' : sortBy.key,
            SortOrder: sortBy.dir.toUpperCase(),
          };
          const response = isOwner
            ? await OrderService.getAllOrders(params)
            : await OrderService.getOrdersByUser(params);
          if (!active) return;
          const data =
            response?.recordCount !== undefined ||
              response?.pageIndex !== undefined ||
              response?.RecordCount !== undefined ||
              response?.PageIndex !== undefined
              ? response
              : (response?.data ?? response);
          const items = buildItems(data);
          allItems.push(...items);
          if (recordCount == null) {
            const count = buildCount(data, items);
            recordCount = Number.isFinite(Number(count)) && Number(count) > 0 ? Number(count) : null;
          }
          if (items.length === 0) break;
          if (recordCount != null && allItems.length >= recordCount) break;
          pageIndex += 1;
        }
        setOrders(allItems);
        setTotalCount(allItems.length);
        setError(null);
      } catch (err) {
        console.error('Lỗi lấy dữ liệu:', err);
        setError('Không thể tải dữ liệu. Vui lòng thử lại!');
      } finally {
        if (active) setLoading(false);
      }
    };
    if (!isOwner && !userId) {
      setError('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
      setLoading(false);
      return;
    }
    fetchOrders();
    return () => {
      active = false;
    };
  }, [userId, isOwner, sortBy]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      return (
        (!q || String(o.id || '').includes(q) || (o.orderName || '').toLowerCase().includes(q))
        && (!statusFilter || statusFilter === normalizeOrderStatus(o.status))
      );
    });
  }, [search, statusFilter, orders]);

  const totalItems = shouldFetchAll ? filtered.length : (totalCount || filtered.length);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages || 1);
  }, [totalPages, currentPage]);

  const pageData = useMemo(() => {
    const applyPaging = shouldFetchAll;
    if (!sortBy?.key) {
      if (!applyPaging) return filtered;
      const start = (currentPage - 1) * pageSize;
      return filtered.slice(start, start + pageSize);
    }
    const dir = sortBy.dir === 'desc' ? -1 : 1;
    const parseDate = (value) => {
      if (!value) return null;
      if (value instanceof Date) return value;
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? null : d;
    };
    const safeString = (value) => String(value ?? '').trim().toLowerCase();
    const compare = (a, b) => {
      switch (sortBy.key) {
        case 'id':
        case 'quantity': {
          const av = Number(a?.[sortBy.key]);
          const bv = Number(b?.[sortBy.key]);
          const an = Number.isNaN(av) ? 0 : av;
          const bn = Number.isNaN(bv) ? 0 : bv;
          return an === bn ? 0 : an > bn ? 1 : -1;
        }
        case 'endDate': {
          const ad = parseDate(a?.endDate);
          const bd = parseDate(b?.endDate);
          if (!ad && !bd) return 0;
          if (!ad) return -1;
          if (!bd) return 1;
          return ad.getTime() === bd.getTime() ? 0 : ad.getTime() > bd.getTime() ? 1 : -1;
        }
        case 'orderName':
        case 'size':
        case 'color': {
          const av = safeString(a?.[sortBy.key]);
          const bv = safeString(b?.[sortBy.key]);
          if (!av && !bv) return 0;
          if (!av) return -1;
          if (!bv) return 1;
          return av.localeCompare(bv, 'vi');
        }
        default:
          return 0;
      }
    };
    const sorted = [...filtered].sort((a, b) => dir * compare(a, b));
    if (!applyPaging) return sorted;
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [filtered, sortBy, currentPage, pageSize, shouldFetchAll]);

  const stats = useMemo(() => {
    // Luôn tính toán dựa trên danh sách gốc (orders) thay vì danh sách đã lọc (filtered)
    // để số lượng trên các thẻ không bị biến mất khi click chọn trạng thái.
    const counts = orders.reduce(
      (acc, item) => {
        const normalized = normalizeOrderStatus(item.status);
        acc[normalized] = (acc[normalized] || 0) + 1;
        return acc;
      },
      {}
    );

    return {
      total: shouldFetchAll ? orders.length : (totalCount || orders.length),
      pending: counts['Chờ xét duyệt'] || 0,
      approved: counts['Đã chấp nhận'] || 0,
      rejected: counts['Đã từ chối'] || 0,
    };
  }, [orders, totalCount, shouldFetchAll]);

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
    <OwnerLayout>
      <div className="leave-page leave-list-page">
        <div className="leave-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{title}</h1>
              <p className="text-slate-600">{subtitle}</p>
            </div>
            {isOwner && (
              <Link
                to="/orders/manual-create"
                className="order-create-btn"
              >
                + Tạo đơn hàng thủ công
              </Link>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard theme="emerald" label="Tổng đơn" value={stats.total} icon={FileText} active={!statusFilter} onClick={() => { setStatusFilter(''); setCurrentPage(1); }} />
            <SummaryCard theme="sky" label="Chờ xét duyệt" value={stats.pending} icon={Clock3} active={statusFilter === 'Chờ xét duyệt'} onClick={() => { setStatusFilter('Chờ xét duyệt'); setCurrentPage(1); }} />
            <SummaryCard theme="teal" label="Đã chấp nhận" value={stats.approved} icon={CheckCircle2} active={statusFilter === 'Đã chấp nhận'} onClick={() => { setStatusFilter('Đã chấp nhận'); setCurrentPage(1); }} />
            <SummaryCard theme="rose" label="Đã từ chối" value={stats.rejected} icon={XCircle} active={statusFilter === 'Đã từ chối'} onClick={() => { setStatusFilter('Đã từ chối'); setCurrentPage(1); }} />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid items-end gap-3 lg:grid-cols-[1.3fr_260px_auto]">
              <label className="relative block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Tìm kiếm</span>
                <Search className="pointer-events-none absolute left-3 top-[calc(50%+0.8rem)] -translate-y-1/2 text-slate-400" size={18} />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Tìm mã đơn, tên sản phẩm..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                />
              </label>

              <label className="relative block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Trạng thái</span>
                <Filter size={16} className="pointer-events-none absolute left-3 top-[calc(50%+0.8rem)] -translate-y-1/2 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                >
                  <option value="">Tất cả trạng thái</option>
                  {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </label>

              <div className="flex items-center justify-end gap-3">
                {(search || statusFilter) && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    Xóa lọc
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="leave-table-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="leave-table-card__header">
              <div>
                <h2 className="leave-table-card__title">Danh sách đơn hàng</h2>
                <p className="leave-table-card__subtitle">Theo dõi tiến độ sản xuất và truy cập chi tiết từng đơn nhanh hơn.</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-slate-200 table-fixed">
                <thead className="leave-table-head">
                  <tr>
                    <th className="leave-table-th is-sortable cursor-pointer w-20 px-3 py-4 text-left text-xs font-semibold uppercase tracking-wide" onClick={() => toggleSort('id')}>
                      Mã đơn <SortIcon direction={sortBy.key === 'id' ? sortBy.dir : null} />
                    </th>
                    <th className="leave-table-th w-14 px-2 py-4 text-center text-xs font-semibold uppercase tracking-wide">Ảnh</th>
                    <th className="leave-table-th is-sortable cursor-pointer w-48 px-3 py-4 text-left text-xs font-semibold uppercase tracking-wide" onClick={() => toggleSort('orderName')}>
                      Sản phẩm <SortIcon direction={sortBy.key === 'orderName' ? sortBy.dir : null} />
                    </th>
                    <th className="leave-table-th is-sortable cursor-pointer w-16 px-2 py-4 text-center text-xs font-semibold uppercase tracking-wide whitespace-nowrap" onClick={() => toggleSort('size')}>
                      Kích cỡ <SortIcon direction={sortBy.key === 'size' ? sortBy.dir : null} />
                    </th>
                    <th className="leave-table-th is-sortable cursor-pointer w-20 px-2 py-4 text-left text-xs font-semibold uppercase tracking-wide" onClick={() => toggleSort('color')}>
                      Màu <SortIcon direction={sortBy.key === 'color' ? sortBy.dir : null} />
                    </th>
                    <th className="leave-table-th is-sortable cursor-pointer w-16 px-2 py-4 text-center text-xs font-semibold uppercase tracking-wide" onClick={() => toggleSort('quantity')}>
                      Số lượng <SortIcon direction={sortBy.key === 'quantity' ? sortBy.dir : null} />
                    </th>
                    <th className="leave-table-th is-sortable cursor-pointer w-28 px-2 py-4 text-center text-xs font-semibold uppercase tracking-wide" onClick={() => toggleSort('endDate')}>
                      Ngày dự kiến <SortIcon direction={sortBy.key === 'endDate' ? sortBy.dir : null} />
                    </th>
                    <th className="leave-table-th w-32 px-2 py-4 text-center text-xs font-semibold uppercase tracking-wide">Trạng thái</th>
                    <th className="leave-table-th w-24 px-2 py-4 text-right text-xs font-semibold uppercase tracking-wide">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-3 text-slate-500">
                          <Loader2 className="animate-spin text-emerald-600" size={32} />
                          <span className="text-sm">Đang tải dữ liệu...</span>
                        </div>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr><td colSpan={9} className="py-16 text-center text-rose-600">{error}</td></tr>
                  ) : pageData.length === 0 ? (
                    <tr><td colSpan={9} className="py-16 text-center text-slate-600">Không có đơn hàng phù hợp</td></tr>
                  ) : (
                    pageData.map((o) => (
                      <tr key={o.id} className="leave-table-row hover:bg-slate-50/80">
                        <td className="px-3 py-3 text-sm text-slate-600 font-medium">{o.id ? `#ĐH-${o.id}` : '-'}</td>
                        <td className="px-2 py-3 text-center">
                          {o.image ? (
                            <div className="w-10 h-10 border border-slate-200 bg-slate-50 rounded overflow-hidden flex items-center justify-center mx-auto">
                              <img src={o.image} alt="" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-900 font-medium truncate">{o.orderName || '-'}</td>
                        <td className="px-2 py-3 text-sm text-slate-700 text-center whitespace-nowrap">{o.size || '-'}</td>
                        <td className="px-2 py-3 text-sm text-slate-700 truncate">{o.color || '-'}</td>
                        <td className="px-2 py-3 text-sm text-slate-700 text-center font-medium">{o.quantity ?? '-'}</td>
                        <td className="px-2 py-3 text-sm text-slate-700 text-center whitespace-nowrap">{formatOrderDate(o.endDate)}</td>
                        <td className="px-2 py-3 text-center">
                          <span className={`inline-block rounded-full border px-3.5 py-1 text-xs font-medium ${getOrderStatusStyle(o.status)}`}>
                            {getOrderStatusLabel(o.status)}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-right whitespace-nowrap">
                          <Link to={`/orders/detail/${o.id}`} className="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50">
                            Xem chi tiết
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {!loading && !error && totalItems > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={goToPage}
              totalCount={totalItems}
              pageSize={pageSize}
            />
          )}
        </div>
      </div>
    </OwnerLayout>
  );
}
