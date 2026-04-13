import Fade from "../Fade";
import { STEPS, PROCESS_CARDS } from "../../lib/constants";

export default function Process() {
  return (
    <section className="process-section">
      <div className="process-inner">

        <Fade>
          <div className="section-header" style={{ textAlign: "center", marginBottom: "4rem" }}>
            <p className="section-eyebrow">Từ đơn hàng đến giao hàng</p>
            <h2 className="section-title" style={{ textAlign: "center" }}>
              Quy trình &nbsp;<span>đặt may</span>
            </h2>
          </div>
        </Fade>

        {/* Timeline */}
        <Fade delay={0.1}>
          <div className="srow">
            {STEPS.map((s, i) => (
              <div
                key={s}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: ".75rem", flex: 1, minWidth: 90 }}
              >
                <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                  {i > 0 && <div className="sline" />}
                  <div className="sdot">{i + 1}</div>
                  {i < STEPS.length - 1 && <div className="sline" />}
                </div>
                <div className="step-label">{s}</div>
              </div>
            ))}
          </div>
        </Fade>

        {/* Summary cards */}
        <div className="process-cards">
          {PROCESS_CARDS.map((c, i) => (
            <Fade key={c.title} delay={i * 0.1}>
              <div className="process-card">
                <div className="process-card-step">Bước {c.rng}</div>
                <div className="process-card-icon">{c.icon}</div>
                <div className="process-card-title">{c.title}</div>
                <div className="process-card-desc">{c.desc}</div>
              </div>
            </Fade>
          ))}
        </div>

      </div>
    </section>
  );
}