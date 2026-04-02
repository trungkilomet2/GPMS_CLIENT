import Fade from "@/components/Fade";

export default function PublicPageHero({ eyebrow, title, highlight, description, image, metrics = [] }) {
  return (
    <section className="public-hero">
      <div className="public-hero-backdrop" />
      <img className="public-hero-image" src={image} alt={title} />
      <div className="public-hero-overlay" />

      <div className="public-hero-content">
        <Fade>
          <div className="public-hero-copy">
            <p className="public-hero-eyebrow">{eyebrow}</p>
            <h1 className="public-hero-title">
              {title} <span>{highlight}</span>
            </h1>
            <p className="public-hero-desc">{description}</p>
          </div>
        </Fade>

        {!!metrics.length && (
          <Fade delay={0.08}>
            <div className="public-hero-metrics">
              {metrics.map((metric) => (
                <div key={metric.label} className="public-hero-metric">
                  <div className="public-hero-metric-value">{metric.value}</div>
                  <div className="public-hero-metric-label">{metric.label}</div>
                </div>
              ))}
            </div>
          </Fade>
        )}
      </div>
    </section>
  );
}
