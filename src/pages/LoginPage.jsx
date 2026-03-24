import { useEffect, useState } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { getPostLoginPath } from "@/lib/authRouting";
import { getStoredUser } from "@/lib/authStorage";
import { isProfileComplete } from "@/lib/profileCompletion";
import { authService } from "@/services/authService";
import { validatePassword, validateUserName } from "@/lib/validators";
import "../styles/login.css";

const initialValues = { userName: "", password: "" };
const INVALID_CREDENTIALS_MESSAGE = "Tài khoản hoặc mật khẩu không chính xác";

function mapLoginError(err) {
  const status = err?.response?.data?.status ?? err?.status;
  const message = String(
    err?.response?.data?.message ||
    err?.response?.data?.title ||
    ""
  ).trim();
  const normalized = message.toLowerCase();

  if (
    normalized.includes("vô hiệu hóa") ||
    normalized.includes("disabled") ||
    normalized.includes("inactive") ||
    normalized.includes("locked") ||
    normalized.includes("blocked")
  ) {
    return { userName: message };
  }

  if (status === 401 || status === 400 || !message) {
    return {
      userName: INVALID_CREDENTIALS_MESSAGE,
      password: INVALID_CREDENTIALS_MESSAGE,
    };
  }

  if (
    (normalized.includes("tên đăng nhập") || normalized.includes("username") || normalized.includes("user name")) &&
    (normalized.includes("mật khẩu") || normalized.includes("password"))
  ) {
    return {
      userName: INVALID_CREDENTIALS_MESSAGE,
      password: INVALID_CREDENTIALS_MESSAGE,
    };
  }

  if (
    normalized.includes("tên đăng nhập") ||
    normalized.includes("username") ||
    normalized.includes("user name")
  ) {
    return { userName: message };
  }

  if (normalized.includes("mật khẩu") || normalized.includes("password")) {
    return {
      userName: INVALID_CREDENTIALS_MESSAGE,
      password: INVALID_CREDENTIALS_MESSAGE,
    };
  }

  return {
    userName: INVALID_CREDENTIALS_MESSAGE,
    password: INVALID_CREDENTIALS_MESSAGE,
  };
}

export default function LoginPage() {
  const storedUser = getStoredUser();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [remember,     setRemember]     = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [formData,     setFormData]     = useState(initialValues);
  const [errors,       setErrors]       = useState({});

  useEffect(() => {
    const saved = localStorage.getItem("rememberUserName");
    if (saved) {
      setFormData(p => ({ ...p, userName: saved }));
      setRemember(true);
    }
  }, []);

  if (storedUser) {
    return <Navigate to={getPostLoginPath(storedUser?.role)} replace />;
  }

  const validateField = (name, value) => {
    if (name === "userName") return validateUserName(value);
    if (name === "password") return validatePassword(value);
    return "";
  };

  const validate = () => {
    const e = {
      userName: validateField("userName", formData.userName),
      password: validateField("password", formData.password),
    };
    Object.keys(e).forEach((key) => !e[key] && delete e[key]);
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
    setErrors((prev) => {
      const nextErrors = { ...prev };
      const fieldError = validateField(name, value);

      if (
        prev.userName === INVALID_CREDENTIALS_MESSAGE ||
        prev.password === INVALID_CREDENTIALS_MESSAGE
      ) {
        delete nextErrors.userName;
        delete nextErrors.password;
      }

      if (fieldError) nextErrors[name] = fieldError;
      else delete nextErrors[name];

      return nextErrors;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setLoading(true);
      const result = await authService.login({
        userName: formData.userName.trim(),
        password: formData.password,
      });
      if (remember) localStorage.setItem("rememberUserName", formData.userName.trim());
      else          localStorage.removeItem("rememberUserName");

      if (!isProfileComplete(result?.user)) {
        navigate("/profile/edit", { replace: true, state: { forceProfileCompletion: true } });
        return;
      }

      navigate(getPostLoginPath(result?.user?.role));
    } catch (err) {
      setErrors(mapLoginError(err));
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
            Quản lý sản xuất <br />
            thông minh
          </h1>
          <p className="left-desc">Tối ưu hóa quy trình sản xuất, theo dõi tiến độ và quản lý nhân sự hiệu quả</p>
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

      <div className="login-right login-right--center">
        <form className="login-card" onSubmit={handleSubmit}>
          <button
            type="button"
            className="auth-back-btn"
            onClick={() => navigate("/home")}
          >
            ← Về trang chủ
          </button>

          <h2>Đăng nhập</h2>
          <p>Chào mừng trở lại! Vui lòng đăng nhập để tiếp tục</p>

          <label className="field-label">Tên đăng nhập</label>
          <div className="input-wrapper">
            <span className="input-icon">👤</span>
            <input type="text" name="userName" value={formData.userName}
              onChange={handleChange} placeholder="Nhập tên đăng nhập"
              className={errors.userName ? "input-error" : ""} />
          </div>
          <p className={`error-text error-text--slot ${errors.userName ? "" : "error-text--empty"}`}>
            {errors.userName || ""}
          </p>

          <label className="field-label">Mật khẩu</label>
          <div className="input-wrapper">
            <span className="input-icon">🔒</span>
            <input type={showPassword ? "text" : "password"} name="password"
              value={formData.password} onChange={handleChange}
              placeholder="Nhập mật khẩu"
              className={errors.password ? "input-error" : ""} />
            <button type="button" className="eye-btn"
              onClick={() => setShowPassword(p => !p)}>👁</button>
          </div>
          <p className={`error-text error-text--slot ${errors.password ? "" : "error-text--empty"}`}>
            {errors.password || ""}
          </p>

          <div className="options-row">
            <label className="remember-label">
              <input type="checkbox" checked={remember}
                onChange={e => setRemember(e.target.checked)} />
              Ghi nhớ đăng nhập
            </label>
            <a href="#" className="forgot-link">Quên mật khẩu?</a>
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
