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
  { val: "6 vai trò", sub: "Khách, khách hàng, chủ xưởng, quản lý, thợ và quản trị viên" },
  { val: "89 ca sử dụng", sub: "Bao phủ luồng đơn hàng, sản xuất, nhân sự và quản trị" },
  { val: "≤ 2 giây", sub: "Mục tiêu phản hồi theo yêu cầu hiệu năng trong tài liệu đặc tả" },
  { val: "Ứng dụng web", sub: "Trang công khai và hệ thống thao tác tập trung" },
];

export const PRODUCTS = [
  { img: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=900&q=80", tag: "Đơn hàng", title: "Tạo đơn và theo dõi khách hàng", desc: "Hỗ trợ đăng ký, tạo đơn, xem chi tiết, cập nhật lịch sử và phản hồi giữa khách hàng với chủ xưởng." },
  { img: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=900&q=80", tag: "Sản xuất", title: "Kế hoạch và phân công sản xuất", desc: "Tạo đợt sản xuất, cấu hình công đoạn, gán quản lý và phân công thợ theo đúng phạm vi hệ thống." },
  { img: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=900&q=80", tag: "Nhân sự", title: "Nhân viên, nghỉ phép và lương", desc: "Theo dõi hồ sơ nhân viên, đơn nghỉ phép, kỹ năng làm việc và dữ liệu phục vụ tính lương." },
  { img: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=900&q=80", tag: "Quản trị", title: "Phân quyền, nhật ký và kiểm soát", desc: "Quản trị viên quản lý tài khoản, vai trò, quyền hạn và nhật ký hệ thống để đảm bảo vận hành có kiểm soát." },
];

export const FEATURES = [
  { icon: "📦", title: "Đơn hàng có kiểm duyệt", desc: "Đơn hàng được tạo, xem chi tiết, chỉnh sửa, từ chối hoặc yêu cầu sửa trước khi chuyển sang sản xuất." },
  { icon: "🏭", title: "Kế hoạch theo công đoạn", desc: "Quản lý sản xuất và chủ xưởng cấu hình công đoạn, gửi duyệt kế hoạch và theo dõi tiến độ theo từng phần việc." },
  { icon: "✅", title: "Lỗi, sổ cắt và sản lượng", desc: "Hệ thống hỗ trợ sổ cắt, nhật ký cắt, báo lỗi và xác nhận sản lượng theo phần việc được giao." },
  { icon: "💰", title: "Nhân sự, nghỉ phép và quản trị", desc: "Bao gồm nhân viên, kỹ năng thợ, đơn nghỉ phép, lương cùng tài khoản, phân quyền và nhật ký hệ thống." },
];

export const STEPS = [
  "Khách xem tổng quan",
  "Khách hàng tạo đơn",
  "Chủ xưởng duyệt đơn",
  "Quản lý lập kế hoạch",
  "Thợ cập nhật sản lượng",
  "Quản trị viên theo dõi hệ thống",
];

export const PROCESS_CARDS = [
  { rng: "01-02", title: "Trang công khai và tạo đơn", desc: "Khách xem trang chủ, đăng ký tài khoản và khách hàng gửi đơn với file thiết kế, vật liệu và yêu cầu sản phẩm.", icon: "💬" },
  { rng: "03-04", title: "Xét duyệt và lập kế hoạch", desc: "Chủ xưởng duyệt đơn, tạo đợt sản xuất, giao quản lý và cấu hình các công đoạn cần thực hiện.", icon: "✂️" },
  { rng: "05-06", title: "Thực thi và kiểm soát", desc: "Thợ cập nhật sản lượng, báo lỗi, xin nghỉ; đồng thời lương, phân quyền và nhật ký hệ thống được theo dõi tập trung.", icon: "🚚" },
];
