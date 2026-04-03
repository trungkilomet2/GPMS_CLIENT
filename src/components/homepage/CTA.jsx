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
            GPMS hỗ trợ xưởng may chuẩn hóa quy trình, theo dõi tiến độ và làm việc rõ ràng hơn với từng đơn hàng.
          </p>
          <div className="cta-actions">
            <button className="btn-white" onClick={() => navigate("/login")}>
              Bắt đầu ngay →
            </button>
            <button className="btn-outline-white" onClick={() => navigate("/services")}>Tìm hiểu thêm</button>
          </div>
        </div>
      </Fade>
    </section>
  );
}
