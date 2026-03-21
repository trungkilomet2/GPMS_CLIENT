import { useMemo, useState } from "react";
import { AlertTriangle, ImagePlus, Send, Wrench } from "lucide-react";
import { useLocation } from "react-router-dom";
import OwnerLayout from "@/layouts/OwnerLayout";
import "@/styles/homepage.css";
import "@/styles/leave.css";

const MOCK_ASSIGNMENTS = [
  {
    id: 1,
    productionId: 1001,
    orderName: "Đồng phục công ty ABC",
    partName: "Diễu nẹp cổ",
    startDate: "2026-04-22",
    endDate: "2026-04-23",
  },
  {
    id: 2,
    productionId: 1001,
    orderName: "Đồng phục công ty ABC",
    partName: "Đính mác",
    startDate: "2026-04-23",
    endDate: "2026-04-24",
  },
  {
    id: 3,
    productionId: 1002,
    orderName: "Áo hoodie mùa đông",
    partName: "May thân",
    startDate: "2026-04-19",
    endDate: "2026-04-20",
  },
  {
    id: 4,
    productionId: 1002,
    orderName: "Áo hoodie mùa đông",
    partName: "May tay",
    startDate: "2026-04-20",
    endDate: "2026-04-21",
  },
];

const SEVERITIES = [
  { value: "low", label: "Thấp" },
  { value: "medium", label: "Trung bình" },
  { value: "high", label: "Cao" },
  { value: "critical", label: "Nghiêm trọng" },
];

