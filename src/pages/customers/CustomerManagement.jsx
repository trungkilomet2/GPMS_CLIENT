import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { CircleAlert, ImageIcon, LoaderCircle, Mail, Package, Phone, Search, ShoppingBag, Users } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import CustomerService from "@/services/CustomerService";
import { getOrderStatusLabel, getOrderStatusStyle } from "@/lib/orders/status";

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("vi-VN").format(date);
}

function formatNumber(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "0";
  return new Intl.NumberFormat("vi-VN").format(parsed);
}

function formatCurrency(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "-";
  return `${new Intl.NumberFormat("vi-VN").format(parsed)} VNĐ/SP`;
}

function getInitials(name = "") {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(-2)
    .join("")
    .toUpperCase();
}

function SummaryCard({ icon: Icon, label, value, meta, tone }) {
  const toneMap = {
    emerald: "border-emerald-200 bg-emerald-50/70 text-emerald-900",
    blue: "border-sky-200 bg-sky-50/70 text-sky-900",
    amber: "border-amber-200 bg-amber-50/70 text-amber-900",
  };

  return (
    <div className={`rounded-[1.5rem] border px-5 py-4 shadow-sm ${toneMap[tone] ?? toneMap.emerald}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <div className="mt-2 text-3xl font-bold leading-none">{value}</div>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
          <Icon size={22} />
        </div>
      </div>
      <p className="mt-3 min-h-[3rem] text-sm leading-6 text-slate-600">{meta}</p>
    </div>
  );
}

function PaginationBar({ pageIndex, pageSize, recordCount, onPageChange, disabled }) {
  const totalPages = Math.max(1, Math.ceil(recordCount / Math.max(pageSize, 1)));
  const currentPage = pageIndex + 1;

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
      <div>
        Trang <span className="font-semibold text-slate-700">{currentPage}</span> / {totalPages} • {recordCount} bản ghi
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(0, pageIndex - 1))}
          disabled={disabled || pageIndex <= 0}
          className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Trang trước
        </button>
        <button
          type="button"
          onClick={() => onPageChange(pageIndex + 1)}
          disabled={disabled || currentPage >= totalPages}
          className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Trang sau
        </button>
      </div>
    </div>
  );
}

export default function CustomerManagement() {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [customerSearchInput, setCustomerSearchInput] = useState("");
  const [orderSearchInput, setOrderSearchInput] = useState("");
  const [customerPageIndex, setCustomerPageIndex] = useState(0);
  const [customerPageSize] = useState(10);
  const [customerRecordCount, setCustomerRecordCount] = useState(0);
  const [orderPageIndex, setOrderPageIndex] = useState(0);
  const [orderPageSize] = useState(10);
  const [orderRecordCount, setOrderRecordCount] = useState(0);
  const [orders, setOrders] = useState([]);
  const [customerLoading, setCustomerLoading] = useState(true);
  const [orderLoading, setOrderLoading] = useState(false);
  const [customerError, setCustomerError] = useState("");
  const [orderError, setOrderError] = useState("");

  const customerSearch = useDeferredValue(customerSearchInput.trim());
  const orderSearch = useDeferredValue(orderSearchInput.trim());

  useEffect(() => {
    setCustomerPageIndex(0);
  }, [customerSearch]);

  useEffect(() => {
    setOrderPageIndex(0);
  }, [orderSearch, selectedCustomerId]);

  useEffect(() => {
    let mounted = true;

    const fetchCustomers = async () => {
      setCustomerLoading(true);
      setCustomerError("");

      try {
        const response = await CustomerService.getAllCustomers({
          PageIndex: customerPageIndex,
          PageSize: customerPageSize,
          SortColumn: "Name",
          SortOrder: "ASC",
          ...(customerSearch ? { FilterQuery: customerSearch } : {}),
        });

        if (!mounted) return;

        const nextCustomers = response?.data ?? [];
        setCustomers(nextCustomers);
        setCustomerRecordCount(response?.recordCount ?? nextCustomers.length);

        setSelectedCustomerId((current) => {
          if (nextCustomers.length === 0) return null;
          if (nextCustomers.some((customer) => customer.id === current)) return current;
          return nextCustomers[0]?.id ?? null;
        });
      } catch (error) {
        if (!mounted) return;
        setCustomers([]);
        setCustomerRecordCount(0);
        setSelectedCustomerId(null);
        setCustomerError(
          CustomerService.getCustomerModuleErrorMessage(
            error,
            "Không tải được danh sách khách hàng. Vui lòng thử lại."
          )
        );
      } finally {
        if (mounted) setCustomerLoading(false);
      }
    };

    fetchCustomers();

    return () => {
      mounted = false;
    };
  }, [customerPageIndex, customerPageSize, customerSearch]);

  useEffect(() => {
    let mounted = true;

    const fetchOrders = async () => {
      if (!selectedCustomerId) {
        setOrders([]);
        setOrderRecordCount(0);
        setOrderError("");
        setOrderLoading(false);
        return;
      }

      setOrderLoading(true);
      setOrderError("");

      try {
        const response = await CustomerService.getOrdersByCustomer(selectedCustomerId, {
          PageIndex: orderPageIndex,
          PageSize: orderPageSize,
          SortColumn: "Name",
          SortOrder: "ASC",
          ...(orderSearch ? { FilterQuery: orderSearch } : {}),
        });

        if (!mounted) return;

        const nextOrders = response?.data ?? [];
        setOrders(nextOrders);
        setOrderRecordCount(response?.recordCount ?? nextOrders.length);
      } catch (error) {
        if (!mounted) return;
        setOrders([]);
        setOrderRecordCount(0);
        setOrderError(
          CustomerService.getCustomerModuleErrorMessage(
            error,
            "Không tải được đơn hàng của khách này. Vui lòng thử lại."
          )
        );
      } finally {
        if (mounted) setOrderLoading(false);
      }
    };

    fetchOrders();

    return () => {
      mounted = false;
    };
  }, [orderPageIndex, orderPageSize, orderSearch, selectedCustomerId]);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId]
  );

  const customerStats = useMemo(() => {
    const withPhone = customers.filter((customer) => customer.phoneNumber).length;
    const withEmail = customers.filter((customer) => customer.email).length;

    return {
      totalOnPage: customers.length,
      withPhone,
      withEmail,
    };
  }, [customers]);

  return (
    <DashboardLayout>
      <div className="min-h-full bg-[#f4f7f5]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <section className="rounded-[2rem] bg-gradient-to-r from-[#103c25] via-[#1b5f39] to-[#25784a] px-6 py-6 text-white shadow-xl sm:px-8">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100/85">
                  Quản lý khách hàng
                </div>
                <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-[2.6rem]">
                  Khách hàng và đơn hàng trong một màn hình
                </h1>
              </div>
              <div className="grid gap-3 text-sm md:grid-cols-3 xl:min-w-[34rem]">
                <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100/75">Khách đang hiển thị</div>
                  <div className="mt-3 text-3xl font-bold leading-none">{customerStats.totalOnPage}</div>
                  <div className="mt-2 text-sm text-emerald-50/75">Theo trang và bộ lọc hiện tại</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100/75">Đơn của khách đang chọn</div>
                  <div className="mt-3 text-3xl font-bold leading-none">{orderRecordCount}</div>
                  <div className="mt-2 text-sm text-emerald-50/75">
                    {selectedCustomer ? selectedCustomer.fullName : "Chưa chọn khách hàng"}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100/75">Khách đang xem</div>
                  <div className="mt-3 truncate text-lg font-bold leading-snug">
                    {selectedCustomer?.fullName || "Chưa chọn khách hàng"}
                  </div>
                  <div className="mt-2 truncate text-sm text-emerald-50/75">
                    {selectedCustomer?.email || selectedCustomer?.phoneNumber || "Chưa có thông tin liên hệ"}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <SummaryCard
              icon={Users}
              label="Khách hàng"
              value={customerStats.totalOnPage}
              meta="Số khách đang hiển thị ở trang hiện tại sau khi áp dụng bộ lọc."
              tone="emerald"
            />
            <SummaryCard
              icon={Phone}
              label="Có số điện thoại"
              value={customerStats.withPhone}
              meta="Số khách trên trang hiện tại có thể liên hệ qua điện thoại."
              tone="blue"
            />
            <SummaryCard
              icon={Mail}
              label="Có email"
              value={customerStats.withEmail}
              meta="Số khách trên trang hiện tại đã có email."
              tone="amber"
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Danh sách khách hàng</h2>
                    <p className="mt-1 text-sm text-slate-500">Chọn một khách hàng để xem các đơn hàng tương ứng.</p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                    {customerRecordCount} khách
                  </div>
                </div>
                <label className="relative mt-4 block">
                  <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={customerSearchInput}
                    onChange={(event) => setCustomerSearchInput(event.target.value)}
                    placeholder="Tìm theo tên, user, điện thoại, email..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  />
                </label>
              </div>

              <div className="max-h-[42rem] overflow-y-auto">
                {customerLoading ? (
                  <div className="flex items-center gap-3 px-5 py-6 text-sm text-slate-500">
                    <LoaderCircle size={18} className="animate-spin text-emerald-600" />
                    <span>Đang tải danh sách khách hàng...</span>
                  </div>
                ) : customerError ? (
                  <div className="m-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
                    <div className="flex items-start gap-3">
                      <CircleAlert size={18} className="mt-0.5 shrink-0" />
                      <div>
                        <div className="font-semibold">Không tải được khách hàng</div>
                        <div className="mt-1">{customerError}</div>
                      </div>
                    </div>
                  </div>
                ) : customers.length === 0 ? (
                  <div className="px-5 py-10 text-center text-sm text-slate-500">
                    Không có khách hàng nào phù hợp với bộ lọc hiện tại.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {customers.map((customer) => {
                      const isActive = customer.id === selectedCustomerId;

                      return (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => setSelectedCustomerId(customer.id)}
                          className={`flex w-full items-start gap-4 px-5 py-4 text-left transition ${
                            isActive ? "bg-emerald-50/80" : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-emerald-100 font-bold text-emerald-700">
                            {customer.avatarUrl ? (
                              <img src={customer.avatarUrl} alt={customer.fullName} className="h-full w-full object-cover" />
                            ) : (
                              getInitials(customer.fullName)
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="truncate text-sm font-bold text-slate-900">{customer.fullName}</div>
                              {isActive ? (
                                <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                  Đang chọn
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-1 truncate text-sm text-slate-500">@{customer.userName || "chua-cap-nhat"}</div>
                            <div className="mt-3 grid gap-1 text-xs text-slate-500">
                              <span>{customer.phoneNumber || "Chưa có số điện thoại"}</span>
                              <span className="truncate">{customer.email || "Chưa có email"}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <PaginationBar
                pageIndex={customerPageIndex}
                pageSize={customerPageSize}
                recordCount={customerRecordCount}
                onPageChange={setCustomerPageIndex}
                disabled={customerLoading || Boolean(customerError)}
              />
            </div>

            <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Đơn hàng theo khách</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedCustomer
                        ? `Đang xem đơn hàng của ${selectedCustomer.fullName}.`
                        : "Chọn một khách hàng bên trái để tải danh sách đơn hàng."}
                    </p>
                  </div>

                  {selectedCustomer ? (
                    <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 sm:grid-cols-2">
                      <div>
                        <div className="font-semibold text-slate-900">{selectedCustomer.fullName}</div>
                        <div>@{selectedCustomer.userName || "chua-cap-nhat"}</div>
                      </div>
                      <div>
                        <div>{selectedCustomer.phoneNumber || "Chưa có số điện thoại"}</div>
                        <div className="truncate">{selectedCustomer.email || "Chưa có email"}</div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <label className="relative mt-4 block">
                  <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={orderSearchInput}
                    onChange={(event) => setOrderSearchInput(event.target.value)}
                    placeholder="Tìm đơn hàng theo tên, loại, màu, size, trạng thái..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                    disabled={!selectedCustomerId}
                  />
                </label>
              </div>

              {!selectedCustomerId ? (
                <div className="flex min-h-[24rem] items-center justify-center px-6 text-center text-sm text-slate-500">
                  Chưa có khách hàng nào được chọn.
                </div>
              ) : orderLoading ? (
                <div className="flex min-h-[24rem] items-center justify-center gap-3 text-sm text-slate-500">
                  <LoaderCircle size={18} className="animate-spin text-emerald-600" />
                  <span>Đang tải danh sách đơn hàng...</span>
                </div>
              ) : orderError ? (
                <div className="m-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
                  <div className="flex items-start gap-3">
                    <CircleAlert size={18} className="mt-0.5 shrink-0" />
                    <div>
                      <div className="font-semibold">Không tải được đơn hàng</div>
                      <div className="mt-1">{orderError}</div>
                    </div>
                  </div>
                </div>
              ) : orders.length === 0 ? (
                <div className="flex min-h-[24rem] flex-col items-center justify-center px-6 text-center text-sm text-slate-500">
                  <ShoppingBag size={24} className="mb-3 text-slate-300" />
                  Không có đơn hàng nào cho khách này với bộ lọc hiện tại.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Đơn hàng</th>
                        <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Thông tin</th>
                        <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Thông số</th>
                        <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Số lượng</th>
                        <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Giá / sản phẩm</th>
                        <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Thời gian</th>
                        <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {orders.map((order) => (
                        <tr key={order.id} className="align-top hover:bg-slate-50/70">
                          <td className="px-5 py-4">
                            <div className="flex items-start gap-3">
                              {order.image ? (
                                <img
                                  src={order.image}
                                  alt={order.orderName}
                                  className="h-11 w-11 shrink-0 rounded-2xl border border-slate-200 object-cover"
                                />
                              ) : (
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                                  <Package size={18} />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900">{order.orderName}</div>
                                <div className="mt-1 text-sm text-slate-500">#{order.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-600">
                            <div>{order.type || "-"}</div>
                            <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-500">
                              <ImageIcon size={14} />
                              {order.image ? "Có ảnh mẫu" : "Chưa có ảnh"}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-600">
                            <div className="mt-1">{[order.size, order.color].filter(Boolean).join(" • ") || "-"}</div>
                          </td>
                          <td className="px-5 py-4 text-sm font-semibold text-slate-700">{formatNumber(order.quantity)}</td>
                          <td className="px-5 py-4 text-sm font-semibold text-slate-700">{formatCurrency(order.cpu)}</td>
                          <td className="px-5 py-4 text-sm text-slate-600">
                            <div>Bắt đầu: {formatDate(order.startDate)}</div>
                            <div className="mt-1">Kết thúc: {formatDate(order.endDate)}</div>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getOrderStatusStyle(order.status)}`}>
                              {getOrderStatusLabel(order.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <PaginationBar
                pageIndex={orderPageIndex}
                pageSize={orderPageSize}
                recordCount={orderRecordCount}
                onPageChange={setOrderPageIndex}
                disabled={!selectedCustomerId || orderLoading || Boolean(orderError)}
              />
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
