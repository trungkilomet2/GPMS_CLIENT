import ProfileCard from "@/components/profile/ProfileCard";
import ProfileInfoCard from "@/components/profile/ProfileInfoCard";
import { useNavigate } from "react-router-dom";

export default function ViewProfile() {

  const navigate = useNavigate();

  const user = {
    name:"Nguyễn Văn A",
    avatar:"https://i.pravatar.cc/150?img=3",
    email:"nguyenvana@email.com",
    phone:"0912345678",
    address:"TP.HCM",
    customerId:"KH15032023",
    type:"Cá nhân",
    company:"---",
    note:"Khách hàng thân thiết"
  };

  return (

    <div className="profile-page">

      <ProfileCard user={user} />

      <div className="profile-grid">

        <ProfileInfoCard title="Thông tin cá nhân">

          <div className="info-row">
            <span>Email</span>
            <span>{user.email}</span>
          </div>

          <div className="info-row">
            <span>Số điện thoại</span>
            <span>{user.phone}</span>
          </div>

          <div className="info-row">
            <span>Địa chỉ</span>
            <span>{user.address}</span>
          </div>

        </ProfileInfoCard>


        <ProfileInfoCard title="Thông tin khách hàng">

          <div className="info-row">
            <span>Mã khách hàng</span>
            <span>{user.customerId}</span>
          </div>

          <div className="info-row">
            <span>Loại khách hàng</span>
            <span>{user.type}</span>
          </div>

          <div className="info-row">
            <span>Công ty</span>
            <span>{user.company}</span>
          </div>

        </ProfileInfoCard>

      </div>

      <button
        className="edit-btn"
        onClick={()=>navigate("/profile/edit")}
      >
        Chỉnh sửa hồ sơ
      </button>

    </div>

  );
}