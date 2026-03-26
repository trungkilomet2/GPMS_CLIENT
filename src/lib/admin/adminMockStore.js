import { getStoredUser } from "@/lib/authStorage";

const USERS_STORAGE_KEY = "gpms-admin-users";
const LOGS_STORAGE_KEY = "gpms-admin-logs";
const PERMISSIONS_STORAGE_KEY = "gpms-admin-permissions";
const ADMIN_MOCK_VERSION_KEY = "gpms-admin-version";
const ADMIN_MOCK_VERSION = "2026-03-15-role-alignment";

export const ADMIN_STATUS_META = {
  active: { label: "Đang hoạt động", tone: "success" },
  inactive: { label: "Ngừng hoạt động", tone: "warning" },
  invited: { label: "Chờ kích hoạt", tone: "info" },
  suspended: { label: "Tạm khóa", tone: "warning" },
  locked: { label: "Khóa bảo mật", tone: "danger" },
};

export const ADMIN_LOG_SEVERITY_META = {
  critical: { label: "Critical", tone: "danger" },
  warning: { label: "Warning", tone: "warning" },
  info: { label: "Info", tone: "info" },
  success: { label: "Success", tone: "success" },
};

export const ADMIN_LOG_OUTCOME_META = {
  success: { label: "Thành công", tone: "success" },
  warning: { label: "Cần kiểm tra", tone: "warning" },
  failed: { label: "Thất bại", tone: "danger" },
};

export const ADMIN_PERMISSION_ACTIONS = [
  { key: "view", label: "View" },
  { key: "create", label: "Create" },
  { key: "update", label: "Update" },
  { key: "approve", label: "Approve" },
  { key: "export", label: "Export" },
  { key: "configure", label: "Config" },
];

export const ADMIN_PERMISSION_MODULES = [
  {
    key: "dashboard",
    label: "Dashboard",
    description: "Xem KPI, cảnh báo và tình trạng vận hành toàn hệ thống.",
  },
  {
    key: "users",
    label: "Users",
    description: "Quản lý tài khoản truy cập, hồ sơ và trạng thái user.",
  },
  {
    key: "orders",
    label: "Orders",
    description: "Theo dõi, duyệt và xuất báo cáo đơn hàng nội bộ.",
  },
  {
    key: "employees",
    label: "Employees",
    description: "Quản lý hồ sơ nhân sự, phân công và thông tin nội bộ.",
  },
  {
    key: "logs",
    label: "System Logs",
    description: "Xem nhật ký hệ thống, điều tra sự cố và xuất log.",
  },
  {
    key: "permissions",
    label: "Permissions",
    description: "Thiết lập ma trận quyền và chính sách truy cập.",
  },
];

