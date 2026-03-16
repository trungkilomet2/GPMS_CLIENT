import Fade from "../Fade";
import { FEATURES } from "../../lib/constants";

export default function Features() {
  return (
    <section className="features-section">
      <div className="features-grid">

        {/* Left: image with floating badge */}
        <Fade style={{ flex: 1.1, minWidth: 280 }}>
          <div className="features-image-wrap">
            <img
              src="https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80"
              alt="Dây chuyền sản xuất"
            />
            <div className="features-badge">
              <div className="features-badge-icon">📈</div>
              <div>
                <div className="features-badge-val">+40% năng suất</div>
                <div className="features-badge-sub">so với quản lý thủ công</div>
              </div>
            </div>
          </div>
        </Fade>

        {/* Right: feature list */}
        <Fade delay={0.12} style={{ flex: 1, minWidth: 280 }}>
          <p className="section-eyebrow">Chức năng chính</p>
          <h2 className="section-title">
            Quản lý toàn diện<br /><span>mọi quy trình sản xuất</span>
          </h2>

          <div className="features-items">
            {FEATURES.map(f => (
              <div key={f.title} className="fi">
                <div className="fi-icon">{f.icon}</div>
                <div>
                  <div className="fi-title">{f.title}</div>
                  <div className="fi-desc">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Fade>

      </div>
    </section>
  );
}