import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
import WorkerService from "@/services/WorkerService";
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

function getEmployeeTone(employee) {
  if (employee.workerRole) {
    return {
      label: employee.workerRoleLabel,
      className: "employee-status employee-status--new",
    };
  }

  return {
    label: employee.primaryRoleLabel,
    className: "employee-status employee-status--new",
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
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

        const message =
          err?.response?.data?.message ||
          "Không tải được danh sách nhân viên. Vui lòng thử lại.";
        setError(message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchEmployees();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredEmployees = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return employees.filter((employee) => {
      const matchSearch =
        !keyword ||
        employee.fullName.toLowerCase().includes(keyword) ||
        employee.userName.toLowerCase().includes(keyword);
      const matchRole =
        roleFilter === "all" ||
        employee.primaryRole === roleFilter ||
        employee.workerRole === roleFilter;
      const matchStatus = statusFilter === "all" || employee.status === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [employees, roleFilter, search, statusFilter]);

  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter((employee) => employee.status === "active").length;
    const management = employees.filter((employee) =>
      employee.roles.some((role) => ROLE_GROUPS.management.includes(role))
    ).length;
    const skilled = employees.filter((employee) => Boolean(employee.workerRole)).length;
    const inactive = employees.filter((employee) => employee.status === "inactive").length;

    return { total, active, management, skilled, inactive };
  }, [employees]);

  const roleOptions = useMemo(
    () => ["all", ...new Set(employees.map((employee) => employee.primaryRole).filter(Boolean))],
    [employees]
  );

  return (
    <DashboardLayout>
      <div className="employee-page">
        <div className="employee-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="employee-hero">
            <div>
              <h1 className="employee-hero__title">Danh sách nhân viên</h1>
              <p className="employee-hero__subtitle">
                Theo dõi thông tin nhân sự nội bộ trong hệ thống.
              </p>
            </div>

            <Link to="/employees/create" className="employee-hero__action">
              <Plus size={18} />
              <span>Thêm nhân viên</span>
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard icon={Users} label="Tổng nhân viên" value={stats.total} meta="Toàn bộ nhân sự nội bộ" tone="primary" />
            <SummaryCard icon={UserRoundCheck} label="Đang hoạt động" value={stats.active} meta="Nhân viên đang làm việc" tone="success" />
            <SummaryCard icon={BriefcaseBusiness} label="Nhóm quản lý" value={stats.management} meta="Chủ xưởng, quản lý và tổ trưởng" tone="warning" />
            <SummaryCard icon={Sparkles} label="Có chuyên môn" value={stats.skilled} meta={`${stats.inactive} nhân viên ngừng hoạt động`} tone="accent" />
          </div>

          <div className="employee-filter-card">
            <div className="grid gap-3 lg:grid-cols-[1.4fr_220px_220px_auto]">
              <label className="employee-filter-field employee-filter-field--search">
                <span className="employee-filter-field__label">Tên nhân viên</span>
                <Search size={18} className="employee-filter-field__icon" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm theo họ tên hoặc tên đăng nhập..."
                  className="employee-filter-field__control"
                />
              </label>

              <label className="employee-filter-field">
                <span className="employee-filter-field__label">Vai trò</span>
                <BriefcaseBusiness size={17} className="employee-filter-field__icon" />
                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                  className="employee-filter-field__control"
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role === "all"
                        ? "Tất cả vai trò"
                        : employees.find((employee) => employee.primaryRole === role)?.primaryRoleLabel || role}
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

              <div className="employee-filter-info">
                <Users size={16} />
                <span>{filteredEmployees.length} kết quả</span>
              </div>
            </div>
          </div>

          <div className="employee-table-card">
            <div className="employee-table-card__header">
              <div>
                <h2 className="employee-table-card__title">Nhân sự trong xưởng</h2>
                <p className="employee-table-card__subtitle">Danh sách nhân viên và thông tin liên hệ hiện có trong hệ thống.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="employee-table-state">
                  <LoaderCircle size={18} className="employee-table-state__spin" />
                  <span>Đang tải danh sách nhân viên...</span>
                </div>
              ) : error ? (
                <div className="employee-table-state employee-table-state--error">
                  <CircleAlert size={18} />
                  <span>{error}</span>
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="employee-table-state">
                  <Users size={18} />
                  <span>Không có nhân viên nào phù hợp với bộ lọc hiện tại.</span>
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
                    const roleTone = getEmployeeTone(employee);
                    const roleSummary = getRoleSummary(employee.roleLabels);

                    return (
                      <tr key={employee.id} className="employee-table-row">
                        <td className="employee-table-td employee-table-td--person px-5 py-5 align-middle">
                          <div className="employee-person">
                            <div className="employee-person__avatar">{getInitials(employee.fullName)}</div>
                            <div>
                              <div className="employee-person__name">{employee.fullName}</div>
                              <div className="employee-person__hint">Nhân viên hệ thống</div>
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
                          <span className={roleTone.className}>{roleTone.label}</span>
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
