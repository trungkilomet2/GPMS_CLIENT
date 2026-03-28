import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { ArrowLeft, Plus, Trash2, Pencil } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import OwnerLayout from "@/layouts/OwnerLayout";
import ProductionPartService from "@/services/ProductionPartService";
import ProductionService from "@/services/ProductionService";
import { getStoredUser } from "@/lib/authStorage";
import { hasAnyRole } from "@/lib/roleAccess";
import { getProductionStatusLabel } from "@/utils/statusUtils";
import SuccessModal from "@/components/SuccessModal";
import ConfirmModal from "@/components/ConfirmModal";
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
  { partName: "Diễu nẹp cổ", cpu: 800, startDate: "2026-04-22T08:00", endDate: "2026-04-23T17:00", ppsId: "" },
  { partName: "Đính mác", cpu: 200, startDate: "2026-04-23T08:00", endDate: "2026-04-24T17:00", ppsId: "" },
  { partName: "Can dây lồng cổ", cpu: 100, startDate: "2026-04-24T08:00", endDate: "2026-04-25T17:00", ppsId: "" },
  { partName: "Chạy dây lồng cổ", cpu: 500, startDate: "2026-04-25T08:00", endDate: "2026-04-26T17:00", ppsId: "" },
  { partName: "Bấm lỗ lồng dây", cpu: 400, startDate: "2026-04-26T08:00", endDate: "2026-04-27T17:00", ppsId: "" },
  { partName: "Lộn hàng", cpu: 200, startDate: "2026-04-27T08:00", endDate: "2026-04-28T17:00", ppsId: "" },
  { partName: "Kiểm hàng", cpu: 100, startDate: "2026-04-28T08:00", endDate: "2026-04-29T17:00", ppsId: "" },
  { partName: "Bó buộc hàng", cpu: 100, startDate: "2026-04-29T08:00", endDate: "2026-04-30T17:00", ppsId: "" },
];

