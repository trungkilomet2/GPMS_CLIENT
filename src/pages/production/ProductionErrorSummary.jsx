import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, ClipboardList } from "lucide-react";
import OwnerLayout from "@/layouts/OwnerLayout";
import ProductionService from "@/services/ProductionService";
import Pagination from "@/components/Pagination";
import "@/styles/homepage.css";
import "@/styles/leave.css";

const STORAGE_KEY = "gpms-error-reports";

const MOCK_ERRORS = [
  {
    id: "e1",
    productionId: 2,
    orderName: "Áo thun đồng phục",
    partName: "Cắt thân trước",
    severity: "medium",
    title: "Sai biên cắt",
    description: "Biên vải lệch 3mm ở đầu thân.",
    quantity: 14,
    happenAt: "2026-03-18T09:10",
    createdAt: "2026-03-18T09:15:00.000Z",
  },
  {
    id: "e2",
    productionId: 2,
    orderName: "Áo thun đồng phục",
    partName: "May sườn",
    severity: "low",
    title: "Đường may hở",
    description: "Lỗi hở đường may ở sườn trái.",
    quantity: 6,
    happenAt: "2026-03-18T14:20",
    createdAt: "2026-03-18T14:22:00.000Z",
  },
  {
    id: "e3",
    productionId: 2,
    orderName: "Áo thun đồng phục",
    partName: "Đính mác",
    severity: "high",
    title: "Sai vị trí mác",
    description: "Mác dán lệch khỏi vị trí chuẩn 1cm.",
    quantity: 9,
    happenAt: "2026-03-19T08:05",
    createdAt: "2026-03-19T08:08:00.000Z",
  },
  {
    id: "e4",
    productionId: 2,
    orderName: "Áo thun đồng phục",
    partName: "Hoàn thiện",
    severity: "critical",
    title: "Bẩn dầu máy",
    description: "Dính dầu máy ở 4 sản phẩm lô 2.",
    quantity: 4,
    happenAt: "2026-03-19T15:45",
    createdAt: "2026-03-19T15:46:00.000Z",
  },
  {
    id: "e5",
    productionId: 2,
    orderName: "Áo thun đồng phục",
    partName: "May tay",
    severity: "medium",
    title: "Lệch đường ráp tay",
    description: "Ráp tay lệch nhẹ ở size M.",
    quantity: 11,
    happenAt: "2026-03-20T10:22",
    createdAt: "2026-03-20T10:24:00.000Z",
  },
  {
    id: "e6",
    productionId: 2,
    orderName: "Áo thun đồng phục",
    partName: "Cắt thân sau",
    severity: "low",
    title: "Sơ đồ cắt nhăn",
    description: "Sơ đồ bị nhăn khi cắt, cần trải lại.",
    quantity: 5,
    happenAt: "2026-03-20T14:18",
    createdAt: "2026-03-20T14:20:00.000Z",
  },
  {
    id: "e7",
    productionId: 2,
    orderName: "Áo thun đồng phục",
    partName: "May cổ",
    severity: "high",
    title: "Sai kích thước cổ",
    description: "Chu vi cổ nhỏ hơn tiêu chuẩn 0.7cm.",
    quantity: 7,
    happenAt: "2026-03-21T09:30",
    createdAt: "2026-03-21T09:32:00.000Z",
  },
  {
    id: "e8",
    productionId: 2,
    orderName: "Áo thun đồng phục",
    partName: "Là ủi",
    severity: "medium",
    title: "Bóng vải",
    description: "Bóng vải ở thân trước do nhiệt cao.",
    quantity: 8,
    happenAt: "2026-03-21T13:05",
    createdAt: "2026-03-21T13:08:00.000Z",
  },
  {
    id: "e9",
    productionId: 2,
    orderName: "Áo thun đồng phục",
    partName: "Đóng gói",
    severity: "low",
    title: "Thiếu tem size",
    description: "Tem size không được dán ở 6 sản phẩm.",
    quantity: 6,
    happenAt: "2026-03-21T15:10",
    createdAt: "2026-03-21T15:12:00.000Z",
  },
  {
    id: "e10",
    productionId: 2,
    orderName: "Áo thun đồng phục",
    partName: "May sườn",
    severity: "medium",
    title: "Đường may lệch",
    description: "Sai độ rộng đường may 2mm.",
    quantity: 10,
    happenAt: "2026-03-22T08:40",
    createdAt: "2026-03-22T08:42:00.000Z",
  },
  {
    id: "e11",
    productionId: 2,
    orderName: "Áo thun đồng phục",
    partName: "Kiểm hàng",
    severity: "high",
    title: "Phát hiện lỗi dính bẩn",
    description: "Bẩn mực ở 3 sản phẩm size L.",
    quantity: 3,
    happenAt: "2026-03-22T11:20",
    createdAt: "2026-03-22T11:25:00.000Z",
  },
  {
    id: "e12",
    productionId: 2,
    orderName: "Áo thun đồng phục",
    partName: "Cắt tay áo",
    severity: "medium",
    title: "Sai kích thước tay",
    description: "Tay áo dài hơn tiêu chuẩn 0.5cm.",
    quantity: 9,
    happenAt: "2026-03-22T14:55",
    createdAt: "2026-03-22T14:58:00.000Z",
  },
  {
    id: "e13",
    productionId: 2,
    orderName: "Áo thun đồng phục",
    partName: "Hoàn thiện",
    severity: "low",
    title: "Chỉ thừa",
    description: "Chỉ thừa ở 5 sản phẩm size S.",
    quantity: 5,
    happenAt: "2026-03-23T09:12",
    createdAt: "2026-03-23T09:15:00.000Z",
  },
  {
    id: "e14",
    productionId: 2,
    orderName: "Áo thun đồng phục",
    partName: "Cắt thân trước",
    severity: "high",
    title: "Sai sơ đồ",
    description: "Sơ đồ cắt không đúng phiên bản.",
    quantity: 4,
    happenAt: "2026-03-23T13:25",
    createdAt: "2026-03-23T13:28:00.000Z",
  },
  {
    id: "e15",
    productionId: 2,
    orderName: "Áo thun đồng phục",
    partName: "May tay",
    severity: "medium",
    title: "Bong đường may",
    description: "Đường may bong sau khi kéo thử.",
    quantity: 8,
    happenAt: "2026-03-24T08:05",
    createdAt: "2026-03-24T08:08:00.000Z",
  },
  {
    id: "e16",
    productionId: 2,
    orderName: "Áo thun đồng phục",
    partName: "Là ủi",
    severity: "low",
    title: "Nếp gấp không đều",
    description: "Nếp gấp sau khi là bị lệch nhẹ.",
    quantity: 6,
    happenAt: "2026-03-24T10:40",
    createdAt: "2026-03-24T10:42:00.000Z",
  },
  {
    id: "e17",
    productionId: 2,
    orderName: "Áo thun đồng phục",
    partName: "Đóng gói",
    severity: "medium",
    title: "Sai màu bao bì",
    description: "Bao bì màu xanh thay vì trắng.",
    quantity: 5,
    happenAt: "2026-03-24T15:30",
    createdAt: "2026-03-24T15:32:00.000Z",
  },
  {
    id: "e18",
    productionId: 2,
    orderName: "Áo thun đồng phục",
    partName: "May cổ",
    severity: "critical",
    title: "Vải rách khi ráp cổ",
    description: "Rách vải do kéo sai lực.",
    quantity: 2,
    happenAt: "2026-03-25T09:18",
    createdAt: "2026-03-25T09:20:00.000Z",
  },
];

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