const DEFAULT_PERMISSION_PROFILES = [
  {
    key: "Admin",
    label: "Quản trị hệ thống",
    shortLabel: "Toàn quyền hệ thống",
    tone: "danger",
    description: "Quản lý user, phân quyền, system log và các thiết lập bảo mật trọng yếu.",
    updatedAt: "2026-03-14T08:20:00+07:00",
    permissions: {
      dashboard: { view: true, create: false, update: true, approve: true, export: true, configure: true },
      users: { view: true, create: true, update: true, approve: true, export: true, configure: true },
      orders: { view: true, create: true, update: true, approve: true, export: true, configure: false },
      employees: { view: true, create: true, update: true, approve: true, export: true, configure: false },
      logs: { view: true, create: false, update: false, approve: false, export: true, configure: true },
      permissions: { view: true, create: false, update: true, approve: true, export: true, configure: true },
    },
  },
  {
    key: "Owner",
    label: "Chủ hệ thống",
    shortLabel: "Quyền điều hành",
    tone: "warning",
    description: "Phê duyệt và theo dõi mọi nghiệp vụ quan trọng, nhưng không chỉnh cấu hình lõi.",
    updatedAt: "2026-03-12T16:15:00+07:00",
    permissions: {
      dashboard: { view: true, create: false, update: true, approve: true, export: true, configure: false },
      users: { view: true, create: true, update: true, approve: true, export: true, configure: false },
      orders: { view: true, create: true, update: true, approve: true, export: true, configure: false },
      employees: { view: true, create: true, update: true, approve: true, export: true, configure: false },
      logs: { view: true, create: false, update: false, approve: false, export: true, configure: false },
      permissions: { view: true, create: false, update: false, approve: false, export: true, configure: false },
    },
  },
  {
    key: "PM",
    label: "Quản lý sản xuất",
    shortLabel: "Điều phối vận hành",
    tone: "primary",
    description: "Tập trung vào đơn hàng, nhân sự và dashboard vận hành theo ca/kế hoạch.",
    updatedAt: "2026-03-11T13:40:00+07:00",
    permissions: {
      dashboard: { view: true, create: false, update: true, approve: true, export: true, configure: false },
      users: { view: true, create: false, update: false, approve: false, export: true, configure: false },
      orders: { view: true, create: true, update: true, approve: true, export: true, configure: false },
      employees: { view: true, create: false, update: true, approve: true, export: true, configure: false },
      logs: { view: true, create: false, update: false, approve: false, export: false, configure: false },
      permissions: { view: false, create: false, update: false, approve: false, export: false, configure: false },
    },
  },
  {
    key: "Worker",
    label: "Nhân viên",
    shortLabel: "Nhân sự vận hành",
    tone: "primary",
    description: "Tài khoản tác nghiệp hàng ngày, nhận việc và cập nhật tiến độ công việc được giao.",
    updatedAt: "2026-03-08T09:30:00+07:00",
    permissions: {
      dashboard: { view: true, create: false, update: false, approve: false, export: false, configure: false },
      users: { view: false, create: false, update: false, approve: false, export: false, configure: false },
      orders: { view: true, create: false, update: false, approve: false, export: false, configure: false },
      employees: { view: false, create: false, update: false, approve: false, export: false, configure: false },
      logs: { view: false, create: false, update: false, approve: false, export: false, configure: false },
      permissions: { view: false, create: false, update: false, approve: false, export: false, configure: false },
    },
  },
];

const DEFAULT_ADMIN_USERS = [
  {
    id: "USR-1001",
    fullName: "Nguyễn Minh An",
    userName: "minhan.admin",
    email: "minhan.admin@gpms.vn",
    phoneNumber: "0901 245 678",
    department: "Nền tảng vận hành",
    title: "System Administrator",
    roleKey: "Admin",
    status: "active",
    twoFactorEnabled: true,
    location: "Hà Nội",
    notes: "Chịu trách nhiệm quản lý account đặc quyền và cấu hình bảo mật hệ thống.",
    createdAt: "2026-01-08T08:15:00+07:00",
    updatedAt: "2026-03-14T08:58:00+07:00",
    lastLogin: "2026-03-14T08:58:00+07:00",
    tags: ["MFA bắt buộc", "Owner backup"],
  },
  {
    id: "USR-1002",
    fullName: "Trần Thảo Vy",
    userName: "thaovy.owner",
    email: "thaovy.owner@gpms.vn",
    phoneNumber: "0912 300 456",
    department: "Ban điều hành",
    title: "Business Owner",
    roleKey: "Owner",
    status: "active",
    twoFactorEnabled: true,
    location: "TP. Hồ Chí Minh",
    notes: "Phê duyệt các thay đổi lớn liên quan tới quy trình và phân quyền cấp cao.",
    createdAt: "2025-12-12T10:30:00+07:00",
    updatedAt: "2026-03-13T18:10:00+07:00",
    lastLogin: "2026-03-13T18:10:00+07:00",
    tags: ["Approver", "Finance viewer"],
  },
  {
    id: "USR-1003",
    fullName: "Lê Quốc Bảo",
    userName: "quocbao.pm",
    email: "quocbao.pm@gpms.vn",
    phoneNumber: "0938 018 116",
    department: "Điều phối sản xuất",
    title: "Production Manager",
    roleKey: "PM",
    status: "active",
    twoFactorEnabled: false,
    location: "Bắc Ninh",
    notes: "Theo dõi dashboard vận hành và duyệt điều chỉnh sản xuất theo ngày.",
    createdAt: "2026-01-20T09:05:00+07:00",
    updatedAt: "2026-03-14T07:42:00+07:00",
    lastLogin: "2026-03-14T07:42:00+07:00",
    tags: ["Factory lead"],
  },
  {
    id: "USR-1006",
    fullName: "Võ Mỹ Linh",
    userName: "mylinh.worker",
    email: "mylinh.worker@gpms.vn",
    phoneNumber: "0984 883 500",
    department: "Chuyền may A",
    title: "Sewing Worker",
    roleKey: "Worker",
    status: "invited",
    twoFactorEnabled: false,
    location: "Hải Phòng",
    notes: "Đã gửi email mời, đang chờ user kích hoạt tài khoản lần đầu.",
    createdAt: "2026-03-13T15:10:00+07:00",
    updatedAt: "2026-03-13T15:10:00+07:00",
    lastLogin: "",
    tags: ["Pending onboarding"],
  },
];

