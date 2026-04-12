import axiosClient from "@/lib/axios";
import { API_ENDPOINTS } from "@/lib/apiconfig";

const CuttingNotebookService = {
  createNotebook: (payload) => {
    return axiosClient.post(API_ENDPOINTS.CUTTING_NOTEBOOK.CREATE, payload);
  },
  getByProduction: (productionId) => {
    return axiosClient.get(API_ENDPOINTS.CUTTING_NOTEBOOK.GET_BY_PRODUCTION(productionId));
  },
  createLog: (notebookId, payload) => {
    return axiosClient.post(API_ENDPOINTS.CUTTING_NOTEBOOK.CREATE_LOG(notebookId), payload);
  },
  getListLogs: (notebookId) => {
    return axiosClient.get(API_ENDPOINTS.CUTTING_NOTEBOOK.GET_LOGS(notebookId));
  },
  updateNotebook: (notebookId, payload) => {
    return axiosClient.put(API_ENDPOINTS.CUTTING_NOTEBOOK.UPDATE(notebookId), payload);
  },
  getNotebookById: (notebookId) => {
    return axiosClient.get(API_ENDPOINTS.CUTTING_NOTEBOOK.GET_BY_ID(notebookId));
  },
  updateLog: (logId, payload) => {
    return axiosClient.put(API_ENDPOINTS.CUTTING_NOTEBOOK.UPDATE_LOG(logId), payload);
  },
  deleteLog: (logId) => {
    return axiosClient.delete(API_ENDPOINTS.CUTTING_NOTEBOOK.DELETE_LOG(logId));
  },
};

export default CuttingNotebookService;