export default function WorkerErrorReport() {
  const location = useLocation();
  const assignment = location.state?.assignment ?? null;
  const normalizedAssignment = assignment
    ? {
        id: assignment?.id ?? `plan-${assignment?.productionId ?? ""}-${assignment?.partName ?? ""}`,
        productionId: assignment?.productionId ?? "",
        orderName: assignment?.orderName ?? "",
        partName: assignment?.partName ?? "",
        startDate: assignment?.startDate ?? "",
        endDate: assignment?.endDate ?? "",
      }
    : null;
  const [form, setForm] = useState({
    productionId: normalizedAssignment?.productionId ? String(normalizedAssignment.productionId) : "",
    partName: normalizedAssignment?.partName || "",
    severity: "medium",
    title: "",
    description: "",
    quantity: "",
    happenAt: "",
    suggestion: "",
  });
  const [notice, setNotice] = useState("");
  const isPrefilled = Boolean(normalizedAssignment?.productionId || normalizedAssignment?.partName);

  const productions = useMemo(() => {
    const map = new Map();
    MOCK_ASSIGNMENTS.forEach((item) => {
      if (!map.has(item.productionId)) {
        map.set(item.productionId, item.orderName);
      }
    });
    if (normalizedAssignment?.productionId && !map.has(normalizedAssignment.productionId)) {
      map.set(normalizedAssignment.productionId, normalizedAssignment.orderName || "Kế hoạch từ chi tiết");
    }
    return Array.from(map.entries()).map(([productionId, orderName]) => ({
      productionId,
      orderName,
    }));
  }, [normalizedAssignment]);

  const availableParts = useMemo(() => {
    const pid = Number(form.productionId);
    if (!pid) return [];
    const base = MOCK_ASSIGNMENTS.filter((item) => item.productionId === pid);
    if (normalizedAssignment && Number(normalizedAssignment.productionId) === pid) {
      const exists = base.some((item) => item.partName === normalizedAssignment.partName);
      if (!exists) return [normalizedAssignment, ...base];
    }
    return base;
  }, [form.productionId, normalizedAssignment]);

  const selectedPart = useMemo(() => {
    if (!form.partName) return null;
    if (normalizedAssignment && normalizedAssignment.partName === form.partName) return normalizedAssignment;
    return availableParts.find((item) => item.partName === form.partName) || null;
  }, [availableParts, form.partName, normalizedAssignment]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setNotice("Báo cáo đã được ghi nhận. Tổ trưởng sẽ xử lý trong hôm nay.");
  };

  return (
    <OwnerLayout>
      <div className="leave-page leave-list-page">
        <div className="leave-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Báo cáo lỗi công đoạn</h1>
                <p className="text-slate-600">Gửi sự cố trong quá trình sản xuất để tổ trưởng xử lý.</p>
              </div>
            </div>
            <button
              type="submit"
              form="error-report-form"
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
            >
              <Send size={16} /> Gửi báo cáo
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
            <form
              id="error-report-form"
              onSubmit={handleSubmit}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500">Production</label>
                  <select
                    value={form.productionId}
                    onChange={(event) => handleChange("productionId", event.target.value)}
                    disabled={isPrefilled}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10"
                  >
                    <option value="">Chọn production...</option>
                    {productions.map((item) => (
                      <option key={item.productionId} value={item.productionId}>
                        {`#PR-${item.productionId} - ${item.orderName}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500">Công đoạn</label>
                  <select
                    value={form.partName}
                    onChange={(event) => handleChange("partName", event.target.value)}
                    disabled={isPrefilled}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10"
                  >
                    <option value="">Chọn công đoạn...</option>
                    {availableParts.map((item) => (
                      <option key={item.id} value={item.partName}>{item.partName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500">Mức độ</label>
                  <select
                    value={form.severity}
                    onChange={(event) => handleChange("severity", event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10"
                  >
                    {SEVERITIES.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500">Số lượng lỗi</label>
                  <input
                    value={form.quantity}
                    onChange={(event) => handleChange("quantity", event.target.value)}
                    placeholder="Ví dụ: 12"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="text-xs font-semibold uppercase text-slate-500">Tiêu đề lỗi</label>
                <input
                  value={form.title}
                  onChange={(event) => handleChange("title", event.target.value)}
                  placeholder="Ví dụ: Lỗi lệch đường may cổ"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10"
                />
              </div>

              <div className="mt-4">
                <label className="text-xs font-semibold uppercase text-slate-500">Mô tả chi tiết</label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(event) => handleChange("description", event.target.value)}
                  placeholder="Mô tả lỗi, vị trí, nguyên nhân nghi ngờ..."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10"
                />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500">Thời gian phát sinh</label>
                  <input
                    type="datetime-local"
                    value={form.happenAt}
                    onChange={(event) => handleChange("happenAt", event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500">Gợi ý xử lý</label>
                  <input
                    value={form.suggestion}
                    onChange={(event) => handleChange("suggestion", event.target.value)}
                    placeholder="Ví dụ: kiểm tra lại máy may"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="text-xs font-semibold uppercase text-slate-500">Ảnh minh chứng</label>
                <div className="mt-2 flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <ImagePlus size={18} className="text-slate-400" />
                  Kéo thả ảnh hoặc bấm để tải lên (demo)
                </div>
              </div>

              {notice && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {notice}
                </div>
              )}
            </form>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-slate-600 mb-3">
                  <Wrench size={16} />
                  <h2 className="text-xs font-bold uppercase tracking-widest">Thông tin công đoạn</h2>
                </div>
                {selectedPart ? (
                  <div className="space-y-2 text-sm text-slate-700">
                    <InfoItem label="Production" value={`#PR-${selectedPart.productionId}`} />
                    <InfoItem label="Đơn hàng" value={selectedPart.orderName} />
                    <InfoItem label="Công đoạn" value={selectedPart.partName} />
                    <InfoItem label="Bắt đầu" value={selectedPart.startDate} />
                    <InfoItem label="Kết thúc" value={selectedPart.endDate} />
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">Chọn production và công đoạn để xem thông tin.</div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-3">
                  Mẹo báo cáo nhanh
                </div>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>Ghi rõ vị trí lỗi và số lượng lỗi.</li>
                  <li>Đính kèm ảnh để tổ trưởng đánh giá nhanh.</li>
                  <li>Chọn mức độ nghiêm trọng đúng thực tế.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </OwnerLayout>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2">
      <span className="text-xs font-semibold text-slate-400 uppercase">{label}</span>
      <span className="text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}
