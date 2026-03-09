import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { userService } from "@/services/userService";
import "@/styles/profile.css";

const NAV_ITEMS = [
  { key: "info",     icon: "👤", label: "Thông tin cá nhân" },
  { key: "security", icon: "🔒", label: "Bảo mật" },
  { key: "activity", icon: "📋", label: "Lịch sử hoạt động" },
];

const STATS = [
  { key: "completedOrders", label: "Đơn hoàn thành", fallback: "—" },
  { key: "experience",      label: "Năm kinh nghiệm", fallback: "—" },
  { key: "rating",          label: "Đánh giá tốt",   fallback: "—" },
  { key: "activeProjects",  label: "Dự án hiện tại", fallback: "—" },
];

function getInitials(name = "") {
  return name.split(" ").map(w => w[0]).slice(-2).join("").toUpperCase();
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="profile-info-row">
      <div className="profile-info-icon-wrap">{icon}</div>
      <div>
        <div className="profile-info-label">{label}</div>
        <div className="profile-info-value">
          {value || <span className="muted">Chưa cập nhật</span>}
        </div>
      </div>
    </div>
  );
}

// ── Skeleton loader ──
function Skeleton({ h = 16, w = "100%", radius = 6 }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: radius,
      background: "linear-gradient(90deg,#e8f4ec 25%,#d4ead9 50%,#e8f4ec 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s infinite",
    }} />
  );
}

function SectionInfo({ user, onEdit }) {
  return (
    <>
      <div className="profile-card" style={{ marginBottom: "1.25rem" }}>
        <div className="profile-card-header">
          <div className="profile-card-title"><div className="profile-card-title-dot" />Giới thiệu</div>
        </div>
        <div className="profile-card-body">
          <p style={{ fontSize: ".88rem", color: "var(--text-mid)", lineHeight: 1.7 }}>
            {user.bio
              ? user.bio
              : <span style={{ fontStyle: "italic", color: "var(--text-light)" }}>Chưa có thông tin giới thiệu.</span>
            }
          </p>
          {user.skills?.length > 0 && (
            <div className="profile-tags" style={{ marginTop: "1rem" }}>
              {user.skills.map(s => <span key={s} className="profile-tag">{s}</span>)}
            </div>
          )}
        </div>
      </div>

      <div className="profile-card">
        <div className="profile-card-header">
          <div className="profile-card-title"><div className="profile-card-title-dot" />Thông tin liên hệ</div>
          <button className="profile-edit-btn secondary" style={{ padding: ".4rem .9rem", fontSize: ".78rem" }} onClick={onEdit}>
            ✏️ Chỉnh sửa
          </button>
        </div>
        <div className="profile-card-body">
          <InfoRow icon="✉️" label="Email"         value={user.email} />
          <InfoRow icon="📞" label="Điện thoại"    value={user.phone} />
          <InfoRow icon="📍" label="Địa chỉ"       value={user.address} />
          <InfoRow icon="🏢" label="Phòng ban"     value={user.department} />
          <InfoRow icon="🎭" label="Vai trò"       value={user.role} />
          <InfoRow icon="📅" label="Ngày tham gia" value={user.joinDate} />
        </div>
      </div>
    </>
  );
}

function SectionSecurity() {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [msg,  setMsg]  = useState(null);

  const handle = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.next !== form.confirm)
      return setMsg({ type: "error", text: "Mật khẩu mới không khớp." });
    if (form.next.length < 6)
      return setMsg({ type: "error", text: "Mật khẩu phải có ít nhất 6 ký tự." });
    // TODO: gọi API đổi mật khẩu
    setMsg({ type: "success", text: "Đổi mật khẩu thành công!" });
    setForm({ current: "", next: "", confirm: "" });
    setTimeout(() => setMsg(null), 3000);
  };

  return (
    <div className="profile-card">
      <div className="profile-card-header">
        <div className="profile-card-title"><div className="profile-card-title-dot" />Đổi mật khẩu</div>
      </div>
      <div className="profile-card-body">
        {msg && (
          <div style={{
            padding: ".75rem 1rem", borderRadius: 8, marginBottom: "1rem",
            background: msg.type === "success" ? "var(--green-light)" : "#fef2f2",
            color:      msg.type === "success" ? "var(--green)"       : "#dc2626",
            fontSize: ".84rem", fontWeight: 600,
          }}>
            {msg.type === "success" ? "✅" : "⚠️"}&nbsp;{msg.text}
          </div>
        )}
        <form onSubmit={handleSubmit} style={{ maxWidth: 420 }}>
          {[
            { name: "current", label: "Mật khẩu hiện tại" },
            { name: "next",    label: "Mật khẩu mới" },
            { name: "confirm", label: "Xác nhận mật khẩu mới" },
          ].map(f => (
            <div key={f.name} className="profile-form-group">
              <label className="profile-form-label">{f.label}</label>
              <input type="password" name={f.name} className="profile-form-input"
                placeholder="••••••••" value={form[f.name]} onChange={handle} />
            </div>
          ))}
          <button type="submit" className="profile-edit-btn" style={{ marginTop: ".5rem" }}>
            🔒&nbsp;Cập nhật mật khẩu
          </button>
        </form>
      </div>
    </div>
  );
}

