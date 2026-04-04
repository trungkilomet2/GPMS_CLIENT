import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, CircleAlert, LoaderCircle, Sparkles, UserRoundCog } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { getStoredUser } from "@/lib/authStorage";
import { getPrimaryWorkspaceRole } from "@/lib/internalRoleFlow";
import { canAssignSpecialties, getSystemRoleLabel } from "@/lib/orgHierarchy";
import WorkerRoleService, { getWorkerRoleErrorMessage } from "@/services/WorkerRoleService";
import WorkerService, { getEmployeeModuleErrorMessage } from "@/services/WorkerService";
import "@/styles/employee-create.css";

function normalizeSkillName(value = "") {
  return String(value ?? "").trim().toLowerCase();
}

function getSkillUsageText(assignedCount = 0) {
  const count = Number(assignedCount) || 0;

  if (count <= 0) {
    return "Chưa có nhân sự nào đang sử dụng chuyên môn này";
  }

  if (count === 1) {
    return "Đang có 1 nhân sự sử dụng chuyên môn này";
  }

  return `Đang có ${count} nhân sự sử dụng chuyên môn này`;
}

function pickPreferredItems(primary = [], fallback = []) {
  const primaryItems = Array.isArray(primary) ? primary : [];
  const fallbackItems = Array.isArray(fallback) ? fallback : [];

  if (!primaryItems.length) return fallbackItems;
  if (!fallbackItems.length) return primaryItems;
  return primaryItems.length >= fallbackItems.length ? primaryItems : fallbackItems;
}

