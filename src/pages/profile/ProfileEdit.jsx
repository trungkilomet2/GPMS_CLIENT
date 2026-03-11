import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { userService } from "@/services/userService";
import Header from "@/components/Header";

/* ─── Design tokens ─── */
const T = {
  dark:   "#0d4225", mid:    "#186637", base:   "#1e8a47",
  light:  "#eaf4ee", border: "#d0e8d9", sand:   "#f4f7f5",
  white:  "#ffffff", text:   "#18291f", textMid:"#4a6456",
  textLt: "#8ca898", red:    "#dc2626", redBg:  "#fef2f2", redBd: "#fecaca",
};

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700;800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  button,input,textarea,select{font-family:inherit}
  @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
  @keyframes slideDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
  .pf-input:focus{border-color:${T.base}!important;box-shadow:0 0 0 3px ${T.light}!important;outline:none}
  .pf-btn-primary:hover:not(:disabled){background:${T.mid}!important;transform:translateY(-1px)}
  .pf-btn-secondary:hover{background:${T.light}!important}
  .pf-avatar-wrap:hover .pf-avatar-overlay{opacity:1!important}
  @media(max-width:768px){
    .pf-edit-grid{grid-template-columns:1fr!important}
    .pf-avatar-row{flex-wrap:wrap;margin-top:-40px!important;padding:0 1rem!important}
    .pf-cover{height:160px!important}
    .pf-layout-single{padding:0 1rem 3rem!important}
    .pf-actions{flex-wrap:wrap}
  }
