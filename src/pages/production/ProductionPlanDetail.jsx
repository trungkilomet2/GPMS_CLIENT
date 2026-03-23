import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import OwnerLayout from "@/layouts/OwnerLayout";
import ProductionService from "@/services/ProductionService";
import ProductionPartService from "@/services/ProductionPartService";
import CuttingNotebookService from "@/services/CuttingNotebookService";
import MaterialsTable from "@/components/orders/MaterialsTable";
import { MATERIALS_TABLE_EMPTY_TEXT } from "@/lib/orders/materials";
import { getStoredUser } from "@/lib/authStorage";
import { extractRoleValue } from "@/lib/authIdentity";
import { hasAnyRole } from "@/lib/roleAccess";
import "@/styles/homepage.css";
import "@/styles/leave.css";

const STATUS_STYLES = {
  Planned: "bg-amber-50 text-amber-700 border-amber-200",
  "In Progress": "bg-blue-50 text-blue-700 border-blue-200",
  "Đang sản xuất": "bg-blue-50 text-blue-700 border-blue-200",
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  default: "bg-gray-50 text-gray-700 border-gray-200",
};

function getStatusLabel(status) {
  if (typeof status === "number") {
    if (status === 1) return "Planned";
    if (status === 2) return "In Progress";
    if (status === 3) return "Completed";
  }
  return status || "-";
}

function detectHasCuttingNotebook(detailPayload) {
  const notebook =
    detailPayload?.cuttingNotebook ??
    detailPayload?.notebook ??
    detailPayload?.cuttingBook ??
    null;
  const notebookId =
    notebook?.id ??
    detailPayload?.cuttingNotebookId ??
    detailPayload?.notebookId ??
    detailPayload?.cuttingBookId ??
    null;
  const markerLength =
    notebook?.markerLength ??
    detailPayload?.markerLength ??
    detailPayload?.notebookMarkerLength;
  const fabricWidth =
    notebook?.fabricWidth ??
    detailPayload?.fabricWidth ??
    detailPayload?.notebookFabricWidth;
  const logs =
    notebook?.logs ??
    detailPayload?.cuttingNotebookLogs ??
    detailPayload?.notebookLogs ??
    [];
  const flag =
    detailPayload?.hasCuttingNotebook ??
    detailPayload?.isCuttingNotebookCreated ??
    detailPayload?.cuttingNotebookExists ??
    detailPayload?.notebookExists ??
    false;

  return Boolean(
    flag ||
    notebookId ||
    markerLength ||
    fabricWidth ||
    (Array.isArray(logs) && logs.length > 0)
  );
}

