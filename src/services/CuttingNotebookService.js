import axiosClient from "@/lib/axios";
import { API_ENDPOINTS } from "@/lib/apiconfig";

const CuttingNotebookService = {
  createNotebook: (payload) => {
    return axiosClient.post(API_ENDPOINTS.CUTTING_NOTEBOOK.CREATE, payload);
  },
  getNotebookByProduction: (productionId) => {
    return axiosClient.get(API_ENDPOINTS.CUTTING_NOTEBOOK.GET_BY_PRODUCTION(productionId));
  },
  getNotebookById: (notebookId) => {
    return axiosClient.get(API_ENDPOINTS.CUTTING_NOTEBOOK.GET_BY_ID(notebookId));
  },
  createLog: (notebookId, payload) => {
    return axiosClient.post(API_ENDPOINTS.CUTTING_NOTEBOOK.CREATE_LOG(notebookId), payload);
  },
  getLogs: (notebookId) => {
    return axiosClient.get(API_ENDPOINTS.CUTTING_NOTEBOOK.GET_LOGS(notebookId));
  },
};

export default CuttingNotebookService;
