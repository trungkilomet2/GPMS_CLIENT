import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, CircleAlert, KeyRound, LoaderCircle, Pencil, ShieldCheck } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { getAdminLogs } from "@/lib/admin/adminMockStore";
import AdminUserService, { getAdminRoleProfile, getAdminUserErrorMessage } from "@/services/AdminUserService";
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
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [notice, setNotice] = useState(location.state?.notice || "");
  const [noticeTone, setNoticeTone] = useState(location.state?.notice ? "success" : "info");
  const [isDisabling, setIsDisabling] = useState(false);
  const [reloadSeed, setReloadSeed] = useState(0);
  const permissionProfile = useMemo(() => (user ? getAdminRoleProfile(user.roleKey) : null), [user]);

  useEffect(() => {
    if (location.state?.notice) {
      setNotice(location.state.notice);
      setNoticeTone("success");
    }
  }, [location.state]);

  useEffect(() => {
    let mounted = true;

    const fetchUser = async () => {
      setLoading(true);
      setError("");
      setNotFound(false);

      try {
        const foundUser = await AdminUserService.getUserById(id);
        if (!mounted) return;

        if (!foundUser) {
          setNotFound(true);
          setError("Không tìm thấy user cần xem.");
          setUser(null);
          return;
        }

        setUser(foundUser);
      } catch (err) {
        if (!mounted) return;

        setError(
          getAdminUserErrorMessage(
            err,
            "Không tải được thông tin user. Vui lòng thử lại."
          )
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchUser();

    return () => {
      mounted = false;
    };
  }, [id, reloadSeed]);

  const relatedLogs = useMemo(() => {
    if (!user) return [];

    return getAdminLogs()
      .filter((log) => log.actorUserId === user.id || log.targetId === user.id)
      .slice(0, 6);
  }, [user]);

  const handleRetry = () => {
    setReloadSeed((current) => current + 1);
  };

  const handleDisableUser = async () => {
    if (!user?.id || user.status === "inactive" || isDisabling) {
      return;
    }

    const shouldDisable = window.confirm(
      `Bạn có chắc muốn vô hiệu hóa tài khoản của ${user.fullName || user.userName || "user này"} không?`
    );

    if (!shouldDisable) return;

    setIsDisabling(true);

    try {
      const response = await AdminUserService.disableUser(user.id);
      if (response?.currentUserSignedOut) {
        return;
      }

      setUser((current) => (
        current
          ? { ...current, status: "inactive", statusId: 2 }
          : current
      ));
      setNotice(`Đã vô hiệu hóa user ${user.fullName || user.userName}.`);
      setNoticeTone("success");
    } catch (err) {
      setNotice(
        getAdminUserErrorMessage(
          err,
          "Không thể vô hiệu hóa user. Vui lòng thử lại."
        )
      );
      setNoticeTone("warning");
    } finally {
      setIsDisabling(false);
    }
  };

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
              <h1 className="admin-hero__title">Chi tiết tài khoản</h1>
              <p className="admin-hero__subtitle">
                Xem đầy đủ hồ sơ tài khoản, trạng thái bảo mật, phạm vi quyền và hoạt động gần nhất của từng người dùng.
              </p>
            </div>

            {user && !loading ? (
              <div className="admin-hero__actions">
                {user.roleKey ? (
                  <Link to={`/admin/permissions?role=${user.roleKey}`} className="admin-btn admin-btn--secondary">
                    Quản lý quyền
                  </Link>
                ) : null}
                <Link to={`/admin/users/${user.id}/edit`} className="admin-btn admin-btn--primary">
                  <Pencil size={18} />
                  <span>Cập nhật tài khoản</span>
                </Link>
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-focusable"
                  onClick={handleDisableUser}
                  disabled={user.status === "inactive" || isDisabling}
                >
                  {isDisabling ? <LoaderCircle size={18} className="animate-spin" /> : null}
                  <span>
                    {user.status === "inactive" ? "Đã vô hiệu hóa" : "Vô hiệu hóa tài khoản"}
                  </span>
                </button>
              </div>
            ) : null}
          </div>

          {notice ? (
            <AdminBanner title={notice} description="Phần log bên dưới hiện vẫn là dữ liệu mẫu." tone={noticeTone} />
          ) : null}

          {!loading && !error && user ? (
          <AdminBanner
              title="Hồ sơ user đang đọc từ endpoint admin detail."
              description="Thông tin liên hệ, avatar, trạng thái, role và chuyên môn thợ đang lấy trực tiếp từ backend."
              tone="info"
            />
          ) : null}

          {loading ? (
            <section className="admin-card">
              <div className="admin-state">
                <div className="admin-state__content">
                  <strong>Đang tải thông tin user...</strong>
                  <span>Hồ sơ đang được lấy từ hệ thống admin.</span>
                </div>
                <div className="admin-state__actions">
                  <LoaderCircle size={20} className="animate-spin" />
                </div>
              </div>
            </section>
          ) : error ? (
            <section className="admin-card">
              <div className="admin-state">
                <div className="admin-state__content">
                  <strong>{notFound ? "Không tìm thấy user cần xem" : "Không tải được hồ sơ user"}</strong>
                  <span>{error}</span>
                </div>
                <div className="admin-state__actions">
                  {!notFound ? (
                    <button type="button" className="admin-btn admin-btn--secondary admin-focusable" onClick={handleRetry}>
                      <CircleAlert size={18} />
                      <span>Thử lại</span>
                    </button>
                  ) : null}
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
                  <div className="admin-profile__avatar">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.fullName} className="h-full w-full rounded-full object-cover" />
                    ) : (
                      getAdminInitials(user.fullName)
                    )}
                  </div>
                  <div className="admin-profile__name">{user.fullName}</div>
                  <div className="admin-profile__title">{user.roleShortLabel || "Tài khoản nội bộ"}</div>
                  <div className="admin-profile__meta">
                    <AdminStatusBadge status={user.status} />
                    <AdminRoleBadge tone={user.roleTone}>{user.roleLabel}</AdminRoleBadge>
                    {user.workerRole ? (
                      <span className="admin-badge admin-badge--tone-info">{user.workerRole}</span>
                    ) : null}
                  </div>

                  <div className="admin-profile__list">
                    <div className="admin-profile__list-item">
                      <span className="admin-profile__list-label">Username</span>
                      <span className="admin-profile__list-value">@{user.userName}</span>
                    </div>
                    <div className="admin-profile__list-item">
                      <span className="admin-profile__list-label">ID user</span>
                      <span className="admin-profile__list-value">{user.id ?? "Chưa cập nhật"}</span>
                    </div>
                    <div className="admin-profile__list-item">
                      <span className="admin-profile__list-label">Đồng bộ gần nhất</span>
                      <span className="admin-profile__list-value">{formatAdminDateTime(user.updatedAt || user.createdAt || user.lastLogin)}</span>
                    </div>
                    <div className="admin-profile__list-item">
                      <span className="admin-profile__list-label">Chuyên môn thợ</span>
                      <span className="admin-profile__list-value">
                        {user.workerRole || "Chưa gán chuyên môn thợ"}
                      </span>
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
                      <div className="admin-info-list__value">{user.email || "Chưa cập nhật"}</div>
                    </div>
                    <div className="admin-info-list__item">
                      <div className="admin-info-list__label">Số điện thoại</div>
                      <div className="admin-info-list__value">{user.phoneNumber || "Chưa cập nhật"}</div>
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
                    <div className="admin-info-list__item">
                      <div className="admin-info-list__label">Role backend</div>
                      <div className="admin-info-list__value">{user.roleNames?.join(", ") || user.roleLabel}</div>
                    </div>
                  </div>
                </section>
              </div>

              <div className="flex flex-col gap-6">
                <section className="admin-card">
                  <div className="admin-card__header">
                  <div>
                    <h2 className="admin-card__title">Quyền truy cập và phân quyền</h2>
                    <p className="admin-card__subtitle">Vai trò hiện tại và phạm vi chức năng hệ thống đang hiển thị theo vai trò đó.</p>
                  </div>
                </div>

                  <div className="admin-note-box">
                    <strong>{permissionProfile?.label || "Chưa đồng bộ role"}</strong>
                    <p>{permissionProfile?.description || "Backend hiện chưa trả role cho user này, nên web chưa thể hiển thị phần quyền tương ứng."}</p>
                  </div>

                  <div className="mt-4 admin-info-list">
                    <div className="admin-info-list__item">
                      <div className="admin-info-list__label">
                        <ShieldCheck size={16} />
                      </div>
                      <div className="admin-info-list__value">
                        {user.hasKnownRole
                          ? `${user.grantedPermissionCount} quyền đang được hiển thị theo role hiện tại.`
                          : "Chưa có role từ backend để hiển thị phần quyền."}
                      </div>
                    </div>
                    <div className="admin-info-list__item">
                      <div className="admin-info-list__label">
                        <KeyRound size={16} />
                      </div>
                      <div className="admin-info-list__value">
                        {user.status === "active"
                          ? "Tài khoản đang ở trạng thái hoạt động."
                          : "Tài khoản đã bị vô hiệu hóa trên hệ thống."}
                      </div>
                    </div>
                    <div className="admin-info-list__item">
                      <div className="admin-info-list__label">Ghi chú</div>
                      <div className="admin-info-list__value">
                        Chuyên môn thợ hiện đang phản ánh theo endpoint detail. MFA và audit trail vẫn sẽ cần endpoint riêng nếu muốn hiển thị chuẩn hoàn toàn.
                      </div>
                    </div>
                  </div>
                </section>

                <section className="admin-card">
                  <div className="admin-card__header">
                    <div>
                    <h2 className="admin-card__title">Hoạt động hệ thống gần đây</h2>
                    <p className="admin-card__subtitle">Những thay đổi hoặc sự kiện gần nhất liên quan tới tài khoản này, nếu có.</p>
                    </div>
                    <Link to={`/admin/logs?relatedTo=${user.id}`} className="admin-link-btn admin-link-btn--secondary">
                      Xem nhật ký hệ thống
                    </Link>
                  </div>

                  {relatedLogs.length === 0 ? (
                    <div className="admin-note-box">
                      <strong>Chưa có log liên quan</strong>
                      <p>Hiện chưa ghi nhận hoạt động mới cho user này hoặc log chưa khớp với id backend.</p>
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
