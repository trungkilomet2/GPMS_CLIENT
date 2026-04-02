import Fade from "../Fade";
import { useNavigate } from "react-router-dom";

const PRODUCTS_LIST = ["Áo thun", "Áo sơ mi", "Đồng phục", "Váy đầm", "Quần áo trẻ em"];
const HIGHLIGHTS = ["10+ năm kinh nghiệm", "200+ công nhân", "500+ đơn hàng/tháng"];

export default function Intro() {
  const navigate = useNavigate();

  return (
    <section className="intro-section">
      <div className="intro-grid">

        {/* Left: text */}
        <Fade style={{ flex: 1, minWidth: 280 }}>
          <p className="section-eyebrow">Về chúng tôi</p>
          <h2 className="section-title">
            Giới thiệu<br /><span>xưởng may</span>
          </h2>

          <p style={{ color: "var(--text-mid)", fontSize: ".92rem", marginBottom: ".85rem", lineHeight: 1.65 }}>
            Xưởng may chuyên sản xuất các loại:
          </p>
          <ul style={{ paddingLeft: "1.1rem", color: "var(--text-mid)", fontSize: ".92rem", lineHeight: 2.1, marginBottom: "1.75rem" }}>
            {PRODUCTS_LIST.map(item => <li key={item}>{item}</li>)}
          </ul>

          <div className="intro-check-grid">
            {HIGHLIGHTS.map(t => (
              <div key={t} className="intro-check-item">
                <span className="check-icon">✓</span>{t}
              </div>
            ))}
          </div>

          <button className="btn-green" onClick={() => navigate("/about")}>Chi tiết →</button>
        </Fade>

        {/* Right: image */}
        <Fade delay={0.15} style={{ flex: 1.1, minWidth: 280 }}>
          <div className="intro-image-wrap">
            <img
              src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80"
              alt="Công nhân xưởng may"
            />
            <div className="intro-image-overlay" />
          </div>
        </Fade>

      </div>
    </section>
  );
}
