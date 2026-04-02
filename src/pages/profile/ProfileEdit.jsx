import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authService } from "@/services/authService";
import { userService } from "@/services/userService";
import Header from "@/components/Header";
import {
  normalizeSpaces,
  validateAvatarFile,
  validateEmail,
  validateFullName,
  validateLocation,
  validatePhoneNumber,
} from "@/lib/validators";
import { getStoredUser, setStoredUser } from "@/lib/authStorage";

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

function getApiErrorDetails(errData) {
  const fieldErrors = errData?.errors && typeof errData.errors === "object"
    ? Object.entries(errData.errors).flatMap(([field, messages]) =>
        (Array.isArray(messages) ? messages : [messages]).map((message) => ({
          field,
          message: String(message),
        }))
      )
    : [];

  const message =
    fieldErrors[0]?.message ||
    errData?.detail ||
    errData?.title ||
    errData?.message ||
    "Lưu thất bại. Vui lòng thử lại.";

  return { message, fieldErrors };
}

function isEmailVerificationRequiredMessage(value) {
  const message = String(value ?? "").trim().toLowerCase();
  if (!message) return false;
  return (
    message.includes("email chưa được xác thực") ||
    message.includes("xác thực email trước khi cập nhật") ||
    message.includes("verify email") ||
    message.includes("email not verified")
  );
}

function isGenericEntitySaveError(value) {
  const message = String(value ?? "").trim().toLowerCase();
  if (!message) return false;
  return (
    message.includes("an error occurred while saving the entity changes") ||
    message.includes("see the inner exception for details")
  );
}

function getFallbackSaveErrorMessage(errData, fallbackMessage) {
  const status = Number(errData?.status ?? 0);
  const detail = String(errData?.detail ?? "").trim();
  const title = String(errData?.title ?? "").trim();
  const message = String(fallbackMessage ?? "").trim();
  const genericMessage = detail || title || message;

  if (status >= 500 && isGenericEntitySaveError(genericMessage)) {
    return "Không thể lưu hồ sơ do backend trả lỗi nội bộ chung chung. Hãy kiểm tra lại email, số điện thoại hoặc ảnh đại diện rồi thử lại.";
  }

  return message || "Lưu thất bại. Vui lòng thử lại.";
}

async function buildAvatarFile(avatarFile, avatarPreview, initials = "") {
  if (avatarFile) return avatarFile;

  // Try reusing current preview (can be http(s), blob:, data:...)
  if (typeof avatarPreview === "string" && avatarPreview.trim()) {
    try {
      const response = await fetch(avatarPreview);
      if (response.ok) {
        const blob = await response.blob();
        const type = blob.type || "image/png";
        const extension = type.split("/")[1] || "png";
        return new File([blob], `avatar.${extension}`, { type });
      }
    } catch {
      // fall through to generated avatar
    }
  }

  // Fallback only when the user truly has no existing avatar at all.
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Không thể tạo ảnh đại diện mặc định.");

  ctx.fillStyle = "#1f4d3a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const safeInitials = String(initials || "?").trim().slice(0, 2).toUpperCase() || "?";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 96px Lexend, 'Be Vietnam Pro', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(safeInitials, canvas.width / 2, canvas.height / 2 + 4);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 0.92));
  if (!blob) throw new Error("Không thể tạo ảnh đại diện mặc định.");
  return new File([blob], "avatar.png", { type: "image/png" });
}

