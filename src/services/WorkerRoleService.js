import WorkerService from "@/services/WorkerService";

const STORAGE_KEY = "gpms-worker-roles";

const DEFAULT_ROLES = [
  { id: 1, name: "Tailor" },
  { id: 2, name: "Quality Control" },
];

const WORKER_ROLE_LABEL_MAP = {
  Tailor: "Thợ may",
  "Quality Control": "Kiểm tra chất lượng",
};

function getWorkerRoleLabel(name = "") {
  return WORKER_ROLE_LABEL_MAP[name] ?? name;
}

function normalizeRole(item = {}, fallbackId = 0) {
  return {
    id: Number(item.id ?? item.wrId ?? fallbackId),
    name: String(item.name ?? item.NAME ?? "").trim(),
  };
}

function readStoredRoles() {
  if (typeof window === "undefined") return DEFAULT_ROLES;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ROLES;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_ROLES;

    return parsed
      .map((item, index) => normalizeRole(item, index + 1))
      .filter((item) => item.id && item.name);
  } catch {
    return DEFAULT_ROLES;
  }
}

function writeStoredRoles(roles) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(roles));
  } catch {
    // ignore storage errors
  }
}

function mergeRoles(baseRoles, employeeRoles) {
  const merged = new Map();

  [...baseRoles, ...employeeRoles].forEach((role, index) => {
    if (!role?.name) return;

    const key = role.name.trim().toLowerCase();
    if (!key) return;

    if (!merged.has(key)) {
      merged.set(key, normalizeRole(role, index + 1));
    }
  });

  return Array.from(merged.values())
    .sort((a, b) => a.id - b.id)
    .map((item, index) => ({
      id: item.id || index + 1,
      name: item.name,
    }));
}

const WorkerRoleService = {
  async getWorkerRoles() {
    const storedRoles = readStoredRoles();

    let employees = [];
    try {
      const employeeResponse = await WorkerService.getAllEmployees();
      employees = employeeResponse?.data ?? [];
    } catch {
      employees = [];
    }

    const employeeRoles = employees
      .filter((employee) => employee.workerRole)
      .map((employee, index) => ({
        id: storedRoles.length + index + 1,
        name: employee.workerRole,
      }));

    const roles = mergeRoles(storedRoles, employeeRoles);
    writeStoredRoles(roles);

    return roles.map((role) => {
      const members = employees.filter((employee) => employee.workerRole === role.name);

      return {
        ...role,
        label: getWorkerRoleLabel(role.name),
        assignedCount: members.length,
        members: members.map((member) => ({
          id: member.id,
          fullName: member.fullName,
          userName: member.userName,
        })),
      };
    });
  },

  async createWorkerRole(payload) {
    const name = String(payload?.name ?? "").trim();

    if (!name) {
      throw new Error("Tên vai trò thợ không được để trống.");
    }

    const roles = readStoredRoles();
    const duplicate = roles.some((role) => role.name.toLowerCase() === name.toLowerCase());

    if (duplicate) {
      throw new Error("Vai trò thợ này đã tồn tại.");
    }

    const nextId = roles.reduce((max, item) => Math.max(max, item.id), 0) + 1;
    const createdRole = { id: nextId, name };

    writeStoredRoles([...roles, createdRole]);

    return {
      ...createdRole,
      label: getWorkerRoleLabel(createdRole.name),
      assignedCount: 0,
      members: [],
    };
  },
};

export default WorkerRoleService;
