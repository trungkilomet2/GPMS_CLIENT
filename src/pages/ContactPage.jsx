import MainLayout from "@/layouts/MainLayout";
import Fade from "@/components/Fade";
import PublicPageHero from "@/components/public/PublicPageHero";
import { PUBLIC_SITE_CONTENT } from "@/lib/publicSiteContent";

export default function ContactPage() {
  return (
    <MainLayout>
      <PublicPageHero
        eyebrow="Liên hệ hợp tác"
        title="Kết nối nhanh để"
        highlight="bắt đầu đơn hàng"
        description="Dù bạn đang cần báo giá, tìm xưởng gia công lâu dài hay chỉ muốn kiểm tra khả năng triển khai mẫu, đội ngũ GPMS luôn sẵn sàng hỗ trợ."
        image="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1600&q=80"
        metrics={PUBLIC_SITE_CONTENT.contactMetrics}
      />

      <section className="public-section">
        <div className="public-container">
          <div className="section-header">
            <p className="section-eyebrow">Thông tin liên hệ</p>
            <h2 className="section-title">
              Nhiều cách để trao đổi và <span>chốt phương án phù hợp</span>
            </h2>
          </div>

          <div className="public-card-grid public-card-grid-3">
            {PUBLIC_SITE_CONTENT.contactCards.map((item, index) => (
              <Fade key={item.title} delay={index * 0.08}>
                <article className="public-card public-card-accent">
                  <h3 className="public-card-title">{item.title}</h3>
                  <div className="public-contact-value">{item.value}</div>
                  <p className="public-card-desc">{item.desc}</p>
                </article>
              </Fade>
            ))}
          </div>
        </div>
      </section>

      <section className="public-section public-section-soft">
        <div className="public-section-grid">
          <Fade>
            <div className="public-highlight-panel">
              <p className="section-eyebrow">Khung giờ làm việc</p>
              <h2 className="section-title">
                Chủ động sắp lịch để <span>trao đổi nhanh hơn</span>
              </h2>
              <div className="public-list">
                {PUBLIC_SITE_CONTENT.workingHours.map((item) => (
                  <div key={item} className="public-list-item">
                    <span className="public-list-icon">⏰</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </Fade>

          <Fade delay={0.1}>
            <div className="public-map-card">
              <div className="public-map-badge">Xưởng May GPMS</div>
              <p>
                {PUBLIC_SITE_CONTENT.factoryAddressSummary}
              </p>
              <p>
                Phù hợp để hẹn duyệt mẫu, kiểm tra chất lượng và trao đổi trực tiếp với bộ phận phụ trách đơn hàng tại {PUBLIC_SITE_CONTENT.factoryRegion}.
              </p>
            </div>
          </Fade>
        </div>
      </section>
    </MainLayout>
  );
}
