import MainLayout from "@/layouts/MainLayout";
import Fade from "@/components/Fade";
import PublicPageHero from "@/components/public/PublicPageHero";

const CONTACTS = [
  { title: "Email tư vấn", value: "info@garmentpro.vn", desc: "Phù hợp khi cần gửi brief, bảng size, hình ảnh mẫu hoặc file kỹ thuật." },
  { title: "Hotline sản xuất", value: "(+84) 123 456 789", desc: "Ưu tiên cho nhu cầu báo giá nhanh, chốt lịch họp hoặc cập nhật tiến độ đơn hàng." },
  { title: "Địa chỉ xưởng", value: "123 Đường ABC, Quận 1, TP.HCM", desc: "Có thể hẹn lịch tham quan xưởng, duyệt mẫu và làm việc trực tiếp với bộ phận phụ trách." },
];

const HOURS = [
  "Thứ 2 - Thứ 6: 08:00 - 17:30",
  "Thứ 7: 08:00 - 12:00",
  "Chủ nhật: Nhận yêu cầu online, phản hồi trong ngày làm việc kế tiếp",
];

export default function ContactPage() {
  return (
    <MainLayout>
      <PublicPageHero
        eyebrow="Liên hệ hợp tác"
        title="Kết nối nhanh để"
        highlight="bắt đầu đơn hàng"
        description="Dù bạn đang cần báo giá, tìm xưởng gia công lâu dài hay chỉ muốn kiểm tra khả năng triển khai mẫu, đội ngũ GPMS luôn sẵn sàng hỗ trợ."
        image="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1600&q=80"
        metrics={[
          { value: "24h", label: "Thời gian phản hồi mục tiêu" },
          { value: "1:1", label: "Tư vấn theo nhu cầu đơn hàng" },
          { value: "Online + Offline", label: "Linh hoạt cách làm việc" },
        ]}
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
            {CONTACTS.map((item, index) => (
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
                {HOURS.map((item) => (
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
              <div className="public-map-badge">GPMS Garment Workshop</div>
              <p>
                123 Đường ABC, Quận 1, TP.HCM
              </p>
              <p>
                Phù hợp để hẹn duyệt mẫu, kiểm tra chất lượng và trao đổi trực tiếp với bộ phận phụ trách đơn hàng.
              </p>
            </div>
          </Fade>
        </div>
      </section>
    </MainLayout>
  );
}