const DEFAULT_ADMIN_LOGS = [
  {
    id: "LOG-20260314-001",
    timestamp: "2026-03-14T08:59:00+07:00",
    severity: "critical",
    moduleKey: "permissions",
    moduleLabel: "Permissions",
    action: "Cập nhật ma trận quyền",
    actorName: "Nguyễn Minh An",
    actorUserName: "minhan.admin",
    actorUserId: "USR-1001",
    targetId: "Admin",
    targetLabel: "Vai trò Quản trị hệ thống",
    outcome: "success",
    ipAddress: "10.24.6.18",
    description: "Bật quyền configure cho module System Logs của role Admin.",
  },
  {
    id: "LOG-20260314-002",
    timestamp: "2026-03-14T08:31:00+07:00",
    severity: "warning",
    moduleKey: "users",
    moduleLabel: "Users",
    action: "Khóa tạm tài khoản",
    actorName: "Nguyễn Minh An",
    actorUserName: "minhan.admin",
    actorUserId: "USR-1001",
    targetId: "report-ops-0314",
    targetLabel: "Báo cáo KPI ca sáng",
    outcome: "warning",
    ipAddress: "10.24.8.11",
    description: "Xuất báo cáo KPI ca sáng cho xưởng Bắc Ninh.",
  },
  {
    id: "LOG-20260314-003",
    timestamp: "2026-03-14T07:52:00+07:00",
    severity: "info",
    moduleKey: "dashboard",
    moduleLabel: "Dashboard",
    action: "Xuất báo cáo vận hành",
    actorName: "Lê Quốc Bảo",
    actorUserName: "quocbao.pm",
    actorUserId: "USR-1003",
    targetId: "report-ops-0314",
    targetLabel: "Báo cáo KPI ca sáng",
    outcome: "success",
    ipAddress: "10.24.8.11",
    description: "Xuất báo cáo KPI ca sáng cho xưởng Bắc Ninh.",
  },
  {
    id: "LOG-20260313-009",
    timestamp: "2026-03-13T18:14:00+07:00",
    severity: "success",
    moduleKey: "users",
    moduleLabel: "Users",
    action: "Cập nhật hồ sơ user",
    actorName: "Trần Thảo Vy",
    actorUserName: "thaovy.owner",
    actorUserId: "USR-1002",
    targetId: "USR-1003",
    targetLabel: "Lê Quốc Bảo",
    outcome: "success",
    ipAddress: "10.24.2.9",
    description: "Cập nhật title của user PM để đồng bộ với sơ đồ tổ chức mới.",
  },
  {
    id: "LOG-20260313-008",
    timestamp: "2026-03-13T17:42:00+07:00",
    severity: "success",
    moduleKey: "users",
    moduleLabel: "Users",
    action: "Gửi thư mời user mới",
    actorName: "Nguyễn Minh An",
    actorUserName: "minhan.admin",
    actorUserId: "USR-1001",
    targetId: "USR-1006",
    targetLabel: "Võ Mỹ Linh",
    outcome: "success",
    ipAddress: "10.24.6.18",
    description: "Gửi email onboarding và tạo account nhân viên mới.",
  },
  {
    id: "LOG-20260313-007",
    timestamp: "2026-03-13T16:20:00+07:00",
    severity: "warning",
    moduleKey: "permissions",
    moduleLabel: "Permissions",
    action: "Đề xuất thay đổi role",
    actorName: "Trần Thảo Vy",
    actorUserName: "thaovy.owner",
    actorUserId: "USR-1002",
    targetId: "PM",
    targetLabel: "Role Quản lý sản xuất",
    outcome: "warning",
    ipAddress: "10.24.2.9",
    description: "Đề xuất mở thêm quyền export dữ liệu nhân sự cho role Quản lý sản xuất, đang chờ Admin phê duyệt.",
  },
  {
    id: "LOG-20260313-006",
    timestamp: "2026-03-13T14:03:00+07:00",
    severity: "info",
    moduleKey: "employees",
    moduleLabel: "Employees",
    action: "Xuất danh sách nhân sự",
    actorName: "Lê Quốc Bảo",
    actorUserName: "quocbao.pm",
    actorUserId: "USR-1003",
    targetId: "employees-export-14",
    targetLabel: "Danh sách nhân sự tuần 11",
    outcome: "success",
    ipAddress: "10.24.8.11",
    description: "Xuất danh sách nhân sự để đối chiếu phân công tổ may.",
  },
  {
    id: "LOG-20260313-005",
    timestamp: "2026-03-13T11:18:00+07:00",
    severity: "critical",
    moduleKey: "auth",
    moduleLabel: "Authentication",
    action: "Đăng nhập thất bại nhiều lần",
    actorName: "Unknown",
    actorUserName: "unknown",
    actorUserId: "UNKNOWN",
    targetId: "USR-1003",
    targetLabel: "Lê Quốc Bảo",
    outcome: "failed",
    ipAddress: "203.113.7.46",
    description: "Có 5 lần đăng nhập thất bại liên tiếp trong vòng 7 phút.",
  },
];

