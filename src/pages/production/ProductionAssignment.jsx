import { useEffect, useMemo, useState } from "react";
import { 
  ArrowLeft, Search, Users, Check, AlertTriangle, Save, Edit, 
  ChevronRight, LayoutGrid, Loader2, UserPlus, Info, Zap, TrendingUp
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
  
  const [selectedProductionId, setSelectedProductionId] = useState(() => id || incoming?.production?.productionId || "");
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

  // Loading Data
  useEffect(() => {
    if (selectedProductionId) {
       ProductionService.getProductionDetail(selectedProductionId).then((res) => {
          const p = res?.data?.data || res?.data;
          if (p) setFetchedProduction({ 
             productionId: p.productionId ?? p.id,
             orderName: p.order?.orderName,
             product: p.order
          });
       }).catch(() => {});
       ProductionPartService.getPartsByProduction(selectedProductionId, { PageSize: 100 })
          .then(res => setBackendParts(res?.data?.data ?? res?.data ?? []))
          .catch(() => {});
    }
  }, [selectedProductionId]);

  useEffect(() => {
    WorkerService.getEmployeeDirectory().then((res) => {
      const list = (res?.data || []).filter(e => e.status === "active");
      const mapped = list.map(e => ({
        id: String(e.id),
        fullName: e.fullName || "—",
        role: e.primaryRoleLabel || "Nhân viên",
        managerName: e.managerName || "Chung",
      }));
      
      // Inject Owner if missing
      if (currentUser && !mapped.some(w => String(w.id) === String(currentUser.id))) {
         mapped.push({
           id: String(currentUser.id),
           fullName: currentUser.fullName || "Chủ xưởng (Bạn)",
           role: "Chủ xưởng",
           managerName: "Ban Quản Trị"
         });
      }

      setWorkers(mapped);
      const groups = {};
      mapped.forEach(w => {
        if (!groups[w.managerName]) groups[w.managerName] = { name: w.managerName, members: [] };
        groups[w.managerName].members.push(w);
      });
      setWorkerGroups(Object.values(groups));
    });
  }, [currentUser]);

  const rows = useMemo(() => {
    const hasRealVariants = backendParts.length > 0 && backendParts.some(p => p.color || p.size);
    let base = PLAN_STEPS;
    if (hasRealVariants) {
      base = backendParts.map(p => ({
        partName: p.partName || p.name,
        cpu: p.cpu,
        realPartId: p.id,
        color: p.color || "—",
        size: p.size || "—",
        quantity: p.quantity || 0,
      }));
    }
    return base.map((r, i) => ({ ...r, ppId: r.realPartId ?? (3000 + i) }));
  }, [backendParts]);

  const groupedStages = useMemo(() => {
    const gs = {};
    rows.forEach(r => {
      if (!gs[r.partName]) gs[r.partName] = { name: r.partName, colors: {} };
      if (!gs[r.partName].colors[r.color]) gs[r.partName].colors[r.color] = [];
      gs[r.partName].colors[r.color].push(r);
    });
    return Object.values(gs).map(s => ({
      ...s,
      colorList: Object.entries(s.colors).map(([c, items]) => ({ name: c, variants: items }))
    }));
  }, [rows]);

  useEffect(() => {
    setAssignments(prev => {
      const next = { ...prev };
      const base = { ...initialAssignments };
      let changed = false;
      rows.forEach(r => {
        if (next[r.ppId]) return;
        const real = backendParts.find(p => p.id === r.realPartId);
        const ids = (real?.assignedWorkerIds || []).map(String);
        next[r.ppId] = { workerIds: ids };
        base[r.ppId] = { workerIds: [...ids] };
        changed = true;
      });
      if (changed) setInitialAssignments(base);
      return next;
    });
    if (!activeRowId && rows.length > 0) setActiveRowId(rows[0].ppId);
    if (groupedStages.length > 0 && Object.keys(expandedStages).length === 0) setExpandedStages({ [groupedStages[0].name]: true });
  }, [rows, backendParts, groupedStages]);

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
    const activeStageNames = Object.keys(expandedStages).filter(k => expandedStages[k]);
    if (!activeStageNames.length) { toast.info("Vui lòng mở một công đoạn trước."); return; }
    
    // Relevant rows for the active stages
    const targetRows = rows.filter(r => activeStageNames.includes(r.partName));
    const isAlreadyFullyAssigned = targetRows.every(r => (assignments[r.ppId]?.workerIds || []).includes(wid));

    setAssignments(prev => {
      const next = { ...prev };
      targetRows.forEach(r => {
        const currentIds = next[r.ppId]?.workerIds || [];
        if (isAlreadyFullyAssigned) {
           // Toggle Off: Remove from all
           next[r.ppId] = { workerIds: currentIds.filter(id => id !== wid) };
        } else {
           // Toggle On: Add to all if not present
           if (!currentIds.includes(wid)) {
              next[r.ppId] = { workerIds: [...currentIds, wid] };
           }
        }
      });
      return next;
    });

    if (isAlreadyFullyAssigned) {
       toast.success("Đã xóa thợ khỏi tất cả biến thể của công đoạn mở!");
    } else {
       toast.success("Đã gán thợ cho toàn bộ biến thể của công đoạn mở!");
    }
  };

  const handleSave = async () => {
    setIsConfirmOpen(false); setIsSaving(true);
    try {
      const dirty = rows.filter(r => r.realPartId && [...(assignments[r.ppId]?.workerIds || [])].sort().join(',') !== [...(initialAssignments[r.ppId]?.workerIds || [])].sort().join(','));
      await Promise.allSettled(dirty.map(r => ProductionPartService.updateAssignWorker(r.realPartId, { workerIds: assignments[r.ppId].workerIds.map(Number) })));
      toast.success("Lưu thành công!"); setInitialAssignments({...assignments}); setIsEditing(false);
    } catch { toast.error("Có lỗi xảy ra."); } finally { setIsSaving(false); }
  };

  return (
    <OwnerLayout>
      <div className="min-h-screen bg-[#F0F4F2] p-8 space-y-8 pb-20">
        
        {/* HEADER */}
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-5">
              <button onClick={() => navigate(-1)} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100 shadow-sm hover:text-emerald-500 transition">
                 <ArrowLeft size={20} />
              </button>
              <div>
                 <h1 className="text-2xl font-black text-slate-800 uppercase italic leading-none">Phân công lao động</h1>
                 <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-2">Dự án: {fetchedProduction?.orderName || "Loading..."}</p>
              </div>
           </div>
           
           <button 
             onClick={() => isEditing ? setIsConfirmOpen(true) : setIsEditing(true)}
             className={`h-12 px-8 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl flex items-center gap-3 ${isEditing ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-slate-800 text-white shadow-slate-200'}`}
           >
              {isSaving ? <Loader2 className="animate-spin" size={16} /> : isEditing ? <Save size={16} /> : <Edit size={16} />}
              {isEditing ? "Lưu kết quả" : "Bắt đầu gán việc"}
           </button>
        </div>

        {/* SALARY BALANCE TABLE (MODERNIZED) */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden p-8 space-y-6">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <TrendingUp className="text-emerald-500" size={18} />
                 <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest italic">Cân bằng thu nhập thợ</h2>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trung bình: <span className="text-slate-800">{Math.round(workerStats.avg).toLocaleString()} VNĐ</span></p>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                 <thead>
                    <tr className="border-b border-slate-50 text-slate-400 font-black uppercase tracking-widest">
                       <th className="pb-4 px-2">Nhân sự</th>
                       <th className="pb-4 px-2 text-center">Công đoạn</th>
                       <th className="pb-4 px-2 text-center">Sản lượng</th>
                       <th className="pb-4 px-2 text-right">Thu nhập dự kiến</th>
                       <th className="pb-4 px-2 text-center">Trạng thái</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50 font-bold text-slate-700">
                    {workerStats.items.filter(i => i.steps > 0 || !isEditing).map(w => (
                       <tr key={w.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-4 px-2 text-slate-900">{w.label}</td>
                          <td className="py-4 px-2 text-center">{w.steps}</td>
                          <td className="py-4 px-2 text-center">{w.quantity.toFixed(1)} SP</td>
                          <td className="py-4 px-2 text-right">{Math.round(w.income).toLocaleString()} VNĐ</td>
                          <td className="py-4 px-2 text-center">
                             <div className={`inline-flex px-3 py-1 rounded-full text-[9px] uppercase tracking-tighter ${w.income > workerStats.avg * 1.3 ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                {w.income > workerStats.avg * 1.3 ? 'Quá tải' : 'Cân bằng'}
                             </div>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>

        {/* MAIN INTERFACE */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-8 items-start">
           
           {/* MATRIX GRID */}
           <div className="space-y-6">
              {groupedStages.map((stage, sIdx) => {
                 const isOpen = expandedStages[stage.name];
                 return (
                    <div key={sIdx} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
                       <button 
                         onClick={() => setExpandedStages(p => ({ ...p, [stage.name]: !isOpen }))}
                         className="w-full p-8 flex items-center justify-between hover:bg-slate-50/50 transition-all font-sans"
                       >
                          <div className="flex items-center gap-5">
                             <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isOpen ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-slate-100 text-slate-400'}`}>
                                <LayoutGrid size={18} />
                             </div>
                             <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{stage.name}</h3>
                          </div>
                          <ChevronRight size={20} className={`text-slate-300 transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} />
                       </button>

                       {isOpen && (
                          <div className="px-8 pb-8 space-y-6 animate-in fade-in slide-in-from-top-2">
                             {stage.colorList.map((colorSet, cIdx) => (
                                <div key={cIdx} className="space-y-3">
                                   <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] px-1">{colorSet.name}</p>
                                   <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                      {colorSet.variants.map((v, vIdx) => {
                                         const active = activeRowId === v.ppId;
                                         const staff = (assignments[v.ppId]?.workerIds || []).map(id => workers.find(w => w.id === id)).filter(Boolean);
                                         return (
                                            <div 
                                              key={vIdx}
                                              onClick={() => setActiveRowId(v.ppId)}
                                              className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                                                active ? 'bg-white border-emerald-500 shadow-xl shadow-emerald-50 ring-4 ring-emerald-50' : 'bg-slate-50/55 border-slate-50'
                                              }`}
                                            >
                                               <span className={`text-[11px] font-black uppercase ${active ? 'text-emerald-700' : 'text-slate-400'}`}>{v.size}</span>
                                               <div className="flex flex-wrap justify-center gap-0.5 min-h-[14px]">
                                                  {staff.slice(0, 3).map(s => <div key={s.id} className="w-1.5 h-1.5 rounded-full bg-emerald-500" />)}
                                                  {staff.length > 3 && <span className="text-[7px] font-bold text-emerald-600">+{staff.length - 3}</span>}
                                               </div>
                                               {active && <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white border-2 border-white"><Check size={10} /></div>}
                                            </div>
                                         );
                                      })}
                                   </div>
                                </div>
                             ))}
                          </div>
                       )}
                    </div>
                 );
              })}
           </div>

           {/* WORKER SIDEBAR */}
           <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-8 sticky top-8 space-y-6">
              <div className="flex items-center justify-between">
                 <h2 className="text-sm font-black text-slate-800 uppercase italic">Thành viên <span className="text-emerald-500">GPMS</span></h2>
                 {activeRowId && (
                    <div className="px-3 py-1 bg-emerald-500/10 rounded-xl text-[9px] font-black text-emerald-600 uppercase">
                       {rows.find(r => r.ppId === activeRowId)?.color} / {rows.find(r => r.ppId === activeRowId)?.size}
                    </div>
                 )}
              </div>
              <div className="relative">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                 <input value={workerQuery} onChange={e => setWorkerQuery(e.target.value)} placeholder="Tìm tên nhân sự..." className="w-full h-12 bg-slate-50 rounded-2xl pl-12 text-xs font-bold outline-none border-none focus:bg-white transition shadow-inner" />
              </div>
              
              <div className="max-h-[600px] overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                 {workerGroups.map(g => (
                    <div key={g.name} className="space-y-3">
                       <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-2">{g.name}</p>
                       <div className="space-y-2">
                          {g.members.filter(m => m.fullName.toLowerCase().includes(workerQuery.toLowerCase())).map(w => {
                             const sel = activeRowId && assignments[activeRowId]?.workerIds?.includes(w.id);
                             return (
                                <div key={w.id} className={`p-4 rounded-[1.5rem] border-2 transition-all flex items-center justify-between ${sel ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-slate-50 hover:bg-slate-50'} ${!isEditing && 'opacity-60 grayscale-[40%]'}`}>
                                   <div onClick={() => toggleWorker(w.id)} className="flex-1 cursor-pointer">
                                      <p className="text-xs font-black uppercase text-slate-800">{w.fullName}</p>
                                      <p className="text-[8px] font-bold text-blue-500 uppercase mt-1 tracking-tight">{w.role}</p>
                                   </div>
                                   <div className="flex items-center gap-1">
                                      {isEditing && (
                                         <button 
                                           onClick={(e) => { e.stopPropagation(); handleBulkAssign(w.id); }}
                                           title="Gán cho tất cả mã hàng của công đoạn này"
                                           className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 hover:bg-amber-100 flex items-center justify-center transition"
                                         >
                                            <Zap size={14} />
                                         </button>
                                      )}
                                      <button 
                                        onClick={() => toggleWorker(w.id)}
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${sel ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-100 text-slate-400'}`}
                                      >
                                         {sel ? <Check size={16} /> : <UserPlus size={16} />}
                                      </button>
                                   </div>
                                </div>
                             )
                          })}
                       </div>
                    </div>
                 ))}
              </div>
           </div>

        </div>

        <ConfirmModal isOpen={isConfirmOpen} onConfirm={handleSave} onClose={() => setIsConfirmOpen(false)} title="Xác nhận dữ liệu Matrix?" description="Thao tác này sẽ cập nhật phân công cho toàn bộ biến thể đã gán." confirmIcon={Save} primaryLabel="Cập nhật ngay" />
      </div>
    </OwnerLayout>
  );
}

const COLORS = ["Đỏ Đô", "Xanh Rêu", "Trắng Tinh", "Đen Huyền"];
const SIZES = ["S", "M", "L", "XL", "2XL"];
const STAGES = ["CÔNG ĐOẠN CẮT", "MAY PHỤ KIỆN", "RÁP THÂN & HOÀN THIỆN", "QC & ĐÓNG GÓI"];

const PLAN_STEPS = STAGES.flatMap(s => 
  COLORS.flatMap(c => 
    SIZES.map(sz => ({
      partName: s,
      cpu: 5000,
      color: c,
      size: sz,
      quantity: Math.floor(Math.random() * 80) + 20
    }))
  )
);
