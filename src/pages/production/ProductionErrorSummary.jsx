import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, ClipboardList } from "lucide-react";
import OwnerLayout from "@/layouts/OwnerLayout";
import ProductionService from "@/services/ProductionService";
import Pagination from "@/components/Pagination";
import "@/styles/homepage.css";
import "@/styles/leave.css";

const SEVERITY_LABELS = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
  critical: "Nghiêm trọng",
};

const SEVERITY_STYLES = {
  low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  critical: "bg-rose-50 text-rose-700 border-rose-200",
  default: "bg-slate-50 text-slate-600 border-slate-200",
};

const TYPE_ISSUE_LABELS = {
  0: "Lỗi công đoạn",
  1: "Lỗi cắt",
  2: "Lỗi may",
  3: "Lỗi khác",
};

const SEVERITY_ORDER = ["low", "medium", "high", "critical"];

const getSeverityFromPriority = (priority, fallbackSeverity) => {
  if (typeof fallbackSeverity === "string" && SEVERITY_ORDER.includes(fallbackSeverity)) {
    return fallbackSeverity;
  }

  const p = Number(priority);
  if (!Number.isFinite(p)) return "low";
  if (p >= 4) return "critical";
  if (p === 3) return "high";
  if (p === 2) return "medium";
  return "low";
};

const getTypeIssueLabel = (typeIssue) => {
  const n = Number(typeIssue);
  if (Number.isFinite(n) && TYPE_ISSUE_LABELS[n]) return TYPE_ISSUE_LABELS[n];
  return "Chưa phân loại";
};

const parsePayload = (payload) => {
  if (typeof payload !== "string") return payload;
  try {
    return JSON.parse(payload);
  } catch {
    return payload;
  }
};

const extractList = (payload) => {
  const parsed = parsePayload(payload);
  if (Array.isArray(parsed?.data)) return parsed.data;
  if (Array.isArray(parsed?.items)) return parsed.items;
  if (Array.isArray(parsed?.list)) return parsed.list;
  if (Array.isArray(parsed?.results)) return parsed.results;
  if (Array.isArray(parsed)) return parsed;
  return [];
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString("vi-VN");
};

const normalizeIssue = (item, index) => {
  const typeLabel = getTypeIssueLabel(item?.typeIssue);
  const partName =
    item?.partName ??
    item?.part?.partName ??
    item?.stageName ??
    item?.stepName ??
    (item?.partId ? `Công đoạn #${item.partId}` : typeLabel);

  const severity = getSeverityFromPriority(item?.priority, item?.severity);

  return {
    id: item?.issueId ?? item?.id ?? `issue-${index}`,
    partName,
    typeIssue: item?.typeIssue,
    typeIssueLabel: typeLabel,
    title: item?.title ?? "Không có tiêu đề",
    description: item?.description ?? "",
    severity,
    priority: item?.priority ?? 0,
    quantity: Number(item?.quantity) || 0,
    imageUrl: item?.imageUrl ?? "",
    createdAt: item?.createdAt ?? "",
  };
};

