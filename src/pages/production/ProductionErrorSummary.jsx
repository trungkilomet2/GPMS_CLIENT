import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  AlertTriangle,
  ArrowLeft,
  Info,
  Package,
  ShieldAlert,
  Zap,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import OwnerLayout from "@/layouts/OwnerLayout";
import ProductionService from "@/services/ProductionService";
import Pagination from "@/components/Pagination";
import OrderImageZoomModal from "@/pages/orders/components/OrderImageZoomModal";
import { getStoredUser } from "@/lib/authStorage";
import { getPrimaryWorkspaceRole } from "@/lib/internalRoleFlow";
import WorkerLayout from "@/layouts/WorkerLayout";


const TYPE_ISSUE_LABELS = {
  0: "Lỗi công đoạn",
  1: "Lỗi cắt",
  2: "Lỗi may",
  3: "Lỗi khác",
};


const getTypeIssueLabel = (typeIssue) => {
  if (typeof typeIssue === "string" && typeIssue.trim().length > 0 && isNaN(Number(typeIssue))) {
    return typeIssue;
  }
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
  return parsed.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalizeIssue = (item, index) => {
  // Check for both camelCase and PascalCase
  const typeIssue = item?.typeIssue ?? item?.TypeIssue;
  const typeLabel = getTypeIssueLabel(typeIssue);
  
  const partName =
    item?.partName ??
    item?.PartName ??
    item?.part?.partName ??
    item?.part?.PartName ??
    item?.productionPart?.partName ??
    item?.productionPart?.PartName ??
    item?.partOrderSize?.partName ??
    item?.partOrderSize?.PartName ??
    item?.stageName ??
    item?.StageName ??
    item?.stepName ??
    item?.StepName ??
    item?.componentName ??
    item?.ComponentName ??
    item?.name ??
    item?.Name ??
    (item?.partId || item?.PartId ? `Công đoạn #${item?.partId ?? item?.PartId}` : typeLabel);

  return {
    id: item?.issueId ?? item?.IssueId ?? item?.id ?? item?.Id ?? `issue-${index}`,
    rawId: item?.id ?? item?.Id ?? item?.issueId ?? item?.IssueId,
    partName,
    typeIssue,
    typeIssueLabel: typeLabel,
    title: item?.title ?? item?.Title ?? "Không có tiêu đề",
    description: item?.description ?? item?.Description ?? "",
    priority: item?.priority ?? item?.Priority ?? 0,
    quantity: Number(item?.quantity ?? item?.Quantity) || 0,
    imageUrl: item?.imageUrl ?? item?.ImageUrl ?? "",
    createdAt: item?.createdAt ?? item?.CreatedAt ?? "",
  };
};

import "@/styles/homepage.css";
import "@/styles/leave.css";

export default function ProductionErrorSummary() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getStoredUser();
  const primaryRole = getPrimaryWorkspaceRole(user?.role);
  const isWorker = primaryRole === "worker";
  const LayoutComponent = isWorker ? WorkerLayout : OwnerLayout;

  const [production, setProduction] = useState(null);
  const [productionLoading, setProductionLoading] = useState(false);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [issueError, setIssueError] = useState("");
  const [errors, setErrors] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [zoomImageUrl, setZoomImageUrl] = useState("");
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
        const totalQty = Number(order?.totalQuantity ?? order?.quantity ?? payload?.quantity ?? 0);
        setProduction({
          productionId: payload?.productionId ?? payload?.id ?? id,
          orderName: order?.orderName ?? order?.name ?? "",
          totalQuantity: totalQty,
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




  const totalPages = Math.max(1, Math.ceil(errors.length / pageSize));

  const pagedErrors = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return errors.slice(start, start + pageSize);
  }, [errors, currentPage]);

  const loading = productionLoading || issuesLoading;

  return (
    <LayoutComponent>
      <div className="leave-page min-h-screen pb-20">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">

          {/* HEADER SECTION */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-4">
              <button
                onClick={() => navigate(-1)}
                className="group flex items-center justify-center w-12 h-12 rounded-xl bg-white border border-slate-200 text-slate-600 transition-all hover:border-[#1e6e43] hover:text-[#1e6e43] shadow-sm active:scale-95"
              >
                <ArrowLeft size={22} />
              </button>
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight leading-none uppercase">
                  Tổng hợp lỗi đơn sản xuất
                </h1>
                <p className="text-[10px] font-bold text-slate-600 tracking-widest uppercase mt-1">
                  Mã sản xuất: #PR-{production?.productionId ?? id}
                  {production?.orderName && ` • Đơn hàng: ${production.orderName}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-4 py-2 bg-[#f0f9f4] text-[#1e6e43] border border-[#d4e3da] rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-sm">
                {errors.length} Lỗi ghi nhận
              </span>
            </div>
          </div>

          {issueError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 font-bold flex items-center gap-2">
              <AlertTriangle size={18} />
              {issueError}
            </div>
          )}



          {/* DETAILED ISSUE TABLE */}
          <div className="bg-white rounded-xl border border-black shadow-sm overflow-hidden">
            <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-[#1e6e43] rounded-full" />
                <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-800">Danh sách lỗi chi tiết</h2>
              </div>
              {loading && <Loader2 className="animate-spin text-slate-400" size={18} />}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] border border-black">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-black">
                    <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-600 border-r border-black w-16">STT</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-600 border-r border-black">Công đoạn / Tiêu đề</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-600 border-r border-black">Mô tả</th>
                    <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-600 border-r border-black">Minh chứng</th>
                    <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-600 border-r border-black">Số lượng</th>
                    <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-800">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black border-black">
                  {pagedErrors.length === 0 && !loading ? (
                    <tr>
                      <td colSpan={6} className="py-32 text-center">
                        <div className="flex flex-col items-center gap-4 text-slate-200">
                          <AlertTriangle size={64} />
                          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Không có lỗi nào được ghi nhận</p>
                        </div>
                      </td>
                    </tr>
                  ) : pagedErrors.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-all divide-x divide-black border-b border-black last:border-b-0">
                      <td className="px-6 py-4 text-center font-bold text-slate-400 text-[11px] italic">
                        {String((currentPage - 1) * pageSize + index + 1).padStart(2, "0")}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 uppercase tracking-tight text-sm">{item.partName || "-"}</div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 line-clamp-1">{item.title}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[10px] font-medium text-slate-600 line-clamp-2 max-w-[200px]">{item.description || "-"}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {item.imageUrl ? (
                          <button
                            onClick={() => {
                              setZoomImageUrl(item.imageUrl);
                              setIsImageModalOpen(true);
                            }}
                            className="group relative inline-block overflow-hidden rounded-xl border border-black shadow-sm transition hover:scale-105 active:scale-95"
                          >
                            <img
                              src={item.imageUrl}
                              alt="Minh chứng"
                              className="h-10 w-10 object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                              <ImageIcon size={14} className="text-white" />
                            </div>
                          </button>
                        ) : (
                          <span className="text-[9px] font-bold text-slate-300 uppercase italic">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-800 text-sm">
                        <span className="inline-flex h-9 w-12 items-center justify-center rounded-xl font-bold text-sm border border-black bg-white">
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter italic whitespace-nowrap">
                          {formatDateTime(item.createdAt)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {errors.length > 0 && (
              <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/30">
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

        <OrderImageZoomModal
          isOpen={isImageModalOpen}
          imageUrl={zoomImageUrl}
          onClose={() => {
            setIsImageModalOpen(false);
            setZoomImageUrl("");
          }}
        />

      </div>
    </LayoutComponent>
  );
}


