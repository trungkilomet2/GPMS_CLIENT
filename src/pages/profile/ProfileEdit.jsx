import { useNavigate } from "react-router-dom";

export default function ProfileEdit() {
  const navigate = useNavigate();

  return (
    <div className="profile-card">

      <button
        className="back-btn"
        onClick={() => navigate("/profile")}
      >
        ← Quay lại
      </button>

      <h2 className="edit-title">Chỉnh sửa hồ sơ</h2>

      <div className="form-row">
        <label>Tên</label>
        <input
          type="text"
          defaultValue="Nguyễn Văn A"
        />
      </div>

      <div className="form-row">
        <label>Email</label>
        <input
          type="email"
          defaultValue="nguyenvana@email.com"
        />
      </div>

      <div className="form-row">
        <label>Số điện thoại</label>
        <input
          type="text"
          defaultValue="0912345678"
        />
      </div>

      <div className="form-actions">
        <button
          className="cancel-btn"
          onClick={() => navigate("/profile")}
        >
          Huỷ
        </button>

        <button className="save-btn">
          Lưu thay đổi
        </button>
      </div>

    </div>
  );
}