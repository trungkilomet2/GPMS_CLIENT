import CustomerSidebar from "@/components/layout/CustomerSidebar";
import ProfileHeader from "@/components/layout/ProfileHeader";
import Breadcrumbs from "@/components/Breadcrumbs";

const LAYOUT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Lexend','Be Vietnam Pro','Segoe UI',sans-serif; }
  button, input, textarea { font-family: inherit; }
  .cust-page::-webkit-scrollbar { width: 5px; }
  .cust-page::-webkit-scrollbar-track { background: transparent; }
  .cust-page::-webkit-scrollbar-thumb { background: #d0e8d9; border-radius: 10px; }
  @media (max-width: 768px) {
    .cust-layout { flex-direction: column !important; }
  }
`;

export default function CustomerLayout({ title, children }) {
  return (
    <>
      <style>{LAYOUT_CSS}</style>
      <div
        className="cust-layout"
        style={{
          display: "flex",
          minHeight: "100vh",
          background: "#f4f7f5",
          fontFamily: "'Lexend','Be Vietnam Pro','Segoe UI',sans-serif",
        }}
      >
        {/* Sidebar */}
        <CustomerSidebar />

        {/* Main column */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          overflow: "hidden",
        }}>
          <ProfileHeader title={title} />
          <Breadcrumbs />
          <div
            className="cust-page"
            style={{
              flex: 1,
              overflowY: "auto",
              background: "#f4f7f5",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </>
  );
}