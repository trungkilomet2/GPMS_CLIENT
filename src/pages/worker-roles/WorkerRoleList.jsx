import { createElement, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CircleAlert,
  LoaderCircle,
  Plus,
  Search,
  Shapes,
  Sparkles,
  UsersRound,
  Waypoints,
} from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { getStoredUser } from "@/lib/authStorage";
import { getPrimaryWorkspaceRole } from "@/lib/internalRoleFlow";
import WorkerRoleService, { getWorkerRoleErrorMessage } from "@/services/WorkerRoleService";
import "@/styles/worker-roles.css";

function SummaryCard({ icon: Icon, label, value, meta, tone }) {
  return (
    <div className={`worker-role-summary worker-role-summary--${tone}`}>
      <div className="worker-role-summary__header">
        <p className="worker-role-summary__label">{label}</p>
        <div className="worker-role-summary__icon">
          {createElement(Icon, { size: 20 })}
        </div>
      </div>

      <div className="worker-role-summary__value">{value}</div>
      <p className="worker-role-summary__meta">{meta}</p>
    </div>
  );
}

function UsageBadge({ assignedCount }) {
  const active = assignedCount > 0;

  return (
    <span className={`worker-role-badge ${active ? "is-active" : "is-idle"}`}>
      {active ? "Đang sử dụng" : "Chưa gán"}
    </span>
  );
}

function getMemberTooltip(members = []) {
  if (members.length === 0) return "";
  return members.map((member) => member.fullName).join(", ");
}

