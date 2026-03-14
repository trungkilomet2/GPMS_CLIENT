import { useMemo } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, KeyRound, Pencil, ShieldCheck } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { getAdminLogs, getAdminUserById, getPermissionProfile } from "@/lib/admin/adminMockStore";
import {
  AdminBanner,
  AdminOutcomeBadge,
  AdminRoleBadge,
  AdminSeverityBadge,
  AdminStatusBadge,
  formatAdminDateTime,
  getAdminInitials,
} from "@/pages/admin/adminShared";

export default function AdminUserDetail() {
  const { id } = useParams();
  const location = useLocation();
  const user = useMemo(() => getAdminUserById(id), [id]);
  const permissionProfile = useMemo(() => (user ? getPermissionProfile(user.roleKey) : null), [user]);
  const relatedLogs = useMemo(() => {
    if (!user) return [];

    return getAdminLogs()
      .filter((log) => log.actorUserId === user.id || log.targetId === user.id)
      .slice(0, 6);
  }, [user]);

  return (
    <DashboardLayout>
      <div className="admin-page">
        <div className="admin-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="admin-hero">
            <div className="admin-hero__heading">
              <Link to="/admin/users" className="admin-hero__back">
                <ArrowLeft size={18} />
                <span>Quay lại danh sách user</span>
              </Link>
              <h1 className="admin-hero__title">View User Detail Screen</h1>
              <p className="admin-hero__subtitle">
                Màn chi tiết để Admin đọc toàn bộ hồ sơ account, trạng thái bảo mật, phạm vi quyền và hoạt động gần nhất của từng user.
              </p>
            </div>

            {user ? (
              <div className="admin-hero__actions">
                <Link to={`/admin/permissions?role=${user.roleKey}`} className="admin-btn admin-btn--secondary">
                  Manage Permission
                </Link>
                <Link to={`/admin/users/${user.id}/edit`} className="admin-btn admin-btn--primary">
                  <Pencil size={18} />
                  <span>Update User</span>
                </Link>
              </div>
            ) : null}
          </div>

          {location.state?.notice ? (
            <AdminBanner title={location.state.notice} description="Thông tin đã được đồng bộ trong bộ dữ liệu demo của admin module." tone="success" />
          ) : null}

          {!user ? (
            <section className="admin-card">
              <div className="admin-state">
                <div className="admin-state__content">
                  <strong>Không tìm thấy user cần xem</strong>
                  <span>User này có thể chưa tồn tại trong dữ liệu demo hoặc đã bị xóa khỏi phiên làm việc hiện tại.</span>
                </div>
                <div className="admin-state__actions">
                  <Link to="/admin/users" className="admin-btn admin-btn--primary">
                    Quay lại danh sách user
                  </Link>
                </div>
              </div>
            </section>
          ) : (
            <div className="admin-grid admin-grid--detail">
              <div className="flex flex-col gap-6">
                <section className="admin-card admin-profile">
                  <div className="admin-profile__avatar">{getAdminInitials(user.fullName)}</div>
                  <div className="admin-profile__name">{user.fullName}</div>
                  <div className="admin-profile__title">{user.title}</div>
                  <div className="admin-profile__meta">
                    <AdminStatusBadge status={user.status} />
                    <AdminRoleBadge tone={user.roleTone}>{user.roleLabel}</AdminRoleBadge>
                    {user.twoFactorEnabled ? (
                      <span className="admin-badge admin-badge--tone-success">MFA đã bật</span>
                    ) : (
                      <span className="admin-badge admin-badge--tone-warning">Chưa bật MFA</span>
                    )}
                  </div>

                  <div className="admin-profile__list">
                    <div className="admin-profile__list-item">
                      <span className="admin-profile__list-label">Username</span>
                      <span className="admin-profile__list-value">@{user.userName}</span>
                    </div>
                    <div className="admin-profile__list-item">
                      <span className="admin-profile__list-label">Bộ phận</span>
                      <span className="admin-profile__list-value">{user.department}</span>
                    </div>
                    <div className="admin-profile__list-item">
                      <span className="admin-profile__list-label">Lần truy cập cuối</span>
                      <span className="admin-profile__list-value">{formatAdminDateTime(user.lastLogin)}</span>
                    </div>
                    <div className="admin-profile__list-item">
                      <span className="admin-profile__list-label">Số quyền</span>
                      <span className="admin-profile__list-value">{user.grantedPermissionCount} quyền bật</span>
                    </div>
                  </div>
                </section>

                <section className="admin-card">
                  <div className="admin-card__header">
                    <div>
                      <h2 className="admin-card__title">Liên hệ và vận hành</h2>
                      <p className="admin-card__subtitle">Thông tin cơ bản để Admin đối chiếu khi rà soát account.</p>
                    </div>
                  </div>

                  <div className="admin-info-list">
                    <div className="admin-info-list__item">
                      <div className="admin-info-list__label">Email</div>
                      <div className="admin-info-list__value">{user.email}</div>
                    </div>
                    <div className="admin-info-list__item">
                      <div className="admin-info-list__label">Số điện thoại</div>
                      <div className="admin-info-list__value">{user.phoneNumber}</div>
                    </div>
                    <div className="admin-info-list__item">
                      <div className="admin-info-list__label">Khu vực</div>
                      <div className="admin-info-list__value">{user.location || "Chưa cập nhật"}</div>
                    </div>
                    <div className="admin-info-list__item">
                      <div className="admin-info-list__label">Ngày tạo</div>
                      <div className="admin-info-list__value">{formatAdminDateTime(user.createdAt)}</div>
                    </div>
                    <div className="admin-info-list__item">
                      <div className="admin-info-list__label">Cập nhật gần nhất</div>
                      <div className="admin-info-list__value">{formatAdminDateTime(user.updatedAt)}</div>
                    </div>
                  </div>
                </section>
              </div>

              <div className="flex flex-col gap-6">
                <section className="admin-card">
                  <div className="admin-card__header">
                    <div>
                      <h2 className="admin-card__title">Access & permission</h2>
                      <p className="admin-card__subtitle">Role hiện tại, mức độ đặc quyền và ghi chú kiểm soát truy cập.</p>
                    </div>
                  </div>

                  <div className="admin-note-box">
                    <strong>{permissionProfile?.label}</strong>
                    <p>{permissionProfile?.description}</p>
                  </div>

                  <div className="mt-4 admin-chips">
                    {user.tags?.map((tag) => (
                      <span key={tag} className="admin-badge admin-badge--tone-info">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 admin-info-list">
                    <div className="admin-info-list__item">
                      <div className="admin-info-list__label">
                        <ShieldCheck size={16} />
                      </div>
                      <div className="admin-info-list__value">{user.grantedPermissionCount} quyền đang được bật theo role hiện tại.</div>
                    </div>
                    <div className="admin-info-list__item">
                      <div className="admin-info-list__label">
                        <KeyRound size={16} />
                      </div>
                      <div className="admin-info-list__value">
                        {user.twoFactorEnabled
                          ? "Tài khoản đã bật xác thực đa lớp."
                          : "Tài khoản chưa bật MFA, nên được ưu tiên rà soát nếu có quyền nhạy cảm."}
                      </div>
                    </div>
                    <div className="admin-info-list__item">
                      <div className="admin-info-list__label">Ghi chú</div>
                      <div className="admin-info-list__value">{user.notes || "Chưa có ghi chú vận hành."}</div>
                    </div>
                  </div>
                </section>

                <section className="admin-card">
                  <div className="admin-card__header">
                    <div>
                      <h2 className="admin-card__title">Recent system activity</h2>
                      <p className="admin-card__subtitle">Những thay đổi hoặc sự kiện gần nhất liên quan trực tiếp tới user này.</p>
                    </div>
                    <Link to={`/admin/logs?relatedTo=${user.id}`} className="admin-link-btn admin-link-btn--secondary">
                      View System Log
                    </Link>
                  </div>

                  {relatedLogs.length === 0 ? (
                    <div className="admin-note-box">
                      <strong>Chưa có log liên quan</strong>
                      <p>Hiện chưa ghi nhận hoạt động mới cho user này trong dữ liệu demo.</p>
                    </div>
                  ) : (
                    <div className="admin-timeline">
                      {relatedLogs.map((log) => (
                        <div key={log.id} className="admin-timeline__item">
                          <div className="admin-timeline__item-top">
                            <div>
                              <strong>{log.action}</strong>
                              <span>{formatAdminDateTime(log.timestamp)}</span>
                            </div>
                            <div className="admin-chips">
                              <AdminSeverityBadge severity={log.severity} />
                              <AdminOutcomeBadge outcome={log.outcome} />
                            </div>
                          </div>
                          <p>{log.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
