import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import "@/styles/homepage.css";

export default function MainLayout({ children }) {
  return (
    <div
      style={{
        fontFamily: "'Lexend','Be Vietnam Pro','Segoe UI',sans-serif",
        overflowX: "hidden",
        background: "#fff",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Header />
      <Breadcrumbs />
      <main style={{ flex: 1 }}>{children}</main>
      <Footer />
    </div>
  );
}
