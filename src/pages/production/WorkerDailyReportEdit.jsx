import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import OwnerLayout from "@/layouts/OwnerLayout";
import "@/styles/homepage.css";
import "@/styles/leave.css";
import ProductionPartService from "@/services/ProductionPartService";
import { getStoredUser } from "@/lib/authStorage";

export default function WorkerDailyReportEdit() {
  const navigate = useNavigate();
  const location = useLocation();
  const workLogs = Array.isArray(location.state?.workLogs) ? location.state.workLogs : [];

  const [isSavingAll, setIsSavingAll] = useState(false);
  const [rows, setRows] = useState(() =>
    workLogs.map((log, index) => ({
      id: log?.id ?? `${log?.workLogId || "log"}-${index}`,
      workLogId: log?.workLogId ?? log?.id ?? null,
      partId: log?.partId ?? null,
      productionId: log?.productionId ?? "",
      orderName: log?.orderName ?? "",
      partName: log?.partName ?? "-",
      cpu: log?.cpu ?? 0,
      quantity: log?.quantity ?? 0,
      reportDate: log?.reportDate ?? "",
      userId: log?.userId ?? null,
    }))
  );
  const [draftRows, setDraftRows] = useState(() =>
    workLogs.map((log, index) => ({
      id: log?.id ?? `${log?.workLogId || "log"}-${index}`,
      workLogId: log?.workLogId ?? log?.id ?? null,
      partId: log?.partId ?? null,
      productionId: log?.productionId ?? "",
      orderName: log?.orderName ?? "",
      partName: log?.partName ?? "-",
      cpu: log?.cpu ?? 0,
      quantity: log?.quantity ?? 0,
      reportDate: log?.reportDate ?? "",
      userId: log?.userId ?? null,
    }))
  );

  const totalAmount = useMemo(
    () => draftRows.reduce((sum, row) => sum + (Number(row.quantity) || 0) * (Number(row.cpu) || 0), 0),
    [draftRows]
  );

  const handleChange = (id, field, value) => {
    setDraftRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const buildPayload = (row) => {
    const currentUser = getStoredUser();
    const currentId = currentUser?.userId || currentUser?.id;
    const workDate = row.reportDate
      ? new Date(row.reportDate).toISOString()
      : new Date().toISOString();
    return {
      userId: Number(currentId) || Number(row.userId) || 1,
      quantity: Number(row.quantity || 0),
      workDate,
    };
  };

  const saveAll = async () => {
    if (isSavingAll) return;
    if (!Array.isArray(draftRows) || draftRows.length === 0) return;
    setIsSavingAll(true);
    try {
      const results = await Promise.allSettled(
        draftRows.map(async (row) => {
          if (!row?.partId || !row?.workLogId) return { row, skipped: true };
          const payload = buildPayload(row);
          await ProductionPartService.updateWorkLog(row.partId, row.workLogId, payload);
          return { row };
        })
      );

      const failed = results
        .map((res, idx) => ({ res, row: draftRows[idx] }))
        .filter((item) => item.res.status === "rejected");

      setRows(draftRows.map((row) => ({ ...row })));
      if (failed.length === 0) {
        navigate(-1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingAll(false);
    }
  };

  return (
    <OwnerLayout>
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
                  Chỉnh sửa sản lượng
                </h1>
                <p className="text-slate-600">
                  Cập nhật số lượng cho các công đoạn đã báo cáo.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={saveAll}
                disabled={isSavingAll}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {isSavingAll ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>

          {draftRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
              Không có dữ liệu để chỉnh sửa.
            </div>
          ) : (
            <div className="leave-table-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="leave-table-card__header">
                <div>
                  <h2 className="leave-table-card__title">Danh sách công đoạn</h2>
                  <p className="leave-table-card__subtitle">Chỉnh sửa số lượng đã báo cáo.</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-slate-200 table-fixed text-sm">
                  <thead className="leave-table-head">
                    <tr>
                      <th className="leave-table-th w-14 px-3 py-3 text-center">STT</th>
                      <th className="leave-table-th w-36 px-3 py-3 text-left">Đơn sản xuất</th>
                      <th className="leave-table-th w-44 px-3 py-3 text-left">Đơn hàng</th>
                      <th className="leave-table-th w-52 px-3 py-3 text-left">Công đoạn</th>
                      <th className="leave-table-th w-28 px-3 py-3 text-center">Đơn giá</th>
                      <th className="leave-table-th w-28 px-3 py-3 text-center">Số lượng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {draftRows.map((row, index) => (
                      <tr key={row.id} className="leave-table-row hover:bg-slate-50/80">
                        <td className="px-3 py-2 text-center">{index + 1}</td>
                        <td className="px-3 py-2 text-slate-700">#PR-{row.productionId}</td>
                        <td className="px-3 py-2 text-slate-700">{row.orderName}</td>
                        <td className="px-3 py-2 font-medium text-slate-800">{row.partName}</td>
                        <td className="px-3 py-2 text-center font-semibold text-slate-700">
                          {row.cpu ? `${row.cpu.toLocaleString("vi-VN")} VND` : "-"}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            value={row.quantity}
                            onChange={(event) => handleChange(row.id, "quantity", event.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                          />
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
          )}
        </div>
      </div>
    </OwnerLayout>
  );
}
