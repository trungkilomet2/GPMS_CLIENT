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
  const isOtpStep = Boolean(submittedEmail);

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

  const handleBackToEmailStep = () => {
    setSubmittedEmail("");
    setSubmitError("");
    setResetSuccess("");
    setErrors({});
    setFormData((prev) => ({
      ...prev,
      otp: "",
      newPassword: "",
      confirmPassword: "",
    }));
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
            Khôi phục mật khẩu
            <br />
            trong 2 bước
          </h1>
          <p className="left-desc">
            Nhập email đã đăng ký, nhận OTP và đặt lại mật khẩu ngay trên cùng một màn hình.
          </p>
          <div className="features-box">
            {[
              { icon: "📨", title: "Nhận mã OTP", desc: "Hệ thống gửi mã xác minh đến email đã đăng ký" },
              { icon: "🔐", title: "Đặt lại ngay", desc: "Nhập OTP và mật khẩu mới để khôi phục tài khoản" },
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
        <form
          className="login-card forgot-card"
          onSubmit={isOtpStep ? handleResetPassword : handleRequestOtp}
        >
          <button
            type="button"
            className="auth-back-btn"
            onClick={() => navigate("/login")}
          >
            ← Quay lại đăng nhập
          </button>

          <h2>Quên mật khẩu</h2>
          <p>
            {isOtpStep
              ? "Nhập mã OTP và mật khẩu mới để hoàn tất khôi phục."
              : "Bước 1: Nhập email để nhận mã OTP."}
          </p>

          <div className="forgot-stepper" aria-label="Tiến trình quên mật khẩu">
            <div className={`forgot-step ${!isOtpStep ? "is-active" : "is-complete"}`}>
              <span>1</span>
              <strong>Nhập email</strong>
            </div>
            <div className={`forgot-step ${isOtpStep ? "is-active" : ""}`}>
              <span>2</span>
              <strong>Đặt lại mật khẩu</strong>
            </div>
          </div>

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
              disabled={isOtpStep}
            />
          </div>
          <p className={`error-text error-text--slot ${errors.email ? "" : "error-text--empty"}`}>
            {errors.email || ""}
          </p>

          {submitError ? (
            <p className="error-text">{submitError}</p>
          ) : null}

          {isOtpStep ? (
            <>
              <div className="forgot-inline-actions">
                <button
                  type="button"
                  className="forgot-link-btn"
                  onClick={handleBackToEmailStep}
                  disabled={loading}
                >
                  Đổi email khác
                </button>
                <button
                  type="button"
                  className="forgot-link-btn"
                  onClick={handleRequestOtp}
                  disabled={loading}
                >
                  Gửi lại OTP
                </button>
              </div>

              <label className="field-label">Mã OTP</label>
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

              <label className="field-label">Mật khẩu mới</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  type="password"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="Nhập mật khẩu mới"
                  className={errors.newPassword ? "input-error" : ""}
                />
              </div>
              <p className={`error-text error-text--slot ${errors.newPassword ? "" : "error-text--empty"}`}>
                {errors.newPassword || ""}
              </p>

              <label className="field-label">Xác nhận mật khẩu mới</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Nhập lại mật khẩu mới"
                  className={errors.confirmPassword ? "input-error" : ""}
                />
              </div>
              <p className={`error-text error-text--slot ${errors.confirmPassword ? "" : "error-text--empty"}`}>
                {errors.confirmPassword || ""}
              </p>

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? "Đang đặt lại mật khẩu..." : "Đặt lại mật khẩu"}
              </button>
            </>
          ) : (
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Đang gửi mã OTP..." : "Gửi mã OTP"}
            </button>
          )}

          <div className="register-row">
            Nhớ lại mật khẩu? <Link to="/login">Đăng nhập</Link>
          </div>
        </form>
      </div>

    </div>
  );
}
