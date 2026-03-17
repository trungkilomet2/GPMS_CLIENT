import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, Trash2, Pencil } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import OwnerLayout from "@/layouts/OwnerLayout";
import WorkerService from "@/services/WorkerService";
import "@/styles/homepage.css";
import "@/styles/leave.css";

const MOCK_PRODUCTIONS = [
  {
    productionId: 1001,
    orderId: 29,
    orderName: "Đồng phục công ty ABC",
    pStartDate: "2026-04-21",
    pEndDate: "2026-05-05",
    status: "Đang sản xuất",
    pmName: "Nguyễn Văn An",
    product: {
      productCode: "PRD-ABC-01",
      productName: "Áo thun đồng phục cổ tròn",
      type: "Áo thun",
      size: "L",
      color: "Trắng",
      quantity: 100,
      cpu: 15000,
      image: "",
    },
  },
  {
    productionId: 1002,
    orderId: 30,
    orderName: "Áo hoodie mùa đông",
    pStartDate: "2026-04-18",
    pEndDate: "2026-04-30",
    status: "Planned",
    pmName: "Trần Ngọc Bích",
    product: {
      productCode: "PRD-HOOD-02",
      productName: "Áo hoodie",
      type: "Hoodie",
      size: "M",
      color: "Đen",
      quantity: 80,
      cpu: 22000,
      image: "",
    },
  },
];

const DEFAULT_ROWS = [
  { partName: "Diễu nẹp cổ", cpu: 800, teamLeaderId: "TL-01", startDate: "2026-04-22", endDate: "2026-04-23", ppsId: "" },
  { partName: "Đính mác", cpu: 200, teamLeaderId: "TL-02", startDate: "2026-04-23", endDate: "2026-04-24", ppsId: "" },
  { partName: "Can dây lồng cổ", cpu: 100, teamLeaderId: "TL-03", startDate: "2026-04-24", endDate: "2026-04-25", ppsId: "" },
  { partName: "Chạy dây lồng cổ", cpu: 500, teamLeaderId: "TL-04", startDate: "2026-04-25", endDate: "2026-04-26", ppsId: "" },
  { partName: "Bấm lỗ lồng dây", cpu: 400, teamLeaderId: "TL-05", startDate: "2026-04-26", endDate: "2026-04-27", ppsId: "" },
  { partName: "Lộn hàng", cpu: 200, teamLeaderId: "TL-06", startDate: "2026-04-27", endDate: "2026-04-28", ppsId: "" },
  { partName: "Kiểm hàng", cpu: 100, teamLeaderId: "TL-07", startDate: "2026-04-28", endDate: "2026-04-29", ppsId: "" },
  { partName: "Bó buộc hàng", cpu: 100, teamLeaderId: "TL-08", startDate: "2026-04-29", endDate: "2026-04-30", ppsId: "" },
];

