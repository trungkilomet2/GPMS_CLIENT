import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { getPostLoginPath } from "@/lib/authRouting";
import { getStoredUser } from "@/lib/authStorage";
import { validateEmail } from "@/lib/validators";
import { authService } from "@/services/authService";
import "../styles/login.css";

const initialValues = { email: "" };

export default function ForgotPasswordPage() {
  const storedUser = getStoredUser();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [submitError, setSubmitError] = useState("");

  if (storedUser) {
    return <Navigate to={getPostLoginPath(storedUser?.role)} replace />;
  }

  const validate = (email) => {
    const nextErrors = {};
    const emailError = validateEmail(email);
    if (emailError) nextErrors.email = emailError;
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (e) => {
    const { value } = e.target;
    setFormData({ email: value });
    setSubmitError("");
    setErrors((prev) => {
      const nextErrors = { ...prev };
      const emailError = validateEmail(value);
      if (emailError) nextErrors.email = emailError;
      else delete nextErrors.email;
      return nextErrors;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const normalizedEmail = formData.email.trim();
    if (!validate(normalizedEmail)) return;

    try {
      setLoading(true);
      setSubmitError("");
      await authService.requestPasswordReset({ email: normalizedEmail });
      setSubmittedEmail(normalizedEmail);
      setFormData(initialValues);
      setErrors({});
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
              { icon: "⚡", title: "Xử lý nhanh chóng", desc: "Người dùng có thể gửi yêu cầu ngay trên giao diện hiện tại chỉ với vài thao tác" },
              { icon: "🔗", title: "Sẵn sàng kết nối backend", desc: "Luồng giao diện đã tách riêng qua service để dễ dàng nối API chính thức" },
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
        <form className="login-card forgot-card" onSubmit={handleSubmit}>
          <button
            type="button"
            className="auth-back-btn"
            onClick={() => navigate("/login")}
          >
            ← Quay lại đăng nhập
          </button>

          <h2>Quên mật khẩu</h2>
          <p>Nhập email để nhận hướng dẫn khôi phục mật khẩu</p>

          {submittedEmail ? (
            <div className="forgot-success" role="status">
              <h3>Kiểm tra email của bạn</h3>
              <p>
                Chúng tôi đã tiếp nhận yêu cầu khôi phục mật khẩu cho <strong>{submittedEmail}</strong>. Vui lòng kiểm tra hộp thư đến và cả thư rác trong vài phút tới.
              </p>
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
            {loading ? "Đang gửi hướng dẫn..." : "Gửi hướng dẫn khôi phục"}
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
