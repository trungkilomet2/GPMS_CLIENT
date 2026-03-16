import { useFadeIn } from "../hooks/useFadeIn";

export default function Fade({ children, delay = 0, style = {} }) {
  const [ref, vis] = useFadeIn();
  return (
    <div
      ref={ref}
      style={{
        opacity:    vis ? 1 : 0,
        transform:  vis ? "none" : "translateY(28px)",
        transition: `opacity .65s ease ${delay}s, transform .65s ease ${delay}s`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}