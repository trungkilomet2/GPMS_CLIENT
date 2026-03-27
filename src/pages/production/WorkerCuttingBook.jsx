import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ClipboardCheck, Plus, Save } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import WorkerLayout from "@/layouts/WorkerLayout";
import OwnerLayout from "@/layouts/OwnerLayout";
import { getStoredUser } from "@/lib/authStorage";
import { hasAnyRole } from "@/lib/internalRoleFlow";
import CuttingNotebookService from "@/services/CuttingNotebookService";
import ProductionService from "@/services/ProductionService";
import {
  DEFAULT_META,
  extractDataList,
  calcTotalLayers,
  hasValue
} from "@/utils/workerCuttingBookUtils";
import "@/styles/homepage.css";
import "@/styles/leave.css";

export default function WorkerCuttingBook() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getStoredUser();

  const locationProductionId = useMemo(() => {
    const raw =
      location?.state?.productionId ??
      location?.state?.production?.productionId ??
      location?.state?.production?.id ??
      "";
    return String(raw || "").trim();
  }, [location]);

  const [extProduction, setExtProduction] = useState(null);

  const productionName = useMemo(() => {
    return location?.state?.productionName || 
           location?.state?.production?.order?.orderName || 
           location?.state?.production?.orderName ||
           location?.state?.production?.name || 
           extProduction?.order?.orderName ||
           "";
  }, [location, extProduction]);

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBook, setNewBook] = useState({ markerLength: "", fabricWidth: "" });
  const [isCreating, setIsCreating] = useState(false);
  
  const PAGE_SIZE = 8;

  const Layout = useMemo(() => {
    const roleValue = user?.role ?? user?.roles ?? user?.roleName ?? "";
    if (hasAnyRole(roleValue, ["Owner", "PM"])) return OwnerLayout;
    return WorkerLayout;
  }, [user]);

  const fetchNotebooks = async () => {
    if (!locationProductionId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      
      // Fetch production detail if name is missing
      if (!productionName && locationProductionId) {
        try {
          const prodRes = await ProductionService.getProductionDetail(locationProductionId);
          const pData = prodRes?.data?.data ?? prodRes?.data ?? prodRes;
          if (pData) setExtProduction(pData);
        } catch (e) {
          console.error("Error fetching fallback production info:", e);
        }
      }

      const res = await CuttingNotebookService.getByProduction(locationProductionId);
      const notebookList = extractDataList(res?.data ?? res);
      
      // Since the list API doesn't return logs or summaries, we fetch logs for each notebook
      const notebooksWithLogs = await Promise.all(
        notebookList.map(async (nb) => {
          try {
            const logsRes = await CuttingNotebookService.getListLogs(nb.id);
            const logs = extractDataList(logsRes?.data ?? logsRes);
            return { ...nb, logs };
          } catch (e) {
            console.error(`Error fetching logs for notebook ${nb.id}:`, e);
            return { ...nb, logs: [] };
          }
        })
      );

      const allBooks = notebooksWithLogs.map(nb => ({
        notebookId: nb.id,
        productionId: locationProductionId,
        productionName: productionName,
        markerLength: nb.markerLength,
        fabricWidth: nb.fabricWidth,
        recordsCount: nb.logs?.length || 0,
        totalLayers: calcTotalLayers(nb.logs || []),
        updatedAt: nb.updatedAt || nb.modifiedDate || nb.createdAt || nb.createdDate || nb.dateCreate || null
      }));

      setBooks(allBooks);
    } catch (err) {
      console.error("Error fetching notebooks:", err);
      toast.error("Không thể tải danh sách sổ cắt.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotebooks();
  }, [locationProductionId]);

  const totalPages = Math.ceil(books.length / PAGE_SIZE);
  const pagedBooks = books.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openDetail = (notebookId) => {
    navigate(`/worker/cutting-book/detail/${notebookId}`, {
      state: { 
        productionId: locationProductionId,
        productionName: productionName
      }
    });
  };

  const handleCreate = async () => {
    if (!hasValue(newBook.markerLength) || !hasValue(newBook.fabricWidth)) {
      toast.warning("Vui lòng nhập đầy đủ chiều dài sơ đồ và khổ vải.");
      return;
    }
    const mLen = Number(newBook.markerLength);
    const fWidth = Number(newBook.fabricWidth);
    if (isNaN(mLen) || mLen <= 0 || isNaN(fWidth) || fWidth <= 0) {
      toast.warning("Thông số kỹ thuật phải là số dương hợp lệ.");
      return;
    }
    if (mLen > 1000 || fWidth > 500) {
      toast.warning("Thông số vượt ngưỡng cho phép (Dài < 1000, Khổ < 500).");
      return;
    }
    if (String(newBook.markerLength).length > 10 || String(newBook.fabricWidth).length > 10) {
      toast.warning("Độ dài ký tự quá lớn.");
      return;
    }

    try {
      setIsCreating(true);
      const payload = {
        productionId: Number(locationProductionId),
        markerLength: mLen,
        fabricWidth: fWidth,
      };
      await CuttingNotebookService.createNotebook(payload);
      toast.success("Tạo sổ cắt thành công!");
      setShowCreateModal(false);
      setNewBook({ markerLength: "", fabricWidth: "" });
      fetchNotebooks();
    } catch (err) {
      console.error("Error creating notebook:", err);
      toast.error("Không thể tạo sổ cắt.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Layout>
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const roleValue = user?.role ?? user?.roles ?? user?.roleName ?? "";
                const isOwner = hasAnyRole(roleValue, ["Owner", "PM", "Team Leader"]);
                if (isOwner && locationProductionId) {
                  navigate(`/production/${locationProductionId}`);
                } else {
                  navigate(isOwner ? "/production" : "/worker/production-plan");
                }
              }}
              className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Sổ cắt</h1>
              <p className="text-slate-600">
                Danh sách sổ cắt của đơn hàng #{locationProductionId}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-emerald-100 transition hover:bg-emerald-700 active:scale-95"
          >
            <Plus size={18} />
            Tạo sổ mới
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-6">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-[10px] font-bold uppercase text-slate-400">Mã đơn sản xuất</div>
                    <div className="font-bold text-slate-700">#{locationProductionId}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-[10px] font-bold uppercase text-slate-400">Tên đơn hàng</div>
                    <div className="font-bold text-slate-700">{productionName || "-"}</div>
                </div>
            </div>

          <div className="flex items-center gap-2 text-slate-600 mb-4">
            <ClipboardCheck size={16} />
            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-800">
                Sổ cắt đã lưu
            </h2>
          </div>

          {loading ? (
             <div className="flex justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"></div>
             </div>
          ) : books.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-4 py-3 text-center w-16">STT</th>
                    <th className="px-4 py-3 text-left">Mã sổ</th>
                    <th className="px-4 py-3 text-center">Khổ vải (cm)</th>
                    <th className="px-4 py-3 text-center">Dài sơ đồ (m)</th>
                    <th className="px-4 py-3 text-center">Lớp vải</th>
                    <th className="px-4 py-3 text-center">Dòng ghi</th>
                    <th className="px-4 py-3 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {pagedBooks.map((book, idx) => (
                    <tr key={book.notebookId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 text-center font-medium text-slate-400">
                        {(page - 1) * PAGE_SIZE + idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-700">#{book.notebookId}</div>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600 font-medium">
                        {book.fabricWidth}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600 font-medium">
                        {book.markerLength}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-100">
                          {book.totalLayers} lớp
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600 font-medium">
                        {book.recordsCount}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => openDetail(book.notebookId)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-emerald-700 transition shadow-sm"
                        >
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 bg-slate-50/30 rounded-2xl border border-dashed border-slate-200">
                <div className="flex flex-col items-center gap-2">
                    <ClipboardCheck size={32} className="text-slate-300" />
                    <p>Chưa có sổ cắt nào được tạo cho đơn hàng này.</p>
                    <button 
                        onClick={() => setShowCreateModal(true)}
                        className="mt-2 text-emerald-600 font-bold hover:underline"
                    >
                        Tạo ngay sổ cắt đầu tiên
                    </button>
                </div>
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-4">
              <span className="text-xs text-slate-500">
                Hiển thị {pagedBooks.length} / {books.length} kết quả
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                >
                  Trước
                </button>
                <div className="text-xs font-bold text-slate-600">Trang {page} / {totalPages}</div>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">Tạo Sổ cắt mới</h2>
            <div className="space-y-4">
               <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-slate-700 uppercase">Khổ vải (cm)</span>
                  <input 
                    type="number"
                    value={newBook.fabricWidth}
                    onChange={(e) => setNewBook(p => ({ ...p, fabricWidth: e.target.value }))}
                    placeholder="Ví dụ: 160"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition"
                  />
               </label>
               <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-slate-700 uppercase">Chiều dài sơ đồ (m)</span>
                  <input 
                    type="number"
                    value={newBook.markerLength}
                    onChange={(e) => setNewBook(p => ({ ...p, markerLength: e.target.value }))}
                    placeholder="Ví dụ: 12.5"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition"
                  />
               </label>
            </div>
            <div className="mt-8 flex gap-2">
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 transition"
                >
                    Hủy
                </button>
                <button 
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:bg-emerald-300 transition"
                >
                    {isCreating ? "Đang tạo..." : "Xác nhận"}
                </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
