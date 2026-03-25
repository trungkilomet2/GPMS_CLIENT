import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ClipboardCheck, Eraser, Plus, Save } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import OwnerLayout from "@/layouts/OwnerLayout";
import ProductionService from "@/services/ProductionService";
import CuttingNotebookService from "@/services/CuttingNotebookService";
import "@/styles/homepage.css";
import "@/styles/leave.css";

const DEFAULT_RECORD = {
  color: "",
  meterPerKg: "",
  layer: "",
  productQty: "",
  avgConsumption: "",
  dateCreate: "",
  note: "",
};

const DEFAULT_META = {
  productionId: "",
  markerLength: "",
  fabricWidth: "",
};

const getProductionId = (item) => item?.productionId ?? item?.id ?? "";
const getProductionName = (item) =>
  item?.order?.orderName || item?.orderName || item?.name || "";

const hasValue = (value) =>
  value !== null && value !== undefined && String(value).trim() !== "";

const mapNotebookFromProduction = (production) => {
  const notebook =
    production?.cuttingNotebook ??
    production?.notebook ??
    production?.cuttingBook ??
    null;
  const notebookId =
    notebook?.id ??
    production?.cuttingNotebookId ??
    production?.notebookId ??
    production?.cuttingBookId ??
    null;
  const markerLength =
    notebook?.markerLength ??
    production?.markerLength ??
    production?.notebookMarkerLength ??
    "";
  const fabricWidth =
    notebook?.fabricWidth ??
    production?.fabricWidth ??
    production?.notebookFabricWidth ??
    "";
  const logs =
    notebook?.logs ??
    production?.cuttingNotebookLogs ??
    production?.notebookLogs ??
    production?.logs ??
    [];
  const hasNotebookFlag =
    production?.hasCuttingNotebook ??
    production?.isCuttingNotebookCreated ??
    production?.cuttingNotebookExists ??
    production?.notebookExists ??
    false;

  return {
    notebookId,
    markerLength: hasValue(markerLength) ? String(markerLength) : "",
    fabricWidth: hasValue(fabricWidth) ? String(fabricWidth) : "",
    logs: Array.isArray(logs) ? logs : [],
    hasNotebook:
      Boolean(hasNotebookFlag) ||
      hasValue(notebookId) ||
      hasValue(markerLength) ||
      hasValue(fabricWidth) ||
      (Array.isArray(logs) && logs.length > 0),
  };
};

const mapProductionToBook = (production, existingBook) => {
  const productionId = String(getProductionId(production) || "");
  const notebookFromApi = mapNotebookFromProduction(production);
  const baseMeta = existingBook?.meta || DEFAULT_META;
  const recordsFromExisting = Array.isArray(existingBook?.records)
    ? existingBook.records
    : [];
  const recordsFromApi = Array.isArray(notebookFromApi.logs)
    ? notebookFromApi.logs
    : [];
  const records =
    recordsFromExisting.length > 0 ? recordsFromExisting : recordsFromApi;

  return {
    productionId,
    notebookId: existingBook?.notebookId ?? notebookFromApi.notebookId ?? null,
    hasNotebook:
      Boolean(existingBook?.hasNotebook) ||
      notebookFromApi.hasNotebook ||
      records.length > 0,
    meta: {
      ...baseMeta,
      productionId,
      productionName: getProductionName(production) || baseMeta.productionName || "",
      markerLength:
        notebookFromApi.markerLength || baseMeta.markerLength || "",
      fabricWidth:
        notebookFromApi.fabricWidth || baseMeta.fabricWidth || "",
    },
    records,
    updatedAt: existingBook?.updatedAt || null,
  };
};

const extractDataList = (payload) => {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
};

const mapNotebookLogToRecord = (log) => ({
  id: log?.id ?? Date.now().toString(36),
  color: log?.color ?? "",
  meterPerKg: hasValue(log?.meterPerKg) ? String(log.meterPerKg) : "",
  layer: hasValue(log?.layer) ? String(log.layer) : "",
  productQty: hasValue(log?.productQty) ? String(log.productQty) : "",
  avgConsumption: hasValue(log?.avgConsumption) ? String(log.avgConsumption) : "",
  dateCreate: log?.dateCreate || "",
  note: log?.note || "",
});

const areRecordsEqual = (a = [], b = []) => {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i] || {};
    const y = b[i] || {};
    if (
      String(x.id ?? "") !== String(y.id ?? "") ||
      String(x.color ?? "") !== String(y.color ?? "") ||
      String(x.meterPerKg ?? "") !== String(y.meterPerKg ?? "") ||
      String(x.layer ?? "") !== String(y.layer ?? "") ||
      String(x.productQty ?? "") !== String(y.productQty ?? "") ||
      String(x.avgConsumption ?? "") !== String(y.avgConsumption ?? "") ||
      String(x.dateCreate ?? "") !== String(y.dateCreate ?? "") ||
      String(x.note ?? "") !== String(y.note ?? "")
    ) {
      return false;
    }
  }
  return true;
};

const areMetaEqual = (a = {}, b = {}) =>
  String(a?.productionId ?? "") === String(b?.productionId ?? "") &&
  String(a?.productionName ?? "") === String(b?.productionName ?? "") &&
  String(a?.markerLength ?? "") === String(b?.markerLength ?? "") &&
  String(a?.fabricWidth ?? "") === String(b?.fabricWidth ?? "");

