import Fade from "../Fade";
import { PRODUCTS } from "../../lib/constants";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Products() {
  const navigate = useNavigate();
  return (
    <section className="products-section">
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        <Fade>
          <div className="section-header">
            <p className="section-eyebrow">Các phần chính</p>
            <h2 className="section-title" style={{ textAlign: "center" }}>
              Những gì đội vận hành <span>dùng thường xuyên</span>
            </h2>
            <p className="products-section__lead">
              Tập trung vào những phần thực sự cần cho việc theo dõi và phối hợp trong xưởng, thay vì dàn trải quá nhiều lớp nội dung.
            </p>
          </div>
        </Fade>

        <div className="products-grid">
          {PRODUCTS.map((p, i) => (
            <Fade key={p.title} delay={i * 0.09}>
              <div className="pc">
                <div className="pc-img-wrap">
                  <img src={p.img} alt={p.title} />
                </div>
                <div className="pc-body">
                  <span className="pc-tag">{p.tag}</span>
                  <h3 className="pc-title">{p.title}</h3>
                  <p className="pc-desc">{p.desc}</p>
                  <button className="btn-green-full" onClick={() => navigate("/login")}>
                    Mở hệ thống
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            </Fade>
          ))}
        </div>

      </div>
    </section>
  );
}
