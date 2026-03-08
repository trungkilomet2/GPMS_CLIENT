import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { C, NAV_MENU, CATEGORIES, SvgIcon } from "../lib/constants";

export default function Header() {

  const navigate = useNavigate();

  const [catOpen, setCatOpen]   = useState(false);
  const [openMenu, setOpenMenu] = useState(null);

  /* NEW */

  const [user,setUser] = useState(null);
  const [profileOpen,setProfileOpen] = useState(false);

  useEffect(() => {

    const data = localStorage.getItem("user");

    if(data){
      setUser(JSON.parse(data));
    }

  }, []);

  const logout = () => {

    localStorage.removeItem("user");
    setUser(null);

    navigate("/home");

  };

  const cartCount = 3;

  /* EXISTING CLOSE */

  useEffect(() => {
    const close = () => { setCatOpen(false); setOpenMenu(null); setProfileOpen(false); };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  return (
    <header className="header-root">

      {/* Tier 1 */}
      <div className="header-top">
        <div className="header-top-inner">

          {/* Logo */}
          <div className="header-logo">
            <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
              <div style={{ width: 32, height: 32, background: C.green, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>
                🧵
              </div>
              <div>
                <div className="header-logo-name">
                  XƯỞNG MAY <span>GPMS</span>
                </div>
                <div className="header-logo-tag">
                  Hàng xuất – Giá tốt
                </div>
              </div>
            </div>
          </div>

          {/* Contact */}
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

          {/* AUTH / USER AREA */}

          <div style={{ display: "flex", gap: ".8rem", alignItems:"center" }}>

            {/* CART */}

            {user && (
              <div style={{ position:"relative", cursor:"pointer", fontSize:"1.2rem" }} onClick={()=>navigate("/cart")}>

                🛒

                <span style={{
                  position:"absolute",
                  top:-6,
                  right:-8,
                  background:"red",
                  color:"white",
                  fontSize:"10px",
                  borderRadius:"50%",
                  padding:"2px 6px"
                }}>
                  {cartCount}
                </span>

              </div>
            )}

            {/* USER */}

            {user ? (

              <div style={{ position:"relative" }} onClick={e=>e.stopPropagation()}>

                <div
                  onClick={()=>setProfileOpen(o=>!o)}
                  style={{
                    display:"flex",
                    alignItems:"center",
                    gap:8,
                    cursor:"pointer"
                  }}
                >

                  <img
                    src="https://i.pravatar.cc/40"
                    alt="avatar"
                    style={{
                      width:34,
                      height:34,
                      borderRadius:"50%"
                    }}
                  />

                  <span style={{ fontWeight:500 }}>
                    {user.name}
                  </span>

                </div>

                {profileOpen && (

                  <div style={{
                    position:"absolute",
                    right:0,
                    top:40,
                    background:"white",
                    borderRadius:6,
                    boxShadow:"0 6px 20px rgba(0,0,0,0.15)",
                    overflow:"hidden",
                    minWidth:150
                  }}>

                    <div
                      style={{ padding:"10px 14px", cursor:"pointer" }}
                      onClick={()=>navigate("/profile")}
                    >
                      Hồ sơ
                    </div>

                    <div
                      style={{ padding:"10px 14px", cursor:"pointer" }}
                      onClick={()=>navigate("/orders")}
                    >
                      Đơn hàng
                    </div>

                    <div
                      style={{ padding:"10px 14px", cursor:"pointer", color:"red" }}
                      onClick={logout}
                    >
                      Đăng xuất
                    </div>

                  </div>

                )}

              </div>

            ) : (

              <>
            
              <button
                className="btn-outline-green"
                onClick={() => navigate("/login")}
              >
                Đăng nhập
              </button>

              <button
                className="btn-green"
                onClick={() => navigate("/register")}
              >
                Đăng ký
              </button>

              </>

            )}

          </div>

        </div>
      </div>

      {/* NAV BAR giữ nguyên */}

      <div className="navbar-dark">
        <div className="navbar-dark-inner">

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

        </div>
      </div>

    </header>
  );
}