import { useRef, useState } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  AtSign,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  Clock3,
  KeyRound,
  Lock,
  Package,
  User,
} from "lucide-react";
import { getPostLoginPath } from "@/lib/authRouting";
import { getStoredUser } from "@/lib/authStorage";
import { authService } from "../services/authService";
import SuccessModal from "@/components/SuccessModal";
import {
  validateEmail,
  normalizeSpaces,
  validateConfirmPassword,
  validateFullName,
  validatePassword,
  validateUserName,
} from "@/lib/validators";
import "../styles/login.css";
import "../styles/register.css";

const initialValues = {
  fullName: "",
  email: "",
  userName: "",
  password: "",
  confirmPassword: "",
  otp: "",
  agree: false,
};
const AUTH_FEATURES = [
  { icon: Clock3, title: "Theo dõi theo thời gian thực", desc: "Nắm tiến độ sản xuất và trạng thái đơn hàng ngay trên một màn hình." },
  { icon: BriefcaseBusiness, title: "Quản lý nhân sự", desc: "Theo dõi phân công và cập nhật thông tin nhân sự tập trung." },
  { icon: Package, title: "Quản lý đơn hàng", desc: "Theo dõi đơn hàng từ lúc tiếp nhận đến khi bàn giao." },
  { icon: BarChart3, title: "Báo cáo rõ ràng", desc: "Tổng hợp số liệu vận hành để dễ kiểm tra và đối chiếu." },
];

function EyeIcon({ open = false }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2 12C3.8 8.6 7.4 6.5 12 6.5C16.6 6.5 20.2 8.6 22 12C20.2 15.4 16.6 17.5 12 17.5C7.4 17.5 3.8 15.4 2 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      {!open ? <path d="M4 20L20 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /> : null}
    </svg>
  );
}

function BrandMark() {
  return <Building2 size={22} strokeWidth={2.1} aria-hidden="true" />;
}

function isEmailAlreadyVerifiedMessage(value) {
  const message = String(value ?? "").trim().toLowerCase();
  if (!message) return false;
  return (
    message.includes("email đã được xác thực trước đó") ||
    message.includes("email da duoc xac thuc truoc do") ||
    message.includes("email already verified") ||
    message.includes("already verified")
  );
}

