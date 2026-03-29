import { Link, useParams } from "react-router-dom";

import MainLayout from "@/layouts/MainLayout";
import { getMarketingPageBySlug } from "@/lib/marketingPages";

import "@/styles/homepage.css";

export default function MarketingPage() {
  const { slug } = useParams();
  const page = getMarketingPageBySlug(slug);

  if (!page) {
    return (
      <MainLayout>
        <section className="marketing-page-shell">
          <div className="marketing-empty-state">
            <div className="section-eyebrow">Nội dung không tồn tại</div>
            <h1 className="section-title">Trang này hiện chưa có dữ liệu hiển thị</h1>
            <p className="marketing-summary">
              Bạn có thể quay lại trang chủ hoặc mở trang liên hệ để được hỗ trợ nhanh.
            </p>
            <div className="hero-actions">
              <Link to="/home" className="btn-green">Về trang chủ</Link>
              <Link to="/pages/lien-he" className="btn-outline-green">Liên hệ</Link>
            </div>
          </div>
        </section>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <section className="marketing-hero">
        <div className="marketing-hero-inner">
          <div className="marketing-hero-copy">
            <div className="hero-badge">{page.heroEyebrow}</div>
            <h1 className="marketing-hero-title">{page.title}</h1>
            <p className="marketing-summary">{page.summary}</p>

            <div className="marketing-stat-grid">
              {page.stats.map((stat) => (
                <div key={stat.label} className="marketing-stat-card">
                  <div className="marketing-stat-value">{stat.value}</div>
                  <div className="marketing-stat-label">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="marketing-hero-visual">
            <img src={page.image} alt={page.label} className="marketing-hero-image" />
            <div className="marketing-hero-panel">
              <div className="marketing-panel-title">Điểm nổi bật</div>
              <div className="marketing-panel-list">
                {page.highlights.map((highlight) => (
                  <div key={highlight} className="marketing-panel-item">
                    <span className="check-icon">✓</span>
                    <span>{highlight}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="marketing-page-shell">
        <div className="marketing-content-grid">
          <div className="marketing-content-main">
            {page.sections.map((section) => (
              <article key={section.title} className="marketing-section-card">
                <div className="section-eyebrow">{page.label}</div>
                <h2 className="marketing-section-title">{section.title}</h2>
                <p className="marketing-section-desc">{section.description}</p>
                <div className="marketing-bullet-list">
                  {section.bullets.map((bullet) => (
                    <div key={bullet} className="marketing-bullet-item">
                      <span className="marketing-bullet-dot" />
                      <span>{bullet}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <aside className="marketing-sidebar">
            <div className="marketing-sidebar-card">
              <div className="section-eyebrow">Kết nối nhanh</div>
              <h2 className="marketing-sidebar-title">{page.sidebar.title}</h2>
              <p className="marketing-section-desc">{page.sidebar.description}</p>
              <div className="marketing-contact-list">
                {page.contactDetails.map((item) => (
                  <div key={item.label} className="marketing-contact-item">
                    <div className="marketing-contact-label">{item.label}</div>
                    <div className="marketing-contact-value">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="marketing-sidebar-card marketing-sidebar-accent">
              <div className="marketing-panel-title">GPMS phù hợp khi bạn cần</div>
              <div className="marketing-panel-list">
                <div className="marketing-panel-item">
                  <span className="check-icon">✓</span>
                  <span>Quản lý đơn hàng, tiến độ và chất lượng trên cùng một hệ thống.</span>
                </div>
                <div className="marketing-panel-item">
                  <span className="check-icon">✓</span>
                  <span>Tạo website giới thiệu xưởng may chuyên nghiệp hơn với nội dung rõ ràng.</span>
                </div>
                <div className="marketing-panel-item">
                  <span className="check-icon">✓</span>
                  <span>Tăng khả năng chuyển đổi từ khách ghé thăm sang khách liên hệ.</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="marketing-cta">
        <div className="marketing-cta-inner">
          <div className="section-eyebrow marketing-cta-eyebrow">Hỗ trợ triển khai</div>
          <h2 className="marketing-cta-title">{page.cta.title}</h2>
          <p className="marketing-cta-desc">{page.cta.description}</p>
          <div className="cta-actions">
            <Link to={page.cta.primaryPath} className="btn-white">{page.cta.primaryLabel}</Link>
            <Link to={page.cta.secondaryPath} className="btn-outline-white">{page.cta.secondaryLabel}</Link>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
