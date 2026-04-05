import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { userService } from "@/services/UserService";
import OrderService from "@/services/OrderService";
import Header from "@/components/Header";
import { clearAuthStorage, getAuthItem, getStoredUser } from "@/lib/authStorage";

const T = {
  dark:"#0d4225", mid:"#186637", base:"#1e8a47",
  light:"#eaf4ee", border:"#d0e8d9", sand:"#f4f7f5",
  white:"#ffffff", text:"#18291f", textMid:"#4a6456",
  textLt:"#8ca898", red:"#dc2626", redBg:"#fef2f2",
};

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700;800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  button,input,textarea{font-family:inherit}
  @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
  @media(max-width:768px){
    .pf-layout{grid-template-columns:1fr!important;padding:0 1rem 3rem!important}
    .pf-avatar-row{flex-wrap:wrap!important;padding:0 1rem!important}
    .pf-avatar{width:84px!important;height:84px!important;font-size:2rem!important}
    .pf-cover{height:160px!important}
    .pf-actions{flex-wrap:wrap}
  }
`;

function getInitials(name = "") {
  return name.split(" ").map(w => w[0]).filter(Boolean).slice(-2).join("").toUpperCase();
}

function Sk({ h = 16, w = "100%", r = 8 }) {
  return <div style={{
    height:h, width:w, borderRadius:r,
    background:`linear-gradient(90deg,${T.light} 25%,${T.border} 50%,${T.light} 75%)`,
    backgroundSize:"200% 100%", animation:"shimmer 1.4s infinite",
  }}/>;
}

function RoleBadge({ children }) {
  return (
    <span style={{
      display:"inline-flex",alignItems:"center",gap:".35rem",
      background:T.light,color:T.mid,fontSize:".72rem",fontWeight:700,
      padding:".25rem .75rem",borderRadius:20,border:`1px solid ${T.border}`,
    }}>
      <span style={{width:7,height:7,borderRadius:"50%",background:T.base,display:"inline-block"}}/>
      {children}
    </span>
  );
}

function CardSection({ title, action, children, mb = "1.25rem" }) {
  return (
    <div style={{
      background:T.white,borderRadius:16,border:`1px solid ${T.border}`,
      boxShadow:"0 2px 14px rgba(0,0,0,.05)",overflow:"hidden",marginBottom:mb,
    }}>
      <div style={{
        display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"1rem 1.4rem",borderBottom:`1px solid ${T.border}`,background:T.sand,
      }}>
        <div style={{display:"flex",alignItems:"center",gap:".45rem",fontWeight:700,fontSize:".9rem",color:T.text}}>
          <span style={{width:8,height:8,borderRadius:"50%",background:T.base,display:"inline-block"}}/>
          {title}
        </div>
        {action}
      </div>
      <div style={{padding:"1.25rem 1.4rem"}}>{children}</div>
    </div>
  );
}

function BtnPrimary({ onClick, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display:"inline-flex",alignItems:"center",gap:".45rem",
      background:disabled?"#a0c8b0":T.base,
      color:"#fff",border:"none",padding:".63rem 1.35rem",borderRadius:8,
      fontWeight:700,fontSize:".84rem",cursor:disabled?"not-allowed":"pointer",
      boxShadow:disabled?"none":`0 3px 12px rgba(30,138,71,.28)`,transition:".15s",
    }}>{children}</button>
  );
}

function BtnSecondary({ onClick, children }) {
  return (
    <button onClick={onClick} style={{
      display:"inline-flex",alignItems:"center",gap:".45rem",
      background:"transparent",color:T.mid,border:`2px solid ${T.base}`,
      padding:".61rem 1.35rem",borderRadius:8,fontWeight:700,fontSize:".84rem",cursor:"pointer",
    }}>{children}</button>
  );
}

function InfoRow({ icon, label, value, last }) {
  return (
    <div style={{
      display:"flex",gap:".85rem",alignItems:"flex-start",
      padding:".65rem 0",
      borderBottom:last?"none":`1px solid ${T.border}`,
    }}>
      <div style={{
        width:34,height:34,borderRadius:9,flexShrink:0,
        background:T.light,display:"flex",alignItems:"center",justifyContent:"center",fontSize:".9rem",
      }}>{icon}</div>
      <div>
        <div style={{fontSize:".7rem",fontWeight:700,color:T.textLt,textTransform:"uppercase",letterSpacing:".05em",marginBottom:".15rem"}}>{label}</div>
        <div style={{fontSize:".88rem",color:value?T.text:T.textLt,fontStyle:value?"normal":"italic"}}>
          {value || "Chưa cập nhật"}
        </div>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display:"flex",alignItems:"center",gap:".7rem",width:"100%",
      padding:".7rem 1rem",border:"none",borderRadius:10,cursor:"pointer",
      textAlign:"left",fontWeight:active?700:500,fontSize:".85rem",
      background:active?T.light:"transparent",
      color:active?T.mid:T.textMid,
      borderLeft:`3px solid ${active?T.base:"transparent"}`,
      transition:".15s",
    }}>
      <span style={{fontSize:"1rem"}}>{icon}</span>{label}
    </button>
  );
}

function SectionInfo({ user, onViewOrders, onCreateOrder }) {
  const customerProfileRows = [
    ["👤", "Người đại diện", user.fullName || user.name],
    ["✉️", "Email", user.email],
    ["📍", "Địa chỉ", user.address],
  ];

  const orderSummaryRows = [
    ["📦", "Đơn đã hoàn thành", user.completedOrders ?? "—"],
    ["🧵", "Đơn đang triển khai", user.activeProjects ?? "—"],
  ];

  return (
    <div style={{display:"grid",gridTemplateColumns:"1.05fr .95fr",gap:"1.25rem"}}>
      <div>
        <CardSection
          title="Thông tin cá nhân khách hàng"
          mb="1.25rem"
        >
          <div style={{paddingTop:".2rem"}}>
            {customerProfileRows.map(([icon,label,value],i)=>(
              <InfoRow key={label} icon={icon} label={label} value={value} last={i===customerProfileRows.length-1}/>
            ))}
          </div>
        </CardSection>
      </div>

      <div>
        <CardSection title="Tương tác và đơn hàng" mb="1.25rem">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".75rem",marginBottom:"1rem"}}>
            {orderSummaryRows.map(([icon,label,value])=>(
              <div key={label} style={{border:`1px solid ${T.border}`,borderRadius:12,padding:".9rem",background:T.sand}}>
                <div style={{fontSize:"1rem",marginBottom:".45rem"}}>{icon}</div>
                <div style={{fontSize:".72rem",fontWeight:700,color:T.textLt,textTransform:"uppercase",letterSpacing:".04em",marginBottom:".25rem"}}>{label}</div>
                <div style={{fontSize:".95rem",fontWeight:700,color:T.text}}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{display:"flex",gap:".75rem",flexWrap:"wrap"}}>
            <BtnPrimary onClick={onViewOrders}>📋 Xem đơn hàng</BtnPrimary>
            <BtnSecondary onClick={onCreateOrder}>➕ Tạo yêu cầu mới</BtnSecondary>
          </div>
        </CardSection>
      </div>
    </div>
  );
}

function SectionSecurity() {
  const [form,setForm] = useState({current:"",next:"",confirm:""});
  const [msg,setMsg]   = useState(null);
  const [show,setShow] = useState({current:false,next:false,confirm:false});
  const handle = e => setForm(p=>({...p,[e.target.name]:e.target.value}));
  const submit = e => {
    e.preventDefault();
    if(form.next!==form.confirm) return setMsg({ok:false,text:"Mật khẩu mới không khớp."});
    if(form.next.length<6)       return setMsg({ok:false,text:"Mật khẩu phải ít nhất 6 ký tự."});
    setMsg({ok:true,text:"Đổi mật khẩu thành công!"});
    setForm({current:"",next:"",confirm:""});
    setTimeout(()=>setMsg(null),3000);
  };
  const fields = [
    {name:"current",label:"Mật khẩu hiện tại", placeholder:"Nhập mật khẩu hiện tại"},
    {name:"next",   label:"Mật khẩu mới", placeholder:"Nhập mật khẩu mới"},
    {name:"confirm",label:"Xác nhận mật khẩu mới", placeholder:"Nhập lại mật khẩu mới"},
  ];
  return (
    <CardSection title="Đổi mật khẩu" mb="0">
      {msg&&(
        <div style={{padding:".75rem 1rem",borderRadius:8,marginBottom:"1rem",background:msg.ok?T.light:T.redBg,color:msg.ok?T.mid:T.red,fontSize:".84rem",fontWeight:600}}>
          {msg.ok?"✅":"⚠️"}&nbsp;{msg.text}
        </div>
      )}
      <form onSubmit={submit} style={{maxWidth:400}}>
        {fields.map(f=>(
          <div key={f.name} style={{marginBottom:"1rem"}}>
            <label style={{display:"block",fontSize:".75rem",fontWeight:700,color:T.textMid,marginBottom:".3rem",textTransform:"uppercase",letterSpacing:".04em"}}>{f.label}</label>
            <div style={{position:"relative"}}>
              <input
                type={show[f.name] ? "text" : "password"}
                name={f.name}
                value={form[f.name]}
                onChange={handle}
                placeholder={f.placeholder}
                style={{width:"100%",padding:".65rem 2.8rem .65rem .9rem",border:`1.5px solid ${T.border}`,borderRadius:8,fontSize:".88rem",outline:"none",background:T.white}}
              />
              <button
                type="button"
                onClick={() => setShow((p) => ({ ...p, [f.name]: !p[f.name] }))}
                style={{
                  position:"absolute",
                  right:10,
                  top:"50%",
                  transform:"translateY(-50%)",
                  border:"none",
                  background:"transparent",
                  color:T.textMid,
                  cursor:"pointer",
                  fontSize:".95rem",
                  padding:0,
                }}
              >
                {show[f.name] ? "🙈" : "👁"}
              </button>
            </div>
          </div>
        ))}
        <BtnPrimary>🔒 Cập nhật mật khẩu</BtnPrimary>
      </form>
    </CardSection>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{minHeight:"100vh",background:T.sand,fontFamily:"'Lexend',sans-serif"}}>
      <style>{GLOBAL_CSS}</style>
      <div style={{height:210,background:`linear-gradient(120deg,${T.dark},${T.base})`}}/>
      <div style={{maxWidth:960,margin:"1rem auto 2rem",padding:"0 2rem",display:"flex",alignItems:"center",gap:"1.5rem"}}>
        <Sk h={112} w={112} r={56}/>
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:8}}>
          <Sk h={26} w={210}/><Sk h={18} w={130}/>
        </div>
      </div>
      <div style={{maxWidth:960,margin:"0 auto",padding:"0 2rem 4rem",display:"grid",gridTemplateColumns:"252px 1fr",gap:"1.5rem"}}>
        <div style={{display:"flex",flexDirection:"column",gap:"1.25rem"}}>
          <Sk h={108} r={14}/><Sk h={170} r={14}/><Sk h={100} r={14}/>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:"1.25rem"}}>
          <Sk h={110} r={14}/><Sk h={260} r={14}/>
        </div>
      </div>
    </div>
  );
}

const NAV_ITEMS = [
  {key:"info",     icon:"👤",label:"Thông tin cá nhân"},
  {key:"security", icon:"🔒",label:"Bảo mật"},
];
const IN_PROGRESS_STATUSES = ["Ch? x�t duy?t", "C?n c?p nh?t"];
const DONE_STATUSES = ["Ch?p nh?n", "T? ch?i"];

function formatDisplayDate(value) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
  return date.toLocaleDateString("vi-VN");
}

function buildOrderSummary(orders = []) {
  const completedOrders = orders.filter((order) => DONE_STATUSES.includes(order?.status)).length;
  const activeProjects = orders.filter((order) => IN_PROGRESS_STATUSES.includes(order?.status)).length;

  const latestOrderDate = orders
    .map((order) => order?.updatedAt || order?.endDate || order?.startDate || order?.createdAt)
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  let rating = "Mới";
  if (orders.length >= 10) rating = "Rất tốt";
  else if (orders.length >= 3) rating = "Tốt";

  return {
    completedOrders,
    activeProjects,
    rating,
    lastOrderAt: latestOrderDate ? formatDisplayDate(latestOrderDate) : "Chưa cập nhật",
  };
}

function getCurrentUserId() {
  const rawUserId = getAuthItem("userId");
  if (rawUserId && rawUserId !== "null") return rawUserId;
  const storedUser = getStoredUser() || {};
  return storedUser?.userId || storedUser?.id || null;
}

export default function ViewProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tab,     setTab]     = useState("info");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    let active = true;

    const loadProfile = () => {
      const token = getAuthItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      setLoading(true);
      setError(null);
      const userId = getCurrentUserId();

      Promise.all([
        userService.getProfile(),
        userId ? OrderService.getOrdersByUser().catch(() => []) : Promise.resolve([]),
      ])
        .then(([profileData, ordersResponse]) => {
          if (!active) return;
          const orders = ordersResponse?.data || ordersResponse || [];
          setProfile({
            ...profileData,
            ...buildOrderSummary(Array.isArray(orders) ? orders : []),
          });
        })
        .catch(err => {
          if (!active) return;
          if (err?.response?.data?.status === 401 || err?.status === 401) {
            clearAuthStorage();
            navigate("/login");
            return;
          }
          setError(err?.response?.data?.message || "Không thể tải hồ sơ.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };

    loadProfile();
    window.addEventListener("auth-change", loadProfile);

    return () => {
      active = false;
      window.removeEventListener("auth-change", loadProfile);
    };
  }, [navigate, location.state?.refresh]);

  if (loading) return <LoadingSkeleton />;

  if (error) return (
    <div style={{minHeight:"100vh",background:T.sand,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Lexend',sans-serif"}}>
      <style>{GLOBAL_CSS}</style>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:"2.5rem",marginBottom:"1rem"}}>⚠️</div>
        <div style={{fontWeight:700,color:T.text,marginBottom:".75rem"}}>{error}</div>
        <BtnPrimary onClick={()=>window.location.reload()}>Thử lại</BtnPrimary>
      </div>
    </div>
  );

  const name = profile?.fullName || profile?.name || "Người dùng";

  return (
    <div style={{minHeight:"100vh",background:T.sand,fontFamily:"'Lexend',sans-serif"}}>
      <style>{GLOBAL_CSS}</style>

      {/* ── Site Header ── */}
      <Header />

      {/* ── Avatar row — nổi lên trên cover ── */}
      <div
        className="pf-avatar-row"
        style={{
          maxWidth:960,
          margin:"1.5rem auto 2rem",
          padding:"0 2rem",
          display:"flex",
          alignItems:"flex-end",
          gap:"1.5rem",
          position:"relative",
          zIndex:10,
          animation:"fadeUp .35s ease",
        }}
      >
        {/* Avatar */}
        <div style={{position:"relative",flexShrink:0}}>
          {profile?.avatarUrl
            ? <img src={profile.avatarUrl} alt="avatar" className="pf-avatar"
                style={{width:112,height:112,borderRadius:"50%",border:"4px solid #fff",objectFit:"cover",boxShadow:"0 8px 28px rgba(0,0,0,.18)"}}/>
            : <div className="pf-avatar"
                style={{width:112,height:112,borderRadius:"50%",border:"4px solid #fff",background:T.light,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"2.5rem",fontWeight:800,color:T.mid,boxShadow:"0 8px 28px rgba(0,0,0,.18)"}}>
                {getInitials(name)}
              </div>
          }
          {/* Online dot */}
          <div style={{position:"absolute",bottom:8,right:6,width:14,height:14,borderRadius:"50%",background:"#22c55e",border:"2.5px solid #fff"}}/>
        </div>

        {/* Name + badge */}
        <div style={{flex:1,paddingBottom:".5rem"}}>
          <div style={{fontSize:"1.4rem",fontWeight:800,color:T.text,marginBottom:".4rem"}}>{name}</div>
          <RoleBadge>
            Hồ sơ khách hàng
            {profile?.department ? ` · ${profile.department}` : ""}
          </RoleBadge>
        </div>

        {/* Actions */}
        <div className="pf-actions" style={{display:"flex",gap:".65rem",marginBottom:".5rem"}}>
          <BtnSecondary onClick={()=>navigate(-1)}>← Quay lại</BtnSecondary>
          <BtnPrimary   onClick={()=>navigate("/profile/edit")}>✏️ Chỉnh sửa</BtnPrimary>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div
        className="pf-layout"
        style={{
          maxWidth:960,margin:"0 auto",padding:"0 2rem 4rem",
          display:"grid",gridTemplateColumns:"252px 1fr",gap:"1.5rem",
          animation:"fadeUp .4s ease .08s both",
          position:"relative",zIndex:1,
        }}
      >
        {/* Sidebar */}
        <aside style={{display:"flex",flexDirection:"column",gap:"1.25rem"}}>
          {/* Nav tabs */}
          <div style={{background:T.white,borderRadius:16,border:`1px solid ${T.border}`,boxShadow:"0 2px 14px rgba(0,0,0,.05)",padding:".75rem"}}>
            {NAV_ITEMS.map((item,i)=>(
              <div key={item.key}>
                {i===NAV_ITEMS.length-1&&<div style={{height:1,background:T.border,margin:".4rem 0"}}/>}
                <NavItem icon={item.icon} label={item.label} active={tab===item.key} onClick={()=>setTab(item.key)}/>
              </div>
            ))}
          </div>

        </aside>

        {/* Content */}
        <main>
          {tab==="info"     && <SectionInfo     user={profile} onViewOrders={()=>navigate("/orders")} onCreateOrder={()=>navigate("/orders/create")}/>}
          {tab==="security" && <SectionSecurity/>}
        </main>
      </div>
    </div>
  );
}


