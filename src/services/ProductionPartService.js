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
  updateAssignWorker(partId, payload) {
    return axiosClient.patch(API_ENDPOINTS.PRODUCTION_PART.UPDATE_ASSIGN_WORKERS(partId), payload);
  },
  updatePart(partId, payload) {
    return axiosClient.put(API_ENDPOINTS.PRODUCTION_PART.UPDATE_PART(partId), payload);
  },
  createWorkLog(partId, payload) {
    return axiosClient.post(API_ENDPOINTS.PRODUCTION_PART.CREATE_WORK_LOGS(partId), payload);
  },
  updateWorkLog(partId, logId, payload) {
    return axiosClient.request({
      method: "PUT",
      url: API_ENDPOINTS.PRODUCTION_PART.UPDATE_WORK_LOGS(partId, logId),
      data: payload,
    });
  },
  getWorkLogs(partId) {
    return axiosClient.get(API_ENDPOINTS.PRODUCTION_PART.GET_WORK_LOGS(partId));
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
};

export default ProductionPartService;
