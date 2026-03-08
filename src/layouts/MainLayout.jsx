import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function MainLayout({ children }) {
  return (
    <div style={{ fontFamily: "'Lexend','Be Vietnam Pro','Segoe UI',sans-serif", overflowX: "hidden", background: "#fff" }}>
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  );
}