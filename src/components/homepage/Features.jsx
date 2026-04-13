import Fade from "../Fade";
import { FEATURES } from "../../lib/constants";
import { BarChart3, ClipboardList, Package, ShieldCheck } from "lucide-react";

const FEATURE_ICONS = [Package, ClipboardList, ShieldCheck, BarChart3];

export default function Features() {
  return (
    <section className="features-section">
      <div className="features-grid">

        {/* Left: image with floating badge */}
        <Fade style={{ flex: 1.1, minWidth: 280 }}>
          <div className="features-image-wrap">
            <img
              src="https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80"
              alt="Các chức năng chính của GPMS"
            />
            <div className="features-badge">
              <div className="features-badge-icon">
                <BarChart3 size={18} strokeWidth={2.1} />
              </div>
              <div>
                <div className="features-badge-val">89 use cases</div>
                <div className="features-badge-sub">được mô tả trong SRS hiện tại</div>
              </div>
            </div>
          </div>
        </Fade>

        {/* Right: feature list */}
        <Fade delay={0.12} style={{ flex: 1, minWidth: 280 }}>
          <p className="section-eyebrow">Chức năng chính</p>
          <h2 className="section-title">
            Các nhóm chức năng <br /><span>đúng với hệ thống</span>
          </h2>

          <div className="features-items">
            {FEATURES.map((f, index) => {
              const Icon = FEATURE_ICONS[index] || Package;
              return (
              <div key={f.title} className="fi">
                <div className="fi-icon"><Icon size={18} strokeWidth={2.1} /></div>
                <div>
                  <div className="fi-title">{f.title}</div>
                  <div className="fi-desc">{f.desc}</div>
                </div>
              </div>
            );
            })}
          </div>
        </Fade>

      </div>
    </section>
  );
}
