import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ClipboardCheck, Eraser, Plus, Save } from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import WorkerLayout from "@/layouts/WorkerLayout";
import OwnerLayout from "@/layouts/OwnerLayout";
import { getStoredUser } from "@/lib/authStorage";
import { hasAnyRole } from "@/lib/internalRoleFlow";
import CuttingNotebookService from "@/services/CuttingNotebookService";
import {
  DEFAULT_RECORD,
  DEFAULT_META,
  extractDataList,
  mapNotebookLogToRecord,
  calcTotalLayers,
  getTodayString,
  hasValue
} from "@/utils/workerCuttingBookUtils";
import { getErrorMessage } from "@/utils/errorUtils";
import "@/styles/homepage.css";
import "@/styles/leave.css";

export default function WorkerCuttingBookDetail() {
  const { id: notebookId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const user = getStoredUser();

  const [notebook, setNotebook] = useState(null);
  const [records, setRecords] = useState([]);
  const [meta, setMeta] = useState(DEFAULT_META);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [collapseMeta, setCollapseMeta] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [record, setRecord] = useState(DEFAULT_RECORD);
  const [recordErrors, setRecordErrors] = useState({});
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [savedAt, setSavedAt] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const Layout = useMemo(() => {
    const roleValue = user?.role ?? user?.roles ?? user?.roleName ?? "";
    if (hasAnyRole(roleValue, ["Owner", "PM"])) return OwnerLayout;
    return WorkerLayout;
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      if (!notebookId) return;
      try {
        setLoading(true);
        const [nbRes, logsRes] = await Promise.all([
          CuttingNotebookService.getNotebookById(notebookId),
          CuttingNotebookService.getListLogs(notebookId).catch(() => ({ data: [] }))
        ]);

        const nbData = nbRes?.data?.data ?? nbRes?.data ?? nbRes;
        const logsData = extractDataList(logsRes?.data ?? logsRes);

        if (nbData) {
          setNotebook(nbData);
          setMeta({
            productionId: nbData.productionId || "",
            markerLength: String(nbData.markerLength || ""),
            fabricWidth: String(nbData.fabricWidth || ""),
            productionName: location?.state?.productionName || ""
          });
          setRecords(logsData.map(mapNotebookLogToRecord));
        }
      } catch (err) {
        console.error("Error fetching notebook detail:", err);
        toast.error(getErrorMessage(err, "Không thể tải thông tin sổ cắt."));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [notebookId]);

  const totalLayers = useMemo(() => calcTotalLayers(records), [records]);

  const updateMeta = (field, value) => setMeta((prev) => ({ ...prev, [field]: value }));
  const updateRecord = (field, value) => {
    setRecord((prev) => ({ ...prev, [field]: value }));
    if (recordErrors[field]) {
      setRecordErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const [isUpdatingMeta, setIsUpdatingMeta] = useState(false);

  const handleToggleMetaEdit = async () => {
    if (isUpdatingMeta) {
      const mLen = Number(meta.markerLength);
      const fWidth = Number(meta.fabricWidth);
      if (isNaN(mLen) || mLen <= 0 || isNaN(fWidth) || fWidth <= 0) {
        toast.warning("Thông số kỹ thuật phải là số dương.");
        return;
      }
      if (mLen > 1000 || fWidth > 1000) {
        toast.warning("Thông số vượt ngưỡng cho phép (Dài < 1000, Khổ < 1000).");
        return;
      }
      if (String(meta.markerLength).length > 10 || String(meta.fabricWidth).length > 10) {
        toast.warning("Độ dài ký tự quá lớn.");
        return;
      }

      try {
        const payload = {
          markerLength: mLen,
          fabricWidth: fWidth,
        };
        await CuttingNotebookService.updateNotebook(notebookId, payload);
        toast.success("Cập nhật thông tin chung thành công!");
      } catch (err) {
        console.error("Error updating meta:", err);
        toast.error(getErrorMessage(err, "Không thể cập nhật thông tin chung. Vui lòng thử lại."));
        return;
      }
    }
    setIsUpdatingMeta((prev) => !prev);
  };

  const openCreateRecord = () => {
    setRecord({ ...DEFAULT_RECORD, dateCreate: getTodayString() });
    setEditingRecordId(null);
    setRecordErrors({});
    setShowEntryModal(true);
  };

  const clearRecord = () => {
    setRecord({ ...DEFAULT_RECORD, dateCreate: getTodayString() });
    setRecordErrors({});
  };

  const validateRecord = () => {
    const errs = {};
    if (!hasValue(record.color)) errs.color = "Vui lòng nhập màu.";

    const mPk = Number(record.meterPerKg);
    if (!hasValue(record.meterPerKg)) errs.meterPerKg = "Nhập số m/kg.";
    else if (isNaN(mPk) || mPk <= 0) errs.meterPerKg = "Phải là số dương.";
    else if (mPk > 1000) errs.meterPerKg = "Tối đa 1000.";

    const ly = Number(record.layer);
    if (!hasValue(record.layer)) errs.layer = "Nhập số lớp.";
    else if (isNaN(ly) || ly <= 0) errs.layer = "Phải là số dương.";
    else if (ly > 1000) errs.layer = "Tối đa 1000.";

    const qty = Number(record.productQty);
    if (!hasValue(record.productQty)) errs.productQty = "Nhập sản lượng.";
    else if (isNaN(qty) || qty <= 0) errs.productQty = "Phải là số dương.";
    else if (qty > 100000) errs.productQty = "Sản lượng quá lớn.";

    if (Object.keys(errs).length === 0 && (
      String(record.meterPerKg).length > 10 ||
      String(record.layer).length > 10 ||
      String(record.productQty).length > 10 ||
      String(record.color).length > 50
    )) {
      toast.warning("Dữ liệu nhập quá dài.");
      return false;
    }

    setRecordErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const saveRecord = async () => {
    if (!validateRecord()) return false;
    try {
      setIsSavingRecord(true);
      const currentId = user?.userId || user?.id || localStorage.getItem("userId") || 1;
      const payload = {
        userId: Number(currentId),
        color: record.color,
        meterPerKg: Number(record.meterPerKg),
        layer: Number(record.layer),
        productQty: Number(record.productQty),
        dateCreate: record.dateCreate ? new Date(record.dateCreate).toISOString() : new Date().toISOString(),
        note: record.note,
      };

      console.log(payload);
      const res = await CuttingNotebookService.createLog(notebookId, payload);
      const newLog = res?.data?.data ?? res?.data ?? res;
      setRecords((prev) => [mapNotebookLogToRecord(newLog), ...prev]);

      clearRecord();
      setSavedAt(new Date().toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }));
      toast.success("Đã ghi dòng mới thành công!");
      return true;
    } catch (err) {
      console.error("Error saving log:", err);
      toast.error(getErrorMessage(err, "Không thể lưu dòng ghi. Vui lòng thử lại."));
      return false;
    } finally {
      setIsSavingRecord(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const pId = notebook?.productionId || meta.productionId;
                if (pId) {
                  navigate("/worker/cutting-book", { 
                    state: { 
                      productionId: pId,
                      productionName: meta.productionName 
                    } 
                  });
                } else {
                  navigate("/worker/cutting-book");
                }
              }}
              className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Chi tiết Sổ cắt</h1>
              <p className="text-slate-600">Sổ #{notebookId} · Đơn sản xuất #{meta.productionId}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleMetaEdit}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition-all shadow-sm ${isUpdatingMeta
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
          >
            {isUpdatingMeta ? <Save size={16} /> : <Plus size={16} />}
            {isUpdatingMeta ? "Hoàn tất" : "Chỉnh sửa TT chung"}
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-600 mb-4">
            <ClipboardCheck size={16} />
            <h2 className="text-xs font-bold uppercase tracking-widest">Thông tin chung</h2>
          </div>
          <button
            type="button"
            onClick={() => setCollapseMeta((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2 text-left text-xs font-semibold text-slate-600"
          >
            <span>Thu gọn / Mở rộng</span>
            <span className="text-xs text-emerald-700">{collapseMeta ? "Mở rộng" : "Thu gọn"}</span>
          </button>
          {!collapseMeta && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field compact label="Mã đơn sản xuất" value={meta.productionId} disabled />
              <Field compact label="Chiều dài sơ đồ (m)" value={meta.markerLength} onChange={(v) => updateMeta("markerLength", v)} disabled={!isUpdatingMeta} />
              <Field compact label="Khổ vải (cm)" value={meta.fabricWidth} onChange={(v) => updateMeta("fabricWidth", v)} disabled={!isUpdatingMeta} />
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-slate-600">
              <ClipboardCheck size={16} />
              <h2 className="text-xs font-bold uppercase tracking-widest">Ghi log sản lượng</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openCreateRecord}
                className="rounded-xl border border-emerald-600 bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 shadow-md"
              >
                + Thêm dòng mới
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-600 mb-4">
            <ClipboardCheck size={16} />
            <h2 className="text-xs font-bold uppercase tracking-widest">Lịch sử ghi log</h2>
          </div>
          {records.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-slate-200 table-fixed text-sm">
                <thead className="leave-table-head">
                  <tr>
                    <th className="px-3 py-3 text-center w-14">STT</th>
                    <th className="px-3 py-3 text-left w-24">Màu</th>
                    <th className="px-3 py-3 text-center w-24">Số m/kg</th>
                    <th className="px-3 py-3 text-center w-24">Số lớp</th>
                    <th className="px-3 py-3 text-center w-28">Sản lượng</th>
                    <th className="px-3 py-3 text-center w-28">Ngày ghi</th>
                    <th className="px-3 py-3 text-left w-48">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {records.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-2 text-center text-slate-400 font-medium">{index + 1}</td>
                      <td className="px-3 py-2 font-semibold text-slate-700">{item.color || "-"}</td>
                      <td className="px-3 py-2 text-center font-medium">{item.meterPerKg || "-"}</td>
                      <td className="px-3 py-2 text-center">
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-bold border border-emerald-100">
                          {item.layer || "-"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-slate-800">{item.productQty || "-"}</td>
                      <td className="px-3 py-2 text-center text-slate-500 text-xs">{item.dateCreate || "-"}</td>
                      <td className="px-3 py-2 text-slate-500 italic text-xs">{item.note || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400 italic text-sm">Chưa có dòng ghi nào.</div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm text-slate-700 shadow-sm">
          <span className="font-semibold">Đã lưu:</span> {records.length} dòng ·
          <span className="ml-2 font-semibold">Tổng số lớp:</span> {totalLayers}
        </div>
      </div>

      {showEntryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div className="text-lg font-bold text-slate-900 uppercase tracking-tight">
                {editingRecordId ? "Chỉnh sửa dòng" : "Thêm dòng ghi log mới"}
              </div>
              <button
                type="button"
                onClick={() => setShowEntryModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Đóng"
              >
                Đóng
              </button>
            </div>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <ModalField label="Màu sắc" value={record.color} onChange={(v) => updateRecord("color", v)} error={recordErrors.color} placeholder="Ví dụ: Đen" />
                <ModalField label="Số m/kg" value={record.meterPerKg} onChange={(v) => updateRecord("meterPerKg", v)} error={recordErrors.meterPerKg} placeholder="65" />
                <ModalField label="Số lớp vải" value={record.layer} onChange={(v) => updateRecord("layer", v)} error={recordErrors.layer} placeholder="10" />
                <ModalField label="Sản lượng (Cái)" value={record.productQty} onChange={(v) => updateRecord("productQty", v)} error={recordErrors.productQty} placeholder="400" />
              </div>
              <ModalTextarea label="Ghi chú thêm" value={record.note} onChange={(v) => updateRecord("note", v)} placeholder="Nhập ghi chú nếu có..." />
            </div>
            <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-50">
              <button
                type="button"
                onClick={() => setShowEntryModal(false)}
                className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={async () => {
                  const ok = await saveRecord();
                  if (ok) setShowEntryModal(false);
                }}
                disabled={isSavingRecord}
                className="rounded-xl bg-emerald-600 px-8 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:bg-emerald-300 shadow-lg shadow-emerald-100 transition-all active:scale-95"
              >
                {isSavingRecord ? "Đang lưu..." : "Xác nhận & Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function Field({ label, value, onChange, disabled, compact }) {
  return (
    <label className={`flex flex-col gap-1.5 ${compact ? "text-[10px]" : "text-xs"} font-bold text-slate-500`}>
      <span className="uppercase tracking-wider opacity-60">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:bg-slate-100 disabled:text-slate-400 transition-all"
      />
    </label>
  );
}

function ModalField({ label, value, onChange, disabled, error, placeholder }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all ${error ? "border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10" : "border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          } disabled:bg-slate-100`}
      />
      {error && <span className="text-[10px] font-bold text-rose-500">{error}</span>}
    </label>
  );
}

function ModalTextarea({ label, value, onChange, disabled, placeholder }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">{label}</span>
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:bg-slate-100 transition-all"
      />
    </label>
  );
}
