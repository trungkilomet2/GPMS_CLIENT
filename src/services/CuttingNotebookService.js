import axiosClient from "@/lib/axios";
import { API_ENDPOINTS } from "@/lib/apiconfig";

const CuttingNotebookService = {
  createNotebook: (payload) => {
    return axiosClient.post(API_ENDPOINTS.CUTTING_NOTEBOOK.CREATE, payload);
  },
  createLog: (notebookId, payload) => {
    return axiosClient.post(API_ENDPOINTS.CUTTING_NOTEBOOK.CREATE_LOG(notebookId), payload);
  },
};

export default CuttingNotebookService;
