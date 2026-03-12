import axiosClient from "@/lib/axios";
import { API_ENDPOINTS } from "@/lib/apiconfig";

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

    const response =
      typeof rawResponse === "string"
        ? JSON.parse(rawResponse)
        : rawResponse;

    const rawItems = response?.data ?? response?.items ?? response?.records ?? [];

    return {
      ...response,
      data: Array.isArray(rawItems) ? rawItems.map(normalizeLeaveItem) : [],
    };
  },

  async getLeaveRequestById(id) {
    const response = await this.getLeaveRequests({
      PageIndex: 0,
      PageSize: 50,
      SortColumn: "DateCreate",
      SortOrder: "DESC",
      FilterQuery: String(id ?? ""),
    });

    return response.data.find((item) => String(item.id) === String(id)) ?? null;
  },
};

export default LeaveService;
