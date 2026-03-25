import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, ImagePlus, Send, Wrench } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import OwnerLayout from "@/layouts/OwnerLayout";
import ProductionService from "@/services/ProductionService";
import ProductionPartService from "@/services/ProductionPartService";
import { getAuthItem, getStoredUser } from "@/lib/authStorage";
import "@/styles/homepage.css";
import "@/styles/leave.css";

const SEVERITIES = [
  { value: "low", label: "Thấp", priority: 1 },
  { value: "medium", label: "Trung bình", priority: 2 },
  { value: "high", label: "Cao", priority: 3 },
  { value: "critical", label: "Nghiêm trọng", priority: 4 },
];

const ERROR_TYPES = [
  { value: "process", label: "Lỗi công đoạn" },
  { value: "cutting", label: "Lỗi cắt" },
  { value: "sewing", label: "Lỗi may" },
  { value: "other", label: "Lỗi khác" },
];

const toList = (payload) => {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.list)) return payload.list;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload)) return payload;
  return [];
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
  startDate: part?.startDate ?? part?.planStartDate ?? "",
  endDate: part?.endDate ?? part?.planEndDate ?? "",
});

const getPriorityBySeverity = (severity) =>
  SEVERITIES.find((item) => item.value === severity)?.priority ?? 2;

const getErrorTypeLabel = (value) =>
  ERROR_TYPES.find((item) => item.value === value)?.label ?? value;