export default function EmployeeSkillAssignment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = getStoredUser();
  const currentPrimaryRole = getPrimaryWorkspaceRole(currentUser?.role);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employee, setEmployee] = useState(null);
  const [skillOptions, setSkillOptions] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      setLoading(true);
      setError("");
      setSubmitError("");

      try {
        const [employeeResponse, directoryResponse, workerRoles] = await Promise.all([
          WorkerService.getEmployeeById(id),
          currentPrimaryRole === "pm"
            ? WorkerService.getEmployeeDirectoryByPmScope({ pageSize: 100 }).catch(() => ({ data: [] }))
            : WorkerService.getEmployeeDirectory({ pageSize: 100 }).catch(() => ({ data: [] })),
          WorkerRoleService.getWorkerRoles(),
        ]);

        if (!mounted) return;
        const directoryEmployee = (directoryResponse?.data ?? []).find(
          (item) => String(item.id) === String(id)
        );
        const resolvedEmployee =
          employeeResponse || directoryEmployee
              ? {
                  ...(directoryEmployee ?? {}),
                  ...(employeeResponse ?? {}),
                workerSkillNames: pickPreferredItems(
                    employeeResponse?.workerSkillNames,
                    directoryEmployee?.workerSkillNames
                  ),
                workerSkillLabels: pickPreferredItems(
                    employeeResponse?.workerSkillLabels,
                    directoryEmployee?.workerSkillLabels
                  ),
                }
            : null;

        if (!resolvedEmployee) {
          setError("Không tìm thấy nhân viên phù hợp.");
          return;
        }

        setEmployee(resolvedEmployee);
        setSkillOptions(workerRoles ?? []);

        const employeeSkillNames = Array.isArray(resolvedEmployee.workerSkillNames)
          ? resolvedEmployee.workerSkillNames.map(normalizeSkillName)
          : [];
        setSelectedIds(
          (workerRoles ?? [])
            .filter((role) => employeeSkillNames.includes(normalizeSkillName(role.name)))
            .map((role) => role.id)
        );
      } catch (err) {
        if (!mounted) return;
        setError(
          getEmployeeModuleErrorMessage(
            err,
            getWorkerRoleErrorMessage(err, "Không tải được dữ liệu gán skill cho nhân viên.")
          )
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [currentPrimaryRole, id]);

  const canAssignEmployeeSpecialties = canAssignSpecialties(employee?.roles ?? employee?.role ?? "");

  const selectedSkills = useMemo(
    () => skillOptions.filter((skill) => selectedIds.includes(skill.id)),
    [selectedIds, skillOptions]
  );

  const toggleSkill = (skillId) => {
    setSelectedIds((current) =>
      current.includes(skillId)
        ? current.filter((idItem) => idItem !== skillId)
        : [...current, skillId]
    );
    setSubmitError("");
  };

  const handleSelectAll = () => {
    if (selectedIds.length === skillOptions.length) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(skillOptions.map((skill) => skill.id));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!employee) return;
    if (!canAssignEmployeeSpecialties) {
      setSubmitError("Chỉ có thể gán chuyên môn cho tài khoản có vai trò Quản lý sản xuất hoặc Nhân viên.");
      return;
    }
    setSaving(true);
    setSubmitError("");

    try {
      await WorkerService.assignWorkerSkill(id, selectedIds);
      const updatedWorkerSkillNames = selectedSkills.map((skill) => skill.name);
      const updatedWorkerSkillLabels = selectedSkills.map((skill) => skill.label || skill.name);

      if (location.state?.fromCreate) {
        navigate("/employees/workers", {
          state: {
            notice: `Đã tạo nhân viên ${employee?.fullName || employee?.userName || ""} và cập nhật chuyên môn thành công.`,
            noticeTone: "success",
          },
        });
        return;
      }

      navigate(`/employees/${id}`, {
        state: {
          skillsUpdated: true,
          updatedWorkerSkillNames,
          updatedWorkerSkillLabels,
        },
      });
    } catch (err) {
      setSubmitError(
        getEmployeeModuleErrorMessage(
          err,
          "Không thể cập nhật chuyên môn. Vui lòng thử lại."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="employee-create-page">
        <div className="employee-create-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="employee-create-hero">
            <div className="employee-create-hero__heading">
              <Link to={`/employees/${id}`} className="employee-create-hero__back">
                <ArrowLeft size={20} />
                <span>Quay lại hồ sơ nhân viên</span>
              </Link>
              <h1 className="employee-create-hero__title">Gán chuyên môn cho nhân viên</h1>
              <p className="employee-create-hero__subtitle">
                Mỗi nhân viên có thể có nhiều chuyên môn. Chọn theo dạng đánh dấu để gán nhanh chuyên môn thao tác.
              </p>
            </div>

            <div className="employee-create-hero__actions">
              <button type="button" className="employee-create-btn employee-create-btn--ghost" onClick={() => navigate(`/employees/${id}`)}>
                Hủy
              </button>
              <button
                type="submit"
                form="employee-skill-form"
                className="employee-create-btn employee-create-btn--primary"
                disabled={saving || loading || !canAssignEmployeeSpecialties}
              >
                {saving ? <LoaderCircle size={18} className="employee-create-btn__spin" /> : null}
                <span>{saving ? "Đang lưu..." : "Lưu chuyên môn"}</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="employee-create-card">
              <div className="employee-create-banner">
                <LoaderCircle size={18} className="employee-create-btn__spin" />
                <span>Đang tải hồ sơ nhân viên và danh mục chuyên môn...</span>
              </div>
            </div>
          ) : error ? (
            <div className="employee-create-card">
              <div className="employee-create-banner employee-create-banner--error">
                <CircleAlert size={18} />
                <span>{error}</span>
              </div>
            </div>
          ) : (
            <form id="employee-skill-form" onSubmit={handleSubmit} className="employee-create-single">
              <section className="employee-create-card">
                <div className="employee-create-card__header">
                  <h2 className="employee-create-card__title">Thông tin gán chuyên môn</h2>
                  <p className="employee-create-card__subtitle">
                    Đánh dấu những chuyên môn nhân viên có thể đảm nhiệm. Có thể bỏ chọn toàn bộ nếu cần xóa hết chuyên môn hiện có.
                  </p>
                </div>

                <div className="employee-skill-assignment__summary">
                  <div className="employee-skill-assignment__worker">
                    <div className="employee-skill-assignment__worker-icon">
                      <UserRoundCog size={22} />
                    </div>
                    <div>
                      <div className="employee-skill-assignment__worker-name">{employee?.fullName || "Chưa cập nhật"}</div>
                      <div className="employee-skill-assignment__worker-meta">
                        {employee?.userName ? `@${employee.userName}` : "Chưa có tên đăng nhập"} • {getSystemRoleLabel(employee?.primarySystemRole || "") || "Chưa cập nhật"}
                      </div>
                    </div>
                  </div>

                  <div className="employee-skill-assignment__stats">
                    <div className="employee-skill-assignment__stat">
                      <strong>{selectedIds.length}</strong>
                      <span>chuyên môn đã chọn</span>
                    </div>
                    <div className="employee-skill-assignment__stat">
                      <strong>{skillOptions.length}</strong>
                      <span>chuyên môn khả dụng</span>
                    </div>
                  </div>
                </div>

                {location.state?.fromCreate ? (
                  <div className="employee-create-banner">
                    <span>
                      {location.state?.notice ||
                        "Tài khoản nhân viên đã tạo xong. Bây giờ bạn chỉ cần chọn các chuyên môn phù hợp rồi lưu."}
                    </span>
                  </div>
                ) : null}

                {!canAssignEmployeeSpecialties ? (
                  <div className="employee-create-banner employee-create-banner--error">
                    <CircleAlert size={18} />
                    <span>Tài khoản này hiện không mang vai trò Quản lý sản xuất hoặc Nhân viên nên không thể gán chuyên môn.</span>
                  </div>
                ) : null}

                <div className="employee-skill-assignment__toolbar">
                  <button
                    type="button"
                    className="employee-create-btn employee-create-btn--ghost employee-create-btn--compact"
                    onClick={handleSelectAll}
                    disabled={!skillOptions.length}
                  >
                    {selectedIds.length === skillOptions.length && skillOptions.length > 0 ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                  </button>

                  <Link to="/worker-roles/create" className="employee-create-inline-link">
                    Thêm chuyên môn mới
                  </Link>
                </div>

                <div className="employee-skill-assignment__table-wrap">
                  <table className="employee-skill-assignment__table">
                    <thead>
                      <tr>
                        <th>Chuyên môn</th>
                        <th>Tình trạng sử dụng</th>
                        <th className="employee-skill-assignment__tick-head">
                          <span className="employee-skill-assignment__tick-badge">
                            <Sparkles size={16} />
                            <span>Chọn</span>
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {skillOptions.length === 0 ? (
                        <tr>
                          <td colSpan={3}>
                            <div className="employee-skill-assignment__empty">Chưa có chuyên môn nào trong danh mục.</div>
                          </td>
                        </tr>
                      ) : (
                        skillOptions.map((skill) => {
                          const checked = selectedIds.includes(skill.id);

                          return (
                            <tr key={skill.id} className={checked ? "is-selected" : ""}>
                              <td>
                                <div className="employee-skill-assignment__skill-name">{skill.label || skill.name}</div>
                              </td>
                              <td>
                                <div className="employee-skill-assignment__skill-desc">
                                  {getSkillUsageText(skill.assignedCount)}
                                </div>
                              </td>
                              <td className="employee-skill-assignment__tick-cell">
                                <label className={`employee-skill-assignment__tick ${checked ? "is-selected" : ""}`}>
                                  <input type="checkbox" checked={checked} onChange={() => toggleSkill(skill.id)} />
                                  <span>{checked ? <Check size={15} /> : null}</span>
                                </label>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {selectedSkills.length ? (
                  <div className="employee-skill-assignment__selected-list">
                    {selectedSkills.map((skill) => (
                      <span key={skill.id} className="employee-skill-assignment__chip">
                        {skill.label || skill.name}
                      </span>
                    ))}
                  </div>
                ) : null}

                {submitError ? (
                  <div className="employee-create-banner employee-create-banner--error">
                    <CircleAlert size={18} />
                    <span>{submitError}</span>
                  </div>
                ) : null}
              </section>
            </form>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
