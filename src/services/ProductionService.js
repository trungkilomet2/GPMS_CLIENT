import axiosClient from "@/lib/axios";
import { API_ENDPOINTS } from "@/lib/apiconfig";

const ProductionService = {
  createProduction(payload) {
    return axiosClient.post(API_ENDPOINTS.PRODUCTION.CREATE, payload);
  },
  getProductionList(params) {
    return axiosClient.get(API_ENDPOINTS.PRODUCTION.LIST, { params });
  },
};

export default ProductionService;
