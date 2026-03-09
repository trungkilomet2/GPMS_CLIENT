import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "@/styles/profile.css";

// ── Mock data — thay bằng API call / store thật ──
const MOCK_USER = {
  name:       "Nguyễn Văn Hùng",
  email:      "hung.nguyen@garmentpro.vn",
  phone:      "(+84) 098 765 4321",
  role:       "Quản lý xưởng",
  department: "Xưởng may Hà Nội",
  joinDate:   "15/03/2022",
  address:    "123 Đường Láng, Đống Đa, Hà Nội",
  avatarUrl:  null,
  bio:        "Quản lý vận hành xưởng may với hơn 5 năm kinh nghiệm trong ngành dệt may xuất khẩu.",
};

const STATS = [
  { val: "128", label: "Đơn hoàn thành" },
  { val: "5",   label: "Năm kinh nghiệm" },
  { val: "98%", label: "Đánh giá tốt" },
  { val: "12",  label: "Dự án hiện tại" },
];

const SKILLS = [
  "Quản lý đơn hàng", "Kế hoạch sản xuất", "Kiểm soát chất lượng",
  "Excel / ERP", "Quản lý nhân sự", "Logistics",
];

const ACTIVITIES = [
  { title: "Cập nhật đơn hàng #DH2024-089",   desc: "Đã chuyển trạng thái sang Đang sản xuất.", time: "2 giờ trước"   },
  { title: "Phê duyệt kế hoạch tuần 12",       desc: "Xác nhận phân công 3 tổ sản xuất.",        time: "Hôm qua"       },
  { title: "Kiểm tra chất lượng lô hàng #045", desc: "Ghi nhận 2 lỗi nhỏ, đã xử lý xong.",      time: "2 ngày trước"  },
  { title: "Thêm mới đơn hàng #DH2024-090",    desc: "Khách hàng: Công ty TNHH Thời Trang ABC.", time: "3 ngày trước"  },
];

const NAV_ITEMS = [
  { key: "info",     icon: "👤", label: "Thông tin cá nhân" },
  { key: "security", icon: "🔒", label: "Bảo mật" },
  { key: "activity", icon: "📋", label: "Lịch sử hoạt động" },
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
        <div className="profile-info-value">{value || <span className="muted">Chưa cập nhật</span>}</div>
      </div>
    </div>
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
            {user.bio || <span style={{ fontStyle: "italic", color: "var(--text-light)" }}>Chưa có thông tin giới thiệu.</span>}
          </p>
          <div className="profile-tags" style={{ marginTop: "1rem" }}>
            {SKILLS.map(s => <span key={s} className="profile-tag">{s}</span>)}
          </div>
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
          <InfoRow icon="✉️" label="Email"          value={user.email} />
          <InfoRow icon="📞" label="Điện thoại"     value={user.phone} />
          <InfoRow icon="📍" label="Địa chỉ"        value={user.address} />
          <InfoRow icon="🏢" label="Phòng ban"      value={user.department} />
          <InfoRow icon="📅" label="Ngày tham gia"  value={user.joinDate} />
        </div>
      </div>
    </>
  );
}

