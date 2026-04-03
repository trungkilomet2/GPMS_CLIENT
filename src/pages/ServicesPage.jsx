import MainLayout from "@/layouts/MainLayout";
import Fade from "@/components/Fade";
import PublicPageHero from "@/components/public/PublicPageHero";

const SERVICES = [
  {
    title: "Gia công CMT",
    desc: "Nhận cắt may hoàn thiện theo rập, tài liệu kỹ thuật và nguyên phụ liệu khách hàng cung cấp.",
  },
  {
    title: "Gia công FOB",
    desc: "Hỗ trợ tìm nguồn nguyên phụ liệu, kiểm soát mua hàng và tổ chức sản xuất trọn gói theo ngân sách.",
  },
  {
    title: "Phát triển mẫu",
    desc: "Dựng rập, may sample, chỉnh form và test chất liệu trước khi duyệt sản xuất số lượng lớn.",
  },
  {
    title: "Đồng phục doanh nghiệp",
    desc: "Tư vấn đồng bộ màu sắc, logo, size run và lịch giao cho văn phòng, nhà hàng, nhà máy hay trường học.",
  },
  {
    title: "Local brand",
    desc: "Phù hợp các bộ sưu tập nhỏ cần phản hồi nhanh, kiểm kỹ form dáng và hình ảnh thành phẩm.",
  },
  {
    title: "Kiểm hàng và đóng gói",
    desc: "Kiểm định theo AQL nội bộ, ép gói, in tem nhãn và chuẩn bị giao nhận theo từng kênh bán.",
  },
];

const MODELS = [
  "Đơn mẫu thử, capsule collection và pre-order quy mô nhỏ.",
  "Đơn may đồng phục cần lịch giao theo từng đợt.",
  "Đơn sản xuất ổn định cho local brand và khách hàng xuất khẩu.",
];

export default function ServicesPage() {
  return (
    <MainLayout>
      <PublicPageHero
        eyebrow="Dịch vụ gia công"
        title="Từ ý tưởng đến"
        highlight="thành phẩm hoàn chỉnh"
        description="GPMS cùng xưởng may tổ chức toàn bộ quy trình từ tư vấn, phát triển mẫu, triển khai sản xuất đến kiểm hàng và giao nhận."
        image="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1600&q=80"
        metrics={[
          { value: "Theo nhu cầu", label: "Tiếp nhận theo từng loại đơn hàng" },
          { value: "3 mô hình", label: "CMT, FOB, phát triển mẫu" },
          { value: "Theo công đoạn", label: "Theo dõi tiến độ sản xuất" },
        ]}
      />

      <section className="public-section">
        <div className="public-container">
          <div className="section-header">
            <p className="section-eyebrow">Nhóm dịch vụ chính</p>
            <h2 className="section-title">
              Chọn đúng giải pháp cho <span>từng loại đơn hàng</span>
            </h2>
          </div>

          <div className="public-card-grid public-card-grid-3">
            {SERVICES.map((service, index) => (
              <Fade key={service.title} delay={index * 0.06}>
                <article className="public-card public-card-accent">
                  <h3 className="public-card-title">{service.title}</h3>
                  <p className="public-card-desc">{service.desc}</p>
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
              <p className="section-eyebrow">Mô hình hợp tác</p>
              <h2 className="section-title">
                Phù hợp từ đơn nhỏ đến <span>sản xuất dài hạn</span>
              </h2>
              <div className="public-list">
                {MODELS.map((item) => (
                  <div key={item} className="public-list-item">
                    <span className="public-list-icon">✓</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </Fade>

          <Fade delay={0.1}>
            <div className="public-image-card">
              <img
                src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=1000&q=80"
                alt="Dịch vụ gia công may mặc"
              />
            </div>
          </Fade>
        </div>
      </section>
    </MainLayout>
  );
}