const clone = (value) => JSON.parse(JSON.stringify(value));

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function ensureMockSeedVersion() {
  if (!canUseStorage()) return;

  try {
    const currentVersion = window.localStorage.getItem(ADMIN_MOCK_VERSION_KEY);

    if (currentVersion === ADMIN_MOCK_VERSION) {
      return;
    }

    // Reset demo admin storage when the supported role set changes.
    window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_ADMIN_USERS));
    window.localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(DEFAULT_ADMIN_LOGS));
    window.localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(DEFAULT_PERMISSION_PROFILES));
    window.localStorage.setItem(ADMIN_MOCK_VERSION_KEY, ADMIN_MOCK_VERSION);
  } catch {
    // Ignore storage write errors in demo mode.
  }
}

function readStoredValue(key, fallbackValue) {
  ensureMockSeedVersion();

  if (!canUseStorage()) return clone(fallbackValue);

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      window.localStorage.setItem(key, JSON.stringify(fallbackValue));
      return clone(fallbackValue);
    }

    const parsed = JSON.parse(raw);
    if (Array.isArray(fallbackValue)) {
      return Array.isArray(parsed) ? parsed : clone(fallbackValue);
    }

    return parsed && typeof parsed === "object" ? parsed : clone(fallbackValue);
  } catch {
    return clone(fallbackValue);
  }
}

function writeStoredValue(key, value) {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage write errors in demo mode.
  }
}

function getCurrentActor() {
  const user = canUseStorage() ? getStoredUser() : null;

  return {
    actorName: user?.fullName || user?.name || "Admin hiện tại",
    actorUserName: user?.userName || "current.admin",
    actorUserId: String(user?.userId || user?.id || "CURRENT-ADMIN"),
    ipAddress: "10.24.6.18",
  };
}

