export default function ProfileInfoCard({ title, children }) {

  return (
    <div className="profile-card">

      <h3>{title}</h3>

      {children}

    </div>
  );

}