import { createElement, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { 
  ArrowRight, 
  BriefcaseBusiness, 
  ClipboardList, 
  ContactRound, 
  Users, 
  DollarSign, 
  ShoppingBag, 
  TrendingUp,
  Filter,
  Calendar,
  Loader2,
  ChevronDown,
  BarChart3,
  LineChart as LineChartIcon,
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import DashboardLayout from "@/layouts/DashboardLayout";
import { getStoredUser } from "@/lib/authStorage";
import { getPrimaryWorkspaceRole, splitRoles } from "@/lib/internalRoleFlow";
import { getSystemRoleLabel } from "@/lib/orgHierarchy";
import OrderService from "@/services/OrderService";
import CustomerService from "@/services/CustomerService";
import ProductionService from "@/services/ProductionService";
import ProductionPartService from "@/services/ProductionPartService";
import { fetchAggregatedPayroll } from "@/utils/payrollUtils";
import { toast } from "react-toastify";
import "@/styles/internal-dashboard.css";
import "@/styles/leave.css";

const QUICK_LINKS = [
  {
    to: "/customers",
    title: "Quản lý khách hàng",
    description: "Xem danh sách khách hàng và đơn hàng của từng khách trong một màn hình.",
    icon: ContactRound,
  },
  {
    to: "/production-plan",
    title: "Kế hoạch sản xuất",
    description: "Theo dõi và quản lý tiến độ các kế hoạch sản xuất trong xưởng.",
    icon: BriefcaseBusiness,
  },
  {
    to: "/leave",
    title: "Quản lý nghỉ phép",
    description: "Kiểm tra tình trạng nghỉ phép và xử lý đơn nhanh.",
    icon: ClipboardList,
  },
];

export default function InternalDashboard() {
  const user = getStoredUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const roles = splitRoles(user.role);
  const primaryRole = getPrimaryWorkspaceRole(roles);
  const isAdmin = primaryRole === "admin";
  const isInternalUser = primaryRole === "owner" || primaryRole === "pm";
  const isOwner = primaryRole === "owner";

  if (isAdmin) {
    return <Navigate to="/admin/users" replace />;
  }

  if (!isInternalUser) {
    return <Navigate to="/home" replace />;
  }

  // --- DASHBOARD STATS STATE ---
  const [filterType, setFilterType] = useState("month"); // month, quarter, year, custom
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [customRange, setCustomRange] = useState({ 
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const [dashboardData, setDashboardData] = useState({
    stats: { totalCustomers: 0, totalOrders: 0, totalRevenue: 0, totalPayroll: 0 },
    chartData: []
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const fetchStats = async () => {
    if (isLoadingStats && dashboardData.chartData.length > 0) return;
    setIsLoadingStats(true);
    try {
      const custRes = await CustomerService.getAllCustomers({ PageSize: 100 });
      const customers = custRes?.data || [];
      const orderRes = await OrderService.getAllOrders({ PageSize: 100 });
      const allOrders = orderRes?.data?.data || orderRes?.data || [];

      const filteredOrders = allOrders.filter(order => {
        const d = new Date(order.startDate || order.createDate || order.orderDate);
        if (filterType === "month") return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
        if (filterType === "quarter") {
          const q = Math.floor(d.getMonth() / 3) + 1;
          const targetQ = Math.floor((selectedMonth - 1) / 3) + 1;
          return q === targetQ && d.getFullYear() === selectedYear;
        }
        if (filterType === "year") return d.getFullYear() === selectedYear;
        return true;
      });

      const revenue = filteredOrders.reduce((sum, o) => sum + (Number(o.quantity || 0) * Number(o.cpu || 0)), 0);

      let payrollTotal = 0;
      try {
        let allProds = [];
        let pIdx = 0;
        let hasMoreProds = true;
        while (hasMoreProds && pIdx < 20) {
          const prodRes = await ProductionService.getProductionList({ PageIndex: pIdx, PageSize: 30 });
          const pageData = prodRes?.data?.data || prodRes?.data?.items || (Array.isArray(prodRes?.data) ? prodRes.data : []);
          if (Array.isArray(pageData) && pageData.length > 0) {
            allProds = [...allProds, ...pageData];
            hasMoreProds = pageData.length === 30;
            pIdx++;
          } else hasMoreProds = false;
        }
        
        const relevantProds = allProds.filter(p => {
          const sStr = p.startDate || p.pStartDate || p.createDate;
          const eStr = p.endDate || p.pEndDate;
          if (!sStr) return false;
          const start = new Date(sStr);
          const end = eStr ? new Date(eStr) : start;
          if (isNaN(start.getTime())) return false;
          const sM = start.getMonth() + 1;
          const sY = start.getFullYear();
          const eM = end.getMonth() + 1;
          const eY = end.getFullYear();
          if (filterType === "month") return (sM === selectedMonth && sY === selectedYear) || (eM === selectedMonth && eY === selectedYear);
          if (filterType === "quarter") {
            const cQ = Math.floor((selectedMonth - 1) / 3) + 1;
            return (Math.floor((sM - 1) / 3) + 1 === cQ && sY === selectedYear) || (Math.floor((eM - 1) / 3) + 1 === cQ && eY === selectedYear);
          }
          if (filterType === "year") return sY === selectedYear || eY === selectedYear;
          return true;
        });

        if (relevantProds.length > 0) {
          const partsResponses = await Promise.all(relevantProds.map(p => ProductionPartService.getPartsByProduction(p.productionId || p.id, { PageSize: 100 })));
          partsResponses.forEach(res => {
            const parts = res?.data?.data || res?.data?.items || (Array.isArray(res?.data) ? res.data : []);
            if (Array.isArray(parts)) parts.forEach(part => {
              payrollTotal += (Number(part.totalQuantity || part.quantity || 0) * Number(part.unitPrice || part.cpu || 0));
            });
          });
        }
      } catch (e) { console.error(e); }

      let trend = [];
      if (filterType === "month") {
        for (let i = 0; i < 4; i++) {
          const startDay = i * 7 + 1;
          const endDay = i === 3 ? 31 : (i + 1) * 7;
          const wOrders = filteredOrders.filter(o => {
            const d = new Date(o.startDate || o.createDate || o.orderDate).getDate();
            return d >= startDay && d <= endDay;
          });
          trend.push({ name: `Tuần ${i + 1}`, revenue: wOrders.reduce((sum, o) => sum + (Number(o.quantity || 0) * Number(o.cpu || 0)), 0), orderCount: wOrders.length });
        }
      } else if (filterType === "quarter") {
        const currentQ = Math.floor((selectedMonth - 1) / 3) + 1;
        [0, 1, 2].forEach(offset => {
          const m = (currentQ - 1) * 3 + 1 + offset;
          const mOrders = allOrders.filter(o => {
            const d = new Date(o.startDate || o.createDate || o.orderDate);
            return d.getMonth() + 1 === m && d.getFullYear() === selectedYear;
          });
          trend.push({ name: `Tháng ${m}`, revenue: mOrders.reduce((sum, o) => sum + (Number(o.quantity || 0) * Number(o.cpu || 0)), 0), orderCount: mOrders.length });
        });
      } else if (filterType === "year") {
        for (let i = 1; i <= 12; i++) {
          const mOrders = allOrders.filter(o => {
            const d = new Date(o.startDate || o.createDate || o.orderDate);
            return d.getMonth() + 1 === i && d.getFullYear() === selectedYear;
          });
          trend.push({ name: `Tháng ${i}`, revenue: mOrders.reduce((sum, o) => sum + (Number(o.quantity || 0) * Number(o.cpu || 0)), 0), orderCount: mOrders.length });
        }
      } else {
        for (let i = 0; i < 4; i++) trend.push({ name: `Tuần ${i+1}`, revenue: 0, orderCount: 0 });
      }

      setDashboardData({
        stats: { totalCustomers: customers.length, totalOrders: filteredOrders.length, totalRevenue: revenue, totalPayroll: payrollTotal },
        chartData: trend
      });
    } catch (err) { console.error(err); }
    finally { setIsLoadingStats(false); }
  };

  useEffect(() => {
    if (isInternalUser) {
      fetchStats();
    }
  }, [filterType, selectedMonth, selectedYear, customRange.start, customRange.end]);

  const quickLinks = isOwner
    ? [
        {
          to: "/employees",
          title: "Danh sách nhân viên",
          description: "Tách riêng khu quản lý, nhân viên và danh mục chuyên môn thợ.",
          icon: Users,
        },
        ...QUICK_LINKS,
      ]
    : QUICK_LINKS;
  const roleLabels = roles.map((role) => getSystemRoleLabel(role));

  return (
    <DashboardLayout>
      <div className="internal-dashboard-page">
        <div className="internal-dashboard-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <section className="internal-dashboard-hero">
            <div>
              <p className="internal-dashboard-hero__eyebrow">Khu vực nội bộ</p>
              <h1 className="internal-dashboard-hero__title">Bảng điều khiển quản trị</h1>
              <p className="internal-dashboard-hero__subtitle">
                Truy cập nhanh các chức năng quản lý dành cho {isOwner ? "chủ xưởng" : "quản lý sản xuất"}.
              </p>
            </div>

            <div className="internal-dashboard-hero__account">
              <div className="internal-dashboard-hero__label">Tài khoản hiện tại</div>
              <div className="internal-dashboard-hero__name">{user.fullName || user.name || user.userName}</div>
              <div className="internal-dashboard-hero__role">
                {roles
                  .map((r) => {
                    const lowered = r.toLowerCase();
                    if (lowered === "owner") return "Chủ xưởng";
                    if (lowered === "pm") return "Quản lý sản xuất";
                    if (lowered === "admin") return "Quản trị viên";
                    if (lowered === "worker") return "Nhân viên";
                    return r;
                  })
                  .join(", ") || "Người dùng nội bộ"}
              </div>
            </div>
          </section>
 
          {/* STATISTICS SECTION */}
          <section className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-900 rounded-2xl text-white shadow-lg shadow-slate-100">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Thống kê hoạt động</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Dữ liệu kinh doanh và vận hành</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 rounded-[1.25rem] border border-slate-200/50">
                <div className="flex items-center gap-2 mr-2 ml-2">
                  <Filter size={14} className="text-slate-400" />
                  <select 
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-600 outline-none cursor-pointer"
                  >
                    <option value="week">Theo tuần</option>
                    <option value="month">Theo tháng</option>
                    <option value="quarter">Theo quý</option>
                    <option value="year">Theo năm</option>
                    <option value="custom">Tùy chọn</option>
                  </select>
                </div>

                <div className="h-4 w-px bg-slate-200 mx-1" />

                {filterType !== "custom" && (
                  <div className="flex items-center gap-2 px-2">
                    {filterType !== "year" && (
                      <select 
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="bg-transparent text-xs font-bold text-slate-900 outline-none cursor-pointer"
                      >
                        {Array.from({length: 12}, (_, i) => (
                          <option key={i+1} value={i+1}>Tháng {i+1}</option>
                        ))}
                      </select>
                    )}
                    <select 
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="bg-transparent text-xs font-bold text-slate-900 outline-none cursor-pointer"
                    >
                      {[2024, 2025, 2026].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                )}

                {filterType === "custom" && (
                  <div className="flex items-center gap-2 px-2">
                    <input 
                      type="date" 
                      value={customRange.start}
                      onChange={(e) => setCustomRange({...customRange, start: e.target.value})}
                      className="bg-transparent text-[10px] font-bold text-slate-900 outline-none border-b border-slate-200"
                    />
                    <span className="text-[10px] font-bold text-slate-400">→</span>
                    <input 
                      type="date" 
                      value={customRange.end}
                      onChange={(e) => setCustomRange({...customRange, end: e.target.value})}
                      className="bg-transparent text-[10px] font-bold text-slate-900 outline-none border-b border-slate-200"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* CARD: TOTAL CUSTOMERS */}
              <div className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 transition-all hover:shadow-xl hover:shadow-slate-100 hover:-translate-y-1">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform">
                    <ContactRound size={28} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tổng khách hàng</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      {isLoadingStats ? (
                        <div className="h-8 w-16 bg-slate-100 animate-pulse rounded" />
                      ) : (
                        <>
                          <span className="text-3xl font-black text-slate-900">{dashboardData.stats.totalCustomers}</span>
                          <span className="text-[10px] font-bold text-blue-500">Khách</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="absolute -right-4 -bottom-4 h-24 w-24 bg-blue-50/30 rounded-full blur-2xl group-hover:bg-blue-100/50 transition-colors" />
              </div>

              {/* CARD: TOTAL ORDERS */}
              <div className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 transition-all hover:shadow-xl hover:shadow-slate-100 hover:-translate-y-1">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform">
                    <ShoppingBag size={28} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Đơn đặt hàng</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      {isLoadingStats ? (
                        <div className="h-8 w-16 bg-slate-100 animate-pulse rounded" />
                      ) : (
                        <>
                          <span className="text-3xl font-black text-slate-900">{dashboardData.stats.totalOrders}</span>
                          <span className="text-[10px] font-bold text-amber-500">Đơn</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="absolute -right-4 -bottom-4 h-24 w-24 bg-amber-50/30 rounded-full blur-2xl group-hover:bg-amber-100/50 transition-colors" />
              </div>

              {/* CARD: TOTAL REVENUE */}
              <div className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 transition-all hover:shadow-xl hover:shadow-slate-100 hover:-translate-y-1">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
                    <DollarSign size={28} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Doanh thu dự kiến</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      {isLoadingStats ? (
                        <div className="h-8 w-32 bg-slate-100 animate-pulse rounded" />
                      ) : (
                        <>
                          <span className="text-xl font-black text-slate-900 leading-none">
                            {dashboardData.stats.totalRevenue.toLocaleString("vi-VN")}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-500 uppercase">VND</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="absolute -right-4 -bottom-4 h-24 w-24 bg-emerald-50/30 rounded-full blur-2xl group-hover:bg-emerald-100/50 transition-colors" />
              </div>

              {/* CARD: TOTAL PAYROLL */}
              <div className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 transition-all hover:shadow-xl hover:shadow-slate-100 hover:-translate-y-1">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 group-hover:scale-110 transition-transform">
                    <Users size={28} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chi trả nhân viên</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      {isLoadingStats ? (
                        <div className="h-8 w-32 bg-slate-100 animate-pulse rounded" />
                      ) : (
                        <>
                          <span className="text-xl font-black text-slate-900 leading-none">
                            {dashboardData.stats.totalPayroll.toLocaleString("vi-VN")}
                          </span>
                          <span className="text-[10px] font-bold text-rose-500 uppercase">VND</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="absolute -right-4 -bottom-4 h-24 w-24 bg-rose-50/30 rounded-full blur-2xl group-hover:bg-rose-100/50 transition-colors" />
              </div>
            </div>

            {/* CHARTS GRID - Rebalanced 2x2 Layout */}
            {/* CHARTS GRID - Enhanced 2-Chart Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* CHART 1: FINANCIAL TRENDS */}
              <div className="group relative overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm transition-all hover:shadow-xl hover:shadow-slate-100 flex flex-col">
                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Hiệu quả tài chính</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">So sánh Doanh thu và Chi phí nhân công</p>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner">
                    <DollarSign size={24} />
                  </div>
                </div>

                <div className="h-[350px] w-full flex-grow">
                  {isLoadingStats ? (
                    <div className="flex h-full w-full items-center justify-center bg-slate-50/50 rounded-3xl animate-pulse">
                      <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={350}>
                      <AreaChart data={dashboardData.chartData}>
                        <defs>
                          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} 
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} 
                          tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                          dx={-10}
                        />
                        <Tooltip 
                          formatter={(value) => [new Intl.NumberFormat('vi-VN').format(value) + " VND", ""]}
                          contentStyle={{ 
                            borderRadius: '20px', 
                            border: '1px solid #f1f5f9', 
                            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', 
                            padding: '12px 16px',
                            fontSize: '12px', 
                            fontWeight: 'bold' 
                          }} 
                          itemStyle={{ padding: '2px 0' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="#10b981" 
                          strokeWidth={4} 
                          fillOpacity={1} 
                          fill="url(#colorRev)" 
                          name="Doanh thu" 
                          activeDot={{ r: 8, strokeWidth: 0, fill: '#10b981' }}
                        />
                        <Legend 
                          verticalAlign="top" 
                          align="right"
                          iconType="circle" 
                          wrapperStyle={{ fontSize: '11px', fontWeight: '800', paddingBottom: '30px', textTransform: 'uppercase', letterSpacing: '0.05em' }} 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* CHART 2: ORDER INTENSITY */}
              <div className="group relative overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm transition-all hover:shadow-xl hover:shadow-slate-100 flex flex-col">
                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Tần suất đơn hàng</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Số lượng đơn hàng được tiếp nhận</p>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner">
                    <ShoppingBag size={24} />
                  </div>
                </div>

                <div className="h-[350px] w-full flex-grow">
                  {isLoadingStats ? (
                    <div className="flex h-full w-full items-center justify-center bg-slate-50/50 rounded-3xl animate-pulse">
                      <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={dashboardData.chartData}>
                        <defs>
                          <linearGradient id="colorOrder" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.8}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} 
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }}
                          dx={-10}
                        />
                        <Tooltip 
                          cursor={{ fill: '#f8fafc', radius: 10 }}
                          formatter={(value) => [new Intl.NumberFormat('vi-VN').format(value), "Đơn hàng"]}
                          contentStyle={{ 
                            borderRadius: '20px', 
                            border: '1px solid #f1f5f9', 
                            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', 
                            padding: '12px 16px',
                            fontSize: '12px', 
                            fontWeight: 'bold' 
                          }} 
                        />
                        <Bar 
                          dataKey="orderCount" 
                          fill="url(#colorOrder)" 
                          radius={[10, 10, 0, 0]} 
                          barSize={30} 
                          name="Số đơn hàng" 
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="internal-dashboard-section">
            <div className="internal-dashboard-section__heading">
              <h2 className="internal-dashboard-section__title">Lối vào nhanh</h2>
              <p className="internal-dashboard-section__subtitle">
                Chọn chức năng bạn muốn làm việc trong phiên quản trị này.
              </p>
            </div>

            <div className="internal-dashboard-grid">
              {quickLinks.map(({ to, title, description, icon: Icon }) => (
                <Link key={to} to={to} className="internal-dashboard-card">
                  <div className="internal-dashboard-card__icon">
                    {createElement(Icon, { size: 22 })}
                  </div>
                  <div className="internal-dashboard-card__content">
                    <h3 className="internal-dashboard-card__title">{title}</h3>
                    <p className="internal-dashboard-card__description">{description}</p>
                  </div>
                  <span className="internal-dashboard-card__arrow">
                    <ArrowRight size={18} />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}