export default function WorkerRoleList() {
  const user = getStoredUser();
  const primaryRole = getPrimaryWorkspaceRole(user?.role);
  const canCreateWorkerRole = primaryRole === "owner" || primaryRole === "pm";
  const [roles, setRoles] = useState([]);
  const [search, setSearch] = useState("");
  const [usageFilter, setUsageFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const fetchRoles = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await WorkerRoleService.getWorkerRoles();
        if (!mounted) return;

        setRoles(data);
      } catch (err) {
        if (!mounted) return;
        setError(getWorkerRoleErrorMessage(err, "Không tải được danh mục chuyên môn thợ."));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchRoles();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredRoles = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return roles.filter((role) => {
      const matchSearch =
        !keyword ||
        role.name.toLowerCase().includes(keyword) ||
        role.label.toLowerCase().includes(keyword);
      const matchUsage =
        usageFilter === "all" ||
        (usageFilter === "used" && role.assignedCount > 0) ||
        (usageFilter === "unused" && role.assignedCount === 0);

      return matchSearch && matchUsage;
    });
  }, [roles, search, usageFilter]);

  const stats = useMemo(() => {
    const total = roles.length;
    const used = roles.filter((role) => role.assignedCount > 0).length;
    const unused = roles.filter((role) => role.assignedCount === 0).length;
    const assignments = roles.reduce((sum, role) => sum + role.assignedCount, 0);

    return { total, used, unused, assignments };
  }, [roles]);

  return (
    <DashboardLayout>
      <div className="worker-role-page">
        <div className="worker-role-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <Link to="/employees" className="worker-role-back">
            <ArrowLeft size={18} />
            <span>Quay lại danh sách nhân viên</span>
          </Link>

          <div className="worker-role-hero">
            <div>
              <h1 className="worker-role-hero__title">Danh sách chuyên môn thợ</h1>
              <p className="worker-role-hero__subtitle">
                Chỉ hiển thị các chuyên môn nghề may dành cho nhân sự sản xuất, tách biệt với vai trò hệ thống như Chủ xưởng, Quản lý sản xuất và Nhân viên.
              </p>
            </div>

            {canCreateWorkerRole ? (
              <Link to="/worker-roles/create" className="worker-role-hero__action">
                <Plus size={18} />
                <span>Thêm chuyên môn thợ</span>
              </Link>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard icon={Shapes} label="Tổng chuyên môn" value={stats.total} meta="Danh mục chuyên môn hiện có" tone="primary" />
            <SummaryCard icon={UsersRound} label="Đang sử dụng" value={stats.used} meta="Chuyên môn đã có nhân sự được gán" tone="success" />
            <SummaryCard icon={Sparkles} label="Chưa gán nhân sự" value={stats.unused} meta="Vai trò đang chờ được sử dụng" tone="accent" />
            <SummaryCard icon={Waypoints} label="Tổng lượt gán" value={stats.assignments} meta="Số quan hệ gán giữa nhân sự và chuyên môn" tone="warning" />
          </div>

          <div className="worker-role-filter-card">
            <div className="grid gap-3 lg:grid-cols-[1.2fr_220px]">
              <label className="worker-role-filter-field worker-role-filter-field--search">
                <span className="worker-role-filter-field__label">Tên chuyên môn thợ</span>
                <Search size={18} className="worker-role-filter-field__icon" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm theo tên chuyên môn..."
                  className="worker-role-filter-field__control"
                />
              </label>

              <label className="worker-role-filter-field">
                <span className="worker-role-filter-field__label">Tình trạng sử dụng</span>
                <Shapes size={18} className="worker-role-filter-field__icon" />
                <select
                  value={usageFilter}
                  onChange={(event) => setUsageFilter(event.target.value)}
                  className="worker-role-filter-field__control"
                >
                  <option value="all">Tất cả</option>
                  <option value="used">Đang sử dụng</option>
                  <option value="unused">Chưa gán</option>
                </select>
              </label>
            </div>
          </div>

          <div className="worker-role-table-card">
            <div className="worker-role-table-card__header">
              <div>
                <h2 className="worker-role-table-card__title">Danh mục chuyên môn thợ</h2>
                <p className="worker-role-table-card__subtitle">
                  Dữ liệu chỉ lấy các chuyên môn nghề may hợp lệ và bỏ qua các vai trò điều hành của hệ thống.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="worker-role-table-state">
                  <LoaderCircle size={18} className="worker-role-table-state__spin" />
                  <span>Đang tải danh mục chuyên môn thợ...</span>
                </div>
              ) : error ? (
                <div className="worker-role-table-state worker-role-table-state--error">
                  <CircleAlert size={18} />
                  <span>{error}</span>
                </div>
              ) : filteredRoles.length === 0 ? (
                <div className="worker-role-table-state">
                  <Shapes size={18} />
                  <span>Không có chuyên môn thợ nào phù hợp với bộ lọc hiện tại.</span>
                </div>
              ) : (
                <table className="worker-role-table min-w-full">
                  <thead>
                    <tr>
                      <th>Tên chuyên môn</th>
                      <th>Số nhân sự</th>
                      <th>Nhân sự được gán</th>
                      <th className="text-center">Tình trạng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRoles.map((role) => (
                      <tr key={role.id}>
                        <td>
                          <div className="worker-role-table__primary">{role.label || role.name}</div>
                          {role.label && role.name && role.label !== role.name ? (
                            <div className="worker-role-table__secondary">{role.name}</div>
                          ) : null}
                        </td>
                        <td>{role.assignedCount}</td>
                        <td title={getMemberTooltip(role.members)}>
                          {role.members.length === 0 ? (
                            <span className="text-sm text-slate-500">Chưa có nhân sự được gán</span>
                          ) : (
                            <div className="flex max-w-[24rem] flex-wrap gap-2">
                              {role.members.slice(0, 2).map((member) => (
                                <span
                                  key={`${role.id}-${member.id ?? member.fullName}`}
                                  className="inline-flex max-w-full items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                                >
                                  <span className="truncate">{member.fullName}</span>
                                </span>
                              ))}
                              {role.members.length > 2 ? (
                                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                  +{role.members.length - 2} khác
                                </span>
                              ) : null}
                            </div>
                          )}
                        </td>
                        <td className="text-center">
                          <UsageBadge assignedCount={role.assignedCount} />
                        </td>
                      </tr>
                    ))}
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