function SectionSecurity() {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [msg,  setMsg]  = useState(null);

  const handle = (e) => {
    e.preventDefault();
    if (form.next !== form.confirm) return setMsg({ type: "error",   text: "Mật khẩu mới không khớp." });
    if (form.next.length < 6)       return setMsg({ type: "error",   text: "Mật khẩu phải có ít nhất 6 ký tự." });
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
        <form onSubmit={handle} style={{ maxWidth: 420 }}>
          {[
            { key: "current", label: "Mật khẩu hiện tại" },
            { key: "next",    label: "Mật khẩu mới" },
            { key: "confirm", label: "Xác nhận mật khẩu mới" },
          ].map(f => (
            <div key={f.key} className="profile-form-group">
              <label className="profile-form-label">{f.label}</label>
              <input type="password" className="profile-form-input" placeholder="••••••••"
                value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
            </div>
          ))}
          <button type="submit" className="profile-edit-btn" style={{ marginTop: ".5rem" }}>
            🔒&nbsp;Cập nhật mật khẩu
          </button>
        </form>

        <div style={{ borderTop: "1px solid var(--border)", margin: "1.75rem 0" }} />
        <div style={{ fontSize: ".88rem", fontWeight: 700, color: "var(--text)", marginBottom: "1rem" }}>Phiên đăng nhập</div>
        {[
          { device: "💻 Chrome / Windows", location: "Hà Nội, VN", time: "Đang hoạt động", current: true },
          { device: "📱 Safari / iPhone",  location: "Hà Nội, VN", time: "2 ngày trước",   current: false },
        ].map((s, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: ".75rem 1rem", borderRadius: 10, marginBottom: ".65rem", fontSize: ".82rem",
            background: s.current ? "var(--green-light)" : "var(--sand)",
            border: `1px solid ${s.current ? "rgba(30,110,67,.2)" : "var(--border)"}`,
          }}>
            <div>
              <div style={{ fontWeight: 600, color: "var(--text)" }}>{s.device}</div>
              <div style={{ color: "var(--text-light)", fontSize: ".75rem" }}>{s.location} · {s.time}</div>
            </div>
            {s.current
              ? <span style={{ color: "var(--green)", fontWeight: 700, fontSize: ".72rem", background: "rgba(30,110,67,.1)", padding: ".2rem .6rem", borderRadius: 20 }}>● Hiện tại</span>
              : <button style={{ background: "none", border: "none", color: "#dc2626", fontSize: ".78rem", cursor: "pointer", fontWeight: 600 }}>Đăng xuất</button>}
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionActivity() {
  return (
    <div className="profile-card">
      <div className="profile-card-header">
        <div className="profile-card-title"><div className="profile-card-title-dot" />Lịch sử hoạt động</div>
      </div>
      <div className="profile-card-body">
        {ACTIVITIES.map((a, i) => (
          <div key={i} className="profile-activity-item">
            <div className="profile-activity-dot-wrap">
              <div className="profile-activity-dot" />
              <div className="profile-activity-line" />
            </div>
            <div style={{ flex: 1 }}>
              <div className="profile-activity-title">{a.title}</div>
              <div className="profile-activity-desc">{a.desc}</div>
              <div className="profile-activity-time">🕐 {a.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══ MAIN ══
export default function ViewProfile() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("info");

  const stored  = localStorage.getItem("user");
  const authUser = stored ? JSON.parse(stored) : null;
  const user = {
    ...MOCK_USER,
    ...(authUser?.name  && { name:  authUser.name }),
    ...(authUser?.email && { email: authUser.email }),
  };

  return (
    <div className="profile-page">

      {/* Cover */}
      <div className="profile-cover">
        <div className="profile-cover-ring profile-cover-ring-1" />
        <div className="profile-cover-ring profile-cover-ring-2" />
        <div className="profile-cover-ring profile-cover-ring-3" />
      </div>

      {/* Avatar row */}
      <div className="profile-avatar-row">
        <div className="profile-avatar-wrap">
          {user.avatarUrl
            ? <img src={user.avatarUrl} alt="avatar" className="profile-avatar" />
            : <div className="profile-avatar">{getInitials(user.name)}</div>}
          <div className="profile-avatar-badge"><div className="profile-avatar-badge-dot" /></div>
        </div>

        <div className="profile-name-block">
          <div className="profile-name">{user.name}</div>
          <div className="profile-role-badge">
            <div className="profile-role-dot" />
            {user.role}&nbsp;·&nbsp;{user.department}
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
          <div className="profile-stat-grid">
            {STATS.map(s => (
              <div key={s.label} className="profile-stat-item">
                <div className="profile-stat-val">{s.val}</div>
                <div className="profile-stat-label">{s.label}</div>
              </div>
            ))}
          </div>

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

          <div className="profile-card">
            <div className="profile-card-header">
              <div className="profile-card-title"><div className="profile-card-title-dot" />Liên hệ nhanh</div>
            </div>
            <div className="profile-card-body" style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
              {[["✉️", user.email], ["📞", user.phone]].map(([ic, val]) => (
                <div key={val} style={{ display: "flex", gap: ".6rem", alignItems: "center", fontSize: ".82rem", color: "var(--text-mid)" }}>
                  <span>{ic}</span><span style={{ wordBreak: "break-all" }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Content */}
        <main>
          {tab === "info"     && <SectionInfo user={user} onEdit={() => navigate("/profile/edit")} />}
          {tab === "security" && <SectionSecurity />}
          {tab === "activity" && <SectionActivity />}
        </main>

      </div>
    </div>
  );
}