/* ─── Input ─── */
function Input({ name, value, onChange, onBlur, type = "text", placeholder = "", hasError, readOnly = false }) {
  return (
    <input
      className="pf-input"
      type={type} name={name} value={value ?? ""} onChange={onChange} onBlur={onBlur} readOnly={readOnly}
      placeholder={placeholder}
      style={{
        width: "100%", padding: ".65rem .9rem",
        border: `1.5px solid ${hasError ? T.red : T.border}`,
        borderRadius: 8, fontSize: ".88rem",
        background: readOnly ? T.sand : T.white, color: T.text, transition: ".15s",
        cursor: readOnly ? "not-allowed" : "text",
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
  const location = useLocation();
  const navigate = useNavigate();
  const forceProfileCompletion = Boolean(location.state?.forceProfileCompletion);

  const buildLocalProfile = (user) => ({
    fullName: user?.fullName ?? user?.name ?? "",
    email: user?.email ?? "",
    phoneNumber: user?.phoneNumber ?? user?.phone ?? "",
    location: user?.location ?? user?.address ?? "",
    avatarUrl: user?.avatarUrl ?? user?.avartarUrl ?? "",
    bio: user?.bio ?? "",
    cooperationNotes: Array.isArray(user?.cooperationNotes)
      ? user.cooperationNotes.join("\n")
      : user?.cooperationNotes ?? "",
  });

  // ── form fields khớp đúng tên API ──
  // API fields: FullName, PhoneNumber, AvartarUrl (file), Location, Email
  const [form, setForm] = useState({
    FullName:    "",
    Email:       "",
    PhoneNumber: "",
    Location:    "",   // tương ứng với "address" hiển thị
    Bio:         "",
    CooperationNotes: "",
  });

  const [avatarFile,  setAvatarFile]  = useState(null);   // File object gửi lên API
  const [avatarPreview, setAvatarPreview] = useState(null); // URL preview local

  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [msg,       setMsg]       = useState(null);   // {type, text}
  const [touched,   setTouched]   = useState({});
  const [otpCode, setOtpCode] = useState("");
  const [otpStage, setOtpStage] = useState("idle");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [initialEmail, setInitialEmail] = useState("");
  const [backendRequiresEmailVerification, setBackendRequiresEmailVerification] = useState(false);

  const validateField = (name, value) => {
    if (name === "FullName") return validateFullName(value);
    if (name === "Email") return validateEmail(value);
    if (name === "PhoneNumber") return validatePhoneNumber(value);
    if (name === "Location") return validateLocation(value);
    return "";
  };

  const normalizedCurrentEmail = String(form.Email || "").trim().toLowerCase();
  const normalizedInitialEmail = String(initialEmail || "").trim().toLowerCase();
  const normalizedVerifiedEmail = String(verifiedEmail || "").trim().toLowerCase();
  const emailChanged = normalizedCurrentEmail !== normalizedInitialEmail;
  const isCurrentEmailVerified =
    !!normalizedCurrentEmail && normalizedCurrentEmail === normalizedVerifiedEmail;
  const emailVerificationRequired = backendRequiresEmailVerification || emailChanged;

  /* ── Load profile ── */
  useEffect(() => {
    const user = getStoredUser();
    if (!user) { navigate("/login"); return; }

    const fallback = buildLocalProfile(user);
    setForm({
      FullName: fallback.fullName,
      Email: fallback.email,
      PhoneNumber: fallback.phoneNumber,
      Location: fallback.location,
      Bio: fallback.bio,
      CooperationNotes: fallback.cooperationNotes,
    });
    setInitialEmail("");
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
          Bio:         fallback.bio,
          CooperationNotes: fallback.cooperationNotes,
        });
        setInitialEmail(data.emailFromServer ? (data.email ?? data.Email ?? "") : "");
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Field change ── */
  const handle = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (name !== "Avatar") {
      setMsg(null);
    }
    if (name === "Email") {
      const normalizedEmail = String(value || "").trim().toLowerCase();
      if (normalizedEmail !== String(verifiedEmail || "").trim().toLowerCase()) {
        setOtpStage("idle");
        setOtpCode("");
      }
      setBackendRequiresEmailVerification(normalizedEmail !== normalizedInitialEmail);
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  /* ── Avatar: chọn file → preview ngay, lưu File object ── */
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const avatarError = validateAvatarFile(file);
    if (avatarError) {
      setTouched((prev) => ({ ...prev, Avatar: true }));
      setMsg({ type: "error", text: avatarError });
      e.target.value = "";
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setTouched((prev) => ({ ...prev, Avatar: true }));
    setMsg(null);
  };

  const handleSendOtp = async () => {
    const emailError = validateField("Email", form.Email);
    setTouched((prev) => ({ ...prev, Email: true }));

    if (emailError) {
      setMsg({ type: "error", text: emailError });
      return;
    }

    try {
      setSendingOtp(true);
      setMsg(null);
      await authService.sendRegisterOtp({ email: String(form.Email || "").trim() });
      setOtpStage("sent");
      setOtpCode("");
      setVerifiedEmail("");
      setBackendRequiresEmailVerification(true);
      setMsg({
        type: "success",
        text: "Mã xác thực đã được gửi tới email. Nhập OTP rồi bấm Xác minh email.",
      });
    } catch (err) {
      const errData = err?.response?.data;
      setMsg({
        type: "error",
        text:
          errData?.message ||
          errData?.title ||
          "Không thể gửi mã xác thực. Vui lòng thử lại.",
      });
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!String(otpCode || "").trim()) {
      setMsg({ type: "error", text: "Vui lòng nhập mã OTP đã nhận trong email." });
      return;
    }

    try {
      setVerifyingOtp(true);
      setMsg(null);
      await authService.verifyRegisterOtp({
        email: String(form.Email || "").trim(),
        otp: String(otpCode || "").trim(),
      });
      setOtpStage("verified");
      setVerifiedEmail(String(form.Email || "").trim().toLowerCase());
      setBackendRequiresEmailVerification(false);
      setMsg({
        type: "success",
        text: "Email đã được xác thực. Bạn có thể lưu thay đổi hồ sơ.",
      });
    } catch (err) {
      const errData = err?.response?.data;
      setMsg({
        type: "error",
        text:
          errData?.message ||
          errData?.title ||
          "Xác minh email không thành công. Vui lòng kiểm tra lại OTP.",
      });
    } finally {
      setVerifyingOtp(false);
    }
  };

  /* ── Validation ── */
  const validate = () => {
    const errs = {};
    ["FullName", "Email", "PhoneNumber", "Location"].forEach((key) => {
      const message = validateField(key, form[key]);
      if (message) errs[key] = message;
    });
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

    if (emailVerificationRequired && !isCurrentEmailVerified) {
      setOtpStage((prev) => (prev === "idle" ? "sent" : prev));
      setMsg({
        type: "error",
        text: "Vui lòng xác minh email hiện tại bằng mã OTP trước khi lưu hồ sơ.",
      });
      return;
    }

    try {
      setSaving(true);
      setMsg(null);

      const user = getStoredUser();

      // Tạo FormData gửi đúng theo API
      const fd = new FormData();
      fd.append("FullName", normalizeSpaces(form.FullName));
      fd.append("PhoneNumber", form.PhoneNumber.trim());
      fd.append("Location", normalizeSpaces(form.Location));
      fd.append("Email", form.Email.trim());

      if (avatarFile instanceof File) {
        fd.append("AvartarUrl", avatarFile);
      } else if (!String(avatarPreview || "").trim()) {
        const avatarUpload = await buildAvatarFile(null, "", getInitials(form.FullName));
        fd.append("AvartarUrl", avatarUpload);
      }

      const updateResult = await userService.updateProfile(user.userId ?? user.id, fd);

      if (updateResult?.otpRequired) {
        setBackendRequiresEmailVerification(true);
        setOtpStage("sent");
        setMsg({
          type: "success",
          text: updateResult?.message || "Hệ thống đã gửi OTP về email. Vui lòng xác nhận để hoàn tất cập nhật hồ sơ.",
        });
        return;
      }

      await userService.getProfile();

      const storedUser = getStoredUser() || {};
      setStoredUser({
        ...storedUser,
        bio: String(form.Bio || "").trim(),
        cooperationNotes: String(form.CooperationNotes || "")
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      });
      setInitialEmail(String(form.Email || "").trim());
      setVerifiedEmail(String(form.Email || "").trim().toLowerCase());
      setBackendRequiresEmailVerification(false);
      window.dispatchEvent(new Event("auth-change"));

      setMsg({ type: "success", text: "Lưu hồ sơ thành công!" });
      setTimeout(() => navigate("/profile", { state: { refresh: Date.now() } }), 1400);
    } catch (err) {
      const errData = err?.response?.data;
      const { message, fieldErrors } = getApiErrorDetails(errData);
      const friendlyMessage = getFallbackSaveErrorMessage(errData, message);
      const shouldPromptVerify =
        isEmailVerificationRequiredMessage(friendlyMessage) ||
        isEmailVerificationRequiredMessage(errData?.detail);

      if (fieldErrors.length > 0) {
        const mappedTouched = { FullName: true, Email: true, PhoneNumber: true, Location: true };
        setTouched((prev) => ({ ...prev, ...mappedTouched }));
      }

      console.error("update-profile error:", errData);
      if (shouldPromptVerify) {
        setBackendRequiresEmailVerification(true);
        setOtpStage((prev) => (prev === "verified" ? prev : "sent"));
        setMsg({
          type: "error",
          text: "Email này chưa được xác thực. Vui lòng gửi mã OTP, xác minh email rồi lưu lại hồ sơ.",
        });
      } else {
        setMsg({ type: "error", text: friendlyMessage });
      }
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

        {/* ── Avatar row ── */}
        <div className="pf-avatar-row" style={{ maxWidth: 960, margin: "1.5rem auto 1.5rem", padding: "0 2rem", display: "flex", alignItems: "flex-end", gap: "1rem", animation: "fadeUp .35s ease", position: "relative", zIndex: 2 }}>
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
        </div>

        {/* ── Force-completion banner ── */}
        {forceProfileCompletion && (
          <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 2rem .5rem", animation: "slideDown .25s ease" }}>
            <div style={{
              padding: ".85rem 1.1rem", borderRadius: 10,
              background: T.redBg,
              color: T.red,
              border: `1px solid ${T.redBd}`,
              fontWeight: 700, fontSize: ".88rem",
              display: "flex", alignItems: "center", gap: ".6rem",
            }}>
              ⚠️&nbsp;Vui lòng cập nhật đầy đủ email, số điện thoại và địa chỉ để tiếp tục sử dụng hệ thống.
            </div>
          </div>
        )}

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
                <Input name="FullName" value={form.FullName} onChange={handle} onBlur={handleBlur}
                  placeholder="Nguyễn Văn A" hasError={!!(touched.FullName && errs.FullName)} />
              </FormField>

              <FormField label="Email" required error={touched.Email && errs.Email}>
                <Input name="Email" type="email" value={form.Email} onChange={handle} onBlur={handleBlur}
                  placeholder="email@example.com" hasError={!!(touched.Email && errs.Email)} />
              </FormField>

              <div style={{
                marginTop: "-.2rem",
                marginBottom: "1rem",
                padding: ".9rem 1rem",
                borderRadius: 10,
                border: `1px solid ${T.border}`,
                background: T.light,
                display: "flex",
                flexDirection: "column",
                gap: ".8rem",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: ".75rem", alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: ".5rem", flexWrap: "wrap" }}>
                        <div style={{ fontSize: ".82rem", fontWeight: 800, color: T.text }}>
                        {emailVerificationRequired ? "Cần xác minh email để lưu hồ sơ" : "Xác minh email"}
                        </div>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                        padding: ".24rem .65rem",
                        borderRadius: 999,
                        background: otpStage === "verified" ? "#cfead8" : T.white,
                        color: otpStage === "verified" ? T.mid : T.textMid,
                          border: `1px solid ${otpStage === "verified" ? "#b6ddc3" : T.border}`,
                          fontSize: ".72rem",
                          fontWeight: 800,
                        }}>
                        {otpStage === "verified" ? "Đã xác minh" : "Chưa xác minh"}
                      </span>
                    </div>
                    <div style={{ fontSize: ".74rem", color: T.textMid, marginTop: ".2rem" }}>
                      {emailVerificationRequired
                        ? "Email hiện tại cần được xác minh bằng mã OTP trước khi cập nhật hồ sơ."
                        : "Nếu bạn đổi email, hệ thống sẽ yêu cầu xác minh bằng mã OTP trước khi lưu."}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={sendingOtp || verifyingOtp}
                    className="pf-btn-secondary"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      whiteSpace: "nowrap",
                      background: "transparent",
                      color: T.mid,
                      border: `2px solid ${T.base}`,
                      padding: ".61rem 1rem",
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: ".84rem",
                      cursor: sendingOtp || verifyingOtp ? "not-allowed" : "pointer",
                      transition: ".15s",
                      opacity: sendingOtp || verifyingOtp ? .7 : 1,
                    }}
                  >
                    {sendingOtp ? "Đang gửi..." : otpStage === "idle" ? "Gửi mã OTP" : "Gửi lại OTP"}
                  </button>
                </div>

                {(otpStage !== "idle" || emailVerificationRequired) && (
                  <div style={{ display: "flex", gap: ".6rem", alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <Input
                        name="EmailOtp"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="Nhập mã OTP"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={verifyingOtp || !String(otpCode || "").trim()}
                      className="pf-btn-primary"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        whiteSpace: "nowrap",
                        background: verifyingOtp || !String(otpCode || "").trim() ? "#a0c8b0" : T.base,
                        color: "#fff",
                        border: "none",
                        padding: ".63rem 1rem",
                        borderRadius: 8,
                        fontWeight: 700,
                        fontSize: ".84rem",
                        cursor: verifyingOtp || !String(otpCode || "").trim() ? "not-allowed" : "pointer",
                        boxShadow: verifyingOtp || !String(otpCode || "").trim() ? "none" : `0 3px 12px rgba(30,138,71,.28)`,
                        transition: ".15s",
                      }}
                    >
                      {verifyingOtp ? "Đang xác minh..." : "Xác minh"}
                    </button>
                  </div>
                )}

                {otpStage === "verified" && (
                  <div style={{ fontSize: ".74rem", fontWeight: 700, color: T.mid }}>
                    Email hiện tại đã được xác minh. Bạn có thể lưu thay đổi hồ sơ.
                  </div>
                )}
              </div>

              <FormField
                label="Số điện thoại"
                required
                error={touched.PhoneNumber && errs.PhoneNumber}
              >
                <Input
                  name="PhoneNumber"
                  value={form.PhoneNumber}
                  onChange={handle}
                  onBlur={handleBlur}
                  placeholder="(+84) 0xx xxx xxx"
                  hasError={!!(touched.PhoneNumber && errs.PhoneNumber)}
                />
              </FormField>

              <FormField label="Địa chỉ / Khu vực" required error={touched.Location && errs.Location}>
                <Input name="Location" value={form.Location} onChange={handle} onBlur={handleBlur}
                  placeholder="Số nhà, đường, quận, thành phố" hasError={!!(touched.Location && errs.Location)} />
              </FormField>

              <FormField label="Giới thiệu khách hàng" hint="Mô tả ngắn về khách hàng hoặc doanh nghiệp.">
                <textarea
                  name="Bio"
                  value={form.Bio ?? ""}
                  onChange={handle}
                  onBlur={handleBlur}
                  placeholder="Ví dụ: Khách hàng chuyên các đơn hàng thời trang công sở, ưu tiên chất lượng ổn định và tiến độ rõ ràng."
                  style={{
                    width: "100%",
                    minHeight: 110,
                    padding: ".75rem .9rem",
                    border: `1.5px solid ${T.border}`,
                    borderRadius: 8,
                    fontSize: ".88rem",
                    background: T.white,
                    color: T.text,
                    resize: "vertical",
                  }}
                />
              </FormField>

              <FormField label="Ghi chú hợp tác" hint="Mỗi dòng là một ghi chú hiển thị ở trang hồ sơ.">
                <textarea
                  name="CooperationNotes"
                  value={form.CooperationNotes ?? ""}
                  onChange={handle}
                  onBlur={handleBlur}
                  placeholder={"Ưu tiên cập nhật tiến độ theo từng giai đoạn.\nTheo dõi lịch sử tương tác để hỗ trợ báo giá nhanh hơn."}
                  style={{
                    width: "100%",
                    minHeight: 130,
                    padding: ".75rem .9rem",
                    border: `1.5px solid ${T.border}`,
                    borderRadius: 8,
                    fontSize: ".88rem",
                    background: T.white,
                    color: T.text,
                    resize: "vertical",
                  }}
                />
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
              {!forceProfileCompletion && (
                <BtnSecondary onClick={() => navigate("/profile")}>✕ Huỷ bỏ</BtnSecondary>
              )}
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
