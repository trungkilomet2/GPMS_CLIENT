import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ClipboardCheck, Eraser, Plus, Save } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import OwnerLayout from "@/layouts/OwnerLayout";
import ProductionService from "@/services/ProductionService";
import "@/styles/homepage.css";
import "@/styles/leave.css";

const STORAGE_KEY = "gpms-cutting-books";

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

const MOCK_BOOKS = [
  {
    productionId: "DH-2301",
    meta: {
      productionId: "DH-2301",
      markerLength: "23.5",
      fabricWidth: "150",
    },
    records: [
      {
        id: "r1",
        color: "Đen",
        meterPerKg: "65",
        layer: "10",
        productQty: "400",
        avgConsumption: "0.95",
        dateCreate: "2026-03-15",
        note: "Cắt size M-L.",
      },
      {
        id: "r2",
        color: "Xanh than",
        meterPerKg: "58",
        layer: "8",
        productQty: "320",
        avgConsumption: "0.92",
        dateCreate: "2026-03-16",
        note: "Thiếu vải 1 cuộn.",
      },
    ],
    updatedAt: "2026-03-16T09:30:00.000Z",
  },
  {
    productionId: "DH-2302",
    meta: {
      productionId: "DH-2302",
      markerLength: "21.8",
      fabricWidth: "160",
    },
    records: [
      {
        id: "r3",
        color: "Trắng",
        meterPerKg: "70",
        layer: "12",
        productQty: "520",
        avgConsumption: "0.88",
        dateCreate: "2026-03-14",
        note: "Ưu tiên size S.",
      },
      {
        id: "r4",
        color: "Kem",
        meterPerKg: "62",
        layer: "9",
        productQty: "360",
        avgConsumption: "0.9",
        dateCreate: "2026-03-17",
        note: "",
      },
      {
        id: "r5",
        color: "Nâu đất",
        meterPerKg: "60",
        layer: "7",
        productQty: "280",
        avgConsumption: "0.93",
        dateCreate: "2026-03-18",
        note: "Ghép màu đợt 2.",
      },
    ],
    updatedAt: "2026-03-18T13:00:00.000Z",
  },
  {
    productionId: "DH-2303",
    meta: {
      productionId: "DH-2303",
      markerLength: "24.2",
      fabricWidth: "155",
    },
    records: [
      {
        id: "r6",
        color: "Xanh lá",
        meterPerKg: "59",
        layer: "11",
        productQty: "450",
        avgConsumption: "0.91",
        dateCreate: "2026-03-12",
        note: "Vải co nhẹ.",
      },
    ],
    updatedAt: "2026-03-12T08:20:00.000Z",
  },
  {
    productionId: "DH-2304",
    meta: {
      productionId: "DH-2304",
      markerLength: "22.4",
      fabricWidth: "158",
    },
    records: [
      {
        id: "r7",
        color: "Xám",
        meterPerKg: "61",
        layer: "9",
        productQty: "360",
        avgConsumption: "0.9",
        dateCreate: "2026-03-11",
        note: "Cắt thử mẫu.",
      },
    ],
    updatedAt: "2026-03-11T09:20:00.000Z",
  },
  {
    productionId: "DH-2305",
    meta: {
      productionId: "DH-2305",
      markerLength: "20.6",
      fabricWidth: "150",
    },
    records: [
      {
        id: "r8",
        color: "Đỏ",
        meterPerKg: "64",
        layer: "8",
        productQty: "300",
        avgConsumption: "0.94",
        dateCreate: "2026-03-10",
        note: "",
      },
    ],
    updatedAt: "2026-03-10T08:10:00.000Z",
  },
  {
    productionId: "DH-2306",
    meta: {
      productionId: "DH-2306",
      markerLength: "23.1",
      fabricWidth: "162",
    },
    records: [
      {
        id: "r9",
        color: "Xanh dương",
        meterPerKg: "60",
        layer: "10",
        productQty: "420",
        avgConsumption: "0.89",
        dateCreate: "2026-03-09",
        note: "Vải dày.",
      },
    ],
    updatedAt: "2026-03-09T10:05:00.000Z",
  },
  {
    productionId: "DH-2307",
    meta: {
      productionId: "DH-2307",
      markerLength: "21.2",
      fabricWidth: "152",
    },
    records: [
      {
        id: "r10",
        color: "Be",
        meterPerKg: "63",
        layer: "7",
        productQty: "260",
        avgConsumption: "0.92",
        dateCreate: "2026-03-08",
        note: "May thử.",
      },
    ],
    updatedAt: "2026-03-08T07:50:00.000Z",
  },
  {
    productionId: "DH-2308",
    meta: {
      productionId: "DH-2308",
      markerLength: "24.0",
      fabricWidth: "165",
    },
    records: [
      {
        id: "r11",
        color: "Đen",
        meterPerKg: "66",
        layer: "12",
        productQty: "480",
        avgConsumption: "0.91",
        dateCreate: "2026-03-07",
        note: "",
      },
    ],
    updatedAt: "2026-03-07T11:30:00.000Z",
  },
  {
    productionId: "DH-2309",
    meta: {
      productionId: "DH-2309",
      markerLength: "22.8",
      fabricWidth: "155",
    },
    records: [
      {
        id: "r12",
        color: "Navy",
        meterPerKg: "62",
        layer: "9",
        productQty: "340",
        avgConsumption: "0.9",
        dateCreate: "2026-03-06",
        note: "Tăng size L.",
      },
    ],
    updatedAt: "2026-03-06T09:40:00.000Z",
  },
  {
    productionId: "DH-2310",
    meta: {
      productionId: "DH-2310",
      markerLength: "23.7",
      fabricWidth: "160",
    },
    records: [
      {
        id: "r13",
        color: "Trắng",
        meterPerKg: "68",
        layer: "11",
        productQty: "460",
        avgConsumption: "0.87",
        dateCreate: "2026-03-05",
        note: "",
      },
    ],
    updatedAt: "2026-03-05T08:15:00.000Z",
  },
  {
    productionId: "DH-2311",
    meta: {
      productionId: "DH-2311",
      markerLength: "21.9",
      fabricWidth: "150",
    },
    records: [
      {
        id: "r14",
        color: "Xanh lá",
        meterPerKg: "59",
        layer: "8",
        productQty: "300",
        avgConsumption: "0.93",
        dateCreate: "2026-03-04",
        note: "Vải co.",
      },
    ],
    updatedAt: "2026-03-04T07:35:00.000Z",
  },
  {
    productionId: "DH-2312",
    meta: {
      productionId: "DH-2312",
      markerLength: "22.1",
      fabricWidth: "158",
    },
    records: [
      {
        id: "r15",
        color: "Vàng",
        meterPerKg: "57",
        layer: "6",
        productQty: "220",
        avgConsumption: "0.95",
        dateCreate: "2026-03-03",
        note: "",
      },
    ],
    updatedAt: "2026-03-03T09:05:00.000Z",
  },
  {
    productionId: "DH-2313",
    meta: {
      productionId: "DH-2313",
      markerLength: "23.0",
      fabricWidth: "162",
    },
    records: [
      {
        id: "r16",
        color: "Hồng",
        meterPerKg: "64",
        layer: "9",
        productQty: "330",
        avgConsumption: "0.9",
        dateCreate: "2026-03-02",
        note: "Đợt 1.",
      },
    ],
    updatedAt: "2026-03-02T10:10:00.000Z",
  },
  {
    productionId: "DH-2314",
    meta: {
      productionId: "DH-2314",
      markerLength: "21.5",
      fabricWidth: "152",
    },
    records: [
      {
        id: "r17",
        color: "Cam",
        meterPerKg: "58",
        layer: "7",
        productQty: "250",
        avgConsumption: "0.94",
        dateCreate: "2026-03-01",
        note: "",
      },
    ],
    updatedAt: "2026-03-01T08:55:00.000Z",
  },
];