const TEMPLATE_LIBRARY = [
  {
    key: "ao-thun-standard",
    label: "Áo thun tiêu chuẩn",
    category: "Áo",
    description: "Quy trình chuẩn ngành may cho áo thun.",
    steps: [
      { partName: "Rập & giác sơ đồ", cpu: 150 },
      { partName: "Kiểm vải đầu vào", cpu: 120 },
      { partName: "Trải vải", cpu: 220 },
      { partName: "Cắt vải", cpu: 320 },
      { partName: "Đánh số chi tiết", cpu: 100 },
      { partName: "Vắt sổ thân", cpu: 200 },
      { partName: "May vai", cpu: 240 },
      { partName: "May sườn", cpu: 260 },
      { partName: "May tay", cpu: 260 },
      { partName: "Tra tay", cpu: 280 },
      { partName: "May cổ", cpu: 300 },
      { partName: "May lai tay", cpu: 220 },
      { partName: "May lai áo", cpu: 220 },
      { partName: "Kiểm tra đường may", cpu: 150 },
      { partName: "Ủi hoàn thiện", cpu: 200 },
      { partName: "Final inspection", cpu: 180 },
      { partName: "Đóng gói", cpu: 120 },
    ],
  },
  {
    key: "ao-so-mi-standard",
    label: "Áo sơ mi tiêu chuẩn",
    category: "Áo",
    description: "Quy trình chuẩn ngành may cho áo sơ mi.",
    steps: [
      { partName: "Rập & giác sơ đồ", cpu: 160 },
      { partName: "Kiểm vải đầu vào", cpu: 140 },
      { partName: "Trải vải", cpu: 240 },
      { partName: "Cắt vải", cpu: 360 },
      { partName: "Ép keo cổ & nẹp", cpu: 200 },
      { partName: "May túi", cpu: 200 },
      { partName: "May nẹp trước", cpu: 240 },
      { partName: "May vai", cpu: 240 },
      { partName: "May sườn", cpu: 260 },
      { partName: "May tay", cpu: 260 },
      { partName: "Tra tay", cpu: 280 },
      { partName: "May cổ", cpu: 300 },
      { partName: "Đính cúc", cpu: 200 },
      { partName: "Làm khuy", cpu: 220 },
      { partName: "Kiểm tra đường may", cpu: 160 },
      { partName: "Ủi hoàn thiện", cpu: 220 },
      { partName: "Final inspection", cpu: 180 },
      { partName: "Đóng gói", cpu: 120 },
    ],
  },
  {
    key: "ao-hoodie-standard",
    label: "Áo hoodie tiêu chuẩn",
    category: "Áo",
    description: "Quy trình chuẩn cho hoodie có mũ và dây rút.",
    steps: [
      { partName: "Rập & giác sơ đồ", cpu: 170 },
      { partName: "Kiểm vải đầu vào", cpu: 140 },
      { partName: "Trải vải", cpu: 260 },
      { partName: "Cắt vải", cpu: 380 },
      { partName: "May thân", cpu: 360 },
      { partName: "May sườn", cpu: 300 },
      { partName: "May tay", cpu: 300 },
      { partName: "Tra tay", cpu: 320 },
      { partName: "Lắp mũ", cpu: 360 },
      { partName: "Luồn dây rút", cpu: 200 },
      { partName: "Ráp bo", cpu: 260 },
      { partName: "Kiểm tra đường may", cpu: 160 },
      { partName: "Ủi hoàn thiện", cpu: 220 },
      { partName: "Final inspection", cpu: 180 },
      { partName: "Đóng gói", cpu: 120 },
    ],
  },
  {
    key: "quan-jeans-standard",
    label: "Quần jeans tiêu chuẩn",
    category: "Quần",
    description: "Quy trình chuẩn ngành may cho quần jeans.",
    steps: [
      { partName: "Rập & giác sơ đồ", cpu: 180 },
      { partName: "Kiểm vải đầu vào", cpu: 160 },
      { partName: "Trải vải", cpu: 280 },
      { partName: "Cắt vải", cpu: 420 },
      { partName: "May túi trước", cpu: 280 },
      { partName: "May túi sau", cpu: 280 },
      { partName: "Ráp thân trước", cpu: 320 },
      { partName: "Ráp thân sau", cpu: 320 },
      { partName: "May đáy", cpu: 300 },
      { partName: "Nối sườn", cpu: 300 },
      { partName: "Lắp khóa", cpu: 260 },
      { partName: "May cạp", cpu: 280 },
      { partName: "Đính nút", cpu: 200 },
      { partName: "Lên lai", cpu: 220 },
      { partName: "Kiểm tra đường may", cpu: 160 },
      { partName: "Ủi hoàn thiện", cpu: 220 },
      { partName: "Final inspection", cpu: 180 },
      { partName: "Đóng gói", cpu: 120 },
    ],
  },
  {
    key: "quan-tay-standard",
    label: "Quần tây tiêu chuẩn",
    category: "Quần",
    description: "Quy trình chuẩn ngành may cho quần tây.",
    steps: [
      { partName: "Rập & giác sơ đồ", cpu: 180 },
      { partName: "Kiểm vải đầu vào", cpu: 160 },
      { partName: "Trải vải", cpu: 280 },
      { partName: "Cắt vải", cpu: 400 },
      { partName: "May túi", cpu: 260 },
      { partName: "Ráp thân trước", cpu: 300 },
      { partName: "Ráp thân sau", cpu: 300 },
      { partName: "May đáy", cpu: 280 },
      { partName: "Nối sườn", cpu: 280 },
      { partName: "Lắp khóa", cpu: 260 },
      { partName: "May cạp", cpu: 280 },
      { partName: "Lên lai", cpu: 220 },
      { partName: "Kiểm tra đường may", cpu: 160 },
      { partName: "Ủi hoàn thiện", cpu: 220 },
      { partName: "Final inspection", cpu: 180 },
      { partName: "Đóng gói", cpu: 120 },
    ],
  },
  {
    key: "giay-the-thao-standard",
    label: "Giày thể thao tiêu chuẩn",
    category: "Giày",
    description: "Quy trình chuẩn ngành giày thể thao.",
    steps: [
      { partName: "Cắt upper", cpu: 420 },
      { partName: "May upper", cpu: 600 },
      { partName: "May lót", cpu: 260 },
      { partName: "Ép đế", cpu: 720 },
      { partName: "Dán keo", cpu: 260 },
      { partName: "Lắp lót", cpu: 240 },
      { partName: "Luồn dây", cpu: 160 },
      { partName: "Vệ sinh thành phẩm", cpu: 160 },
      { partName: "Final inspection", cpu: 200 },
      { partName: "Đóng hộp", cpu: 140 },
    ],
  },
  {
    key: "mu-luoi-trai-standard",
    label: "Mũ lưỡi trai tiêu chuẩn",
    category: "Mũ",
    description: "Quy trình chuẩn ngành may cho mũ lưỡi trai.",
    steps: [
      { partName: "Cắt vải", cpu: 220 },
      { partName: "May phần chóp", cpu: 300 },
      { partName: "May vành", cpu: 260 },
      { partName: "Lắp khóa", cpu: 180 },
      { partName: "Vệ sinh thành phẩm", cpu: 120 },
      { partName: "Final inspection", cpu: 140 },
      { partName: "Đóng gói", cpu: 100 },
    ],
  },
];

