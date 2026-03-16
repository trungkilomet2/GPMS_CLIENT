import axiosClient from "@/lib/axios";
import { API_ENDPOINTS } from "@/lib/apiconfig";

const parseApiPayload = (rawResponse) => {
  if (typeof rawResponse !== "string") {
    return rawResponse ?? {};
  }

  try {
    return JSON.parse(rawResponse);
  } catch {
    return {};
  }
};

export const getLeaveErrorMessage = (error, fallbackMessage) => {
  if (error?.response?.status === 403) {
    return (
      error?.response?.data?.message ||
      error?.response?.data?.title ||
      "Bạn không có quyền thực hiện thao tác này."
    );
  }

  return (
    error?.response?.data?.message ||
    error?.response?.data?.title ||
    error?.message ||
    fallbackMessage
  );
};

const normalizeStatus = (value) => {
  const normalized = String(value ?? "pending").trim().toLowerCase();

  if (["approved", "approve", "đã duyệt", "da duyet"].includes(normalized)) return "approved";
  if (["rejected", "reject", "từ chối", "tu choi"].includes(normalized)) return "rejected";
  return "pending";
};

const normalizeLeaveItem = (item = {}) => ({
  id: item.id ?? item.lrId ?? item.leaveRequestId ?? null,
  userId: item.userId ?? item.employeeId ?? null,
  userFullName: item.userFullName ?? item.fullName ?? item.employeeName ?? "Chưa có tên",
  content: item.content ?? "",
  dateCreate: item.dateCreate ?? item.createdAt ?? null,
  dateReply: item.dateReply ?? item.repliedAt ?? null,
  denyContent: item.denyContent ?? "",
  status: normalizeStatus(item.status),
});

const LeaveService = {
  async getLeaveRequests(params) {
    const rawResponse = await axiosClient.get(
      API_ENDPOINTS.LEAVE_REQUEST.GET_LIST,
      params ? { params } : undefined
    );
    const response = parseApiPayload(rawResponse);

    const rawItems = response?.data ?? response?.items ?? response?.records ?? [];

    return {
      ...response,
      data: Array.isArray(rawItems) ? rawItems.map(normalizeLeaveItem) : [],
    };
  },

  async getMyLeaveRequests(params) {
    const rawResponse = await axiosClient.get(
      API_ENDPOINTS.LEAVE_REQUEST.GET_MY_HISTORY,
      params ? { params } : undefined
    );
    const response = parseApiPayload(rawResponse);
    const rawItems = response?.data ?? response?.items ?? response?.records ?? [];

    return {
      ...response,
      data: Array.isArray(rawItems) ? rawItems.map(normalizeLeaveItem) : [],
    };
  },

  async getLeaveRequestById(id) {
    const rawResponse = await axiosClient.get(API_ENDPOINTS.LEAVE_REQUEST.GET_DETAIL(id));
    const response = parseApiPayload(rawResponse);

    return response?.data ? normalizeLeaveItem(response.data) : null;
  },

  async approveLeaveRequest(id) {
    const rawResponse = await axiosClient.put(API_ENDPOINTS.LEAVE_REQUEST.APPROVE(id));
    const response =
      typeof rawResponse === "string"
        ? rawResponse
        : rawResponse;

    return response;
    const rawResponse = await axiosClient.put(API_ENDPOINTS.LEAVE_REQUEST.APPROVE(id), {});
    return parseApiPayload(rawResponse);
  },

  async denyLeaveRequest(id, payload) {
    const rawResponse = await axiosClient.put(API_ENDPOINTS.LEAVE_REQUEST.DENY(id), payload);
    const response = parseApiPayload(rawResponse);

    return response;
  },
};

export default LeaveService;
