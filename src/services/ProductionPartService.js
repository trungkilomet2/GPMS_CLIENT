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
};

export default ProductionPartService;