const calcTotalLayers = (records) =>
  records.reduce((sum, item) => sum + (Number(item.layer) || 0), 0);

const getTodayString = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const formatProductionOption = (production) => {
  const id = String(getProductionId(production));
  const name = getProductionName(production);
  return name ? `${id} · ${name}` : id;
};

const PAGE_SIZE = 6;

export default function WorkerCuttingBook() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationOpenMode = useMemo(() => {
    const raw = location?.state?.openCuttingBookMode;
    if (raw === "create" || raw === "detail") return raw;
    return "auto";
  }, [location]);
  const locationProductionId = useMemo(() => {
    const raw =
      location?.state?.productionId ??
      location?.state?.production?.productionId ??
      location?.state?.production?.id ??
      "";
    return String(raw || "").trim();
  }, [location]);
  const isCreateOnlyMode = locationOpenMode === "create" && Boolean(locationProductionId);
  const [books, setBooks] = useState([]);
  const [selectedProductionId, setSelectedProductionId] = useState(null);
  const [meta, setMeta] = useState(DEFAULT_META);
  const [record, setRecord] = useState(DEFAULT_RECORD);
  const [savedAt, setSavedAt] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newBook, setNewBook] = useState(DEFAULT_META);
  const [collapseMeta, setCollapseMeta] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [recordErrors, setRecordErrors] = useState({});
  const [page, setPage] = useState(1);
  const [productions, setProductions] = useState([]);
  const [productionError, setProductionError] = useState("");
  const [productionLoading, setProductionLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const booksRef = useRef([]);

  useEffect(() => {
    booksRef.current = books;
  }, [books]);

  useEffect(() => {
    if (!Array.isArray(productions) || productions.length === 0) {
      setBooks([]);
      return;
    }
    setBooks((prev) => {
      const prevMap = new Map(
        prev.map((book) => [String(book.productionId), book])
      );
      return productions
        .map((item) => {
          const productionId = String(getProductionId(item) || "");
          if (!productionId) return null;
          return mapProductionToBook(item, prevMap.get(productionId));
        })
        .filter(Boolean);
    });
  }, [productions]);

  useEffect(() => {
    if (!locationProductionId) return;
    if (productionLoading) return;
    let active = true;

    const applyMode = async () => {
      const matched = booksRef.current.find(
        (book) => String(book.productionId) === locationProductionId
      );
      let notebookFromApi = null;
      let logRecords = [];

      const needFetchNotebook =
        !matched?.hasNotebook ||
        !matched?.notebookId;

      if (needFetchNotebook) {
        try {
          const notebookRes = await CuttingNotebookService.getByProduction(locationProductionId);
          if (!active) return;
          const payload = notebookRes?.data ?? notebookRes ?? {};
          const notebookList = extractDataList(payload);
          notebookFromApi = notebookList[0] || null;

          if (notebookFromApi?.id) {
            const logsRes = await CuttingNotebookService.getListLogs(notebookFromApi.id).catch(() => null);
            if (!active) return;
            const logsPayload = logsRes?.data ?? logsRes ?? {};
            const logs = extractDataList(logsPayload);
            logRecords = logs.map(mapNotebookLogToRecord);
          }
        } catch {
          notebookFromApi = null;
        }
      }

      const resolvedNotebookId = matched?.notebookId ?? notebookFromApi?.id ?? null;
      const hasNotebook = Boolean(matched?.hasNotebook || resolvedNotebookId);
      const shouldOpenCreate =
        !hasNotebook &&
        (locationOpenMode === "create" || locationOpenMode === "auto");

      if (shouldOpenCreate) {
        const createMeta = { ...DEFAULT_META, productionId: locationProductionId };
        setSelectedProductionId((prev) => (prev === null ? prev : null));
        setMeta((prev) => (areMetaEqual(prev, createMeta) ? prev : createMeta));
        setShowCreate((prev) => (prev ? prev : true));
        setIsEditing(false);
        setNewBook((prev) =>
          String(prev?.productionId ?? "") === locationProductionId
            ? prev
            : { ...prev, productionId: locationProductionId }
        );
        return;
      }

      const mergedMeta = {
        ...(matched?.meta || DEFAULT_META),
        productionId: locationProductionId,
      };
      if (notebookFromApi) {
        mergedMeta.markerLength = String(notebookFromApi.markerLength ?? mergedMeta.markerLength ?? "");
        mergedMeta.fabricWidth = String(notebookFromApi.fabricWidth ?? mergedMeta.fabricWidth ?? "");
      }

      setSelectedProductionId((prev) =>
        String(prev ?? "") === locationProductionId ? prev : locationProductionId
      );
      setMeta((prev) => (areMetaEqual(prev, mergedMeta) ? prev : mergedMeta));
      setNewBook((prev) =>
        String(prev?.productionId ?? "") === locationProductionId
          ? prev
          : { ...prev, productionId: locationProductionId }
      );
      setShowCreate((prev) => (prev ? false : prev));
      setIsEditing(false);

      if (
        needFetchNotebook &&
        (resolvedNotebookId || logRecords.length > 0 || notebookFromApi)
      ) {
        setBooks((prev) => {
          let changed = false;
          const next = prev.map((book) => {
            if (String(book.productionId) !== locationProductionId) return book;

            const nextNotebookId = resolvedNotebookId ?? book.notebookId ?? null;
            const nextMarkerLength = String(
              notebookFromApi?.markerLength ?? book?.meta?.markerLength ?? ""
            );
            const nextFabricWidth = String(
              notebookFromApi?.fabricWidth ?? book?.meta?.fabricWidth ?? ""
            );
            const nextRecords = logRecords.length > 0 ? logRecords : (book.records || []);
            const nextMeta = {
              ...book.meta,
              productionId: locationProductionId,
              markerLength: nextMarkerLength,
              fabricWidth: nextFabricWidth,
            };
            const same =
              Boolean(book.hasNotebook) === true &&
              String(book.notebookId ?? "") === String(nextNotebookId ?? "") &&
              areMetaEqual(book.meta, nextMeta) &&
              areRecordsEqual(book.records || [], nextRecords);

            if (same) return book;
            changed = true;
            return {
              ...book,
              hasNotebook: true,
              notebookId: nextNotebookId,
              meta: nextMeta,
              records: nextRecords,
            };
          });
          return changed ? next : prev;
        });
      }
    };

    applyMode();
    return () => {
      active = false;
    };
  }, [books.length, locationOpenMode, locationProductionId, productionLoading]);

  useEffect(() => {
    let active = true;
    const fetchProductions = async () => {
      try {
        setProductionLoading(true);
        setProductionError("");
        const allItems = [];
        const seenKeys = new Set();
        let pageIndex = 0;
        let recordCount = null;
        const pageSizeFetch = 50;
        const maxPages = 200;

        while (pageIndex < maxPages) {
          const response = await ProductionService.getProductionList({
            PageIndex: pageIndex,
            PageSize: pageSizeFetch,
            SortColumn: "Name",
            SortOrder: "ASC",
          });
          if (!active) return;
          const payload = response?.data ?? response;
          const list = Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload)
              ? payload
              : [];

          let added = 0;
          list.forEach((item) => {
            const key = getProductionId(item) ?? JSON.stringify(item);
            if (seenKeys.has(key)) return;
            seenKeys.add(key);
            allItems.push(item);
            added += 1;
          });

          if (recordCount == null) {
            const reported = Number(payload?.recordCount ?? payload?.totalCount ?? 0);
            recordCount = Number.isFinite(reported) && reported > 0 ? reported : null;
            if (recordCount != null && recordCount <= list.length) {
              recordCount = null;
            }
          }

          if (list.length === 0) break;
          if (added === 0) break;
          if (recordCount != null && allItems.length >= recordCount) break;
          if (list.length < pageSizeFetch) break;
          pageIndex += 1;
        }

        setProductions(allItems);
      } catch (_err) {
        if (!active) return;
        setProductionError("Không thể tải danh sách đơn sản xuất.");
        setProductions([]);
      } finally {
        if (active) setProductionLoading(false);
      }
    };

    fetchProductions();
    return () => {
      active = false;
    };
  }, []);

  const productionMap = useMemo(() => {
    const map = new Map();
    productions.forEach((item) => {
      const key = String(getProductionId(item));
      if (!key) return;
      map.set(key, item);
    });
    return map;
  }, [productions]);

  const currentBook = useMemo(
    () => books.find((book) => String(book.productionId) === String(selectedProductionId)) || null,
    [books, selectedProductionId]
  );

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(books.length / PAGE_SIZE)),
    [books.length]
  );

  const pagedBooks = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return books.slice(start, start + PAGE_SIZE);
  }, [books, page]);

  const totalLayers = useMemo(
    () => (currentBook ? calcTotalLayers(currentBook.records || []) : 0),
    [currentBook]
  );

  const updateMeta = (key, value) => {
    setMeta((prev) => ({ ...prev, [key]: value }));
  };

  const updateNewBook = (key, value) => {
    setNewBook((prev) => ({ ...prev, [key]: value }));
    if (key === "productionId") {
      setCreateError("");
    }
  };

  const updateRecord = (key, value) => {
    setRecord((prev) => ({ ...prev, [key]: value }));
    if (recordErrors[key]) {
      setRecordErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const clearRecord = () => {
    setRecord(DEFAULT_RECORD);
    setEditingRecordId(null);
    setRecordErrors({});
  };

  const validateRecord = (value) => {
    const nextErrors = {};
    const numberFields = [
      ["meterPerKg", "Số m/kg"],
      ["layer", "Số lớp"],
      ["productQty", "Sản phẩm"],
      ["avgConsumption", "Định mức TB"],
    ];

    if (!value.color?.trim()) nextErrors.color = "Vui lòng nhập màu.";
    numberFields.forEach(([key, label]) => {
      const raw = String(value[key] ?? "").trim();
      if (!raw) {
        nextErrors[key] = `Vui lòng nhập ${label.toLowerCase()}.`;
        return;
      }
      const num = Number(raw);
      if (!Number.isFinite(num) || num <= 0) {
        nextErrors[key] = `${label} phải là số > 0.`;
      }
    });
    return nextErrors;
  };

  const [isSavingRecord, setIsSavingRecord] = useState(false);

  const resolveNotebookByProduction = async (productionKey) => {
    const notebookRes = await CuttingNotebookService.getByProduction(productionKey);
    const payload = notebookRes?.data ?? notebookRes ?? {};
    const notebookList = extractDataList(payload);
    const notebook = notebookList[0] || null;
    if (!notebook?.id) return null;

    const logsRes = await CuttingNotebookService.getListLogs(notebook.id).catch(() => null);
    const logsPayload = logsRes?.data ?? logsRes ?? {};
    const logs = extractDataList(logsPayload).map(mapNotebookLogToRecord);

    setBooks((prev) =>
      prev.map((book) => {
        if (String(book.productionId) !== String(productionKey)) return book;
        return {
          ...book,
          hasNotebook: true,
          notebookId: notebook.id,
          meta: {
            ...book.meta,
            productionId: String(productionKey),
            markerLength: String(notebook.markerLength ?? book?.meta?.markerLength ?? ""),
            fabricWidth: String(notebook.fabricWidth ?? book?.meta?.fabricWidth ?? ""),
          },
          records: logs.length > 0 ? logs : (book.records || []),
        };
      })
    );

    return notebook;
  };

  const saveRecord = async () => {
    const nextErrors = validateRecord(record);
    if (Object.keys(nextErrors).length > 0) {
      setRecordErrors(nextErrors);
      return false;
    }

    try {
      setIsSavingRecord(true);
      const productionKey = String(meta.productionId || "UNASSIGNED");
      if (productionKey === "UNASSIGNED") {
        setRecordErrors({ submit: "Vui lòng chọn hoặc tạo sổ cắt trước khi lưu." });
        setIsSavingRecord(false);
        return false;
      }

      const storedUserId = localStorage.getItem("userId");
      const payload = {
        userId: Number(storedUserId) || 1,
        color: String(record.color || ""),
        meterPerKg: Number(record.meterPerKg || 0),
        layer: Number(record.layer || 0),
        productQty: Number(record.productQty || 0),
        avgConsumption: Number(record.avgConsumption || 0),
        note: String(record.note || "")
      };

      let notebookId =
        books.find((book) => String(book.productionId) === productionKey)?.notebookId ?? null;

      if (!notebookId) {
        const notebook = await resolveNotebookByProduction(productionKey).catch(() => null);
        notebookId = notebook?.id ?? null;
      }

      if (!notebookId) {
        setRecordErrors({ submit: "Sổ cắt không tồn tại. Vui lòng tạo sổ cắt trước khi thêm dòng." });
        return false;
      }

      let createRes = null;
      try {
        createRes = await CuttingNotebookService.createLog(notebookId, payload);
      } catch (firstError) {
        if (firstError?.response?.status === 400) {
          const refreshedNotebook = await resolveNotebookByProduction(productionKey).catch(() => null);
          const refreshedNotebookId = refreshedNotebook?.id ?? null;
          if (refreshedNotebookId && String(refreshedNotebookId) !== String(notebookId)) {
            notebookId = refreshedNotebookId;
            createRes = await CuttingNotebookService.createLog(notebookId, payload);
          } else {
            throw firstError;
          }
        } else {
          throw firstError;
        }
      }
      const createdLog = createRes?.data?.data ?? null;
      const createdRecord = createdLog
        ? mapNotebookLogToRecord(createdLog)
        : {
          id: editingRecordId || Date.now().toString(36),
          ...record,
          dateCreate: record.dateCreate || getTodayString(),
        };

      setBooks((prev) => {
        let found = false;
        const next = prev.map((book) => {
          if (String(book.productionId) !== productionKey) return book;
          found = true;

          let nextRecords = Array.isArray(book.records) ? [...book.records] : [];
          if (editingRecordId) {
            let replaced = false;
            nextRecords = nextRecords.map((item) => {
              if (String(item.id) !== String(editingRecordId)) return item;
              replaced = true;
              return { ...item, ...createdRecord, id: item.id };
            });
            if (!replaced) {
              nextRecords.push(createdRecord);
            }
          } else {
            nextRecords.push(createdRecord);
          }

          return {
            ...book,
            hasNotebook: true,
            notebookId,
            meta: {
              ...book.meta,
              ...meta,
              productionId: productionKey,
            },
            records: nextRecords,
            updatedAt: new Date().toISOString(),
          };
        });

        if (found) return next;
        return [
          ...next,
          {
            productionId: productionKey,
            hasNotebook: true,
            notebookId,
            meta: {
              ...meta,
              productionId: productionKey,
            },
            records: [createdRecord],
            updatedAt: new Date().toISOString(),
          },
        ];
      });

      setSelectedProductionId(productionKey);
      clearRecord();
      setSavedAt(new Date().toLocaleString("vi-VN"));
      return true;
    } catch (error) {
      console.error("LỖI TỪ SERVER:", JSON.stringify(error?.response?.data || error.message));
      let errMsg = "Lưu dòng thất bại.";
      const data = error?.response?.data;

      if (data) {
        if (data.errors) {
          errMsg = Object.values(data.errors).flat().join(" | ");
        } else if (data.title) {
          errMsg = data.title;
        } else if (data.message) {
          errMsg = data.message;
        } else if (typeof data === 'string') {
          errMsg = data;
        } else {
          errMsg = JSON.stringify(data);
        }
      }
      setRecordErrors({ submit: `Lỗi server: ${errMsg}` });
      return false;
    } finally {
      setIsSavingRecord(false);
    }
  };

  const openDetail = (productionId) => {
    const book = books.find((item) => String(item.productionId) === String(productionId));
    if (book) {
      setMeta(book.meta || DEFAULT_META);
      setSelectedProductionId(book.productionId);
      setIsEditing(false);
    }
  };

  const handleToggleMetaEdit = () => {
    if (!selectedProductionId) return;
    if (isEditing) {
      setBooks((prev) =>
        prev.map((book) => {
          if (String(book.productionId) !== String(selectedProductionId)) return book;
          return {
            ...book,
            meta: {
              ...book.meta,
              ...meta,
              productionId: String(selectedProductionId),
            },
            updatedAt: new Date().toISOString(),
          };
        })
      );
      toast.info("Backend chưa hỗ trợ API cập nhật thông tin sổ cắt. Đã lưu tạm trên giao diện.");
    }
    setIsEditing((prev) => !prev);
  };

  const resetToList = () => {
    setSelectedProductionId(null);
    setMeta(DEFAULT_META);
    setRecord(DEFAULT_RECORD);
    setEditingRecordId(null);
    setIsEditing(false);
  };

  const openCreateRecord = () => {
    setEditingRecordId(null);
    setRecord(DEFAULT_RECORD);
    setRecordErrors({});
    setIsEditing(true);
    setShowEntryModal(true);
  };

  const openEditRecord = (item) => {
    setEditingRecordId(item.id);
    setRecord({
      color: item.color || "",
      meterPerKg: item.meterPerKg || "",
      layer: item.layer || "",
      productQty: item.productQty || "",
      avgConsumption: item.avgConsumption || "",
      dateCreate: item.dateCreate || "",
      note: item.note || "",
    });
    setRecordErrors({});
    setIsEditing(true);
    setShowEntryModal(true);
  };

  const confirmDeleteRecord = (recordId) => {
    if (!currentBook) return;
    setConfirmDeleteId(recordId);
  };

  const deleteRecord = () => {
    if (!currentBook || !confirmDeleteId) return;
    const productionKey = String(currentBook.productionId);
    const nextBooks = books.map((book) => {
      if (String(book.productionId) !== productionKey) return book;
      return {
        ...book,
        records: (book.records || []).filter((item) => String(item.id) !== String(confirmDeleteId)),
        updatedAt: new Date().toISOString(),
      };
    });
    setBooks(nextBooks);
    setConfirmDeleteId(null);
  };

  const [creatingBook, setCreatingBook] = useState(false);

  const createBook = async () => {
    const productionKey = String(
      (isCreateOnlyMode ? locationProductionId : newBook.productionId) || ""
    ).trim();
    if (!productionKey) {
      setCreateError("Vui lòng chọn một đơn sản xuất có sẵn.");
      return;
    }
    if (!isCreateOnlyMode && !productionMap.has(productionKey)) {
      setCreateError("Đơn sản xuất không tồn tại trong hệ thống. Vui lòng chọn lại.");
      return;
    }

    try {
      setCreatingBook(true);
      setCreateError("");
      const existingRes = await CuttingNotebookService.getByProduction(productionKey).catch(() => null);
      const existingPayload = existingRes?.data ?? existingRes ?? {};
      const existingList = Array.isArray(existingPayload?.data)
        ? existingPayload.data
        : Array.isArray(existingPayload)
          ? existingPayload
          : [];
      if (existingList.length > 0) {
        const existingNotebook = existingList[0];
        const selectedProduction =
          productionMap.get(productionKey) || location?.state?.production || null;
        setBooks((prev) =>
          prev.map((book) => {
            if (String(book.productionId) !== productionKey) return book;
            return {
              ...book,
              hasNotebook: true,
              notebookId: existingNotebook?.id ?? book.notebookId ?? null,
              meta: {
                ...book.meta,
                productionId: productionKey,
                markerLength: String(existingNotebook?.markerLength ?? book?.meta?.markerLength ?? ""),
                fabricWidth: String(existingNotebook?.fabricWidth ?? book?.meta?.fabricWidth ?? ""),
                productionName:
                  getProductionName(selectedProduction) || book?.meta?.productionName || "",
              },
            };
          })
        );
        setShowCreate(false);
        setSelectedProductionId(productionKey);
        toast.info("Sổ cắt đã tồn tại. Hệ thống chuyển sang trang chi tiết.");
        navigate("/worker/cutting-book", {
          replace: true,
          state: {
            productionId: productionKey,
            production: selectedProduction,
            openCuttingBookMode: "detail",
          },
        });
        return;
      }
      const payload = {
        productionId: Number(productionKey),
        markerLength: Number(newBook.markerLength || 0),
        fabricWidth: Number(newBook.fabricWidth || 0),
      };

      await CuttingNotebookService.createNotebook(payload);

      const selectedProduction =
        productionMap.get(productionKey) || location?.state?.production || null;
      setBooks((prev) =>
        prev.map((book) => {
          if (String(book.productionId) !== productionKey) return book;
          return {
            ...book,
            hasNotebook: true,
            notebookId: book.notebookId ?? productionKey,
            meta: {
              ...book.meta,
              ...newBook,
              productionId: productionKey,
              productionName: getProductionName(selectedProduction) || newBook.productionName || "",
            },
            updatedAt: new Date().toISOString(),
          };
        })
      );
      setPage(1);
      setNewBook(DEFAULT_META);
      setShowCreate(false);
      setSelectedProductionId(productionKey);
      toast.success("Tạo sổ cắt thành công!");
      navigate("/worker/cutting-book", {
        replace: true,
        state: {
          productionId: productionKey,
          production: selectedProduction || location?.state?.production || null,
          openCuttingBookMode: "detail",
        },
      });
    } catch (error) {
      console.error(error);
      let errMsg = "Tạo sổ cắt thất bại.";
      const data = error?.response?.data;
      if (data?.errors) errMsg = Object.values(data.errors).flat().join(" | ");
      else if (data?.message) errMsg = data.message;
      else if (typeof data === 'string' && data) errMsg = data;
      setCreateError(`Lỗi server: ${errMsg}`);
    } finally {
      setCreatingBook(false);
    }
  };

  return (
    <OwnerLayout>
      <div className="leave-page leave-list-page">
        <div className="leave-shell mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
                aria-label="Quay lại"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Sổ cắt</h1>
                <p className="text-slate-600">
                  {selectedProductionId
                    ? `Chi tiết sổ cắt cho đơn hàng #${selectedProductionId}`
                    : "Danh sách sổ cắt đã lưu theo đơn hàng."}
                </p>
              </div>
            </div>
            {selectedProductionId && (
              <button
                type="button"
                onClick={handleToggleMetaEdit}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${isEditing
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
              >
                {isEditing ? "Lưu chỉnh sửa" : "Chỉnh sửa"}
              </button>
            )}
          </div>

          {!selectedProductionId && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">
                      {isCreateOnlyMode
                        ? `Tạo sổ cắt cho đơn hàng #${locationProductionId}`
                        : "Tạo sổ cắt mới"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {isCreateOnlyMode
                        ? "Chưa có sổ cắt. Vui lòng nhập thông tin và tạo sổ trước khi thao tác tiếp."
                        : "Nhập thông tin cơ bản trước khi ghi dòng."}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isCreateOnlyMode && (
                      <button
                        type="button"
                        onClick={() => setShowCreate((prev) => !prev)}
                        className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                      >
                        <Plus size={14} /> {showCreate ? "Thu gọn" : "Tạo sổ cắt"}
                      </button>
                    )}
                  </div>
                </div>
                {(showCreate || isCreateOnlyMode) && (
                  <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr_1fr]">
                    {isCreateOnlyMode ? (
                      <Field
                        label="Mã kế hoạch/đơn sản xuất"
                        value={locationProductionId}
                        onChange={() => { }}
                        disabled
                      />
                    ) : (
                      <SuggestSelect
                        label="Mã kế hoạch/đơn sản xuất"
                        value={newBook.productionId}
                        onChange={(v) => updateNewBook("productionId", v)}
                        options={productions.map((item) => ({
                          value: String(getProductionId(item)),
                          label: formatProductionOption(item),
                        }))}
                        placeholder="Nhập hoặc chọn mã kế hoạch"
                      />
                    )}
                    {productionLoading && !productionError && (
                      <div className="lg:col-span-3 text-xs text-slate-400">
                        Đang tải danh sách đơn sản xuất...
                      </div>
                    )}
                    {productionError && (
                      <div className="lg:col-span-3 text-xs text-amber-600">
                        {productionError}
                      </div>
                    )}
                    {createError && (
                      <div className="lg:col-span-3 text-xs text-red-600">
                        {createError}
                      </div>
                    )}
                    <Field
                      label="Chiều dài sơ đồ (m)"
                      value={newBook.markerLength}
                      onChange={(v) => updateNewBook("markerLength", v)}
                    />
                    <Field
                      label="Khổ vải (cm)"
                      value={newBook.fabricWidth}
                      onChange={(v) => updateNewBook("fabricWidth", v)}
                    />
                    <div className="lg:col-span-3 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={createBook}
                        disabled={creatingBook}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:bg-emerald-400"
                      >
                        <Save size={16} /> {creatingBook ? "Đang tạo..." : "Tạo sổ cắt"}
                      </button>
                      <div className="text-xs text-slate-400">
                        Bắt buộc nhập Mã kế hoạch/đơn sản xuất để tạo sổ cắt.
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {!isCreateOnlyMode &&
                (books.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
                    Chưa có sổ cắt nào được lưu.
                  </div>
                ) : (
                  <>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-2 text-slate-600 mb-4">
                        <ClipboardCheck size={16} />
                        <h2 className="text-xs font-bold uppercase tracking-widest">Danh sách sổ cắt</h2>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full divide-y divide-slate-200 table-fixed text-sm">
                          <thead className="leave-table-head">
                            <tr>
                              <th className="leave-table-th w-14 px-3 py-3 text-center">STT</th>
                              <th className="leave-table-th w-32 px-3 py-3 text-left">Đơn sản xuất</th>
                              <th className="leave-table-th w-48 px-3 py-3 text-left">Đơn hàng</th>
                              <th className="leave-table-th w-28 px-3 py-3 text-center">Dòng đã lưu</th>
                              <th className="leave-table-th w-28 px-3 py-3 text-center">Tổng số lớp</th>
                              <th className="leave-table-th w-28 px-3 py-3 text-center">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {pagedBooks.map((book, index) => (
                              <tr key={book.productionId} className="leave-table-row hover:bg-slate-50/80">
                                <td className="px-3 py-2 text-center">
                                  {(page - 1) * PAGE_SIZE + index + 1}
                                </td>
                                <td className="px-3 py-2 font-semibold text-emerald-700">
                                  #{book.productionId}
                                </td>
                                <td className="px-3 py-2 text-slate-700">
                                  {getProductionName(productionMap.get(String(book.productionId))) || "-"}
                                </td>
                                <td className="px-3 py-2 text-center text-slate-700">{book.records?.length || 0}</td>
                                <td className="px-3 py-2 text-center text-slate-700">{calcTotalLayers(book.records || [])}</td>
                                <td className="px-3 py-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => openDetail(book.productionId)}
                                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                                  >
                                    Xem chi tiết
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-2 text-xs text-slate-600">
                        <span>
                          Hiển thị {pagedBooks.length} / {books.length} đơn hàng
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                            disabled={page <= 1}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:text-slate-300"
                          >
                            Trước
                          </button>
                          <span className="text-xs text-slate-500">
                            Trang {page} / {totalPages}
                          </span>
                          <button
                            type="button"
                            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={page >= totalPages}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:text-slate-300"
                          >
                            Sau
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                ))}
            </div>
          )}

          {selectedProductionId && currentBook && (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-slate-600 mb-4">
                  <ClipboardCheck size={16} />
                  <h2 className="text-xs font-bold uppercase tracking-widest">Thông tin sổ cắt</h2>
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
                    <Field compact label="Mã đơn sản xuất" value={meta.productionId} onChange={(v) => updateMeta("productionId", v)} disabled={!isEditing} />
                    <Field compact label="Chiều dài sơ đồ (m)" value={meta.markerLength} onChange={(v) => updateMeta("markerLength", v)} disabled={!isEditing} />
                    <Field compact label="Khổ vải (cm)" value={meta.fabricWidth} onChange={(v) => updateMeta("fabricWidth", v)} disabled={!isEditing} />
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-slate-600">
                    <ClipboardCheck size={16} />
                    <h2 className="text-xs font-bold uppercase tracking-widest">Nhập dòng mới</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to="/worker/error-report"
                      state={{
                        assignment: {
                          productionId: meta.productionId || selectedProductionId,
                          partName: "Công đoạn cắt",
                          errorType: "cutting",
                        },
                      }}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                    >
                      Báo lỗi
                    </Link>
                    <button
                      type="button"
                      onClick={openCreateRecord}
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:text-emerald-300"
                    >
                      Thêm dòng
                    </button>
                  </div>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Nhấn "Thêm dòng" để nhập thông tin mới.
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-slate-600 mb-4">
                  <ClipboardCheck size={16} />
                  <h2 className="text-xs font-bold uppercase tracking-widest">Danh sách dòng đã ghi</h2>
                </div>
                {currentBook.records?.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full divide-y divide-slate-200 table-fixed text-sm">
                      <thead className="leave-table-head">
                        <tr>
                          <th className="leave-table-th w-14 px-3 py-3 text-center">STT</th>
                          <th className="leave-table-th w-24 px-3 py-3 text-left">Màu</th>
                          <th className="leave-table-th w-24 px-3 py-3 text-center">Số m/kg</th>
                          <th className="leave-table-th w-24 px-3 py-3 text-center">Số lớp</th>
                          <th className="leave-table-th w-28 px-3 py-3 text-center">Sản lượng</th>
                          <th className="leave-table-th w-28 px-3 py-3 text-center">Định mức TB</th>
                          <th className="leave-table-th w-28 px-3 py-3 text-center">Ngày ghi</th>
                          <th className="leave-table-th w-48 px-3 py-3 text-left">Ghi chú</th>
                          <th className="leave-table-th w-32 px-3 py-3 text-center">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {currentBook.records.map((item, index) => (
                          <tr key={item.id || index} className="leave-table-row hover:bg-slate-50/80">
                            <td className="px-3 py-2 text-center">{index + 1}</td>
                            <td className="px-3 py-2 text-slate-700">{item.color || "-"}</td>
                            <td className="px-3 py-2 text-center text-slate-700">{item.meterPerKg || "-"}</td>
                            <td className="px-3 py-2 text-center text-slate-700">{item.layer || "-"}</td>
                            <td className="px-3 py-2 text-center text-slate-700">{item.productQty || "-"}</td>
                            <td className="px-3 py-2 text-center text-slate-700">{item.avgConsumption || "-"}</td>
                            <td className="px-3 py-2 text-center text-slate-600">{item.dateCreate || "-"}</td>
                            <td className="px-3 py-2 text-slate-600">{item.note || "-"}</td>
                            {/* <td className="px-3 py-2 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => openEditRecord(item)}
                                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
                                >
                                  Sửa
                                </button>
                                <button
                                  type="button"
                                  onClick={() => confirmDeleteRecord(item.id)}
                                  className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-100"
                                >
                                  Xóa
                                </button>
                              </div>
                            </td> */}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                    Chưa có dòng nào được ghi cho đơn hàng này.
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm text-slate-700 shadow-sm">
                <span className="font-semibold">Đã lưu:</span> {currentBook.records?.length || 0} dòng ·
                <span className="ml-2 font-semibold">Tổng số lớp:</span> {totalLayers}
              </div>
            </>
          )}
        </div>
      </div>
      {showEntryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  {editingRecordId ? "Chỉnh sửa dòng" : "Nhập dòng mới"}
                </div>
                <div className="text-base font-bold text-slate-900">Sổ cắt #{meta.productionId || "-"}</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEntryModal(false);
                  setEditingRecordId(null);
                  setRecord(DEFAULT_RECORD);
                }}
                className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-500 hover:text-slate-700"
              >
                Đóng
              </button>
            </div>
            <div className="mt-5 space-y-4">
              {!isEditing && (
                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Bật "Chỉnh sửa" để nhập và lưu dòng mới.
                </div>
              )}
              {recordErrors.submit && (
                <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                  {recordErrors.submit}
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <ModalField label="Màu" value={record.color} onChange={(v) => updateRecord("color", v)} disabled={!isEditing} placeholder="Ví dụ: Đen" error={recordErrors.color} />
                <ModalField label="Số m/kg" value={record.meterPerKg} onChange={(v) => updateRecord("meterPerKg", v)} disabled={!isEditing} placeholder="Ví dụ: 65" error={recordErrors.meterPerKg} />
                <ModalField label="Số lớp" value={record.layer} onChange={(v) => updateRecord("layer", v)} disabled={!isEditing} placeholder="Ví dụ: 10" error={recordErrors.layer} />
                <ModalField label="Sản phẩm" value={record.productQty} onChange={(v) => updateRecord("productQty", v)} disabled={!isEditing} placeholder="Ví dụ: 400" error={recordErrors.productQty} />
                <ModalField label="Định mức TB" value={record.avgConsumption} onChange={(v) => updateRecord("avgConsumption", v)} disabled={!isEditing} placeholder="Ví dụ: 0.95" error={recordErrors.avgConsumption} />
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <ModalTextarea label="Ghi chú" value={record.note} onChange={(v) => updateRecord("note", v)} disabled={!isEditing} />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
              <div className="text-xs text-slate-400">
                {savedAt ? `Đã lưu: ${savedAt}` : "Chưa lưu"}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={clearRecord}
                  disabled={!isEditing || isSavingRecord}
                  className="px-6 py-2.5 font-bold text-slate-500 transition-colors hover:text-slate-700 disabled:text-slate-300"
                >
                  Xóa trắng
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await saveRecord();
                    if (ok) {
                      setShowEntryModal(false);
                      setEditingRecordId(null);
                    }
                  }}
                  disabled={!isEditing || isSavingRecord}
                  className="px-8 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all active:scale-95 disabled:bg-emerald-300"
                >
                  {isSavingRecord ? "Đang lưu..." : (editingRecordId ? "Lưu chỉnh sửa" : "Lưu dòng")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <Eraser size={18} />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">Xóa dòng ghi</div>
                <div className="text-xs text-slate-500">Bạn có chắc muốn xóa dòng ghi này không?</div>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={deleteRecord}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-700"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </OwnerLayout>
  );
}

function Field({ label, value, onChange, type = "text", disabled = false, compact = false }) {
  return (
    <label className={`flex flex-col ${compact ? "gap-0.5 text-xs" : "gap-1 text-sm"} font-semibold text-slate-600`}>
      <span className={`${compact ? "text-[10px]" : "text-xs"} uppercase tracking-wide text-slate-400`}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={`w-full rounded-xl border border-slate-200 bg-slate-50 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:bg-slate-100 disabled:text-slate-500 ${compact ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm"
          }`}
      />
    </label>
  );
}

function NoteInput({ value, onChange, disabled = false, compact = false }) {
  return (
    <textarea
      rows={compact ? 1 : 2}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className={`w-full resize-y rounded-lg border border-slate-200 bg-slate-50 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 disabled:bg-slate-100 disabled:text-slate-500 ${compact ? "px-2 py-1 text-xs" : "px-2 py-1.5 text-sm"
        }`}
      placeholder="Ghi chú chi tiết..."
    />
  );
}

function Info({ label, value, compact = false }) {
  return (
    <div className={`rounded-lg bg-white shadow-sm ${compact ? "px-2 py-1.5" : "px-3 py-2"}`}>
      <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</div>
      <div className={`${compact ? "mt-0.5 text-xs" : "mt-1 text-sm"} font-semibold text-slate-700`}>
        {value || "-"}
      </div>
    </div>
  );
}

function ModalField({ label, value, onChange, disabled = false, placeholder = "", error = "" }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full rounded-xl border px-4 py-2.5 text-sm transition-all outline-none focus:ring-4 bg-white disabled:bg-slate-100 disabled:text-slate-500 ${error
          ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10"
          : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/10"
          }`}
      />
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
    </label>
  );
}

function ModalTextarea({ label, value, onChange, disabled = false }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <textarea
        rows={2}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition-all outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 bg-white disabled:bg-slate-100 disabled:text-slate-500"
        placeholder="Ví dụ: cắt dư 2%, ưu tiên lô màu #A1B2..."
      />
    </label>
  );
}

function SuggestSelect({ label, value, onChange, options = [], placeholder = "" }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-semibold text-slate-600">
      <span className="text-xs uppercase tracking-wide text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
      >
        <option value="">{placeholder || "Chọn"}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
