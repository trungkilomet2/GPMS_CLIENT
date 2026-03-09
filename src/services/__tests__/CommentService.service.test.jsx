import CommentService from '@/services/CommentService';
import axiosClient from '@/lib/axios';
import { API_ENDPOINTS } from '@/lib/apiconfig';

vi.mock('@/lib/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('CommentService', () => {
  it('calls getCommentsByOrderId endpoint', () => {
    CommentService.getCommentsByOrderId(11);
    expect(axiosClient.get).toHaveBeenCalledWith(API_ENDPOINTS.COMMENT.GET_BY_ORDER(11));
  });

  it('calls createComment endpoint with payload', () => {
    const payload = { content: 'hello' };
    CommentService.createComment(payload);
    expect(axiosClient.post).toHaveBeenCalledWith(API_ENDPOINTS.COMMENT.CREATE_COMMENT, payload);
  });
});