export default function WorkerErrorReport() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);

  const assignment = location.state?.assignment ?? null;
  const normalizedAssignment = useMemo(() => {
    if (!assignment) return null;
    return {
      partId: assignment?.partId ?? assignment?.id ?? "",
      productionId: assignment?.productionId ?? "",
      orderName: assignment?.orderName ?? "",
      partName: assignment?.partName ?? "",
      startDate: assignment?.startDate ?? "",
      endDate: assignment?.endDate ?? "",
      errorType: assignment?.errorType ?? "process",
      otherErrorDetail: assignment?.otherErrorDetail ?? "",
    };
  }, [assignment]);

  const [form, setForm] = useState({
    productionId: normalizedAssignment?.productionId
      ? String(normalizedAssignment.productionId)
      : "",
    partId: normalizedAssignment?.partId ? String(normalizedAssignment.partId) : "",
    errorType: normalizedAssignment?.errorType || "process",
    otherErrorDetail: normalizedAssignment?.otherErrorDetail || "",
    severity: "medium",
    title: "",
    description: "",
    quantity: "",
    happenAt: "",
    suggestion: "",
  });

  const [notice, setNotice] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [attachments, setAttachments] = useState([]);

  const [productions, setProductions] = useState([]);
  const [parts, setParts] = useState([]);
  const [loadingProductions, setLoadingProductions] = useState(false);
  const [loadingParts, setLoadingParts] = useState(false);
  const [partsError, setPartsError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      return;
    }

    const fallbackAssignedPart =
      normalizedAssignment?.partId &&
      normalizedAssignment?.productionId &&
      String(normalizedAssignment.productionId) === productionId
        ? {
            id: normalizedAssignment.partId,
            productionId,
            orderName: normalizedAssignment.orderName,
            partName: normalizedAssignment.partName,
            startDate: normalizedAssignment.startDate,
            endDate: normalizedAssignment.endDate,
          }
        : null;

    // When opened from plan detail with a fixed part, don't block the UI by part list API.
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
        setPartsError("");

        const response = await ProductionPartService.getPartsByProduction(productionId, {
          PageIndex: 0,
          PageSize: 200,
          SortColumn: "Name",
          SortOrder: "ASC",
        });

        if (!active) return;

        const payload = response?.data ?? response;
        const mappedParts = toList(payload).map((item) => mapPart(item, productionId));
        const hasAssignedPart = mappedParts.some(
          (item) => String(item.id ?? "") === String(normalizedAssignment?.partId ?? "")
        );

        if (fallbackAssignedPart && !hasAssignedPart) {
          mappedParts.unshift(fallbackAssignedPart);
        }

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
        if (active) setLoadingParts(false);
      }
    };

    fetchParts();

    return () => {
      active = false;
    };
  }, [form.productionId, normalizedAssignment, isPartLocked]);

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
        startDate: normalizedAssignment.startDate,
        endDate: normalizedAssignment.endDate,
      };
    }

    return null;
  }, [form.partId, parts, normalizedAssignment]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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

    const mapped = next.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      file,
      preview: URL.createObjectURL(file),
    }));

    setAttachments((prev) => [...prev, ...mapped]);
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

  const buildDescription = () => {
    const lines = [];

    if (form.description?.trim()) lines.push(form.description.trim());
    lines.push(`Loại lỗi: ${getErrorTypeLabel(form.errorType)}`);

    if (form.errorType === "other" && form.otherErrorDetail?.trim()) {
      lines.push(`Chi tiết lỗi khác: ${form.otherErrorDetail.trim()}`);
    }
    if (form.happenAt) lines.push(`Thời gian phát sinh: ${form.happenAt}`);
    if (form.suggestion?.trim()) lines.push(`Gợi ý xử lý: ${form.suggestion.trim()}`);

    return lines.join("\n");
  };

  const resetFormAfterSubmit = () => {
    setForm((prev) => ({
      ...prev,
      title: "",
      description: "",
      quantity: "",
      happenAt: "",
      suggestion: "",
      otherErrorDetail: "",
    }));

    attachments.forEach((item) => {
      if (item?.preview) URL.revokeObjectURL(item.preview);
    });
    setAttachments([]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setNotice("");
    setSubmitError("");

    const productionId = String(form.productionId || "").trim();
    const partId = String(form.partId || "").trim();
    const title = String(form.title || "").trim();

    if (!productionId) {
      setSubmitError("Vui lòng chọn đơn sản xuất.");
      return;
    }
    if (!partId) {
      setSubmitError("Vui lòng chọn công đoạn để báo lỗi.");
      return;
    }
    if (!title) {
      setSubmitError("Vui lòng nhập tiêu đề lỗi.");
      return;
    }

    const qtyRaw = String(form.quantity || "").trim();
    if (qtyRaw) {
      const qty = Number(qtyRaw);
      if (!Number.isFinite(qty) || qty < 0) {
        setSubmitError("Số lượng lỗi không hợp lệ.");
        return;
      }
    }

    const storedUser = getStoredUser() || {};
    const createdBy = Number(storedUser?.userId ?? storedUser?.id ?? getAuthItem("userId"));
    if (!Number.isFinite(createdBy) || createdBy <= 0) {
      setSubmitError("Không xác định được người tạo báo lỗi. Vui lòng đăng nhập lại.");
      return;
    }

    try {
      setIsSubmitting(true);

      const formData = new FormData();
      formData.append("CreatedBy", String(createdBy));
      formData.append("Priority", String(getPriorityBySeverity(form.severity)));
      formData.append("Title", title);

      const description = buildDescription();
      if (description) formData.append("Description", description);

      if (qtyRaw) {
        formData.append("Quantity", String(Number(qtyRaw)));
      }

      if (attachments.length > 0 && attachments[0]?.file) {
        formData.append("Image", attachments[0].file);
      }

      await ProductionPartService.createIssue(Number(partId), formData);

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
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <OwnerLayout>
      <div className="leave-page leave-list-page">
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
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Báo cáo lỗi công đoạn</h1>
                <p className="text-slate-600">Gửi sự cố trong quá trình sản xuất để tổ trưởng xử lý.</p>
              </div>
            </div>
            <button
              type="submit"
              form="error-report-form"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send size={16} /> {isSubmitting ? "Đang gửi..." : "Gửi báo cáo"}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
            <form
              id="error-report-form"
              onSubmit={handleSubmit}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500">Đơn sản xuất</label>
                  <select
                    value={form.productionId}
                    onChange={(event) => handleProductionChange(event.target.value)}
                    disabled={isProductionLocked}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10"
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
                  <label className="text-xs font-semibold uppercase text-slate-500">Mức độ</label>
                  <select
                    value={form.severity}
                    onChange={(event) => handleChange("severity", event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10"
                  >
                    {SEVERITIES.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold uppercase text-slate-500">Công đoạn</label>
                  <select
                    value={form.partId}
                    onChange={(event) => handleChange("partId", event.target.value)}
                    disabled={!form.productionId || isPartLocked}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10"
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

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold uppercase text-slate-500">Loại lỗi</label>
                  <select
                    value={form.errorType}
                    onChange={(event) => handleChange("errorType", event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10"
                  >
                    {ERROR_TYPES.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                  {form.errorType === "other" && (
                    <div className="mt-3">
                      <label className="text-xs font-semibold uppercase text-slate-500">Thông tin lỗi khác</label>
                      <input
                        value={form.otherErrorDetail}
                        onChange={(event) => handleChange("otherErrorDetail", event.target.value)}
                        placeholder="Nhập thông tin lỗi khác..."
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500">Số lượng lỗi</label>
                  <input
                    value={form.quantity}
                    onChange={(event) => handleChange("quantity", event.target.value)}
                    placeholder="Ví dụ: 12"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10"
                  />
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
                <label className="text-xs font-semibold uppercase text-slate-500">Tiêu đề lỗi</label>
                <input
                  value={form.title}
                  onChange={(event) => handleChange("title", event.target.value)}
                  placeholder="Ví dụ: Lỗi lệch đường may cổ"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10"
                />
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

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500">Gợi ý xử lý</label>
                  <input
                    value={form.suggestion}
                    onChange={(event) => handleChange("suggestion", event.target.value)}
                    placeholder="Ví dụ: kiểm tra lại máy may"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10"
                  />
                </div>
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
                  Kéo thả ảnh hoặc bấm để tải lên
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(event) => handleFiles(event.target.files)}
                />
                {attachments.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {attachments.map((item) => (
                      <div key={item.id} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <img src={item.preview} alt={item.file.name} className="h-28 w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeAttachment(item.id)}
                          className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-slate-600 shadow hover:text-rose-600"
                        >
                          Xóa
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {submitError && (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {submitError}
                </div>
              )}

              {notice && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {notice}
                </div>
              )}
            </form>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-slate-600 mb-3">
                  <Wrench size={16} />
                  <h2 className="text-xs font-bold uppercase tracking-widest">Thông tin công đoạn</h2>
                </div>
                {selectedPart ? (
                  <div className="space-y-2 text-sm text-slate-700">
                    <InfoItem label="Part ID" value={selectedPart.id} />
                    <InfoItem label="Đơn sản xuất" value={`#PR-${selectedPart.productionId}`} />
                    <InfoItem label="Đơn hàng" value={selectedPart.orderName || "-"} />
                    <InfoItem label="Công đoạn" value={selectedPart.partName || "-"} />
                    <InfoItem label="Bắt đầu" value={selectedPart.startDate || "-"} />
                    <InfoItem label="Kết thúc" value={selectedPart.endDate || "-"} />
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">Chọn đơn sản xuất và công đoạn để xem thông tin.</div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-3">
                  Mẹo báo cáo nhanh
                </div>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>Ghi rõ vị trí lỗi và số lượng lỗi.</li>
                  <li>Đính kèm ảnh để tổ trưởng đánh giá nhanh.</li>
                  <li>Chọn mức độ nghiêm trọng đúng thực tế.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
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
