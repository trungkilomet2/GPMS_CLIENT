import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserService from "@/services/userService";
import "@/styles/profile.css";

export default function ProfileEdit() {
  const navigate = useNavigate();
  const userId = 1;
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName:    "",
    email:       "",
    phoneNumber: "",
    location:    "",
    avatarUrl:   "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await UserService.getUserProfile(userId);
        // axiosClient interceptor đã unwrap response.data một lần
        // → res = { data: { fullName, email, ... }, pageIndex, ... }
        // → res.data = object profile thật
        setForm({
          fullName:    res.data.fullName    || "",
          email:       res.data.email       || "",
          phoneNumber: res.data.phoneNumber || "",
          location:    res.data.location    || "",
          avatarUrl:   res.data.avatarUrl   || "",
        });
        setTimeout(() => setLoaded(true), 50);
      } catch (error) {
        console.error(error);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await UserService.updateUserProfile(userId, form);
      navigate("/profile");
    } catch (error) {
      console.error(error);
      alert("Cập nhật thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`profile-page ${loaded ? "profile-page--in" : ""}`}>
      <div className="profile-bg-orb profile-bg-orb--1" />
      <div className="profile-bg-orb profile-bg-orb--2" />

      <div className="profile-wrapper">
        {/* Back button */}
        <button className="profile-back-btn" onClick={() => navigate("/profile")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          Quay lại
        </button>

        {/* Card */}
        <div className="profile-card profile-card--edit">
          <div className="profile-card__header">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            <span>Chỉnh sửa hồ sơ</span>
          </div>

          <form className="edit-form" onSubmit={handleSubmit}>
            <EditField icon={<UserIcon />} label="Họ và tên" name="fullName" type="text"
              value={form.fullName} placeholder="Nguyễn Văn A" onChange={handleChange} delay={0} />
            <EditField icon={<MailIcon />} label="Email" name="email" type="email"
              value={form.email} placeholder="example@email.com" onChange={handleChange} delay={1} />
            <EditField icon={<PhoneIcon />} label="Số điện thoại" name="phoneNumber" type="tel"
              value={form.phoneNumber} placeholder="0901 234 567" onChange={handleChange} delay={2} />
            <EditField icon={<LocationIcon />} label="Địa chỉ" name="location" type="text"
              value={form.location} placeholder="Hà Nội, Việt Nam" onChange={handleChange} delay={3} />

            <div className="edit-form__actions">
              <button type="button" className="edit-cancel-btn" onClick={() => navigate("/profile")}>
                Hủy
              </button>
              <button
                type="submit"
                className={`edit-save-btn ${saving ? "edit-save-btn--loading" : ""}`}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <div className="btn-spinner" />
                    Đang lưu…
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                      <polyline points="17 21 17 13 7 13 7 21"/>
                      <polyline points="7 3 7 8 15 8"/>
                    </svg>
                    Lưu thay đổi
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function EditField({ icon, label, name, type, value, placeholder, onChange, delay }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className={`edit-field ${focused ? "edit-field--focused" : ""}`} style={{ "--delay": delay }}>
      <label className="edit-field__label" htmlFor={name}>{label}</label>
      <div className="edit-field__input-wrap">
        <div className="edit-field__icon">{icon}</div>
        <input
          id={name}
          className="edit-field__input"
          name={name}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </div>
    </div>
  );
}

const UserIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const MailIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

const PhoneIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.69h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.1a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 17.5z"/>
  </svg>
);

const LocationIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);