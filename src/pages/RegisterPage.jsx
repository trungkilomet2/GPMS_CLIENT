import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authService } from "../services/authService";
import "../styles/login.css";
import "../styles/register.css";

const initialValues = {
  fullName: "",
  userName: "",
  phoneNumber: "",
  email: "",
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

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone) => /^(0|\+84)[0-9]{9,10}$/.test(phone);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Vui lòng nhập họ và tên";
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = "Họ và tên phải có ít nhất 2 ký tự";
    }

    if (!formData.userName.trim()) {
      newErrors.userName = "Vui lòng nhập tên đăng nhập";
    } else if (formData.userName.trim().length < 3) {
      newErrors.userName = "Tên đăng nhập phải có ít nhất 3 ký tự";
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = "Vui lòng nhập số điện thoại";
    } else if (!validatePhone(formData.phoneNumber.trim())) {
      newErrors.phoneNumber = "Số điện thoại không hợp lệ";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Vui lòng nhập email";
    } else if (!validateEmail(formData.email.trim())) {
      newErrors.email = "Email không hợp lệ";
    }

    if (!formData.password.trim()) {
      newErrors.password = "Vui lòng nhập mật khẩu";
    } else if (formData.password.length < 6) {
      newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự";
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = "Vui lòng nhập xác nhận mật khẩu";
    } else if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = "Mật khẩu xác nhận không khớp";
    }

    if (!formData.agree) {
      newErrors.agree = "Bạn phải đồng ý với điều khoản";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setLoading(true);

      const payload = {
        fullName: formData.fullName.trim(),
        userName: formData.userName.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        email: formData.email.trim(),
        password: formData.password,
      };

      const result = await authService.register(payload);
      alert(result?.message || "Đăng ký thành công");
      navigate("/home");
    } catch (error) {
      alert(
        error?.response?.data?.message ||
        error?.response?.data?.title ||
        "Đăng ký thất bại. Vui lòng thử lại."
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

          <h1 className="left-heading">Quản lý sản xuất thông minh</h1>

          <p className="left-desc">
            Tối ưu hóa quy trình sản xuất, theo dõi tiến độ và quản lý nhân sự hiệu quả
          </p>
        </div>
      </div>

      <div className="login-right">
        <form className="login-card register-card" onSubmit={handleSubmit}>
          <div className="register-logo">🏭</div>

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

          <label className="field-label">Số điện thoại *</label>
          <div className="input-wrapper">
            <span className="input-icon">📞</span>
            <input
              type="text"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="Nhập số điện thoại"
              className={errors.phoneNumber ? "input-error" : ""}
            />
          </div>
          {errors.phoneNumber && (
            <p className="error-text">{errors.phoneNumber}</p>
          )}

          <label className="field-label">Email *</label>
          <div className="input-wrapper">
            <span className="input-icon">✉️</span>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Nhập email"
              className={errors.email ? "input-error" : ""}
            />
          </div>
          {errors.email && <p className="error-text">{errors.email}</p>}

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