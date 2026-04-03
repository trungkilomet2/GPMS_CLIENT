import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, Info, Package, FileText, Download, AlertTriangle } from "lucide-react";
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
import { STATUS_STYLES as PRODUCTION_STATUS_STYLES, getProductionStatusLabel, getPlanStatusLabel, STATUS_STYLES } from "@/utils/statusUtils";
import { userService } from "@/services/UserService";
import ProductionPartService from "@/services/ProductionPartService";
import CuttingNotebookService from "@/services/CuttingNotebookService";
import { toast } from "react-toastify";
import Pagination from "@/components/Pagination";
import { Link } from "react-router-dom";
import { getStoredUser } from "@/lib/authStorage";
import { hasAnyRole } from "@/lib/roleAccess";
import "@/styles/homepage.css";
import "@/styles/leave.css";

const MOCK_PRODUCTIONS = [
  {
    productionId: 1001,
    status: "Đang Sản Xuất",
    pStartDate: "2026-04-21",
    pEndDate: "2026-05-05",
    note: "Ưu tiên hoàn thành trước 05/05 do sự kiện nội bộ.",
    order: {
      id: 29,
      orderName: "Đồng phục công ty ABC",
      type: "Đồng phục",
      size: "L",
      color: "Trắng",
      quantity: 100,
      cpu: 15000,
      startDate: "2026-04-15",
      endDate: "2026-05-05",
      status: "Đã chấp nhận",
      image: "",
      note: "Giao trong giờ hành chính.",
      materials: [
        { materialName: "Vải cotton", value: 120, uom: "m", note: "Cotton 65/35" },
        { materialName: "Cúc áo", value: 100, uom: "cái", note: "Màu trắng" },
      ],
      templates: [{ templateName: "Mẫu áo", type: "SOFT", file: "" }],
      customerName: "Công ty ABC",
      customerPhone: "0901234567",
      customerAddress: "Q.1, TP.HCM",
    },
  },
  {
    productionId: 1002,
    status: "Chờ Xét Duyệt Kế Hoạch",
    pStartDate: "2026-04-18",
    pEndDate: "2026-04-30",
    note: "Đang chờ duyệt mẫu in.",
    order: {
      id: 30,
      orderName: "Áo hoodie mùa đông",
      type: "Hoodie",
      size: "M",
      color: "Đen",
      quantity: 80,
      cpu: 22000,
      startDate: "2026-04-10",
      endDate: "2026-04-30",
      status: "Đã chấp nhận",
      image: "",
      note: "In logo trước ngực.",
      materials: [],
      templates: [],
      customerName: "Shop XYZ",
      customerPhone: "0912345678",
      customerAddress: "Q.3, TP.HCM",
    },
  },
];

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

  const [production, setProduction] = useState(null);
  const [customerProfile, setCustomerProfile] = useState(null);
  const [rejectReason, setRejectReason] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [steps, setSteps] = useState([]);
  const [totalParts, setTotalParts] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 10;
  
  const currentUser = getStoredUser();
  const roleValue = currentUser?.role ?? currentUser?.roles ?? currentUser?.roleName ?? "";
  const isOwner = hasAnyRole(roleValue, ["owner", "admin"]);
  const isPM = hasAnyRole(roleValue, ["pm", "manager"]);
  const isWorker = hasAnyRole(roleValue, ["worker", "kcs", "team leader"]);
  const currentUserId = currentUser?.id ?? currentUser?.userId ?? currentUser?.accountId;
  const isAssignedPM = isPM && String(currentUserId) === String(production?.pmId);
  const customerId = getOrderCustomerId(production?.order);
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

  useEffect(() => {
    let active = true;

    const normalizeDetail = (payload) => {
      if (!payload) return null;

      const resolvedStatus = getProductionStatusLabel(
        payload.statusName ?? payload.status ?? payload.statusId
      );

      const order = payload.order || {};
      return {
        productionId: payload.productionId ?? payload.id ?? null,
        status: resolvedStatus === "-" ? getProductionStatusLabel(1) : resolvedStatus,
        pStartDate: payload.startDate || payload.pStartDate || order.startDate || "",
        pEndDate: payload.endDate || payload.pEndDate || order.endDate || "",
        pmId: payload.pm?.id ?? payload.pmId ?? null,
        pmName: (payload.pm?.fullName ?? payload.pm?.name ?? payload.pmName) || (payload.pmId ? `PM #${payload.pmId}` : (payload.pm?.id ? `PM #${payload.pm.id}` : "")),
        note: payload.note ?? payload.productionNote ?? "",
        order: {
          ...order,
          size: typeof order.size === "string" ? order.size.trim() : order.size,
          status: order.statusName ?? order.status,
          templates: Array.isArray(order.templates)
            ? order.templates.map((t) => ({ ...t, templateName: t.templateName ?? t.name }))
            : order.templates,
          materials: Array.isArray(order.materials)
            ? order.materials.map((m) => ({ ...m, materialName: m.materialName ?? m.name }))
            : order.materials,
        },
      };
    };

    const fetchProduction = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await ProductionService.getProductionDetail(id);
        if (!active) return;

        const payload = response?.data?.data ?? response?.data ?? null;
        const normalized = normalizeDetail(payload);
        if (normalized) {
          setProduction(normalized);
          return;
        }

        setProduction(null);
        setError(`Không tìm thấy đơn sản xuất #${id}.`);
      } catch (_err) {
        if (!active) return;
        setError("Không thể tải chi tiết đơn sản xuất.");
        setProduction(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchProduction();
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    let active = true;

    const loadCustomerProfile = async () => {
      if (!customerId || !isOwner) {
        if (active) setCustomerProfile(null);
        return;
      }

      try {
        const profile = await userService.getProfileById(customerId);
        if (active) setCustomerProfile(profile || null);
      } catch (err) {
        if (active) setCustomerProfile(null);
        console.error("Không thể tải hồ sơ khách hàng:", err);
      }
    };

    loadCustomerProfile();
    return () => {
      active = false;
    };
  }, [customerId]);

  useEffect(() => {
    let active = true;

    const fetchRejectReason = async () => {
      if (!production?.productionId) return;
      const rejLabel = getProductionStatusLabel(2); // "Từ Chối"
      const isRejected =
        String(production.status ?? "").trim().toLowerCase() ===
        String(rejLabel).trim().toLowerCase();
      console.debug("[rejectReason] status:", production.status, "isRejected:", isRejected);
      if (!isRejected) {
        if (active) setRejectReason(null);
        return;
      }
      try {
        const res = await ProductionService.getProductionRejectReason(production.productionId);
        // axiosClient interceptor already returns response.data, so res = API body = {data: {...}}
        const data = res?.data ?? null;
        console.debug("[rejectReason] data:", data);
        if (active) setRejectReason(data);
      } catch (err) {
        console.error("[rejectReason] fetch error:", err);
        if (active) setRejectReason(null);
      }
    };

    fetchRejectReason();
    return () => { active = false; };
  }, [production?.productionId, production?.status]);

  useEffect(() => {
    let active = true;
    const fetchParts = async () => {
      if (!production?.productionId) return;
      try {
        const res = await ProductionPartService.getPartsByProduction(production.productionId, {
          PageIndex: 0,
          PageSize: 50,
          SortColumn: "Name",
          SortOrder: "ASC",
        });
        if (!active) return;
        const list = res?.data?.data ?? res?.data?.items ?? (Array.isArray(res?.data) ? res.data : []);
        setSteps(list);
        setTotalParts(list.length);
      } catch (err) { console.error("Lỗi tải công đoạn:", err); }
    };
    fetchParts();
    return () => { active = false; };
  }, [production?.productionId]);



  const pageData = useMemo(() => {
    const start = pageIndex * pageSize;
    return steps.slice(start, start + pageSize);
  }, [steps, pageIndex]);

  const order = production?.order || {};
  const isApprovedProduction = production?.status && !["Chờ Xét Duyệt", "Từ Chối", "-"].includes(production.status);
  const softTemplates = Array.isArray(order.templates) ? order.templates.filter(t => t.type !== "HARD") : [];

  if (loading) {
    return (
      <OwnerLayout>
        <div className="flex flex-col items-center justify-center min-h-400px text-sm text-slate-600">
          Đang tải chi tiết đơn sản xuất...
        </div>
      </OwnerLayout>
    );
  }

  if (!production) {
    return (
      <OwnerLayout>
        <div className="flex flex-col items-center justify-center min-h-400px text-sm text-slate-600">
          {error || `Không tìm thấy đơn sản xuất #${id}.`}
        </div>
      </OwnerLayout>
    );
  }

  const rejectedStatusLabel = getProductionStatusLabel(2); // "Từ Chối"



  const handleApproveProduction = async () => {
    if (isActionLocked) return;
    setIsApproveOrderConfirmOpen(true);
  };

  const confirmApproveProduction = async () => {
    try {
      const userId = currentUser?.id ?? currentUser?.userId ?? currentUser?.accountId;
      if (!userId) {
        toast.error("Không tìm thấy thông tin người dùng.");
        return;
      }
      await ProductionService.approveProduction(production.productionId, { userId });
      setProduction((prev) => (prev ? { ...prev, status: getProductionStatusLabel(4) } : prev));
      setIsApproveOrderConfirmOpen(false);
      setIsSuccessModalOpen(true);
    } catch (err) {
      console.error("Lỗi khi chấp nhận đơn sản xuất:", err);
      const errorMsg = err.response?.data?.message || err.message || "Đã xảy ra lỗi khi chấp nhận đơn sản xuất.";
      toast.error(errorMsg);
    }
  };

  const handleRejectProduction = async (reason) => {
    if (isActionLocked && !isOwner) return;
    if (statusName === "Hoàn thành") return;
    try {
      const uId = currentUser?.id ?? currentUser?.userId ?? currentUser?.accountId;
      if (!uId) {
        toast.error("Không tìm thấy thông tin người dùng.");
        return;
      }

      const userId = Number(uId);
      const productionId = Number(production.productionId);

      console.debug("[rejectProduction] Sending:", { productionId, userId, reason });

      const res = await ProductionService.rejectProduction(productionId, { userId, reason });
      console.debug("[rejectProduction] Success:", res);

      setProduction((prev) => (prev ? { ...prev, status: getProductionStatusLabel(2) } : prev));
      setIsReasonModalOpen(false);
      setIsRejectSuccessModalOpen(true);
    } catch (err) {
      console.error("Lỗi khi từ chối đơn sản xuất:", err);
      const data = err.response?.data;
      const backendError = data?.detail || data?.message || data?.title || (typeof data === 'string' ? data : "");
      console.error("Chi tiết lỗi từ Backend:", backendError);

      const errorMsg = backendError || err.message || "Đã xảy ra lỗi khi từ chối đơn sản xuất.";
      toast.error(errorMsg);
    }
  };

  const handleDonePart = (partId) => {
    if (!(isOwner || isPM)) return;
    setSelectedPartId(partId);
    setIsDonePartModalOpen(true);
  };

  const confirmDonePart = async () => {
    if (!selectedPartId) return;

    try {
      setLoading(true);
      const uId = currentUser?.id ?? currentUser?.userId ?? currentUser?.accountId;
      const userId = Number(uId);

      console.debug("[donePart] Sending:", { partId: selectedPartId, userId });

      // Many APIs in this project expect a payload even for PATCH
      await ProductionPartService.donePart(selectedPartId, { userId });

      toast.success("Đã xác nhận hoàn thành công đoạn.");
      setIsDonePartModalOpen(false);
      // Refresh the page after a short delay to allow toast visibility
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error("Lỗi khi hoàn thành công đoạn:", err);
      const data = err.response?.data;
      const backendError = data?.detail || data?.message || data?.title || (typeof data === 'string' ? data : "");
      console.error("Chi tiết lỗi từ Backend:", backendError);

      const errorMsg = backendError || err.message || "Không thể hoàn thành công đoạn.";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
      setSelectedPartId(null);
    }
  };

  const confirmCompleteProduction = async () => {
    try {
      setLoading(true);
      const uId = currentUser?.id ?? currentUser?.userId ?? currentUser?.accountId;
      const userId = Number(uId);

      await ProductionService.completeProduction(production.productionId, { userId });

      toast.success("Đã hoàn thành đơn sản xuất!");
      setIsCompleteModalOpen(false);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error("Lỗi khi hoàn thành đơn sản xuất:", err);
      const data = err.response?.data;
      const backendError = data?.detail || data?.message || data?.title || (typeof data === 'string' ? data : "");
      const errorMsg = backendError || err.message || "Không thể hoàn thành đơn sản xuất.";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
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
          openCuttingBookMode: "list", // Default to list view
          filterByProduction: true,
        },
      });
    } finally { setCheckingCuttingBook(false); }
  };

  const handleApprovePlan = () => setIsApprovePlanConfirmOpen(true);
  const confirmApprovePlan = async () => {
    try {
      await ProductionService.approveProductionPlan(production.productionId);
      toast.success("Đã duyệt kế hoạch");
      setIsApprovePlanConfirmOpen(false);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) { toast.error("Không thể duyệt kế hoạch"); }
  };

  const handleRequestPlanUpdate = () => setIsRequestPlanUpdateConfirmOpen(true);
  const confirmRequestPlanUpdate = async () => {
    try {
      await ProductionService.requestPlanUpdate(production.productionId);
      toast.success("Đã gửi yêu cầu sửa");
      setIsRequestPlanUpdateConfirmOpen(false);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) { toast.error("Không thể gửi yêu cầu"); }
  };

  const handleSubmitPlan = () => {
    if (steps.length === 0) {
      toast.warn("Vui lòng tạo ít nhất một công đoạn trước khi gửi duyệt.");
      return;
    }
    setIsSubmitPlanConfirmOpen(true);
  };

  const confirmSubmitPlan = async () => {
    try {
      await ProductionService.submitProductionPlan(production.productionId);
      toast.success("Đã gửi duyệt kế hoạch.");
      setIsSubmitPlanConfirmOpen(false);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      toast.error("Không thể gửi duyệt kế hoạch.");
    }
  };


  return (
    <OwnerLayout>
      <div className="leave-page leave-list-page">
        <div className="leave-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <button onClick={() => navigate(location.state?.from || '/production')}
                className="cursor-pointer mt-1 rounded-xl border border-slate-200 p-2 text-slate-400 transition hover:bg-slate-50"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  Chi tiết đơn sản xuất #PR-{production.productionId}
                </h1>
                <p className="text-slate-600">Theo dõi thông tin đơn sản xuất và đơn hàng liên quan.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Nút cho PM duyệt ĐƠN sản xuất ban đầu */}
              {isPM && isPendingApproval && (
                <>
                  <button type="button"
                    onClick={() => setIsApproveModalOpen(true)}
                    className="cursor-pointer rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                  >
                    Chấp nhận đơn
                  </button>
                  <button type="button"
                    onClick={() => setIsReasonModalOpen(true)}
                    className="cursor-pointer rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                  >
                    Từ chối đơn
                  </button>
                </>
              )}

              {/* Nút cho Owner hủy ĐƠN sản xuất trực tiếp */}
              {isOwner && isPendingApproval && (
                <button type="button"
                  onClick={() => setIsReasonModalOpen(true)}
                  className="cursor-pointer rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                  title="Hủy đơn sản xuất ngay lập tức"
                >
                  Hủy đơn sản xuất
                </button>
              )}

              {/* Nút cho Owner duyệt KẾ HOẠCH sau khi PM gửi */}
              {isOwner && isPendingPlanApproval && (
                <>
                  <button type="button"
                    onClick={handleApprovePlan}
                    className="cursor-pointer rounded-xl border border-emerald-200 bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 shadow-sm"
                  >
                    Duyệt KH
                  </button>
                  <button type="button"
                    onClick={handleRequestPlanUpdate}
                    className="cursor-pointer rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                  >
                    Yêu cầu sửa KH
                  </button>
                </>
              )}

              {/* Nút cho PM lập kế hoạch và gửi duyệt */}
              {isAssignedPM && (isAccepted || isNeedUpdatePlan) && (
                <>
                  <Link
                    to="/production-plan/create"
                    state={{ productionId: production.productionId, steps }}
                    className="rounded-xl border border-emerald-600 px-4 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50"
                  >
                    {steps.length > 0 ? "Chỉnh sửa công đoạn" : "Thiết kế công đoạn"}
                  </Link>
                  {steps.length > 0 && (
                    <button type="button"
                      onClick={handleSubmitPlan}
                      className="cursor-pointer rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 shadow-md"
                    >
                      Gửi duyệt kế hoạch
                    </button>
                  )}
                </>
              )}

              {/* Các nút khi đã duyệt kế hoạch hoặc đang sản xuất */}
              {(isPM || isOwner || isWorker) && (isInProduction || isPendingPlanApproval || isAccepted) && (
                <button type="button"
                  onClick={handleOpenCuttingBook}
                  disabled={checkingCuttingBook}
                  className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  {checkingCuttingBook ? "Đang kiểm tra..." : "Sổ cắt"}
                </button>
              )}

              {(isPM || isOwner) && isInProduction && (
                <Link
                  to="/output-history"
                  state={{ productionId: production.productionId, production }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Lịch sử báo cáo
                </Link>
              )}

              {(isOwner || isPM) && isInProduction && allStepsCompleted && (
                <button type="button"
                  onClick={() => setIsCompleteModalOpen(true)}
                  className="cursor-pointer rounded-xl border border-emerald-200 bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 shadow-sm"
                >
                  Hoàn thành đơn sản xuất
                </button>
              )}

              {(isInProduction || isAccepted) && (() => {
                const user = getStoredUser();
                const userId = String(user?.id || user?.userId || user?.accountId || "").trim().toLowerCase();
                const userName = (user?.fullName || user?.name || user?.userName || "").toLowerCase().trim();

                const isAssignedToAny = steps.some(row => {
                  const rawAssignees = [
                    ...(Array.isArray(row.assignees) ? row.assignees : []),
                    ...(Array.isArray(row.assignedWorkers) ? row.assignedWorkers : []),
                    ...(Array.isArray(row.workers) ? row.workers : [])
                  ];
                  return rawAssignees.some(val => {
                    if (!val) return false;
                    if (typeof val === 'object') {
                      const vid = String(val.id || val.userId || val.accountId || "").trim().toLowerCase();
                      const vname = (val.fullName || val.name || val.userName || "").toLowerCase().trim();
                      return (userId && vid === userId) || (userName && vname === userName);
                    }
                    const s = String(val).toLowerCase().trim();
                    return (userId && s === userId) || (userName && s === userName);
                  });
                });

                if (isAssignedToAny) {
                  return (
                    <Link
                      to="/worker/daily-report"
                      state={{ 
                        plan: { 
                          production: { ...production, orderName: order.orderName }, 
                          product: order,
                          steps: steps.map(s => ({ ...s, id: s.id ?? s.partId, partName: s.partName ?? s.name, cpu: s.cpu ?? s.unitPrice ?? s.price })) 
                        } 
                      }}
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-700 shadow-md"
                    >
                      Báo cáo sản lượng
                    </Link>
                  );
                }
                return null;
              })()}

              {(isPM || isOwner) && isInProduction && (
                <Link
                  to={`/production-plan/assign/${production.productionId}`}
                  state={{ production, product: { ...order, productName: order.orderName }, steps }}
                  className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-900"
                >
                  {steps.some(s => Array.isArray(s.assignees) && s.assignees.length > 0)
                    ? "Chỉnh sửa phân công"
                    : "Phân công lao động"}
                </Link>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2 text-slate-600">
              <Info size={16} />
              <h2 className="text-xs font-bold uppercase tracking-widest">Thông tin đơn sản xuất</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-slate-100">
              <DetailRow label="Mã đơn sản xuất" value={`#PR-${production.productionId}`} />
              <DetailRow label="Trạng thái" value={production.status} />
              <DetailRow label="PM quản lý" value={production.pmName || (production.pmId ? `PM #${production.pmId}` : "-")} />
            </div>



            <div className="p-5 border-t border-slate-100 bg-amber-50/30">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Ghi chú đơn sản xuất</p>
              <p className="text-sm text-slate-700 leading-relaxed italic">
                {production.note || "Không có ghi chú cho đơn sản xuất này."}
              </p>
            </div>
          </div>

          {isRejectedProduction && rejectReason && (
            <div className="rounded-2xl border border-red-200 bg-red-50/80 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-red-100 bg-red-100/60 flex items-center gap-2 text-red-700">
                <AlertTriangle size={16} />
                <h2 className="text-xs font-bold uppercase tracking-widest">Lý do từ chối</h2>
              </div>
              <div className="p-5">
                <p className="text-sm text-red-800 leading-relaxed italic">
                  {rejectReason.reason || "Không có lý do được ghi nhận."}
                </p>
                {rejectReason.createdAt && (
                  <p className="mt-3 text-[11px] text-red-400 font-medium">
                    Thời gian từ chối:{" "}
                    {new Date(rejectReason.createdAt).toLocaleString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2 text-slate-600">
                  <Info size={16} />
                  <h2 className="text-xs font-bold uppercase tracking-widest">Thông tin đơn hàng</h2>
                </div>
                <div className="px-5 py-4 border-b border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-3">Ảnh đơn hàng</div>
                  <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-center">
                    <div className="w-32 h-32 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center shadow-sm">
                      {order.image ? (
                        <img src={order.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[11px] text-slate-400">-</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 leading-relaxed">
                      Ảnh tham khảo tổng quan đơn hàng để đối chiếu trước khi sản xuất.
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-slate-100">
                  <DetailRow label="Mã đơn hàng" value={order.id ? `#ĐH-${order.id}` : "-"} />
                  <DetailRow label="Tên đơn hàng" value={order.orderName} />
                  <DetailRow label="Loại đơn hàng" value={order.type} />
                  <DetailRow label="Màu sắc" value={order.color} />
                  <DetailRow label="Kích thước" value={order.size} />
                  <DetailRow label="Số lượng" value={order.quantity ? `${order.quantity}` : "-"} />
                  <DetailRow label="Đơn giá" value={order.cpu ? `${order.cpu} VND/SP` : "-"} />
                  <DetailRow label="Tổng tiền" value={order.quantity && order.cpu ? `${(order.quantity * order.cpu).toLocaleString("vi-VN")} VND` : "-"} />
                  <DetailRow label="Ngày bắt đầu" value={formatOrderDate(order.startDate)} />
                  <DetailRow label="Ngày kết thúc" value={formatOrderDate(order.endDate)} />
                  <DetailRow label="Trạng thái" value={order.status} />
                </div>
                <div className="p-5 border-t border-slate-100 bg-amber-50/30">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Ghi chú đơn hàng</p>
                  <p className="text-sm text-slate-700 leading-relaxed italic">
                    {order.note || "Không có ghi chú bổ sung cho đơn hàng này."}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2 text-slate-600">
                  <Package size={16} />
                  <h2 className="text-xs font-bold uppercase tracking-widest">Danh sách vật liệu sản xuất</h2>
                </div>
                <MaterialsTable
                  materials={order.materials ?? []}
                  variant="detail"
                  showImage
                  emptyText={MATERIALS_TABLE_EMPTY_TEXT.detail}
                />
              </div>

              {isApprovedProduction && (
                <div className="space-y-6">


                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                      <h2 className="text-xs font-bold uppercase tracking-widest text-slate-600">Danh sách công đoạn & nhiệm vụ</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm divide-y divide-slate-100">
                        <thead className="bg-slate-50/50">
                          <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <th className="px-4 py-3 text-left">STT</th>
                            <th className="px-4 py-3 text-left">Tên công đoạn</th>
                            <th className="px-4 py-3 text-left">Thợ được giao</th>
                            <th className="px-4 py-3 text-left">Bắt đầu</th>
                            <th className="px-4 py-3 text-left">Kết thúc</th>
                            <th className="px-4 py-3 text-right">Giá/SP</th>
                            <th className="px-4 py-3 text-center">Trạng thái</th>
                            <th className="px-4 py-3 text-center">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {pageData.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-3 text-slate-400">{(pageIndex * pageSize + idx + 1).toString().padStart(2, '0')}</td>
                              <td className="px-4 py-3 font-semibold text-slate-900">{row.partName || row.name}</td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1">
                                  {Array.isArray(row.assignees) && row.assignees.length > 0 ? (
                                    row.assignees.map((w, wIdx) => (
                                      <span key={wIdx} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-100">
                                        {w.fullName || w.name || w.id}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-slate-300 italic text-[11px]">Chưa giao</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-slate-600 text-[11px] leading-tight">
                                {formatDateTime(row.startDate)}
                              </td>
                              <td className="px-4 py-3 text-slate-600 text-[11px] leading-tight">
                                {formatDateTime(row.endDate)}
                              </td>
                              <td className="px-4 py-3 text-right font-black text-slate-900 whitespace-nowrap">
                                {Number(row.cpu).toLocaleString('vi-VN')} đ
                              </td>
                              <td className="px-4 py-3 text-center">
                                {(() => {
                                  const label = row.statusName || getPlanStatusLabel(row.statusId || row.status);
                                  const style = STATUS_STYLES[label] || STATUS_STYLES.default;
                                  return (
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border whitespace-nowrap shadow-sm ${style}`}>
                                      {label}
                                    </span>
                                  );
                                })()}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <Link
                                    to="/worker/error-report"
                                    state={{
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
                                    }}
                                    className="text-[10px] font-bold text-rose-600 hover:text-rose-700 underline"
                                  >
                                    Báo lỗi
                                  </Link>
                                  {(isOwner || isPM) && (row.statusName === "Chờ Nghiệm Thu" || getPlanStatusLabel(row.statusId || row.status) === "Chờ Nghiệm Thu") && (
                                    <button
                                      type="button"
                                      onClick={() => handleDonePart(row.id || row.partId)}
                                      className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 underline cursor-pointer"
                                    >
                                      Hoàn thành
                                    </button>
                                  )}
                                  <Link
                                    to={`/production/part/${row.id}/history`}
                                    state={{ part: row, production }}
                                    className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 underline"
                                  >
                                    Lịch sử
                                  </Link>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {steps.length === 0 && (
                            <tr><td colSpan="8" className="py-10 text-center text-slate-400 italic">Chưa lập kế hoạch công đoạn</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {totalParts > pageSize && (
                      <div className="p-4 border-t border-slate-100">
                        <Pagination currentPage={pageIndex + 1} totalPages={Math.ceil(totalParts / pageSize)} onPageChange={(p) => setPageIndex(p - 1)} />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {isOwner && (
                <CustomerInfoCard
                  order={order}
                  profile={customerProfile}
                  title="Thông tin khách hàng"
                  nameLabel="Họ tên"
                  phoneLabel="SĐT"
                  addressLabel="Địa chỉ"
                />
              )}

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-5">
                <div>
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Mẫu thiết kế</h2>
                  <div className="space-y-2">
                    {softTemplates.length > 0 ? (
                      softTemplates.map((file, idx) => {
                        const fileName = file.templateName ?? file.name ?? `File ${idx + 1}`;
                        const fileUrl = file.file ?? file.url ?? "";
                        return (
                          <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-100 p-3 transition hover:border-emerald-200">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <FileText size={18} className="text-emerald-600 shrink-0" />
                              <div className="overflow-hidden">
                                <p className="text-sm font-bold text-slate-700 truncate">{fileName}</p>
                                {file.size && <p className="text-[10px] text-slate-400 font-bold uppercase">{file.size}</p>}
                              </div>
                            </div>
                            {fileUrl ? (
                              <a href={fileUrl} download target="_blank" rel="noreferrer" className="text-slate-400 hover:text-emerald-600">
                                <Download size={16} />
                              </a>
                            ) : (
                              <span className="text-[10px] text-slate-400">Không có link</span>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-center py-4 text-slate-400 text-[11px] italic">Không có file thiết kế</p>
                    )}
                  </div>
                </div>
              </div>


            </div>
          </div>
        </div>
      </div>

      <OrderStatusReasonModal
        isOpen={isReasonModalOpen}
        onClose={() => setIsReasonModalOpen(false)}
        onSubmit={handleRejectProduction}
        title="Từ chối đơn sản xuất"
        description="Vui lòng nhập lý do từ chối để lưu vào hệ thống."
        confirmText="Xác nhận từ chối"
        tone="danger"
        requireReason
      />
      <OrderStatusReasonModal
        isOpen={isApproveModalOpen}
        onClose={() => setIsApproveModalOpen(false)}
        onSubmit={() => {
          handleApproveProduction();
          setIsApproveModalOpen(false);
        }}
        title="Chấp nhận đơn sản xuất"
        description="Bạn có chắc muốn chấp nhận đơn sản xuất này không?"
        confirmText="Xác nhận"
        tone="warning"
        requireReason={false}
      />
      <OrderStatusReasonModal
        isOpen={isDonePartModalOpen}
        onClose={() => {
          setIsDonePartModalOpen(false);
          setSelectedPartId(null);
        }}
        onSubmit={confirmDonePart}
        title="Hoàn thành công đoạn"
        description="Bạn có chắc chắn muốn xác nhận hoàn thành công đoạn này không?"
        confirmText="Hoàn thành"
        tone="warning"
        requireReason={false}
      />
      <OrderStatusReasonModal
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        onSubmit={confirmCompleteProduction}
        title="Hoàn thành đơn sản xuất"
        description="Bạn có chắc chắn muốn xác nhận hoàn thành toàn bộ đơn sản xuất này không? Hành động này sẽ cập nhật trạng thái đơn hàng sang hoàn thành."
        confirmText="Xác nhận hoàn thành"
        tone="warning"
        requireReason={false}
      />
      <SuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        onPrimary={() => navigate("/production")}
        title="Duyệt thành công"
        description={`Đơn sản xuất #PR-${production?.productionId} đã được chấp nhận.`}
        primaryLabel="Về danh sách"
        hideSecondary={true}
      />
      <SuccessModal
        isOpen={isRejectSuccessModalOpen}
        onClose={() => setIsRejectSuccessModalOpen(false)}
        onPrimary={() => navigate("/production")}
        title="Từ chối thành công"
        description={`Đơn sản xuất #PR-${production?.productionId} đã bị từ chối.`}
        primaryLabel="Về danh sách"
        hideSecondary={true}
      />

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={isApproveOrderConfirmOpen}
        title="Duyệt đơn sản xuất"
        description="Bạn có chắc chắn muốn chấp nhận đơn sản xuất này?"
        onConfirm={confirmApproveProduction}
        onClose={() => setIsApproveOrderConfirmOpen(false)}
      />

      <ConfirmModal
        isOpen={isApprovePlanConfirmOpen}
        title="Duyệt kế hoạch sản xuất"
        description="Bạn có chắc chắn muốn chấp nhận kế hoạch sản xuất này? Sau khi duyệt, kế hoạch sẽ chuyển sang trạng thái sản xuất."
        onConfirm={confirmApprovePlan}
        onClose={() => setIsApprovePlanConfirmOpen(false)}
      />

      <ConfirmModal
        isOpen={isRequestPlanUpdateConfirmOpen}
        title="Yêu cầu sửa kế hoạch"
        description="Bạn có chắc chắn muốn yêu cầu PM chỉnh sửa lại các công đoạn trong kế hoạch này?"
        onConfirm={confirmRequestPlanUpdate}
        onClose={() => setIsRequestPlanUpdateConfirmOpen(false)}
      />

      <ConfirmModal
        isOpen={isSubmitPlanConfirmOpen}
        title="Gửi duyệt kế hoạch"
        description="Bạn có chắc chắn muốn gửi kế hoạch sản xuất này cho chủ xưởng xét duyệt?"
        onConfirm={confirmSubmitPlan}
        onClose={() => setIsSubmitPlanConfirmOpen(false)}
      />
    </OwnerLayout>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/30">
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">{label}</span>
      <span className="text-sm font-medium text-slate-700">{value || "-"}</span>
    </div>
  );
}