function buildNextUserId(users = []) {
  const maxNumericId = users.reduce((currentMax, user) => {
    const numericId = Number.parseInt(String(user.id).replace(/\D/g, ""), 10);
    return Number.isFinite(numericId) ? Math.max(currentMax, numericId) : currentMax;
  }, 1000);

  return `USR-${String(maxNumericId + 1).padStart(4, "0")}`;
}

function buildNextLogId(logs = []) {
  const maxNumericId = logs.reduce((currentMax, log) => {
    const numericId = Number.parseInt(String(log.id).replace(/\D/g, ""), 10);
    return Number.isFinite(numericId) ? Math.max(currentMax, numericId) : currentMax;
  }, 1);

  return `LOG-${String(maxNumericId + 1).padStart(12, "0")}`;
}

function getModuleLabel(moduleKey) {
  const moduleMeta = ADMIN_PERMISSION_MODULES.find((item) => item.key === moduleKey);
  if (moduleMeta) return moduleMeta.label;

  const extraModuleMap = {
    auth: "Authentication",
    security: "Security",
  };

  return extraModuleMap[moduleKey] || moduleKey;
}

export function countGrantedPermissions(profile) {
  if (!profile?.permissions) return 0;

  return ADMIN_PERMISSION_MODULES.reduce((count, moduleItem) => {
    const permissionSet = profile.permissions[moduleItem.key] || {};
    return (
      count +
      ADMIN_PERMISSION_ACTIONS.reduce(
        (actionCount, action) => actionCount + (permissionSet[action.key] ? 1 : 0),
        0
      )
    );
  }, 0);
}

function enrichUser(user, profiles) {
  const roleProfile = profiles.find((item) => item.key === user.roleKey) || profiles[0];
  const statusMeta = ADMIN_STATUS_META[user.status] || ADMIN_STATUS_META.active;

  return {
    ...user,
    roleLabel: roleProfile?.label || user.roleKey,
    roleTone: roleProfile?.tone || "primary",
    permissionLabel: roleProfile?.shortLabel || "Chưa gán quyền",
    grantedPermissionCount: countGrantedPermissions(roleProfile),
    statusLabel: statusMeta.label,
    statusTone: statusMeta.tone,
  };
}

function appendLog(partialLog) {
  const logs = readStoredValue(LOGS_STORAGE_KEY, DEFAULT_ADMIN_LOGS);
  const nextLogs = [
    {
      id: buildNextLogId(logs),
      ...partialLog,
    },
    ...logs,
  ];

  writeStoredValue(LOGS_STORAGE_KEY, nextLogs);
  return nextLogs[0];
}

export function getPermissionProfiles() {
  return readStoredValue(PERMISSIONS_STORAGE_KEY, DEFAULT_PERMISSION_PROFILES);
}

export function getPermissionProfile(roleKey) {
  return getPermissionProfiles().find((profile) => profile.key === roleKey) || getPermissionProfiles()[0];
}

export function getAdminRoleOptions() {
  return getPermissionProfiles().map((profile) => ({
    key: profile.key,
    label: profile.label,
    tone: profile.tone,
    shortLabel: profile.shortLabel,
    description: profile.description,
  }));
}

export function getAdminUsers() {
  const profiles = getPermissionProfiles();

  return readStoredValue(USERS_STORAGE_KEY, DEFAULT_ADMIN_USERS)
    .sort((left, right) => {
      const rightDate = new Date(right.updatedAt || right.createdAt || 0).getTime();
      const leftDate = new Date(left.updatedAt || left.createdAt || 0).getTime();
      return rightDate - leftDate;
    })
    .map((user) => enrichUser(user, profiles));
}

export function getAdminUserById(id) {
  return getAdminUsers().find((user) => String(user.id) === String(id)) || null;
}

export function getAdminLogs() {
  return readStoredValue(LOGS_STORAGE_KEY, DEFAULT_ADMIN_LOGS).sort((left, right) => {
    const rightDate = new Date(right.timestamp || 0).getTime();
    const leftDate = new Date(left.timestamp || 0).getTime();
    return rightDate - leftDate;
  });
}

