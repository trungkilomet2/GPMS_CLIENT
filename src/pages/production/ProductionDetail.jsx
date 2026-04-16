import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ArrowLeft, Edit, Plus, Users, LayoutList, History,
  Trash2, AlertTriangle, CheckCircle, Send, RotateCcw,
  Eye, FileText, Settings, Hammer, Scissors, Package, Download, Info,
  Loader2, MessageSquare, Truck, BarChart2, Activity, UserCheck, Clock, Layers,
  Circle, CheckCircle2, AlertCircle, RefreshCw, ChevronDown, ChevronRight, ClipboardCheck
} from "lucide-react";
import OwnerLayout from "@/layouts/OwnerLayout";
import MaterialsTable from "@/components/orders/MaterialsTable";
import CustomerInfoCard from "@/components/orders/CustomerInfoCard";
import { MATERIALS_TABLE_EMPTY_TEXT } from "@/lib/orders/materials";
import { formatOrderDate, formatDateTime } from "@/lib/orders/formatters";
import { getOrderCustomerId } from "@/lib/orders/customerInfo";
import ConfirmModal from "@/components/ConfirmModal";
import ProductionService from "@/services/ProductionService";
import {
  STATUS_STYLES as PRODUCTION_STATUS_STYLES,
  getProductionStatusLabel,
  getPlanStatusLabel,
  getVariantStatusLabel,
  STATUS_STYLES
} from "@/utils/statusUtils";
import "@/styles/leave.css";
import { userService } from "@/services/UserService";
import ProductionPartService from "@/services/ProductionPartService";
import CuttingNotebookService from "@/services/CuttingNotebookService";
import WorkerService from "@/services/WorkerService";
import { toast } from "react-toastify";
import Pagination from "@/components/Pagination";
import { Link } from "react-router-dom";
import { getStoredUser } from "@/lib/authStorage";
import { hasAnyRole } from "@/lib/roleAccess";
import DesignTemplatesSection from '@/components/orders/DesignTemplatesSection';
import '@/styles/homepage.css';
import { processOrderVariants } from '@/lib/orders/variants';

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
  const [isRecordDeliveryModalOpen, setIsRecordDeliveryModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("production");
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [isApproveOrderConfirmOpen, setIsApproveOrderConfirmOpen] = useState(false);
  const [isApprovePlanConfirmOpen, setIsApprovePlanConfirmOpen] = useState(false);
  const [isRequestPlanUpdateConfirmOpen, setIsRequestPlanUpdateConfirmOpen] = useState(false);
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
  const [rawParts, setRawParts] = useState([]);
  const [totalParts, setTotalParts] = useState(0);
  const [reportCount, setReportCount] = useState(0);
  const [allLogs, setAllLogs] = useState([]);
  const [reportedErrorCount, setReportedErrorCount] = useState(0);
  const [workerMap, setWorkerMap] = useState({}); // id -> fullName

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
              ...payload,
              ...order,
              templates: Array.isArray(order.templates || payload.templates) ? (order.templates || payload.templates).map(t => ({ ...t, templateName: t.templateName ?? t.name })) : [],
              materials: Array.isArray(order.materials || payload.materials) ? (order.materials || payload.materials).map(m => ({ ...m, materialName: m.materialName ?? m.name })) : [],
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

  // Load worker directory để resolve assigneeIds → tên thật (role-aware, không crash 403)
  useEffect(() => {
    const loadWorkerMap = async () => {
      try {
        const calls = [];
        // Nếu là Owner/Admin, ưu tiên lấy danh bạ toàn hệ thống và danh bạ manager
        if (isOwner) {
          calls.push(WorkerService.getEmployeeDirectory({ PageSize: 1000 }));
          calls.push(WorkerService.getManagerDirectory({ PageSize: 1000 }));
        } else {
          // Nếu là PM/Worker, chỉ nên lấy danh bạ trong phạm vi được phép (PM Scope)
          // để tránh lỗi 403 Forbidden khi truy cập danh bạ toàn cục.
          calls.push(WorkerService.getEmployeeDirectoryByPmScope({ PageSize: 1000 }));
        }

        const results = await Promise.allSettled(calls);

        const map = {};
        const process = (p) => {
          if (p.status === 'fulfilled' && p.value?.data) {
            p.value.data.forEach(e => {
              if (e.id) {
                const sid = String(e.id);
                // Ưu tiên fullName thực sự > userName > fallback Thợ #id
                const realName = (e.fullName && e.fullName !== "Chưa cập nhật")
                  ? e.fullName
                  : (e.userName || `Thợ #${e.id}`);
                map[sid] = realName;
              }
            });
          }
        };

        results.forEach(process);

        // Bổ sung PM của chính dự án này vào map để chắc chắn hiển thị đúng tên Tùng (Manager)
        if (production?.pmId && production?.pmName) {
          map[String(production.pmId)] = production.pmName;
        }

        setWorkerMap(map);
      } catch (err) {
        console.error("Worker map load error:", err);
      }
    };
    loadWorkerMap();
  }, [isOwner, production?.pmId, production?.pmName]);

  useEffect(() => {
    if (!production?.productionId) return;
    ProductionPartService.getPartsByProduction(production.productionId, { PageIndex: 0, PageSize: 100, SortColumn: "id", SortOrder: "ASC" })
      .then(res => {
        const rawList = res?.data?.data ?? res?.data?.items ?? (Array.isArray(res?.data) ? res.data : []);
        setRawParts(rawList);
        setTotalParts(rawList.length);
      });

    // Fetch combined issues for reportedErrorCount
    ProductionService.getProductionIssues(production.productionId)
      .then(res => {
        const issues = res?.data?.data ?? res?.data ?? [];
        setReportedErrorCount(issues.length);
      })
      .catch(err => console.error("Error fetching issue count:", err));

    // Fetch total report logs for reportCount
    ProductionPartService.getProductionWorkLogs(production.productionId)
      .then(res => {
        const data = res?.data?.data ?? res?.data ?? [];
        const logs = Array.isArray(data) ? data : [];
        setAllLogs(logs);
        setReportCount(logs.length);

        // Supplemental name resolution: Extract names from logs to bypass directory restrictions
        setWorkerMap(prev => {
          const newMap = { ...prev };
          logs.forEach(log => {
            const uid = log.userId || log.uId || log.accountId;
            const name = log.workerName || log.fullName;
            if (uid && name && !newMap[String(uid)]) {
              newMap[String(uid)] = name;
            }
          });
          return newMap;
        });
      })
      .catch(err => console.error("Error fetching logs count:", err));
  }, [production?.productionId]);

  // Flatten rawParts + workerMap → steps, tự re-compute khi worker map load xong
  useEffect(() => {
    if (!rawParts.length) return;
    const flattened = [];
    rawParts.forEach(part => {
      const variants = part.listPartOrderSizes || [];
      if (variants.length > 0) {
        variants.forEach(variant => {
          flattened.push({
            ...part,
            id: variant.id,
            partId: part.id,
            variant: variant,
            colorName: variant.color,
            sizeName: variant.size,
            quantity: variant.quantity,
            actualQuantity: variant.actualQuantity || 0,
            unitPrice: part.cpu,
            statusName: part.statusName,
            variantStatusId: variant.partOrderSizeStatusId,
            assignees: (variant.assigneeIds || variant.assignees || variant.workers || []).map(a => {
              if (typeof a === 'object') return a;
              const sid = String(a);
              return { id: sid, fullName: workerMap[sid] || `Thợ #${sid}`, name: workerMap[sid] || `Thợ #${sid}` };
            }),
          });
        });
      } else {
        flattened.push({ ...part, unitPrice: part.cpu, actualQuantity: 0, quantity: 0 });
      }
    });
    setSteps(flattened);
  }, [rawParts, workerMap]);

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

  const isAssignedWorker = useMemo(() => {
    if (!steps.length || !currentUserId) return false;
    const uid = String(currentUserId);
    return steps.some(step =>
      step.assignees?.some(a => String(a.id) === uid)
    );
  }, [steps, currentUserId]);

  const allStepsCompleted = steps.length > 0 && steps.every(s => {
    const label = s.statusName || getPlanStatusLabel(s.statusId || s.status);
    return label === "Đã Hoàn Thành" || label === "Hoàn Thành";
  });

  const processedVariants = useMemo(() => {
    return processOrderVariants(order);
  }, [order]);

  const statusStyle = PRODUCTION_STATUS_STYLES[production?.status] || PRODUCTION_STATUS_STYLES["Default"];
  const softTemplates = Array.isArray(order.templates) ? order.templates.filter(t => t.type !== "HARD") : [];

  const stagesSummary = useMemo(() => {
    const total = steps.length;
    const completedCount = steps.filter(s => {
      const status = s.statusName || getPlanStatusLabel(s.statusId || s.status);
      return status === "Đã Hoàn Thành" || status === "Hoàn Thành";
    }).length;
    const inProgressCount = steps.filter(s => {
      const status = s.statusName || getPlanStatusLabel(s.statusId || s.status);
      return status === "Đang Thực Hiện";
    }).length;
    const pendingCount = steps.filter(s => {
      const status = s.statusName || getPlanStatusLabel(s.statusId || s.status);
      return status === "Đợi Xác Nhận" || status === "Chờ Chấp Nhận" || status === "Chưa Bắt Đầu";
    }).length;
    const issuesCount = steps.filter(s => {
      const status = s.statusName || getPlanStatusLabel(s.statusId || s.status);
      return status === "Báo Lỗi" || status === "Sự Cố";
    }).length;

    return { total, completed: completedCount, inProgress: inProgressCount, pending: pendingCount, issues: issuesCount, percent: total > 0 ? Math.round((completedCount / total) * 100) : 0 };
  }, [steps]);

  const financialSummary = useMemo(() => {
    // 1. Doanh thu = Đơn giá sản phẩm * Tổng số lượng (ưu tiên cpu và quantity từ order)
    const totalQty = Number(order?.totalQuantity ?? order?.quantity ?? 0);
    const unitPrice = Number(order?.cpu ?? order?.unitPrice ?? 0);
    const revenue = order?.totalPrice || (totalQty * unitPrice);

    // 2. Tổng chi phí nhân công = Tổng (Đơn giá từng công đoạn * Số lượng công đoạn đó)
    const laborCost = steps.reduce((sum, s) => sum + ((Number(s.unitPrice) || 0) * (Number(s.quantity) || 0)), 0);

    const totalCost = laborCost;
    const profit = revenue - totalCost;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return {
      revenue,
      laborCost,
      totalCost,
      profit,
      profitMargin
    };
  }, [order, steps]);

  // --- HANDLERS ---
  const handleApproveProduction = () => setIsApproveOrderConfirmOpen(true);
  const confirmApproveProduction = async () => {
    try {
      await ProductionService.approveProduction(production.productionId, { userId: currentUserId });
      toast.success("Chấp nhận đơn sản xuất thành công!");
      setIsApproveOrderConfirmOpen(false);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) { toast.error("Phê duyệt thất bại."); }
  };

  const handleRejectProduction = async (reason) => {
    try {
      await ProductionService.rejectProduction(production.productionId, { userId: currentUserId, reason });
      setProduction(prev => ({ ...prev, status: "Từ Chối", reason })); 
      setIsReasonModalOpen(false);
      toast.success("Đã từ chối đơn sản xuất.");
      setTimeout(() => window.location.reload(), 1500);
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
          colorName: row.colorName || row.color,
          sizeName: row.sizeName || row.size,
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
        <button onClick={() => navigate("/production")} className="mt-4 text-emerald-600 font-black uppercase text-[10px] tracking-widest hover:underline italic">Quay lại</button>
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
              <button onClick={() => navigate("/production")} className="group flex items-center justify-center w-12 h-12 rounded-xl bg-white border border-gray-200 text-gray-400 transition-all hover:border-[#1e6e43] hover:text-[#1e6e43] shadow-sm active:scale-95">
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

                {(isOwner || isPM) && isPendingApproval && (
                  <>
                    {/* PM accepts, Owner just views or cancels */}
                    {isPM && (
                      <button onClick={handleApproveProduction} className="h-10 rounded-full bg-[#1e6e43] px-6 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:bg-[#155232] shadow-md">
                        Chấp nhận đơn
                      </button>
                    )}
                    <button onClick={() => setIsReasonModalOpen(true)} className="h-10 rounded-full bg-rose-50 px-6 text-[10px] font-bold uppercase tracking-widest text-rose-600 transition-all hover:bg-rose-100 shadow-sm">
                      {isOwner ? "Hủy giao việc" : "Từ chối"}
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

            {/* Rejection Reason Display - Sticky Style */}
            {production.status === "Từ Chối" && (production.reason || production.rejectReason) && (
              <div className="flex items-center gap-4 px-8 py-5 bg-rose-50 border border-rose-200 rounded-2xl animate-in zoom-in-95 duration-500 shadow-sm border-l-4 border-l-rose-500">
                <div className="p-2.5 bg-rose-500 text-white rounded-xl shadow-sm">
                   <AlertTriangle size={20} />
                </div>
                <div className="flex-1 space-y-1">
                  <h5 className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em] opacity-70">Lý do từ chối / Hủy đơn</h5>
                  <p className="text-sm font-bold text-rose-900 leading-snug italic font-serif">
                    "{production.reason || production.rejectReason}"
                  </p>
                </div>
              </div>
            )}
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
                        {isInProduction && isAssignedWorker && (
                          <Link
                            to="/worker/daily-report"
                            state={{ plan: { production, steps } }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-emerald-700 hover:scale-105 active:scale-95 shadow-lg shadow-emerald-100 ring-4 ring-emerald-50"
                          >
                            <ClipboardCheck size={16} /> Báo cáo sản lượng
                          </Link>
                        )}
                      </div>
                    </div>

                    <div className="overflow-y-auto max-h-[480px] scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                      <StageMatrix
                        steps={steps}
                        allLogs={allLogs}
                        isInProduction={isInProduction}
                        isOwner={isOwner}
                        isPM={isPM}
                        navigate={navigate}
                        handleDonePart={handleDonePart}
                        handleBaoLoi={handleBaoLoi}
                        getPlanStatusLabel={getPlanStatusLabel}
                        getVariantStatusLabel={getVariantStatusLabel}
                        toast={toast}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div
                      onClick={() => navigate(`/production-plan/${production.productionId}/history`)}
                      className="p-8 rounded-xl bg-white border border-black shadow-sm space-y-4 group transition-all hover:bg-emerald-50/30 hover:border-[#1e6e43] cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-[#f0f9f4] rounded-2xl text-[#1e6e43] group-hover:bg-[#1e6e43] group-hover:text-white transition-all">
                          <Activity size={24} />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#1e6e43] bg-[#f0f9f4] px-3 py-1 rounded-full">Sản lượng</span>
                      </div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Lịch sử báo cáo sản lượng</p>
                      <h5 className="text-4xl font-bold tracking-tighter text-gray-900">{reportCount} <span className="text-sm text-gray-400 ml-1">LƯỢT BÁO CÁO</span></h5>
                    </div>

                    <div
                      onClick={() => navigate(`/production/${production.productionId}/errors`)}
                      className="p-8 rounded-xl bg-white border border-black shadow-sm space-y-4 group transition-all hover:bg-rose-50/30 hover:border-rose-300 cursor-pointer text-center md:text-left"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-rose-50 rounded-2xl text-rose-500 group-hover:bg-rose-100 transition-colors">
                          <AlertTriangle size={24} />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-rose-500 bg-rose-50 px-3 py-1 rounded-full">KCS / Kiểm soát</span>
                      </div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tổng số lỗi ghi nhận</p>
                      <h5 className="text-4xl font-bold tracking-tighter text-gray-900">
                        {reportedErrorCount} <span className="text-sm text-gray-400 ml-1">LỖI SP</span>
                      </h5>
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-6 border-t border-gray-50 pt-8">
                          <DetailItem label="Tổng số lượng đặt" value={`${order.quantity?.toLocaleString() || 0} Sản phẩm`} isBold isGreen />
                          <DetailItem label="Thời gian bắt đầu" value={formatOrderDate(order.startDate)} isBold />
                          <DetailItem label="Thời gian giao trả hàng" value={formatOrderDate(order.endDate)} isBold />
                          <DetailItem label="Tổng số ngày" value={getProductionDurationText(order.startDate, order.endDate)} isBold isGreen />
                        </div>

                        {/* Financial Card moved here */}
                        {isOwner && financialSummary && (isPendingApproval || isAccepted || isPendingPlanApproval || isNeedUpdatePlan || isInProduction) && (
                          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/30 p-5 sm:p-6 shadow-sm animate-in zoom-in-95 duration-500">
                            <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-6">
                              {/* Left Side: Profit & Margin */}
                              <div className="flex-1 flex flex-col justify-center text-center sm:text-left space-y-1">
                                <p className="text-[10px] font-bold text-emerald-800/60 uppercase tracking-widest">Lợi nhuận gộp dự kiến</p>
                                <div className="flex items-center justify-center sm:justify-start gap-2">
                                  <p className={`text-2xl sm:text-3xl font-black tracking-tighter tabular-nums ${financialSummary.profit >= 0 ? 'text-[#1e6e43]' : 'text-rose-600'}`}>
                                    {financialSummary.profit >= 0 ? '+' : ''}₫{financialSummary.profit.toLocaleString()}
                                  </p>
                                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${financialSummary.profit >= 0 ? 'bg-emerald-600 text-white' : 'bg-rose-500 text-white'} uppercase`}>
                                    {financialSummary.profitMargin.toFixed(1)}%
                                  </span>
                                </div>
                                <p className="text-[9px] font-medium text-slate-400 italic">
                                  (Doanh thu - Nhân công)
                                </p>
                              </div>

                              {/* Divider */}
                              <div className="hidden sm:block w-px bg-emerald-100" />
                              <div className="sm:hidden h-px w-full bg-emerald-100" />

                              {/* Right Side: Breakdown */}
                              <div className="flex-1 w-full space-y-2 flex flex-col justify-center">
                                <div className="flex items-center justify-between text-[10px] sm:text-[11px]">
                                  <span className="font-bold text-slate-500 uppercase tracking-wider">Doanh thu dự kiến</span>
                                  <span className="font-black text-slate-900">₫{financialSummary.revenue.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] sm:text-[11px]">
                                  <span className="font-bold text-rose-500 uppercase tracking-wider">Chi phí nhân công</span>
                                  <span className="font-black text-rose-600 text-xs">- ₫{financialSummary.laborCost.toLocaleString()}</span>
                                </div>
                                <div className="mt-1 pt-1 border-t border-emerald-100/50 flex items-center justify-between text-[8px] sm:text-[9px]">
                                  <span className="font-medium text-slate-400 uppercase tracking-wider italic">Ghi chú: Tính trên đơn giá các công đoạn</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-6 pt-10 border-t border-gray-100 italic font-medium text-slate-400 text-[10px] uppercase text-right">
                      * Lưu ý: Tiến độ hoàn thành được tính dựa trên số lượng đã nghiệm thu của công đoạn cuối cùng.
                    </div>

                    <div className="space-y-6 pt-4">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-2 h-6 bg-emerald-500 rounded-full" />
                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-600">Phân bổ Màu & Size vs Tiến độ thực tế</h4>
                      </div>

                      <div className="border border-black overflow-hidden bg-white shadow-sm">
                        {/* Matrix Header */}
                        <div className="grid grid-cols-11 bg-slate-50 border-b border-black divide-x divide-black">
                          <div className="col-span-2 py-4 px-6 text-[10px] font-black text-black uppercase tracking-widest bg-slate-100/30">Phối màu</div>
                          {['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'].map(s => (
                            <div key={s} className="col-span-1 py-4 text-center text-[10px] font-black text-black uppercase tracking-widest flex items-center justify-center">{s}</div>
                          ))}
                          <div className="col-span-2 py-4 px-6 text-right text-[10px] font-black text-black uppercase tracking-widest bg-slate-100/30">Tổng (Đạt/Đặt)</div>
                        </div>

                        {/* Matrix Body */}
                        <div className="divide-y divide-black font-sans text-[13px]">
                          {processedVariants.length > 0 ? (
                            processedVariants.map((v, idx) => {
                              const sizeKeys = ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl'];
                              const rowTotal = sizeKeys.reduce((acc, k) => acc + (v[k] || 0), 0);

                              // Helper to normalize strings for matching
                              const normalize = (str) => {
                                if (!str) return "";
                                return str.toString()
                                  .toLowerCase()
                                  .normalize("NFD")
                                  .replace(/[\u0300-\u036f]/g, "")
                                  .replace(/đ/g, "d")
                                  .trim();
                              };

                              // Calculate bottleneck (MIN) across all stages
                              const stageData = sizeKeys.map(k => {
                                const targetSize = normalize(k);
                                const targetColor = normalize(v.color);
                                const targetQty = v[k] || 0;

                                if (targetQty === 0) return { actual: 0, target: 0 };

                                const countsPerStage = rawParts.map(part => {
                                  const partId = String(part.id || "");
                                  const variantLink = (part.listPartOrderSizes || []).find(l =>
                                    normalize(l.color || l.colorName || "") === targetColor &&
                                    normalize(l.size || l.sizeName || "") === targetSize
                                  );
                                  const linkId = String(variantLink?.id || "");

                                  return allLogs
                                    .filter(log => {
                                      const logPartId = String(log.productionPartId || log.partId || "");
                                      const logLinkId = String(log.partOrderSizeId || log.productionPartOrderSizeId || "");
                                      const logColor = normalize(log.color || log.colorName || "");
                                      const logSize = normalize(log.size || log.sizeName || "");

                                      const isMatch = (logPartId === partId) &&
                                        (logLinkId === linkId || (logColor === targetColor && logSize === targetSize));
                                      const isApproved = log.isReadOnly === true || log.isReadOnly === 1 || [2, 4].includes(Number(log.status));
                                      return isMatch && isApproved;
                                    })
                                    .reduce((sum, l) => sum + (Number(l.confirmedQuantity || l.quantity || 0)), 0);
                                });

                                const actual = countsPerStage.length > 0 ? Math.min(...countsPerStage) : 0;
                                return { actual, target: targetQty };
                              });

                              const rowActual = stageData.reduce((sum, d) => sum + d.actual, 0);

                              return (
                                <div key={idx} className="grid grid-cols-11 items-stretch hover:bg-slate-50/50 transition-all divide-x divide-black">
                                  <div className="col-span-2 py-4 px-6 flex items-center bg-slate-50/10">
                                    <span className="text-[12px] font-black text-black uppercase tracking-tight truncate">{v.color}</span>
                                  </div>
                                  {sizeKeys.map((k, sIdx) => {
                                    const { actual, target } = stageData[sIdx];
                                    return (
                                      <div key={k} className="col-span-1 py-3 text-center flex flex-col items-center justify-center">
                                        {target > 0 ? (
                                          <>
                                            <span className={`text-[12px] font-black ${actual >= target ? 'text-emerald-600' : actual > 0 ? 'text-blue-600' : 'text-slate-900'}`}>{actual}</span>
                                            <div className="w-4 h-[1px] bg-slate-200 my-0.5" />
                                            <span className="text-[10px] font-bold text-slate-400">{target}</span>
                                          </>
                                        ) : (
                                          <span className="text-slate-200">-</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                  <div className="col-span-2 py-4 px-6 text-right flex items-center justify-end bg-slate-50/10">
                                    <div className="flex flex-col items-end">
                                      <span className={`text-[14px] font-black ${rowActual >= rowTotal && rowTotal > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>{rowActual.toLocaleString()}</span>
                                      <span className="text-[10px] font-bold text-slate-400">/ {rowTotal.toLocaleString()}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="py-20 flex flex-col items-center justify-center bg-slate-50/30">
                              <Package className="text-slate-200 mb-4" size={32} />
                              <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Chưa có dữ liệu phân bổ</p>
                            </div>
                          )}
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

      <ConfirmModal
        isOpen={isApproveOrderConfirmOpen}
        onClose={() => setIsApproveOrderConfirmOpen(false)}
        onConfirm={confirmApproveProduction}
        title="Chấp nhận đơn sản xuất"
        description="Bạn có chắc chắn muốn chấp nhận đơn sản xuất này? Đơn sẽ chuyển sang trạng thái dự kiến sản xuất."
        primaryLabel="Xác nhận chấp nhận"
        requireReason={false}
        variant="success"
      />
      <ConfirmModal
        isOpen={isApprovePlanConfirmOpen}
        onClose={() => setIsApprovePlanConfirmOpen(false)}
        onConfirm={confirmApprovePlan}
        title="Phê duyệt kế hoạch"
        description="Hành động này sẽ phê duyệt kế hoạch sản xuất hiện tại."
        primaryLabel="Phê duyệt"
        requireReason={false}
        variant="success"
      />
      <ConfirmModal
        isOpen={isRequestPlanUpdateConfirmOpen}
        onClose={() => setIsRequestPlanUpdateConfirmOpen(false)}
        onConfirm={(reason) => {
           confirmRequestPlanUpdate(reason);
        }}
        title="Yêu cầu sửa kế hoạch"
        description="Gửi yêu cầu yêu cầu PM chỉnh sửa lại kế hoạch sản xuất."
        primaryLabel="Gửi yêu cầu"
        requireReason={false}
        variant="warning"
      />
      <ConfirmModal
        isOpen={isDonePartModalOpen}
        onClose={() => setIsDonePartModalOpen(false)}
        onConfirm={confirmDonePart}
        title="Xác nhận hoàn thành"
        description="Bạn có chắc chắn muốn đánh dấu công đoạn này đã hoàn thành?"
        primaryLabel="Xác nhận xong"
        requireReason={false}
      />
      <ConfirmModal
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        onConfirm={confirmCompleteProduction}
        title="Hoàn thành dự án"
        description="Mọi hoạt động sản xuất cho mã đơn này sẽ được đóng lại và đánh dấu là Hoàn Thành."
        primaryLabel="Hoàn thành dự án"
        requireReason={false}
      />

      <ConfirmModal 
        isOpen={isReasonModalOpen} 
        onClose={() => setIsReasonModalOpen(false)} 
        onConfirm={handleRejectProduction} 
        title={isOwner ? "Hủy giao việc" : "Từ chối đơn sản xuất"} 
        requireReason={true} 
        variant="danger" 
      />
    </OwnerLayout>
  );
}

function StageMatrix({ steps, allLogs = [], isInProduction, isOwner, isPM, navigate, handleDonePart, handleBaoLoi, getPlanStatusLabel, getVariantStatusLabel, toast }) {
  const [expandedStageIds, setExpandedStageIds] = useState(new Set());

  // Group flat steps by partName/partId
  const groups = useMemo(() => {
    const map = new Map();
    steps.forEach(row => {
      const key = row.partId ?? row.partName;
      if (!map.has(key)) {
        map.set(key, { key, partName: row.partName, unitPrice: row.unitPrice, variants: [] });
      }
      map.get(key).variants.push(row);
    });
    return Array.from(map.values());
  }, [steps]);

  const toggleStage = (key) => {
    setExpandedStageIds(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const getStageStatus = (variants, getPlanStatusLabel) => {
    const statuses = variants.map(v => v.statusName || getPlanStatusLabel(v.statusId || v.status));
    if (statuses.every(s => s === "Đã Hoàn Thành" || s === "Hoàn Thành")) return "Đã Hoàn Thành";
    if (statuses.some(s => s === "Báo Lỗi" || s === "Sự Cố")) return "Báo Lỗi";
    if (statuses.some(s => s === "Chờ Nghiệm Thu")) return "Chờ Nghiệm Thu";
    if (statuses.some(s => s === "Đang Sản Xuất" || s === "Đang Thực Hiện")) return "Đang Sản Xuất";
    if (statuses.some(s => s === "Đợi Xác Nhận" || s === "Chờ Chấp Nhận")) return "Đợi Xác Nhận";
    return "Chưa Thực Hiện";
  };

  const STATUS_CONFIG = {
    // Stage-level (PPS)
    "Đã Hoàn Thành": { color: "text-emerald-700", bg: "bg-emerald-50", dot: "bg-emerald-500", label: "Đã hoàn thành" },
    "Hoàn Thành": { color: "text-emerald-700", bg: "bg-emerald-50", dot: "bg-emerald-500", label: "Đã hoàn thành" },
    "Đang Sản Xuất": { color: "text-blue-700", bg: "bg-blue-50", dot: "bg-blue-500", label: "Đang sản xuất" },
    // Variant-level (PPOSS)
    "Đang Thực Hiện": { color: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-500", label: "Đang thực hiện" },
    "Chờ Nghiệm Thu": { color: "text-indigo-700", bg: "bg-indigo-50", dot: "bg-indigo-400", label: "Chờ nghiệm thu" },
    // Common
    "Chưa Thực Hiện": { color: "text-gray-400", bg: "bg-gray-50", dot: "bg-gray-300", label: "Chưa thực hiện" },
    "Báo Lỗi": { color: "text-rose-600", bg: "bg-rose-50", dot: "bg-rose-500", label: "Báo lỗi" },
    "Sự Cố": { color: "text-rose-600", bg: "bg-rose-50", dot: "bg-rose-500", label: "Sự cố" },
    "Đợi Xác Nhận": { color: "text-indigo-600", bg: "bg-indigo-50", dot: "bg-indigo-400", label: "Đợi xác nhận" },
    "Chờ Chấp Nhận": { color: "text-indigo-600", bg: "bg-indigo-50", dot: "bg-indigo-400", label: "Đợi xác nhận" },
  };

  if (steps.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center gap-3 text-gray-300 border-t border-gray-100">
        <Layers size={36} />
        <p className="text-[10px] font-black uppercase tracking-widest">Chưa có kế hoạch thiết lập</p>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-100 divide-y divide-gray-100">
      {/* Header */}
      <div className="grid grid-cols-12 items-center px-6 py-3 bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
        <div className="col-span-4 text-xs font-black text-gray-500 uppercase tracking-widest">Công đoạn</div>
        <div className="col-span-3 text-xs font-black text-gray-500 uppercase tracking-widest text-center">Biến thể</div>
        <div className="col-span-2 text-xs font-black text-gray-500 uppercase tracking-widest text-center">Sản lượng</div>
        <div className="col-span-2 text-xs font-black text-gray-500 uppercase tracking-widest text-center">Trạng thái</div>
        <div className="col-span-1"></div>
      </div>

      {groups.map((group, gIdx) => {
        const isExpanded = expandedStageIds.has(group.key);
        const stageStatus = getStageStatus(group.variants, getPlanStatusLabel);
        const cfg = STATUS_CONFIG[stageStatus] || STATUS_CONFIG["Chưa Thực Hiện"];
        const totalQty = group.variants.reduce((s, v) => s + (Number(v.quantity) || 0), 0);

        // Calculate dynamic actual quantity from allLogs
        const actualQty = group.variants.reduce((sum, v) => {
          const variantLogs = allLogs.filter(log =>
            String(log.productionPartId || log.partId) === String(v.partId) &&
            String(log.partOrderSizeId || log.orderSizeId) === String(v.id)
          );
          const logTotal = variantLogs
            .filter(log => log.isReadOnly === true || log.isReadOnly === 1)
            .reduce((acc, log) => acc + (log.quantity || 0), 0);
          return sum + (logTotal || 0);
        }, 0);

        const pct = totalQty > 0 ? Math.min(100, Math.round((actualQty / totalQty) * 100)) : 0;
        const allAssignees = [];
        const seenIds = new Set();
        group.variants.forEach(v => (v.assignees || []).forEach(w => {
          const wid = w.id || w.name || w.fullName;
          if (!seenIds.has(wid)) { seenIds.add(wid); allAssignees.push(w); }
        }));

        return (
          <div key={group.key} className="group/stage">
            {/* Stage Row */}
            <div
              onClick={() => toggleStage(group.key)}
              className="w-full grid grid-cols-12 items-center px-6 py-2.5 hover:bg-emerald-50/30 transition-all text-left gap-2 cursor-pointer"
            >
              {/* Stage Name */}
              <div className="col-span-4 flex items-center gap-3 min-w-0">
                <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-black text-gray-600 border border-gray-200">
                  {gIdx + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-black text-gray-900 uppercase tracking-tight truncate leading-snug">{group.partName}</p>
                  {group.unitPrice > 0 && (
                    <p className="text-[11px] font-black text-rose-600 mt-1.5 bg-rose-50 px-2 py-0.5 rounded-md inline-flex items-center gap-1 border border-rose-100 shadow-sm">
                      <span className="text-[10px] opacity-70">₫</span>{Number(group.unitPrice).toLocaleString()}<span className="text-[8px] opacity-60 ml-0.5">/sp</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Variant chips */}
              <div className="col-span-3 flex flex-wrap gap-1.5 px-2 justify-center">
                {group.variants.slice(0, 5).map((v, vi) => {
                  const vs = getVariantStatusLabel
                    ? getVariantStatusLabel(v.variantStatusId)
                    : (v.statusName || "Chưa Thực Hiện");
                  const vDone = vs === "Đã Hoàn Thành";
                  const vCfg = STATUS_CONFIG[vs] || STATUS_CONFIG["Chưa Thực Hiện"];
                  return (
                    <span
                      key={vi}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold uppercase border ${vDone ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : `${vCfg.bg} border-${vCfg.dot.replace('bg-', '')} ${vCfg.color}`}`}
                    >
                      <span>{v.colorName || v.color || '?'}</span>
                      <span className="text-slate-300 font-normal">/</span>
                      <span>{v.sizeName || v.size || '?'}</span>
                    </span>
                  );
                })}
                {group.variants.length > 5 && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                    +{group.variants.length - 5}
                  </span>
                )}
              </div>

              {/* Progress */}
              <div className="col-span-2 flex flex-col items-center gap-1.5 px-2">
                <span className="text-sm font-black text-[#1e6e43]">{actualQty}/{totalQty}</span>
                <div className="w-full max-w-[80px] h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[10px] font-bold text-gray-500">{pct}%</span>
              </div>

              {/* Status */}
              <div className="col-span-2 flex items-center justify-center">
                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black uppercase ${cfg.color} ${cfg.bg}`}>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                  {cfg.label}
                </span>
              </div>

              {/* Expand toggle */}
              <div className="col-span-1 flex items-center justify-end">
                <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-500 group-hover/stage:bg-gray-200 group-hover/stage:text-gray-700 transition-all">
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </span>
              </div>
            </div>

            {/* Expanded Variants */}
            {isExpanded && (
              <div className="bg-gray-50/60 border-t border-dashed border-gray-200">
                {/* Sub-header */}
                <div className="grid grid-cols-12 items-center px-6 py-2 border-b border-gray-200 bg-gray-100/50">
                  <div className="col-span-1" />
                  <div className="col-span-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Màu / Size</div>
                  <div className="col-span-2 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Sản lượng</div>
                  <div className="col-span-2 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Nhân sự</div>
                  <div className="col-span-2 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Trạng thái</div>
                  <div className="col-span-2 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Thao tác</div>
                </div>
                {group.variants.map((row, vi) => {
                  const partStatus = getVariantStatusLabel
                    ? getVariantStatusLabel(row.variantStatusId)
                    : (row.statusName || "Chưa Thực Hiện");
                  const isDone = partStatus === "Đã Hoàn Thành";
                  const vcfg = STATUS_CONFIG[partStatus] || STATUS_CONFIG["Chưa Thực Hiện"];
                  const vPct = (row.quantity > 0) ? Math.min(100, Math.round(((row.actualQuantity || 0) / row.quantity) * 100)) : 0;

                  return (
                    <div key={vi} className="grid grid-cols-12 items-center px-6 py-3 hover:bg-white/90 transition-all group/row border-b border-gray-100 last:border-0">
                      {/* Color dot */}
                      <div className="col-span-1 flex justify-center">
                        <div className="w-3 h-3 rounded-full border-2 border-white shadow" style={{ backgroundColor: row.colorCode || row.variant?.colorCode || '#e2e8f0' }} />
                      </div>
                      {/* Color / Size */}
                      <div className="col-span-3 flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-800 uppercase">{row.colorName || row.color || '-'}</span>
                        <span className="text-gray-300">/</span>
                        <span className="px-2 py-0.5 rounded bg-white border border-gray-200 text-xs font-black text-gray-700 uppercase shadow-sm">{row.sizeName || row.size || '-'}</span>
                      </div>
                      {/* Quantity */}
                      <div className="col-span-2 flex flex-col items-center gap-1">
                        {(() => {
                          const variantLogs = allLogs.filter(log =>
                            String(log.productionPartId || log.partId) === String(row.partId) &&
                            String(log.partOrderSizeId || log.orderSizeId) === String(row.id)
                          );
                          const logTotal = variantLogs
                            .filter(log => log.isReadOnly === true || log.isReadOnly === 1)
                            .reduce((acc, log) => acc + (log.quantity || 0), 0);
                          const liveActual = logTotal || 0;
                          const rowPct = (row.quantity > 0) ? Math.min(100, Math.round((liveActual / row.quantity) * 100)) : 0;

                          return (
                            <>
                              <span className="text-sm font-black text-[#1e6e43]">{liveActual}/{row.quantity || 0}</span>
                              <div className="w-14 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-400 transition-all" style={{ width: `${rowPct}%` }} />
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      {/* Assignees */}
                      <div className="col-span-2 flex flex-wrap gap-1.5 justify-center">
                        {(row.assignees || []).length > 0 ? (
                          (row.assignees || []).map((w, wi) => (
                            <span
                              key={wi}
                              className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-[10px] font-bold text-[#1e6e43] border border-emerald-200 whitespace-nowrap shadow-sm"
                            >
                              {w.fullName || w.name || "?"}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-gray-400 font-semibold italic">Chưa phân công</span>
                        )}
                      </div>
                      {/* Status */}
                      <div className="col-span-2 flex justify-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${vcfg.color} ${vcfg.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${vcfg.dot}`} />
                          {vcfg.label}
                        </span>
                      </div>
                      {/* Actions */}
                      <div className="col-span-2 flex items-center justify-end gap-2 opacity-0 group-hover/row:opacity-100 transition-all">
                        <button onClick={() => handleBaoLoi(row)} title="Báo lỗi" className="p-2.5 rounded-xl hover:bg-rose-50 text-rose-500 hover:text-rose-600 transition-all border border-transparent hover:border-rose-200 shadow-sm active:scale-90">
                          <AlertTriangle size={22} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
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