function formatDateTime(value) {
  if (!value || value === "-") return "-";
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return String(value);
  }
  const yyyy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const dd = String(parsed.getDate()).padStart(2, "0");
  const hh = String(parsed.getHours()).padStart(2, "0");
  const min = String(parsed.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

export default function ProductionPlanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingCuttingBook, setCheckingCuttingBook] = useState(false);
  const [reportedErrorCount, setReportedErrorCount] = useState(0);
  const user = getStoredUser();
  const roleValue = extractRoleValue(user) || user?.role || user?.roles || "";
  const isWorker = hasAnyRole(roleValue, ["worker", "sewer", "tailor"]);

  useEffect(() => {
    let active = true;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError("");
        const productionId = Number(id);
        if (!Number.isFinite(productionId)) {
          throw new Error("INVALID_ID");
        }

        const detailPromise = ProductionService.getProductionDetail(productionId);
        const partsPromise = ProductionPartService.getPartsByProduction(productionId, {
          pageIndex: 0,
          pageSize: 200,
          sortColumn: "Name",
          sortOrder: "ASC",
        }).catch(() => ProductionPartService.getPartsByProduction(productionId));

        const [detailRes, partsRes] = await Promise.all([detailPromise, partsPromise]);

        if (!active) return;

        const detailPayload = detailRes?.data?.data ?? detailRes?.data ?? {};
        const order = detailPayload?.order ?? {};
        const pm = detailPayload?.pm ?? {};
        const statusLabel = getStatusLabel(
          detailPayload?.statusName ?? detailPayload?.status ?? detailPayload?.statusId ?? ""
        );
        const hasCuttingNotebook = detectHasCuttingNotebook(detailPayload);

        const partsPayload = partsRes?.data ?? {};
        const partList =
          partsPayload?.data ??
          partsPayload?.items ??
          partsPayload?.list ??
          partsPayload?.results ??
          (Array.isArray(partsPayload) ? partsPayload : []);

        const steps = Array.isArray(partList)
          ? partList.map((part) => ({
            partId: part?.id ?? part?.partId ?? null,
            partName: part?.name ?? part?.partName ?? part?.title ?? "-",
            cpu: part?.cpu ?? part?.unitPrice ?? part?.price ?? 0,
            startDate: part?.startDate ?? part?.planStartDate ?? "-",
            endDate: part?.endDate ?? part?.planEndDate ?? "-",
            assignedWorkers:
              part?.assignedWorkers ??
              part?.workers ??
              part?.workerNames ??
              (Array.isArray(part?.assignees)
                ? part.assignees
                  .map((worker) => worker?.fullName ?? worker?.name ?? worker?.username ?? worker?.id)
                  .filter(Boolean)
                : []) ??
              (Array.isArray(part?.workerList)
                ? part.workerList.map((worker) => worker?.name ?? worker?.fullName ?? worker?.username).filter(Boolean)
                : []),
          }))
          : [];

        setPlan({
          planId: productionId,
          production: {
            productionId,
            hasCuttingNotebook,
            pmId: pm?.id ?? null,
            orderId: order?.id ?? order?.orderId ?? "-",
            orderName: order?.orderName ?? order?.name ?? "-",
            pStartDate: detailPayload?.startDate ?? order?.startDate ?? "-",
            pEndDate: detailPayload?.endDate ?? order?.endDate ?? "-",
            status: statusLabel,
            pmName: pm?.name || pm?.fullName || (pm?.id ? `PM #${pm.id}` : "-"),
          },
          product: {
            productCode: order?.type ?? (order?.id ? `ORD-${order.id}` : "-"),
            productName: order?.orderName ?? order?.name ?? "-",
            type: order?.type ?? "-",
            size: order?.size ?? "-",
            color: order?.color ?? "-",
            quantity: order?.quantity ?? 0,
            cpu: order?.cpu ?? 0,
            image: order?.image ?? "",
          },
          materials: Array.isArray(order?.materials)
            ? order.materials.map((m) => ({
              ...m,
              materialName: m?.materialName ?? m?.name,
            }))
            : [],
          steps,
        });
      } catch (_err) {
        if (!active) return;
        setError("Không thể tải chi tiết kế hoạch.");
        setPlan(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchDetail();
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("gpms-error-reports");
      if (!raw) {
        setReportedErrorCount(0);
        return;
      }
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.items)
          ? parsed.items
          : Array.isArray(parsed?.data)
            ? parsed.data
            : [];
      const count = list.filter((item) => String(item?.productionId) === String(id)).length;
      setReportedErrorCount(count);
    } catch {
      setReportedErrorCount(0);
    }
  }, [id]);

  const totalCpu = useMemo(() => {
    if (!plan?.steps) return 0;
    return plan.steps.reduce((sum, row) => sum + (Number(row.cpu) || 0), 0);
  }, [plan]);

  const progressSummary = useMemo(() => {
    const total = plan?.steps?.length || 0;
    const today = new Date();
    const completed = (plan?.steps || []).filter((row) => {
      const raw = row.endDate;
      if (!raw || raw === "-") return false;
      const parsed = new Date(raw);
      return Number.isFinite(parsed.getTime()) && parsed <= today;
    }).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percent };
  }, [plan]);

  const resolveHasCuttingNotebook = async (productionId) => {
    if (!Number.isFinite(Number(productionId))) return false;
    if (plan?.production?.hasCuttingNotebook) return true;

    try {
      const notebookRes = await CuttingNotebookService.getByProduction(productionId);
      const payload = notebookRes?.data ?? notebookRes ?? {};
      const notebookList = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];
      if (notebookList.length > 0) {
        return true;
      }
    } catch {
      // ignore and fallback checks
    }

    try {
      const detailRes = await ProductionService.getProductionDetail(productionId);
      const detailPayload = detailRes?.data?.data ?? detailRes?.data ?? {};
      if (detectHasCuttingNotebook(detailPayload)) {
        return true;
      }
    } catch {
      // ignore and fallback
    }

    try {
      const pageSize = 100;
      const maxPages = 20;
      let pageIndex = 0;

      while (pageIndex < maxPages) {
        const listRes = await ProductionService.getProductionList({
          PageIndex: pageIndex,
          PageSize: pageSize,
          SortColumn: "Name",
          SortOrder: "ASC",
        });
        const payload = listRes?.data ?? {};
        const rows = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : [];
        if (rows.length === 0) break;

        const matched = rows.find(
          (item) =>
            String(item?.productionId ?? item?.id ?? "") === String(productionId)
        );
        if (matched) {
          return detectHasCuttingNotebook(matched);
        }

        if (rows.length < pageSize) break;
        pageIndex += 1;
      }
    } catch {
      // ignore and fallback false
    }

    return false;
  };

  const handleOpenCuttingBook = async () => {
    if (!plan?.production?.productionId || checkingCuttingBook) return;

    setCheckingCuttingBook(true);
    try {
      const productionId = plan.production.productionId;
      const hasNotebook = await resolveHasCuttingNotebook(productionId);

      if (!hasNotebook) {
        toast.info("Chưa có sổ cắt cho kế hoạch này. Hệ thống sẽ chuyển sang trang tạo sổ.");
      } else {
        setPlan((prev) =>
          prev
            ? {
              ...prev,
              production: {
                ...prev.production,
                hasCuttingNotebook: true,
              },
            }
            : prev
        );
      }

      navigate("/worker/cutting-book", {
        state: {
          productionId,
          production: plan.production,
          product: plan.product,
          openCuttingBookMode: hasNotebook ? "detail" : "create",
        },
      });
    } finally {
      setCheckingCuttingBook(false);
    }
  };

  if (loading) {
    return (
      <OwnerLayout>
        <div className="flex items-center justify-center min-h-400px text-sm text-slate-600">
          Đang tải chi tiết kế hoạch...
        </div>
      </OwnerLayout>
    );
  }

  if (error) {
    return (
      <OwnerLayout>
        <div className="flex items-center justify-center min-h-400px text-sm text-red-600">
          {error}
        </div>
      </OwnerLayout>
    );
  }

  if (!plan) {
    return (
      <OwnerLayout>
        <div className="flex items-center justify-center min-h-400px text-sm text-slate-600">
          Không tìm thấy kế hoạch #{id}.
        </div>
      </OwnerLayout>
    );
  }

  return (
    <OwnerLayout>
      <div className="leave-page leave-detail-page">
        <div className="leave-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <button
                onClick={() => navigate(-1)}
                className="mt-1 rounded-xl border border-slate-200 p-2 text-slate-400 transition hover:bg-slate-50"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                    Chi tiết kế hoạch
                  </h1>
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${STATUS_STYLES[plan.production.status] || STATUS_STYLES.default
                      }`}
                  >
                    {plan.production.status}
                  </span>
                </div>
                <p className="text-slate-600">Theo dõi thông tin kế hoạch và tiến độ thực hiện.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleOpenCuttingBook}
                disabled={checkingCuttingBook}
                className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50"
              >
                {checkingCuttingBook ? "Đang kiểm tra..." : "Sổ cắt"}
              </button>
              {isWorker ? (
                <Link
                  to="/worker/daily-report"
                  state={{ plan: { production: plan.production, steps: plan.steps } }}
                  className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
                >
                  Báo cáo sản lượng
                </Link>
              ) : (
                <Link
                  to={`/production-plan/assign/${plan.production.productionId}`}
                  state={{ production: plan.production, product: plan.product, steps: plan.steps }}
                  className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
                >
                  Phân công
                </Link>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Thông tin sản xuất</div>
              <div className="grid grid-cols-2 gap-4 text-sm text-slate-700 md:grid-cols-4">
                <InfoBadge label="Mã sản xuất" value={`#PR-${plan.production.productionId}`} />
                <InfoBadge label="Mã đơn hàng" value={`#ĐH-${plan.production.orderId}`} />
                <InfoBadge label="Tên đơn hàng" value={plan.production.orderName} />
                <InfoBadge label="Quản lý dự án" value={plan.production.pmName} />
                <InfoBadge label="Thời gian" value={`${plan.production.pStartDate} - ${plan.production.pEndDate}`} />
                <InfoBadge label="Trạng thái" value={plan.production.status} isStatus />
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-widest text-emerald-700">Tổng quan kế hoạch</div>
              <div className="mt-3 text-sm text-emerald-900">
                <div className="flex items-end justify-between">
                  <span className="text-[11px] font-semibold uppercase text-emerald-700">Tổng chi phí</span>
                  <span className="text-lg font-bold">{totalCpu.toLocaleString("vi-VN")} VND</span>
                </div>
                <div className="mt-3 space-y-2 text-xs text-emerald-700">
                  <div>Người quản lý: {plan.production.pmName}</div>
                </div>
              </div>
            </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-[160px_1fr]">
              <div className="h-40 w-40 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                  {plan.product.image ? (
                    <img src={plan.product.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[11px] text-slate-400">Chưa có ảnh</span>
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Thông tin sản phẩm</div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">{plan.product.productName}</div>
                  <div className="text-xs text-slate-500 uppercase mt-1">SKU: {plan.product.productCode}</div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-700">
                    <InfoBadge label="Loại" value={plan.product.type} />
                    <InfoBadge label="Số lượng" value={`${plan.product.quantity} cái`} />
                    <InfoBadge label="Màu sắc / Kích thước" value={`${plan.product.color} / ${plan.product.size}`} />
                    <InfoBadge label="Giá/SP" value={`${plan.product.cpu?.toLocaleString("vi-VN") ?? "-"} VND`} />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2 text-slate-600">
                <h2 className="text-xs font-bold uppercase tracking-widest">Vật liệu cung cấp</h2>
              </div>
              <MaterialsTable
                materials={plan.materials ?? []}
                variant="detail"
                showImage
                emptyText={MATERIALS_TABLE_EMPTY_TEXT.detail}
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Tổng hợp tiến độ</div>
              <div className="mt-3 grid grid-cols-1 gap-3 text-sm text-slate-700 md:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <div className="text-[11px] font-semibold uppercase text-slate-400">Số lượng lỗi được báo cáo</div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-lg font-bold text-slate-900">{reportedErrorCount}</span>
                    <Link
                      to={`/production/${plan.production.productionId}/errors`}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                    >
                      Xem chi tiết
                    </Link>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <div className="text-[11px] font-semibold uppercase text-slate-400">Hiệu suất làm việc</div>
                  <div className="mt-1 text-lg font-bold text-slate-900">{progressSummary.percent}%</div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <div className="text-[11px] font-semibold uppercase text-slate-400">Số công đoạn hoàn thành</div>
                  <div className="mt-1 text-lg font-bold text-slate-900">
                    {progressSummary.completed}/{progressSummary.total}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    (X là số công đoạn hoàn thành · N là tổng số công đoạn)
                  </div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <div className="text-[11px] font-semibold uppercase text-slate-400">Hiệu suất nhân viên</div>
                  <div className="mt-1">
                    <Link
                      to="/worker/daily-report"
                      state={{ plan: { production: plan.production, steps: plan.steps } }}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                    >
                      Xem chi tiết sản lượng nhân viên
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Danh sách công đoạn & nhiệm vụ</div>
                  <div className="text-sm text-slate-500 mt-1">Công đoạn đã lập cho kế hoạch.</div>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                  Tổng cộng {plan.steps.length} công đoạn
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-4 py-3 text-left">STT</th>
                      <th className="px-4 py-3 text-left">Tên công đoạn</th>
                      <th className="px-4 py-3 text-left">Thợ được giao</th>
                      <th className="px-4 py-3 text-left">Thời gian bắt đầu</th>
                      <th className="px-4 py-3 text-left">Thời gian kết thúc</th>
                      <th className="px-4 py-3 text-right">Giá/SP</th>
                      <th className="px-4 py-3 text-center">Trạng thái</th>
                      <th className="px-4 py-3 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {plan.steps.map((row, idx) => (
                      <tr key={`${row.partName}-${idx}`} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 text-slate-500">{String(idx + 1).padStart(2, "0")}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">{row.partName || "-"}</div>
                          <div className="text-[11px] text-slate-400">Giai đoạn: Rập</div>
                        </td>
                        <td className="px-4 py-3">
                          {Array.isArray(row.assignedWorkers) && row.assignedWorkers.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {row.assignedWorkers.map((worker) => (
                                <span
                                  key={`${row.partName}-${worker}`}
                                  className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"
                                >
                                  {worker}
                                </span>
                              ))}
                            </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDateTime(row.startDate)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDateTime(row.endDate)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700">
                        {row.cpu ? `${Number(row.cpu).toLocaleString("vi-VN")} VND` : "-"}
                      </td>
                        <td className="px-4 py-3 text-center">
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            Đang làm
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Link
                            to="/worker/error-report"
                            state={{
                              assignment: {
                                partId: row.partId,
                                productionId: plan.production.productionId,
                                orderName: plan.production.orderName,
                                partName: row.partName,
                                startDate: row.startDate,
                                endDate: row.endDate,
                              },
                            }}
                            className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-100"
                          >
                            Báo lỗi
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {plan.steps.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-slate-500">
                          Chưa có công đoạn.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </OwnerLayout>
  );
}

function InfoBadge({ label, value, isStatus = false }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</div>
      <div className={`text-sm font-semibold ${isStatus ? "text-emerald-700" : "text-slate-800"}`}>
        {value ?? "-"}
      </div>
    </div>
  );
}
