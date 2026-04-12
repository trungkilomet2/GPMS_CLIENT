import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ArrowLeft, Edit, Plus, Users, LayoutList, History,
  Trash2, AlertTriangle, CheckCircle, Send, RotateCcw,
  Eye, FileText, Settings, Hammer, Scissors, Package, Download, Info,
  Loader2, MessageSquare, Truck, BarChart2, Activity, UserCheck, Clock, Layers
} from "lucide-react";
import OwnerLayout from "@/layouts/OwnerLayout";
import MaterialsTable from "@/components/orders/MaterialsTable";
import CustomerInfoCard from "@/components/orders/CustomerInfoCard";
import { MATERIALS_TABLE_EMPTY_TEXT } from "@/lib/orders/materials";
import { formatOrderDate, formatDateTime } from "@/lib/orders/formatters";
import { getOrderCustomerId } from "@/lib/orders/customerInfo";
import OrderStatusReasonModal from "@/components/orders/OrderStatusReasonModal";
import SuccessModal from "@/components/SuccessModal";
import ConfirmModal from "@/components/ConfirmModal";
import ProductionService from "@/services/ProductionService";
import {
  STATUS_STYLES as PRODUCTION_STATUS_STYLES,
  getProductionStatusLabel,
  getPlanStatusLabel,
  STATUS_STYLES
} from "@/utils/statusUtils";
import "@/styles/leave.css";
import { userService } from "@/services/UserService";
import ProductionPartService from "@/services/ProductionPartService";
import CuttingNotebookService from "@/services/CuttingNotebookService";
import { toast } from "react-toastify";
import Pagination from "@/components/Pagination";
import { Link } from "react-router-dom";
import { getStoredUser } from "@/lib/authStorage";
import { hasAnyRole } from "@/lib/roleAccess";
import DesignTemplatesSection from '@/components/orders/DesignTemplatesSection';
import '@/styles/homepage.css';
import '@/styles/leave.css';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function toUtcDateOnly(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function getProductionDurationText(startDate, endDate) {
  const startUtc = toUtcDateOnly(startDate);
  const endUtc = toUtcDateOnly(endDate);
  if (startUtc === null || endUtc === null || endUtc < startUtc) return "-";
  const days = Math.floor((endUtc - startUtc) / DAY_IN_MS) + 1;
  return `${days} ngày`;
}

export default function ProductionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // --- MODAL STATES ---
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isRejectSuccessModalOpen, setIsRejectSuccessModalOpen] = useState(false);
  const [isApproveOrderConfirmOpen, setIsApproveOrderConfirmOpen] = useState(false);
  const [isApprovePlanConfirmOpen, setIsApprovePlanConfirmOpen] = useState(false);
  const [isRequestPlanUpdateConfirmOpen, setIsRequestPlanUpdateConfirmOpen] = useState(false);
  const [isSubmitPlanConfirmOpen, setIsSubmitPlanConfirmOpen] = useState(false);
  const [checkingCuttingBook, setCheckingCuttingBook] = useState(false);
  const [isDonePartModalOpen, setIsDonePartModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState(null);

  // --- DATA STATES ---
  const [production, setProduction] = useState(null);
  const [customerProfile, setCustomerProfile] = useState(null);
  const [rejectReason, setRejectReason] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [steps, setSteps] = useState([]);
  const [totalParts, setTotalParts] = useState(0);
  const [reportedErrorCount, setReportedErrorCount] = useState(0);
  const [activeTab, setActiveTab] = useState('production'); // production, order_info, history

  const currentUser = getStoredUser();
  const roleValue = currentUser?.role ?? currentUser?.roles ?? currentUser?.roleName ?? "";
  const isOwner = hasAnyRole(roleValue, ["owner", "admin"]);
  const isPM = hasAnyRole(roleValue, ["pm", "manager"]);
  const isWorker = hasAnyRole(roleValue, ["worker", "kcs", "team leader"]);
  const currentUserId = currentUser?.id ?? currentUser?.userId ?? currentUser?.accountId;

  // --- FETCHING LOGIC ---
  useEffect(() => {
    let active = true;
    const fetchProduction = async () => {
      try {
        setLoading(true);
        const response = await ProductionService.getProductionDetail(id);
        if (!active) return;
        const payload = response?.data?.data ?? response?.data ?? null;
        if (payload) {
          const resolvedStatus = getProductionStatusLabel(payload.statusName ?? payload.status ?? payload.statusId);
          const order = payload.order || {};
          setProduction({
            productionId: payload.productionId ?? payload.id,
            status: resolvedStatus,
            pStartDate: payload.startDate || order.startDate,
            pEndDate: payload.endDate || order.endDate,
            pmId: payload.pm?.id ?? payload.pmId,
            pmName: payload.pm?.fullName ?? payload.pmName ?? (payload.pmId ? `Quản lý #${payload.pmId}` : ""),
            note: payload.note || payload.productionNote || "",
            order: {
              ...order,
              templates: Array.isArray(order.templates) ? order.templates.map(t => ({ ...t, templateName: t.templateName ?? t.name })) : [],
              materials: Array.isArray(order.materials) ? order.materials.map(m => ({ ...m, materialName: m.materialName ?? m.name })) : [],
            }
          });
        }
      } catch (_err) {
        if (active) setError("Không thể tải chi tiết đơn sản xuất.");
      } finally {
        if (active) setLoading(false);
      }
    };
    if (id) fetchProduction();
    return () => { active = false; };
  }, [id]);


  useEffect(() => {
    if (!production?.productionId || production.status !== "Từ Chối") return;
    ProductionService.getProductionRejectReason(production.productionId).then(res => setRejectReason(res?.data)).catch(() => setRejectReason(null));
  }, [production?.productionId, production?.status]);

  useEffect(() => {
    if (!production?.productionId) return;
    ProductionPartService.getPartsByProduction(production.productionId, { PageIndex: 0, PageSize: 50, SortColumn: "Name", SortOrder: "ASC" })
      .then(res => {
        const list = res?.data?.data ?? res?.data?.items ?? (Array.isArray(res?.data) ? res.data : []);
        setSteps(list);
        setTotalParts(list.length);
      });
  }, [production?.productionId]);

  // --- DERIVED VALUES ---
  const isAssignedPM = isOwner || (isPM && String(currentUserId) === String(production?.pmId));
  const order = production?.order || {};
  const statusName = production?.status;
  const isPendingApproval = statusName === "Chờ Xét Duyệt";
  const isAccepted = statusName === "Chấp Nhận";
  const isPendingPlanApproval = statusName === "Chờ Xét Duyệt Kế Hoạch";
  const isNeedUpdatePlan = statusName === "Cần Chỉnh Sửa Kế Hoạch";
  const isInProduction = statusName === "Đang Sản Xuất";
  const isRejectedProduction = statusName === "Từ Chối";
  const isActionLocked = ["Từ Chối", "Hoàn Thành", "Hết Hạn"].includes(statusName);

  const allStepsCompleted = steps.length > 0 && steps.every(s => {
    const label = s.statusName || getPlanStatusLabel(s.statusId || s.status);
    return label === "Đã Hoàn Thành" || label === "Hoàn Thành";
  });

  const processedVariants = useMemo(() => {
    if (!order) return [];
    const realVariants = order.variants || order.orderVariants || order.productVariants || order.itemVariants || (order.data?.variants);
    const mockVariants = [
      { color: 'Đỏ Đô', colorCode: '#991b1b', xs: 15, s: 25, m: 40, l: 30, xl: 20, '2xl': 10, '3xl': 5 },
      { color: 'Xám Khói', colorCode: '#475569', xs: 10, s: 30, m: 55, l: 45, xl: 15, '2xl': 5, '3xl': 0 },
      { color: 'Xanh Navy', colorCode: '#1e3a8a', xs: 20, s: 40, m: 60, l: 50, xl: 30, '2xl': 15, '3xl': 10 },
    ];
    return (Array.isArray(realVariants) && realVariants.length > 0) ? realVariants : mockVariants;
  }, [order]);

  const softTemplates = Array.isArray(order.templates) ? order.templates.filter(t => t.type !== "HARD") : [];
  const statusStyle = PRODUCTION_STATUS_STYLES[production?.status] || PRODUCTION_STATUS_STYLES["Default"];

  // --- HANDLERS ---
  const handleApproveProduction = () => setIsApproveOrderConfirmOpen(true);
  const confirmApproveProduction = async () => {
    try {
      await ProductionService.approveProduction(production.productionId, { userId: currentUserId });
      setProduction(prev => ({ ...prev, status: "Chấp Nhận" }));
      setIsApproveOrderConfirmOpen(false);
      setIsSuccessModalOpen(true);
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) { toast.error("Phê duyệt thất bại."); }
  };

  const handleRejectProduction = async (reason) => {
    try {
      await ProductionService.rejectProduction(production.productionId, { userId: currentUserId, reason });
      setProduction(prev => ({ ...prev, status: "Từ Chối" }));
      setIsReasonModalOpen(false);
      setIsRejectSuccessModalOpen(true);
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) { toast.error("Từ chối thất bại."); }
  };

  const handleDonePart = (partId) => {
    setSelectedPartId(partId);
    setIsDonePartModalOpen(true);
  };

  const confirmDonePart = async () => {
    try {
      await ProductionPartService.donePart(selectedPartId, { userId: currentUserId });
      toast.success("Công đoạn đã hoàn thành.");
      setIsDonePartModalOpen(false);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) { toast.error("Lỗi khi cập nhật công đoạn."); }
  };

  const confirmCompleteProduction = async () => {
    try {
      await ProductionService.completeProduction(production.productionId, { userId: currentUserId });
      toast.success("Đơn sản xuất đã hoàn tất!");
      setIsCompleteModalOpen(false);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) { toast.error("Lỗi khi hoàn thiện đơn sản xuất."); }
  };

  const handleOpenCuttingBook = async () => {
    if (!production?.productionId || checkingCuttingBook) return;
    setCheckingCuttingBook(true);
    try {
      navigate("/worker/cutting-book", {
        state: {
          productionId: production.productionId,
          production,
          product: { ...production.order, productName: production.order.orderName },
          openCuttingBookMode: "list",
          filterByProduction: true,
        },
      });
    } finally { setCheckingCuttingBook(false); }
  };

  const handleBaoLoi = (row) => {
    navigate("/worker/error-report", {
      state: {
        assignment: {
          partId: row.id,
          productionId: production.productionId,
          orderName: order.orderName,
          partName: row.partName || row.name,
          startDate: row.startDate,
          endDate: row.endDate,
          errorType: 0,
          happenAt: new Date().toISOString(),
        }
      }
    });
  };

  const handleApprovePlan = () => setIsApprovePlanConfirmOpen(true);
  const confirmApprovePlan = async () => {
    try {
      await ProductionService.approveProductionPlan(production.productionId);
      toast.success("Đã duyệt kế hoạch");
      setIsApprovePlanConfirmOpen(false);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) { toast.error("Không thể duyệt kế hoạch"); }
  };

  const handleRequestPlanUpdate = () => setIsRequestPlanUpdateConfirmOpen(true);
  const confirmRequestPlanUpdate = async () => {
    try {
      await ProductionService.requestPlanUpdate(production.productionId);
      toast.success("Đã gửi yêu cầu sửa");
      setIsRequestPlanUpdateConfirmOpen(false);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) { toast.error("Không thể gửi yêu cầu"); }
  };

  // --- RENDER ---
  if (loading) return (
    <OwnerLayout>
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-emerald-600 mb-4" size={40} />
        <p className="text-slate-500 text-sm font-medium italic">Vận hành quy trình sản xuất...</p>
      </div>
    </OwnerLayout>
  );

  if (!production) return (
    <OwnerLayout>
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
        <Package size={48} className="text-slate-200 mb-4" />
        <p className="font-bold">{error || "Không tìm thấy dữ liệu đơn sản xuất."}</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-emerald-600 font-black uppercase text-[10px] tracking-widest hover:underline italic">Quay lại</button>
      </div>
    </OwnerLayout>
  );

  return (
    <OwnerLayout>
      <div className="leave-page leave-detail-page font-sans selection:bg-emerald-100 selection:text-emerald-900 pb-20">
        <div className="leave-shell mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">

          {/* HERO HEADER */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-4">
              <button onClick={() => navigate(-1)} className="group flex items-center justify-center w-12 h-12 rounded-xl bg-white border border-gray-200 text-gray-400 transition-all hover:border-[#1e6e43] hover:text-[#1e6e43] shadow-sm active:scale-95">
                <ArrowLeft size={22} />
              </button>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-none uppercase">
                  Đơn sản xuất <span className="text-[#1e6e43]">#PR-{production.productionId}</span>
                </h1>
                <p className="text-[10px] font-bold text-gray-600 tracking-widest uppercase">Vận hành sản xuất & Chất lượng</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="bg-white p-1 rounded-xl flex items-center gap-1 border border-gray-200 shadow-sm">
                {[
                  { id: 'production', label: 'Tiến độ sản xuất', icon: Activity },
                  { id: 'order', label: 'Thông số đơn hàng', icon: FileText },
                  { id: 'materials', label: 'Nguyên phụ liệu', icon: Package },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${isActive
                        ? 'bg-[#1e6e43] text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                    >
                      <Icon size={14} />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <div className={`rounded-xl px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest shadow-sm ${statusStyle}`}>
                  {production.status}
                </div>

                {isPM && isPendingApproval && (
                  <>
                    <button onClick={handleApproveProduction} className="h-10 rounded-full bg-[#1e6e43] px-6 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:bg-[#155232] shadow-md">
                      Chấp nhận đơn
                    </button>
                    <button onClick={() => setIsReasonModalOpen(true)} className="h-10 rounded-full bg-rose-50 px-6 text-[10px] font-bold uppercase tracking-widest text-rose-600 transition-all hover:bg-rose-100 shadow-sm">
                      Từ chối
                    </button>
                  </>
                )}

                {isOwner && isPendingPlanApproval && (
                  <>
                    <button onClick={handleApprovePlan} className="h-10 rounded-full bg-[#1e6e43] px-6 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:bg-[#155232] shadow-md">
                      Duyệt KH
                    </button>
                    <button onClick={handleRequestPlanUpdate} className="h-10 rounded-full bg-rose-50 px-6 text-[10px] font-bold uppercase tracking-widest text-rose-600 transition-all hover:bg-rose-100 shadow-sm">
                      Sửa KH
                    </button>
                  </>
                )}

                {(isOwner || isPM) && isInProduction && allStepsCompleted && (
                  <button onClick={() => setIsCompleteModalOpen(true)} className="h-11 rounded-xl bg-emerald-600 px-6 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-emerald-700 shadow-xl shadow-emerald-100 active:scale-95">
                    Hoàn thành dự án
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">

              {activeTab === 'production' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-white rounded-xl border border-black shadow-sm overflow-hidden">
                    <div className="px-8 py-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                      <div className="flex items-center gap-3">
                        <Info size={18} className="text-[#1e6e43]" />
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Ma trận công đoạn sản xuất</h4>
                      </div>
                      <div className="flex gap-2">
                        {isAssignedPM && (isAccepted || isNeedUpdatePlan) && (
                          <Link to="/production-plan/create" state={{ productionId: production.productionId, steps }} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-[#1e6e43] rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all hover:bg-[#f0f9f4] hover:border-[#1e6e43] shadow-sm">
                            <Plus size={14} /> Thiết kế công đoạn
                          </Link>
                        )}
                        {(isPM || isOwner) && isInProduction && (
                          <Link to={`/production-plan/assign/${production.productionId}`} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-[#1e6e43] rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all hover:bg-[#f0f9f4] hover:border-[#1e6e43] shadow-sm">
                            <Users size={14} /> Phân công thợ
                          </Link>
                        )}
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-8 py-5 text-left text-[9px] font-bold text-gray-500 uppercase tracking-widest">Tên công đoạn</th>
                            <th className="px-4 py-5 text-center text-[9px] font-bold text-gray-500 uppercase tracking-widest">Màu sắc</th>
                            <th className="px-4 py-5 text-center text-[9px] font-bold text-gray-500 uppercase tracking-widest">Kích cỡ</th>
                            <th className="px-6 py-5 text-center text-[9px] font-bold text-gray-500 uppercase tracking-widest">Nhân sự</th>
                            <th className="px-6 py-5 text-center text-[9px] font-bold text-gray-500 uppercase tracking-widest">Trạng thái</th>
                            <th className="px-8 py-5 text-right text-[9px] font-bold text-gray-500 uppercase tracking-widest">Hành động</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {steps.map((row, idx) => {
                            const partStatus = row.statusName || getPlanStatusLabel(row.statusId || row.status);
                            const isDone = partStatus === "Đã Hoàn Thành" || partStatus === "Hoàn Thành";

                            return (
                              <tr key={idx} className="group hover:bg-gray-50 transition-all border-b border-gray-50">
                                <td className="px-8 py-6">
                                  <div className="flex flex-col gap-1">
                                    <span className="text-sm font-bold text-gray-900 uppercase tracking-tight">{row.partName || row.name}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-medium text-gray-500">Đơn giá: {row.unitPrice?.toLocaleString() || row.price?.toLocaleString() || '-'} đ</span>
                                      <span className="w-1 h-1 rounded-full bg-gray-200" />
                                      <span className="text-[10px] font-bold text-[#1e6e43] uppercase tracking-widest">Tiến độ: {row.actualQuantity || 0} / {row.quantity || '-'}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-6 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: row.colorCode || '#eee' }} />
                                    <span className="text-[11px] font-bold text-gray-700">{row.color || row.variant?.color || '-'}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-6 text-center">
                                  <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-1 rounded bg-gray-100 text-[10px] font-black text-gray-600 border border-gray-200 uppercase">
                                    {row.sizeName || row.sizeValue || row.size || row.variant?.sizeName || '-'}
                                  </span>
                                </td>
                                <td className="px-6 py-6 font-bold text-sm text-center">
                                  <div className="flex -space-x-2 justify-center">
                                    {(row.assignees || row.workers || []).slice(0, 3).map((w, wi) => (
                                      <div key={wi} className="w-8 h-8 rounded-full bg-[#f0f9f4] border border-white flex items-center justify-center text-[10px] font-bold text-[#1e6e43] shadow-sm" title={w.fullName || w.name}>
                                        {String(w.fullName || w.name || "?").charAt(0).toUpperCase()}
                                      </div>
                                    ))}
                                    {(row.assignees || row.workers || []).length > 3 && (
                                      <div className="w-8 h-8 rounded-full bg-gray-50 border border-white flex items-center justify-center text-[9px] font-bold text-gray-400 shadow-sm">
                                        +{(row.assignees || row.workers || []).length - 3}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-6 text-center">
                                  {(() => {
                                    const s = partStatus;
                                    let badgeClass = "bg-gray-100 text-gray-500 border-gray-200";
                                    if (s === "Đã Hoàn Thành" || s === "Hoàn Thành") badgeClass = "bg-[#f0f9f4] text-[#1e6e43] border-[#d4e3da]";
                                    if (s === "Đang Thực Hiện") badgeClass = "bg-amber-50 text-amber-700 border-amber-100";
                                    if (s === "Đợi Xác Nhận" || s === "Chờ Chấp Nhận") badgeClass = "bg-indigo-50 text-indigo-700 border-indigo-100";
                                    if (s === "Báo Lỗi" || s === "Sự Cố") badgeClass = "bg-rose-50 text-rose-700 border-rose-100";

                                    return (
                                      <div className={`inline-flex items-center justify-center px-4 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest border transition-all ${badgeClass}`}>
                                        {s}
                                      </div>
                                    );
                                  })()}
                                </td>
                                <td className="px-8 py-6 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button onClick={() => navigate(`/production/part/${row.id}/history`)} className="p-2 rounded-lg bg-gray-50 text-gray-400 hover:bg-gray-900 hover:text-white transition-all shadow-sm" title="Lịch sử báo cáo sản lượng">
                                      <LayoutList size={16} />
                                    </button>
                                    {!isDone && isInProduction && (isOwner || isPM) && (
                                      <button
                                        onClick={() => {
                                          if (row.actualQuantity < row.quantity && partStatus !== "Đợi Xác Nhận") {
                                            toast.warning("Công đoạn chưa hoàn thành hoặc chưa ở trạng thái chờ nghiệm thu!");
                                            return;
                                          }
                                          handleDonePart(row.id);
                                        }}
                                        className={`p-2 rounded-lg transition-all shadow-sm ${(row.actualQuantity >= row.quantity || partStatus === "Đợi Xác Nhận")
                                          ? 'bg-[#f0f9f4] text-[#1e6e43] hover:bg-[#1e6e43] hover:text-white'
                                          : 'bg-gray-50 text-gray-200 cursor-not-allowed'
                                          }`}
                                        title={row.actualQuantity < row.quantity ? "Sản lượng chưa đạt mục tiêu" : "Xác nhận hoàn thành công đoạn"}
                                      >
                                        <CheckCircle size={16} />
                                      </button>
                                    )}
                                    <button onClick={() => handleBaoLoi(row)} className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white transition-all shadow-sm" title="Báo cáo lỗi / Sự cố">
                                      <AlertTriangle size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {steps.length === 0 && (
                            <tr>
                              <td colSpan={6} className="px-8 py-20 text-center">
                                <div className="flex flex-col items-center gap-2">
                                  <Layers size={40} className="text-gray-100" />
                                  <p className="text-[11px] font-bold text-gray-300 uppercase tracking-widest">Chưa có kế hoạch công đoạn</p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="p-8 rounded-xl bg-white border border-black-100 shadow-sm space-y-4 group transition-all hover:border-[#1e6e43]/30">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-[#f0f9f4] rounded-2xl text-[#1e6e43]">
                          <Activity size={24} />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#1e6e43] bg-[#f0f9f4] px-3 py-1 rounded-full">Công đoạn</span>
                      </div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tổng công đoạn sản xuất</p>
                      <h5 className="text-4xl font-bold tracking-tighter text-gray-900">{totalParts} <span className="text-sm text-gray-400 ml-1">PHẦN</span></h5>
                    </div>

                    <div className="p-8 rounded-xl bg-white border border-black-100 shadow-sm space-y-4 group transition-all hover:border-rose-100">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-rose-50 rounded-2xl text-rose-500">
                          <AlertTriangle size={24} />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-rose-500 bg-rose-50 px-3 py-1 rounded-full">KCS / Kiểm soát</span>
                      </div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tổng số lỗi ghi nhận</p>
                      <h5 className="text-4xl font-bold tracking-tighter text-gray-900">{reportedErrorCount} <span className="text-sm text-gray-400 ml-1">LỖI SP</span></h5>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'order' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                  <div className="bg-white rounded-xl border border-black-100 shadow-sm p-8 space-y-10">
                    <div className="flex flex-col md:flex-row gap-10">
                      <div className="w-full md:w-[200px] shrink-0">
                        <div className="relative aspect-square rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden flex items-center justify-center p-3">
                          {order.image ? (
                            <img src={order.image} alt="" className="w-full h-full object-contain" />
                          ) : (
                            <div className="text-gray-400 flex flex-col items-center gap-2">
                              <Package size={40} />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 space-y-8">
                        <div>
                          <h4 className="text-[10px] font-bold text-[#1e6e43] uppercase tracking-widest mb-1">Chi tiết đơn hàng gốc</h4>
                          <h3 className="text-2xl font-bold text-gray-900 tracking-tight uppercase leading-tight">{order.orderName}</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-x-12 gap-y-8 border-t border-gray-50 pt-8">
                          <DetailItem label="Tổng số lượng" value={`${order.quantity?.toLocaleString() || 0} Sản phẩm`} isBold isGreen />
                          <DetailItem label="Thời hạn sản xuất" value={`${formatOrderDate(order.startDate)} - ${formatOrderDate(order.endDate)} (${getProductionDurationText(order.startDate, order.endDate)})`} />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6 pt-10 border-t border-black-100">
                      <div className="mb-6">
                        <p className="text-[10px] font-bold text-[#1e6e43] uppercase tracking-[0.2em] mb-1">Ma trận chi tiết</p>
                        <h4 className="text-lg font-bold text-gray-900 tracking-tight uppercase">Phân bổ Màu & Size</h4>
                      </div>
                      <div className="space-y-3">
                        <div className="grid grid-cols-10 bg-gray-50 rounded-xl py-4 px-8 border border-gray-100">
                          <div className="col-span-2 text-[8px] font-bold text-gray-500 uppercase tracking-widest">Màu sắc</div>
                          {['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'].map(s => <div key={s} className="text-center text-[8px] font-bold text-gray-500 uppercase tracking-widest">{s}</div>)}
                          <div className="text-right text-[8px] font-bold text-gray-500 uppercase tracking-widest">Tổng</div>
                        </div>
                        <div className="space-y-1">
                          {processedVariants.map((v, idx) => {
                            const sizeKeys = ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl'];
                            const total = sizeKeys.reduce((acc, k) => acc + (Number(v[k] || v[k.toUpperCase()] || 0)), 0);
                            return (
                              <div key={idx} className="grid grid-cols-10 py-4 px-8 items-center bg-white border border-gray-50 rounded-xl hover:bg-gray-50 transition-all">
                                <div className="col-span-2 flex items-center gap-3">
                                  <div className="w-3.5 h-3.5 rounded-full border border-gray-100" style={{ backgroundColor: v.colorCode || '#cbd5e1' }} />
                                  <span className="text-[11px] font-bold text-gray-800 uppercase tracking-tight">{v.color}</span>
                                </div>
                                {sizeKeys.map(k => {
                                  const val = Number(v[k] || v[k.toUpperCase()] || 0);
                                  return <div key={k} className="text-center text-[10px] font-bold text-gray-600">{val || '-'}</div>;
                                })}
                                <div className="text-right">
                                  <span className="bg-gray-100 px-3 py-1 rounded-lg text-[9px] font-bold text-gray-700">{total}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'materials' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                  <div className="bg-white rounded-xl border border-black-100 shadow-sm overflow-hidden">
                    <div className="px-8 py-5 border-b border-gray-50 bg-gray-50/30 flex items-center gap-3">
                      <Package size={18} className="text-[#1e6e43]" />
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Danh mục nguyên phụ liệu kỹ thuật</h3>
                    </div>
                    <div className="p-4">
                      <MaterialsTable
                        materials={order.materials ?? []}
                        variant="detail"
                        showImage
                        emptyText={MATERIALS_TABLE_EMPTY_TEXT.detail}
                        onImageClick={(url) => { if (url) { setZoomImageUrl(url); setIsImageModalOpen(true); } }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-8">
              <div className="rounded-xl border border-black-100 bg-white shadow-sm p-8 space-y-8 sticky top-8">
                <div className="space-y-6">
                  {/* PROJECT MANAGER ONLY */}
                  <div className="p-6 rounded-xl bg-gray-50 border border-black-100 space-y-4 shadow-sm group">
                    <UserCheck size={20} className="text-gray-900" />
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest leading-none mb-1">Người quản lý</p>
                      <p className="text-base font-black text-gray-900 truncate uppercase tracking-tight">{production.pmName || "Chưa phân công"}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-8 pt-6 border-t border-black-100">
                  <DesignTemplatesSection templates={softTemplates} title="Hồ sơ thiết bị & Mẫu" />
                  <button onClick={handleOpenCuttingBook} disabled={checkingCuttingBook} className="w-full h-12 flex items-center justify-center gap-3 rounded-xl bg-white border border-gray-200 text-[#1e6e43] hover:bg-[#f0f9f4] hover:border-[#1e6e43] transition-all active:scale-95 disabled:bg-gray-100 shadow-sm">
                    <Scissors size={18} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{checkingCuttingBook ? "Đang truy xuất..." : "Truy cập sổ cắt vải"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal isOpen={isApproveOrderConfirmOpen} onClose={() => setIsApproveOrderConfirmOpen(false)} onConfirm={confirmApproveProduction} title="Chấp nhận đơn sản xuất" message="Hành động này sẽ chuyển trạng thái đơn sang 'Chấp Nhận'." />
      <ConfirmModal isOpen={isApprovePlanConfirmOpen} onClose={() => setIsApprovePlanConfirmOpen(false)} onConfirm={confirmApprovePlan} title="Phê duyệt kế hoạch" message="Kế hoạch sản xuất sẽ được phê duyệt." />
      <ConfirmModal isOpen={isRequestPlanUpdateConfirmOpen} onClose={() => setIsRequestPlanUpdateConfirmOpen(false)} onConfirm={confirmRequestPlanUpdate} title="Yêu cầu sửa kế hoạch" message="Gửi yêu cầu yêu cầu PM chỉnh sửa kế hoạch." />
      <ConfirmModal isOpen={isDonePartModalOpen} onClose={() => setIsDonePartModalOpen(false)} onConfirm={confirmDonePart} title="Xác nhận hoàn thành" message="Xác nhận hoàn thành công đoạn này?" />
      <ConfirmModal isOpen={isCompleteModalOpen} onClose={() => setIsCompleteModalOpen(false)} onConfirm={confirmCompleteProduction} title="Hoàn thành dự án" message="Toàn bộ quy trình sản xuất sẽ được đóng lại." />

      <OrderStatusReasonModal isOpen={isReasonModalOpen} onClose={() => setIsReasonModalOpen(false)} onSubmit={handleRejectProduction} title="Từ chối đơn sản xuất" requireReason={true} />
      <SuccessModal isOpen={isSuccessModalOpen} onClose={() => setIsSuccessModalOpen(false)} message="Chấp nhận đơn sản xuất thành công!" />
      <SuccessModal isOpen={isRejectSuccessModalOpen} onClose={() => setIsRejectSuccessModalOpen(false)} message="Đã từ chối đơn sản xuất." />
    </OwnerLayout>
  );
}

function DetailItem({ label, value, isBold = false, isGreen = false }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{label}</span>
      <span className={`text-[15px] ${isBold ? 'font-bold text-gray-900' : 'font-bold text-gray-800'} ${isGreen ? 'text-[#1e6e43]' : ''}`}>
        {value || "-"}
      </span>
    </div>
  );
}
