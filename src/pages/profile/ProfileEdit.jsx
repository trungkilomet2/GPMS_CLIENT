import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { userService } from "@/services/userService";
import "@/styles/profile.css";

/* ── tiny skeleton reused from ViewProfile ── */
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

/* ── labelled field ── */
function Field({ label, required, children, hint }) {
  return (
    <div className="profile-form-group" style={{ marginBottom: "1.1rem" }}>
      <label className="profile-form-label">
        {label}
        {required && <span style={{ color: "var(--green)", marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {hint && (
        <div style={{ fontSize: ".73rem", color: "var(--text-light)", marginTop: ".3rem" }}>{hint}</div>
      )}
    </div>
  );
}

/* ── section wrapper matching ViewProfile cards ── */
function EditCard({ title, children, action }) {
  return (
    <div className="profile-card" style={{ marginBottom: "1.25rem" }}>
      <div className="profile-card-header">
        <div className="profile-card-title">
          <div className="profile-card-title-dot" />
          {title}
        </div>
        {action}
      </div>
      <div className="profile-card-body">{children}</div>
    </div>
  );
}

/* ── avatar upload button overlay ── */
function AvatarUploader({ src, initials, uploading, onChange }) {
  const inputRef = useRef();
  return (
    <div
      className="profile-avatar-wrap"
      style={{ cursor: "pointer" }}
      onClick={() => inputRef.current?.click()}
      title="Nhấn để đổi ảnh đại diện"
    >
      {src
        ? <img src={src} alt="avatar" className="profile-avatar" />
        : (
          <div className="profile-avatar" style={{ fontSize: "2.6rem" }}>
            {initials}
          </div>
        )
      }

      {/* hover overlay */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        background: "rgba(0,0,0,.38)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        opacity: uploading ? 1 : 0,
        transition: ".2s",
        border: "4px solid #fff",
        pointerEvents: "none",
      }}
        className="avatar-overlay"
      >
        {uploading
          ? <span style={{ color: "#fff", fontSize: ".7rem", fontWeight: 700 }}>Đang tải…</span>
          : <>
            <span style={{ fontSize: "1.3rem" }}>📷</span>
            <span style={{ color: "#fff", fontSize: ".65rem", fontWeight: 700, marginTop: 2 }}>Đổi ảnh</span>
          </>
        }
      </div>

      {/* always-visible camera badge */}
      <label className="profile-avatar-upload" style={{ pointerEvents: "none" }}>📷</label>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={onChange}
      />
    </div>
  );
}

/* ════════════════════════════════════════
   MAIN
════════════════════════════════════════ */
export default function ProfileEdit() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    bio: "",
    avatarUrl: "",
  });

  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [uploading,    setUploading]    = useState(false);
  const [preview,      setPreview]      = useState(null);
  const [error,        setError]        = useState(null);
  const [successMsg,   setSuccessMsg]   = useState(null);
  const [touched,      setTouched]      = useState({});

  /* ── load ── */
  useEffect(() => {
    userService.getProfile()
      .then(data => setForm({
        fullName:  data.fullName  || "",
        email:     data.email     || "",
        phone:     data.phone     || "",
        address:   data.address   || "",
        bio:       data.bio       || "",
        avatarUrl: data.avatarUrl || "",
      }))
      .catch(() => setError("Không thể tải hồ sơ."))
      .finally(() => setLoading(false));
  }, []);

  /* ── field change ── */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    setTouched(p => ({ ...p, [name]: true }));
    setError(null);
  };

  /* ── avatar upload ── */
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    const fd = new FormData();
    fd.append("file", file);
    try {
      setUploading(true);
      const res  = await fetch("http://26.250.4.244:5229/api/Upload/avatar", { method: "POST", body: fd });
      const data = await res.json();
      setForm(p => ({ ...p, avatarUrl: data.url }));
    } catch (err) {
      console.error("Upload avatar failed", err);
    } finally {
      setUploading(false);
    }
  };

  /* ── validation ── */
  const validate = () => {
    if (!form.fullName.trim()) return "Vui lòng nhập họ tên.";
    if (!form.email.trim())    return "Vui lòng nhập email.";
    if (!/\S+@\S+\.\S+/.test(form.email)) return "Email không hợp lệ.";
    if (!form.phone.trim())    return "Vui lòng nhập số điện thoại.";
    if (!form.address.trim())  return "Vui lòng nhập địa chỉ.";
    return null;
  };

  /* ── save ── */
  const handleSave = async (e) => {
    e.preventDefault();
    setTouched({ fullName: true, email: true, phone: true, address: true });
    const err = validate();
    if (err) return setError(err);
    try {
      setSaving(true);
      setError(null);
      await userService.updateProfile(form);
      setSuccessMsg("Hồ sơ đã được cập nhật thành công!");
      setTimeout(() => navigate("/profile"), 1400);
    } catch (err) {
      setError(err?.response?.data?.message || "Cập nhật thất bại.");
    } finally {
      setSaving(false);
    }
  };

  /* ── initials ── */
  const initials = form.fullName
    ? form.fullName.split(" ").map(w => w[0]).slice(-2).join("").toUpperCase()
    : "?";

  /* ── loading ── */
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
      <div className="profile-layout" style={{ gridTemplateColumns: "1fr", maxWidth: 720 }}>
        <Skeleton h={300} radius={14} />
      </div>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );

  return (
    <div className="profile-page">
      <style>{`
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .avatar-overlay{opacity:0;}
        .profile-avatar-wrap:hover .avatar-overlay{opacity:1;}
        .profile-avatar-wrap:hover .profile-avatar-upload{opacity:0;}
        @keyframes slideDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        .msg-banner{animation:slideDown .25s ease}
      `}</style>

      {/* ── Cover ── */}
      <div className="profile-cover">
        <div className="profile-cover-ring profile-cover-ring-1" />
        <div className="profile-cover-ring profile-cover-ring-2" />
        <div className="profile-cover-ring profile-cover-ring-3" />
        {/* edit badge on cover */}
        <div style={{
          position: "absolute", top: "1rem", right: "1.5rem",
          background: "rgba(255,255,255,.18)", backdropFilter: "blur(8px)",
          borderRadius: 10, padding: ".4rem .9rem",
          fontSize: ".74rem", fontWeight: 700, color: "#fff",
          border: "1px solid rgba(255,255,255,.3)",
          letterSpacing: ".04em",
        }}>
          ✏️ &nbsp;Chế độ chỉnh sửa
        </div>
      </div>

      {/* ── Avatar row ── */}
      <div className="profile-avatar-row">
        <AvatarUploader
          src={preview || form.avatarUrl}
          initials={initials}
          uploading={uploading}
          onChange={handleAvatarUpload}
        />

        <div className="profile-name-block">
          <div className="profile-name">
            {form.fullName || <span style={{ color: "var(--text-light)", fontStyle: "italic" }}>Họ tên chưa nhập</span>}
          </div>
          <div className="profile-role-badge">
            <div className="profile-role-dot" />
            Đang chỉnh sửa hồ sơ
          </div>
        </div>

        <div style={{ display: "flex", gap: ".65rem", marginBottom: ".5rem" }}>
          <button className="profile-edit-btn secondary" onClick={() => navigate("/profile")}>
            ← Huỷ
          </button>
          <button
            className="profile-edit-btn"
            onClick={handleSave}
            disabled={saving || uploading}
            style={{ opacity: (saving || uploading) ? .7 : 1 }}
          >
            {saving ? "⏳ Đang lưu…" : "💾 Lưu hồ sơ"}
          </button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 2rem" }}>
        {error && (
          <div className="profile-error msg-banner">
            ⚠️&nbsp; {error}
          </div>
        )}
        {successMsg && (
          <div className="profile-success msg-banner">
            ✅&nbsp; {successMsg}
          </div>
        )}
      </div>

      {/* ── Form layout ── */}
      <div className="profile-layout" style={{ gridTemplateColumns: "1fr" }}>
        <main>

          {/* Personal info */}
          <EditCard title="Thông tin cá nhân">
            <div className="profile-edit-grid">
              <Field label="Họ và tên" required>
                <input
                  className="profile-form-input"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="Nguyễn Văn A"
                  style={touched.fullName && !form.fullName.trim() ? { borderColor: "#dc2626" } : {}}
                />
                {touched.fullName && !form.fullName.trim() && (
                  <div style={{ color: "#dc2626", fontSize: ".73rem", marginTop: ".25rem" }}>Bắt buộc</div>
                )}
              </Field>

              <Field label="Email" required>
                <input
                  className="profile-form-input"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="example@email.com"
                  style={touched.email && !form.email.trim() ? { borderColor: "#dc2626" } : {}}
                />
                {touched.email && !form.email.trim() && (
                  <div style={{ color: "#dc2626", fontSize: ".73rem", marginTop: ".25rem" }}>Bắt buộc</div>
                )}
              </Field>

              <Field label="Số điện thoại" required>
                <input
                  className="profile-form-input"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="(+84) 123 456 789"
                  style={touched.phone && !form.phone.trim() ? { borderColor: "#dc2626" } : {}}
                />
                {touched.phone && !form.phone.trim() && (
                  <div style={{ color: "#dc2626", fontSize: ".73rem", marginTop: ".25rem" }}>Bắt buộc</div>
                )}
              </Field>

              <Field label="Địa chỉ" required>
                <input
                  className="profile-form-input"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="123 Đường ABC, Quận 1, TP.HCM"
                  style={touched.address && !form.address.trim() ? { borderColor: "#dc2626" } : {}}
                />
                {touched.address && !form.address.trim() && (
                  <div style={{ color: "#dc2626", fontSize: ".73rem", marginTop: ".25rem" }}>Bắt buộc</div>
                )}
              </Field>
            </div>
          </EditCard>

          {/* Bio */}
          <EditCard title="Giới thiệu bản thân">
            <Field label="Tiểu sử" hint="Tối đa 300 ký tự. Hiển thị trên trang hồ sơ của bạn.">
              <textarea
                className="profile-form-input"
                name="bio"
                rows={4}
                value={form.bio}
                onChange={handleChange}
                placeholder="Mô tả ngắn về bản thân, kinh nghiệm, chuyên môn…"
                maxLength={300}
                style={{ resize: "vertical" }}
              />
              <div style={{
                textAlign: "right", fontSize: ".72rem",
                color: form.bio.length > 260 ? "var(--green)" : "var(--text-light)",
                marginTop: ".25rem",
              }}>
                {form.bio.length} / 300
              </div>
            </Field>

            {/* Live preview */}
            {form.bio && (
              <div className="profile-bio-preview">
                <div className="profile-bio-preview-title">Xem trước</div>
                <div className="profile-bio-preview-text">{form.bio}</div>
              </div>
            )}
          </EditCard>

          {/* Action row (bottom) */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: ".75rem", marginTop: ".5rem" }}>
            <button className="profile-edit-btn secondary" onClick={() => navigate("/profile")}>
              ✕&nbsp; Huỷ bỏ
            </button>
            <button
              className="profile-edit-btn"
              onClick={handleSave}
              disabled={saving || uploading}
              style={{ opacity: (saving || uploading) ? .7 : 1, minWidth: 140 }}
            >
              {saving ? "⏳ Đang lưu…" : "💾 Lưu hồ sơ"}
            </button>
          </div>

        </main>
      </div>
    </div>
  );
}