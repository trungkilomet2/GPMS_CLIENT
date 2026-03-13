import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
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
import WorkerRoleService from "@/services/WorkerRoleService";
import "@/styles/worker-roles.css";

function SummaryCard({ icon: Icon, label, value, meta, tone }) {
  return (
    <div className={`worker-role-summary worker-role-summary--${tone}`}>
      <div className="worker-role-summary__header">
        <p className="worker-role-summary__label">{label}</p>
        <div className="worker-role-summary__icon">
          <Icon size={20} />
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

function getMemberSummary(members = []) {
  if (members.length === 0) return "Chưa có nhân sự được gán";
  if (members.length <= 2) return members.map((member) => member.fullName).join(", ");

  return `${members
    .slice(0, 2)
    .map((member) => member.fullName)
    .join(", ")} và ${members.length - 2} người khác`;
}

export default function WorkerRoleList() {
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
      } catch {
        if (!mounted) return;
        setError("Không tải được danh mục vai trò thợ.");
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
          <div className="worker-role-hero">
            <div>
              <h1 className="worker-role-hero__title">Danh sách vai trò thợ</h1>
              <p className="worker-role-hero__subtitle">
                Theo dõi các chuyên môn đang được gán cho nhân sự trong xưởng.
              </p>
            </div>

            <Link to="/worker-roles/create" className="worker-role-hero__action">
              <Plus size={18} />
              <span>Thêm vai trò thợ</span>
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard icon={Shapes} label="Tổng vai trò" value={stats.total} meta="Danh mục chuyên môn hiện có" tone="primary" />
            <SummaryCard icon={UsersRound} label="Đang sử dụng" value={stats.used} meta="Vai trò đã có nhân sự được gán" tone="success" />
            <SummaryCard icon={Sparkles} label="Chưa gán nhân sự" value={stats.unused} meta="Vai trò đang chờ được sử dụng" tone="accent" />
            <SummaryCard icon={Waypoints} label="Tổng lượt gán" value={stats.assignments} meta="Số quan hệ gán giữa nhân sự và chuyên môn" tone="warning" />
          </div>

          <div className="worker-role-filter-card">
            <div className="grid gap-3 lg:grid-cols-[1.2fr_220px]">
              <label className="worker-role-filter-field worker-role-filter-field--search">
                <span className="worker-role-filter-field__label">Tên vai trò thợ</span>
                <Search size={18} className="worker-role-filter-field__icon" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm theo tên vai trò hoặc nhãn hiển thị..."
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
                  <option value="all">Tất cả vai trò</option>
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
                  Dữ liệu bám theo cấu trúc vai trò thợ và quan hệ gán nhân sự hiện có.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="worker-role-table-state">
                  <LoaderCircle size={18} className="worker-role-table-state__spin" />
                  <span>Đang tải danh mục vai trò thợ...</span>
                </div>
              ) : error ? (
                <div className="worker-role-table-state worker-role-table-state--error">
                  <CircleAlert size={18} />
                  <span>{error}</span>
                </div>
              ) : filteredRoles.length === 0 ? (
                <div className="worker-role-table-state">
                  <Shapes size={18} />
                  <span>Không có vai trò thợ nào phù hợp với bộ lọc hiện tại.</span>
                </div>
              ) : (
                <table className="worker-role-table min-w-full">
                  <thead>
                    <tr>
                      <th>Mã vai trò</th>
                      <th>Tên trong hệ thống</th>
                      <th>Tên hiển thị</th>
                      <th>Số nhân sự</th>
                      <th>Nhân sự đang gán</th>
                      <th className="text-center">Tình trạng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRoles.map((role) => (
                      <tr key={role.id}>
                        <td className="font-semibold text-slate-800">WR-{String(role.id).padStart(3, "0")}</td>
                        <td>
                          <div className="worker-role-table__primary">{role.name}</div>
                        </td>
                        <td>{role.label}</td>
                        <td>{role.assignedCount}</td>
                        <td>{getMemberSummary(role.members)}</td>
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
