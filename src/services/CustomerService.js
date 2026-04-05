import axiosClient from "@/lib/axios";
import { API_ENDPOINTS } from "@/lib/apiconfig";

const parseApiPayload = (rawResponse) =>
  typeof rawResponse === "string"
    ? (() => {
        try {
          return JSON.parse(rawResponse);
        } catch {
          return { data: [] };
        }
      })()
    : rawResponse ?? {};

const getErrorMessage = (error, fallbackMessage) => {
  if (error?.response?.status === 403) {
    return "Bạn không có quyền truy cập chức năng này.";
  }

  const data = error?.response?.data ?? {};
  const fieldErrors =
    data?.errors && typeof data.errors === "object"
      ? Object.entries(data.errors).flatMap(([, messages]) =>
          (Array.isArray(messages) ? messages : [messages]).map((message) => String(message))
        )
      : [];

  return fieldErrors[0] || data?.message || data?.title || data?.detail || fallbackMessage;
};

const toNumberOrFallback = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const cleanText = (value, fallback = "") => {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
};

const normalizeCustomer = (item = {}) => ({
  id: item.id ?? null,
  userName: cleanText(item.userName),
  avatarUrl: cleanText(item.avatarUrl),
  fullName: cleanText(item.fullName, "Khách hàng chưa đặt tên"),
  phoneNumber: cleanText(item.phoneNumber),
  email: cleanText(item.email),
});

const normalizeOrder = (item = {}) => ({
  id: item.id ?? null,
  userId: item.userId ?? null,
  orderName: cleanText(item.orderName, "Đơn hàng chưa đặt tên"),
  type: cleanText(item.type),
  size: cleanText(item.size),
  color: cleanText(item.color),
  quantity: toNumberOrFallback(item.quantity, 0),
  cpu: toNumberOrFallback(item.cpu, 0),
  startDate: cleanText(item.startDate),
  endDate: cleanText(item.endDate),
  image: cleanText(item.image),
  status: cleanText(item.status),
});

const normalizeCollectionResponse = (response = {}, itemNormalizer) => {
  const rawItems = response?.data ?? response?.items ?? response?.records ?? [];
  const items = Array.isArray(rawItems) ? rawItems.map(itemNormalizer) : [];

  return {
    ...response,
    data: items,
    pageIndex: toNumberOrFallback(response?.pageIndex, 0),
    pageSize: toNumberOrFallback(response?.pageSize, items.length),
    recordCount: toNumberOrFallback(
      response?.recordCount ?? response?.totalCount ?? response?.totalRecords ?? items.length,
      items.length
    ),
  };
};

const createEmptyCollectionResponse = (params = {}) => ({
  data: [],
  pageIndex: toNumberOrFallback(params?.PageIndex, 0),
  pageSize: toNumberOrFallback(params?.PageSize, 10),
  recordCount: 0,
});

const CustomerService = {
  getCustomerModuleErrorMessage: getErrorMessage,

  async getAllCustomers(params) {
    const rawResponse = await axiosClient.get(
      API_ENDPOINTS.CUSTOMER.GET_ALL,
      params ? { params } : undefined
    );

    return normalizeCollectionResponse(parseApiPayload(rawResponse), normalizeCustomer);
  },

  async getOrdersByCustomer(customerId, params) {
    try {
      const rawResponse = await axiosClient.get(
        API_ENDPOINTS.CUSTOMER.GET_ORDERS_BY_CUSTOMER(customerId),
        params ? { params } : undefined
      );

      return normalizeCollectionResponse(parseApiPayload(rawResponse), normalizeOrder);
    } catch (error) {
      if (error?.response?.status === 404) {
        return createEmptyCollectionResponse(params);
      }

      throw error;
    }
  },
};

export default CustomerService;
