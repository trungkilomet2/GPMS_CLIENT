import Fade from "../Fade";
import { STEPS, PROCESS_CARDS } from "../../lib/constants";
import { MessageSquareQuote, Scissors, Truck } from "lucide-react";

const PROCESS_ICONS = [MessageSquareQuote, Scissors, Truck];

export default function Process() {
  return (
    <section className="process-section">
      <div className="process-inner">

        <Fade>
          <div className="section-header" style={{ textAlign: "center", marginBottom: "4rem" }}>
            <p className="section-eyebrow">Main workflow</p>
            <h2 className="section-title" style={{ textAlign: "center" }}>
              Luồng chính của &nbsp;<span>GPMS</span>
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
          {PROCESS_CARDS.map((c, i) => {
            const Icon = PROCESS_ICONS[i] || MessageSquareQuote;
            return (
            <Fade key={c.title} delay={i * 0.1}>
              <div className="process-card">
                <div className="process-card-step">Bước {c.rng}</div>
                <div className="process-card-icon"><Icon size={22} strokeWidth={2.1} /></div>
                <div className="process-card-title">{c.title}</div>
                <div className="process-card-desc">{c.desc}</div>
              </div>
            </Fade>
          );
          })}
        </div>

      </div>
    </section>
  );
}
