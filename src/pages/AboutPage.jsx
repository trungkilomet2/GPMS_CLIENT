import MainLayout from "@/layouts/MainLayout";
import Fade from "@/components/Fade";
import PublicPageHero from "@/components/public/PublicPageHero";

const VALUES = [
  {
    title: "Minh bạch tiến độ",
    desc: "Mỗi đơn hàng được theo dõi từ nhận mẫu, duyệt rập, cắt, may đến kiểm hàng để khách dễ nắm tiến độ.",
  },
  {
    title: "Tập trung chất lượng",
    desc: "Đội QC kiểm tra theo từng công đoạn giúp giảm lỗi chuyền, giữ form chuẩn và hạn chế phát sinh khi giao hàng.",
  },
  {
    title: "Làm việc linh hoạt",
    desc: "GPMS hỗ trợ local brand, đồng phục và đơn hàng gia công theo nhiều quy mô từ mẫu thử đến sản xuất hàng loạt.",
  },
];

const TIMELINE = [
  "Tiếp nhận brief, thông số kỹ thuật và mục tiêu đơn hàng.",
  "Tư vấn giải pháp sản xuất phù hợp với chất liệu, số lượng và deadline.",
  "Phối hợp mẫu, duyệt rập và chốt tiêu chuẩn chất lượng trước khi vào chuyền.",
  "Theo dõi tiến độ và cập nhật trạng thái minh bạch cho từng mốc sản xuất.",
];

export default function AboutPage() {
  return (
    <MainLayout>
      <PublicPageHero
        eyebrow="Về GPMS"
        title="Đồng hành cùng"
        highlight="xưởng may hiện đại"
        description="GPMS xây dựng một không gian quản trị thống nhất cho đơn hàng, sản xuất, nhân sự và chất lượng để xưởng vận hành rõ ràng hơn mỗi ngày."
        image="https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=1600&q=80"
        metrics={[
          { value: "10+", label: "Năm đồng hành ngành may" },
          { value: "200+", label: "Nhân sự sản xuất phối hợp" },
          { value: "500+", label: "Đơn hàng theo dõi mỗi tháng" },
        ]}
      />

      <section className="public-section public-section-soft">
        <div className="public-section-grid">
          <Fade>
            <div>
              <p className="section-eyebrow">Câu chuyện phát triển</p>
              <h2 className="section-title">
                Nền tảng quản lý được thiết kế cho <span>xưởng may Việt Nam</span>
              </h2>
              <p className="public-copy">
                Chúng tôi kết hợp kinh nghiệm vận hành xưởng với tư duy số hóa để giảm việc ghi chép rời rạc, giúp chủ xưởng, quản lý chuyền và khách hàng phối hợp trên cùng một luồng thông tin.
              </p>
              <p className="public-copy">
                Từ các đơn local brand cần phản hồi nhanh đến hợp đồng gia công cần kiểm soát tiến độ chặt, GPMS ưu tiên tính thực tế, dễ triển khai và đủ linh hoạt để mở rộng quy mô.
              </p>
            </div>
          </Fade>

          <Fade delay={0.12}>
            <div className="public-image-card">
              <img
                src="https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=1000&q=80"
                alt="Năng lực xưởng may"
              />
            </div>
          </Fade>
        </div>
      </section>

      <section className="public-section">
        <div className="public-container">
          <div className="section-header">
            <p className="section-eyebrow">Giá trị cốt lõi</p>
            <h2 className="section-title">
              Ba nguyên tắc giữ cho dự án <span>đi đúng hướng</span>
            </h2>
          </div>

          <div className="public-card-grid public-card-grid-3">
            {VALUES.map((item, index) => (
              <Fade key={item.title} delay={index * 0.08}>
                <article className="public-card">
                  <div className="public-card-index">0{index + 1}</div>
                  <h3 className="public-card-title">{item.title}</h3>
                  <p className="public-card-desc">{item.desc}</p>
                </article>
              </Fade>
            ))}
          </div>
        </div>
      </section>

      <section className="public-section public-section-dark">
        <div className="public-container">
          <div className="section-header section-header-light">
            <p className="section-eyebrow">Cách chúng tôi làm việc</p>
            <h2 className="section-title">
              Rõ đầu việc, rõ trách nhiệm, <span>rõ tiến độ</span>
            </h2>
          </div>

          <div className="public-timeline">
            {TIMELINE.map((item, index) => (
              <Fade key={item} delay={index * 0.08}>
                <div className="public-timeline-item">
                  <div className="public-timeline-step">Bước {index + 1}</div>
                  <p>{item}</p>
                </div>
              </Fade>
            ))}
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
