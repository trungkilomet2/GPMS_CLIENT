import axiosClient from "@/lib/axios";
import { API_ENDPOINTS } from "@/lib/apiconfig";

const ProductionService = {
  createProduction(payload) {
    return axiosClient.post(API_ENDPOINTS.PRODUCTION.CREATE, payload);
  },
  getProductionList(params) {
    return axiosClient.get(API_ENDPOINTS.PRODUCTION.LIST, { params });
  },
  getProductionDetail(id) {
    return axiosClient.get(API_ENDPOINTS.PRODUCTION.DETAIL(id));
  },
  getProductionIssues(id) {
    return axiosClient.get(API_ENDPOINTS.PRODUCTION.ISSUES(id));
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
  getProductionIssues(productionId) {
    return axiosClient.get(API_ENDPOINTS.PRODUCTION.ISSUES(productionId));
  },
  getProductionIssueSummary(productionId) {
    return axiosClient.get(API_ENDPOINTS.PRODUCTION.ISSUES_SUMMARY(productionId));
  },
};

export default ProductionService;
