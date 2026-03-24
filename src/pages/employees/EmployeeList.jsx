import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BriefcaseBusiness,
  CircleAlert,
  LoaderCircle,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  Users,
} from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { getStoredUser } from "@/lib/authStorage";
import { getPrimaryWorkspaceRole } from "@/lib/internalRoleFlow";
import WorkerService, { getEmployeeModuleErrorMessage } from "@/services/WorkerService";
import "@/styles/employees.css";

const STATUS_MAP = {
  active: {
    label: "Đang hoạt động",
    className: "employee-status employee-status--working",
  },
  inactive: {
    label: "Ngừng hoạt động",
    className: "employee-status employee-status--leave",
  },
};

const ROLE_GROUPS = {
  management: ["Owner", "PM", "Admin", "Team Leader"],
};

function getInitials(name = "") {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(-2)
    .join("")
    .toUpperCase();
}

function normalizeSearchText(value = "") {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function getEmployeeSpecialty(employee) {
  if (employee.workerSkill) {
    return {
      label: employee.workerSkillLabel,
      className: "employee-status employee-status--new",
    };
  }

  return {
    label: "Chưa cập nhật",
    className: "employee-status employee-status--neutral",
  };
}

function getRoleSummary(roleLabels = []) {
  if (!roleLabels.length) {
    return {
      primary: "Chưa cập nhật",
      secondary: "",
    };
  }

  if (roleLabels.length === 1) {
    return {
      primary: roleLabels[0],
      secondary: "",
    };
  }

  return {
    primary: roleLabels.slice(0, 2).join(", "),
    secondary: `+${roleLabels.length - 2} vai trò khác`,
  };
}

function SummaryCard({ icon: Icon, label, value, meta, tone }) {
  return (
    <div className={`employee-summary employee-summary--${tone}`}>
      <div className="employee-summary__top">
        <div className="employee-summary__heading">
          <p className="employee-summary__label">{label}</p>
          <div className="employee-summary__value">{value}</div>
        </div>
        <div className="employee-summary__icon">
          <Icon size={22} />
        </div>
      </div>
      <p className="employee-summary__meta">{meta}</p>
    </div>
  );
}

export default function EmployeeList() {
  const location = useLocation();
  const user = getStoredUser();
  const primaryRole = getPrimaryWorkspaceRole(user?.role);
  const isOwner = primaryRole === "owner";
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadSeed, setReloadSeed] = useState(0);
  const viewMode = location.pathname.includes("/employees/management")
    ? "management"
    : location.pathname.includes("/employees/workers")
      ? "workers"
      : "all";

  useEffect(() => {
    let mounted = true;

    const fetchEmployees = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await WorkerService.getAllEmployees();
        if (!mounted) return;

        setEmployees(response?.data ?? []);
      } catch (err) {
        if (!mounted) return;

        const message = getEmployeeModuleErrorMessage(
          err,
          "Không tải được danh sách nhân viên. Vui lòng thử lại."
        );
        setError(message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchEmployees();

    return () => {
      mounted = false;
    };
  }, [reloadSeed]);

  const handleRetry = () => {
    setReloadSeed((current) => current + 1);
  };

  const clearFilters = () => {
    setSearch("");
    setRoleFilter("all");
    setSpecialtyFilter("all");
    setStatusFilter("all");
  };

  const scopedEmployees = useMemo(() => {
    if (viewMode === "management") {
      return employees.filter((employee) =>
        employee.roles.some((role) => ROLE_GROUPS.management.includes(role))
      );
    }

    if (viewMode === "workers") {
      return employees.filter((employee) => employee.roles.includes("Worker"));
    }

    return employees;
  }, [employees, viewMode]);

  const filteredEmployees = useMemo(() => {
    const keyword = normalizeSearchText(search);

    return scopedEmployees.filter((employee) => {
      const searchableText = normalizeSearchText(
        [
          employee.fullName,
          employee.userName,
          employee.phoneNumber,
          employee.email,
          ...(employee.roleLabels ?? []),
          employee.workerSkillLabel,
          employee.managerName,
          employee.managerRoleHint,
          employee.hierarchyTag,
        ]
          .filter(Boolean)
          .join(" ")
      );
      const matchSearch =
        !keyword || searchableText.includes(keyword);
      const matchRole = roleFilter === "all" || employee.roles.includes(roleFilter);
      const matchSpecialty =
        specialtyFilter === "all" || employee.workerSkill === specialtyFilter;
      const matchStatus = statusFilter === "all" || employee.status === statusFilter;

      return matchSearch && matchRole && matchSpecialty && matchStatus;
    });
  }, [roleFilter, scopedEmployees, search, specialtyFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = scopedEmployees.length;
    const active = scopedEmployees.filter((employee) => employee.status === "active").length;
    const management = scopedEmployees.filter((employee) =>
      employee.roles.some((role) => ROLE_GROUPS.management.includes(role))
    ).length;
    const skilled = scopedEmployees.filter((employee) => Boolean(employee.workerSkill)).length;

    return { total, active, management, skilled };
  }, [scopedEmployees]);

  const roleOptions = useMemo(() => {
    const optionsMap = new Map();

    scopedEmployees.forEach((employee) => {
      employee.roles.forEach((role, index) => {
        if (!optionsMap.has(role)) {
          optionsMap.set(role, employee.roleLabels?.[index] || role);
        }
      });
    });

    return [
      { value: "all", label: "Tất cả vai trò" },
      ...Array.from(optionsMap.entries())
        .sort(([, labelA], [, labelB]) => labelA.localeCompare(labelB, "vi"))
        .map(([value, label]) => ({ value, label })),
    ];
  }, [scopedEmployees]);

  const specialtyOptions = useMemo(() => {
    const optionsMap = new Map();

    scopedEmployees.forEach((employee) => {
      if (employee.workerSkill) {
        optionsMap.set(employee.workerSkill, employee.workerSkillLabel || employee.workerSkill);
      }
    });

    return [
      { value: "all", label: "Tất cả chuyên môn" },
      ...Array.from(optionsMap.entries())
        .sort(([, labelA], [, labelB]) => labelA.localeCompare(labelB, "vi"))
        .map(([value, label]) => ({ value, label })),
    ];
  }, [scopedEmployees]);

  const hasActiveFilters =
    Boolean(search.trim()) ||
    roleFilter !== "all" ||
    specialtyFilter !== "all" ||
    statusFilter !== "all";
  const hasAnyEmployee = scopedEmployees.length > 0;
  const pageTitle =
    viewMode === "management"
      ? "Danh sách quản lý"
      : viewMode === "workers"
        ? "Danh sách nhân viên"
        : "Danh sách nhân viên";
  const pageSubtitle =
    viewMode === "management"
      ? "Theo dõi riêng nhóm Owner, PM, Admin và Team Leader trong hệ thống."
      : viewMode === "workers"
        ? "Theo dõi riêng nhóm worker và chuyên môn thợ trong hệ thống."
        : "Theo dõi nhân sự nội bộ theo hierarchy Owner, PM, Team Lead, Worker và chuyên môn thợ.";
  const tableTitle =
    viewMode === "management"
      ? "Nhóm quản lý"
      : viewMode === "workers"
        ? "Nhân viên sản xuất"
        : "Nhân sự trong xưởng";
  const tableSubtitle =
    viewMode === "management"
      ? "Danh sách các tài khoản quản lý và vai trò điều hành hiện có."
      : viewMode === "workers"
        ? "Danh sách worker, chuyên môn thợ và tuyến quản lý hiện có."
        : "Danh sách nhân viên, vai trò hệ thống, chuyên môn thợ và tuyến quản lý hiện có.";

  return (
    <DashboardLayout>
      <div className="employee-page">
        <div className="employee-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="employee-hero">
            <div>
              <h1 className="employee-hero__title">{pageTitle}</h1>
              <p className="employee-hero__subtitle">{pageSubtitle}</p>
            </div>

            {isOwner ? (
              <Link to="/employees/create" className="employee-hero__action">
                <Plus size={18} />
                <span>Thêm nhân viên</span>
              </Link>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard icon={Users} label="Tổng nhân viên" value={stats.total} meta="Toàn bộ nhân sự nội bộ" tone="primary" />
            <SummaryCard icon={UserRoundCheck} label="Đang hoạt động" value={stats.active} meta="Nhân viên đang làm việc" tone="success" />
            <SummaryCard icon={BriefcaseBusiness} label="Nhóm quản lý" value={stats.management} meta="Chủ xưởng, quản lý và tổ trưởng" tone="warning" />
            <SummaryCard
              icon={Sparkles}
              label="Có chuyên môn"
              value={stats.skilled}
              meta={
                stats.total
                  ? `${stats.total - stats.skilled} nhân viên chưa cập nhật chuyên môn`
                  : "Chưa có dữ liệu chuyên môn"
              }
              tone="accent"
            />
          </div>

          <p className="employee-summary-note">
            Số liệu tổng quan phía trên được tính trên toàn bộ danh sách nhân viên và không thay đổi theo bộ lọc.
          </p>

          <div className="employee-filter-card">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_220px_220px_220px_auto]">
              <label className="employee-filter-field employee-filter-field--search">
                <span className="employee-filter-field__label">Tìm kiếm nhân viên</span>
                <Search size={18} className="employee-filter-field__icon" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tên, tài khoản, số điện thoại, email..."
                  className="employee-filter-field__control"
                />
              </label>

              <label className="employee-filter-field">
                <span className="employee-filter-field__label">Vai trò hệ thống</span>
                <BriefcaseBusiness size={17} className="employee-filter-field__icon" />
                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                  className="employee-filter-field__control"
                >
                  {roleOptions.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="employee-filter-field">
                <span className="employee-filter-field__label">Chuyên môn</span>
                <Sparkles size={17} className="employee-filter-field__icon" />
                <select
                  value={specialtyFilter}
                  onChange={(event) => setSpecialtyFilter(event.target.value)}
                  className="employee-filter-field__control"
                >
                  {specialtyOptions.map((specialty) => (
                    <option key={specialty.value} value={specialty.value}>
                      {specialty.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="employee-filter-field">
                <span className="employee-filter-field__label">Trạng thái</span>
                <ShieldCheck size={17} className="employee-filter-field__icon" />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="employee-filter-field__control"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="active">Đang hoạt động</option>
                  <option value="inactive">Ngừng hoạt động</option>
                </select>
              </label>

              <div className="employee-filter-actions">
                <div className="employee-filter-info">
                  <Users size={16} />
                  <span>{filteredEmployees.length} kết quả</span>
                </div>
                {hasActiveFilters ? (
                  <button
                    type="button"
                    className="employee-filter-reset"
                    onClick={clearFilters}
                  >
                    Xóa bộ lọc
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="employee-table-card">
            <div className="employee-table-card__header">
              <div>
                <h2 className="employee-table-card__title">{tableTitle}</h2>
                <p className="employee-table-card__subtitle">{tableSubtitle}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="employee-table-state">
                  <LoaderCircle size={18} className="employee-table-state__spin" />
                  <div className="employee-table-state__content">
                    <strong>Đang tải danh sách nhân viên...</strong>
                    <span>Dữ liệu nhân sự đang được đồng bộ từ hệ thống.</span>
                  </div>
                </div>
              ) : error ? (
                <div className="employee-table-state employee-table-state--error">
                  <CircleAlert size={18} />
                  <div className="employee-table-state__content">
                    <strong>Không tải được danh sách nhân viên</strong>
                    <span>{error}</span>
                  </div>
                  <div className="employee-table-state__actions">
                    <button
                      type="button"
                      className="employee-state-btn employee-state-btn--primary"
                      onClick={handleRetry}
                    >
                      Thử lại
                    </button>
                  </div>
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="employee-table-state">
                  <Users size={18} />
                  <div className="employee-table-state__content">
                    <strong>
                      {hasAnyEmployee
                        ? "Không có nhân viên nào phù hợp với bộ lọc hiện tại"
                        : "Chưa có nhân viên nào trong hệ thống"}
                    </strong>
                    <span>
                      {hasAnyEmployee
                        ? "Thử xóa bớt điều kiện lọc để xem lại đầy đủ danh sách."
                        : "Tạo nhân viên đầu tiên để bắt đầu quản lý nhân sự nội bộ."}
                    </span>
                  </div>
                  <div className="employee-table-state__actions">
                    {hasAnyEmployee ? (
                      <button
                        type="button"
                        className="employee-state-btn employee-state-btn--secondary"
                        onClick={clearFilters}
                      >
                        Xóa bộ lọc
                      </button>
                    ) : isOwner ? (
                      <Link
                        to="/employees/create"
                        className="employee-state-btn employee-state-btn--primary"
                      >
                        Thêm nhân viên
                      </Link>
                    )}
                  </div>
                </div>
              ) : (
                <table className="employee-table min-w-full divide-y divide-slate-200">
                <thead className="employee-table-head">
                  <tr>
                    <th className="employee-table-th employee-table-th--person px-5 py-4 text-left">Nhân viên</th>
                    <th className="employee-table-th employee-table-th--username px-5 py-4 text-left">Tên đăng nhập</th>
                    <th className="employee-table-th employee-table-th--role px-5 py-4 text-left">Vai trò</th>
                    <th className="employee-table-th employee-table-th--specialty px-5 py-4 text-left">Chuyên môn</th>
                    <th className="employee-table-th employee-table-th--phone px-5 py-4 text-left">Điện thoại</th>
                    <th className="employee-table-th employee-table-th--email px-5 py-4 text-left">Email</th>
                    <th className="employee-table-th employee-table-th--status px-5 py-4 text-center">Trạng thái</th>
                    <th className="employee-table-th employee-table-th--action px-5 py-4 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.map((employee) => {
                    const statusConfig = STATUS_MAP[employee.status] ?? STATUS_MAP.active;
                    const specialty = getEmployeeSpecialty(employee);
                    const roleSummary = getRoleSummary(employee.roleLabels);

                    return (
                      <tr key={employee.id} className="employee-table-row">
                        <td className="employee-table-td employee-table-td--person px-5 py-5 align-middle">
                          <div className="employee-person">
                            <div className="employee-person__avatar">
                              {employee.avatarUrl ? (
                                <img
                                  src={employee.avatarUrl}
                                  alt={employee.fullName}
                                  className="employee-person__avatar-image"
                                />
                              ) : (
                                getInitials(employee.fullName)
                              )}
                            </div>
                            <div>
                              <div className="employee-person__name">{employee.fullName}</div>
                              <div className="employee-person__hint">{employee.hierarchyTag}</div>
                            </div>
                          </div>
                        </td>
                        <td className="employee-table-td employee-table-td--username px-5 py-5 align-middle text-sm font-semibold text-slate-700">
                          {employee.userName || "Chưa cập nhật"}
                        </td>
                        <td className="employee-table-td employee-table-td--role px-5 py-5 align-middle text-sm text-slate-700">
                          <div className="employee-role-cell">
                            <div className="employee-role-cell__primary">{roleSummary.primary}</div>
                            {roleSummary.secondary ? (
                              <div className="employee-role-cell__secondary">{roleSummary.secondary}</div>
                            ) : null}
                          </div>
                        </td>
                        <td className="employee-table-td employee-table-td--specialty px-5 py-5 align-middle">
                          <span className={specialty.className}>{specialty.label}</span>
                        </td>
                        <td className="employee-table-td employee-table-td--phone px-5 py-5 align-middle text-sm text-slate-600">
                          {employee.phoneNumber || "Chưa cập nhật"}
                        </td>
                        <td className="employee-table-td employee-table-td--email px-5 py-5 align-middle text-sm text-slate-600">
                          {employee.email || "Chưa cập nhật"}
                        </td>
                        <td className="employee-table-td employee-table-td--status px-5 py-5 align-middle text-center">
                          <span className={statusConfig.className}>{statusConfig.label}</span>
                        </td>
                        <td className="employee-table-td employee-table-td--action px-5 py-5 align-middle text-center">
                          <Link to={`/employees/${employee.id}`} className="employee-action-btn">
                            Xem chi tiết
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