const DESIGN_STORAGE_KEY = "gpms-production-plan-designs";
const PLAN_STORAGE_KEY = "gpms-production-plan-saved";

const normalizeText = (value = "") =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();

export default function ProductionPlan() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = useMemo(() => getStoredUser() || {}, []);
  const roleValue = currentUser?.role ?? currentUser?.roles ?? currentUser?.roleName ?? "";
  const isOwner = hasAnyRole(roleValue, ["owner", "admin"]);
  const isPM = hasAnyRole(roleValue, ["pm", "manager"]);

  const [productionList, setProductionList] = useState([]);
  const [selectedProduction, setSelectedProduction] = useState(null);

  const stateProductionId = location.state?.productionId;
  const initialProductionId = stateProductionId ? String(stateProductionId) : (id ? String(id) : "");
  const [selectedProductionId, setSelectedProductionId] = useState(() => initialProductionId);

  const [rows, setRows] = useState(() => {
    if (location.state?.steps && Array.isArray(location.state.steps) && location.state.steps.length > 0) {
      return location.state.steps.map((s, idx) => ({
        ppId: 2000 + idx,
        productionId: Number(initialProductionId),
        partName: s.partName,
        cpu: String(s.cpu || ""),
        startDate: s.startDate || "",
        endDate: s.endDate || "",
        ppsId: s.partId || "",
      }));
    }
    return [];
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [showProductionInfo, setShowProductionInfo] = useState(true);
  const [showProductInfo, setShowProductInfo] = useState(true);
  const [templateCategory, setTemplateCategory] = useState("all");
  const [templateExpanded, setTemplateExpanded] = useState({});
  const [showTemplateSection, setShowTemplateSection] = useState(false);
  const [savedDesigns, setSavedDesigns] = useState([]);
  const [savedPlanAt, setSavedPlanAt] = useState("");
  const [savingParts, setSavingParts] = useState(false);
  const [savePartsMessage, setSavePartsMessage] = useState({ type: "", text: "" });
  const [isConfirmSaveOpen, setIsConfirmSaveOpen] = useState(false);
  const [hasExistingParts, setHasExistingParts] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    partName: "",
    startDate: "",
    endDate: "",
    cpu: "",
  });

  const currentUserKey = useMemo(() => {
    return String(currentUser?.userId ?? currentUser?.id ?? currentUser?.userName ?? "guest");
  }, [currentUser]);

  const userStepLabels = useMemo(() => {
    const raw = [
      currentUser?.workerRoleLabel,
      currentUser?.workerRole,
      ...(Array.isArray(currentUser?.skills) ? currentUser.skills : []),
    ]
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
    return Array.from(new Set(raw));
  }, [currentUser]);

  const userStepFilters = useMemo(
    () => userStepLabels.map((item) => normalizeText(item)).filter(Boolean),
    [userStepLabels]
  );

  const isAssignedPM = useMemo(() => {
    if (!selectedProduction?.pmId) return false;
    return isPM && String(currentUser?.userId ?? currentUser?.id) === String(selectedProduction.pmId);
  }, [isPM, currentUser, selectedProduction]);

  const totalCpu = useMemo(
    () => rows.reduce((sum, row) => sum + (Number(row.cpu) || 0), 0),
    [rows]
  );

  const formatDateTime = (value = "") => {
    if (!value) return "-";
    return String(value).replace("T", " ");
  };

  const getDurationText = (start, end) => {
    if (!start || !end) return "-";
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return "-";
    const diffMs = e - s;
    if (diffMs <= 0) return "0 giờ";

    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const remainingHours = totalHours % 24;

    let result = "";
    if (days > 0) result += `${days} ngày `;
    if (remainingHours > 0 || days === 0) result += `${remainingHours} giờ`;
    return result.trim();
  };

  const formatDateOnly = (value = "") => {
    if (!value) return "";
    const raw = String(value);
    return raw.includes("T") ? raw.split("T")[0] : raw;
  };

  useEffect(() => {
    let active = true;
    const fetchList = async () => {
      try {
        const response = await ProductionService.getProductionList({ PageSize: 50 });
        if (!active) return;
        const payload = response?.data?.data ?? response?.data ?? [];
        setProductionList(
          Array.isArray(payload)
            ? payload.map((p) => ({
              productionId: p.productionId ?? p.id,
              orderName: p.order?.orderName ?? p.orderName ?? `Đơn hàng #${p.orderId || '?'}`,
            }))
            : []
        );
      } catch (err) {
        console.error("Lỗi tải danh sách đơn sản xuất:", err);
      }
    };
    fetchList();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (selectedProductionId) {
      const fetchParts = async () => {
        try {
          const res = await ProductionPartService.getPartsByProduction(selectedProductionId, { PageSize: 100 });
          if (active && res.data && Array.isArray(res.data) && res.data.length > 0) {
            setHasExistingParts(true);
            setRows(prev => {
              if (prev.length === 0) {
                return res.data.map((s, idx) => ({
                  ppId: 2000 + idx,
                  productionId: Number(selectedProductionId),
                  partName: s.partName,
                  cpu: String(s.cpu || ""),
                  startDate: s.startDate || "",
                  endDate: s.endDate || "",
                  ppsId: s.id || s.partId || ""
                }));
              }
              return prev;
            });
          } else if (active) {
            setHasExistingParts(false);
          }
        } catch (err) {
          console.error("Error fetching existing parts:", err);
        }
      };
      fetchParts();
    }
    return () => { active = false; };
  }, [selectedProductionId]);

  useEffect(() => {
    let active = true;
    if (!selectedProductionId) {
      setSelectedProduction(null);
      return;
    }
    const fetchDetail = async () => {
      try {
        const response = await ProductionService.getProductionDetail(selectedProductionId);
        if (!active) return;
        const payload = response?.data?.data ?? response?.data ?? null;
        if (!payload) return;
        const order = payload.order || {};
        setSelectedProduction({
          productionId: payload.productionId ?? payload.id,
          orderId: order.id,
          orderName: order.orderName,
          pStartDate: payload.startDate || payload.pStartDate || order.startDate || "",
          pEndDate: payload.endDate || payload.pEndDate || order.endDate || "",
          status: getProductionStatusLabel(payload.statusName || payload.status || "Chờ Xét Duyệt"),
          pmId: payload.pm?.id ?? payload.pmId,
          pmName: (payload.pm?.name ?? payload.pmName) || (payload.pmId ? `PM #${payload.pmId}` : (payload.pm?.id ? `PM #${payload.pm.id}` : "")),
          product: {
            productCode: order.id ? `MSP-${order.id}` : "MÃ-SP-KXD",
            productName: order.orderName,
            type: order.type,
            size: typeof order.size === "string" ? order.size.trim() : order.size,
            color: order.color,
            quantity: order.quantity,
            cpu: order.cpu,
            image: order.image || "",
          }
        });
      } catch (err) {
        console.error("Lỗi chi tiết đơn sản xuất:", err);
      }
    };
    fetchDetail();
    return () => { active = false; };
  }, [selectedProductionId]);

  const suggestedCategory = useMemo(() => {
    const type = String(selectedProduction?.product?.type ?? "").toLowerCase();
    if (type.includes("áo") || type.includes("ao") || type.includes("hoodie") || type.includes("tshirt")) return "Áo";
    if (type.includes("quần") || type.includes("quan") || type.includes("jean")) return "Quần";
    if (type.includes("giày") || type.includes("giay") || type.includes("shoe")) return "Giày";
    if (type.includes("mũ") || type.includes("mu") || type.includes("cap")) return "Mũ";
    return "all";
  }, [selectedProduction]);

  const templatesByUserStep = useMemo(() => {
    if (!userStepFilters.length) {
      return TEMPLATE_LIBRARY.map((template) => ({
        ...template,
        filteredSteps: template.steps,
      }));
    }

    return TEMPLATE_LIBRARY.map((template) => {
      const filteredSteps = template.steps.filter((step) =>
        userStepFilters.some((filter) => normalizeText(step.partName).includes(filter))
      );
      return { ...template, filteredSteps };
    }).filter((template) => template.filteredSteps.length > 0);
  }, [userStepFilters]);

  const visibleTemplates = useMemo(() => {
    if (templateCategory === "all") return templatesByUserStep;
    return templatesByUserStep.filter((item) => item.category === templateCategory);
  }, [templateCategory, templatesByUserStep]);


  const readDesignStorage = () => {
    try {
      const raw = localStorage.getItem(DESIGN_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const persistDesignStorage = (items) => {
    try {
      localStorage.setItem(DESIGN_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore storage errors
    }
  };

  const refreshSavedDesigns = () => {
    const all = readDesignStorage();
    const filtered = all.filter(
      (item) =>
        String(item.productionId) === String(selectedProductionId) &&
        String(item.userKey) === String(currentUserKey)
    );
    setSavedDesigns(filtered);
  };

  useEffect(() => {
    refreshSavedDesigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductionId, currentUserKey]);


  const saveCurrentDesign = (label) => {
    if (!selectedProductionId) return;
    if (!rows.length) return;

    const all = readDesignStorage();
    const design = {
      id: Date.now().toString(36),
      userKey: currentUserKey,
      productionId: selectedProductionId,
      label: label || `Bản thiết kế ${new Date().toLocaleString("vi-VN")}`,
      createdAt: new Date().toISOString(),
      rows: rows.map((row) => ({ ...row })),
    };

    const next = [design, ...all];
    const scoped = next.filter(
      (item) =>
        String(item.productionId) === String(selectedProductionId) &&
        String(item.userKey) === String(currentUserKey)
    );
    const limitedScoped = scoped.slice(0, 1);
    const remainder = next.filter(
      (item) =>
        String(item.productionId) !== String(selectedProductionId) ||
        String(item.userKey) !== String(currentUserKey)
    );
    const merged = [...limitedScoped, ...remainder];
    persistDesignStorage(merged);
    setSavedDesigns(limitedScoped);
  };

  const readPlanStorage = () => {
    try {
      const raw = sessionStorage.getItem(PLAN_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  };

  const persistPlanStorage = (value) => {
    try {
      sessionStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(value));
    } catch {
      // ignore storage errors
    }
  };

  const savePlan = () => {
    if (!selectedProductionId || !rows.length) return;
    const key = `${currentUserKey}::${selectedProductionId}`;
    const store = readPlanStorage();
    store[key] = {
      userKey: currentUserKey,
      productionId: selectedProductionId,
      updatedAt: new Date().toISOString(),
      rows: rows.map((row) => ({ ...row })),
    };
    persistPlanStorage(store);
    setSavedPlanAt(new Date().toLocaleString("vi-VN"));
  };

  const saveSteps = async (force = false) => {
    if (!selectedProductionId || !rows.length || savingParts) return;
    if (!isAssignedPM) {
      toast.error("Bạn không phải PM được giao phụ trách đơn này. Không thể lưu kế hoạch.");
      return;
    }

    if (rows.length < 3) {
      toast.error("Số lượng công đoạn phải từ 3 trở lên mới có thể lưu.");
      return;
    }

    // Show warning if parts exist and it's NOT a forced save
    if (hasExistingParts && !force) {
      setIsConfirmSaveOpen(true);
      return;
    }

    try {
      setSavingParts(true);
      setIsConfirmSaveOpen(false);
      setSavePartsMessage({ type: "", text: "" });
      const productionId = Number(selectedProductionId);
      const payload = rows.map((row) => ({
        productionId: productionId,
        partName: row?.partName || "",
        startDate: row?.startDate ? new Date(row.startDate).toISOString() : new Date().toISOString(),
        endDate: row?.endDate ? new Date(row.endDate).toISOString() : new Date().toISOString(),
        cpu: Number(row?.cpu || 0),
      }));

      // Debug: Log payload to see what's being sent
      console.log("Saving Production Parts:", { parts: payload });

      await ProductionPartService.createParts(productionId, { parts: payload });
      setHasExistingParts(true);
      toast.success("Đã lưu kế hoạch sản xuất thành công!");
      setIsSuccessModalOpen(true);
      savePlan();
    } catch (error) {
      console.error("Save Error:", error);
      console.log("Error Response:", error?.response?.data);
      
      let errMsg = "Lưu công đoạn thất bại.";
      const data = error?.response?.data;
      if (data?.errors) {
        errMsg = Object.values(data.errors).flat().join(" | ");
      } else if (data?.message) {
        errMsg = data.message;
      } else if (data?.detail) {
        errMsg = data.detail;
      } else if (data?.title) {
      } else if (typeof data === 'string' && data) {
        errMsg = data;
      }
      
      toast.error(errMsg);
      setSavePartsMessage({ type: "error", text: `Chi tiết lỗi: ${errMsg}` });
    } finally {
      setSavingParts(false);
    }
  };

  const applySavedDesign = (design) => {
    if (!design?.rows) return;
    setRows(design.rows.map((row) => ({ ...row })));
    setSelectedIndex(0);
  };

  useEffect(() => {
    const key = `${currentUserKey}::${selectedProductionId}`;
    const store = readPlanStorage();
    const saved = store[key];
    if (saved?.updatedAt) {
      const date = new Date(saved.updatedAt);
      setSavedPlanAt(Number.isNaN(date.getTime()) ? "" : date.toLocaleString("vi-VN"));
    } else {
      setSavedPlanAt("");
    }
  }, [currentUserKey, selectedProductionId]);

  useEffect(() => {
    return () => {
      try {
        sessionStorage.removeItem(PLAN_STORAGE_KEY);
      } catch {
        // ignore storage errors
      }
    };
  }, []);

  const openAddModal = () => {
    setEditingIndex(null);
    setForm({ partName: "", startDate: "", endDate: "", cpu: "" });
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (index) => {
    const target = rows[index];
    if (!target) return;
    setEditingIndex(index);
    setForm({
      partName: target.partName || "",
      startDate: target.startDate || "",
      endDate: target.endDate || "",
      cpu: target.cpu || "",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingIndex(null);
    setFormError("");
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveStep = () => {
    const name = form.partName.trim();
    if (!selectedProductionId) {
      setFormError("Vui lòng chọn đơn sản xuất trước.");
      return;
    }
    if (!name) {
      setFormError("Tên công đoạn không được để trống.");
      return;
    }
    if (name.length > 100) {
      setFormError("Tên công đoạn không được dài quá 100 ký tự.");
      return;
    }
    if (!form.startDate) {
      setFormError("Vui lòng chọn ngày bắt đầu.");
      return;
    }
    const now = new Date();
    // Cho phép sai lệch 1 phút để tránh lỗi khi người dùng nhập liệu lâu
    const graceNow = new Date(now.getTime() - 60000); 
    if (new Date(form.startDate) < graceNow) {
      setFormError("Ngày bắt đầu không được nhỏ hơn ngày giờ hiện tại.");
      return;
    }
    if (!form.endDate) {
      setFormError("Vui lòng chọn ngày kết thúc.");
      return;
    }
    if (new Date(form.endDate) <= new Date(form.startDate)) {
      setFormError("Ngày kết thúc phải sau ngày bắt đầu.");
      return;
    }
    if (form.cpu === "" || Number(form.cpu) < 0 || isNaN(Number(form.cpu))) {
      setFormError("Giá/SP phải là số hợp lệ lớn hơn hoặc bằng 0.");
      return;
    }
    if (Number(form.cpu) > 100000000) {
      setFormError("Giá/SP không được vượt quá 100.000.000 VNĐ.");
      return;
    }
    setFormError("");
    setRows((prev) => {
      if (editingIndex === null) {
        const next = [
          ...prev,
          {
            ppId: 2000 + prev.length,
            productionId: Number(selectedProductionId),
            partName: name,
            cpu: form.cpu.trim(),
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

  const applyTemplate = (template) => {
    const baseStart = selectedProduction?.pStartDate ? `${selectedProduction.pStartDate}T08:00` : "";
    const baseEnd = selectedProduction?.pEndDate ? `${selectedProduction.pEndDate}T17:00` : "";
    const steps = template.filteredSteps?.length ? template.filteredSteps : template.steps;
    const next = steps.map((step, index) => ({
      ppId: 2000 + index,
      productionId: selectedProductionId ? Number(selectedProductionId) : null,
      partName: step.partName,
      cpu: step.cpu ? String(step.cpu) : "",
      startDate: baseStart,
      endDate: baseEnd,
      ppsId: "",
    }));
    setRows(next);
    setSelectedIndex(0);
  };

  const toggleAllTemplates = (shouldExpand) => {
    const next = {};
    templatesByUserStep.forEach((item) => {
      next[item.key] = shouldExpand;
    });
    setTemplateExpanded(next);
  };

  const toggleTemplateExpanded = (key) => {
    setTemplateExpanded((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <OwnerLayout>
      <div className="leave-page leave-list-page">
        <div className="leave-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <button
                onClick={() => navigate(`/production/${selectedProductionId}`)}
                className="mt-1 rounded-xl border border-slate-200 p-2 text-slate-400 transition hover:bg-slate-50"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Tạo kế hoạch sản xuất</h1>
                <p className="text-slate-600">Thiết lập công đoạn và theo dõi tiến độ.</p>
              </div>
            </div>
          </div>



          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <button
              type="button"
              onClick={() => setShowProductionInfo((prev) => !prev)}
              className="w-full flex items-center justify-between mb-4 text-left"
            >
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400">Thông tin đơn sản xuất</div>
                <div className="text-lg font-semibold text-slate-900">
                  {selectedProduction ? `#PR-${selectedProduction.productionId}` : "-"}
                </div>
              </div>
            </button>
            {showProductionInfo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-700">
                <InfoItem label="Đơn hàng" value={selectedProduction ? `#ĐH-${selectedProduction.orderId}` : "-"} />
                <InfoItem label="Tên đơn" value={selectedProduction?.orderName || "-"} />
                <InfoItem label="PM quản lý" value={selectedProduction?.pmName || "-"} />
                <InfoItem label="Ngày bắt đầu" value={formatDateOnly(selectedProduction?.pStartDate) || "-"} />
                <InfoItem label="Ngày kết thúc" value={formatDateOnly(selectedProduction?.pEndDate) || "-"} />
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

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <button
              type="button"
              onClick={() => setShowTemplateSection((prev) => !prev)}
              className="w-full flex items-center justify-between text-left"
            >
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Template công đoạn</h2>
                <p className="text-sm text-slate-600">Chọn nhanh theo loại sản phẩm, sau đó chỉnh sửa tùy ý.</p>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {showTemplateSection ? "Thu gọn" : "Mở rộng"}
              </span>
            </button>

            {showTemplateSection && (
              <>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["all", "Áo", "Quần", "Giày", "Mũ"].map((item) => {
                    const label = item === "all" ? "Tất cả" : item;
                    const active = templateCategory === item;
                    return (
                      <button
                        key={`template-filter-${item}`}
                        type="button"
                        onClick={() => setTemplateCategory(item)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${active
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200"
                          }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                  {suggestedCategory !== "all" && templateCategory === "all" && (
                    null
                  )}
                  {userStepLabels.length > 0 && (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                      Lọc theo công đoạn: {userStepLabels[0]}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => saveCurrentDesign("Bản thiết kế của tôi")}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-emerald-200"
                    disabled={!rows.length || !selectedProductionId}
                  >
                    Lưu bản thiết kế
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleAllTemplates(true)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-emerald-200"
                  >
                    Mở tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleAllTemplates(false)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-emerald-200"
                  >
                    Thu gọn tất cả
                  </button>
                </div>

                {savedDesigns.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
                    <div className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-1">
                      Bản thiết kế đã lưu
                    </div>
                    <div className="text-[11px] text-emerald-700/80 mb-3">
                      Di chuột để xem, bấm để dùng lại bản thiết kế.
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {savedDesigns.map((design) => (
                        <button
                          key={design.id}
                          type="button"
                          onClick={() => applySavedDesign(design)}
                          className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-300 active:translate-y-0 active:shadow-sm"
                          title={design.label}
                        >
                          Dùng lại: {design.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {visibleTemplates.map((template) => (
                    <div
                      key={template.key}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{template.label}</div>
                          <div className="mt-1 text-xs text-slate-500">{template.description}</div>
                        </div>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          {template.category}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(templateExpanded[template.key] ? template.filteredSteps : template.filteredSteps.slice(0, 6)).map((step) => (
                          <span
                            key={`${template.key}-${step.partName}`}
                            className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600"
                          >
                            {step.partName}
                          </span>
                        ))}
                        {template.filteredSteps.length > 6 && !templateExpanded[template.key] && (
                          <span className="rounded-full border border-dashed border-slate-200 px-2.5 py-1 text-[11px] text-slate-500">
                            +{template.filteredSteps.length - 6} bước
                          </span>
                        )}
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => toggleTemplateExpanded(template.key)}
                          className="text-xs font-semibold text-slate-600 hover:text-emerald-700"
                        >
                          {templateExpanded[template.key] ? "Thu gọn công đoạn" : "Xem toàn bộ công đoạn"}
                        </button>
                        <button
                          type="button"
                          onClick={() => applyTemplate(template)}
                          className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                        >
                          Áp dụng
                        </button>
                      </div>
                    </div>
                  ))}
                  {visibleTemplates.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                      Chưa có template phù hợp.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="leave-table-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="leave-table-card__header">
              <div>
                <h2 className="leave-table-card__title">Danh sách công đoạn</h2>
                <p className="leave-table-card__subtitle">Quản lý công đoạn theo tổ trưởng và giá/sp.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">

                <button
                  onClick={openAddModal}
                  disabled={!selectedProductionId || !isAssignedPM}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={16} /> Thêm công đoạn
                </button>
                {savePartsMessage.text && (
                  <span
                    className={`text-xs font-semibold ${savePartsMessage.type === "error" ? "text-red-600" : "text-emerald-600"
                      }`}
                  >
                    {savePartsMessage.text}
                  </span>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-slate-200 table-auto">
                <thead className="leave-table-head">
                  <tr>
                    <th className="leave-table-th px-3 py-3 text-center">STT</th>
                    <th className="leave-table-th px-3 py-3 text-left">Tên công đoạn</th>
                    <th className="leave-table-th px-3 py-3 text-center">Bắt đầu</th>
                    <th className="leave-table-th px-3 py-3 text-center">Kết thúc</th>
                    <th className="leave-table-th px-3 py-3 text-center">Thời gian</th>
                    <th className="leave-table-th px-3 py-3 text-center">Giá/SP</th>
                    <th className="leave-table-th px-3 py-3 text-center">Thao tác</th>
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
                      <td className="px-3 py-2 text-center text-slate-600">{formatDateTime(row.startDate)}</td>
                      <td className="px-3 py-2 text-center text-slate-600">{formatDateTime(row.endDate)}</td>
                      <td className="px-3 py-2 text-center text-slate-500 font-medium">
                        {getDurationText(row.startDate, row.endDate)}
                      </td>
                      <td className="px-3 py-2 text-center font-semibold text-slate-700">
                        {row.cpu ? `${Number(row.cpu).toLocaleString("vi-VN")} VNĐ` : "-"}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              if (!isAssignedPM) return;
                              openEditModal(idx);
                            }}
                            disabled={!isAssignedPM}
                            className={`text-slate-500 hover:text-slate-700 ${!isAssignedPM ? 'opacity-30 cursor-not-allowed' : ''}`}
                            aria-label="Sửa công đoạn"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              if (!isAssignedPM) return;
                              removeRow(idx);
                            }}
                            disabled={!isAssignedPM}
                            className={`text-rose-500 hover:text-rose-600 ${!isAssignedPM ? 'opacity-30 cursor-not-allowed' : ''}`}
                            aria-label="Xóa công đoạn"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 border-t-2 border-slate-100">
                    <td colSpan={5} className="px-3 py-3 font-semibold text-slate-700 text-right">TỔNG CỘNG</td>
                    <td className="px-3 py-3 text-center font-bold text-emerald-600">
                      {`${totalCpu.toLocaleString("vi-VN")} VNĐ`}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm sm:flex-row sm:items-center">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Lưu kế hoạch sản xuất
              </div>
              <div className="mt-1 text-sm text-slate-600">
                {savedPlanAt ? `Đã lưu: ${savedPlanAt}` : "Chưa có bản lưu kế hoạch trong phiên này."}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(`/production/${selectedProductionId}`)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={saveSteps}
                disabled={!selectedProductionId || !rows.length || !isAssignedPM}
                className="rounded-2xl bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-700 hover:shadow-md disabled:bg-emerald-400 disabled:cursor-not-allowed"
              >
                Lưu kế hoạch
              </button>
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
            {formError && (
              <div className="px-5 pt-4 pb-1">
                <p className="text-sm font-medium text-rose-500 bg-rose-50 px-3 py-2 rounded-lg border border-rose-100">
                  {formError}
                </p>
              </div>
            )}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Bắt đầu</label>
                  <input
                    type="datetime-local"
                    value={form.startDate}
                    onChange={(event) => handleFormChange("startDate", event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Kết thúc</label>
                  <input
                    type="datetime-local"
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
      <SuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        onPrimary={() => navigate("/production")}
        title="Lưu thành công"
        description="Kế hoạch sản xuất đã được lưu vào hệ thống."
        primaryLabel="OK"
      />
      <ConfirmModal
        isOpen={isConfirmSaveOpen}
        title="Xác nhận lưu lại kế hoạch"
        description="Hệ thống nhận thấy đơn sản xuất này đã có công đoạn. Việc lưu lại có thể tạo thêm các bản ghi trùng lặp (không ghi đè). Bạn có chắc chắn muốn tiếp tục lưu không?"
        onConfirm={() => saveSteps(true)}
        onClose={() => setIsConfirmSaveOpen(false)}
      />
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




