import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "@/styles/profile.css";

function getInitials(name = "") {
  return name.split(" ").map(w => w[0]).slice(-2).join("").toUpperCase();
}

function FormField({ label, name, value, onChange, type = "text", placeholder = "" }) {
  return (
    <div className="profile-form-group">
      <label className="profile-form-label">{label}</label>
      <input
        type={type}
        name={name}
        className="profile-form-input"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </div>
  );
}

export default function ProfileEdit() {
  const navigate = useNavigate();

  const stored   = localStorage.getItem("user");
  const authUser = stored ? JSON.parse(stored) : {};

  const [form, setForm] = useState({
    name:       authUser.name       ?? "Nguyễn Văn Hùng",
    email:      authUser.email      ?? "hung.nguyen@garmentpro.vn",
    phone:      authUser.phone      ?? "(+84) 098 765 4321",
    address:    authUser.address    ?? "123 Đường Láng, Đống Đa, Hà Nội",
    department: authUser.department ?? "Xưởng may Hà Nội",
    bio:        authUser.bio        ?? "Quản lý vận hành xưởng may với hơn 5 năm kinh nghiệm trong ngành dệt may xuất khẩu.",
  });

  const [saved, setSaved] = useState(false);

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSave = (e) => {
    e.preventDefault();
    // Lưu lại localStorage (thay bằng API call thật)
    const updated = { ...authUser, ...form };
    localStorage.setItem("user", JSON.stringify(updated));
    window.dispatchEvent(new Event("auth-change"));
    setSaved(true);
    setTimeout(() => { setSaved(false); navigate("/profile"); }, 1500);
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
          <div className="profile-avatar">{getInitials(form.name)}</div>
          {/* Upload avatar button */}
          <button style={{
            position: "absolute", bottom: 4, right: 4,
            width: 28, height: 28, borderRadius: "50%",
            background: "var(--green)", border: "2px solid #fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontSize: ".75rem",
          }} title="Đổi ảnh đại diện">📷</button>
        </div>

        <div className="profile-name-block">
          <div className="profile-name">{form.name || "Tên của bạn"}</div>
          <div className="profile-role-badge">
            <div className="profile-role-dot" />
            Đang chỉnh sửa hồ sơ
          </div>
        </div>

        <div style={{ display: "flex", gap: ".65rem", marginBottom: ".5rem" }}>
          <button className="profile-edit-btn secondary" onClick={() => navigate("/profile")}>✕ Hủy</button>
        </div>
      </div>

      {/* Form layout */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 2rem 4rem" }}>

        {saved && (
          <div style={{
            background: "var(--green-light)", color: "var(--green)",
            border: "1px solid rgba(30,110,67,.25)",
            borderRadius: 10, padding: ".85rem 1.2rem",
            marginBottom: "1.25rem", fontWeight: 700, fontSize: ".88rem",
            display: "flex", alignItems: "center", gap: ".6rem",
            animation: "heroIn .4s ease both",
          }}>
            ✅ Lưu thành công! Đang chuyển hướng...
          </div>
        )}

        <form onSubmit={handleSave}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }} className="profile-edit-grid">

            {/* Thông tin cá nhân */}
            <div className="profile-card">
              <div className="profile-card-header">
                <div className="profile-card-title"><div className="profile-card-title-dot" />Thông tin cá nhân</div>
              </div>
              <div className="profile-card-body">
                <FormField label="Họ và tên"   name="name"    value={form.name}    onChange={handle} placeholder="Nguyễn Văn A" />
                <FormField label="Email"        name="email"   value={form.email}   onChange={handle} type="email" placeholder="email@example.com" />
                <FormField label="Điện thoại"   name="phone"   value={form.phone}   onChange={handle} placeholder="(+84) 0xx xxx xxx" />
                <FormField label="Địa chỉ"      name="address" value={form.address} onChange={handle} placeholder="Số nhà, đường, quận, thành phố" />
                <FormField label="Phòng ban"    name="department" value={form.department} onChange={handle} placeholder="Xưởng may ..." />
              </div>
            </div>

            {/* Giới thiệu */}
            <div className="profile-card">
              <div className="profile-card-header">
                <div className="profile-card-title"><div className="profile-card-title-dot" />Giới thiệu bản thân</div>
              </div>
              <div className="profile-card-body">
                <div className="profile-form-group">
                  <label className="profile-form-label">Bio</label>
                  <textarea
                    name="bio"
                    className="profile-form-input"
                    rows={6}
                    value={form.bio}
                    onChange={handle}
                    placeholder="Mô tả ngắn về bản thân, kinh nghiệm..."
                    style={{ resize: "vertical", lineHeight: 1.6 }}
                  />
                </div>

                {/* Preview */}
                <div style={{
                  background: "var(--sand)", borderRadius: 10,
                  padding: "1rem", marginTop: ".5rem",
                  border: "1px solid var(--border)",
                }}>
                  <div style={{ fontSize: ".72rem", fontWeight: 700, color: "var(--text-light)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: ".6rem" }}>
                    Xem trước
                  </div>
                  <div style={{ fontSize: ".84rem", color: "var(--text-mid)", lineHeight: 1.7 }}>
                    {form.bio || <span style={{ fontStyle: "italic", color: "var(--text-light)" }}>Chưa có mô tả.</span>}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="profile-edit-btn secondary" onClick={() => navigate("/profile")}>
              Hủy thay đổi
            </button>
            <button type="submit" className="profile-edit-btn">
              💾&nbsp;Lưu hồ sơ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}