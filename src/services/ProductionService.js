import axiosClient from "@/lib/axios";
import { API_ENDPOINTS } from "@/lib/apiconfig";

const ProductionService = {
  createProduction(payload) {
    return axiosClient.post(API_ENDPOINTS.PRODUCTION.CREATE, payload);
  },
  getProductionList(params, config = {}) {
    return axiosClient.get(API_ENDPOINTS.PRODUCTION.LIST, { params, ...config });
  },
  getProductionDetail(id) {
    return axiosClient.get(API_ENDPOINTS.PRODUCTION.DETAIL(id));
  },
  updateProductionPm(productionId, pmId) {
    return axiosClient.put(API_ENDPOINTS.PRODUCTION.UPDATE_PM(productionId, pmId));
  },
  approveProduction(productionId, payload) {
    return axiosClient.patch(API_ENDPOINTS.PRODUCTION.APPROVE(productionId), payload);
  },
  rejectProduction(productionId, payload) {
    return axiosClient.patch(API_ENDPOINTS.PRODUCTION.REJECT(productionId), payload);
  },
  getProductionRejectReason(productionId) {
    return axiosClient.patch(API_ENDPOINTS.PRODUCTION.REJECT_REASON(productionId));
  },
  getProductionIssues(productionId) {
    return axiosClient.get(API_ENDPOINTS.PRODUCTION.ISSUES(productionId));
  },
  getProductionIssueSummary(productionId) {
    return axiosClient.get(API_ENDPOINTS.PRODUCTION.ISSUES_SUMMARY(productionId));
  },
  approveProductionPlan(id) {
    return axiosClient.patch(API_ENDPOINTS.PRODUCTION.APPROVE_PLAN(id));
  },
  requestPlanUpdate(id) {
    return axiosClient.patch(API_ENDPOINTS.PRODUCTION.NEED_UPDATE_PLAN(id));
  },
  getWorkerOutputHistory(workerId) {
    return axiosClient.get(API_ENDPOINTS.PRODUCTION.OUTPUT_HISTORY_WORKER(workerId));
  },
  getOutputHistory() {
    return axiosClient.get(API_ENDPOINTS.PRODUCTION.OUTPUT_HISTORY_ALL);
  },
  completeProduction(id, payload) {
    return axiosClient.patch(API_ENDPOINTS.PRODUCTION.COMPLETE(id), payload);
  },
  updateIssueStatus(issueId, statusId) {
    return axiosClient.patch(API_ENDPOINTS.PRODUCTION_PART.UPDATE_ISSUE_STATUS(issueId), {
      statusId: statusId
    });
  },
  confirmUnfixable(issueId, confirmedQuantity) {
    return axiosClient.patch(API_ENDPOINTS.PRODUCTION_PART.CONFIRM_UNFIXABLE(issueId), {
      confirmedQuantity: confirmedQuantity
    });
  },
  confirmDelivery(deliveryId, confirmationText) {
    return axiosClient.patch(API_ENDPOINTS.PRODUCTION_PART.CONFIRM_DELIVERY(deliveryId), {
      confirmationText: confirmationText
    });
  },
};

export default ProductionService;