export default function ProductionPlan() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedProductionId, setSelectedProductionId] = useState(() => (id ? String(id) : ""));
  const [rows, setRows] = useState(() =>
    DEFAULT_ROWS.map((row, index) => ({
      ...row,
      ppId: 2000 + index,
      productionId: id ? Number(id) : null,
    }))
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [showProductionInfo, setShowProductionInfo] = useState(true);
  const [showProductInfo, setShowProductInfo] = useState(true);
  const [form, setForm] = useState({
    partName: "",
    teamLeaderId: "",
    startDate: "",
    endDate: "",
    cpu: "",
  });
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [loadingTeamLeaders, setLoadingTeamLeaders] = useState(true);
  const [teamLeaderError, setTeamLeaderError] = useState(null);

  const totalCpu = useMemo(
    () => rows.reduce((sum, row) => sum + (Number(row.cpu) || 0), 0),
    [rows]
  );

  const selectedProduction = useMemo(() => {
    const pid = Number(selectedProductionId);
    if (!pid) return null;
    return MOCK_PRODUCTIONS.find((item) => Number(item.productionId) === pid) || null;
  }, [selectedProductionId]);

  const teamLeaderMap = useMemo(() => {
    const map = new Map();
    teamLeaders.forEach((leader) => {
      const key = String(leader.id ?? "");
      if (!key) return;
      const label = leader.fullName || leader.userName || `#${leader.id}`;
      map.set(key, label);
    });
    return map;
  }, [teamLeaders]);

  useEffect(() => {
    let active = true;
    const fetchTeamLeaders = async () => {
      try {
        setLoadingTeamLeaders(true);
        const response = await WorkerService.getAllEmployees();
        const items = response?.data ?? [];
        const candidates = items.filter((item) => {
          const role = String(item?.primaryRole ?? "").toLowerCase();
          if (role === "worker" || role === "team leader") return true;
          if (Array.isArray(item?.roles)) {
            return item.roles.includes("Worker") || item.roles.includes("Team Leader");
          }
          return false;
        });
        if (!active) return;
        setTeamLeaders(candidates);
        setTeamLeaderError(null);
      } catch (_err) {
        if (!active) return;
        setTeamLeaderError("Không thể tải danh sách thợ.");
      } finally {
        if (active) setLoadingTeamLeaders(false);
      }
    };
    fetchTeamLeaders();
    return () => { active = false; };
  }, []);

  const openAddModal = () => {
    setEditingIndex(null);
    setForm({ partName: "", teamLeaderId: "", startDate: "", endDate: "", cpu: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (index) => {
    const target = rows[index];
    if (!target) return;
    setEditingIndex(index);
    setForm({
      partName: target.partName || "",
      teamLeaderId: target.teamLeaderId ? String(target.teamLeaderId) : "",
      startDate: target.startDate || "",
      endDate: target.endDate || "",
      cpu: target.cpu || "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingIndex(null);
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveStep = () => {
    const name = form.partName.trim();
    if (!name || !selectedProductionId) return;
    const leaderName = teamLeaderMap.get(String(form.teamLeaderId)) || "";
    setRows((prev) => {
      if (editingIndex === null) {
        const next = [
          ...prev,
          {
            ppId: 2000 + prev.length,
            productionId: Number(selectedProductionId),
            partName: name,
            cpu: form.cpu.trim(),
            teamLeaderId: form.teamLeaderId.trim(),
            teamLeaderName: leaderName,
            startDate: form.startDate,
            endDate: form.endDate,
            ppsId: "",
          },
        ];
        setSelectedIndex(next.length - 1);
        return next;
      }
      const next = [...prev];
      next[editingIndex] = {
        ...next[editingIndex],
        partName: name,
        cpu: form.cpu.trim(),
        teamLeaderId: form.teamLeaderId.trim(),
        teamLeaderName: leaderName,
        productionId: Number(selectedProductionId),
        startDate: form.startDate,
        endDate: form.endDate,
      };
      return next;
    });
    closeModal();
  };

  const removeRow = (index) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
    setSelectedIndex((prev) => {
      if (prev === index) return 0;
      if (prev > index) return prev - 1;
      return prev;
    });
  };

  return (
    <OwnerLayout>
      <div className="leave-page leave-list-page">
        <div className="leave-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <button
                onClick={() => navigate(-1)}
                className="mt-1 rounded-xl border border-slate-200 p-2 text-slate-400 transition hover:bg-slate-50"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Tạo kế hoạch sản xuất</h1>
                <p className="text-slate-600">Thiết lập công đoạn và theo dõi tiến độ.</p>
              </div>
            </div>
            <button className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">
              Lưu kế hoạch
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Chọn production</div>
              <select
                value={selectedProductionId}
                onChange={(event) => setSelectedProductionId(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
              >
                <option value="">Chọn production...</option>
                {MOCK_PRODUCTIONS.map((item) => (
                  <option key={item.productionId} value={item.productionId}>
                    {`#PR-${item.productionId} - ${item.orderName}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <button
              type="button"
              onClick={() => setShowProductionInfo((prev) => !prev)}
              className="w-full flex items-center justify-between mb-4 text-left"
            >
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400">Thông tin production</div>
                <div className="text-lg font-semibold text-slate-900">
                  {selectedProduction ? `#PR-${selectedProduction.productionId}` : "-"}
                </div>
              </div>
              <span className="inline-block rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-700">
                {selectedProduction?.status || "Chưa chọn"}
              </span>
            </button>
            {showProductionInfo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-700">
                <InfoItem label="Đơn hàng" value={selectedProduction ? `#ĐH-${selectedProduction.orderId}` : "-"} />
                <InfoItem label="Tên đơn" value={selectedProduction?.orderName || "-"} />
                <InfoItem label="PM quản lý" value={selectedProduction?.pmName || "-"} />
                <InfoItem label="Ngày bắt đầu" value={selectedProduction?.pStartDate || "-"} />
                <InfoItem label="Ngày kết thúc" value={selectedProduction?.pEndDate || "-"} />
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <button
              type="button"
              onClick={() => setShowProductInfo((prev) => !prev)}
              className="w-full flex items-center justify-between mb-4 text-left"
            >
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400">Thông tin sản phẩm</div>
                <div className="text-lg font-semibold text-slate-900">
                  {selectedProduction?.product?.productName || "-"}
                </div>
              </div>
              <div className="text-xs font-semibold text-slate-500 uppercase">
                #{selectedProduction?.product?.productCode || "-"}
              </div>
            </button>
            {showProductInfo && (
              <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-center">
                <div className="w-32 h-32 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                  {selectedProduction?.product?.image ? (
                    <img src={selectedProduction.product.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[11px] text-slate-400">Chưa có ảnh</span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-700">
                  <InfoItem label="Loại sản phẩm" value={selectedProduction?.product?.type || "-"} />
                  <InfoItem label="Kích thước" value={selectedProduction?.product?.size || "-"} />
                  <InfoItem label="Màu sắc" value={selectedProduction?.product?.color || "-"} />
                  <InfoItem label="Số lượng" value={selectedProduction?.product?.quantity || "-"} />
                  <InfoItem
                    label="Giá/SP"
                    value={`${selectedProduction?.product?.cpu?.toLocaleString("vi-VN") ?? "-"} VND`}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="leave-table-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="leave-table-card__header">
              <div>
                <h2 className="leave-table-card__title">Danh sách công đoạn</h2>
                <p className="leave-table-card__subtitle">Quản lý công đoạn theo tổ trưởng và giá/sp.</p>
              </div>
              <button
                onClick={openAddModal}
                disabled={!selectedProductionId}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                <Plus size={16} /> Thêm công đoạn
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-275 w-full divide-y divide-slate-200 table-fixed">
                <thead className="leave-table-head">
                  <tr>
                    <th className="leave-table-th w-16 px-3 py-3 text-center">STT</th>
                    <th className="leave-table-th w-56 px-3 py-3 text-left">Tên công đoạn</th>
                    <th className="leave-table-th w-44 px-3 py-3 text-left">Tổ trưởng</th>
                    <th className="leave-table-th w-32 px-3 py-3 text-center">Ngày bắt đầu</th>
                    <th className="leave-table-th w-32 px-3 py-3 text-center">Ngày kết thúc</th>
                    <th className="leave-table-th w-28 px-3 py-3 text-center">Giá/SP</th>
                    <th className="leave-table-th w-24 px-3 py-3 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-sm">
                  {rows.map((row, idx) => (
                    <tr
                      key={`${row.ppId}-${idx}`}
                      className={`leave-table-row hover:bg-slate-50/60 ${selectedIndex === idx ? "bg-emerald-50/60" : ""}`}
                      onClick={() => setSelectedIndex(idx)}
                    >
                      <td className="px-3 py-2 text-center">{idx + 1}</td>
                      <td className="px-3 py-2 font-medium text-slate-700">{row.partName || "-"}</td>
                      <td className="px-3 py-2 text-slate-600">
                        {row.teamLeaderName || teamLeaderMap.get(String(row.teamLeaderId)) || "-"}
                      </td>
                      <td className="px-3 py-2 text-center text-slate-600">{row.startDate || "-"}</td>
                      <td className="px-3 py-2 text-center text-slate-600">{row.endDate || "-"}</td>
                      <td className="px-3 py-2 text-center font-semibold text-slate-700">
                        {row.cpu ? `${Number(row.cpu).toLocaleString("vi-VN")} VND` : "-"}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              openEditModal(idx);
                            }}
                            className="text-slate-500 hover:text-slate-700"
                            aria-label="Sửa công đoạn"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              removeRow(idx);
                            }}
                            className="text-rose-500 hover:text-rose-600"
                            aria-label="Xóa công đoạn"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50">
                    <td colSpan={5} className="px-3 py-3 font-semibold text-slate-700">TOTAL</td>
                    <td className="px-3 py-3 text-center font-semibold text-slate-700">
                      {`${totalCpu.toLocaleString("vi-VN")} VND`}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-800">
                {editingIndex === null ? "Thêm công đoạn" : "Cập nhật công đoạn"}
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                Đóng
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Tên công đoạn</label>
                <input
                  value={form.partName}
                  onChange={(event) => handleFormChange("partName", event.target.value)}
                  placeholder="Nhập tên công đoạn"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Tổ trưởng</label>
                <select
                  value={form.teamLeaderId}
                  onChange={(event) => handleFormChange("teamLeaderId", event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  disabled={loadingTeamLeaders}
                >
                  <option value="">
                    {loadingTeamLeaders ? "Đang tải danh sách thợ..." : "Chọn tổ trưởng"}
                  </option>
                  {teamLeaders.map((leader) => (
                    <option key={leader.id} value={leader.id}>
                      {leader.fullName || leader.userName || `#${leader.id}`}
                    </option>
                  ))}
                </select>
                {teamLeaderError && (
                  <div className="mt-2 text-xs text-rose-600 font-semibold">{teamLeaderError}</div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Start date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(event) => handleFormChange("startDate", event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">End date</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(event) => handleFormChange("endDate", event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Giá/SP</label>
                <input
                  value={form.cpu}
                  onChange={(event) => handleFormChange("cpu", event.target.value)}
                  placeholder="Ví dụ: 200"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-center outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={closeModal} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50">
                Hủy
              </button>
              <button
                onClick={handleSaveStep}
                disabled={!selectedProductionId}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:bg-emerald-400"
              >
                {editingIndex === null ? "Thêm" : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}
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