`;

/* ─── Helpers ─── */
function getInitials(name = "") {
  return name.split(" ").map(w => w[0]).filter(Boolean).slice(-2).join("").toUpperCase();
}

/* ─── Skeleton ─── */
function Sk({ h = 16, w = "100%", r = 8 }) {
  return <div style={{
    height: h, width: w, borderRadius: r,
    background: `linear-gradient(90deg,${T.light} 25%,${T.border} 50%,${T.light} 75%)`,
    backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite",
  }} />;
}

/* ─── Atoms ─── */
function RoleBadge({ children }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: ".35rem",
      background: T.light, color: T.mid, fontSize: ".72rem", fontWeight: 700,
      padding: ".25rem .75rem", borderRadius: 20, border: `1px solid ${T.border}`,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: T.base, display: "inline-block" }} />
      {children}
    </span>
  );
}

function CoverRings() {
  return <>
    {[{ w: 280, h: 280, top: -120, right: -40 }, { w: 180, h: 180, top: -48, right: 28 }, { w: 120, h: 120, bottom: -36, left: "12%" }]
      .map((s, i) => (
        <div key={i} style={{
          position: "absolute", borderRadius: "50%",
          border: "1px solid rgba(255,255,255,.1)",
          width: s.w, height: s.h, top: s.top, right: s.right, bottom: s.bottom, left: s.left,
        }} />
      ))}
  </>;
}

function CardSection({ title, children, mb = "1.25rem" }) {
  return (
    <div style={{
      background: T.white, borderRadius: 16, border: `1px solid ${T.border}`,
      boxShadow: "0 2px 14px rgba(0,0,0,.05)", overflow: "hidden", marginBottom: mb,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: ".45rem",
        padding: "1rem 1.4rem", borderBottom: `1px solid ${T.border}`,
        background: T.sand, fontWeight: 700, fontSize: ".9rem", color: T.text,
      }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: T.base, display: "inline-block" }} />
        {title}
      </div>
      <div style={{ padding: "1.25rem 1.4rem" }}>{children}</div>
    </div>
  );
}

/* ─── FormField ─── */
function FormField({ label, required, error, hint, children }) {
  return (
    <div style={{ marginBottom: "1.05rem" }}>
      <label style={{
        display: "block", fontSize: ".75rem", fontWeight: 700,
        color: T.textMid, marginBottom: ".3rem",
        textTransform: "uppercase", letterSpacing: ".04em",
      }}>
        {label}
        {required && <span style={{ color: T.red, marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {error && <div style={{ fontSize: ".73rem", color: T.red, marginTop: ".25rem" }}>⚠ {error}</div>}
      {!error && hint && <div style={{ fontSize: ".73rem", color: T.textLt, marginTop: ".25rem" }}>{hint}</div>}
    </div>
  );
}

/* ─── Input ─── */
function Input({ name, value, onChange, type = "text", placeholder = "", hasError }) {
  return (
    <input
      className="pf-input"
      type={type} name={name} value={value ?? ""} onChange={onChange}
      placeholder={placeholder}
      style={{
        width: "100%", padding: ".65rem .9rem",
        border: `1.5px solid ${hasError ? T.red : T.border}`,
        borderRadius: 8, fontSize: ".88rem",
        background: T.white, color: T.text, transition: ".15s",
      }}
    />
  );
}

/* ─── Buttons ─── */
function BtnPrimary({ onClick, disabled, type = "button", children }) {
  return (
    <button type={type} className="pf-btn-primary" onClick={onClick} disabled={disabled} style={{
      display: "inline-flex", alignItems: "center", gap: ".45rem",
      background: disabled ? "#a0c8b0" : T.base,
      color: "#fff", border: "none",
      padding: ".63rem 1.35rem", borderRadius: 8,
      fontWeight: 700, fontSize: ".84rem",
      cursor: disabled ? "not-allowed" : "pointer",
      boxShadow: disabled ? "none" : `0 3px 12px rgba(30,138,71,.28)`,
      transition: ".15s",
    }}>{children}</button>
  );
}

function BtnSecondary({ onClick, children }) {
  return (
    <button type="button" className="pf-btn-secondary" onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: ".45rem",
      background: "transparent", color: T.mid, border: `2px solid ${T.base}`,
      padding: ".61rem 1.35rem", borderRadius: 8,
      fontWeight: 700, fontSize: ".84rem", cursor: "pointer", transition: ".15s",
    }}>{children}</button>
  );
}

/* ─── Avatar uploader ─── */
function AvatarUploader({ src, initials, uploading, onChange }) {
  const ref = useRef();
  return (
    <div
      className="pf-avatar-wrap"
      style={{ position: "relative", flexShrink: 0, cursor: "pointer" }}
      onClick={() => ref.current?.click()}
      title="Nhấn để đổi ảnh đại diện"
    >
      {src
        ? <img src={src} alt="avatar" style={{ width: 80, height: 80, borderRadius: "50%", border: "3px solid #fff", objectFit: "cover", boxShadow: "0 6px 18px rgba(0,0,0,.14)" }} />
        : <div style={{ width: 80, height: 80, borderRadius: "50%", border: "3px solid #fff", background: T.light, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", fontWeight: 800, color: T.mid, boxShadow: "0 6px 18px rgba(0,0,0,.14)" }}>{initials}</div>
      }

      {/* hover overlay */}
      <div className="pf-avatar-overlay" style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        background: "rgba(0,0,0,.42)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        opacity: uploading ? 1 : 0, transition: ".2s",
        border: "3px solid #fff", pointerEvents: "none",
      }}>
        {uploading
          ? <span style={{ color: "#fff", fontSize: ".7rem", fontWeight: 700 }}>Đang tải…</span>
          : <><span style={{ fontSize: "1rem" }}>📷</span><span style={{ color: "#fff", fontSize: ".58rem", fontWeight: 700, marginTop: 2 }}>Đổi ảnh</span></>
        }
      </div>

      {/* badge */}
      <div style={{
        position: "absolute", bottom: 2, right: 2, width: 22, height: 22,
        borderRadius: "50%", background: T.base, border: "2px solid #fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: ".62rem", pointerEvents: "none",
      }}>📷</div>

      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }} onChange={onChange} />
    </div>
  );
}

/* ═════════════════════════════
   MAIN COMPONENT
═════════════════════════════ */
export default function ProfileEdit() {
  const navigate = useNavigate();

  const buildLocalProfile = (user) => ({
    fullName: user?.fullName ?? user?.name ?? "",
    email: user?.email ?? "",
    phoneNumber: user?.phoneNumber ?? user?.phone ?? "",
    location: user?.location ?? user?.address ?? "",
    avatarUrl: user?.avatarUrl ?? user?.avartarUrl ?? "",
  });

  // ── form fields khớp đúng tên API ──
  // API fields: FullName, PhoneNumber, AvartarUrl (file), Location, Email
  const [form, setForm] = useState({
    FullName:    "",
    Email:       "",
    PhoneNumber: "",
    Location:    "",   // tương ứng với "address" hiển thị
  });

  const [avatarFile,  setAvatarFile]  = useState(null);   // File object gửi lên API
  const [avatarPreview, setAvatarPreview] = useState(null); // URL preview local

  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [msg,       setMsg]       = useState(null);   // {type, text}
  const [touched,   setTouched]   = useState({});

  /* ── Load profile ── */
  useEffect(() => {
    const stored = localStorage.getItem("user");
    const user   = stored ? JSON.parse(stored) : null;
    if (!user) { navigate("/login"); return; }

    const fallback = buildLocalProfile(user);
    setForm({
      FullName: fallback.fullName,
      Email: fallback.email,
      PhoneNumber: fallback.phoneNumber,
      Location: fallback.location,
    });
    if (fallback.avatarUrl) {
      setAvatarPreview(fallback.avatarUrl);
    }

    userService.getProfile(user.userId ?? user.id)
      .then(data => {
        setForm({
          FullName:    data.fullName    ?? data.FullName    ?? "",
          Email:       data.email       ?? data.Email       ?? "",
          PhoneNumber: data.phoneNumber ?? data.PhoneNumber ?? data.phone ?? "",
          Location:    data.location    ?? data.Location    ?? data.address ?? "",
        });
        // Nếu đã có avatar URL thì dùng làm preview
        if (data.avartarUrl || data.avatarUrl) {
          setAvatarPreview(data.avartarUrl ?? data.avatarUrl);
        }
      })
      .catch(() => {
        if (!fallback.fullName && !fallback.email) {
          setMsg({ type: "error", text: "Không thể tải hồ sơ." });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  /* ── Field change ── */
  const handle = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    setTouched(p => ({ ...p, [name]: true }));
    if (msg?.type === "error") setMsg(null);
  };

  /* ── Avatar: chọn file → preview ngay, lưu File object ── */
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  /* ── Validation ── */
  const validate = () => {
    const errs = {};
    if (!form.FullName.trim())    errs.FullName    = "Bắt buộc nhập họ tên";
    if (!form.Email.trim())       errs.Email       = "Bắt buộc nhập email";
    else if (!/\S+@\S+\.\S+/.test(form.Email)) errs.Email = "Email không hợp lệ";
    if (!form.PhoneNumber.trim()) errs.PhoneNumber = "Bắt buộc nhập số điện thoại";
    if (!form.Location.trim())    errs.Location    = "Bắt buộc nhập địa chỉ";
    return errs;
  };

  /* ── Save: gửi multipart/form-data ── */
  const handleSave = async (e) => {
    e.preventDefault();
    setTouched({ FullName: true, Email: true, PhoneNumber: true, Location: true });

    const errs = validate();
    if (Object.keys(errs).length) {
      setMsg({ type: "error", text: "Vui lòng kiểm tra lại các trường bắt buộc." });
      return;
    }

    try {
      setSaving(true);
      setMsg(null);

      const stored = localStorage.getItem("user");
      const user   = stored ? JSON.parse(stored) : null;

      // Tạo FormData gửi đúng theo API
      const fd = new FormData();
      fd.append("FullName",    form.FullName);
      fd.append("PhoneNumber", form.PhoneNumber);
      fd.append("Location",    form.Location);
      fd.append("Email",       form.Email);

      // AvartarUrl là file binary — chỉ append nếu user chọn file mới
      if (avatarFile) {
        fd.append("AvartarUrl", avatarFile);
      }

      await userService.updateProfile(user.userId ?? user.id, fd);

      setMsg({ type: "success", text: "Lưu hồ sơ thành công!" });
      setTimeout(() => navigate("/profile"), 1400);
    } catch (err) {
      const errData = err?.response?.data;
      const errMsg  = errData?.title || errData?.message
        || Object.values(errData?.errors || {}).flat()[0]
        || "Lưu thất bại. Vui lòng thử lại.";
      setMsg({ type: "error", text: errMsg });
    } finally {
      setSaving(false);
    }
  };

  const errs     = validate();
  const initials = getInitials(form.FullName);

  /* ── Loading ── */
  if (loading) return (
    <div style={{ fontFamily: "'Lexend','Be Vietnam Pro','Segoe UI',sans-serif", overflowX: "hidden", background: "#fff" }}>
      <Header />
      <div style={{ minHeight: "100vh", background: T.sand, fontFamily: "'Lexend','Be Vietnam Pro','Segoe UI',sans-serif" }}>
        <style>{GLOBAL_CSS}</style>
        <div style={{ height: 150, background: `linear-gradient(120deg,${T.dark},${T.base})` }} />
        <div style={{ maxWidth: 960, margin: "-20px auto 1.5rem", padding: "0 2rem", display: "flex", alignItems: "flex-end", gap: "1rem", position: "relative", zIndex: 2 }}>
          <Sk h={80} w={80} r={40} />
          <div style={{ flex: 1, paddingBottom: ".5rem", display: "flex", flexDirection: "column", gap: 8 }}>
            <Sk h={26} w={200} /><Sk h={18} w={130} />
          </div>
        </div>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 2rem 4rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <Sk h={260} r={14} /><Sk h={200} r={14} />
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Lexend','Be Vietnam Pro','Segoe UI',sans-serif", overflowX: "hidden", background: "#fff" }}>
      <Header />
      <div style={{ minHeight: "100vh", background: T.sand, fontFamily: "'Lexend','Be Vietnam Pro','Segoe UI',sans-serif" }}>
        <style>{GLOBAL_CSS}</style>

        {/* ── Cover ── */}
        <div className="pf-cover" style={{ height: 150, background: `linear-gradient(120deg,${T.dark} 0%,${T.mid} 50%,${T.base} 100%)`, position: "relative", overflow: "hidden" }}>
          <CoverRings />
          <div style={{
            position: "absolute", top: ".85rem", right: "1rem",
            background: "rgba(255,255,255,.15)", backdropFilter: "blur(8px)",
            borderRadius: 999, padding: ".32rem .72rem",
            fontSize: ".68rem", fontWeight: 700, color: "#fff",
            border: "1px solid rgba(255,255,255,.25)", letterSpacing: ".04em",
          }}>✏️ &nbsp;Chế độ chỉnh sửa</div>
        </div>

        {/* ── Avatar row ── */}
        <div className="pf-avatar-row" style={{ maxWidth: 960, margin: "-20px auto 1.5rem", padding: "0 2rem", display: "flex", alignItems: "flex-end", gap: "1rem", animation: "fadeUp .35s ease", position: "relative", zIndex: 2 }}>
          <AvatarUploader
            src={avatarPreview}
            initials={initials || "?"}
            uploading={false}
            onChange={handleAvatarChange}
          />
          <div style={{ flex: 1, paddingBottom: ".5rem" }}>
            <div style={{ fontSize: "1.2rem", fontWeight: 800, color: T.text, marginBottom: ".25rem" }}>
              {form.FullName || <span style={{ color: T.textLt, fontStyle: "italic" }}>Chưa nhập họ tên</span>}
            </div>
            <RoleBadge>Đang chỉnh sửa hồ sơ</RoleBadge>
          </div>
          <div className="pf-actions" style={{ display: "flex", gap: ".65rem", marginBottom: ".5rem" }}>
            <BtnSecondary onClick={() => navigate("/profile")}>✕ Huỷ</BtnSecondary>
            <BtnPrimary onClick={handleSave} disabled={saving}>
              {saving ? "⏳ Đang lưu…" : "💾 Lưu hồ sơ"}
            </BtnPrimary>
          </div>
        </div>

        {/* ── Message banner ── */}
        {msg && (
          <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 2rem .5rem", animation: "slideDown .25s ease" }}>
            <div style={{
              padding: ".85rem 1.1rem", borderRadius: 10,
              background: msg.type === "success" ? T.light : T.redBg,
              color: msg.type === "success" ? T.mid : T.red,
              border: `1px solid ${msg.type === "success" ? T.border : T.redBd}`,
              fontWeight: 700, fontSize: ".88rem",
              display: "flex", alignItems: "center", gap: ".6rem",
            }}>
              {msg.type === "success" ? "✅" : "⚠️"}&nbsp;{msg.text}
            </div>
          </div>
        )}

        {/* ── Form ── */}
        <form onSubmit={handleSave}>
          <div className="pf-layout-single" style={{ maxWidth: 960, margin: "0 auto", padding: "1rem 2rem 4rem" }}>

          {/* 2-col grid */}
          <div className="pf-edit-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>

            {/* ─ Thông tin cá nhân ─ */}
            <CardSection title="Thông tin cá nhân" mb="0">
              <FormField label="Họ và tên" required error={touched.FullName && errs.FullName}>
                <Input name="FullName" value={form.FullName} onChange={handle}
                  placeholder="Nguyễn Văn A" hasError={!!(touched.FullName && errs.FullName)} />
              </FormField>

              <FormField label="Email" required error={touched.Email && errs.Email}>
                <Input name="Email" type="email" value={form.Email} onChange={handle}
                  placeholder="email@example.com" hasError={!!(touched.Email && errs.Email)} />
              </FormField>

              <FormField label="Số điện thoại" required error={touched.PhoneNumber && errs.PhoneNumber}>
                <Input name="PhoneNumber" value={form.PhoneNumber} onChange={handle}
                  placeholder="(+84) 0xx xxx xxx" hasError={!!(touched.PhoneNumber && errs.PhoneNumber)} />
              </FormField>

              <FormField label="Địa chỉ / Khu vực" required error={touched.Location && errs.Location}>
                <Input name="Location" value={form.Location} onChange={handle}
                  placeholder="Số nhà, đường, quận, thành phố" hasError={!!(touched.Location && errs.Location)} />
              </FormField>

              {/* Avatar file picker — hiển thị tên file đã chọn */}
              <FormField
                label="Ảnh đại diện"
                hint={avatarFile ? `✅ Đã chọn: ${avatarFile.name}` : "Hoặc nhấn vào ảnh đại diện bên trên để chọn ảnh"}
              >
                <label style={{
                  display: "flex", alignItems: "center", gap: ".6rem",
                  padding: ".6rem .9rem",
                  border: `1.5px dashed ${T.border}`,
                  borderRadius: 8, cursor: "pointer",
                  background: T.sand, fontSize: ".84rem", color: T.textMid,
                  transition: ".15s",
                }}>
                  <span>📁</span>
                  <span>{avatarFile ? avatarFile.name : "Chọn tệp ảnh…"}</span>
                  <input
                    type="file" accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleAvatarChange}
                  />
                </label>
              </FormField>
            </CardSection>

            {/* ─ Preview avatar + thông tin xem trước ─ */}
            <CardSection title="Xem trước hồ sơ" mb="0">
              {/* avatar preview */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", padding: ".5rem 0 1.25rem" }}>
                {avatarPreview
                  ? <img src={avatarPreview} alt="preview" style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover", border: `3px solid ${T.border}`, boxShadow: "0 4px 16px rgba(0,0,0,.1)" }} />
                  : <div style={{ width: 96, height: 96, borderRadius: "50%", background: T.light, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", fontWeight: 800, color: T.mid, border: `3px solid ${T.border}` }}>{initials || "?"}</div>
                }
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontWeight: 800, fontSize: "1.1rem", color: T.text }}>{form.FullName || "—"}</div>
                  <div style={{ fontSize: ".8rem", color: T.textMid, marginTop: ".25rem" }}>{form.Email || "—"}</div>
                </div>
              </div>

              <div style={{ background: T.sand, borderRadius: 10, padding: "1rem", border: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: ".6rem" }}>
                {[
                  ["📞", "Điện thoại", form.PhoneNumber],
                  ["📍", "Địa chỉ",    form.Location],
                ].map(([ic, lbl, val]) => (
                  <div key={lbl} style={{ display: "flex", gap: ".65rem", alignItems: "center" }}>
                    <span style={{ width: 28, height: 28, borderRadius: 7, background: T.light, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".85rem", flexShrink: 0 }}>{ic}</span>
                    <div>
                      <div style={{ fontSize: ".68rem", fontWeight: 700, color: T.textLt, textTransform: "uppercase", letterSpacing: ".05em" }}>{lbl}</div>
                      <div style={{ fontSize: ".84rem", color: val ? T.text : T.textLt, fontStyle: val ? "normal" : "italic" }}>{val || "Chưa nhập"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardSection>
          </div>

            {/* Bottom actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: ".75rem" }}>
              <BtnSecondary onClick={() => navigate("/profile")}>✕ Huỷ bỏ</BtnSecondary>
              <BtnPrimary type="submit" disabled={saving}>
                {saving ? "⏳ Đang lưu…" : "💾 Lưu hồ sơ"}
              </BtnPrimary>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
