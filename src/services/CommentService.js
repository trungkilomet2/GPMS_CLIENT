import axiosClient from "../lib/axios";
import { API_ENDPOINTS } from "../lib/apiconfig";

const CommentService = {
    getCommentsByOrderId: (orderId) => {
        return axiosClient.get(API_ENDPOINTS.COMMENT.GET_BY_ORDER(orderId));
    }
}

export default CommentService;