const getProductionId = (item) => item?.productionId ?? item?.id ?? "";
const getProductionName = (item) =>
  item?.order?.orderName || item?.orderName || item?.name || "";

const normalizeBooks = (data) => {
  if (!data || typeof data !== "object") return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.books)) return data.books;
  return [];
};

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
  const locationProductionId = useMemo(() => {
    const raw =
      location?.state?.productionId ??
      location?.state?.production?.productionId ??
      location?.state?.production?.id ??
      "";
    return String(raw || "").trim();
  }, [location]);
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setBooks(MOCK_BOOKS);
        return;
      }
      const parsed = normalizeBooks(JSON.parse(raw));
      setBooks(parsed.length ? parsed : MOCK_BOOKS);
    } catch {
      setBooks(MOCK_BOOKS);
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    if (!locationProductionId) return;
    const matched = books.find((book) => String(book.productionId) === locationProductionId);
    if (matched) {
      setMeta(matched.meta || DEFAULT_META);
      setSelectedProductionId(matched.productionId);
      setIsEditing(false);
      return;
    }
    setSelectedProductionId(null);
    setMeta((prev) => ({ ...prev, productionId: locationProductionId }));
    setShowCreate(true);
    setNewBook((prev) => ({ ...prev, productionId: locationProductionId }));
  }, [books, locationProductionId]);

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
      } catch (err) {
        if (!active) return;
        setProductionError("Không thể tải danh sách production.");
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

  const saveRecord = () => {
    const nextErrors = validateRecord(record);
    if (Object.keys(nextErrors).length > 0) {
      setRecordErrors(nextErrors);
      return false;
    }
    const productionKey = String(meta.productionId || "UNASSIGNED");
    const nextRecord = {
      id: editingRecordId || Date.now().toString(36),
      ...record,
      dateCreate: record.dateCreate || getTodayString(),
    };
    const nextBooks = (() => {
      const existing = books.find((book) => String(book.productionId) === productionKey);
      if (!existing) {
        return [
          ...books,
          {
            productionId: productionKey,
            meta: { ...meta },
            records: [nextRecord],
            updatedAt: new Date().toISOString(),
          },
        ];
      }
      return books.map((book) => {
        if (String(book.productionId) !== productionKey) return book;
        if (editingRecordId) {
          const nextRecords = (book.records || []).map((item) =>
            String(item.id) === String(editingRecordId)
              ? { ...item, ...nextRecord, id: editingRecordId }
              : item
          );
          return {
            ...book,
            meta: { ...meta },
            records: nextRecords,
            updatedAt: new Date().toISOString(),
          };
        }
        return {
          ...book,
          meta: { ...meta },
          records: [...(book.records || []), nextRecord],
          updatedAt: new Date().toISOString(),
        };
      });
    })();

    setBooks(nextBooks);
    setSelectedProductionId(productionKey);
    clearRecord();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextBooks));
      setSavedAt(new Date().toLocaleString("vi-VN"));
    } catch {
      // ignore storage errors
    }
    return true;
  };

  const openDetail = (productionId) => {
    const book = books.find((item) => String(item.productionId) === String(productionId));
    if (book) {
      setMeta(book.meta || DEFAULT_META);
      setSelectedProductionId(book.productionId);
      setIsEditing(false);
    }
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
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextBooks));
    } catch {
      // ignore storage errors
    }
  };

  const createBook = () => {
    const productionKey = String(newBook.productionId || "").trim();
    if (!productionKey) {
      setCreateError("Vui lòng chọn một production có sẵn.");
      return;
    }
    if (!productionMap.has(productionKey)) {
      setCreateError("Production không tồn tại trong hệ thống. Vui lòng chọn lại.");
      return;
    }
    const exists = books.some((book) => String(book.productionId) === productionKey);
    if (exists) return;
    const selectedProduction = productionMap.get(productionKey);
    const nextBooks = [
      {
        productionId: productionKey,
        meta: {
          ...newBook,
          productionId: productionKey,
          productionName: getProductionName(selectedProduction) || newBook.productionName || "",
        },
        records: [],
        updatedAt: new Date().toISOString(),
      },
      ...books,
    ];
    setBooks(nextBooks);
    setPage(1);
    setNewBook(DEFAULT_META);
    setShowCreate(false);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextBooks));
    } catch {
      // ignore storage errors
    }
  };

  const loadMockBooks = () => {
    setBooks(MOCK_BOOKS);
    setPage(1);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_BOOKS));
    } catch {
      // ignore storage errors
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
              {selectedProductionId && (
                <button
                  type="button"
                  onClick={resetToList}
                  className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
                >
                  <Eraser size={18} />
                </button>
              )}
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
                onClick={() => setIsEditing((prev) => !prev)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  isEditing
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
                    <div className="text-sm font-semibold text-slate-800">Tạo sổ cắt mới</div>
                    <div className="text-xs text-slate-500">Nhập thông tin cơ bản trước khi ghi dòng.</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={loadMockBooks}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      Dùng dữ liệu mẫu
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreate((prev) => !prev)}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                    >
                      <Plus size={14} /> {showCreate ? "Thu gọn" : "Tạo sổ cắt"}
                    </button>
                  </div>
                </div>
                {showCreate && (
                  <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr_1fr]">
                    <SuggestSelect
                      label="Mã kế hoạch/production"
                      value={newBook.productionId}
                      onChange={(v) => updateNewBook("productionId", v)}
                      options={productions.map((item) => ({
                        value: String(getProductionId(item)),
                        label: formatProductionOption(item),
                      }))}
                      placeholder="Nhập hoặc chọn mã kế hoạch"
                    />
                    {productionLoading && !productionError && (
                      <div className="lg:col-span-3 text-xs text-slate-400">
                        Đang tải danh sách production...
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
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                      >
                        <Save size={16} /> Tạo sổ cắt
                      </button>
                      <div className="text-xs text-slate-400">
                        Bắt buộc nhập Mã kế hoạch/production để tạo sổ cắt.
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {books.length === 0 ? (
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
                            <th className="leave-table-th w-32 px-3 py-3 text-left">Production</th>
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
              )}
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
                    <Field compact label="Mã production" value={meta.productionId} onChange={(v) => updateMeta("productionId", v)} disabled={!isEditing} />
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
                  Nhấn “Thêm dòng” để nhập thông tin mới.
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
                            <td className="px-3 py-2 text-center">
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
                            </td>
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
                  Bật “Chỉnh sửa” để nhập và lưu dòng mới.
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
                  disabled={!isEditing}
                  className="px-6 py-2.5 font-bold text-slate-500 transition-colors hover:text-slate-700 disabled:text-slate-300"
                >
                  Xóa trắng
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const ok = saveRecord();
                    if (ok) {
                      setShowEntryModal(false);
                      setEditingRecordId(null);
                    }
                  }}
                  disabled={!isEditing}
                  className="px-8 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all active:scale-95 disabled:bg-emerald-300"
                >
                  {editingRecordId ? "Lưu chỉnh sửa" : "Lưu dòng"}
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
        className={`w-full rounded-xl border border-slate-200 bg-slate-50 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:bg-slate-100 disabled:text-slate-500 ${
          compact ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm"
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
      className={`w-full resize-y rounded-lg border border-slate-200 bg-slate-50 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 disabled:bg-slate-100 disabled:text-slate-500 ${
        compact ? "px-2 py-1 text-xs" : "px-2 py-1.5 text-sm"
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
        className={`w-full rounded-xl border px-4 py-2.5 text-sm transition-all outline-none focus:ring-4 bg-white disabled:bg-slate-100 disabled:text-slate-500 ${
          error
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