function SectionActivity({ activities = [] }) {
  return (
    <div className="profile-card">
      <div className="profile-card-header">
        <div className="profile-card-title"><div className="profile-card-title-dot" />Lịch sử hoạt động</div>
      </div>
      <div className="profile-card-body">
        {activities.length === 0
          ? <p style={{ fontSize: ".85rem", color: "var(--text-light)", fontStyle: "italic" }}>Chưa có hoạt động nào.</p>
          : activities.map((a, i) => (
            <div key={i} className="profile-activity-item">
              <div className="profile-activity-dot-wrap">
                <div className="profile-activity-dot" />
                <div className="profile-activity-line" />
              </div>
              <div style={{ flex: 1 }}>
                <div className="profile-activity-title">{a.title}</div>
                <div className="profile-activity-desc">{a.description}</div>
                <div className="profile-activity-time">🕐 {a.time}</div>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ══ MAIN ══
export default function ViewProfile() {
  const navigate = useNavigate();
  const [tab,      setTab]      = useState("info");
  const [profile,  setProfile]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
  const stored = localStorage.getItem("user");

  if (!stored) {
    navigate("/login");
    return;
  }

  userService.getProfile()
    .then(data => setProfile(data))
    .catch(err => setError(err?.response?.data?.message || "Không thể tải hồ sơ."))
    .finally(() => setLoading(false));
}, []);

  // ── Loading state ──
  if (loading) return (
    <div className="profile-page">
      <div className="profile-cover" />
      <div className="profile-avatar-row">
        <Skeleton h={112} w={112} radius={56} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <Skeleton h={24} w={200} />
          <Skeleton h={16} w={140} />
        </div>
      </div>
      <div className="profile-layout">
        <aside style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <Skeleton h={120} radius={12} />
          <Skeleton h={160} radius={12} />
        </aside>
        <main style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <Skeleton h={100} radius={14} />
          <Skeleton h={260} radius={14} />
        </main>
      </div>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );

  // ── Error state ──
  if (error) return (
    <div className="profile-page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>⚠️</div>
        <div style={{ fontWeight: 700, color: "var(--text)", marginBottom: ".5rem" }}>{error}</div>
        <button className="profile-edit-btn" onClick={() => window.location.reload()}>Thử lại</button>
      </div>
    </div>
  );

  const name = profile?.fullName || profile?.name || "Người dùng";

  return (
    <div className="profile-page">
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      {/* Cover */}
      <div className="profile-cover">
        <div className="profile-cover-ring profile-cover-ring-1" />
        <div className="profile-cover-ring profile-cover-ring-2" />
        <div className="profile-cover-ring profile-cover-ring-3" />
      </div>

      {/* Avatar row */}
      <div className="profile-avatar-row">
        <div className="profile-avatar-wrap">
          {profile?.avatarUrl
            ? <img src={profile.avatarUrl} alt="avatar" className="profile-avatar" />
            : <div className="profile-avatar">{getInitials(name)}</div>
          }
          <div className="profile-avatar-badge"><div className="profile-avatar-badge-dot" /></div>
        </div>

        <div className="profile-name-block">
          <div className="profile-name">{name}</div>
          <div className="profile-role-badge">
            <div className="profile-role-dot" />
            {profile?.role || "Người dùng"}
            {profile?.department && <>&nbsp;·&nbsp;{profile.department}</>}
          </div>
        </div>

        <div style={{ display: "flex", gap: ".65rem", marginBottom: ".5rem" }}>
          <button className="profile-edit-btn secondary" onClick={() => navigate(-1)}>← Quay lại</button>
          <button className="profile-edit-btn" onClick={() => navigate("/profile/edit")}>✏️ Chỉnh sửa</button>
        </div>
      </div>

      {/* Layout */}
      <div className="profile-layout">

        {/* Sidebar */}
        <aside style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* Stats */}
          <div className="profile-stat-grid">
            {STATS.map(s => (
              <div key={s.key} className="profile-stat-item">
                <div className="profile-stat-val">{profile?.[s.key] ?? s.fallback}</div>
                <div className="profile-stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Nav */}
          <div className="profile-card">
            <div className="profile-card-body" style={{ padding: ".75rem" }}>
              <div className="profile-sidenav">
                {NAV_ITEMS.map((item, i) => (
                  <div key={item.key}>
                    {i === NAV_ITEMS.length - 1 && <div className="profile-sidenav-divider" />}
                    <button
                      className={`profile-sidenav-item${tab === item.key ? " active" : ""}`}
                      onClick={() => setTab(item.key)}
                    >
                      <div className="profile-sidenav-icon">{item.icon}</div>
                      {item.label}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick contact */}
          <div className="profile-card">
            <div className="profile-card-header">
              <div className="profile-card-title"><div className="profile-card-title-dot" />Liên hệ nhanh</div>
            </div>
            <div className="profile-card-body" style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
              {[["✉️", profile?.email], ["📞", profile?.phone]].map(([ic, val]) => val && (
                <div key={val} style={{ display: "flex", gap: ".6rem", alignItems: "center", fontSize: ".82rem", color: "var(--text-mid)" }}>
                  <span>{ic}</span><span style={{ wordBreak: "break-all" }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

        </aside>

        {/* Content */}
        <main>
          {tab === "info"     && <SectionInfo user={profile} onEdit={() => navigate("/profile/edit")} />}
          {tab === "security" && <SectionSecurity />}
          {tab === "activity" && <SectionActivity activities={profile?.activities || []} />}
        </main>

      </div>
    </div>
  );
}