import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, ImagePlus, Send, Wrench } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import OwnerLayout from "@/layouts/OwnerLayout";
import WorkerLayout from "@/layouts/WorkerLayout";
import ProductionService from "@/services/ProductionService";
import ProductionPartService from "@/services/ProductionPartService";
import { getAuthItem, getStoredUser } from "@/lib/authStorage";
import { hasAnyRole } from "@/lib/internalRoleFlow";
import "@/styles/homepage.css";
import "@/styles/leave.css";
import ConfirmModal from "@/components/ConfirmModal";

const ERROR_TYPES = [
  { value: 0, label: "Lỗi công đoạn" },
  { value: 1, label: "Lỗi cắt" },
  { value: 2, label: "Lỗi may" },
  { value: 3, label: "Lỗi khác" },
];

const toList = (payload) => {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.list)) return payload.list;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload)) return payload;
  return [];
};

const formatToDateTimeLocal = (isoString) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

const mapPart = (part, fallbackProductionId) => ({
  id: part?.id ?? part?.partId ?? null,
  productionId:
    part?.productionId ??
    part?.planId ??
    part?.production?.id ??
    fallbackProductionId ??
    "",
  orderName: part?.orderName ?? part?.order?.orderName ?? "",
  partName: part?.partName ?? part?.name ?? part?.title ?? "",
  colorName: part?.colorName ?? part?.color ?? part?.variant?.color ?? "",
  sizeName: part?.sizeName ?? part?.size ?? part?.variant?.size ?? "",
  startDate: part?.startDate ?? part?.planStartDate ?? "",
  endDate: part?.endDate ?? part?.planEndDate ?? "",
  partOrderSizeId: part?.partOrderSizeId ?? part?.orderSizeId ?? null,
});

const getPriorityBySeverity = (severity) => 2;

const getErrorTypeLabel = (value) =>
  ERROR_TYPES.find((item) => item.value === Number(value))?.label ?? value;