export function createAdminUser(payload) {
  const profiles = getPermissionProfiles();
  const users = readStoredValue(USERS_STORAGE_KEY, DEFAULT_ADMIN_USERS);
  const now = new Date().toISOString();
  const actor = getCurrentActor();
  const roleProfile = profiles.find((profile) => profile.key === payload.roleKey) || profiles[0];

  const nextUser = {
    id: buildNextUserId(users),
    fullName: payload.fullName,
    userName: payload.userName,
    email: payload.email,
    phoneNumber: payload.phoneNumber,
    department: payload.department,
    title: payload.title,
    roleKey: payload.roleKey,
    status: payload.status,
    twoFactorEnabled: Boolean(payload.twoFactorEnabled),
    location: payload.location,
    notes: payload.notes,
    createdAt: now,
    updatedAt: now,
    lastLogin: payload.status === "invited" ? "" : now,
    tags: payload.tags || [],
  };

  const nextUsers = [nextUser, ...users];
  writeStoredValue(USERS_STORAGE_KEY, nextUsers);

  appendLog({
    timestamp: now,
    severity: "success",
    moduleKey: "users",
    moduleLabel: getModuleLabel("users"),
    action: "Tạo user mới",
    targetId: nextUser.id,
    targetLabel: `${nextUser.fullName} (${nextUser.userName})`,
    outcome: "success",
    description: `Tạo tài khoản ${nextUser.userName} với role ${roleProfile.label}.`,
    ...actor,
  });

  return enrichUser(nextUser, profiles);
}

export function updateAdminUser(id, payload) {
  const profiles = getPermissionProfiles();
  const users = readStoredValue(USERS_STORAGE_KEY, DEFAULT_ADMIN_USERS);
  const actor = getCurrentActor();
  const now = new Date().toISOString();
  const currentUser = users.find((user) => String(user.id) === String(id));

  if (!currentUser) return null;

  const nextUser = {
    ...currentUser,
    ...payload,
    id: currentUser.id,
    userName: currentUser.userName,
    updatedAt: now,
  };

  const nextUsers = users.map((user) => (String(user.id) === String(id) ? nextUser : user));
  writeStoredValue(USERS_STORAGE_KEY, nextUsers);

  appendLog({
    timestamp: now,
    severity: "info",
    moduleKey: "users",
    moduleLabel: getModuleLabel("users"),
    action: "Cập nhật hồ sơ user",
    targetId: nextUser.id,
    targetLabel: `${nextUser.fullName} (${nextUser.userName})`,
    outcome: "success",
    description: `Cập nhật hồ sơ và trạng thái truy cập của user ${nextUser.userName}.`,
    ...actor,
  });

  return enrichUser(nextUser, profiles);
}

export function updatePermissionProfile(roleKey, nextPermissions) {
  const profiles = readStoredValue(PERMISSIONS_STORAGE_KEY, DEFAULT_PERMISSION_PROFILES);
  const actor = getCurrentActor();
  const now = new Date().toISOString();
  let updatedProfile = null;

  const nextProfiles = profiles.map((profile) => {
    if (profile.key !== roleKey) return profile;

    updatedProfile = {
      ...profile,
      permissions: nextPermissions,
      updatedAt: now,
    };
    return updatedProfile;
  });

  writeStoredValue(PERMISSIONS_STORAGE_KEY, nextProfiles);

  if (updatedProfile) {
    appendLog({
      timestamp: now,
      severity: "critical",
      moduleKey: "permissions",
      moduleLabel: getModuleLabel("permissions"),
      action: "Lưu cấu hình quyền",
      targetId: updatedProfile.key,
      targetLabel: updatedProfile.label,
      outcome: "success",
      description: `Cập nhật ma trận quyền cho role ${updatedProfile.label}.`,
      ...actor,
    });
  }

  return updatedProfile;
}