export default function RegisterPage() {
  const storedUser = getStoredUser();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [successOpen, setSuccessOpen] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const submitLockRef = useRef(false);

  if (storedUser) {
    return <Navigate to={getPostLoginPath(storedUser?.role)} replace />;
  }

  const getApiErrorDetails = (errData) => {
    const rawErrors =
      errData?.errors && typeof errData.errors === "object" ? errData.errors : null;

    const fieldErrors = rawErrors
      ? Object.entries(rawErrors).reduce((acc, [field, messages]) => {
          const firstMessage = Array.isArray(messages) ? messages[0] : messages;
          const message = String(firstMessage ?? "").trim();
          if (!message) return acc;

          const key = String(field ?? "").trim().toLowerCase();
          if (key.includes("username")) acc.userName = message;
          else if (key.includes("fullname")) acc.fullName = message;
          else if (key.includes("email")) acc.email = message;
          else if (key.includes("otp")) acc.otp = message;
          else if (key === "password") acc.password = message;
          else if (key.includes("repassword") || key.includes("confirmpassword")) {
            acc.confirmPassword = message;
          } else {
            acc._ = acc._ || message;
          }

          return acc;
        }, {})
      : {};

    const message =
      fieldErrors.userName ||
      fieldErrors.fullName ||
      fieldErrors.email ||
      fieldErrors.otp ||
      fieldErrors.password ||
      fieldErrors.confirmPassword ||
      fieldErrors._ ||
      errData?.detail ||
      errData?.message ||
      errData?.title ||
      "Đăng ký thất bại";

    const { _, ...mappedFieldErrors } = fieldErrors;
    return { message, fieldErrors: mappedFieldErrors };
  };

  const validateField = (name, value, nextForm = formData) => {
    if (name === "fullName") return validateFullName(value);
    if (name === "email") return validateEmail(value);
    if (name === "userName") return validateUserName(value);
    if (name === "password") return validatePassword(value);
    if (name === "confirmPassword") {
      return validateConfirmPassword(nextForm.password, value);
    }
    if (name === "otp") return otpSent && !String(value ?? "").trim() ? "Vui lòng nhập mã OTP" : "";
    if (name === "agree") return value ? "" : "Bạn phải đồng ý với điều khoản";
    return "";
  };

  const validateForm = ({ includeOtp = otpSent } = {}) => {
    const newErrors = {};
    Object.keys(formData)
      .filter((key) => includeOtp || key !== "otp")
      .forEach((key) => {
      const message = validateField(key, formData[key], formData);
      if (message) newErrors[key] = message;
      });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const nextValue = type === "checkbox" ? checked : value;
    const shouldResetOtp = name === "email" && otpSent;
    const nextForm = shouldResetOtp
      ? {
          ...formData,
          [name]: nextValue,
          otp: "",
        }
      : {
          ...formData,
          [name]: nextValue,
        };

    setFormData(nextForm);
    setSubmitError("");
    if (shouldResetOtp) {
      setOtpSent(false);
      setVerifiedEmail("");
    }
    setErrors((prev) => ({
      ...prev,
      [name]: validateField(name, nextValue, nextForm),
      ...(shouldResetOtp ? { otp: "" } : {}),
      ...(name === "password"
        ? { confirmPassword: validateField("confirmPassword", nextForm.confirmPassword, nextForm) }
        : {}),
    }));
  };

  const goLogin = () => {
    setSuccessOpen(false);
    navigate("/login");
  };

  const buildRegisterPayload = () => ({
    userName: formData.userName.trim(),
    fullName: normalizeSpaces(formData.fullName),
    email: formData.email.trim(),
    password: formData.password,
    rePassword: formData.confirmPassword,
  });

  const handleSendOtp = async () => {
    if (submitLockRef.current) return;
    if (!validateForm({ includeOtp: false })) return;

    try {
      submitLockRef.current = true;
      setLoading(true);

      await authService.sendRegisterOtp({
        email: formData.email.trim(),
      });

      setOtpSent(true);
      setVerifiedEmail("");
      setSubmitError("");
      setFormData((prev) => ({ ...prev, otp: "" }));
      setErrors((prev) => ({ ...prev, otp: "" }));
    } catch (error) {
      const errData = error?.response?.data ?? {};
      const { message, fieldErrors } = getApiErrorDetails(errData);
      setSubmitError(message);
      if (Object.keys(fieldErrors).length) {
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
      }
    } finally {
      submitLockRef.current = false;
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (submitLockRef.current) return;
    if (!validateForm({ includeOtp: false })) return;

    try {
      submitLockRef.current = true;
      setLoading(true);

      await authService.resendRegisterOtp({
        email: formData.email.trim(),
      });

      setVerifiedEmail("");
      setSubmitError("");
      setFormData((prev) => ({ ...prev, otp: "" }));
      setErrors((prev) => ({ ...prev, otp: "" }));
    } catch (error) {
      const errData = error?.response?.data ?? {};
      const { message, fieldErrors } = getApiErrorDetails(errData);
      setSubmitError(message);
      if (Object.keys(fieldErrors).length) {
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
      }
    } finally {
      submitLockRef.current = false;
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async () => {
    if (submitLockRef.current) return;
    if (!validateForm({ includeOtp: true })) return;

    try {
      submitLockRef.current = true;
      setLoading(true);
      const normalizedEmail = formData.email.trim();

      if (verifiedEmail !== normalizedEmail) {
        try {
          await authService.verifyRegisterOtp({
            email: normalizedEmail,
            otp: formData.otp.trim(),
          });
        } catch (error) {
          const errData = error?.response?.data ?? {};
          const verifyMessage =
            errData?.message ||
            errData?.detail ||
            errData?.title ||
            "";

          if (!isEmailAlreadyVerifiedMessage(verifyMessage)) {
            throw error;
          }
        }
        setVerifiedEmail(normalizedEmail);
      }

      await authService.register(buildRegisterPayload());

      setSubmitError("");
      setSuccessOpen(true);
    } catch (error) {
      const errData = error?.response?.data ?? {};
      const { message, fieldErrors } = getApiErrorDetails(errData);
      setSubmitError(message);
      if (Object.keys(fieldErrors).length) {
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
      }
    } finally {
      submitLockRef.current = false;
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (otpSent) {
      await handleVerifyAndRegister();
      return;
    }

    await handleSendOtp();
  };

  return (
    <div className="login-container">
      <SuccessModal
        isOpen={successOpen}
        title="Đăng ký thành công"
        description="Tài khoản đã được tạo. Bạn có thể đăng nhập ngay."
        primaryLabel="Đăng nhập ngay"
        secondaryLabel="Để sau"
        onPrimary={goLogin}
        onClose={() => {
          setSuccessOpen(false);
        }}
      />
      <div className="login-left">
        <div className="left-content">
          <div className="brand">
            <div className="brand-logo"><BrandMark /></div>
            <div className="brand-text">
              <h2>GPMS</h2>
              <p>Hệ thống quản lý sản xuất may mặc</p>
            </div>
          </div>

          <h1 className="left-heading">
            Theo dõi sản xuất <br />
            rõ ràng hơn
          </h1>

          <p className="left-desc">
            Tạo tài khoản để bắt đầu quản lý đơn hàng, nhân sự và tiến độ sản xuất trên cùng một hệ thống.
          </p>

          <div className="features-box">
            {AUTH_FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
              <div key={feature.title} className="feature">
                <div className="icon"><Icon size={18} strokeWidth={2.1} /></div>
                <div><h4>{feature.title}</h4><p>{feature.desc}</p></div>
              </div>
            );
            })}
          </div>
        </div>
        <div className="tape" />
      </div>

      <div className="login-right">
        <form className="login-card register-card" onSubmit={handleSubmit}>
          <button
            type="button"
            className="auth-back-btn"
            onClick={() => navigate("/home")}
          >
            <ArrowLeft size={16} />
            <span>Về trang chủ</span>
          </button>

          <h2>Tạo tài khoản mới</h2>
          <p>Hệ thống quản lý sản xuất may mặc</p>

          <label className="field-label">Họ và tên *</label>
          <div className="input-wrapper">
            <span className="input-icon"><User size={17} strokeWidth={2} /></span>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Nhập họ và tên"
              className={errors.fullName ? "input-error" : ""}
            />
          </div>
          {errors.fullName && <p className="error-text">{errors.fullName}</p>}

          <label className="field-label">Email *</label>
          <div className="input-wrapper">
            <span className="input-icon"><AtSign size={17} strokeWidth={2} /></span>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Nhập email để nhận mã xác thực"
              className={errors.email ? "input-error" : ""}
            />
          </div>
          {errors.email && <p className="error-text">{errors.email}</p>}

          <label className="field-label">Tên đăng nhập *</label>
          <div className="input-wrapper">
            <span className="input-icon"><User size={17} strokeWidth={2} /></span>
            <input
              type="text"
              name="userName"
              value={formData.userName}
              onChange={handleChange}
              placeholder="Nhập tên đăng nhập"
              className={errors.userName ? "input-error" : ""}
            />
          </div>
          {errors.userName && <p className="error-text">{errors.userName}</p>}

          <label className="field-label">Mật khẩu *</label>
          <div className="input-wrapper">
            <span className="input-icon"><Lock size={17} strokeWidth={2} /></span>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Nhập mật khẩu"
              className={errors.password ? "input-error" : ""}
            />
            <button
              type="button"
              className="eye-btn"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
          {errors.password && <p className="error-text">{errors.password}</p>}

          <label className="field-label">Xác nhận mật khẩu *</label>
          <div className="input-wrapper">
            <span className="input-icon"><KeyRound size={17} strokeWidth={2} /></span>
            <input
              type={showConfirm ? "text" : "password"}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Nhập lại mật khẩu"
              className={errors.confirmPassword ? "input-error" : ""}
            />
            <button
              type="button"
              className="eye-btn"
              onClick={() => setShowConfirm((prev) => !prev)}
              aria-label={showConfirm ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              <EyeIcon open={showConfirm} />
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="error-text">{errors.confirmPassword}</p>
          )}

          {otpSent ? (
            <>
              <label className="field-label">Mã OTP *</label>
              <div className="input-wrapper">
                <span className="input-icon"><KeyRound size={17} strokeWidth={2} /></span>
                <input
                  type="text"
                  name="otp"
                  value={formData.otp}
                  onChange={handleChange}
                  placeholder="Nhập mã OTP gửi về email"
                  className={errors.otp ? "input-error" : ""}
                />
              </div>
              {errors.otp && <p className="error-text">{errors.otp}</p>}
              <div className="register-row" style={{ justifyContent: "space-between", marginTop: "0.5rem" }}>
                <span style={{ color: "#5f7a69", fontSize: "0.92rem" }}>
                  Chưa nhận được mã?
                </span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#1e8a47",
                    fontWeight: 700,
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? "Đang gửi lại..." : "Gửi lại mã OTP"}
                </button>
              </div>
            </>
          ) : null}

          <label className="terms">
            <input
              type="checkbox"
              name="agree"
              checked={formData.agree}
              onChange={handleChange}
            />
            <span>
              Tôi đồng ý với <b>Điều khoản dịch vụ</b> và <b>Chính sách bảo mật</b>
            </span>
          </label>
          {errors.agree && <p className="error-text">{errors.agree}</p>}

          {submitError ? (
            <div className="register-submit-error" role="alert">
              <span aria-hidden="true">⚠</span>
              <span>{submitError}</span>
            </div>
          ) : null}

          <button type="submit" className="register-btn" disabled={loading}>
            {loading
              ? otpSent
                ? "Đang xác thực..."
                : "Đang gửi mã..."
              : otpSent
                ? "Xác thực email và đăng ký"
                : "Gửi mã xác thực"}
          </button>

          <div className="register-row">
            Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
          </div>
        </form>
      </div>

      <div className="footer-text">© 2024 GarmentPro. Bảo lưu mọi quyền.</div>
    </div>
  );
}
