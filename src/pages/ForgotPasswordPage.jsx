import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { getPostLoginPath } from "@/lib/authRouting";
import { getStoredUser } from "@/lib/authStorage";
import {
  validateConfirmPassword,
  validateEmail,
  validatePassword,
} from "@/lib/validators";
import { authService } from "@/services/authService";
import "../styles/login.css";

const initialValues = {
  email: "",
  otp: "",
  newPassword: "",
  confirmPassword: "",
};

export default function ForgotPasswordPage() {
  const storedUser = getStoredUser();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  if (storedUser) {
    return <Navigate to={getPostLoginPath(storedUser?.role)} replace />;
  }

  const validateEmailStep = (email) => {
    const nextErrors = {};
    const emailError = validateEmail(email);
    if (emailError) nextErrors.email = emailError;
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateResetStep = () => {
    const nextErrors = {};
    const normalizedEmail = formData.email.trim();
    const normalizedOtp = formData.otp.trim();

    const emailError = validateEmail(normalizedEmail);
    if (emailError) nextErrors.email = emailError;
    if (!normalizedOtp) nextErrors.otp = "Vui lòng nhập mã OTP";

    const passwordError = validatePassword(formData.newPassword);
    if (passwordError) nextErrors.newPassword = passwordError;

    const confirmError = validateConfirmPassword(
      formData.newPassword,
      formData.confirmPassword
    );
    if (confirmError) nextErrors.confirmPassword = confirmError;

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSubmitError("");
    setResetSuccess("");
    setErrors((prev) => {
      const nextErrors = { ...prev };
      if (name === "email") {
        const emailError = validateEmail(value);
        if (emailError) nextErrors.email = emailError;
        else delete nextErrors.email;
      }

      if (name === "otp") {
        if (!String(value).trim()) nextErrors.otp = "Vui lòng nhập mã OTP";
        else delete nextErrors.otp;
      }

      if (name === "newPassword") {
        const passwordError = validatePassword(value);
        if (passwordError) nextErrors.newPassword = passwordError;
        else delete nextErrors.newPassword;

        const confirmError = validateConfirmPassword(value, formData.confirmPassword);
        if (formData.confirmPassword && confirmError) nextErrors.confirmPassword = confirmError;
        else delete nextErrors.confirmPassword;
      }

      if (name === "confirmPassword") {
        const confirmError = validateConfirmPassword(formData.newPassword, value);
        if (confirmError) nextErrors.confirmPassword = confirmError;
        else delete nextErrors.confirmPassword;
      }

      return nextErrors;
    });
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    const normalizedEmail = formData.email.trim();
    if (!validateEmailStep(normalizedEmail)) return;

    try {
      setLoading(true);
      setSubmitError("");
      setResetSuccess("");
      await authService.requestPasswordReset({ email: normalizedEmail });
      setSubmittedEmail(normalizedEmail);
      setFormData((prev) => ({ ...prev, email: normalizedEmail }));
      setErrors((prev) => {
        const nextErrors = { ...prev };
        delete nextErrors.email;
        return nextErrors;
      });
    } catch (err) {
      setSubmitError(
        String(
          err?.response?.data?.message ||
          err?.response?.data?.title ||
          "Không thể gửi yêu cầu lúc này. Vui lòng thử lại sau."
        ).trim()
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!validateResetStep()) return;

    try {
      setLoading(true);
      setSubmitError("");
      setResetSuccess("");
      await authService.resetPassword({
        email: formData.email.trim(),
        otp: formData.otp.trim(),
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword,
      });
      setResetSuccess("Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.");
      setSubmittedEmail("");
      setFormData(initialValues);
      setErrors({});
    } catch (err) {
      setSubmitError(
        String(
          err?.response?.data?.message ||
          err?.response?.data?.title ||
          "Không thể đặt lại mật khẩu lúc này. Vui lòng kiểm tra lại OTP và thử lại."
        ).trim()
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
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
            Khôi phục tài khoản
            <br />
            nhanh và an toàn
          </h1>
          <p className="left-desc">
            Nhập email đã đăng ký để nhận hướng dẫn đặt lại mật khẩu và tiếp tục truy cập hệ thống một cách an toàn.
          </p>
          <div className="features-box">
            {[
              { icon: "📨", title: "Gửi hướng dẫn qua email", desc: "Hệ thống sẽ gửi liên kết hoặc hướng dẫn đặt lại mật khẩu đến địa chỉ đã đăng ký" },
              { icon: "🛡", title: "Bảo vệ tài khoản", desc: "Thông báo phản hồi được giữ ở mức an toàn để tránh lộ thông tin tài khoản" },
              { icon: "🔐", title: "Xác minh bằng OTP", desc: "Sau khi nhận mã OTP, người dùng có thể đặt lại mật khẩu ngay trên cùng màn hình" },
              { icon: "⚡", title: "Khôi phục nhanh chóng", desc: "Toàn bộ thao tác gửi mã và đặt lại mật khẩu được xử lý trực tiếp qua API hiện tại" },
            ].map((item) => (
              <div key={item.title} className="feature">
                <div className="icon">{item.icon}</div>
                <div>
                  <h4>{item.title}</h4>
                  <p>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="tape" />
      </div>

      <div className="login-right login-right--center">
        <form className="login-card forgot-card" onSubmit={handleRequestOtp}>
          <button
            type="button"
            className="auth-back-btn"
            onClick={() => navigate("/login")}
          >
            ← Quay lại đăng nhập
          </button>

          <h2>Quên mật khẩu</h2>
          <p>Nhập email để nhận mã OTP và đặt lại mật khẩu</p>

          {submittedEmail ? (
            <div className="forgot-success" role="status">
              <h3>Mã OTP đã được gửi</h3>
              <p>
                Nếu email <strong>{submittedEmail}</strong> tồn tại trong hệ thống, mã OTP đã được gửi và có hiệu lực trong 5 phút.
              </p>
            </div>
          ) : null}

          {resetSuccess ? (
            <div className="forgot-success" role="status">
              <h3>Khôi phục thành công</h3>
              <p>{resetSuccess}</p>
            </div>
          ) : null}

          <label className="field-label">Email đăng ký</label>
          <div className="input-wrapper">
            <span className="input-icon">✉️</span>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Nhập email của bạn"
              className={errors.email ? "input-error" : ""}
            />
          </div>
          <p className={`error-text error-text--slot ${errors.email ? "" : "error-text--empty"}`}>
            {errors.email || ""}
          </p>

          {submitError ? (
            <p className="error-text">{submitError}</p>
          ) : null}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Đang gửi mã OTP..." : "Gửi mã OTP"}
          </button>

          <div className="forgot-divider">Hoặc đặt lại mật khẩu ngay</div>

          <div className="input-wrapper">
            <span className="input-icon">🔐</span>
            <input
              type="text"
              name="otp"
              value={formData.otp}
              onChange={handleChange}
              placeholder="Nhập mã OTP"
              className={errors.otp ? "input-error" : ""}
            />
          </div>
          <p className={`error-text error-text--slot ${errors.otp ? "" : "error-text--empty"}`}>
            {errors.otp || ""}
          </p>

          <div className="input-wrapper">
            <span className="input-icon">🔒</span>
            <input
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              placeholder="Mật khẩu mới"
              className={errors.newPassword ? "input-error" : ""}
            />
          </div>
          <p className={`error-text error-text--slot ${errors.newPassword ? "" : "error-text--empty"}`}>
            {errors.newPassword || ""}
          </p>

          <div className="input-wrapper">
            <span className="input-icon">🔒</span>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Xác nhận mật khẩu mới"
              className={errors.confirmPassword ? "input-error" : ""}
            />
          </div>
          <p className={`error-text error-text--slot ${errors.confirmPassword ? "" : "error-text--empty"}`}>
            {errors.confirmPassword || ""}
          </p>

          <button
            type="button"
            className="login-btn"
            disabled={loading}
            onClick={handleResetPassword}
          >
            {loading ? "Đang đặt lại mật khẩu..." : "Đặt lại mật khẩu"}
          </button>

          <div className="register-row">
            Nhớ lại mật khẩu? <Link to="/login">Đăng nhập</Link>
          </div>
        </form>
      </div>

      <div className="footer-text">© 2024 GarmentPro. Bảo lưu mọi quyền.</div>
    </div>
  );
}
