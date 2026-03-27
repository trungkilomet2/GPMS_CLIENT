import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, CircleAlert, LoaderCircle, Pencil } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import AdminUserService, { getAdminRoleProfile, getAdminUserErrorMessage } from "@/services/AdminUserService";
import { AdminBanner, AdminRoleBadge, AdminStatusBadge, getAdminInitials } from "@/pages/admin/adminShared";

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
  const roleProfile = useMemo(() => (user ? getAdminRoleProfile(user.roleKey) : null), [user]);

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
        setError(getAdminUserErrorMessage(err, "Không tải được thông tin user. Vui lòng thử lại."));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchUser();

    return () => {
      mounted = false;
    };
  }, [id, reloadSeed]);

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

      setUser((current) => (current ? { ...current, status: "inactive", statusId: 2, statusName: "Inactive" } : current));
      setNotice(`Đã vô hiệu hóa user ${user.fullName || user.userName}.`);
      setNoticeTone("success");
    } catch (err) {
      setNotice(getAdminUserErrorMessage(err, "Không thể vô hiệu hóa user. Vui lòng thử lại."));
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
              <p className="admin-hero__subtitle">Thông tin tài khoản theo dữ liệu backend hiện có.</p>
            </div>

            {user && !loading ? (
              <div className="admin-hero__actions">
                {user.roleKey ? (
                  <Link to={`/admin/permissions?role=${user.roleKey}`} className="admin-btn admin-btn--secondary">
                    Xem phân quyền
                  </Link>
                ) : null}
                <Link to={`/admin/users/${user.id}/edit`} className="admin-btn admin-btn--primary">
                  <Pencil size={18} />
                  <span>Cập nhật</span>
                </Link>
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-focusable"
                  onClick={handleDisableUser}
                  disabled={user.status === "inactive" || isDisabling}
                >
                  {isDisabling ? <LoaderCircle size={18} className="animate-spin" /> : null}
                  <span>{user.status === "inactive" ? "Đã vô hiệu hóa" : "Khóa tài khoản"}</span>
                </button>
              </div>
            ) : null}
          </div>

          {notice ? <AdminBanner title={notice} tone={noticeTone} /> : null}

          {loading ? (
            <section className="admin-card">
              <div className="admin-state">
                <div className="admin-state__content">
                  <strong>Đang tải thông tin user...</strong>
                  <span>Dữ liệu đang được lấy từ backend.</span>
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
                  <div className="admin-profile__title">{user.roleLabel || "Tài khoản nội bộ"}</div>
                  <div className="admin-profile__meta">
                    <AdminStatusBadge status={user.status} />
                    <AdminRoleBadge tone={user.roleTone}>{user.roleLabel}</AdminRoleBadge>
                    {user.workerRole ? <span className="admin-badge admin-badge--tone-info">{user.workerRole}</span> : null}
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
                      <span className="admin-profile__list-label">Chuyên môn</span>
                      <span className="admin-profile__list-value">{user.workerRole || "Chưa cập nhật"}</span>
                    </div>
                    <div className="admin-profile__list-item">
                      <span className="admin-profile__list-label">Trạng thái</span>
                      <span className="admin-profile__list-value">{user.statusName || (user.status === "active" ? "Active" : "Inactive")}</span>
                    </div>
                  </div>
                </section>

                <section className="admin-card">
                  <div className="admin-card__header">
                    <div>
                      <h2 className="admin-card__title">Thông tin liên hệ</h2>
                      <p className="admin-card__subtitle">Các trường backend đang trả về cho tài khoản này.</p>
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
                      <div className="admin-info-list__label">Vai trò</div>
                      <div className="admin-info-list__value">{user.roleNames?.join(", ") || user.roleLabel}</div>
                    </div>
                  </div>
                </section>
              </div>

              <div className="flex flex-col gap-6">
                <section className="admin-card">
                  <div className="admin-card__header">
                    <div>
                      <h2 className="admin-card__title">Vai trò và phân quyền</h2>
                      <p className="admin-card__subtitle">Điều hướng sang màn phân quyền theo role hiện tại.</p>
                    </div>
                  </div>

                  <div className="admin-note-box">
                    <strong>{roleProfile?.label || user.roleLabel || "Chưa có role"}</strong>
                    <p>{user.roleNames?.join(", ") || "Backend chưa trả danh sách role cho tài khoản này."}</p>
                  </div>

                  <div className="mt-4 admin-info-list">
                    <div className="admin-info-list__item">
                      <div className="admin-info-list__label">Phân quyền</div>
                      <div className="admin-info-list__value">
                        <Link to={`/admin/permissions${user.roleKey ? `?role=${user.roleKey}` : ""}`} className="admin-link-btn admin-link-btn--secondary">
                          Mở màn phân quyền
                        </Link>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
