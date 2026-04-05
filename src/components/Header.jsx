import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { C, NAV_MENU, CATEGORIES, SvgIcon } from "../lib/constants";
import { getPostLoginPath } from "@/lib/authRouting";
import { AUTH_NAV_TREE } from "@/lib/navigation";
import { getStoredUser, removeAuthItem } from "@/lib/authStorage";
import { PUBLIC_SITE_CONTENT } from "@/lib/publicSiteContent";
import "@/styles/homepage.css";

const ICON_CART = "M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM5.1 4H2V2H0v2h2l3.6 7.59L4.25 14C4.09 14.31 4 14.65 4 15c0 1.1.9 2 2 2h14v-2H6.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63H19c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0023.46 4H5.1z";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const profileCloseTimer = useRef(null);

  // Load user từ localStorage khi mount
  // và lắng nghe event "auth-change" để re-render ngay sau login/logout
  useEffect(() => {
    const load = () => {
      setUser(getStoredUser());
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

  useEffect(() => () => {
    if (profileCloseTimer.current) {
      clearTimeout(profileCloseTimer.current);
    }
  }, []);

  const logout = () => {
    removeAuthItem("user");
    removeAuthItem("token");
    removeAuthItem("userId");
    setUser(null);
    setProfileOpen(false);
    window.dispatchEvent(new Event("auth-change"));
    navigate("/");
  };

  // Initials fallback nếu không có avatar
  const displayName = user?.fullName || user?.name || user?.userName || "Người dùng";
  const initials = displayName
    ? displayName.split(" ").map(w => w[0]).slice(-2).join("").toUpperCase()
    : "U";

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  const openProfileMenu = () => {
    if (profileCloseTimer.current) {
      clearTimeout(profileCloseTimer.current);
      profileCloseTimer.current = null;
    }
    setProfileOpen(true);
  };

  const closeProfileMenuSoon = () => {
    if (profileCloseTimer.current) {
      clearTimeout(profileCloseTimer.current);
    }
    profileCloseTimer.current = setTimeout(() => {
      setProfileOpen(false);
      profileCloseTimer.current = null;
    }, 120);
  };

  const brandHomePath = "/home";
  const isGuestItemActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <header className="header-root">

      {/* ══ TIER 1 ══ */}
      <div className="header-top">
        <div className="header-top-inner">

          {/* Logo */}
          <div className="header-logo" style={{ cursor: "pointer" }} onClick={() => navigate(brandHomePath)}>
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
              {PUBLIC_SITE_CONTENT.guestHeaderActions.map((action) => (
                <button
                  key={action.label}
                  className="header-contact-btn"
                  onClick={() => navigate(action.path)}
                >
                <div className="header-contact-icon">{action.icon}</div>
                <div>
                  <div className="header-contact-label">{action.label}</div>
                  <div className="header-contact-value">{action.value}</div>
                </div>
              </button>
              ))}
            </div>
          )}

          {/* Auth area */}
          <div style={{ display: "flex", gap: ".8rem", alignItems: "center", marginLeft: "auto" }}>

            {user ? (
              <>
                {/* Cart */}
                <button
                  onClick={() => navigate("/orders")}
                  style={{ background: "none", border: "none", cursor: "pointer", color: C.text, display: "flex", alignItems: "center", padding: ".3rem" }}
                  title="Đơn hàng"
                >
                  <SvgIcon d={ICON_CART} size={22} />
                </button>

                {/* Avatar + dropdown */}
                <div
                  style={{ position: "relative", display: "flex", alignItems: "center" }}
                  onClick={e => e.stopPropagation()}
                  onMouseEnter={openProfileMenu}
                  onMouseLeave={closeProfileMenuSoon}
                >
                  <button
                    className="avatar-btn"
                    onClick={() => setProfileOpen(o => !o)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", lineHeight: 1.15 }}>
                        <span style={{ fontSize: ".68rem", color: C.textMid, fontWeight: 500 }}>
                          Xin chào,
                        </span>
                        <span style={{ fontSize: ".82rem", color: C.green, fontWeight: 700, maxWidth: 140, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {displayName}
                        </span>
                      </div>
                      {user.avatarUrl
                        ? <img src={user.avatarUrl} alt="avatar" className="avatar-img" />
                        : <div className="avatar-initials">{initials}</div>
                      }
                    </div>
                    <span style={{ fontSize: ".65rem", opacity: .6 }}>▾</span>
                  </button>

                  {profileOpen && (
                    <div
                      className="avatar-dropdown"
                      onMouseEnter={openProfileMenu}
                      onMouseLeave={closeProfileMenuSoon}
                    >
                      <div className="avatar-dropdown-header">
                        <div style={{ fontWeight: 700, color: C.text, fontSize: ".88rem" }}>{displayName}</div>
                        <div style={{ fontSize: ".75rem", color: C.textLight }}>{user.email}</div>
                      </div>
                      <Link to="/profile" className="avatar-dropdown-item" onClick={() => setProfileOpen(false)}>
                        👤 &nbsp;Hồ sơ
                      </Link>
                      <Link to="/orders" className="avatar-dropdown-item" onClick={() => setProfileOpen(false)}>
                        📦 &nbsp;Đơn hàng
                      </Link>
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
                <button className="btn-green" onClick={() => navigate("/register")}>Đăng ký</button>
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
                <span style={{ fontSize: "1rem" }}>☰</span> Danh mục dịch vụ
              </button>
              {catOpen && (
                <div className="cat-panel" onClick={e => e.stopPropagation()}>
                  {CATEGORIES.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setCatOpen(false);
                        navigate("/services");
                      }}
                    >
                      {c}
                    </button>
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
                  onMouseEnter={() => { if (item.hasDropdown) setOpenMenu(`guest-${i}`); }}
                  onMouseLeave={() => setOpenMenu(null)}
                  onClick={e => { e.stopPropagation(); if (item.hasDropdown) setOpenMenu(openMenu === `guest-${i}` ? null : `guest-${i}`); }}
                >
                  <button
                    className={`mnav-a${isGuestItemActive(item.path) ? " active-m" : ""}`}
                    onClick={() => {
                      if (!item.hasDropdown) {
                        navigate(item.path);
                      }
                    }}
                  >
                    <SvgIcon d={item.icon} size={14} />
                    {item.label.toUpperCase()}
                    {item.hasDropdown && <span className="plus">▾</span>}
                  </button>
                  {item.hasDropdown && openMenu === `guest-${i}` && (
                    <div className="mnav-dropdown" onClick={e => e.stopPropagation()}>
                      {item.items.map((sub) => (
                        <Link
                          key={sub.label}
                          to={sub.path}
                          onClick={() => setOpenMenu(null)}
                        >
                          {sub.label}
                        </Link>
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
              {AUTH_NAV_TREE.map((item) => {
                const hasDropdown = Array.isArray(item.children) && item.children.length > 0;
                return (
                  <div
                    key={item.key}
                    className="mnav-item"
                    onMouseEnter={() => { if (hasDropdown) setOpenMenu(item.key); }}
                    onMouseLeave={() => setOpenMenu(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (hasDropdown) setOpenMenu(openMenu === item.key ? null : item.key);
                    }}
                  >
                    <button
                      className={`mnav-a${isActive(item.path) ? " active-m" : ""}`}
                      style={{ border: "none" }}
                      onClick={(e) => {
                        if (hasDropdown) {
                          e.preventDefault();
                          return;
                        }
                        navigate(item.path);
                      }}
                    >
                      {item.label.toUpperCase()}
                      {hasDropdown && <span className="plus">▾</span>}
                    </button>

                    {hasDropdown && openMenu === item.key && (
                      <div className="mnav-dropdown" onClick={(e) => e.stopPropagation()}>
                        {item.children.map((child) => (
                          <Link
                            key={child.path}
                            to={child.path}
                            onClick={() => {
                              setOpenMenu(null);
                            }}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          )}

        </div>
      </div>
    </header>
  );
}
