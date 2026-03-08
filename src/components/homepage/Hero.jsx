import { useState, useEffect } from "react";
import { STATS } from "../../lib/constants";

export default function Hero() {
  const [animIn, setAnimIn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimIn(true), 80); return () => clearTimeout(t); }, []);

  return (
    <section className="hero-section">
      <img
        className="hero-bg"
        src="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1600&q=85"
        alt="Garment factory"
      />
      <div className="hero-overlay" />

      <div className="hero-content">
        <div className={`hero-inner${animIn ? " animate-in" : ""}`}>
          <div className="hero-badge">
            🌿&nbsp; GARMENT PRODUCTION MANAGEMENT SYSTEM
          </div>

          <h1 className="hero-title-white">Hệ thống quản lý</h1>
          <h1 className="hero-title-green">Sản xuất xưởng may</h1>

          <p className="hero-desc">
            Giải pháp quản lý đơn hàng, sản xuất và chất lượng cho xưởng may hiện đại.
          </p>

          <div className="hero-actions">
            <button className="btn-green">Đăng nhập ngay</button>
            <button className="btn-outline-white">Đăng ký miễn phí</button>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="hero-stats-strip">
        <div className="hero-stats-grid">
          {STATS.map(({ val, sub }) => (
            <div key={sub} className="hero-stat-item">
              <div className="hero-stat-val">{val}</div>
              <div className="hero-stat-sub">{sub}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="hero-spacer" />
    </section>
  );
}