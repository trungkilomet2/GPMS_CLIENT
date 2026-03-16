import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authService } from "../services/authService";
import SuccessModal from "@/components/SuccessModal";
import {
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
  userName: "",
  password: "",
  confirmPassword: "",
  agree: false,
};

export default function RegisterPage() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [successOpen, setSuccessOpen] = useState(false);
  const redirectTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    };
  }, []);

  const validateField = (name, value, nextForm = formData) => {
    if (name === "fullName") return validateFullName(value);
    if (name === "userName") return validateUserName(value);
    if (name === "password") return validatePassword(value);
    if (name === "confirmPassword") {
      return validateConfirmPassword(nextForm.password, value);
    }
    if (name === "agree") return value ? "" : "Bạn phải đồng ý với điều khoản";
    return "";
  };

  const validateForm = () => {
    const newErrors = {};
    Object.keys(formData).forEach((key) => {
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
    setErrors((prev) => ({
      ...prev,
      [name]: validateField(name, nextValue, nextForm),
      ...(name === "password"
        ? { confirmPassword: validateField("confirmPassword", nextForm.confirmPassword, nextForm) }
        : {}),
    }));
  };

  const goLogin = () => {
    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
    setSuccessOpen(false);
    navigate("/login");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setLoading(true);

      const payload = {
        userName: formData.userName.trim(),
        fullName: normalizeSpaces(formData.fullName),
        password: formData.password,
        rePassword: formData.confirmPassword,
      };

      await authService.register(payload);

      setSuccessOpen(true);
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = setTimeout(goLogin, 1200);
    } catch (error) {
      alert(
        error?.response?.data?.message ||
        error?.response?.data?.title ||
        "Đăng ký thất bại"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <SuccessModal
        isOpen={successOpen}
        title="Đăng ký thành công"
        description="Tài khoản đã được tạo. Bạn sẽ được chuyển sang trang đăng nhập."
        primaryLabel="Đăng nhập ngay"
        secondaryLabel="Để sau"
        onPrimary={goLogin}
        onClose={() => {
          if (redirectTimerRef.current) {
            clearTimeout(redirectTimerRef.current);
            redirectTimerRef.current = null;
          }
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

          <button type="submit" className="register-btn" disabled={loading}>
            {loading ? "Đang đăng ký..." : "Đăng ký"}
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
