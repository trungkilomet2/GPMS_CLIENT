
import { useState } from "react";
import "../styles/login.css";
import "../styles/register.css";

export default function RegisterPage() {

const [showPassword,setShowPassword]=useState(false);
const [showConfirm,setShowConfirm]=useState(false);

return (

<div className="login-container">

{/* LEFT SIDE */}
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
Quản lý sản xuất thông minh
</h1>

<p className="left-desc">
Tối ưu hóa quy trình sản xuất, theo dõi tiến độ và quản lý nhân sự hiệu quả
</p>

</div>

</div>


{/* RIGHT SIDE */}
<div className="login-right">

<div className="login-card register-card">

<div className="register-logo">
🏭
</div>

<h2>Tạo tài khoản mới</h2>

<p>Hệ thống quản lý sản xuất may mặc</p>


{/* FULL NAME */}
<label className="field-label">
Họ và tên *
</label>

<div className="input-wrapper">
<span className="input-icon">👤</span>

<input
placeholder="Nhập họ và tên của bạn"
/>
</div>


{/* PHONE */}
<label className="field-label">
Số điện thoại *
</label>

<div className="input-wrapper">
<span className="input-icon">📞</span>

<input
placeholder="Nhập số điện thoại"
/>
</div>


{/* EMAIL */}
<label className="field-label">
Email *
</label>

<div className="input-wrapper">
<span className="input-icon">✉️</span>

<input
placeholder="example@company.com"
/>
</div>


{/* PASSWORD */}
<label className="field-label">
Mật khẩu *
</label>

<div className="input-wrapper">

<span className="input-icon">🔒</span>

<input
type={showPassword?"text":"password"}
placeholder="Nhập mật khẩu"
/>

<button
className="eye-btn"
onClick={()=>setShowPassword(!showPassword)}
>
👁
</button>

</div>


{/* CONFIRM PASSWORD */}
<label className="field-label">
Xác nhận mật khẩu *
</label>

<div className="input-wrapper">

<span className="input-icon">🔑</span>

<input
type={showConfirm?"text":"password"}
placeholder="Nhập lại mật khẩu"
/>

<button
className="eye-btn"
onClick={()=>setShowConfirm(!showConfirm)}
>
👁
</button>

</div>


{/* AGREEMENT */}
<div className="terms">

<input type="checkbox"/>

<p>
Tôi đồng ý với <b>Điều khoản dịch vụ</b>
<br/>
và <b>Chính sách bảo mật</b>
</p>

</div>


{/* REGISTER BUTTON */}
<button className="register-btn">
Đăng ký →
</button>


{/* LOGIN LINK */}
<div className="register-row">
Đã có tài khoản? <a href="/login">Đăng nhập</a>
</div>

</div>

</div>

</div>

)

}