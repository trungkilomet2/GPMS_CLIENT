import Fade from "../Fade";
import { useNavigate } from "react-router-dom";

export default function CTA() {
  const navigate = useNavigate();

  return (
    <section className="cta-section">
      <div className="cta-ring-1" />
      <div className="cta-ring-2" />

      <Fade>
        <div className="cta-inner">
          <h2 className="cta-title">
            Sẵn sàng tối ưu sản xuất cho xưởng may?
          </h2>
          <p className="cta-desc">
            Tham gia cùng hàng trăm xưởng may đang sử dụng GPMS để nâng cao hiệu quả và minh bạch vận hành.
          </p>
          <div className="cta-actions">
            <button className="btn-white" onClick={() => navigate("/login")}>
              Bắt đầu ngay →
            </button>
            <button className="btn-outline-white">Tìm hiểu thêm</button>
          </div>
        </div>
      </Fade>
    </section>
  );
}
