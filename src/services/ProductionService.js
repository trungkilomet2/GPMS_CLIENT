import axiosClient from "@/lib/axios";
import { API_ENDPOINTS } from "@/lib/apiconfig";

const ProductionService = {
  createProduction(payload) {
    return axiosClient.post(API_ENDPOINTS.PRODUCTION.CREATE, payload);
  },
};

export default ProductionService;
