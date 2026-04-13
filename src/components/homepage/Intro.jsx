import Fade from "../Fade";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Clock3, Factory, FolderKanban, UsersRound } from "lucide-react";

const HIGHLIGHTS = [
  { icon: Factory, title: "Phù hợp vận hành xưởng may", desc: "Tập trung vào đơn hàng, công đoạn, sản lượng, lỗi sản xuất và những việc thực tế xảy ra trong ngày." },
  { icon: UsersRound, title: "Mỗi vai trò có phần việc riêng", desc: "Khách hàng tạo đơn, chủ xưởng duyệt, quản lý lập kế hoạch, thợ cập nhật sản lượng, quản trị viên theo dõi toàn hệ thống." },
  { icon: FolderKanban, title: "Luồng xử lý đi theo hệ thống", desc: "Từ đơn hàng sang sản xuất, từ sản xuất sang phân công, từ phân công sang báo cáo đều nằm trong cùng một luồng." },
  { icon: Clock3, title: "Dễ nhìn, dễ thao tác", desc: "Trang chủ cần tạo cảm giác đây là cổng vào của một phần mềm quản lý, không phải trang giới thiệu học thuật hay trang quảng cáo." },
];

export default function Intro() {
  const navigate = useNavigate();

  return (
    <section className="intro-section">
      <div className="intro-grid">

        {/* Left: text */}
        <Fade style={{ flex: 1, minWidth: 280 }}>
          <p className="section-eyebrow">Về GPMS</p>
          <h2 className="section-title">
            Một hệ thống dành cho <br /><span>quản lý xưởng may</span>
          </h2>

          <p className="intro-lead">
            GPMS được xây để xử lý những việc cốt lõi trong xưởng: nhận đơn, duyệt đơn, tạo kế hoạch sản xuất, phân công, cập nhật sản lượng, quản lý nghỉ phép và theo dõi vận hành nội bộ.
          </p>

          <div className="intro-note-card">
            <div className="intro-note-card__label">Những gì người dùng nhìn thấy</div>
            <div className="intro-note-card__text">
              Người dùng đi từ trang chủ vào đăng nhập, sau đó thao tác với hồ sơ cá nhân, đơn hàng, sản xuất, nhân sự, nghỉ phép, lương và quản trị theo đúng vai trò của mình.
            </div>
          </div>

          <div className="intro-check-grid">
            {HIGHLIGHTS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="intro-check-item intro-check-item--card">
                <span className="check-icon"><Icon size={16} strokeWidth={2.1} /></span>
                <div>
                  <strong>{title}</strong>
                  <p>{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <button className="btn-green" onClick={() => navigate("/about")}>
            Xem thêm về hệ thống
            <ArrowRight size={16} />
          </button>
        </Fade>

        {/* Right: image */}
        <Fade delay={0.15} style={{ flex: 1.1, minWidth: 280 }}>
          <div className="intro-image-wrap">
            <img
              src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80"
              alt="Quản lý luồng công việc trong hệ thống GPMS"
            />
            <div className="intro-image-overlay" />
            <div className="intro-floating-card">
              <div className="intro-floating-card__title">Gọn hơn cho người vận hành</div>
              <div className="intro-floating-card__text">
                Không cần dò lại quá nhiều nơi vì đơn hàng, công đoạn, sản lượng và cập nhật xử lý đều tập trung trên cùng hệ thống.
              </div>
            </div>
          </div>
        </Fade>

      </div>
    </section>
  );
}
