import axiosClient from "@/lib/axios";
import { API_ENDPOINTS } from "@/lib/apiconfig";

const ProductionPartService = {
  getPartsByProduction(productionId, params) {
    return axiosClient.get(API_ENDPOINTS.PRODUCTION_PART.LIST_BY_PRODUCTION(productionId), { params });
  },
  createParts(productionId, payload) {
    return axiosClient.post(API_ENDPOINTS.PRODUCTION_PART.CREATE_PARTS(productionId), payload);
  },
  getAssignWorkers(params) {
    return axiosClient.get(API_ENDPOINTS.PRODUCTION_PART.LIST_ASSIGN_WORKERS, { params });
  },
  updateAssignWorker(partId, partOrderSizeId, payload) {
    return axiosClient.patch(API_ENDPOINTS.PRODUCTION_PART.UPDATE_ASSIGN_WORKERS(partId, partOrderSizeId), payload);
  },
  updatePart(partId, payload) {
    return axiosClient.put(API_ENDPOINTS.PRODUCTION_PART.UPDATE_PART(partId), payload);
  },
  createWorkLog(partId, partOrderSizeId, payload) {
    return axiosClient.post(API_ENDPOINTS.PRODUCTION_PART.CREATE_WORK_LOGS(partId, partOrderSizeId), payload);
  },
  updateWorkLog(partId, partOrderSizeId, logId, payload) {
    return axiosClient.put(API_ENDPOINTS.PRODUCTION_PART.UPDATE_WORK_LOGS(partId, partOrderSizeId, logId), payload);
  },
  getWorkLogs(partId, partOrderSizeId) {
    return axiosClient.get(API_ENDPOINTS.PRODUCTION_PART.GET_WORK_LOGS(partId, partOrderSizeId));
  },
  deleteWorkLog(logId) {
    return axiosClient.delete(API_ENDPOINTS.PRODUCTION_PART.DELETE_WORK_LOGS(logId));
  },
  createIssue(partId, formData) {
    return axiosClient.post(
      API_ENDPOINTS.PRODUCTION_PART.CREATE_ISSUE(partId),
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
  },
  donePart(partId, payload) {
    return axiosClient.patch(API_ENDPOINTS.PRODUCTION_PART.DONE_A_PART(partId), payload);
  },
  getIssueWorkers(partId) {
    return axiosClient.get(API_ENDPOINTS.PRODUCTION_PART.GET_ISSUE_WORKERS(partId));
  },
  completePayment(partId, payload) {
    return axiosClient.patch(API_ENDPOINTS.PRODUCTION_PART.COMPLETE_PAYMENT(partId), payload);
  },
  getProductionWorkLogs(productionId, params) {
    return axiosClient.get(API_ENDPOINTS.PRODUCTION_PART.GET_PRODUCTION_WORK_LOGS(productionId), { params });
  },
  approveWorkLog(partId, partOrderSizeId, logId, payload) {
    return axiosClient.patch(API_ENDPOINTS.PRODUCTION_PART.APPROVE_WORK_LOG(partId, partOrderSizeId, logId), payload);
  },
  recordDelivery(orderId, payload) {
    return axiosClient.post(API_ENDPOINTS.PRODUCTION_PART.RECORD_DELIVERY(orderId), payload);
  },
  getDeliveryHistory(orderId) {
    return axiosClient.get(API_ENDPOINTS.PRODUCTION_PART.RECORD_DELIVERY(orderId));
  },
};

export default ProductionPartService;
