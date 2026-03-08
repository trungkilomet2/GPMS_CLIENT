import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserService from "@/services/userService";
import "@/styles/profile.css";

export default function ViewProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const userId = 1;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await UserService.getUserProfile(userId);
        // axiosClient interceptor đã unwrap response.data một lần
        // → res = { data: { fullName, email, ... }, pageIndex, ... }
        // → res.data = object profile thật
        setProfile(res.data);
        setTimeout(() => setLoaded(true), 50);
      } catch (error) {
        console.error("Fetch profile error:", error);
      }
    };
    fetchProfile();
  }, []);

  if (!profile)
    return (
      <div className="profile-loading">
        <div className="loading-spinner" />
        <span>Đang tải hồ sơ…</span>
      </div>
    );

  const initials = (profile.fullName || profile.email || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={`profile-page ${loaded ? "profile-page--in" : ""}`}>
      <div className="profile-bg-orb profile-bg-orb--1" />
      <div className="profile-bg-orb profile-bg-orb--2" />

      <div className="profile-wrapper">
        {/* Hero / Avatar section */}
        <div className="profile-hero">
          <div className="profile-avatar">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.fullName}
                className="profile-avatar__img"
              />
            ) : (
              <span className="profile-avatar__initials">{initials}</span>
            )}
            <div className="profile-avatar__ring" />
          </div>
          <div className="profile-hero__info">
            <h1 className="profile-hero__name">
              {profile.fullName || "Người dùng"}
            </h1>
            <p className="profile-hero__sub">Hồ sơ cá nhân</p>
          </div>
        </div>

        {/* Info card */}
        <div className="profile-card">
          <div className="profile-card__header">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span>Thông tin cá nhân</span>
          </div>

          <div className="profile-fields">
            <ProfileField icon={<MailIcon />} label="Email" value={profile.email} delay={0} />
            <ProfileField icon={<PhoneIcon />} label="Số điện thoại" value={profile.phoneNumber} delay={1} />
            <ProfileField icon={<LocationIcon />} label="Địa chỉ" value={profile.location} delay={2} />
          </div>
        </div>

        <button className="profile-edit-btn" onClick={() => navigate("/profile/edit")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Chỉnh sửa hồ sơ
        </button>
      </div>
    </div>
  );
}

function ProfileField({ icon, label, value, delay }) {
  return (
    <div className="profile-field" style={{ "--delay": delay }}>
      <div className="profile-field__icon">{icon}</div>
      <div className="profile-field__body">
        <span className="profile-field__label">{label}</span>
        <span className="profile-field__value">{value || "—"}</span>
      </div>
    </div>
  );
}

const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

const PhoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.69h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.1a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 17.5z"/>
  </svg>
);

const LocationIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);