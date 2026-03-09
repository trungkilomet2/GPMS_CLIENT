import { buildBreadcrumbs } from '@/lib/navigation';

describe('buildBreadcrumbs', () => {
  it('returns breadcrumb trail for order detail path', () => {
    const result = buildBreadcrumbs('/orders/detail/42');

    expect(result.map((x) => x.label)).toEqual(['Trang chủ', 'Đơn hàng', 'Chi tiết đơn #42']);
  });

  it('returns empty array for unknown path', () => {
    expect(buildBreadcrumbs('/unknown')).toEqual([]);
  });

  it('returns profile edit breadcrumb trail', () => {
    const result = buildBreadcrumbs('/profile/edit');
    expect(result.map((x) => x.label)).toEqual(['Trang chủ', 'Hồ sơ cá nhân', 'Chỉnh sửa hồ sơ']);
  });
});
