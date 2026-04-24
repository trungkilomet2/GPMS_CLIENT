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

  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalPayroll: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      // 1. Fetch Customers - Reduced PageSize to 100 to avoid 400 errors
      const custRes = await CustomerService.getAllCustomers({ PageSize: 100 });
      const customers = custRes?.data || [];
      
      // 2. Fetch Orders - Reduced PageSize to 100
      const orderRes = await OrderService.getAllOrders({ PageSize: 100 });
      const allOrders = orderRes?.data?.data || orderRes?.data || [];

      // Filter orders by date
      const filteredOrders = allOrders.filter(order => {
        const d = new Date(order.startDate || order.createDate || order.orderDate);
        if (filterType === "month") {
          return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
        }
        if (filterType === "quarter") {
          const q = Math.floor(d.getMonth() / 3) + 1;
          const targetQ = Math.floor((selectedMonth - 1) / 3) + 1;
          return q === targetQ && d.getFullYear() === selectedYear;
        }
        if (filterType === "year") {
          return d.getFullYear() === selectedYear;
        }
        if (filterType === "custom") {
          const start = new Date(customRange.start);
          const end = new Date(customRange.end);
          end.setHours(23, 59, 59);
          return d >= start && d <= end;
        }
        return true;
      });

      const revenue = filteredOrders.reduce((sum, o) => sum + (Number(o.quantity || 0) * Number(o.cpu || 0)), 0);

      // 3. Fetch Payroll
      let payrollTotal = 0;
      if (filterType === "month") {
        const payroll = await fetchAggregatedPayroll(selectedMonth, selectedYear);
        payrollTotal = payroll.reduce((sum, w) => sum + (w.totalSalary || 0), 0);
      } else if (filterType === "quarter") {
        const targetQ = Math.floor((selectedMonth - 1) / 3) + 1;
        const months = targetQ === 1 ? [1,2,3] : targetQ === 2 ? [4,5,6] : targetQ === 3 ? [7,8,9] : [10,11,12];
        const results = await Promise.all(months.map(m => fetchAggregatedPayroll(m, selectedYear)));
        payrollTotal = results.flat().reduce((sum, w) => sum + (w.totalSalary || 0), 0);
      } else if (filterType === "year") {
        const results = await Promise.all(Array.from({length: 12}, (_, i) => fetchAggregatedPayroll(i+1, selectedYear)));
        payrollTotal = results.flat().reduce((sum, w) => sum + (w.totalSalary || 0), 0);
      }

      setStats({
        totalCustomers: customers.length,
        totalOrders: filteredOrders.length,
        totalRevenue: revenue,
        totalPayroll: payrollTotal,
      });

      // 4. Generate Chart Data
      let trend = [];
      if (filterType === "month") {
        const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
          const dOrders = filteredOrders.filter(o => new Date(o.startDate || o.createDate || o.orderDate).getDate() === i);
          const dCusts = customers.filter(c => {
            const cd = new Date(c.createDate || c.joinDate);
            return cd.getDate() === i && cd.getMonth() + 1 === selectedMonth && cd.getFullYear() === selectedYear;
          });
          trend.push({ 
            name: `${i}`, 
            revenue: dOrders.reduce((sum, o) => sum + (Number(o.quantity || 0) * Number(o.cpu || 0)), 0), 
            payroll: payrollTotal / daysInMonth,
            orderCount: dOrders.length,
          });
        }
      } else if (filterType === "year") {
        for (let i = 1; i <= 12; i++) {
          const mOrders = allOrders.filter(o => {
            const d = new Date(o.startDate || o.createDate || o.orderDate);
            return d.getMonth() + 1 === i && d.getFullYear() === selectedYear;
          });
          const mCusts = customers.filter(c => {
            const cd = new Date(c.createDate || c.joinDate);
            return cd.getMonth() + 1 === i && cd.getFullYear() === selectedYear;
          });
          trend.push({ 
            name: `T${i}`, 
            revenue: mOrders.reduce((sum, o) => sum + (Number(o.quantity || 0) * Number(o.cpu || 0)), 0), 
            payroll: payrollTotal / 12,
            orderCount: mOrders.length,
          });
        }
      } else {
        // Default split
        for (let i = 0; i < 7; i++) {
          trend.push({ name: `GĐ ${i+1}`, revenue: revenue/7, payroll: payrollTotal/7, orderCount: filteredOrders.length/7 });
        }
      }
      setChartData(trend);
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setIsLoadingStats(false);
    }
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
                          <span className="text-3xl font-black text-slate-900">{stats.totalCustomers}</span>
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
                          <span className="text-3xl font-black text-slate-900">{stats.totalOrders}</span>
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
                            {stats.totalRevenue.toLocaleString("vi-VN")}
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
                            {stats.totalPayroll.toLocaleString("vi-VN")}
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
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorPay" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
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
                        <Area 
                          type="monotone" 
                          dataKey="payroll" 
                          stroke="#f43f5e" 
                          strokeWidth={3} 
                          strokeDasharray="5 5"
                          fillOpacity={1} 
                          fill="url(#colorPay)" 
                          name="Tiền thợ" 
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
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
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



