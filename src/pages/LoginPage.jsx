import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authService } from "../services/authService";
import "../styles/login.css";

const initialValues = {
  userName: "",
  password: "",
};

export default function LoginPage() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(initialValues);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const savedUserName = localStorage.getItem("rememberUserName");
    if (savedUserName) {
      setFormData((prev) => ({
        ...prev,
        userName: savedUserName,
      }));
      setRemember(true);
    }
  }, []);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.userName.trim()) {
      newErrors.userName = "Vui lòng nhập tên đăng nhập";
    } else if (formData.userName.trim().length < 3) {
      newErrors.userName = "Tên đăng nhập phải có ít nhất 3 ký tự";
    }

    if (!formData.password.trim()) {
      newErrors.password = "Vui lòng nhập mật khẩu";
    } else if (formData.password.length < 6) {
      newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
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
        userName: formData.userName.trim(),
        password: formData.password,
      };

      const result = await authService.login(payload);

      if (remember) {
        localStorage.setItem("rememberUserName", formData.userName.trim());
      } else {
        localStorage.removeItem("rememberUserName");
      }

      if (result?.token) {
        localStorage.setItem("token", result.token);
      }

      if (result?.user) {
        localStorage.setItem("user", JSON.stringify(result.user));
      }

      navigate("/home");
    } catch (error) {
      alert(
        error?.response?.data?.message ||
        error?.response?.data?.title ||
        "Đăng nhập thất bại. Vui lòng kiểm tra lại."
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

          <div className="features-box">
            <div className="feature">
              <div className="icon">⏱</div>
              <div>
                <h4>Theo dõi thời gian thực</h4>
                <p>Giám sát tiến độ sản xuất mọi lúc mọi nơi</p>
              </div>
            </div>

            <div className="feature">
              <div className="icon">👔</div>
              <div>
                <h4>Quản lý nhân sự</h4>
                <p>Phân công công việc và theo dõi hiệu suất</p>
              </div>
            </div>

            <div className="feature">
              <div className="icon">📦</div>
              <div>
                <h4>Quản lý đơn hàng</h4>
                <p>Theo dõi đơn hàng từ A đến Z</p>
              </div>
            </div>

            <div className="feature">
              <div className="icon">📊</div>
              <div>
                <h4>Báo cáo chi tiết</h4>
                <p>Phân tích dữ liệu và tạo báo cáo tự động</p>
              </div>
            </div>
          </div>
        </div>

        <div className="tape"></div>
      </div>

      <div className="login-right">
        <form className="login-card" onSubmit={handleSubmit}>
          <h2>Đăng nhập</h2>
          <p>Chào mừng trở lại! Vui lòng đăng nhập để tiếp tục</p>

          <label className="field-label">Tên đăng nhập</label>
          <div className="input-wrapper">
            <span className="input-icon">👤</span>
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

          <label className="field-label">Mật khẩu</label>
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

          <div className="options-row">
            <label className="remember-label">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Ghi nhớ đăng nhập
            </label>

            <a href="#" className="forgot-link">
              Quên mật khẩu?
            </a>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>

          <div className="register-row">
            Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
          </div>
        </form>
      </div>

      <div className="footer-text">© 2024 GarmentPro. Bảo lưu mọi quyền.</div>
    </div>
  );
}