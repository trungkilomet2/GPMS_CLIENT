import { Link } from "react-router-dom";
import { PUBLIC_SITE_CONTENT } from "@/lib/publicSiteContent";

const FOOTER_MENU = [
  { label: "Trang chủ", path: "/home" },
  { label: "Giới thiệu", path: "/about" },
  { label: "Dịch vụ", path: "/services" },
  { label: "Xưởng may", path: "/factory" },
  { label: "Liên hệ", path: "/contact" },
];
const FOOTER_SUPPORT = [
  { label: "Tư vấn báo giá", path: "/contact" },
  { label: "Năng lực xưởng", path: "/factory" },
  { label: "Dịch vụ gia công", path: "/services" },
  { label: "Hợp tác sản xuất", path: "/contact" },
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
              <span className="footer-logo-name">{PUBLIC_SITE_CONTENT.brandName}</span>
            </div>
            <p className="footer-brand-desc">
              {PUBLIC_SITE_CONTENT.brandDescription}
            </p>
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
            {PUBLIC_SITE_CONTENT.footerContact.map(([ic, text]) => (
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
