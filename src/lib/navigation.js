import { matchPath } from "react-router-dom";

export const BREADCRUMB_CONFIG = [
  { path: "/home", label: "Trang chủ" },
  { path: "/orders", label: "Đơn hàng", parent: "/home" },
  //{ path: "/orders/create", label: "Tạo đơn hàng", parent: "/orders" },
  { path: "/orders/owner", label: "Danh sách đơn hàng", parent: "/orders" },
  { path: "/orders/manual-create", label: "Tạo đơn hàng thủ công", parent: "/orders" },
  {
    path: "/orders/edit/:id",
    label: ({ id }) => `Sửa đơn #${id}`,
    parent: "/orders",
  },
  {
    path: "/orders/detail/:id",
    label: ({ id }) => `Chi tiết đơn #${id}`,
    parent: "/orders",
  },
  { path: "/profile", label: "Hồ sơ cá nhân", parent: "/home" },
  { path: "/profile/edit", label: "Chỉnh sửa hồ sơ", parent: "/profile" },
];

function findConfig(pathname) {
  const matched = BREADCRUMB_CONFIG
    .map((item) => ({ item, match: matchPath({ path: item.path, end: true }, pathname) }))
    .filter((entry) => entry.match)
    .sort((a, b) => b.item.path.length - a.item.path.length)[0];

  return matched || null;
}

export function buildBreadcrumbs(pathname) {
  const found = findConfig(pathname);
  if (!found) return [];

  const trail = [];
  let current = found.item;
  let currentMatch = found.match;

  while (current) {
    const label = typeof current.label === "function"
      ? current.label(currentMatch?.params || {})
      : current.label;

    trail.unshift({
      path: currentMatch?.pathname || current.path,
      label,
    });

    if (!current.parent) break;
    current = BREADCRUMB_CONFIG.find((item) => item.path === current.parent);
    currentMatch = current ? matchPath({ path: current.path, end: true }, current.path) : null;
  }

  return trail;
}

export const AUTH_NAV_TREE = [
  { key: "home", label: "Trang chủ", path: "/home" },
  {
    key: "orders",
    label: "Đơn hàng",
    path: "/orders",
    children: [
      // { label: "Danh sách đơn hàng", path: "/orders/owner" },
      { label: "Lịch sử đặt hàng", path: "/orders" },
      { label: "Tạo đơn hàng", path: "/orders/create" },
      // { label: "Tạo đơn thủ công", path: "/orders/manual-create" },
    ],
  },
  {
    key: "profile",
    label: "Hồ sơ",
    path: "/profile",
    children: [
      { label: "Xem hồ sơ", path: "/profile" },
      { label: "Chỉnh sửa hồ sơ", path: "/profile/edit" },
    ],
  },
];

