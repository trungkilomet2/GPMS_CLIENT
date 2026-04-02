import MainLayout from "@/layouts/MainLayout";
import Fade from "@/components/Fade";
import PublicPageHero from "@/components/public/PublicPageHero";

const CAPABILITIES = [
  { title: "Cắt và chuẩn bị bán thành phẩm", desc: "Quản lý sơ đồ, phân bổ nguyên liệu và kiểm đếm trước khi vào chuyền để hạn chế thiếu hụt." },
  { title: "Chuyền may linh hoạt", desc: "Tổ chức chuyền theo loại sản phẩm để tối ưu thao tác, năng suất và kiểm soát lỗi tại chỗ." },
  { title: "KCS nhiều lớp", desc: "Kiểm đầu chuyền, giữa chuyền và cuối chuyền để phát hiện sớm sai lệch kỹ thuật." },
  { title: "Đóng gói và giao nhận", desc: "Chuẩn hóa tem nhãn, gấp gói, thùng carton và lịch xuất theo từng khách hàng." },
];

const AREAS = [
  "Khu phát triển mẫu và duyệt thông số",
  "Khu cắt vải, ép keo, chia bán thành phẩm",
  "Chuyền may, hoàn thiện và là ủi",
  "Khu QC cuối chuyền và đóng gói",
];

export default function FactoryPage() {
  return (
    <MainLayout>
      <PublicPageHero
        eyebrow="Năng lực xưởng may"
        title="Một hệ vận hành gắn chặt giữa"
        highlight="con người và quy trình"
        description="Xưởng may được tổ chức theo từng khu vực chức năng rõ ràng, giúp dữ liệu đơn hàng và thực tế sản xuất luôn đi cùng nhau."
        image="https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=1600&q=80"
        metrics={[
          { value: "200+", label: "Công nhân và tổ trưởng" },
          { value: "4 khu", label: "Chức năng sản xuất chính" },
          { value: "98%", label: "Tỷ lệ giao đúng hẹn mục tiêu" },
        ]}
      />

      <section className="public-section">
        <div className="public-container">
          <div className="section-header">
            <p className="section-eyebrow">Năng lực vận hành</p>
            <h2 className="section-title">
              Từng khu vực đều có vai trò rõ trong <span>dòng chảy sản xuất</span>
            </h2>
          </div>

          <div className="public-card-grid public-card-grid-2">
            {CAPABILITIES.map((item, index) => (
              <Fade key={item.title} delay={index * 0.08}>
                <article className="public-card">
                  <h3 className="public-card-title">{item.title}</h3>
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
            <div className="public-image-card">
              <img
                src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=1000&q=80"
                alt="Quy trình xưởng may"
              />
            </div>
          </Fade>

          <Fade delay={0.12}>
            <div>
              <p className="section-eyebrow">Sơ đồ khu vực</p>
              <h2 className="section-title">
                Không gian sản xuất được bố trí để <span>giảm đứt gãy thông tin</span>
              </h2>
              <div className="public-list">
                {AREAS.map((item) => (
                  <div key={item} className="public-list-item">
                    <span className="public-list-icon">•</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </Fade>
        </div>
      </section>
    </MainLayout>
  );
}
