import Fade from "../Fade";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const CTA_POINTS = [
  "Theo dõi tiến độ tập trung",
  "Giảm trao đổi rời rạc",
  "Dễ kiểm tra khi có vấn đề",
];

export default function CTA() {
  const navigate = useNavigate();

  return (
    <section className="cta-section">
      <div className="cta-ring-1" />
      <div className="cta-ring-2" />

      <Fade>
        <div className="cta-inner">
          <h2 className="cta-title">
            Nếu đội của bạn đang phải theo dõi mọi thứ bằng quá nhiều nơi, đây là lúc gom lại cho gọn hơn.
          </h2>
          <p className="cta-desc">
            GPMS phù hợp khi bạn cần một chỗ rõ ràng để nhìn đơn hàng, sản xuất, nghỉ phép và các cập nhật vận hành mỗi ngày.
          </p>
          <div className="cta-point-list">
            {CTA_POINTS.map((item) => (
              <div key={item} className="cta-point">
                <CheckCircle2 size={16} strokeWidth={2.1} />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <div className="cta-actions">
            <button className="btn-white" onClick={() => navigate("/login")}>
              Đăng nhập ngay
              <ArrowRight size={16} />
            </button>
            <button className="btn-outline-white" onClick={() => navigate("/services")}>Tìm hiểu thêm</button>
          </div>
        </div>
      </Fade>
    </section>
  );
}
