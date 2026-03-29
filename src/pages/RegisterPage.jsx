import { useState } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
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
import "../styles/auth.css";
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
    const nextForm = {
      ...formData,
      [name]: nextValue,
    };

    setFormData(nextForm);
    setSubmitError("");
    if (name === "email" && otpSent) {
      setOtpSent(false);
    }
    setErrors((prev) => ({
      ...prev,
      [name]: validateField(name, nextValue, nextForm),
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
    if (!validateForm({ includeOtp: false })) return;

    try {
      setLoading(true);

      await authService.sendRegisterOtp({
        email: formData.email.trim(),
      });

      setOtpSent(true);
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
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async () => {
    if (!validateForm({ includeOtp: true })) return;

    try {
      setLoading(true);

      await authService.verifyRegisterOtp({
        email: formData.email.trim(),
        otp: formData.otp.trim(),
      });

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
            <div className="brand-logo">🏭</div>
            <div className="brand-text">
              <h2>GPMS</h2>
              <p>Hệ thống quản lý sản xuất may mặc</p>
            </div>
          </div>

          <h1 className="left-heading">
            Quản lý sản xuất <br />
            thông minh
          </h1>

          <p className="left-desc">
            Tối ưu hóa quy trình sản xuất, theo dõi tiến độ và quản lý nhân sự hiệu quả
          </p>

          <div className="features-box">
            {[
              { icon:"⏱", title:"Theo dõi thời gian thực", desc:"Giám sát tiến độ sản xuất mọi lúc mọi nơi" },
              { icon:"👔", title:"Quản lý nhân sự",         desc:"Phân công công việc và theo dõi hiệu suất" },
              { icon:"📦", title:"Quản lý đơn hàng",        desc:"Theo dõi đơn hàng từ A đến Z" },
              { icon:"📊", title:"Báo cáo chi tiết",        desc:"Phân tích dữ liệu và tạo báo cáo tự động" },
            ].map(f => (
              <div key={f.title} className="feature">
                <div className="icon">{f.icon}</div>
                <div><h4>{f.title}</h4><p>{f.desc}</p></div>
              </div>
            ))}
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
            ← Về trang chủ
          </button>

          <h2>Tạo tài khoản mới</h2>
          <p>Hệ thống quản lý sản xuất may mặc</p>

          <label className="field-label">Họ và tên *</label>
          <div className="input-wrapper">
            <span className="input-icon">👤</span>
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
            <span className="input-icon">✉️</span>
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
            <span className="input-icon">🆔</span>
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
            <span className="input-icon">🔒</span>
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
            >
              👁
            </button>
          </div>
          {errors.password && <p className="error-text">{errors.password}</p>}

          <label className="field-label">Xác nhận mật khẩu *</label>
          <div className="input-wrapper">
            <span className="input-icon">🔐</span>
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
            >
              👁
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="error-text">{errors.confirmPassword}</p>
          )}

          {otpSent ? (
            <>
              <label className="field-label">Mã OTP *</label>
              <div className="input-wrapper">
                <span className="input-icon">🔢</span>
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
                  onClick={handleSendOtp}
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
