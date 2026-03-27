import { Link } from "react-router-dom";

const FOOTER_MENU = [
  { label: "Trang chủ", path: "/home" },
  { label: "Giới thiệu", path: "/pages/gioi-thieu" },
  { label: "Dịch vụ", path: "/pages/dich-vu" },
  { label: "Quy trình đặt may", path: "/pages/quy-trinh-dat-may" },
  { label: "Liên hệ", path: "/pages/lien-he" },
];
const FOOTER_SUPPORT = [
  { label: "Thông tin xưởng", path: "/pages/xuong-may" },
  { label: "Năng lực xưởng may", path: "/pages/nang-luc-xuong-may" },
  { label: "Sản phẩm gia công", path: "/pages/san-pham-gia-cong" },
  { label: "Tin tức ngành may", path: "/pages/tin-tuc-nganh-may" },
];
const FOOTER_CONTACT = [
  ["📍", "123 Đường ABC, Quận 1, TP.HCM"],
  ["📞", "(+84) 123 456 789"],
  ["✉️", "info@garmentpro.vn"],
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
              {[["f", "Facebook"], ["in", "LinkedIn"], ["▶", "YouTube"]].map(([ic, label]) => (
                <a key={label} href="#" className="footer-social-btn" aria-label={label}>{ic}</a>
              ))}
            </div>
          </div>

          {/* Menu */}
          <div className="footer-col">
            <h4 className="footer-col-head">Menu</h4>
            {FOOTER_MENU.map((item) => <Link key={item.path} to={item.path} className="footer-link">{item.label}</Link>)}
          </div>

          {/* Hỗ trợ */}
          <div className="footer-col">
            <h4 className="footer-col-head">Hỗ trợ</h4>
            {FOOTER_SUPPORT.map((item) => <Link key={item.path} to={item.path} className="footer-link">{item.label}</Link>)}
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
          © 2024 GarmentPro – GPMS. Tất cả quyền được bảo lưu.
        </div>
      </div>
    </footer>
  );
}