function normalizeErrors(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.items)) return raw.items;
  if (Array.isArray(raw.data)) return raw.data;
  return [];
}

function readStoredErrors() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return normalizeErrors(JSON.parse(raw));
  } catch {
    return [];
  }
}

export default function ProductionErrorSummary() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [production, setProduction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    let active = true;
    const fetchProduction = async () => {
      try {
        setLoading(true);
        const response = await ProductionService.getProductionDetail(id);
        if (!active) return;
        const payload = response?.data?.data ?? response?.data ?? {};
        const order = payload.order ?? {};
        setProduction({
          productionId: payload.productionId ?? payload.id ?? id,
          orderName: order.orderName ?? order.name ?? "",
        });
      } catch {
        if (!active) return;
        setProduction({ productionId: id, orderName: "" });
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
    const stored = readStoredErrors();
    const merged = [...stored, ...MOCK_ERRORS];
    const filtered = merged.filter((item) => String(item.productionId) === String(id));
    const sorted = filtered.sort((a, b) => new Date(b.createdAt || b.happenAt || 0) - new Date(a.createdAt || a.happenAt || 0));
    setErrors(sorted);
    setCurrentPage(1);
  }, [id]);

  const severityCounts = useMemo(() => {
    return errors.reduce(
      (acc, item) => {
        const key = item.severity || "default";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      { low: 0, medium: 0, high: 0, critical: 0 }
    );
  }, [errors]);

  const byPart = useMemo(() => {
    const map = new Map();
    errors.forEach((item) => {
      const key = item.partName || "Không rõ";
      const current = map.get(key) || {
        partName: key,
        count: 0,
        totalQuantity: 0,
        latestAt: "",
        highestSeverity: "low",
      };
      current.count += 1;
      current.totalQuantity += Number(item.quantity) || 0;
      const ts = new Date(item.happenAt || item.createdAt || 0);
      if (!current.latestAt || ts > new Date(current.latestAt)) {
        current.latestAt = item.happenAt || item.createdAt || "";
      }
      const severityRank = ["low", "medium", "high", "critical"];
      const currentRank = severityRank.indexOf(current.highestSeverity);
      const nextRank = severityRank.indexOf(item.severity || "low");
      if (nextRank > currentRank) current.highestSeverity = item.severity || "low";
      map.set(key, current);
    });
    return Array.from(map.values());
  }, [errors]);

  const totalPages = Math.max(1, Math.ceil(errors.length / pageSize));
  const pagedErrors = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return errors.slice(start, start + pageSize);
  }, [errors, currentPage, pageSize]);

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
                  {production?.orderName ? `Đơn hàng: ${production.orderName}` : "Theo dõi lỗi theo từng công đoạn."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                Tổng lỗi: {errors.length}
              </span>
            </div>
          </div>

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
                        <div className="text-[10px] text-slate-400">Lỗi gần nhất: {row.latestAt || "-"}</div>
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
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${SEVERITY_STYLES[row.highestSeverity] || SEVERITY_STYLES.default}`}>
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
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${SEVERITY_STYLES[item.severity] || SEVERITY_STYLES.default}`}>
                          {SEVERITY_LABELS[item.severity] || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-700">{item.quantity ?? "-"}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{item.happenAt || "-"}</td>
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
