import { fireEvent, render, waitFor } from '@testing-library/react';
import OrderCommentModal from '@/components/OrderCommentModal';
import CommentService from '@/services/CommentService';

vi.mock('@/services/CommentService', () => ({
  default: {
    getCommentsByOrderId: vi.fn(),
    createComment: vi.fn(),
  },
}));

describe('OrderCommentModal', () => {
  it('fetches comments when opened', async () => {
    CommentService.getCommentsByOrderId.mockResolvedValue({
      data: [{ id: 1, fromUserId: 2, content: 'Xin chao', sendDateTime: '2026-03-09T10:00:00' }],
    });

    const { container } = render(
      <OrderCommentModal isOpen onClose={vi.fn()} orderId={9} />
    );

    await waitFor(() => {
      expect(CommentService.getCommentsByOrderId).toHaveBeenCalledWith(9);
    });

    expect(container.textContent).toContain('Xin chao');
  });

  it('sends a new comment and reloads comments', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 2 }));
    CommentService.getCommentsByOrderId.mockResolvedValue({ data: [] });
    CommentService.createComment.mockResolvedValue({ data: {} });

    const { container } = render(
      <OrderCommentModal isOpen onClose={vi.fn()} orderId={3} />
    );

    const textarea = container.querySelector('textarea');
    fireEvent.change(textarea, { target: { value: 'Noi dung moi' } });

    const sendButton = container.querySelectorAll('button')[1];
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(CommentService.createComment).toHaveBeenCalledTimes(1);
    });

    expect(CommentService.getCommentsByOrderId).toHaveBeenCalledWith(3);
  });
});
