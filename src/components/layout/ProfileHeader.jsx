const T = {
  base:   "#1e8a47",
  border: "#d0e8d9",
  white:  "#ffffff",
  text:   "#18291f",
};

export default function ProfileHeader({ title }) {
  return (
    <div style={{
      height: 56,
      background: T.white,
      borderBottom: `1px solid ${T.border}`,
      display: "flex",
      alignItems: "center",
      padding: "0 2rem",
      gap: ".75rem",
      fontFamily: "'Lexend','Be Vietnam Pro','Segoe UI',sans-serif",
      flexShrink: 0,
    }}>
      <div style={{
        width: 8, height: 8,
        borderRadius: "50%",
        background: T.base,
        flexShrink: 0,
      }} />
      <h1 style={{
        fontSize: "1rem",
        fontWeight: 700,
        color: T.text,
        margin: 0,
      }}>
        {title}
      </h1>
    </div>
  );
}