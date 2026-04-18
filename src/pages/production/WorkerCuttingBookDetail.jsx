import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ClipboardCheck, Edit, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
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
  const [collapseMeta, setCollapseMeta] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [record, setRecord] = useState(DEFAULT_RECORD);
  const [recordErrors, setRecordErrors] = useState({});
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const LayoutComponent = useMemo(() => {
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
    if (!hasValue(record.color)) {
      errs.color = "Vui lòng nhập màu.";
    } else if (String(record.color).length > 30) {
      errs.color = "Màu sắc tối đa 30 ký tự.";
    }
    const mPk = Number(record.meterPerKg);
    if (!hasValue(record.meterPerKg)) {
      errs.meterPerKg = "Nhập số m/kg.";
    } else if (isNaN(mPk) || mPk <= 0) {
      errs.meterPerKg = "Phải là số dương.";
    } else if (mPk > 1000) {
      errs.meterPerKg = "Tối đa 1000.";
    } else if (String(record.meterPerKg).length > 10) {
      errs.meterPerKg = "Số quá dài (Tối đa 10 ký tự).";
    }
    const ly = Number(record.layer);
    if (!hasValue(record.layer)) {
      errs.layer = "Nhập số lớp.";
    } else if (isNaN(ly) || ly <= 0) {
      errs.layer = "Phải là số dương.";
    } else if (ly > 1000) {
      errs.layer = "Tối đa 1000.";
    } else if (String(record.layer).length > 10) {
      errs.layer = "Số quá dài.";
    }
    const qty = Number(record.productQty);
    if (!hasValue(record.productQty)) {
      errs.productQty = "Nhập sản lượng.";
    } else if (isNaN(qty) || qty <= 0) {
      errs.productQty = "Phải là số dương.";
    } else if (qty > 1000000) {
      errs.productQty = "Tối đa 1.000.000 cái.";
    } else if (String(record.productQty).length > 10) {
      errs.productQty = "Dữ liệu quá dài.";
    }
    if (record.note && record.note.length > 200) {
      toast.warning("Ghi chú tối đa 200 ký tự.");
      return false;
    }
    setRecordErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleEditRecord = (item) => {
    setRecord({
      color: item.color,
      meterPerKg: item.meterPerKg,
      layer: item.layer,
      productQty: item.productQty,
      dateCreate: item.dateCreate?.split(" ")[0] || getTodayString(),
      note: item.note,
    });
    setEditingRecordId(item.id);
    setRecordErrors({});
    setShowEntryModal(true);
  };

  const [isDeletingId, setIsDeletingId] = useState(null);

  const handleDeleteRecord = async (logId) => {
    try {
      setIsDeletingId(logId);
      await CuttingNotebookService.deleteLog(logId);
      setRecords((prev) => prev.filter((r) => r.id !== logId));
      toast.success("Đã xóa dòng ghi thành công!");
    } catch (err) {
      console.error("Error deleting log:", err);
      toast.error(getErrorMessage(err, "Không thể xóa dòng ghi."));
    } finally {
      setIsDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const saveRecord = async () => {
    if (!validateRecord()) return false;
    try {
      setIsSavingRecord(true);
      const currentId = user?.userId || user?.id || localStorage.getItem("userId") || 1;

      if (editingRecordId) {
        const payload = {
          color: record.color,
          meterPerKg: Number(record.meterPerKg),
          layer: Number(record.layer),
          productQty: Number(record.productQty),
          avgConsumption: Number(record.avgConsumption || 0),
          note: record.note,
        };
        const res = await CuttingNotebookService.updateLog(editingRecordId, payload);
        const updatedLog = res?.data?.data ?? res?.data ?? res;
        setRecords((prev) => prev.map((r) => (r.id === editingRecordId ? mapNotebookLogToRecord(updatedLog) : r)));
        toast.success("Cập nhật dòng ghi thành công!");
      } else {
        const payload = {
          userId: Number(currentId),
          color: record.color,
          meterPerKg: Number(record.meterPerKg),
          layer: Number(record.layer),
          productQty: Number(record.productQty),
          dateCreate: record.dateCreate ? new Date(record.dateCreate).toISOString() : new Date().toISOString(),
          note: record.note,
        };
        const res = await CuttingNotebookService.createLog(notebookId, payload);
        const newLog = res?.data?.data ?? res?.data ?? res;
        setRecords((prev) => [mapNotebookLogToRecord(newLog), ...prev]);
        toast.success("Đã ghi dòng mới thành công!");
      }

      clearRecord();
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
      <LayoutComponent>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
        </div>
      </LayoutComponent>
    );
  }

  return (
    <LayoutComponent>
      <div className="leave-page min-h-screen pb-20">
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
            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-800">Thông tin chung</h2>
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
              <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-800">Ghi sản lượng</h2>
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
            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-800">Lịch sử ghi</h2>
          </div>
          {records.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-slate-200 table-fixed text-sm">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-3 py-3 text-center w-14">STT</th>
                    <th className="px-3 py-3 text-left w-24">Màu</th>
                    <th className="px-3 py-3 text-center w-24">Số m/kg</th>
                    <th className="px-3 py-3 text-center w-24">Số lớp</th>
                    <th className="px-3 py-3 text-center w-28">Sản lượng</th>
                    <th className="px-3 py-3 text-center w-28">Ngày ghi</th>
                    <th className="px-3 py-3 text-left w-48">Ghi chú</th>
                    <th className="px-3 py-3 text-center w-32">Thao tác</th>
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
                      <td className="px-3 py-2 text-slate-500 italic text-xs truncate max-w-[150px]" title={item.note}>{item.note || "-"}</td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditRecord(item)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Sửa"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(item.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Xóa"
                          >
                            {isDeletingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      </td>
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
                <ModalField
                  label="MÀU SẮC"
                  value={record.color}
                  onChange={(v) => updateRecord("color", v)}
                  error={recordErrors.color}
                  placeholder="Ví dụ: Đen"
                  maxLength={30}
                />
                <ModalField
                  label="SỐ M/KG"
                  value={record.meterPerKg}
                  onChange={(v) => updateRecord("meterPerKg", v)}
                  error={recordErrors.meterPerKg}
                  placeholder="65"
                  maxLength={10}
                />
                <ModalField
                  label="SỐ LỚP VẢI"
                  value={record.layer}
                  onChange={(v) => updateRecord("layer", v)}
                  error={recordErrors.layer}
                  placeholder="10"
                  maxLength={10}
                />
                <ModalField
                  label="SẢN LƯỢNG (CÁI)"
                  value={record.productQty}
                  onChange={(v) => updateRecord("productQty", v)}
                  error={recordErrors.productQty}
                  placeholder="400"
                  maxLength={10}
                />
              </div>
              <ModalTextarea
                label="GHI CHÚ THÊM"
                value={record.note}
                onChange={(v) => updateRecord("note", v)}
                placeholder="Nhập ghi chú nếu có..."
                maxLength={200}
              />
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
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="rounded-full bg-rose-50 p-3 text-rose-500">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Xác nhận xóa?</h3>
                <p className="text-sm text-slate-500 mt-1">Dòng ghi này sẽ bị xóa vĩnh viễn khỏi sổ cắt. Thao tác này không thể hoàn tác.</p>
              </div>
            </div>
            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => handleDeleteRecord(confirmDeleteId)}
                disabled={!!isDeletingId}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 rounded-xl shadow-lg shadow-rose-100 transition-all active:scale-95"
              >
                {isDeletingId ? "Đang xóa..." : "Xóa vĩnh viễn"}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </LayoutComponent>
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

function ModalField({ label, value, onChange, disabled, error, placeholder, maxLength }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
      <div className="relative">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          maxLength={maxLength}
          className={`w-full rounded-2xl border px-4 py-3 text-sm font-semibold outline-none transition-all ${error ? "border-rose-300 bg-rose-50/30 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"
              : "border-slate-200 bg-slate-50/50 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
            } disabled:bg-slate-100 placeholder:text-slate-300 placeholder:font-normal`}
        />
        {maxLength && value && (
          <div className="absolute right-3 top-[-10px] bg-white px-1 text-[9px] font-bold text-slate-300">
            {value.length}/{maxLength}
          </div>
        )}
      </div>
      {error && (
        <div className="flex items-center gap-1.5 px-1 py-0.5 animate-in slide-in-from-top-1 duration-200">
          <div className="w-1 h-1 rounded-full bg-rose-500" />
          <span className="text-[10px] font-bold text-rose-500">{error}</span>
        </div>
      )}
    </label>
  );
}

function ModalTextarea({ label, value, onChange, disabled, placeholder, maxLength }) {
  return (
    <label className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
        {maxLength && (
          <span className={`text-[10px] font-bold ${value?.length >= maxLength ? 'text-rose-500' : 'text-slate-300'}`}>
            {value?.length || 0}/{maxLength}
          </span>
        )}
      </div>
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:bg-slate-100 transition-all placeholder:text-slate-300"
      />
    </label>
  );
}