export default function ProductionErrorSummary() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [production, setProduction] = useState(null);
  const [productionLoading, setProductionLoading] = useState(false);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [issueError, setIssueError] = useState("");
  const [errors, setErrors] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    let active = true;

    const fetchProduction = async () => {
      try {
        setProductionLoading(true);
        const response = await ProductionService.getProductionDetail(id);
        if (!active) return;
        const payload = response?.data?.data ?? response?.data ?? {};
        const order = payload?.order ?? {};
        setProduction({
          productionId: payload?.productionId ?? payload?.id ?? id,
          orderName: order?.orderName ?? order?.name ?? "",
        });
      } catch {
        if (!active) return;
        setProduction({ productionId: id, orderName: "" });
      } finally {
        if (active) setProductionLoading(false);
      }
    };

    fetchProduction();
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    let active = true;

    const fetchIssues = async () => {
      try {
        setIssuesLoading(true);
        setIssueError("");

        const response = await ProductionService.getProductionIssues(id);
        if (!active) return;

        const payload = response?.data ?? response;
        const list = extractList(payload).map(normalizeIssue);
        const sorted = list.sort((a, b) => {
          const aTs = new Date(a.createdAt || 0).getTime();
          const bTs = new Date(b.createdAt || 0).getTime();
          return bTs - aTs;
        });

        setErrors(sorted);
      } catch {
        if (!active) return;
        setErrors([]);
        setIssueError("Không thể tải danh sách lỗi từ hệ thống.");
      } finally {
        if (active) {
          setIssuesLoading(false);
          setCurrentPage(1);
        }
      }
    };

    fetchIssues();
    return () => {
      active = false;
    };
  }, [id]);

  const severityCounts = useMemo(
    () =>
      errors.reduce(
        (acc, item) => {
          const key = item.severity || "low";
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        },
        { low: 0, medium: 0, high: 0, critical: 0 }
      ),
    [errors]
  );

  const byPart = useMemo(() => {
    const map = new Map();

    errors.forEach((item) => {
      const key = item.partName || "Chưa xác định";
      const current = map.get(key) || {
        partName: key,
        count: 0,
        totalQuantity: 0,
        latestAt: "",
        highestSeverity: "low",
      };

      current.count += 1;
      current.totalQuantity += Number(item.quantity) || 0;

      const nextTs = new Date(item.createdAt || 0).getTime();
      const currentTs = new Date(current.latestAt || 0).getTime();
      if (!current.latestAt || nextTs > currentTs) {
        current.latestAt = item.createdAt || "";
      }

      const currentRank = SEVERITY_ORDER.indexOf(current.highestSeverity);
      const nextRank = SEVERITY_ORDER.indexOf(item.severity || "low");
      if (nextRank > currentRank) {
        current.highestSeverity = item.severity || "low";
      }

      map.set(key, current);
    });

    return Array.from(map.values());
  }, [errors]);

  const totalPages = Math.max(1, Math.ceil(errors.length / pageSize));

  const pagedErrors = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return errors.slice(start, start + pageSize);
  }, [errors, currentPage]);

  const loading = productionLoading || issuesLoading;

  return (
    <OwnerLayout>
      <div className="leave-page leave-list-page">
        <div className="leave-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <button
                onClick={() => navigate(-1)}
                className="mt-1 rounded-xl border border-slate-200 p-2 text-slate-400 transition hover:bg-slate-50"
                aria-label="Quay lại"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  Tổng hợp lỗi Production #{production?.productionId ?? id}
                </h1>
                <p className="text-slate-600">
                  {production?.orderName
                    ? `Đơn hàng: ${production.orderName}`
                    : "Theo dõi lỗi theo từng công đoạn."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                Tổng lỗi: {errors.length}
              </span>
            </div>
          </div>

          {issueError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {issueError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {[
              { key: "low", label: "Thấp", value: severityCounts.low },
              { key: "medium", label: "Trung bình", value: severityCounts.medium },
              { key: "high", label: "Cao", value: severityCounts.high },
              { key: "critical", label: "Nghiêm trọng", value: severityCounts.critical },
            ].map((item) => (
              <div key={item.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-400">{item.label}</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-600">
                <ClipboardList size={16} />
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Theo công đoạn</div>
                  <div className="text-sm text-slate-500 mt-1">Tổng hợp nhanh theo công đoạn.</div>
                </div>
              </div>
              <div className="text-xs text-slate-500">Gộp lỗi theo công đoạn</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-2 text-left">Công đoạn</th>
                    <th className="px-4 py-2 text-left">Tóm tắt</th>
                    <th className="px-4 py-2 text-center">Mức độ cao nhất</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {byPart.map((row) => (
                    <tr key={row.partName} className="hover:bg-slate-50/70">
                      <td className="px-4 py-2">
                        <div className="font-semibold text-slate-800">{row.partName}</div>
                        <div className="text-[10px] text-slate-400">
                          Lỗi gần nhất: {formatDateTime(row.latestAt)}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap items-center gap-2 text-slate-700">
                          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold">
                            {row.count} lỗi
                          </span>
                          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold">
                            {row.totalQuantity} sản phẩm lỗi
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                            SEVERITY_STYLES[row.highestSeverity] || SEVERITY_STYLES.default
                          }`}
                        >
                          {SEVERITY_LABELS[row.highestSeverity] || "-"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {byPart.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-slate-500">
                        Chưa có lỗi nào cho production này.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-600">
                <AlertTriangle size={16} />
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Danh sách lỗi</div>
                  <div className="text-sm text-slate-500 mt-1">Chi tiết từng báo cáo lỗi.</div>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Công đoạn</th>
                    <th className="px-4 py-3 text-left">Tiêu đề</th>
                    <th className="px-4 py-3 text-center">Mức độ</th>
                    <th className="px-4 py-3 text-center">Số lượng</th>
                    <th className="px-4 py-3 text-center">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedErrors.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-semibold text-slate-800">{item.partName || "-"}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{item.title || "Không có tiêu đề"}</div>
                        <div className="text-[11px] text-slate-400">{item.description || ""}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                            SEVERITY_STYLES[item.severity] || SEVERITY_STYLES.default
                          }`}
                        >
                          {SEVERITY_LABELS[item.severity] || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-700">{item.quantity ?? "-"}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{formatDateTime(item.createdAt)}</td>
                    </tr>
                  ))}
                  {errors.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        Chưa có lỗi nào được ghi nhận.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {errors.length > 0 && (
              <div className="px-5 py-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalCount={errors.length}
                  pageSize={pageSize}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {loading && (
        <div className="fixed bottom-6 right-6 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-500 shadow">
          Đang tải dữ liệu production...
        </div>
      )}
    </OwnerLayout>
  );
}
