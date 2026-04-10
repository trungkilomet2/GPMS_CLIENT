import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, CircleAlert, KeyRound, LoaderCircle, Pencil, ShieldCheck } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import AdminUserService, { getAdminRoleProfile, getAdminUserErrorMessage } from "@/services/AdminUserService";
import LogService from "@/services/LogService";
import {
  AdminBanner,
  AdminOutcomeBadge,
  AdminRoleBadge,
  AdminSeverityBadge,
  AdminStatusBadge,
  formatAdminDateTime,
  getAdminInitials,
} from "@/pages/admin/adminShared";

function normalizeSearchText(value = "") {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function extractPropertyValue(properties = "", key = "") {
  if (!properties || !key) return "";

  const escapedKey = String(key).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<property key='${escapedKey}'>([\\s\\S]*?)<\\/property>`, "i");
  const match = String(properties).match(pattern);
  if (!match) return "";

  return match[1]
    .replace(/<[^>]+>/g, " ")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLogItem(item = {}) {
  const properties = String(item.properties ?? "").trim();
  const level = String(item.level ?? "Information").trim();
  const hasException = Boolean(String(item.exception ?? "").trim());

  return {
    id: item.id ?? Math.random().toString(36).slice(2),
    action:
      extractPropertyValue(properties, "ActionName") ||
      String(item.messageTemplate ?? item.message ?? "Hoạt động hệ thống").trim(),
    description:
      String(item.message ?? "").trim() ||
      String(item.messageTemplate ?? "").trim() ||
      "Hệ thống đã ghi nhận một thay đổi liên quan tới tài khoản này.",
    timestamp: item.timeStemp ?? item.timeStamp ?? item.timestamp ?? item.createdAt ?? "",
    severity: level.toLowerCase() === "warning" ? "warning" : hasException || level.toLowerCase() === "error" ? "danger" : "info",
    outcome: hasException || level.toLowerCase() === "error" ? "failure" : level.toLowerCase() === "warning" ? "warning" : "success",
    searchableText: normalizeSearchText(
      [
        item.message,
        item.messageTemplate,
        properties,
        extractPropertyValue(properties, "RequestPath"),
        extractPropertyValue(properties, "UserName"),
        extractPropertyValue(properties, "ActionName"),
        extractPropertyValue(properties, "TargetId"),
      ].join(" ")
    ),
  };
}

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
  const [isEnabling, setIsEnabling] = useState(false);
  const [reloadSeed, setReloadSeed] = useState(0);
  const [activityLogs, setActivityLogs] = useState([]);
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
          setError("Không tìm thấy tài khoản cần xem.");
          setUser(null);
          return;
        }

        setUser(foundUser);
      } catch (err) {
        if (!mounted) return;

        setError(
          getAdminUserErrorMessage(
            err,
            "Không tải được thông tin tài khoản. Vui lòng thử lại."
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

  useEffect(() => {
    let mounted = true;

    const fetchRelatedLogs = async () => {
      if (!user?.id) {
        if (mounted) setActivityLogs([]);
        return;
      }

      try {
        const response = await LogService.getAllPages({
          pageSize: 100,
          pageIndex: 0,
          sortColumn: "Name",
          sortOrder: "DESC",
        });

        if (!mounted) return;

        const userIdText = String(user.id);
        const userNameText = normalizeSearchText(user.userName);
        const fullNameText = normalizeSearchText(user.fullName);

        const matchedLogs = (Array.isArray(response?.data) ? response.data : [])
          .map(normalizeLogItem)
          .filter((log) => {
            const haystack = log.searchableText;
            return (
              haystack.includes(userIdText) ||
              (userNameText && haystack.includes(userNameText)) ||
              (fullNameText && haystack.includes(fullNameText))
            );
          })
          .slice(0, 6);

        setActivityLogs(matchedLogs);
      } catch {
        if (mounted) setActivityLogs([]);
      }
    };

    fetchRelatedLogs();

    return () => {
      mounted = false;
    };
  }, [user]);

  const handleRetry = () => {
    setReloadSeed((current) => current + 1);
  };

  const handleDisableUser = async () => {
    if (!user?.id || user.status === "inactive" || isDisabling) {
      return;
    }

    const shouldDisable = window.confirm(
      `Bạn có chắc muốn vô hiệu hóa tài khoản của ${user.fullName || user.userName || "tài khoản này"} không?`
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
      setNotice(`Đã vô hiệu hóa tài khoản ${user.fullName || user.userName}.`);
      setNoticeTone("success");
    } catch (err) {
      setNotice(
        getAdminUserErrorMessage(
          err,
          "Không thể vô hiệu hóa tài khoản. Vui lòng thử lại."
        )
      );
      setNoticeTone("warning");
    } finally {
      setIsDisabling(false);
    }
  };

  const handleEnableUser = async () => {
    if (!user?.id || user.status === "active" || isEnabling) {
      return;
    }

    const shouldEnable = window.confirm(
      `Bạn có chắc muốn kích hoạt lại tài khoản của ${user.fullName || user.userName || "tài khoản này"} không?`
    );

    if (!shouldEnable) return;

    setIsEnabling(true);

    try {
      await AdminUserService.enableUser(user.id);
      setUser((current) => (
        current
          ? { ...current, status: "active", statusId: 1 }
          : current
      ));
      setNotice(`Đã kích hoạt lại tài khoản ${user.fullName || user.userName}.`);
      setNoticeTone("success");
    } catch (err) {
      setNotice(
        getAdminUserErrorMessage(
          err,
          "Không thể kích hoạt lại tài khoản. Vui lòng thử lại."
        )
      );
      setNoticeTone("warning");
    } finally {
      setIsEnabling(false);
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
                <span>Quay lại danh sách tài khoản</span>
              </Link>
              <h1 className="admin-hero__title">Chi tiết tài khoản</h1>
              <p className="admin-hero__subtitle">
                Xem đầy đủ hồ sơ tài khoản, trạng thái bảo mật, phạm vi quyền và hoạt động gần nhất của từng tài khoản.
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
                  onClick={user.status === "active" ? handleDisableUser : handleEnableUser}
                  disabled={user.status === "active" ? isDisabling : isEnabling}
                >
                  {user.status === "active"
                    ? (isDisabling ? <LoaderCircle size={18} className="animate-spin" /> : null)
                    : (isEnabling ? <LoaderCircle size={18} className="animate-spin" /> : null)}
                  <span>
                    {user.status === "active" ? "Vô hiệu hóa tài khoản" : "Kích hoạt lại tài khoản"}
                  </span>
                </button>
              </div>
            ) : null}
          </div>

          {notice ? (
            <AdminBanner title={notice} description="Thông tin đã được cập nhật và đồng bộ lên màn hình này." tone={noticeTone} />
          ) : null}

          {!loading && !error && user ? (
          <AdminBanner
              title={user.detailAvailable === false ? "Hồ sơ tài khoản đang hiển thị theo dữ liệu danh sách." : "Hồ sơ tài khoản đang hiển thị theo dữ liệu chi tiết."}
              description={user.detailAvailable === false
                ? "Hệ thống chưa trả đủ dữ liệu chi tiết cho tài khoản này, nên màn hình đang dùng tạm dữ liệu từ danh sách quản trị."
                : "Thông tin liên hệ, ảnh đại diện, trạng thái, vai trò và chuyên môn đang lấy trực tiếp từ hệ thống."}
              tone="info"
            />
          ) : null}

          {loading ? (
            <section className="admin-card">
              <div className="admin-state">
                <div className="admin-state__content">
                  <strong>Đang tải thông tin tài khoản...</strong>
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
                  <strong>{notFound ? "Không tìm thấy tài khoản cần xem" : "Không tải được hồ sơ tài khoản"}</strong>
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
                    Quay lại danh sách tài khoản
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
                      <span className="admin-profile__list-label">Tên đăng nhập</span>
                      <span className="admin-profile__list-value">@{user.userName}</span>
                    </div>
                    <div className="admin-profile__list-item">
                      <span className="admin-profile__list-label">Mã tài khoản</span>
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
                      <p className="admin-card__subtitle">Thông tin cơ bản để quản trị viên đối chiếu khi rà soát tài khoản.</p>
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
                      <div className="admin-info-list__label">Vai trò từ hệ thống</div>
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
                    <strong>{permissionProfile?.label || "Chưa đồng bộ vai trò"}</strong>
                      <p>{permissionProfile?.description || "Hệ thống hiện chưa trả vai trò cho tài khoản này, nên màn hình chưa thể hiển thị phần quyền tương ứng."}</p>
                  </div>

                  <div className="mt-4 admin-info-list">
                    <div className="admin-info-list__item">
                      <div className="admin-info-list__label">
                        <ShieldCheck size={16} />
                      </div>
                      <div className="admin-info-list__value">
                        {user.hasKnownRole
                          ? `${user.grantedPermissionCount} quyền đang được hiển thị theo vai trò hiện tại.`
                          : "Chưa có vai trò từ hệ thống để hiển thị phần quyền."}
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
                        Chuyên môn thợ hiện đang phản ánh theo phần chi tiết của hệ thống. Xác thực hai lớp và lịch sử kiểm tra vẫn sẽ cần luồng riêng nếu muốn hiển thị chuẩn hoàn toàn.
                      </div>
                    </div>
                  </div>
                </section>

                <section className="admin-card">
                  <div className="admin-card__header">
                    <div>
                    <h2 className="admin-card__title">Hoạt động gần đây</h2>
                    <p className="admin-card__subtitle">Những thay đổi hoặc sự kiện gần nhất liên quan tới tài khoản này, nếu có.</p>
                    </div>
                    <Link to={`/admin/logs?relatedTo=${user.id}`} className="admin-link-btn admin-link-btn--secondary">
                      Xem nhật ký hệ thống
                    </Link>
                  </div>

                  {activityLogs.length === 0 ? (
                    <div className="admin-note-box">
                      <strong>Chưa có log liên quan</strong>
                      <p>Hiện chưa có nhật ký hệ thống khớp với tài khoản này hoặc dữ liệu log chưa trả đủ thông tin nhận diện.</p>
                    </div>
                  ) : (
                    <div className="admin-timeline">
                      {activityLogs.map((log) => (
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
