import { useState } from "react";
import "../styles/login.css";

export default function LoginPage() {

  const [showPassword,setShowPassword] = useState(false);
  const [remember,setRemember] = useState(false);

  return (

<div className="login-container">

{/* LEFT SIDE */}

<div className="login-left">

<div className="bg-photo"></div>
<div className="bg-overlay"></div>

<div className="left-content">

{/* BRAND */}

<div className="brand">

<div className="brand-logo">🏭</div>

<div className="brand-text">
<h2>GPMS</h2>
<p>Hệ thống quản lý sản xuất may mặc</p>
</div>

</div>

<h1 className="left-heading">
Quản lý sản xuất thông minh
</h1>

<p className="left-desc">
Tối ưu hóa quy trình sản xuất, theo dõi tiến độ và quản lý nhân sự hiệu quả
</p>

{/* FEATURES BLOCK */}

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

{/* RIGHT SIDE */}

<div className="login-right">

<div className="login-card">

<h2>Đăng nhập</h2>

<p>Chào mừng trở lại! Vui lòng đăng nhập để tiếp tục</p>

<label className="field-label">
Tên tài khoản hoặc Số điện thoại
</label>

<div className="input-wrapper">

<span className="input-icon">⌨</span>

<input placeholder="tentaikhoan hoặc 0912345678" />

</div>

<label className="field-label">
Mật khẩu
</label>

<div className="input-wrapper">

<span className="input-icon">✂</span>

<input
type={showPassword ? "text" : "password"}
placeholder="Nhập mật khẩu"
/>

<button
className="eye-btn"
onClick={()=>setShowPassword(!showPassword)}
>
👁
</button>

</div>

<div className="options-row">

<label className="remember-label">

<input
type="checkbox"
checked={remember}
onChange={(e)=>setRemember(e.target.checked)}
/>

Ghi nhớ đăng nhập

</label>

<a href="#" className="forgot-link">
Quên mật khẩu?
</a>

</div>

<button className="login-btn">
Đăng nhập
</button>

<div className="register-row">
Chưa có tài khoản? <a href="/register">Đăng ký ngay</a>
</div>

</div>

</div>


</div>

  );
}