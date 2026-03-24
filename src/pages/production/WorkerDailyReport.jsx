import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarDays } from "lucide-react";
import WorkerLayout from "@/layouts/WorkerLayout";
import "@/styles/homepage.css";
import "@/styles/leave.css";

const MOCK_TASKS = [
  {
    id: 1,
    productionId: 1001,
    orderName: "Đồng phục công ty ABC",
    partName: "Diễu nẹp cổ",
    cpu: 800,
  },
  {
    id: 2,
    productionId: 1001,
    orderName: "Đồng phục công ty ABC",
    partName: "Đính mác",
    cpu: 200,
  },
  {
    id: 3,
    productionId: 1002,
    orderName: "Áo hoodie mùa đông",
    partName: "Kiểm hàng",
    cpu: 100,
  },
];

function formatDateInput(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function WorkerDailyReport() {
  const navigate = useNavigate();
  const location = useLocation();
  const assignment = location.state?.assignment || null;
  const today = useMemo(() => formatDateInput(), []);
  const [reportDate, setReportDate] = useState(today);
  const [rows, setRows] = useState(() => {
    const base = assignment ? [assignment] : MOCK_TASKS;
    return base.map((task) => ({ ...task, quantity: "" }));
  });
  const [isEditing, setIsEditing] = useState(Boolean(assignment));
  const [draftRows, setDraftRows] = useState(() => (assignment ? [{ ...assignment, quantity: "" }] : null));

  const totalAmount = useMemo(
    () => rows.reduce((sum, row) => sum + (Number(row.quantity) || 0) * (Number(row.cpu) || 0), 0),
    [rows]
  );

  const handleChange = (id, field, value) => {
    setDraftRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const isToday = reportDate === today;
  const canEdit = isToday && isEditing;

  const beginEdit = () => {
    setDraftRows(rows.map((row) => ({ ...row })));
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setDraftRows(null);
    setIsEditing(false);
  };

  const saveEdit = () => {
    if (!draftRows) return;
    setRows(draftRows);
    setDraftRows(null);
    setIsEditing(false);
  };

  return (
    <WorkerLayout>
      <div className="leave-page leave-list-page">
        <div className="leave-shell mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="rounded-xl border border-slate-200 p-2 text-slate-400 transition hover:bg-slate-50"
                aria-label="Quay lại"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  {assignment ? "Báo cáo sản lượng công đoạn" : "Báo cáo sản lượng hằng ngày"}
                </h1>
                <p className="text-slate-600">
                  {assignment
                    ? "Nhập số lượng hoàn thành cho công đoạn được chọn."
                    : "Nhập số lượng đã hoàn thành theo công đoạn."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <button
                  onClick={beginEdit}
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                  disabled={!isToday}
                >
                  Chỉnh sửa
                </button>
              ) : (
                <>
                  <button
                    onClick={cancelEdit}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={saveEdit}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    Lưu
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ngày báo cáo</div>
              <div className="flex items-center gap-3">
                <CalendarDays size={18} className="text-slate-400" />
                <input
                  type="date"
                  value={reportDate}
                  onChange={(event) => setReportDate(event.target.value)}
                  className="w-48 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                />
                <span className="text-xs text-slate-500">
                  {isToday ? "Chỉ cho phép nhập sản lượng trong ngày." : "Chỉ được chỉnh sửa trong ngày hiện tại."}
                </span>
              </div>
            </div>
          </div>

          <div className="leave-table-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="leave-table-card__header">
              <div>
                <h2 className="leave-table-card__title">Danh sách công đoạn</h2>
                <p className="leave-table-card__subtitle">Điền số lượng hoàn thành và ghi chú nếu cần.</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-slate-200 table-fixed text-sm">
                <thead className="leave-table-head">
                  <tr>
                    <th className="leave-table-th w-14 px-3 py-3 text-center">STT</th>
                    <th className="leave-table-th w-36 px-3 py-3 text-left">Production</th>
                    <th className="leave-table-th w-44 px-3 py-3 text-left">Đơn hàng</th>
                    <th className="leave-table-th w-52 px-3 py-3 text-left">Công đoạn</th>
                    <th className="leave-table-th w-28 px-3 py-3 text-center">Đơn giá</th>
                    <th className="leave-table-th w-28 px-3 py-3 text-center">Số lượng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {(isEditing ? draftRows : rows).map((row, index) => (
                    <tr key={row.id} className="leave-table-row hover:bg-slate-50/80">
                      <td className="px-3 py-2 text-center">{index + 1}</td>
                      <td className="px-3 py-2 text-slate-700">#PR-{row.productionId}</td>
                      <td className="px-3 py-2 text-slate-700">{row.orderName}</td>
                      <td className="px-3 py-2 font-medium text-slate-800">{row.partName}</td>
                      <td className="px-3 py-2 text-center font-semibold text-slate-700">
                        {row.cpu ? `${row.cpu.toLocaleString("vi-VN")} VND` : "-"}
                      </td>
                      <td className="px-3 py-2">
                        {canEdit ? (
                          <input
                            type="number"
                            min="0"
                            value={row.quantity}
                            onChange={(event) => handleChange(row.id, "quantity", event.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                          />
                        ) : (
                          <div className="text-center text-slate-700 font-medium">
                            {row.quantity === "" ? "-" : row.quantity}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50">
                    <td colSpan={5} className="px-3 py-3 font-semibold text-slate-700">TOTAL</td>
                    <td className="px-3 py-3 text-center font-semibold text-slate-700">
                      {totalAmount.toLocaleString("vi-VN")} VND
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </WorkerLayout>
  );
}
