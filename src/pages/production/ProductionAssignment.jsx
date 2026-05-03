import { useEffect, useMemo, useState } from "react";
import {
   ArrowLeft, Search, Users, Check, AlertTriangle, Save,
   ChevronDown, ChevronRight, LayoutGrid, Loader2, UserPlus, Info, Zap,
   TrendingUp, UserCheck, Layers, Activity
} from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import OwnerLayout from "@/layouts/OwnerLayout";
import ProductionPartService from "@/services/ProductionPartService";
import ProductionService from "@/services/ProductionService";
import WorkerService from "@/services/WorkerService";
import { toast } from "react-toastify";
import ConfirmModal from "@/components/ConfirmModal";
import { getStoredUser } from "@/lib/authStorage";

export default function ProductionAssignment() {
   const { id } = useParams();
   const navigate = useNavigate();
   const location = useLocation();
   const incoming = useMemo(() => location.state || null, [location.state]);
   const currentUser = useMemo(() => getStoredUser(), []);

   const [selectedProductionId] = useState(() => id || incoming?.production?.productionId || "");
   const [workers, setWorkers] = useState([]);
   const [workerGroups, setWorkerGroups] = useState([]);
   const [assignments, setAssignments] = useState({});
   const [workerQuery, setWorkerQuery] = useState("");
   const [activeRowId, setActiveRowId] = useState(null);
   const [isEditing, setIsEditing] = useState(false);
   const [isSaving, setIsSaving] = useState(false);
   const [fetchedProduction, setFetchedProduction] = useState(null);
   const [backendParts, setBackendParts] = useState([]);
   const [initialAssignments, setInitialAssignments] = useState({});
   const [isConfirmOpen, setIsConfirmOpen] = useState(false);
   const [expandedStages, setExpandedStages] = useState({});

   const roleValue = currentUser?.role ?? currentUser?.roles ?? currentUser?.roleName ?? "";
   const isOwner = roleValue.toLowerCase().includes("owner") || roleValue.toLowerCase().includes("admin");
   const isPM = roleValue.toLowerCase().includes("pm") || roleValue.toLowerCase().includes("manager");
   const currentUserId = currentUser?.id ?? currentUser?.userId ?? currentUser?.accountId;

   useEffect(() => {
      if (selectedProductionId) {
         ProductionService.getProductionDetail(selectedProductionId).then((res) => {
            const p = res?.data?.data || res?.data;
            if (p) {
               const pmId = p.pm?.id ?? p.pmId;
               
               // Authorization Guard
               if (!isOwner && String(currentUserId) !== String(pmId)) {
                  toast.error("Bạn không có quyền quản lý phân công cho đơn sản xuất này.");
                  navigate(`/production/${selectedProductionId}`);
                  return;
               }

               setFetchedProduction({
                  productionId: p.productionId ?? p.id,
                  orderName: p.order?.orderName || p.orderName || "Kế hoạch sản xuất",
                  product: p.order || {},
                  pmId: pmId,
                  startDate: p.startDate || p.order?.startDate,
                  endDate: p.endDate || p.order?.endDate,
               });
            }
         }).catch(() => { });
         ProductionPartService.getPartsByProduction(selectedProductionId, { PageSize: 100 })
            .then(res => setBackendParts(res?.data?.data ?? res?.data ?? []))
            .catch(() => { });
      }
   }, [selectedProductionId, isOwner, currentUserId, navigate]);

   useEffect(() => {
      const loadWorkers = async () => {
         // If we don't have production info yet, we wait.
         if (!fetchedProduction) return;

         try {
            setWorkers([]);
            setWorkerGroups([]);

            const params = {
               PMId: fetchedProduction.pmId,
               fromDate: fetchedProduction.startDate,
               toDate: fetchedProduction.endDate,
            };

            let rawData = [];
            let fetchSuccess = false;

            // 1. Try specialized assignment API (scoped to PM and availability)
            if (params.PMId) {
               try {
                  const res = await ProductionPartService.getAssignWorkers(params);
                  rawData = res?.data?.data || res?.data || [];
                  fetchSuccess = true;
               } catch (apiErr) {
                  console.warn("Specialized worker fetch failed, will try fallback.", apiErr);
               }
            }

            // 2. Fallback for Owner or if specialized API fails/PMId missing
            if (!fetchSuccess) {
               try {
                  const res = await WorkerService.getEmployeeDirectory();
                  const allEmployees = res?.data || res?.data?.data || [];
                  // Map WorkerService format to the format expected by the UI mapping logic below
                  rawData = allEmployees.map(emp => ({
                     workerInfo: { 
                        workerId: emp.id, 
                        workerName: emp.fullName || emp.userFullName 
                     },
                     workerSkillInfo: (emp.workerSkillNames || []).map(s => ({ skillName: s })),
                     managerName: emp.managerName || "Khác"
                  }));
                  fetchSuccess = true;
               } catch (fallbackErr) {
                  console.error("Fallback worker fetch also failed:", fallbackErr);
               }
            }

            if (!fetchSuccess) {
               throw new Error("Could not load workers from any source.");
            }

            const mapped = rawData.map(item => ({
               id: String(item.workerInfo?.workerId || item.workerId),
               fullName: item.workerInfo?.workerName || item.workerName || "—",
               skills: item.workerSkillInfo?.map(s => s.skillName) || [],
               role: item.workerSkillInfo?.[0]?.skillName || "Thợ",
               managerName: item.managerName || "Nhóm sản xuất",
            }));

            const ownerId = currentUser?.id || currentUser?.userId;
            if (ownerId && !mapped.some(w => String(w.id) === String(ownerId))) {
               mapped.unshift({
                  id: String(ownerId),
                  fullName: currentUser.fullName || "Chủ quản (Bạn)",
                  role: "Chủ quản",
                  managerName: "Ban Quản Trị",
                  skills: ["Quản lý"]
               });
            }

            setWorkers(mapped);
            const groups = {};
            mapped.forEach(w => {
               const gName = w.managerName || "Khác";
               if (!groups[gName]) groups[gName] = { name: gName, members: [] };
               groups[gName].members.push(w);
            });
            const sortedGroups = Object.values(groups).sort((a, b) => {
               if (a.name === "Ban Quản Trị") return -1;
               if (b.name === "Ban Quản Trị") return 1;
               return a.name.localeCompare(b.name);
            });
            setWorkerGroups(sortedGroups);
         } catch (err) {
            console.error("Lỗi lấy danh sách nhân viên:", err);
            toast.error("Không thể tải danh sách thợ.");
         }
      };
      loadWorkers();
   }, [currentUser, fetchedProduction?.pmId, fetchedProduction?.startDate, fetchedProduction?.endDate, fetchedProduction]);

   const rows = useMemo(() => {
      if (!backendParts || !backendParts.length) return [];
      const flattened = [];
      backendParts.forEach(p => {
         const variants = p.listPartOrderSizes || [];
         if (variants.length > 0) {
            variants.forEach(variant => {
               flattened.push({
                  partName: p.partName || p.name || "Chưa đặt tên",
                  cpu: p.cpu || 0,
                  partId: p.id,
                  realPartId: p.id,              // ProductionPart.id → endpoint nhận đúng ID này
                  variantId: variant.id,         // lưu để tham khảo
                  color: variant.color || "—",
                  size: variant.size || "—",
                  quantity: variant.quantity || 0,
                  ppId: variant.id,              // unique key per variant cho UI state
                  assignedWorkerIds: (variant.assigneeIds || []).map(String),
               });
            });
         } else {
            // fallback nếu không có variants
            flattened.push({
               partName: p.partName || p.name || "Chưa đặt tên",
               cpu: p.cpu || 0,
               partId: p.id,
               realPartId: p.id,
               color: p.color || "—",
               size: p.size || "—",
               quantity: p.quantity || 0,
               ppId: p.id,
               assignedWorkerIds: (p.assignedWorkerIds || []).map(String),
            });
         }
      });
      return flattened;
   }, [backendParts]);

   const groupedStages = useMemo(() => {
      const gs = {};
      rows.forEach(r => {
         if (!gs[r.partName]) gs[r.partName] = { name: r.partName, variants: [] };
         gs[r.partName].variants.push(r);
      });
      return Object.values(gs);
   }, [rows]);

   useEffect(() => {
      if (!rows.length) return;
      // Reset hoàn toàn từ server mỗi khi rows thay đổi (backendParts load xong)
      const next = {};
      const base = {};
      rows.forEach(r => {
         const ids = (r.assignedWorkerIds || []).map(String);
         next[r.ppId] = { workerIds: ids };
         base[r.ppId] = { workerIds: [...ids] };
      });
      setAssignments(next);
      setInitialAssignments(base);
      if (rows.length > 0) setActiveRowId(rows[0].ppId);
      if (groupedStages.length > 0) {
         const exp = {};
         groupedStages.forEach(s => exp[s.name] = true);
         setExpandedStages(exp);
      }
   }, [rows]);

   const workerStats = useMemo(() => {
      const data = {};
      workers.forEach(w => data[w.id] = { id: w.id, label: w.fullName, steps: 0, quantity: 0, income: 0 });
      rows.forEach(row => {
         const ids = assignments[row.ppId]?.workerIds || [];
         if (!ids.length) return;
         const perQty = (Number(row.quantity) || 0) / ids.length;
         const perIncome = (Number(row.cpu) || 0) * (Number(row.quantity) || 0) / ids.length;
         ids.forEach(wid => { if (data[wid]) { data[wid].steps++; data[wid].quantity += perQty; data[wid].income += perIncome; } });
      });
      const items = Object.values(data);
      const avg = items.length ? items.reduce((s, i) => s + i.income, 0) / items.length : 0;
      return { avg, items };
   }, [assignments, rows, workers]);

   const toggleWorker = (wid) => {
      if (!isEditing || !activeRowId) return;
      setAssignments(prev => ({
         ...prev,
         [activeRowId]: {
            workerIds: prev[activeRowId].workerIds.includes(wid)
               ? prev[activeRowId].workerIds.filter(id => id !== wid)
               : [...prev[activeRowId].workerIds, wid]
         }
      }));
   };

   const handleBulkAssign = (wid) => {
      if (!isEditing) return;
      // Tìm công đoạn chứa variant đang được chọn
      const activeRow = rows.find(r => r.ppId === activeRowId);
      if (!activeRow) { toast.info("Vui lòng chọn một kích cỡ & màu sắc trước."); return; }
      const activeStageName = activeRow.partName;
      // Lấy tất cả variants của công đoạn đó
      const targetRows = rows.filter(r => r.partName === activeStageName);
      const alreadyFull = targetRows.every(r => (assignments[r.ppId]?.workerIds || []).includes(wid));
      setAssignments(prev => {
         const next = { ...prev };
         targetRows.forEach(r => {
            const cur = next[r.ppId]?.workerIds || [];
            if (alreadyFull) {
               next[r.ppId] = { workerIds: cur.filter(id => id !== wid) };
            } else if (!cur.includes(wid)) {
               next[r.ppId] = { workerIds: [...cur, wid] };
            }
         });
         return next;
      });
      toast.success(alreadyFull
         ? `Đã gỡ thợ khỏi công đoạn "${activeStageName}"`
         : `Đã gán thợ cho toàn bộ ${targetRows.length} kích cỡ & màu sắc của "${activeStageName}"`
      );
   };

   const handleSave = async () => {
      setIsConfirmOpen(false); setIsSaving(true);
      try {
         // Gọi API per-variant: PATCH /update-assign-workers/{partId}/{partOrderSizeId}
         const dirty = rows.filter(r =>
            r.realPartId && r.variantId &&
            [...(assignments[r.ppId]?.workerIds || [])].sort().join(',') !==
            [...(initialAssignments[r.ppId]?.workerIds || [])].sort().join(',')
         );
         if (dirty.length === 0) { toast.info("Không có thay đổi nào."); setIsEditing(false); return; }
         await Promise.allSettled(
            dirty.map(r => {
               const ids = (assignments[r.ppId]?.workerIds || []).map(Number);
               // Nếu không có ai được phân công → gửi [0] (sentinel) để backend xóa hết
               // Gửi [] backend sẽ bỏ qua, [0] mới ra lệnh rõ ràng "xóa hết"
               const workerIds = ids.length > 0 ? ids : [0];
               return ProductionPartService.updateAssignWorker(r.realPartId, r.variantId, { workerIds });
            })
         );
         toast.success(`Đã lưu phân công cho ${dirty.length} kích cỡ & màu sắc!`);
         setInitialAssignments({ ...assignments });
         setIsEditing(false);

         // Cập nhật backendParts local ngay (phòng GET API chưa trả assigneeIds)
         setBackendParts(prev => prev.map(part => ({
            ...part,
            listPartOrderSizes: (part.listPartOrderSizes || []).map(variant => ({
               ...variant,
               assigneeIds: (assignments[variant.id]?.workerIds || variant.assigneeIds || []).map(Number),
            }))
         })));

         // Re-fetch nền để đồng bộ server
         ProductionPartService.getPartsByProduction(selectedProductionId, { PageSize: 100 })
            .then(res => { const p = res?.data?.data ?? res?.data ?? []; if (p.length) setBackendParts(p); })
            .catch(() => { });
      } catch { toast.error("Có lỗi xảy ra khi lưu."); } finally { setIsSaving(false); }
   };

   const activeRow = rows.find(r => r.ppId === activeRowId);

   return (
      <OwnerLayout>
         <div className="leave-page leave-detail-page font-sans pb-20">
            <div className="leave-shell mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">

               {/* HERO HEADER */}
               <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div className="flex items-start gap-4">
                     <button onClick={() => navigate(-1)} className="group flex items-center justify-center w-12 h-12 rounded-xl bg-white border border-gray-200 text-gray-400 transition-all hover:border-[#1e6e43] hover:text-[#1e6e43] shadow-sm active:scale-95">
                        <ArrowLeft size={22} />
                     </button>
                     <div className="space-y-1">
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-none uppercase">
                           Phân công <span className="text-[#1e6e43]">lao động</span>
                        </h1>
                        <p className="text-[10px] font-bold text-gray-600 tracking-widest uppercase">
                           {fetchedProduction?.orderName || "Đang tải..."}
                        </p>
                     </div>
                  </div>

                  <button
                     onClick={() => isEditing ? setIsConfirmOpen(true) : setIsEditing(true)}
                     disabled={isSaving}
                     className={`h-10 px-6 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm active:scale-95 ${isEditing
                        ? 'bg-white text-gray-900 border border-gray-200 hover:border-[#1e6e43] hover:text-[#1e6e43]'
                        : 'bg-[#1e6e43] text-white hover:bg-[#155232]'
                        }`}
                  >
                     {isSaving ? <Loader2 className="animate-spin" size={14} /> : isEditing ? <Save size={14} /> : <UserCheck size={14} />}
                     {isEditing ? "Lưu kết quả" : "Bắt đầu gán việc"}
                  </button>
               </div>

               {/* INCOME BALANCE TABLE */}
               <div className="bg-white rounded-xl border border-black shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                     <div className="flex items-center gap-2">
                        <TrendingUp className="text-[#1e6e43]" size={16} />
                        <h2 className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Điều phối thu nhập</h2>
                     </div>
                     <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-gray-200">
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">TB:</span>
                        <span className="text-xs font-black text-[#1e6e43]">{Math.round(workerStats.avg).toLocaleString()} đ</span>
                     </div>
                  </div>
                  <div className="overflow-x-auto">
                     <table className="w-full">
                        <thead>
                           <tr className="border-b border-gray-100 bg-gray-50/30">
                              <th className="py-2.5 px-6 text-left text-xs font-black text-gray-500 uppercase tracking-widest">Nhân sự</th>
                              <th className="py-2.5 px-4 text-center text-xs font-black text-gray-500 uppercase tracking-widest">Công đoạn</th>
                              <th className="py-2.5 px-4 text-right text-xs font-black text-gray-500 uppercase tracking-widest">Thu nhập dự kiến</th>
                              <th className="py-2.5 px-6 text-center text-xs font-black text-gray-500 uppercase tracking-widest">Trạng thái</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                           {workerStats.items.filter(i => i.steps > 0 || !isEditing).slice(0, 6).map(w => {
                              const isOverloaded = w.income > workerStats.avg * 1.3;
                              return (
                                 <tr key={w.id} className="hover:bg-gray-50/50 transition-all">
                                    <td className="py-3 px-6">
                                       <div className="flex items-center gap-2">
                                          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-black text-gray-600 uppercase">
                                             {String(w.label || "?").charAt(0)}
                                          </div>
                                          <span className="text-sm font-bold text-gray-900 uppercase">{w.label}</span>
                                       </div>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                       <span className="text-sm font-black text-gray-700">{w.steps}</span>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                       <span className="text-sm font-black text-[#1e6e43]">{Math.round(w.income).toLocaleString()} đ</span>
                                    </td>
                                    <td className="py-3 px-6 text-center">
                                       <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase ${isOverloaded ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'}`}>
                                          <span className={`w-1.5 h-1.5 rounded-full ${isOverloaded ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                                          {isOverloaded ? 'Quá tải' : 'Tốt'}
                                       </span>
                                    </td>
                                 </tr>
                              );
                           })}
                        </tbody>
                     </table>
                  </div>
               </div>

               {/* MAIN 2-COL LAYOUT */}
               <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_1fr] gap-8 items-start">

                  {/* LEFT: STAGE ACCORDION */}
                  <div className="bg-white rounded-xl border border-black shadow-sm overflow-hidden">
                     {/* Card header */}
                     <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 bg-gray-50/30">
                        <Layers size={16} className="text-[#1e6e43]" />
                        <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Công đoạn & Phân công</h3>
                        <span className="ml-auto text-[10px] font-bold text-gray-400 uppercase">
                           {groupedStages.length} công đoạn
                        </span>
                     </div>

                     {groupedStages.length === 0 ? (
                        <div className="py-20 flex flex-col items-center gap-3 text-gray-300">
                           <Info size={40} />
                           <p className="text-xs font-black uppercase tracking-widest">Đang tải dữ liệu công đoạn...</p>
                        </div>
                     ) : (
                        <div className="divide-y divide-gray-100">
                           {groupedStages.map((stage, sIdx) => {
                              const isOpen = !!expandedStages[stage.name];
                              const totalVariants = stage.variants.length;
                              const assignedCount = stage.variants.filter(v => (assignments[v.ppId]?.workerIds || []).length > 0).length;

                              return (
                                 <div key={sIdx}>
                                    {/* Stage Header Row */}
                                    <button
                                       onClick={() => setExpandedStages(p => ({ ...p, [stage.name]: !isOpen }))}
                                       className={`w-full flex items-center gap-4 px-6 py-3 text-left transition-all hover:bg-gray-50/80 ${isOpen ? 'bg-gray-50/40' : ''}`}
                                    >
                                       <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black border transition-all ${isOpen ? 'bg-[#1e6e43] text-white border-[#1e6e43]' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                          {sIdx + 1}
                                       </span>
                                       <div className="flex-1 min-w-0">
                                          <p className="text-sm font-black text-gray-900 uppercase tracking-tight truncate">{stage.name}</p>
                                          <p className="text-[10px] font-semibold text-gray-400 mt-0.5">
                                             <span className="text-[#1e6e43] font-bold">{assignedCount}</span>/{totalVariants} kích cỡ & màu sắc đã gán
                                          </p>
                                       </div>
                                       {/* Variant chip preview */}
                                       <div className="hidden sm:flex flex-wrap gap-1 max-w-[200px]">
                                          {stage.variants.slice(0, 3).map((v, vi) => (
                                             <span key={vi} className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-50 border border-slate-200 text-slate-600 uppercase">
                                                {v.color}/{v.size}
                                             </span>
                                          ))}
                                          {stage.variants.length > 3 && (
                                             <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 border border-gray-200 text-gray-500">
                                                +{stage.variants.length - 3}
                                             </span>
                                          )}
                                       </div>
                                       <span className={`flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 text-gray-500 transition-all ${isOpen ? 'rotate-0' : ''}`}>
                                          {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                                       </span>
                                    </button>

                                    {/* Expanded: variant cards */}
                                    {isOpen && (
                                       <div className="px-6 pb-5 pt-2 bg-gray-50/40 border-t border-dashed border-gray-200">
                                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                                             {stage.variants.map((v, vIdx) => {
                                                const isActive = activeRowId === v.ppId;
                                                const staff = (assignments[v.ppId]?.workerIds || []).map(wid => workers.find(w => w.id === wid)).filter(Boolean);
                                                return (
                                                   <div
                                                      key={vIdx}
                                                      onClick={() => setActiveRowId(v.ppId)}
                                                      className={`relative cursor-pointer rounded-xl border-2 p-4 flex flex-col gap-3 transition-all ${isActive
                                                         ? 'bg-white border-[#1e6e43] shadow-md shadow-emerald-100'
                                                         : 'bg-white border-gray-100 hover:border-gray-300 hover:shadow-sm'
                                                         }`}
                                                   >
                                                      {/* Color + Size header */}
                                                      <div className="flex items-center justify-between">
                                                         <div className="flex items-center gap-2">
                                                            <div className="w-2.5 h-2.5 rounded-full bg-gray-300 ring-1 ring-gray-200" />
                                                            <span className={`text-sm font-black uppercase ${isActive ? 'text-[#1e6e43]' : 'text-gray-700'}`}>{v.color}</span>
                                                         </div>
                                                         <span className="px-2.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-sm font-black text-slate-700 uppercase">{v.size}</span>
                                                      </div>
                                                      {/* Quantity */}
                                                      <p className="text-[10px] font-semibold text-gray-400">
                                                         Số lượng: <span className="font-black text-gray-700">{Number(v.quantity).toLocaleString()}</span>
                                                      </p>
                                                      {/* Assigned workers */}
                                                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                                         <div className="flex -space-x-2">
                                                            {staff.length > 0
                                                               ? staff.slice(0, 4).map(s => (
                                                                  <div key={s.id} title={s.fullName} className="w-7 h-7 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center text-[10px] font-black text-[#1e6e43] uppercase">
                                                                     {s.fullName.charAt(0)}
                                                                  </div>
                                                               ))
                                                               : (
                                                                  <div className="w-7 h-7 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center">
                                                                     <Users size={10} className="text-gray-300" />
                                                                  </div>
                                                               )
                                                            }
                                                            {staff.length > 4 && (
                                                               <div className="w-7 h-7 rounded-full bg-[#1e6e43] text-white border-2 border-white flex items-center justify-center text-[9px] font-black">+{staff.length - 4}</div>
                                                            )}
                                                         </div>
                                                         <span className={`text-xs font-black uppercase ${staff.length === 0 ? (isActive ? 'text-rose-500' : 'text-gray-300') : 'text-[#1e6e43]'}`}>
                                                            {staff.length === 0 ? 'Trống' : `${staff.length} thợ`}
                                                         </span>
                                                      </div>
                                                      {/* Green check badge if assigned */}
                                                      {staff.length > 0 && !isActive && (
                                                         <div className="absolute -top-2 -right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white shadow">
                                                            <Check size={10} strokeWidth={4} className="text-white" />
                                                         </div>
                                                      )}
                                                   </div>
                                                );
                                             })}
                                          </div>
                                       </div>
                                    )}
                                 </div>
                              );
                           })}
                        </div>
                     )}
                  </div>

                  {/* RIGHT: WORKER PANEL */}
                  <div className="bg-white rounded-xl border border-black shadow-sm overflow-hidden sticky top-8">
                     {/* Panel header */}
                     <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/30 space-y-2">
                        <div className="flex items-center gap-2">
                           <Users size={16} className="text-[#1e6e43]" />
                           <h2 className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Danh sách thợ</h2>
                        </div>
                        {activeRow && (
                           <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[9px] font-bold text-gray-400 uppercase">Đang gán:</span>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-black text-emerald-700 uppercase">
                                 {activeRow.color}
                                 <span className="text-emerald-300">/</span>
                                 {activeRow.size}
                              </span>
                           </div>
                        )}
                     </div>

                     {/* Search */}
                     <div className="px-4 py-3 border-b border-gray-100">
                        <div className="relative">
                           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                           <input
                              value={workerQuery}
                              onChange={e => setWorkerQuery(e.target.value)}
                              placeholder="Tìm thợ..."
                              className="w-full h-9 bg-gray-50 rounded-lg pl-9 text-sm font-medium outline-none border border-transparent focus:border-[#1e6e43] transition-all"
                           />
                        </div>
                     </div>

                     {/* Worker list */}
                     <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-50">
                        {workerGroups.map(g => (
                           <div key={g.name}>
                              <div className="px-5 py-2 bg-gray-50/60 border-b border-gray-100">
                                 <span className="text-[10px] font-black text-[#1e6e43] uppercase tracking-widest">{g.name}</span>
                              </div>
                              {g.members
                                 .filter(m => m.fullName.toLowerCase().includes(workerQuery.toLowerCase()))
                                 .map(w => {
                                    const sel = activeRowId && assignments[activeRowId]?.workerIds?.includes(w.id);
                                    return (
                                       <div
                                          key={w.id}
                                          className={`px-4 py-3 flex items-center justify-between transition-all hover:bg-gray-50/60 ${sel ? 'bg-emerald-50/60' : ''} ${!isEditing ? 'opacity-60' : ''}`}
                                       >
                                          <div onClick={() => toggleWorker(w.id)} className="flex items-center gap-3 flex-1 cursor-pointer min-w-0">
                                             <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black uppercase flex-shrink-0 ${sel ? 'bg-[#1e6e43] text-white' : 'bg-gray-100 text-gray-600'}`}>
                                                {String(w.fullName || "?").charAt(0)}
                                             </div>
                                             <div className="min-w-0 mt-0.5">
                                                <p className="text-sm font-bold text-gray-900 uppercase truncate leading-none">{w.fullName}</p>
                                                <div className="flex flex-wrap gap-1 mt-1.5">
                                                   {w.skills && w.skills.length > 0 ? (
                                                      w.skills.map((skill, idx) => (
                                                         <span
                                                            key={idx}
                                                            className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-black uppercase tracking-tight"
                                                         >
                                                            {skill}
                                                         </span>
                                                      ))
                                                   ) : (
                                                      <span className="text-[10px] font-bold text-rose-400 uppercase tracking-tighter">
                                                         {w.role === "Thợ" || w.role === "Nhân viên" ? "Cần gán chuyên môn..." : w.role}
                                                      </span>
                                                   )}
                                                </div>
                                             </div>
                                          </div>
                                          <div className="flex gap-1.5 flex-shrink-0 ml-2">
                                             {isEditing && (
                                                <button
                                                   onClick={(e) => { e.stopPropagation(); handleBulkAssign(w.id); }}
                                                   title="Gán toàn bộ công đoạn"
                                                   className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center hover:bg-amber-100 transition-all"
                                                >
                                                   <Zap size={12} fill="currentColor" />
                                                </button>
                                             )}
                                             <button
                                                onClick={() => toggleWorker(w.id)}
                                                className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${sel
                                                   ? 'bg-[#1e6e43] border-[#1e6e43] text-white'
                                                   : 'bg-white border-gray-200 text-gray-400 hover:border-[#1e6e43] hover:text-[#1e6e43]'
                                                   }`}
                                             >
                                                {sel ? <Check size={12} strokeWidth={4} /> : <UserPlus size={12} />}
                                             </button>
                                          </div>
                                       </div>
                                    );
                                 })}
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
         </div>

         <ConfirmModal
            isOpen={isConfirmOpen}
            onConfirm={handleSave}
            onClose={() => setIsConfirmOpen(false)}
            title="Lưu phân công?"
            description="Cập nhật thợ cho các kích cỡ & màu sắc đã chọn."
            confirmIcon={Save}
            primaryLabel="Lưu ngay"
         />
      </OwnerLayout>
   );
}
