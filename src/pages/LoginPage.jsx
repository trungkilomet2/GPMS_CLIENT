import { useEffect, useState } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  Clock3,
  Lock,
  Package,
  User,
} from "lucide-react";
import { getPostLoginPath } from "@/lib/authRouting";
import { getStoredUser } from "@/lib/authStorage";
import { isProfileComplete } from "@/lib/profileCompletion";
import { authService } from "@/services/authService";
import { validatePassword, validateUserName } from "@/lib/validators";
import "../styles/login.css";

const initialValues = { userName: "", password: "" };
const INVALID_CREDENTIALS_MESSAGE = "Tài khoản hoặc mật khẩu không chính xác";
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
          <p className="left-desc">Đăng nhập để tiếp tục theo dõi đơn hàng, nhân sự và tiến độ vận hành của xưởng trên cùng một hệ thống.</p>
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

      <div className="login-right login-right--center">
        <form className="login-card" onSubmit={handleSubmit}>
          <button
            type="button"
            className="auth-back-btn"
            onClick={() => navigate("/home")}
          >
            <ArrowLeft size={16} />
            <span>Về trang chủ</span>
          </button>

          <div className="login-mobile-hero">
            <div className="login-mobile-hero__brand">
              <div className="brand-logo"><BrandMark /></div>
              <div className="brand-text">
                <h2>GPMS</h2>
                <p>Quản lý sản xuất may mặc</p>
              </div>
            </div>
            <p className="login-mobile-hero__desc">
              Đăng nhập nhanh để tiếp tục theo dõi đơn hàng, nhân sự và tiến độ sản xuất.
            </p>
          </div>

          <h2>Đăng nhập</h2>
          <p>Chào mừng trở lại! Vui lòng đăng nhập để tiếp tục</p>

          <label className="field-label">Tên đăng nhập</label>
          <div className="input-wrapper">
            <span className="input-icon"><User size={17} strokeWidth={2} /></span>
            <input type="text" name="userName" value={formData.userName}
              onChange={handleChange} placeholder="Nhập tên đăng nhập"
              className={errors.userName ? "input-error" : ""} />
          </div>
          <p className={`error-text error-text--slot ${errors.userName ? "" : "error-text--empty"}`}>
            {errors.userName || ""}
          </p>

          <label className="field-label">Mật khẩu</label>
          <div className="input-wrapper">
            <span className="input-icon"><Lock size={17} strokeWidth={2} /></span>
            <input type={showPassword ? "text" : "password"} name="password"
              value={formData.password} onChange={handleChange}
              placeholder="Nhập mật khẩu"
              className={errors.password ? "input-error" : ""} />
            <button type="button" className="eye-btn"
              onClick={() => setShowPassword(p => !p)}
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            ><EyeIcon open={showPassword} /></button>
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
            <Link to="/forgot-password" className="forgot-link">Quên mật khẩu?</Link>
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
