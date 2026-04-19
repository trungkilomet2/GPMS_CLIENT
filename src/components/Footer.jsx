import { Link } from "react-router-dom";

const FOOTER_MENU = [
  { label: "Trang chủ", path: "/home" },
  { label: "Giới thiệu", path: "/about" },
  { label: "Sản phẩm may", path: "/services" },
  { label: "Quy trình", path: "/factory" },
  { label: "Liên hệ", path: "/contact" },
];
const FOOTER_SUPPORT = [
  { label: "Hướng dẫn sử dụng", path: "/services" },
  { label: "Câu hỏi thường gặp", path: "/contact" },
  { label: "Chính sách bảo mật", path: "/about" },
  { label: "Điều khoản sử dụng", path: "/about" },
];

const FOOTER_CONTACT = [
  ["📍", "Khu vực vận hành: Hà Nội"],
  ["🧵", "Làm việc theo nhu cầu thực tế của đơn hàng"],
  ["✉️", "Tiếp nhận yêu cầu tại trang Liên hệ"],
];

const FOOTER_SOCIALS = [
  ["f", "Facebook"],
  ["in", "LinkedIn"],
  ["▶", "YouTube"],
];

export default function Footer() {
  return (
    <footer className="footer-root">
      <div className="footer-inner">
        <div className="footer-grid">

          {/* Brand */}
          <div className="footer-brand">
            <div className="footer-logo-row">
              <div className="footer-logo-icon">🧵</div>
              <span className="footer-logo-name">Garment Production Management System</span>
            </div>
            <p className="footer-brand-desc">
              Hệ thống quản lý sản xuất xưởng may hàng đầu Việt Nam. Tối ưu quy trình, nâng cao hiệu quả kinh doanh.
            </p>
            <div className="footer-socials">
              {FOOTER_SOCIALS.map(([icon, label]) => (
                <a key={label} href="#" className="footer-social-btn" aria-label={label}>
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Menu */}
          <div className="footer-col">
            <h4 className="footer-col-head">Menu</h4>
            {FOOTER_MENU.map((item) => <Link key={item.label} to={item.path} className="footer-link">{item.label}</Link>)}
          </div>

          {/* Hỗ trợ */}
          <div className="footer-col">
            <h4 className="footer-col-head">Hỗ trợ</h4>
            {FOOTER_SUPPORT.map((item) => <Link key={item.label} to={item.path} className="footer-link">{item.label}</Link>)}
          </div>

          {/* Contact */}
          <div className="footer-col" style={{ minWidth: 180 }}>
            <h4 className="footer-col-head">Liên hệ</h4>
            {FOOTER_CONTACT.map(([ic, text]) => (
              <div key={text} className="footer-contact-row">
                <span>{ic}</span><span>{text}</span>
              </div>
            ))}
          </div>

        </div>

        <div className="footer-bottom">
          © 2026 GarmentPro – GPMS. Tất cả quyền được bảo lưu.
        </div>
      </div>
    </footer>
  );
}
