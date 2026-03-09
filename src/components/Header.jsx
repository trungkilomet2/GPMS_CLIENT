import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { C, NAV_MENU, CATEGORIES, SvgIcon } from "../lib/constants";

// ── Auth nav items (logged-in Tier 2) ──
const AUTH_NAV = [
  { label: "Trang chủ", path: "/home" },
  { label: "Sản phẩm",  path: "/products" },
  { label: "Đơn hàng",  path: "/orders" },
];

const ICON_CART = "M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM5.1 4H2V2H0v2h2l3.6 7.59L4.25 14C4.09 14.31 4 14.65 4 15c0 1.1.9 2 2 2h14v-2H6.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63H19c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0023.46 4H5.1z";

export default function Header() {
  const navigate = useNavigate();

  const [user,        setUser]        = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [catOpen,     setCatOpen]     = useState(false);
  const [openMenu,    setOpenMenu]    = useState(null);

  // Load user từ localStorage khi mount
  // và lắng nghe event "auth-change" để re-render ngay sau login/logout
  useEffect(() => {
    const load = () => {
      const data = localStorage.getItem("user");
      setUser(data ? JSON.parse(data) : null);
    };
    load();
    window.addEventListener("auth-change", load);
    return () => window.removeEventListener("auth-change", load);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const close = () => {
      setCatOpen(false);
      setOpenMenu(null);
      setProfileOpen(false);
    };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
    setProfileOpen(false);
    window.dispatchEvent(new Event("auth-change"));
    navigate("/home");
  };

  // Initials fallback nếu không có avatar
  const initials = user?.name
    ? user.name.split(" ").map(w => w[0]).slice(-2).join("").toUpperCase()
    : "U";

  return (
    <header className="header-root">

      {/* ══ TIER 1 ══ */}
      <div className="header-top">
        <div className="header-top-inner">

          {/* Logo */}
          <div className="header-logo" style={{ cursor: "pointer" }} onClick={() => navigate("/home")}>
            <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
              <div style={{ width: 32, height: 32, background: C.green, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>
                🧵
              </div>
              <div>
                <div className="header-logo-name">XƯỞNG MAY &nbsp;<span>GPMS</span></div>
                <div className="header-logo-tag">Hàng xuất – Giá tốt</div>
              </div>
            </div>
          </div>

          {/* Contact — chỉ hiện khi chưa login */}
          {!user && (
            <div className="header-contact-area" style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <button className="header-contact-btn">
                <div className="header-contact-icon">✉️</div>
                <div>
                  <div className="header-contact-label">Email Us</div>
                  <div className="header-contact-value">info@garmentpro.vn</div>
                </div>
              </button>
              <button className="header-contact-btn">
                <div className="header-contact-icon">📞</div>
                <div>
                  <div className="header-contact-label">Call Us</div>
                  <div className="header-contact-value">(+84) 123 456 789</div>
                </div>
              </button>
            </div>
          )}

          {/* Auth area */}
          <div style={{ display: "flex", gap: ".8rem", alignItems: "center", marginLeft: "auto" }}>

            {user ? (
              <>
                {/* Greeting */}
                <span style={{ fontSize: ".85rem", color: C.textMid, fontWeight: 500 }}>
                  Xin chào, <strong style={{ color: C.green }}>{user.name}</strong>
                </span>

                {/* Cart */}
                <button
                  onClick={() => navigate("/orders")}
                  style={{ background: "none", border: "none", cursor: "pointer", color: C.text, display: "flex", alignItems: "center", padding: ".3rem" }}
                  title="Đơn hàng"
                >
                  <SvgIcon d={ICON_CART} size={22} />
                </button>

                {/* Avatar + dropdown */}
                <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
                  <button
                    className="avatar-btn"
                    onClick={() => setProfileOpen(o => !o)}
                  >
                    {user.avatarUrl
                      ? <img src={user.avatarUrl} alt="avatar" className="avatar-img" />
                      : <div className="avatar-initials">{initials}</div>
                    }
                    <span className="avatar-name">{user.name}</span>
                    <span style={{ fontSize: ".65rem", opacity: .6 }}>▾</span>
                  </button>

                  {profileOpen && (
                    <div className="avatar-dropdown">
                      <div className="avatar-dropdown-header">
                        <div style={{ fontWeight: 700, color: C.text, fontSize: ".88rem" }}>{user.name}</div>
                        <div style={{ fontSize: ".75rem", color: C.textLight }}>{user.email}</div>
                      </div>
                      <a href="#" className="avatar-dropdown-item" onClick={e => { e.preventDefault(); navigate("/profile"); setProfileOpen(false); }}>
                        👤 &nbsp;Hồ sơ
                      </a>
                      <a href="#" className="avatar-dropdown-item" onClick={e => { e.preventDefault(); navigate("/orders"); setProfileOpen(false); }}>
                        📦 &nbsp;Đơn hàng
                      </a>
                      <div className="avatar-dropdown-divider" />
                      <a href="#" className="avatar-dropdown-item avatar-dropdown-logout" onClick={e => { e.preventDefault(); logout(); }}>
                        🚪 &nbsp;Đăng xuất
                      </a>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button className="btn-outline-green" onClick={() => navigate("/login")}>Đăng nhập</button>
                <button className="btn-green"         onClick={() => navigate("/register")}>Đăng ký</button>
              </>
            )}

          </div>
        </div>
      </div>

      {/* ══ TIER 2 ══ */}
      <div className="navbar-dark">
        <div className="navbar-dark-inner">

          {/* ALL CATEGORIES — chỉ hiện khi guest */}
          {!user && (
            <div style={{ position: "relative" }} onClick={e => { e.stopPropagation(); setCatOpen(o => !o); setOpenMenu(null); }}>
              <button className="nav-categories-btn">
                <span style={{ fontSize: "1rem" }}>☰</span> All Categories
              </button>
              {catOpen && (
                <div className="cat-panel" onClick={e => e.stopPropagation()}>
                  {CATEGORIES.map(c => (
                    <a key={c} href="#" onClick={e => { e.preventDefault(); setCatOpen(false); }}>{c}</a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Guest nav */}
          {!user && (
            <nav style={{ display: "flex", alignItems: "stretch", flex: 1 }}>
              {NAV_MENU.map((item, i) => (
                <div
                  key={item.label}
                  className="mnav-item"
                  onMouseEnter={() => { if (item.hasDropdown) setOpenMenu(i); }}
                  onMouseLeave={() => setOpenMenu(null)}
                  onClick={e => { e.stopPropagation(); if (item.hasDropdown) setOpenMenu(openMenu === i ? null : i); }}
                >
                  <button className={`mnav-a${i === 0 ? " active-m" : ""}`}>
                    <SvgIcon d={item.icon} size={14} />
                    {item.label.toUpperCase()}
                    {item.hasDropdown && <span className="plus">▾</span>}
                  </button>
                  {item.hasDropdown && openMenu === i && (
                    <div className="mnav-dropdown" onClick={e => e.stopPropagation()}>
                      {item.items.map(sub => (
                        <a key={sub} href="#" onClick={e => { e.preventDefault(); setOpenMenu(null); }}>{sub}</a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          )}

          {/* Logged-in nav */}
          {user && (
            <nav style={{ display: "flex", alignItems: "stretch", flex: 1 }}>
              {AUTH_NAV.map(item => (
                <button
                  key={item.label}
                  className="mnav-a"
                  style={{ border: "none" }}
                  onClick={() => navigate(item.path)}
                >
                  {item.label.toUpperCase()}
                </button>
              ))}
            </nav>
          )}

        </div>
      </div>
    </header>
  );
}