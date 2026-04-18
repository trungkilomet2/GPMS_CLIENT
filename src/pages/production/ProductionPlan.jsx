import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { ArrowLeft, Plus, Trash2, Pencil, Loader2, GripVertical, Save, LogOut, CheckCircle, Info } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import OwnerLayout from "@/layouts/OwnerLayout";
import ProductionPartService from "@/services/ProductionPartService";
import ProductionService from "@/services/ProductionService";
import TemplateService from "@/services/TemplateService";
import { getStoredUser } from "@/lib/authStorage";
import { hasAnyRole } from "@/lib/roleAccess";
import { getProductionStatusLabel } from "@/utils/statusUtils";
import { getErrorMessage } from "@/utils/errorUtils";
import SuccessModal from "@/components/SuccessModal";
import ConfirmModal from "@/components/ConfirmModal";
import OrderSpecificationCard from "@/components/orders/OrderSpecificationCard";
import OrderImageZoomModal from "@/pages/orders/components/OrderImageZoomModal";
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
      { partName: "Kiểm tra hoàn thiện", cpu: 180 },
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
      { partName: "Cắt mũ giày", cpu: 420 },
      { partName: "May mũ giày", cpu: 600 },
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
  const incoming = useMemo(() => location.state || null, [location.state]);
  const currentUser = useMemo(() => getStoredUser() || {}, []);
  const roleValue = currentUser?.role ?? currentUser?.roles ?? currentUser?.roleName ?? "";
  const isOwner = hasAnyRole(roleValue, ["owner", "admin"]);
  const isPM = hasAnyRole(roleValue, ["pm", "manager"]);

  const [productionList, setProductionList] = useState([]);
  const [selectedProduction, setSelectedProduction] = useState(null);

  const stateProductionId = location.state?.productionId;
  const initialProductionId = stateProductionId ? String(stateProductionId) : (id ? String(id) : "");
  const [selectedProductionId, setSelectedProductionId] = useState(() => initialProductionId);

  const [initialRows, setInitialRows] = useState([]);
  const [isConfirmDeleteStepOpen, setIsConfirmDeleteStepOpen] = useState(false);
  const [stepToDeleteIndex, setStepToDeleteIndex] = useState(null);
  const [isConfirmCancelOpen, setIsConfirmCancelOpen] = useState(false);
  const [isConfirmApplyOpen, setIsConfirmApplyOpen] = useState(false);
  const [applyTarget, setApplyTarget] = useState(null);

  const [rows, setRows] = useState(() => {
    if (incoming && Array.isArray(incoming.steps) && incoming.steps.length > 0) {
      const stageGroups = {};
      incoming.steps.forEach((s) => {
        const name = String(s.partName || "").trim();
        const key = name.toUpperCase();
        if (!stageGroups[key]) {
          stageGroups[key] = {
            ...s,
            allIds: [s.partId || s.id].filter(Boolean)
          };
        } else {
          const id = s.partId || s.id;
          if (id && !stageGroups[key].allIds.includes(id)) {
            stageGroups[key].allIds.push(id);
          }
        }
      });
      const uniqueSteps = Object.values(stageGroups);
      return uniqueSteps.map((s, idx) => ({
        ppId: 2000 + idx,
        productionId: Number(initialProductionId),
        partName: s.partName,
        cpu: String(s.cpu || ""),
        startDate: s.startDate || "",
        endDate: s.endDate || "",
        ppsId: s.partId || s.id || "",
        allIds: s.allIds || []
      }));
    }
    return [];
  });

  useEffect(() => {
    if (rows.length > 0 && initialRows.length === 0) {
      setInitialRows(rows.map(r => ({ ...r })));
    }
  }, [rows, initialRows.length]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
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
  const [dynamicTemplates, setDynamicTemplates] = useState([]);
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [zoomImageUrl, setZoomImageUrl] = useState("");
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [form, setForm] = useState({
    partName: "",
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

  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (index) => {
    setDragOverIndex(null);
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null);
      return;
    }

    const next = [...rows];
    const [movedRow] = next.splice(draggedIndex, 1);
    next.splice(index, 0, movedRow);

    setRows(next);
    setDraggedIndex(null);
    setSelectedIndex(index);

    // Optional: save order to draft
    // savePlan();
  };

  const isAssignedPM = useMemo(() => {
    if (isOwner) return true;
    if (!selectedProduction?.pmId) return false;
    const currentUserId = String(currentUser?.userId ?? currentUser?.id ?? currentUser?.accountId);
    return isPM && currentUserId === String(selectedProduction.pmId);
  }, [isPM, isOwner, currentUser, selectedProduction]);

  const totalCpu = useMemo(
    () => rows.reduce((sum, row) => sum + (Number(row.cpu) || 0), 0),
    [rows]
  );

  const formatDateTime = (value = "") => {
    if (!value) return "-";
    return String(value).replace("T", " ").slice(0, 16);
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
        toast.error(getErrorMessage(err, "Không thể tải danh sách đơn sản xuất."));
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
                const stageGroups = {};
                res.data.forEach((s) => {
                  const name = String(s.partName || "").trim();
                  const key = name.toUpperCase();
                  if (!stageGroups[key]) {
                    stageGroups[key] = {
                      ...s,
                      allIds: [s.id || s.partId].filter(Boolean)
                    };
                  } else {
                    const id = s.id || s.partId;
                    if (id && !stageGroups[key].allIds.includes(id)) {
                      stageGroups[key].allIds.push(id);
                    }
                  }
                });

                const uniqueParts = Object.values(stageGroups);

                const fetched = uniqueParts.map((s, idx) => ({
                  ppId: 2000 + idx,
                  productionId: Number(selectedProductionId),
                  partName: s.partName,
                  cpu: String(s.cpu || ""),
                  startDate: s.startDate || "",
                  endDate: s.endDate || "",
                  ppsId: s.id || s.partId || "",
                  allIds: s.allIds || []
                }));
                setInitialRows(fetched.map(r => ({ ...r })));
                return fetched;
              }
              return prev;
            });
          } else if (active) {
            setHasExistingParts(false);
          }
        } catch (err) {
          console.error("Error fetching existing parts:", err);
          // Silent or soft error: we might still allow creating new ones
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
          pmName: (payload.pm?.fullName ?? payload.pm?.name ?? payload.pmName) || (payload.pmId ? `PM #${payload.pmId}` : (payload.pm?.id ? `PM #${payload.pm.id}` : "Chưa phân công")),
          product: {
            productCode: order.id ? `MSP-${order.id}` : "MÃ-SP-KXD",
            productName: order.orderName,
            type: order.type,
            size: typeof order.size === "string" ? order.size.trim() : order.size,
            color: order.color,
            quantity: order.quantity,
            cpu: order.cpu,
            image: order.image || "",
            originalOrder: { ...payload, ...order },
          }
        });
      } catch (err) {
        console.error("Lỗi chi tiết đơn sản xuất:", err);
        toast.error(getErrorMessage(err, "Không thể tải chi tiết đơn sản xuất."));
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
    if (type.includes("người") || type.includes("nguoi") || type.includes("user")) return "Người dùng";
    return "all";
  }, [selectedProduction]);

  const combinedTemplates = useMemo(() => {
    const system = TEMPLATE_LIBRARY.map((t) => ({
      ...t,
      isSystem: true,
      key: `sys-${t.key || t.label}`,
    }));

    const user = dynamicTemplates.map((t) => ({
      key: `user-${t.templateId}`,
      label: t.templateName,
      category: "Người dùng",
      description: `Mẫu người dùng với ${t.steps?.length || 0} công đoạn.`,
      steps: Array.isArray(t.steps)
        ? t.steps.map((s) => ({
          partName: s.partName,
          cpu: 0, // Fallback as API doesn't provide cpu
        }))
        : [],
      isSystem: false,
      templateId: t.templateId,
    }));

    return [...system, ...user];
  }, [dynamicTemplates]);

  const fetchDynamicTemplates = async () => {
    try {
      const res = await TemplateService.getTemplates();
      const list = res?.data?.data ?? res?.data ?? [];
      setDynamicTemplates(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Lỗi tải template người dùng:", err);
      // Optional: toast.error(getErrorMessage(err, "Không thể tải mẫu thiết kế cá nhân."));
    }
  };

  useEffect(() => {
    fetchDynamicTemplates();
  }, []);

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast.error("Vui lòng nhập tên template.");
      return;
    }
    if (rows.length === 0) {
      toast.error("Không có công đoạn nào để lưu thành mẫu.");
      return;
    }

    try {
      setIsSavingTemplate(true);
      const payload = {
        templateName: newTemplateName.trim(),
        steps: rows.map((row, idx) => ({
          partName: row.partName,
          stepOrder: idx + 1,
        })),
      };
      await TemplateService.createTemplate(payload);
      toast.success("Đã lưu mẫu công đoạn thành công!");
      setIsSaveTemplateModalOpen(false);
      setNewTemplateName("");
      // Refresh list
      fetchDynamicTemplates();
    } catch (err) {
      toast.error(getErrorMessage(err, "Không thể lưu mẫu công đoạn."));
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = (template) => {
    if (template.isSystem) return;
    setTemplateToDelete(template);
    setIsConfirmDeleteOpen(true);
  };

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return;

    try {
      await TemplateService.deleteTemplate(templateToDelete.templateId);
      toast.success(`Đã xóa mẫu "${templateToDelete.label}" thành công!`);
      fetchDynamicTemplates();
    } catch (err) {
      toast.error(getErrorMessage(err, "Không thể xóa mẫu thiết kế."));
    } finally {
      setIsConfirmDeleteOpen(false);
      setTemplateToDelete(null);
    }
  };

  const templatesByUserStep = useMemo(() => {
    if (!userStepFilters.length) {
      return combinedTemplates.map((template) => ({
        ...template,
        filteredSteps: template.steps,
      }));
    }

    return combinedTemplates.map((template) => {
      const filteredSteps = template.steps.filter((step) =>
        userStepFilters.some((filter) => normalizeText(step.partName).includes(filter))
      );
      return { ...template, filteredSteps };
    }).filter((template) => template.filteredSteps.length > 0);
  }, [userStepFilters, combinedTemplates]);

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

    // Comprehensive check for CPU range: 100 - 10,000,000
    const invalidStep = rows.find(r => {
      const val = Number(r.cpu);
      return isNaN(val) || val < 100 || val > 10000000;
    });

    if (invalidStep) {
      toast.error(`Công đoạn "${invalidStep.partName}" có giá không hợp lệ (Phải từ 100 đến 10.000.000 VNĐ).`);
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
        partId: (row.ppsId && Number(row.ppsId) < 2000) ? Number(row.ppsId) : 0,
        partName: row?.partName || "",
        startDate: row?.startDate ? new Date(row.startDate).toISOString() : new Date().toISOString(),
        endDate: row?.endDate ? new Date(row.endDate).toISOString() : new Date().toISOString(),
        cpu: Number(row?.cpu || 0),
      }));

      // Split into new and existing parts
      const newParts = payload.filter((p) => p.partId === 0);
      const existingParts = payload.filter((p) => p.partId > 0);

      // 1. Create new parts if any
      if (newParts.length > 0) {
        await ProductionPartService.createParts(productionId, { parts: newParts });
      }

      // 2. Update existing parts if any
      if (existingParts.length > 0) {
        const updatePromises = [];
        existingParts.forEach((p) => {
          // Find the original row to get allIds
          const row = rows.find(r => r.ppsId === String(p.partId) || Number(r.ppsId) === p.partId);
          if (row && row.allIds && row.allIds.length > 0) {
            // Update all siblings with the same data
            row.allIds.forEach(id => {
              updatePromises.push(ProductionPartService.updatePart(id, { ...p, partId: id }));
            });
          } else {
            // Fallback for single ID
            updatePromises.push(ProductionPartService.updatePart(p.partId, p));
          }
        });
        await Promise.all(updatePromises);
      }

      setHasExistingParts(true);

      let finalMsg = hasExistingParts ? "Đã cập nhật kế hoạch sản xuất thành công!" : "Đã lưu kế hoạch sản xuất thành công!";

      if (isOwner) {
        try {
          const currentStatus = selectedProduction?.status;
          // Only auto-approve if not already in production
          if (currentStatus !== "Đang Sản Xuất") {
            // Directly approve for Owners (skipping submit)
            await ProductionService.approveProductionPlan(productionId);
            finalMsg = "Lưu kế hoạch thành công.";
            setSelectedProduction(prev => prev ? { ...prev, status: "Đang Sản Xuất" } : prev);
          }
        } catch (autoErr) {
          console.error("Auto approval failed:", autoErr);
        }
      }

      toast.success(finalMsg);
      savePlan();
      // Redirect to production detail
      const isWorkerPath = location.pathname.startsWith("/worker/");
      const basePath = isWorkerPath ? "/worker/production" : "/production";
      navigate(`${basePath}/${selectedProductionId}`);
    } catch (error) {
      console.error("Save Error:", error);
      const errMsg = getErrorMessage(error, "Lưu công đoạn thất bại.");

      toast.error(errMsg);
      setSavePartsMessage({ type: "error", text: `Chi tiết lỗi: ${errMsg}` });
    } finally {
      setSavingParts(false);
    }
  };

  const applySavedDesign = (design) => {
    handleRequestApplyDesign(design);
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
    setForm({ partName: "", cpu: "" });
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (index) => {
    const target = rows[index];
    if (!target) return;
    setEditingIndex(index);
    setForm({
      partName: target.partName || "",
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
    let nextValue = value;
    if (field === "cpu") {
      nextValue = value.replace(/[^0-9]/g, "");
    }
    setForm((prev) => ({ ...prev, [field]: nextValue }));
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
    if (form.cpu === "" || Number(form.cpu) < 100 || isNaN(Number(form.cpu))) {
      setFormError("Giá/SP phải từ 100 đến 10.000.000 VNĐ.");
      return;
    }
    if (Number(form.cpu) > 10000000) {
      setFormError("Giá/SP không vượt quá 10.000.000 VNĐ.");
      return;
    }

    const isDuplicate = rows.some((row, idx) =>
      idx !== editingIndex &&
      (row.partName || "").trim().toLowerCase() === name.toLowerCase()
    );
    if (isDuplicate) {
      setFormError("Tên công đoạn này đã tồn tại trong danh sách.");
      return;
    }

    setFormError("");

    const defaultStart = selectedProduction?.pStartDate ? `${selectedProduction.pStartDate}T08:00` : new Date().toISOString().slice(0, 16);
    const defaultEnd = selectedProduction?.pEndDate ? `${selectedProduction.pEndDate}T17:00` : new Date().toISOString().slice(0, 16);
    setRows((prev) => {
      if (editingIndex === null) {
        const next = [
          ...prev,
          {
            ppId: 2000 + prev.length,
            productionId: Number(selectedProductionId),
            partName: name,
            cpu: form.cpu.trim(),
            startDate: defaultStart,
            endDate: defaultEnd,
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
        startDate: defaultStart,
        endDate: defaultEnd,
      };
      return next;
    });
    closeModal();
  };

  const handleRequestDeleteStep = (index) => {
    setStepToDeleteIndex(index);
    setIsConfirmDeleteStepOpen(true);
  };

  const confirmDeleteStep = () => {
    if (stepToDeleteIndex === null) return;
    const index = stepToDeleteIndex;
    setRows((prev) => prev.filter((_, i) => i !== index));
    setSelectedIndex((prev) => {
      if (prev === index) return 0;
      if (prev > index) return prev - 1;
      return prev;
    });
    setIsConfirmDeleteStepOpen(false);
    setStepToDeleteIndex(null);
    toast.info("Đã xóa công đoạn.");
  };

  const checkIfDirty = () => {
    if (rows.length !== initialRows.length) return true;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].partName !== initialRows[i].partName || rows[i].cpu !== initialRows[i].cpu) {
        return true;
      }
    }
    return false;
  };

  const handleCancelPlan = () => {
    if (checkIfDirty()) {
      setIsConfirmCancelOpen(true);
    } else {
      navigate(`/production/${selectedProductionId}`);
    }
  };

  const confirmApply = () => {
    if (!applyTarget) return;
    const { type, data } = applyTarget;
    if (type === "template") {
      const baseStart = selectedProduction?.pStartDate ? `${selectedProduction.pStartDate}T08:00` : "";
      const baseEnd = selectedProduction?.pEndDate ? `${selectedProduction.pEndDate}T17:00` : "";
      const stepsList = data.filteredSteps?.length ? data.filteredSteps : data.steps;
      const next = stepsList.map((step, index) => ({
        ppId: 2000 + index,
        productionId: selectedProductionId ? Number(selectedProductionId) : null,
        partName: step.partName,
        cpu: "", // Do not generate price when applying templates
        startDate: baseStart,
        endDate: baseEnd,
        ppsId: "",
      }));
      setRows(next);
    } else if (type === "design") {
      setRows(data.rows.map((row) => ({ ...row })));
    }
    setSelectedIndex(0);
    setIsConfirmApplyOpen(false);
    setApplyTarget(null);
    toast.success("Đã áp dụng thành công!");
  };

  const handleRequestApplyTemplate = (template) => {
    if (rows.length > 0) {
      setApplyTarget({ type: "template", data: template });
      setIsConfirmApplyOpen(true);
    } else {
      // Apply directly if rows is empty
      const baseStart = selectedProduction?.pStartDate ? `${selectedProduction.pStartDate}T08:00` : "";
      const baseEnd = selectedProduction?.pEndDate ? `${selectedProduction.pEndDate}T17:00` : "";
      const stepsList = template.filteredSteps?.length ? template.filteredSteps : template.steps;
      const next = stepsList.map((step, index) => ({
        ppId: 2000 + index,
        productionId: selectedProductionId ? Number(selectedProductionId) : null,
        partName: step.partName,
        cpu: "", // Do not generate price when applying templates
        startDate: baseStart,
        endDate: baseEnd,
        ppsId: "",
      }));
      setRows(next);
      setSelectedIndex(0);
    }
  };

  const handleRequestApplyDesign = (design) => {
    if (rows.length > 0) {
      setApplyTarget({ type: "design", data: design });
      setIsConfirmApplyOpen(true);
    } else {
      setRows(design.rows.map((row) => ({ ...row })));
      setSelectedIndex(0);
    }
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
                onClick={() => {
                  const isWorkerPath = location.pathname.startsWith("/worker/");
                  const basePath = isWorkerPath ? "/worker/production" : "/production";
                  navigate(`${basePath}/${selectedProductionId}`);
                }}
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



          {/* Standardized Order Info Section */}
          <div className="space-y-6">
            <div className="bg-emerald-50/80 border border-emerald-900/20 p-6 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-[10px] font-black text-emerald-800/80 uppercase tracking-widest leading-none mb-1">Mã đơn sản xuất</p>
                <h3 className="text-xl font-black text-emerald-950 uppercase">{selectedProduction ? `#PR-${selectedProduction.productionId}` : "-"}</h3>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-emerald-800/80 uppercase tracking-widest leading-none mb-1">Quản lý dự án (PM)</p>
                <p className="text-sm font-black text-emerald-700 uppercase">{selectedProduction?.pmName || "Chưa phân công"}</p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden border border-black bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setShowTemplateSection((prev) => !prev)}
              className="w-full flex items-center justify-between p-6 text-left border-b border-black bg-emerald-50/20 hover:bg-emerald-50/40 transition-colors"
            >
              <div>
                <h2 className="text-base font-black text-emerald-950 uppercase tracking-tight">Template công đoạn</h2>
                <p className="text-[10px] font-bold text-emerald-800/80 uppercase tracking-widest mt-1">Chọn nhanh theo loại sản phẩm, sau đó chỉnh sửa tùy ý.</p>
              </div>
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest border-b border-emerald-700">
                {showTemplateSection ? "Thu gọn" : "Mở rộng"}
              </span>
            </button>

            {showTemplateSection && (
              <div className="p-6">
                <div className="mt-4 flex flex-wrap gap-2">
                  {["all", "Áo", "Quần", "Giày", "Mũ", "Người dùng"].map((item) => {
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
                          onClick={() => handleRequestApplyDesign(design)}
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
                        <div className="flex flex-col items-end gap-2">
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${template.isSystem ? "border-slate-200 bg-slate-50 text-slate-600" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                            {template.isSystem ? "Hệ thống" : "Của tôi"}
                          </span>
                          {!template.isSystem && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTemplate(template);
                              }}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition"
                              title="Xóa mẫu này"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
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
                          onClick={() => handleRequestApplyTemplate(template)}
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
              </div>
            )}
          </div>

          <div className="overflow-hidden border border-black bg-white shadow-sm">
            <div className="px-6 py-4 border-b border-black flex items-center justify-between bg-emerald-50/20">
              <div>
                <h2 className="text-base font-black text-emerald-950 uppercase tracking-tight">Danh sách công đoạn</h2>
                <div className="flex flex-col gap-1 mt-1">
                  <p className="text-[10px] font-bold text-emerald-800/80 uppercase tracking-widest">Quản lý định mức nhân công cho từng bước sản xuất.</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSaveTemplateModalOpen(true)}
                  disabled={!rows.length || !isAssignedPM}
                  className="inline-flex items-center gap-2 rounded-xl border border-black bg-emerald-50 px-3.5 py-2 text-[10px] font-black text-emerald-900 uppercase tracking-widest transition hover:bg-emerald-900 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  Lưu mẫu thiết kế
                </button>
                <button
                  onClick={openAddModal}
                  disabled={!selectedProductionId || !isAssignedPM}
                  className="inline-flex items-center gap-2 rounded-xl border border-black bg-emerald-100 px-3.5 py-2 text-[10px] font-black text-emerald-950 uppercase tracking-widest transition hover:bg-emerald-900 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <Plus size={16} /> Thêm công đoạn
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-black table-auto border-collapse">
                <thead className="bg-slate-100/50">
                  <tr className="divide-x divide-black border-b border-black">
                    <th className="px-3 py-3 text-center text-[10px] font-black text-black uppercase tracking-widest w-16">STT</th>
                    <th className="px-3 py-3 w-10"></th>
                    <th className="px-6 py-3 text-left text-[10px] font-black text-black uppercase tracking-widest">Tên công đoạn</th>
                    <th className="px-3 py-3 text-center text-[10px] font-black text-black uppercase tracking-widest">Đơn giá</th>
                    <th className="px-3 py-3 text-center text-[10px] font-black text-black uppercase tracking-widest w-32">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black bg-white">
                  {rows.map((row, idx) => (
                    <tr
                      key={`${row.ppId}-${idx}`}
                      draggable={isAssignedPM}
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragLeave={handleDragLeave}
                      onDragEnd={() => {
                        setDraggedIndex(null);
                        setDragOverIndex(null);
                      }}
                      onDrop={() => handleDrop(idx)}
                      className={`group transition-all duration-200 divide-x divide-black
                        ${selectedIndex === idx ? "bg-emerald-50/40" : "hover:bg-slate-50/60"} 
                        ${dragOverIndex === idx ? "border-t-2 border-emerald-600 bg-emerald-50" : ""}`}
                      onClick={() => setSelectedIndex(idx)}
                    >
                      <td className="px-3 py-4 text-center text-[11px] font-black text-slate-500">{idx + 1}</td>
                      <td className="px-1 py-4 text-center">
                        {isAssignedPM && (
                          <div className="text-slate-300 cursor-grab hover:text-black">
                            <GripVertical size={18} />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] font-black text-black uppercase tracking-tight">{row.partName || "-"}</span>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <span className="text-[13px] font-mono font-black text-black">
                          {row.cpu ? `${Number(row.cpu).toLocaleString("vi-VN")} đ` : "-"}
                        </span>
                      </td>
                      <td className="px-2 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              if (!isAssignedPM) return;
                              openEditModal(idx);
                            }}
                            disabled={!isAssignedPM}
                            className="p-2 rounded-lg text-slate-400 hover:bg-black hover:text-white transition-all shadow-sm disabled:opacity-30"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              if (!isAssignedPM) return;
                              handleRequestDeleteStep(idx);
                            }}
                            disabled={!isAssignedPM}
                            className="p-2 rounded-lg text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm disabled:opacity-30"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-emerald-800 text-white border-t border-black divide-x divide-emerald-700">
                    <td colSpan={3} className="px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-right">Tổng định mức CPU</td>
                    <td className="px-3 py-4 text-center text-lg font-black text-emerald-300">
                      {totalCpu.toLocaleString("vi-VN")}
                    </td>
                    <td className="text-[10px] font-black uppercase text-center text-emerald-200/80 italic">vnđ / sp</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col items-start justify-between gap-4 border border-black bg-white px-8 py-6 shadow-sm sm:flex-row sm:items-center">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">
                Lưu kế hoạch sản xuất
              </div>
              <div className="text-[11px] font-bold text-slate-400 italic">
                {savedPlanAt ? `Bản nháp gần nhất: ${savedPlanAt}` : "Mọi thay đổi sẽ được lưu trực tiếp vào cơ sở dữ liệu."}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const isWorkerPath = location.pathname.startsWith("/worker/");
                  const basePath = isWorkerPath ? "/worker/production" : "/production";
                  navigate(`${basePath}/${selectedProductionId}`);
                }}
                className="px-6 py-3 text-[10px] font-black text-black uppercase tracking-widest border border-black hover:bg-slate-50 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={saveSteps}
                disabled={!selectedProductionId || !rows.length || !isAssignedPM}
                className="px-10 py-3 text-[10px] font-black text-white uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-100 disabled:bg-slate-300 disabled:shadow-none transition-all active:scale-95"
              >
                Lưu kế hoạch
              </button>
            </div>
          </div>
        </div>
      </div>

      <OrderImageZoomModal
        isOpen={isImageModalOpen}
        imageUrl={zoomImageUrl}
        onClose={() => {
          setIsImageModalOpen(false);
          setZoomImageUrl("");
        }}
      />
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
      <ConfirmModal
        isOpen={isConfirmSaveOpen}
        title="Xác nhận cập nhật kế hoạch"
        description="Hệ thống nhận thấy đơn sản xuất này đã có công đoạn. Việc lưu lại sẽ ghi đè và cập nhật danh sách công đoạn hiện tại. Bạn có chắc chắn muốn tiếp tục không?"
        onConfirm={() => saveSteps(true)}
        onClose={() => setIsConfirmSaveOpen(false)}
        primaryLabel="Xác nhận cập nhật"
        confirmIcon={Save}
        variant="warning"
      />
      <ConfirmModal
        isOpen={isConfirmDeleteOpen}
        title="Xác nhận xóa mẫu thiết kế"
        description={`Bạn có chắc chắn muốn xóa mẫu thiết kế "${templateToDelete?.label}" không? Hành động này không thể hoàn tác.`}
        onConfirm={confirmDeleteTemplate}
        onClose={() => setIsConfirmDeleteOpen(false)}
        primaryLabel="Xác nhận xóa"
        confirmIcon={Trash2}
        variant="danger"
      />

      {isSaveTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Lưu mẫu công đoạn
              </h3>
              <button
                onClick={() => setIsSaveTemplateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
              >
                Đóng
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Tên mẫu thiết kế</label>
                  <input
                    type="text"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="Ví dụ: Mẫu áo thun cao cấp v2"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 shadow-sm"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block flex items-center justify-between">
                    <span>Xem trước công đoạn ({rows.length})</span>
                    <span className="text-[10px] text-slate-400 normal-case font-normal italic">Thứ tự này sẽ được lưu cố định</span>
                  </label>
                  <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/50 p-2 text-sm">
                    <div className="space-y-1.5">
                      {rows.map((row, idx) => (
                        <div key={`preview-${idx}`} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white border border-slate-100 shadow-sm">
                          <span className="flex-none w-6 h-6 flex items-center justify-center rounded-full bg-emerald-50 text-[10px] font-bold text-emerald-600 border border-emerald-100">
                            {idx + 1}
                          </span>
                          <span className="text-sm text-slate-700 font-medium truncate">{row.partName}</span>
                          {row.cpu && (
                            <span className="flex-none ml-auto text-[10px] font-semibold text-slate-400">
                              {Number(row.cpu).toLocaleString("vi-VN")} đ
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed italic bg-amber-50/50 p-3 rounded-xl border border-amber-100/50">
                  <span className="font-bold text-amber-700">Lưu ý:</span> Bản thiết kế này sẽ được lưu vào hệ thống để bạn có thể tái sử dụng cho các đơn hàng tương tự trong tương lai.
                </p>
              </div>
              <div className="mt-8 flex justify-end gap-3">
                <button
                  onClick={() => setIsSaveTemplateModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleCreateTemplate}
                  disabled={isSavingTemplate || !newTemplateName.trim()}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 text-sm font-bold text-white shadow-lg shadow-emerald-100 hover:bg-emerald-700 hover:shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all active:scale-95"
                >
                  {isSavingTemplate ? <Loader2 className="animate-spin" size={16} /> : null}
                  {isSavingTemplate ? "Đang lưu..." : "Xác nhận lưu"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={isConfirmDeleteStepOpen}
        title="Xác nhận xóa công đoạn"
        description={`Bạn có chắc chắn muốn xóa công đoạn "${stepToDeleteIndex !== null ? rows[stepToDeleteIndex]?.partName : ""}" không? Hành động này không thể hoàn tác.`}
        onConfirm={confirmDeleteStep}
        onClose={() => {
          setIsConfirmDeleteStepOpen(false);
          setStepToDeleteIndex(null);
        }}
        primaryLabel="Xác nhận xóa"
        confirmIcon={Trash2}
        variant="danger"
      />

      <ConfirmModal
        isOpen={isConfirmCancelOpen}
        title="Thay đổi chưa lưu"
        description="Bạn có các thay đổi chưa được lưu trong kế hoạch này. Bạn có chắc chắn muốn thoát và mất các thay đổi này không?"
        onConfirm={() => navigate(`/production/${selectedProductionId}`)}
        onClose={() => setIsConfirmCancelOpen(false)}
        primaryLabel="Xác nhận thoát"
        secondaryLabel="Quay lại"
        confirmIcon={LogOut}
        variant="warning"
      />
      <ConfirmModal
        isOpen={isConfirmApplyOpen}
        title="Xác nhận áp dụng"
        description="Áp dụng mẫu này sẽ ghi đè lên toàn bộ các công đoạn hiện có trong kế hoạch. Bạn có chắc chắn muốn tiếp tục không?"
        onConfirm={confirmApply}
        onClose={() => {
          setIsConfirmApplyOpen(false);
          setApplyTarget(null);
        }}
        primaryLabel="Xác nhận áp dụng"
        confirmIcon={CheckCircle}
        variant="warning"
      />
    </OwnerLayout>
  );
}
