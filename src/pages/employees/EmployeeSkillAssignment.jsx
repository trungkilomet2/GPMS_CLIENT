import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, CircleAlert, LoaderCircle, Sparkles, UserRoundCog } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { SYSTEM_ROLE_IDS, getSystemRoleLabel } from "@/lib/orgHierarchy";
import WorkerRoleService, { getWorkerRoleErrorMessage } from "@/services/WorkerRoleService";
import WorkerService, { getEmployeeModuleErrorMessage } from "@/services/WorkerService";
import "@/styles/employee-create.css";

function normalizeSkillName(value = "") {
  return String(value ?? "").trim().toLowerCase();
}

export default function EmployeeSkillAssignment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
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
        const [employeeResponse, workerRoles] = await Promise.all([
          WorkerService.getEmployeeById(id),
          WorkerRoleService.getWorkerRoles(),
        ]);

        if (!mounted) return;
        if (!employeeResponse) {
          setError("Không tìm thấy nhân viên phù hợp.");
          return;
        }

        setEmployee(employeeResponse);
        setSkillOptions(workerRoles ?? []);

        const employeeSkillNames = Array.isArray(employeeResponse.workerSkillNames)
          ? employeeResponse.workerSkillNames.map(normalizeSkillName)
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
  }, [id]);

  const isWorker = employee?.roles?.includes("Worker");

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
    if (!isWorker) {
      setSubmitError("Chỉ có thể gán worker skill cho nhân viên có vai trò Worker.");
      return;
    }
    if (selectedIds.length === 0) {
      setSubmitError("Vui lòng chọn ít nhất 1 skill cho worker.");
      return;
    }

    setSaving(true);
    setSubmitError("");

    try {
      await WorkerService.updateEmployee(id, {
        fullName: employee.fullName,
        statusId: Number(employee.statusId) || 1,
        managerId: employee.managerId,
        roleIds: [SYSTEM_ROLE_IDS.Worker],
        workerRoleIds: selectedIds.map(Number),
      });

      navigate(`/employees/${id}`, {
        state: { skillsUpdated: true },
      });
    } catch (err) {
      setSubmitError(
        getEmployeeModuleErrorMessage(
          err,
          "Không thể cập nhật worker skill. Vui lòng thử lại."
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
              <h1 className="employee-create-hero__title">Gán skill cho worker</h1>
              <p className="employee-create-hero__subtitle">
                Mỗi worker có thể có nhiều skill. Chọn theo dạng tick để gán nhanh chuyên môn thao tác cho nhân viên.
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
                disabled={saving || loading || !isWorker}
              >
                {saving ? <LoaderCircle size={18} className="employee-create-btn__spin" /> : null}
                <span>{saving ? "Đang lưu..." : "Lưu skill"}</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="employee-create-card">
              <div className="employee-create-banner">
                <LoaderCircle size={18} className="employee-create-btn__spin" />
                <span>Đang tải hồ sơ worker và danh mục skill...</span>
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
                  <h2 className="employee-create-card__title">Thông tin gán skill</h2>
                  <p className="employee-create-card__subtitle">
                    Tick những kỹ năng worker có thể đảm nhiệm. Màn này được tách riêng để quản lý nhiều skill dễ hơn.
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
                        @{employee?.userName || "chua-cap-nhat"} • {getSystemRoleLabel(employee?.primarySystemRole || "") || "Chưa cập nhật"}
                      </div>
                    </div>
                  </div>

                  <div className="employee-skill-assignment__stats">
                    <div className="employee-skill-assignment__stat">
                      <strong>{selectedIds.length}</strong>
                      <span>skill đã chọn</span>
                    </div>
                    <div className="employee-skill-assignment__stat">
                      <strong>{skillOptions.length}</strong>
                      <span>skill khả dụng</span>
                    </div>
                  </div>
                </div>

                {location.state?.fromCreate ? (
                  <div className="employee-create-banner">
                    <span>Tài khoản worker đã tạo xong. Bây giờ bạn chỉ cần tick các skill phù hợp rồi lưu.</span>
                  </div>
                ) : null}

                {!isWorker ? (
                  <div className="employee-create-banner employee-create-banner--error">
                    <CircleAlert size={18} />
                    <span>Nhân viên này hiện không mang vai trò Worker nên không thể gán worker skill.</span>
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
                    Thêm skill mới
                  </Link>
                </div>

                <div className="employee-skill-assignment__table-wrap">
                  <table className="employee-skill-assignment__table">
                    <thead>
                      <tr>
                        <th>Kỹ năng</th>
                        <th>Mô tả</th>
                        <th className="employee-skill-assignment__tick-head">
                          <span className="employee-skill-assignment__tick-badge">
                            <Sparkles size={16} />
                            <span>Gán</span>
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {skillOptions.length === 0 ? (
                        <tr>
                          <td colSpan={3}>
                            <div className="employee-skill-assignment__empty">Chưa có worker skill nào trong danh mục.</div>
                          </td>
                        </tr>
                      ) : (
                        skillOptions.map((skill) => {
                          const checked = selectedIds.includes(skill.id);

                          return (
                            <tr key={skill.id} className={checked ? "is-selected" : ""}>
                              <td>
                                <div className="employee-skill-assignment__skill-name">{skill.label || skill.name}</div>
                                <div className="employee-skill-assignment__skill-code">WR-{String(skill.id).padStart(3, "0")}</div>
                              </td>
                              <td>
                                <div className="employee-skill-assignment__skill-desc">
                                  {skill.assignedCount > 0
                                    ? `${skill.assignedCount} nhân sự đang dùng skill này`
                                    : "Chưa có nhân sự nào được gán skill này"}
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
