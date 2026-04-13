import { useState, useEffect } from "react";
import { STATS } from "../../lib/constants";
import { useNavigate } from "react-router-dom";
import { getStoredUser } from "@/lib/authStorage";
import { ArrowRight, CheckCircle2, ClipboardList, Leaf, ShieldCheck, UsersRound } from "lucide-react";

const HERO_PILLS = [
  "Theo dõi đơn hàng và tiến độ sản xuất trên một hệ thống",
  "Phân vai trò rõ giữa chủ xưởng, quản lý, thợ và quản trị viên",
  "Giảm phụ thuộc vào ghi chú tay, tin nhắn và bảng theo dõi rời rạc",
];

const HERO_PANEL_ITEMS = [
  { icon: ClipboardList, label: "Đơn hàng", value: "Tạo, duyệt, theo dõi trạng thái" },
  { icon: UsersRound, label: "Nhân sự", value: "Phân công, nghỉ phép, kỹ năng" },
  { icon: ShieldCheck, label: "Quản trị", value: "Tài khoản, quyền hạn, nhật ký" },
];

export default function Hero() {
  const navigate = useNavigate();
  const [animIn, setAnimIn] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const load = () => {
      setUser(getStoredUser());
    };

    load();
    window.addEventListener("auth-change", load);
    return () => window.removeEventListener("auth-change", load);
  }, []);

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
        <div className={`hero-layout${animIn ? " animate-in" : ""}`}>
          <div className="hero-inner">
            <div className="hero-badge">
              <Leaf size={14} strokeWidth={2.1} />
              <span>Phần mềm quản lý xưởng may trên nền web</span>
            </div>

            <h1 className="hero-title-white">Quản lý xưởng may</h1>
            <h1 className="hero-title-green">rõ việc, rõ tiến độ</h1>

            <p className="hero-desc">
              GPMS là hệ thống hỗ trợ quản lý đơn hàng, kế hoạch sản xuất, phân công thợ, nghỉ phép, lương và vận hành nội bộ trong cùng một nơi, phù hợp cho mô hình xưởng may cần theo dõi sát từng khâu.
            </p>

            <div className="hero-pill-row">
              {HERO_PILLS.map((item) => (
                <div key={item} className="hero-pill">
                  <CheckCircle2 size={16} strokeWidth={2.2} />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="hero-actions">
              {user ? (
                <>
                  <button className="btn-green" onClick={() => navigate("/orders")}>
                    Xem đơn hàng
                    <ArrowRight size={16} />
                  </button>
                  <button className="btn-outline-white" onClick={() => navigate("/profile")}>Hồ sơ của tôi</button>
                </>
              ) : (
                <>
                  <button className="btn-green" onClick={() => navigate("/login")}>
                    Đăng nhập hệ thống
                    <ArrowRight size={16} />
                  </button>
                  <button className="btn-outline-white" onClick={() => navigate("/register")}>Tạo tài khoản</button>
                </>
              )}
            </div>
          </div>

          <div className="hero-panel">
            <div className="hero-panel__eyebrow">Dành cho vận hành xưởng</div>
            <div className="hero-panel__title">Một nơi để nhìn nhanh tình trạng đơn hàng, sản xuất và nhân sự</div>
            <div className="hero-panel__list">
              {HERO_PANEL_ITEMS.map(({ icon: Icon, label, value }) => (
                <div key={label} className="hero-panel__item">
                  <div className="hero-panel__icon">
                    <Icon size={18} strokeWidth={2.1} />
                  </div>
                  <div>
                    <div className="hero-panel__label">{label}</div>
                    <div className="hero-panel__value">{value}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="hero-panel__note">
              Giao diện trang chủ được viết theo đúng ngữ cảnh của một hệ thống quản lý xưởng may, không đi theo kiểu landing page quảng cáo chung chung.
            </div>
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