export default function ErrorReport() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);

  const assignment = location.state?.assignment ?? null;
  const normalizedAssignment = useMemo(() => {
    if (!assignment) return null;
    return {
      partId: assignment?.partId ?? "",
      orderSizeId: assignment?.orderSizeId ?? assignment?.id ?? "",
      productionId: assignment?.productionId ?? "",
      orderName: assignment?.orderName ?? "",
      partName: assignment?.partName ?? "",
      colorName: assignment?.colorName ?? assignment?.color ?? "",
      sizeName: assignment?.sizeName ?? assignment?.size ?? "",
      startDate: assignment?.startDate ?? "",
      endDate: assignment?.endDate ?? "",
      errorType: assignment?.errorType ?? 0,
      otherErrorDetail: assignment?.otherErrorDetail ?? "",
      happenAt: assignment?.happenAt ?? "",
      maxQuantity: assignment?.maxQuantity ?? null,
    };
  }, [assignment]);

  const [form, setForm] = useState({
    productionId: normalizedAssignment?.productionId
      ? String(normalizedAssignment.productionId)
      : "",
    partId: normalizedAssignment?.partId ? String(normalizedAssignment.partId) : "",
    colorName: normalizedAssignment?.colorName || "",
    sizeName: normalizedAssignment?.sizeName || "",
    partOrderSizeId: normalizedAssignment?.orderSizeId || "",
    errorType: normalizedAssignment?.errorType !== undefined ? normalizedAssignment.errorType : 0,
    severity: 2,
    title: "",
    description: "",
    quantity: "",
    happenAt: formatToDateTimeLocal(normalizedAssignment?.happenAt || new Date().toISOString()),
    repairWorker: "", // Full name for UI display if needed
    assignedTo: "",   // The worker ID (integer)
  });

  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const [notice, setNotice] = useState("");
  const [attachments, setAttachments] = useState([]);

  const [productions, setProductions] = useState([]);
  const [parts, setParts] = useState([]);
  const [loadingProductions, setLoadingProductions] = useState(false);
  const [loadingParts, setLoadingParts] = useState(false);
  const [partsError, setPartsError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const isProductionLocked = Boolean(normalizedAssignment?.productionId);
  const isPartLocked = Boolean(normalizedAssignment?.partId);

  useEffect(() => {
    return () => {
      attachments.forEach((item) => {
        if (item?.preview) URL.revokeObjectURL(item.preview);
      });
    };
  }, [attachments]);

  useEffect(() => {
    let active = true;

    const fetchProductions = async () => {
      try {
        setLoadingProductions(true);
        const allItems = [];
        const seen = new Set();
        let pageIndex = 0;
        let recordCount = null;
        const pageSize = 50;
        const maxPages = 200;

        while (pageIndex < maxPages) {
          const response = await ProductionService.getProductionList({
            PageIndex: pageIndex,
            PageSize: pageSize,
            SortColumn: "Name",
            SortOrder: "ASC",
          });

          if (!active) return;

          const payload = response?.data ?? response;
          const list = toList(payload);
          let added = 0;

          list.forEach((item) => {
            const key = String(item?.productionId ?? item?.id ?? "");
            if (!key || seen.has(key)) return;
            seen.add(key);
            allItems.push(item);
            added += 1;
          });

          if (recordCount == null) {
            const reported = Number(payload?.recordCount ?? payload?.totalCount ?? 0);
            recordCount = Number.isFinite(reported) && reported > 0 ? reported : null;
          }

          if (list.length === 0 || added === 0) break;
          if (recordCount != null && allItems.length >= recordCount) break;
          if (list.length < pageSize) break;
          pageIndex += 1;
        }

        if (!active) return;
        setProductions(allItems);
      } catch {
        if (!active) return;
        setProductions([]);
      } finally {
        if (active) setLoadingProductions(false);
      }
    };

    fetchProductions();
    return () => {
      active = false;
    };
  }, []);


  useEffect(() => {
    const productionId = String(form.productionId || "").trim();
    if (!productionId) {
      setParts([]);
      setPartsError("");
      setEmployees([]);
      return;
    }

    const fallbackAssignedPart =
      normalizedAssignment?.partId &&
        normalizedAssignment?.productionId &&
        String(normalizedAssignment.productionId) === productionId
        ? {
          id: normalizedAssignment.partId,
          partOrderSizeId: normalizedAssignment.orderSizeId,
          productionId,
          orderName: normalizedAssignment.orderName,
          partName: normalizedAssignment.partName,
          startDate: normalizedAssignment.startDate,
          endDate: normalizedAssignment.endDate,
        }
        : null;

    if (isPartLocked && fallbackAssignedPart) {
      setParts([fallbackAssignedPart]);
      setPartsError("");
      setLoadingParts(false);
      return;
    }

    let active = true;

    const fetchParts = async () => {
      try {
        setLoadingParts(true);
        setLoadingEmployees(true);
        setPartsError("");

        const response = await ProductionPartService.getPartsByProduction(productionId, {
          PageIndex: 0,
          PageSize: 100,
          SortColumn: "Name",
          SortOrder: "ASC",
        });

        if (!active) return;

        const payload = response?.data ?? response;
        const rawParts = toList(payload);
        const mappedParts = rawParts.map((item) => mapPart(item, productionId));
        const hasAssignedPart = mappedParts.some(
          (item) => String(item.id ?? "") === String(normalizedAssignment?.partId ?? "")
        );

        if (fallbackAssignedPart && !hasAssignedPart) {
          mappedParts.unshift(fallbackAssignedPart);
        }

        setParts(mappedParts);

        setParts(mappedParts);
      } catch {
        if (!active) return;
        if (fallbackAssignedPart) {
          setParts([fallbackAssignedPart]);
          setPartsError("");
        } else {
          setParts([]);
          setPartsError("Không thể tải danh sách công đoạn.");
        }
      } finally {
        if (active) {
          setLoadingParts(false);
          setLoadingEmployees(false);
        }
      }
    };

    fetchParts();

    return () => {
      active = false;
    };
  }, [form.productionId, normalizedAssignment, isPartLocked]);

  useEffect(() => {
    const partOrderSizeId = String(form.partOrderSizeId || "").trim();
    if (!partOrderSizeId) {
      setEmployees([]);
      return;
    }

    let active = true;
    const fetchIssueWorkers = async () => {
      try {
        setLoadingEmployees(true);
        const res = await ProductionPartService.getIssueWorkers(partOrderSizeId);
        if (!active) return;

        // Axios interceptor returns response.data, so res might be the payload or the array
        const payload = res;
        const list = toList(payload);

        if (list.length === 0) {
          console.warn("API returned empty worker list for part:", partOrderSizeId);
          setEmployees([]);
          toast.info("Công đoạn này chưa có thợ được phân công.");
          return;
        }

        const normalized = list.map(emp => {
          const info = emp.worker || emp.workerInfo || emp.user || emp.account || emp;
          const id = (info.id !== undefined && info.id !== null) ? String(info.id) :
            (info.userId || info.workerId || info.uId || String(Math.random()));
          const name = info.fullName || info.workerName || info.userName || info.name || "N/A";
          return { id, fullName: name };
        });

        setEmployees(normalized);
      } catch (err) {
        console.error("Lỗi tải danh sách thợ:", err);
        if (active) {
          setEmployees([]);
          toast.error("Không thể tải danh sách thợ của công đoạn này.");
        }
      } finally {
        if (active) setLoadingEmployees(false);
      }
    };

    fetchIssueWorkers();
    return () => {
      active = false;
    };
  }, [form.partOrderSizeId]);


  const productionOptions = useMemo(() => {
    const map = new Map();

    productions.forEach((item) => {
      const productionId = String(item?.productionId ?? item?.id ?? "");
      if (!productionId || map.has(productionId)) return;
      map.set(productionId, {
        productionId,
        orderName: item?.orderName ?? item?.order?.orderName ?? item?.name ?? "",
      });
    });

    if (normalizedAssignment?.productionId) {
      const productionId = String(normalizedAssignment.productionId);
      if (!map.has(productionId)) {
        map.set(productionId, {
          productionId,
          orderName: normalizedAssignment.orderName || "Kế hoạch từ chi tiết",
        });
      }
    }

    return Array.from(map.values());
  }, [productions, normalizedAssignment]);

  const selectedPart = useMemo(() => {
    if (!form.partId) return null;
    const fromList = parts.find((item) => String(item.id) === String(form.partId));
    if (fromList) return fromList;

    if (
      normalizedAssignment?.partId &&
      String(normalizedAssignment.partId) === String(form.partId)
    ) {
      return {
        id: normalizedAssignment.partId,
        productionId: normalizedAssignment.productionId,
        orderName: normalizedAssignment.orderName,
        partName: normalizedAssignment.partName,
        colorName: normalizedAssignment.colorName,
        sizeName: normalizedAssignment.sizeName,
        startDate: normalizedAssignment.startDate,
        endDate: normalizedAssignment.endDate,
        maxQuantity: normalizedAssignment.maxQuantity,
      };
    }

    return null;
  }, [form.partId, parts, normalizedAssignment]);

  const handleChange = (field, value) => {
    setForm((prev) => {
      if (field === "quantity") {
        const val = value.replace(/\D/g, ""); // Only allow digits
        if (!val) return { ...prev, [field]: "" };
        const num = Number(val);
        const maxQty = selectedPart?.maxQuantity ?? normalizedAssignment?.maxQuantity;

        // If there's a max limit, clamp the value
        if (maxQty !== null && num > maxQty) {
          toast.warn(`Số lượng tối đa cho phép là ${maxQty}`, { toastId: "max-qty-warn" });
          return { ...prev, [field]: String(maxQty) };
        }
        return { ...prev, [field]: val };
      }

      const next = { ...prev, [field]: value };

      if (field === "errorType") {
        const typeNum = Number(value);
        if (typeNum === 1 || typeNum === 2) {
          const matchTerm = typeNum === 1 ? "cắt" : "may";
          const matchedPart = parts.find(p =>
            p.partName?.toLowerCase().includes(matchTerm)
          );
          if (matchedPart) {
            next.partId = String(matchedPart.id);
            next.colorName = matchedPart.colorName || "";
            next.sizeName = matchedPart.sizeName || "";
          }
        }
      }

      if (field === "partId") {
        const part = parts.find(p => String(p.id) === String(value));
        if (part) {
          next.colorName = part.colorName || "";
          next.sizeName = part.sizeName || "";
          next.partOrderSizeId = part.partOrderSizeId || ""; // Syncing partOrderSizeId
        }
      }

      if (field === "assignedTo") {
        const emp = employees.find(e => String(e.id) === String(value));
        if (emp) {
          next.repairWorker = emp.fullName;
        } else {
          next.repairWorker = "";
        }
      }

      return next;
    });
    setNotice("");
    setSubmitError("");
  };

  const handleProductionChange = (value) => {
    setForm((prev) => ({
      ...prev,
      productionId: value,
      partId: isPartLocked ? prev.partId : "",
    }));
    setNotice("");
    setSubmitError("");
  };

  const handleFiles = (fileList) => {
    const next = Array.from(fileList || []).filter((file) => file.type.startsWith("image/"));
    if (next.length === 0) return;

    // Limit to exactly 1 image
    const singleFile = next[0];
    const mapped = {
      id: `${singleFile.name}-${singleFile.size}-${singleFile.lastModified}`,
      file: singleFile,
      preview: URL.createObjectURL(singleFile),
    };

    // Replace current rather than append
    setAttachments((prev) => {
      prev.forEach(item => { if (item?.preview) URL.revokeObjectURL(item.preview); });
      return [mapped];
    });
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    handleFiles(event.dataTransfer.files);
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => {
      const item = prev.find((entry) => entry.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((entry) => entry.id !== id);
    });
  };


  const resetFormAfterSubmit = () => {
    setForm((prev) => ({
      ...prev,
      title: "",
      description: "",
      quantity: "",
      happenAt: formatToDateTimeLocal(new Date().toISOString()),
      repairWorker: "",
      otherErrorDetail: "",
    }));

    setNotice("");
    setNotice("");

    attachments.forEach((item) => {
      if (item?.preview) URL.revokeObjectURL(item.preview);
    });
    setAttachments([]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setNotice("");

    const productionId = String(form.productionId || "").trim();
    const partId = String(form.partId || "").trim();

    let title = String(form.title || "").trim();
    const typeNum = Number(form.errorType);

    // If title is empty, generate a default one
    if (!title) {
      const typeLabel = getErrorTypeLabel(typeNum);
      if (typeNum === 0) {
        title = `${typeLabel}: ${selectedPart?.partName || `Mã #${partId}`}`;
      } else {
        title = `${typeLabel}`;
      }
    }

    if (!productionId) {
      toast.error("Vui lòng chọn đơn sản xuất.");
      return;
    }
    if (!partId) {
      toast.error("Vui lòng chọn công đoạn tương ứng với loại lỗi.");
      return;
    }
    if (employees.length === 0 && !loadingEmployees) {
      toast.error("Công đoạn này chưa được phân công thợ, không thể báo cáo lỗi.");
      return;
    }
    if (!title) {
      const titleLabel = typeNum === 3 ? "mô tả chi tiết lỗi" : "tiêu đề lỗi";
      toast.error(`Vui lòng nhập ${titleLabel}.`);
      return;
    }
    const qtyRaw = String(form.quantity || "").trim();
    if (qtyRaw) {
      const qty = Number(qtyRaw);
      if (!Number.isFinite(qty) || qty < 0) {
        toast.error("Số lượng lỗi không hợp lệ.");
        return;
      }
      // Validate quantity against maxQuantity
      const maxQty = selectedPart?.maxQuantity ?? normalizedAssignment?.maxQuantity;
      if (maxQty !== null && qty > maxQty) {
        toast.error(`Số lượng lỗi (${qty}) không được vượt quá số lượng được giao (${maxQty}).`);
        return;
      }
    } else {
      setSubmitError("Vui lòng nhập số lượng lỗi.");
      return;
    }

    const assignedTo = Number(form.assignedTo);
    if (!assignedTo) {
      toast.error("Vui lòng chọn nhân viên liên quan.");
      return;
    }

    setIsConfirmModalOpen(true);
  };

  const handleConfirmSubmit = async () => {
    if (isSubmitting) return;
    setIsConfirmModalOpen(false);
    const productionId = String(form.productionId || "").trim();
    const partId = String(form.partId || "").trim();
    const qtyRaw = String(form.quantity || "").trim();
    const assignedTo = Number(form.assignedTo);
    const typeNum = Number(form.errorType);

    let title = String(form.title || "").trim();
    if (!title) {
      const typeLabel = getErrorTypeLabel(typeNum);
      title = typeNum === 0 ? `${typeLabel}: ${selectedPart?.partName || `Mã #${partId}`}` : typeLabel;
    }

    const priority = 2; // Default priority

    const storedUser = getStoredUser() || {};
    const createdBy = Number(storedUser?.userId ?? storedUser?.id ?? getAuthItem("userId"));
    if (!Number.isFinite(createdBy) || createdBy <= 0) {
      toast.error("Không xác định được người tạo báo lỗi. Vui lòng đăng nhập lại.");
      return;
    }

    try {
      setIsSubmitting(true);

      const formData = new FormData();
      formData.append("CreatedBy", String(createdBy));
      formData.append("AssignedTo", String(assignedTo));
      formData.append("Priority", String(priority));
      formData.append("TypeIssue", String(form.errorType));
      formData.append("Title", title);

      let fullDescription = form.description || "";
      if (form.errorType === 3 && form.otherErrorDetail?.trim()) {
        fullDescription += `\n(Chi tiết khác: ${form.otherErrorDetail.trim()})`;
      }
      if (form.colorName) fullDescription += `\n(Màu sắc: ${form.colorName})`;
      if (form.sizeName) fullDescription += `\n(Kích cỡ: ${form.sizeName})`;
      // No need to append time/worker to description anymore as they have fields

      if (fullDescription) formData.append("Description", fullDescription);

      if (qtyRaw) {
        formData.append("Quantity", String(Number(qtyRaw)));
      }

      const isoHappenAt = form.happenAt ? new Date(form.happenAt).toISOString() : new Date().toISOString();
      formData.append("OccurredAt", isoHappenAt);

      if (attachments.length > 0 && attachments[0]?.file) {
        formData.append("Image", attachments[0].file);
      }

      // API hoàn toàn dựa trên partOrderSizeId nếu có (ID 58), nếu không mới dùng ProductionPartId (ID 25)
      const finalId = form.partOrderSizeId || selectedPart?.partOrderSizeId || partId;

      await ProductionPartService.createIssue(Number(finalId), formData);

      resetFormAfterSubmit();
      toast.success("Gửi báo cáo lỗi thành công.");
      navigate(-1);
    } catch (error) {
      const data = error?.response?.data;
      let message = "Gửi báo cáo lỗi thất bại.";
      if (data?.errors) {
        message = Object.values(data.errors).flat().join(" | ");
      } else if (data?.detail) {
        message = data.detail;
      } else if (data?.title) {
        message = data.title;
      } else if (data?.message) {
        message = data.message;
      }
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentUser = getStoredUser();
  const roleValue = currentUser?.role ?? currentUser?.roles ?? currentUser?.roleName ?? "";
  const canReport = hasAnyRole(roleValue, ["Owner", "PM"]);

  const LayoutComponent = useMemo(() => {
    if (hasAnyRole(roleValue, ["Owner", "PM"])) return OwnerLayout;
    return WorkerLayout;
  }, [roleValue]);

  if (!canReport) {
    return (
      <LayoutComponent>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
          <AlertTriangle className="text-rose-500 mb-6 animate-bounce" size={64} />
          <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Truy cập bị giới hạn</h2>
          <p className="mt-2 text-sm font-medium max-w-md text-center">Chỉ có <strong>Chủ xưởng</strong> hoặc <strong>Quản lý (PM)</strong> mới có quyền báo cáo lỗi hỏng không thể sửa.</p>
          <button onClick={() => navigate(-1)} className="mt-8 h-12 px-8 rounded-xl bg-slate-900 text-white font-bold uppercase text-[10px] tracking-widest hover:bg-black transition-all active:scale-95 shadow-lg">Quay lại</button>
        </div>
      </LayoutComponent>
    );
  }

  return (
    <LayoutComponent>
      <div className="leave-page min-h-screen pb-20">
        <div className="leave-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="mt-1 rounded-xl border border-slate-200 p-2 text-slate-400 transition hover:bg-slate-50"
                aria-label="Quay lại"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Báo cáo lỗi (Không thể sửa)</h1>
                <p className="text-slate-600">Gửi báo cáo lỗi cho các sản phẩm hỏng không thể khắc phục.</p>
              </div>
            </div>
            <button
              type="submit"
              form="error-report-form"
              disabled={
                isSubmitting ||
                (form.partId && employees.length === 0 && !loadingEmployees)
              }
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send size={16} /> {isSubmitting ? "Đang gửi..." : "Gửi báo cáo"}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
            <form
              id="error-report-form"
              onSubmit={handleSubmit}
              className="rounded-xl border border-black bg-white p-5 shadow-sm"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500">Đơn sản xuất</label>
                  <select
                    value={form.productionId}
                    onChange={(event) => handleProductionChange(event.target.value)}
                    disabled={isProductionLocked}
                    className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none transition ${isProductionLocked
                      ? "bg-amber-50/50 border-amber-200 text-amber-900 cursor-not-allowed"
                      : "bg-slate-50 border-slate-200 focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10"
                      }`}
                  >
                    <option value="">Chọn đơn sản xuất...</option>
                    {productionOptions.map((item) => (
                      <option key={item.productionId} value={item.productionId}>
                        {`#PR-${item.productionId}${item.orderName ? ` - ${item.orderName}` : ""}`}
                      </option>
                    ))}
                  </select>
                  {loadingProductions && (
                    <div className="mt-1 text-xs text-slate-400">Đang tải đơn sản xuất...</div>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase text-slate-500">Công đoạn</label>
                  </div>
                  <select
                    value={form.partId}
                    onChange={(event) => handleChange("partId", event.target.value)}
                    disabled={!form.productionId || isPartLocked}
                    className={`mt-1.5 w-full rounded-xl border px-3 py-2 text-sm outline-none transition ${isPartLocked
                      ? "bg-amber-50/50 border-amber-200 text-amber-900 cursor-not-allowed font-bold"
                      : "bg-slate-50 border-slate-200 focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10"
                      }`}
                  >
                    <option value="">Chọn công đoạn...</option>
                    {parts.map((item) => (
                      <option key={item.id} value={item.id}>{item.partName || `Part #${item.id}`}</option>
                    ))}
                  </select>
                  {loadingParts && (
                    <div className="mt-1 text-xs text-slate-400">Đang tải công đoạn...</div>
                  )}
                  {!loadingParts && partsError && (
                    <div className="mt-1 text-xs text-rose-600">{partsError}</div>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <label className="text-xs font-semibold uppercase text-slate-500">Tiêu đề lỗi <span className="text-rose-500">*</span></label>
                <input
                  value={form.title}
                  onChange={(event) => handleChange("title", event.target.value)}
                  placeholder="Nhập tiêu đề ngắn gọn cho lỗi này..."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10"
                />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-1">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500">Số lượng lỗi <span className="text-rose-500">*</span></label>
                  <div className="relative mt-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.quantity}
                      onChange={(event) => handleChange("quantity", event.target.value)}
                      placeholder="Nhập số lượng lỗi..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10"
                    />
                    {(selectedPart?.maxQuantity ?? normalizedAssignment?.maxQuantity) !== null && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                        Tối đa: {selectedPart?.maxQuantity ?? normalizedAssignment?.maxQuantity}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500">Thợ làm lỗi<span className="text-rose-500">*</span></label>
                  <select
                    value={form.assignedTo}
                    onChange={(event) => handleChange("assignedTo", event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10"
                  >
                    <option value="">Chọn nhân viên...</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName}
                      </option>
                    ))}
                  </select>
                  {loadingEmployees && (
                    <div className="mt-1 text-xs text-slate-400">Đang tải danh sách nhân viên...</div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500">Thời gian phát sinh</label>
                  <input
                    type="datetime-local"
                    value={form.happenAt}
                    onChange={(event) => handleChange("happenAt", event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="text-xs font-semibold uppercase text-slate-500">Mô tả chi tiết</label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(event) => handleChange("description", event.target.value)}
                  placeholder="Mô tả lỗi, vị trí, nguyên nhân nghi ngờ..."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10"
                />
              </div>
              <div className="mt-4">
                <label className="text-xs font-semibold uppercase text-slate-500">Ảnh minh chứng</label>
                <div
                  className="mt-2 flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 transition hover:border-rose-200 hover:bg-rose-50/40"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onDrop={handleDrop}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                >
                  <ImagePlus size={18} className="text-slate-400" />
                  Kéo thả 1 ảnh minh chứng hoặc bấm để chọn
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => handleFiles(event.target.files)}
                />
                <p className="mt-1 text-[10px] text-slate-400 italic">Hệ thống hỗ trợ lưu tối đa 1 ảnh minh chứng cho mỗi báo cáo lỗi.</p>
                {attachments.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {attachments.map((item) => (
                      <div key={item.id} className="relative overflow-hidden rounded-xl border-2 border-rose-100 bg-white shadow-sm">
                        <img src={item.preview} alt={item.file.name} className="h-28 w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeAttachment(item.id)}
                          className="absolute right-1.5 top-1.5 rounded-full bg-rose-600 p-1 text-white shadow hover:bg-rose-700 transition-colors"
                          title="Gỡ bỏ"
                        >
                          <svg size={12} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {notice && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {notice}
                </div>
              )}
            </form>

            <div className="space-y-4">
              <div className="rounded-xl border border-black bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-slate-600 mb-3">
                  <Wrench size={16} />
                  <h2 className="text-xs font-bold uppercase tracking-widest">Thông tin công đoạn</h2>
                </div>
                {selectedPart ? (
                  <div className="space-y-2 text-sm text-slate-700">
                    <InfoItem label="Đơn sản xuất" value={`#PR-${selectedPart.productionId}`} />
                    <InfoItem label="Đơn hàng" value={selectedPart.orderName || "-"} />
                    <InfoItem label="Công đoạn" value={selectedPart.partName || "-"} />
                    <InfoItem label="Màu sắc" value={form.colorName || "-"} />
                    <InfoItem label="Size" value={form.sizeName || "-"} />
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">Chọn đơn sản xuất và công đoạn để xem thông tin.</div>
                )}
              </div>

              <div className="rounded-xl border border-black bg-white p-5 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-3">
                  Mẹo báo cáo nhanh
                </div>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>Ghi rõ vị trí lỗi và số lượng lỗi.</li>
                  <li>Đính kèm ảnh để tổ trưởng đánh giá nhanh.</li>
                  <li>Thông tin thợ làm lỗi sẽ giúp tổ trưởng theo dõi tốt hơn.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmSubmit}
        title="Xác nhận báo cáo lỗi"
        description={`Vui lòng kiểm tra lại thông tin: Đơn #${form.productionId}, Công đoạn: ${selectedPart?.partName}, Số lượng: ${form.quantity}, Nhân viên: ${form.repairWorker}.`}
        primaryLabel="Xác nhận gửi"
        variant="danger"
      />
    </LayoutComponent>
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
