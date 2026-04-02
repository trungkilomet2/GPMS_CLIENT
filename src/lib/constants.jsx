// --------------------------------------------------
// GPMS - Shared constants
// --------------------------------------------------

// Design tokens (mirrors CSS variables for inline-style usage)
export const C = {
  green: "#1e6e43",
  greenDark: "#164f31",
  greenLight: "#e6f4ec",
  greenMid: "#2d9058",
  accent: "#6fdea0",
  sand: "#f5f3ee",
  text: "#1a2e23",
  textMid: "#4a5e53",
  textLight: "#7a8e83",
  border: "#dde8e2",
  navDark: "#253d2d",
  footerBg: "#0f1f14",
};

// SVG icon paths (Material Design)
export const ICONS = {
  home: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
  info: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z",
  shop: "M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3zm0 10c-1.66 0-3-1.34-3-3h2c0 .55.45 1 1 1s1-.45 1-1h2c0 1.66-1.34 3-3 3z",
  factory: "M4 18V8l4 3V8l4 3V8l6-4v16H4zm2-2h12v-2H6v2zm0-4h12v-2H6v2z",
  grad: "M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z",
  news: "M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z",
};

// SVG Icon component
export const SvgIcon = ({ d, size = 14 }) => (
  <svg
    width={size} height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    style={{ flexShrink: 0, display: "block" }}
  >
    <path d={d} />
  </svg>
);

// Navigation menu data
export const NAV_MENU = [
  {
    label: "Trang chủ",
    icon: ICONS.home,
    path: "/home",
    hasDropdown: false,
  },
  {
    label: "Giới thiệu",
    icon: ICONS.info,
    path: "/about",
    hasDropdown: true,
    items: [
      { label: "Tổng quan doanh nghiệp", path: "/about" },
      { label: "Năng lực xưởng may", path: "/factory" },
      { label: "Dịch vụ gia công", path: "/services" },
      { label: "Liên hệ hợp tác", path: "/contact" },
    ],
  },
  {
    label: "Dịch vụ",
    icon: ICONS.shop,
    path: "/services",
    hasDropdown: true,
    items: [
      { label: "Gia công CMT", path: "/services" },
      { label: "Gia công FOB", path: "/services" },
      { label: "Thiết kế ODM", path: "/services" },
      { label: "Phát triển mẫu", path: "/services" },
    ],
  },
  {
    label: "Xưởng may",
    icon: ICONS.factory,
    path: "/factory",
    hasDropdown: true,
    items: [
      { label: "Năng lực sản xuất", path: "/factory" },
      { label: "Dây chuyền và thiết bị", path: "/factory" },
      { label: "Kiểm soát chất lượng", path: "/factory" },
      { label: "Quy trình làm việc", path: "/factory" },
    ],
  },
  {
    label: "Liên hệ",
    icon: ICONS.grad,
    path: "/contact",
    hasDropdown: false,
  },
  {
    label: "Hợp tác",
    icon: ICONS.news,
    path: "/contact",
    hasDropdown: true,
    items: [
      { label: "Báo giá nhanh", path: "/contact" },
      { label: "Tư vấn đơn hàng", path: "/contact" },
      { label: "Hỗ trợ khách hàng", path: "/contact" },
    ],
  },
];

export const CATEGORIES = [
  "Xưởng may Hà Nội",
  "Xưởng may Local brand",
  "Quần áo Trẻ em",
  "Quần áo Nữ",
  "Quần áo Nam",
  "Quần áo Thể thao",
  "May số lượng ít",
  "Hàng thiết kế",
];

// Homepage section data
export const STATS = [
  { val: "10+", sub: "Năm kinh nghiệm" },
  { val: "200+", sub: "Công nhân lành nghề" },
  { val: "500+", sub: "Đơn hàng mỗi tháng" },
  { val: "98%", sub: "Khách hàng hài lòng" },
];

export const PRODUCTS = [
  { img: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=500&q=80", tag: "Local Brand", title: "Áo thun local brand", desc: "Theo dõi toàn bộ đơn hàng" },
  { img: "https://images.unsplash.com/photo-1562157873-818bc0726f68?w=500&q=80", tag: "Đồng phục", title: "Đồng phục công ty", desc: "Cập nhật tiến độ theo thời gian thực" },
  { img: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&q=80", tag: "Thời trang", title: "Váy đầm thời trang", desc: "Kiểm tra tồn sản phẩm trong dây" },
  { img: "https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?w=500&q=80", tag: "Trẻ em", title: "Quần áo trẻ em", desc: "Theo dõi năng suất công nhân" },
];

export const FEATURES = [
  { icon: "📦", title: "Quản lý đơn hàng", desc: "Tiếp nhận, phân loại và theo dõi toàn bộ đơn hàng theo thời gian thực." },
  { icon: "🏭", title: "Kế hoạch sản xuất", desc: "Lên kế hoạch và phân công công đoạn cho từng nhóm công nhân." },
  { icon: "✅", title: "Kiểm soát chất lượng", desc: "Kiểm tra từng công đoạn, ghi nhận lỗi và xử lý tức thì." },
  { icon: "💰", title: "Tính tiền công tự động", desc: "Tự động tính lương theo sản lượng và định mức từng sản phẩm." },
];

export const STEPS = [
  "Khách gửi yêu cầu",
  "Xưởng báo giá",
  "Thiết kế mẫu",
  "Sản xuất",
  "Kiểm tra chất lượng",
  "Giao hàng",
];

export const PROCESS_CARDS = [
  { rng: "01-02", title: "Tư vấn & Báo giá", desc: "Tiếp nhận yêu cầu, tư vấn chi tiết và gửi báo giá minh bạch trong 24h.", icon: "💬" },
  { rng: "03-04", title: "Thiết kế & Sản xuất", desc: "Duyệt mẫu, cắt vải, may thành phẩm theo tiêu chuẩn kỹ thuật đã thỏa thuận.", icon: "✂️" },
  { rng: "05-06", title: "Kiểm tra & Giao hàng", desc: "Kiểm tra 100% sản phẩm trước khi đóng gói và giao hàng đúng tiến độ.", icon: "🚚" },
];
