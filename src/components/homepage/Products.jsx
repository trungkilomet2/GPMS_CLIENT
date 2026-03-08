import Fade from "../Fade";
import { PRODUCTS } from "../../lib/constants";

export default function Products() {
  return (
    <section className="products-section">
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        <Fade>
          <div className="section-header">
            <p className="section-eyebrow">Hệ thống GPMS</p>
            <h2 className="section-title" style={{ textAlign: "center" }}>
              Tính năng hệ &nbsp;<span>thống</span>
            </h2>
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
                  <button className="btn-green-full">Chi tiết</button>
                </div>
              </div>
            </Fade>
          ))}
        </div>

      </div>
    </section>
  );
}