import UserService from '@/services/UserService';
import axiosClient from '@/lib/axios';
import { API_ENDPOINTS } from '@/lib/apiconfig';

vi.mock('@/lib/axios', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

describe('UserService', () => {
  it('gets user profile and returns response.data', async () => {
    axiosClient.get.mockResolvedValue({ data: { id: 1, name: 'A' } });

    const result = await UserService.getUserProfile(1);

    expect(axiosClient.get).toHaveBeenCalledWith(API_ENDPOINTS.USER.GET_USER_PROFILE(1));
    expect(result).toEqual({ id: 1, name: 'A' });
  });

  it('updates user profile and returns response.data', async () => {
    axiosClient.put.mockResolvedValue({ data: { success: true } });

    const payload = { name: 'B' };
    const result = await UserService.updateUserProfile(2, payload);

    expect(axiosClient.put).toHaveBeenCalledWith(API_ENDPOINTS.USER.UPDATE_PROFILE(2), payload);
    expect(result).toEqual({ success: true });
  });
});
