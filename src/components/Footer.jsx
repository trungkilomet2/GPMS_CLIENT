import { C } from "../lib/constants";

const FOOTER_MENU = ["Trang chủ", "Giới thiệu", "Sản phẩm may", "Quy trình", "Liên hệ"];
const FOOTER_SUPPORT = ["Hướng dẫn sử dụng", "Câu hỏi thường gặp", "Chính sách bảo mật", "Điều khoản sử dụng"];
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
            {FOOTER_MENU.map(l => <a key={l} href="#" className="footer-link">{l}</a>)}
          </div>

          {/* Hỗ trợ */}
          <div className="footer-col">
            <h4 className="footer-col-head">Hỗ trợ</h4>
            {FOOTER_SUPPORT.map(l => <a key={l} href="#" className="footer-link">{l}</a>)}
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