import axiosClient from "@/lib/axios";
import { API_ENDPOINTS } from "@/lib/apiconfig";

const TemplateService = {
  getTemplates() {
    return axiosClient.get(API_ENDPOINTS.TEMPLATE.LIST);
  },
  createTemplate(payload) {
    return axiosClient.post(API_ENDPOINTS.TEMPLATE.CREATE, payload);
  },
};

export default TemplateService;
