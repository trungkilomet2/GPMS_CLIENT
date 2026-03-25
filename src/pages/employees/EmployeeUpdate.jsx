import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CircleAlert,
  LoaderCircle,
  ShieldCheck,
  UserRound,
  UserRoundCog,
} from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import {
  EMPLOYEE_FORM_ROLE_OPTIONS,
  SYSTEM_ROLE_IDS,
  USER_STATUS_IDS,
  getAllowedManagerRoles,
  getManagerRoleHint,
  getSystemRoleLabel,
  isManagerRequired,
  pickPrimarySystemRole,
} from "@/lib/orgHierarchy";
import { normalizeSpaces, validateFullName } from "@/lib/validators";
import WorkerService, { getEmployeeModuleErrorMessage } from "@/services/WorkerService";
import "@/styles/employee-create.css";

function isEmployeeUpdateApplied(employee, expected) {
  if (!employee) return false;

  const actualRole = pickPrimarySystemRole(employee.role);
  const actualManagerId =
    employee.managerId == null || employee.managerId === "" ? null : Number(employee.managerId);
  const expectedManagerId =
    expected.managerId == null || expected.managerId === "" ? null : Number(expected.managerId);
  const actualStatusId =
    employee.statusId == null || employee.statusId === "" ? null : Number(employee.statusId);
  const expectedStatusId =
    expected.statusId == null || expected.statusId === "" ? null : Number(expected.statusId);

  return (
    normalizeSpaces(employee.fullName || "") === normalizeSpaces(expected.fullName || "") &&
    actualRole === expected.role &&
    actualManagerId === expectedManagerId &&
    actualStatusId === expectedStatusId
  );
}

export default function EmployeeUpdate() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [managerOptions, setManagerOptions] = useState([]);
  const [managerLoading, setManagerLoading] = useState(true);
  const [managerError, setManagerError] = useState("");
  const [form, setForm] = useState({
    userName: "",
    fullName: "",
    role: "PM",
    managerId: "",
    statusId: USER_STATUS_IDS.Active,
  });

  useEffect(() => {
    let mounted = true;

    const fetchEmployee = async () => {
      setLoading(true);
      setManagerLoading(true);
      setError("");
      setManagerError("");

      try {
        const [employeeDetail, managerResponse] = await Promise.all([
          WorkerService.getEmployeeById(id),
          WorkerService.getAllEmployees(),
        ]);

        if (!mounted) return;

        const directoryEmployees = managerResponse?.data ?? [];
        const employeeFromDirectory = directoryEmployees.find(
          (item) => String(item.id) === String(id)
        ) ?? null;
        const employee = employeeFromDirectory
          ? {
              ...employeeDetail,
              ...employeeFromDirectory,
              role: employeeFromDirectory.role || employeeDetail?.role,
              managerId: employeeFromDirectory.managerId ?? employeeDetail?.managerId ?? null,
              statusId: employeeFromDirectory.statusId ?? employeeDetail?.statusId ?? USER_STATUS_IDS.Active,
            }
          : employeeDetail;

        const managers = directoryEmployees.filter(
          (item) => String(item.id) !== String(id)
        );
        setManagerOptions(managers);

        if (!employee) {
          setError("Không tìm thấy nhân viên phù hợp.");
          return;
        }

        setForm({
          userName: employee.userName || "",
          fullName: employee.fullName || "",
          role: pickPrimarySystemRole(employee.role) || "PM",
          managerId: employee.managerId != null ? String(employee.managerId) : "",
          statusId: employee.statusId ?? USER_STATUS_IDS.Active,
        });
      } catch (err) {
        if (!mounted) return;
        const message = getEmployeeModuleErrorMessage(
          err,
          "Không tải được thông tin nhân viên. Vui lòng thử lại."
        );
        setError(message);
        setManagerError(message);
      } finally {
        if (mounted) {
          setLoading(false);
          setManagerLoading(false);
        }
      }
    };

    fetchEmployee();

    return () => {
      mounted = false;
    };
  }, [id]);

  const allowedManagerRoles = useMemo(
    () => getAllowedManagerRoles(form.role),
    [form.role]
  );

  const availableManagers = useMemo(
    () =>
      managerOptions.filter((employee) =>
        employee.roles.some((role) => allowedManagerRoles.includes(role))
      ),
    [allowedManagerRoles, managerOptions]
  );

  useEffect(() => {
    if (!form.managerId) return;

    const isValidSelection = availableManagers.some(
      (manager) => String(manager.id) === String(form.managerId)
    );

    if (!isValidSelection) {
      setForm((prev) => ({
        ...prev,
        managerId: "",
      }));
    }
  }, [availableManagers, form.managerId]);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
    setFieldErrors((prev) => ({
      ...prev,
      [field]: "",
    }));
    setSubmitError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const normalizedFullName = normalizeSpaces(form.fullName);
    const nextErrors = {
      fullName: validateFullName(normalizedFullName),
      role: SYSTEM_ROLE_IDS[form.role] ? "" : "Vai trò không hợp lệ",
      managerId:
        isManagerRequired(form.role) && !String(form.managerId ?? "").trim()
          ? "Vui lòng chọn quản lý trực tiếp"
          : "",
    };

    setFieldErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      setSubmitError("Vui lòng kiểm tra lại thông tin trước khi lưu nhân viên.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const parsedManagerId = Number(form.managerId);
      const selectedManager = managerOptions.find(
        (manager) => String(manager.id) === String(form.managerId)
      ) ?? null;
      const desiredPayload = {
        fullName: normalizedFullName,
        managerId:
          form.role === "Owner" || !Number.isFinite(parsedManagerId) || parsedManagerId <= 0
            ? null
            : parsedManagerId,
        roleIds: [SYSTEM_ROLE_IDS[form.role]],
        statusId: Number(form.statusId) || USER_STATUS_IDS.Active,
      };

      await WorkerService.updateEmployee(id, desiredPayload);

      let refreshedEmployee = null;
      try {
        const refreshedDirectory = await WorkerService.getAllEmployees();
        refreshedEmployee = (refreshedDirectory?.data ?? []).find(
          (employee) => String(employee.id) === String(id)
        ) ?? null;
      } catch {
        refreshedEmployee = await WorkerService.getEmployeeById(id);
      }

      if (!isEmployeeUpdateApplied(refreshedEmployee, {
        fullName: desiredPayload.fullName,
        role: form.role,
        managerId: desiredPayload.managerId,
        statusId: desiredPayload.statusId,
      })) {
        navigate(`/employees/${id}`, {
          state: {
            updatedEmployeeSnapshot: {
              ...(refreshedEmployee ?? {}),
              id: Number(id),
              userName: form.userName,
              fullName: normalizedFullName,
              role: form.role,
              roles: [form.role],
              roleLabels: [getSystemRoleLabel(form.role)],
              primarySystemRole: form.role,
              primarySystemRoleLabel: getSystemRoleLabel(form.role),
              managerId: desiredPayload.managerId,
              managerName: selectedManager?.fullName || refreshedEmployee?.managerName || "",
              statusId: desiredPayload.statusId,
              status: desiredPayload.statusId === USER_STATUS_IDS.Inactive ? "inactive" : "active",
            },
          },
        });
        return;
      }

      navigate(`/employees/${id}`, {
        state: {
          updatedEmployeeSnapshot: refreshedEmployee,
        },
      });
    } catch (err) {
      setSubmitError(
        getEmployeeModuleErrorMessage(
          err,
          "Không thể cập nhật nhân viên. Vui lòng thử lại."
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="employee-create-page">
        <div className="employee-create-shell mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="employee-create-hero">
            <div className="employee-create-hero__heading">
              <Link to={`/employees/${id}`} className="employee-create-hero__back">
                <ArrowLeft size={20} />
                <span>Quay lại chi tiết</span>
              </Link>
              <h1 className="employee-create-hero__title">Cập nhật thông tin nhân viên</h1>
              <p className="employee-create-hero__subtitle">
                Cập nhật hồ sơ nhân sự và gán lại đúng quản lý trực tiếp theo hierarchy Owner / PM / Team Lead / Worker.
              </p>
            </div>

            <div className="employee-create-hero__actions">
              <button type="button" className="employee-create-btn employee-create-btn--ghost" onClick={() => navigate(`/employees/${id}`)}>
                Hủy
              </button>
              <button
                type="submit"
                form="employee-update-form"
                className="employee-create-btn employee-create-btn--primary"
                disabled={isSubmitting || loading}
              >
                {isSubmitting ? <LoaderCircle size={18} className="employee-create-btn__spin" /> : null}
                <span>{isSubmitting ? "Đang lưu..." : "Lưu nhân viên"}</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="employee-create-card">
              <div className="employee-create-banner">
                <LoaderCircle size={18} className="employee-create-btn__spin" />
                <span>Đang tải dữ liệu nhân viên...</span>
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
            <form id="employee-update-form" className="employee-create-single" onSubmit={handleSubmit}>
              <section className="employee-create-card">
                <div className="employee-create-card__header">
                  <div>
                    <h2 className="employee-create-card__title">Thông tin tài khoản nhân viên</h2>
                  </div>
                </div>

                <div className="employee-create-form-grid employee-create-form-grid--single">
                  <label className="employee-create-field">
                    <span className="employee-create-field__label">Tên đăng nhập</span>
                    <UserRound size={18} className="employee-create-field__icon" />
                    <input value={form.userName} disabled className="employee-create-field__control" />
                  </label>

                  <label className="employee-create-field employee-create-field--full">
                    <span className="employee-create-field__label">Họ và tên</span>
                    <UserRoundCog size={18} className="employee-create-field__icon" />
                    <input value={form.fullName} onChange={handleChange("fullName")} placeholder="Nhập họ và tên" className="employee-create-field__control" />
                    {fieldErrors.fullName ? <span className="employee-create-field__error">{fieldErrors.fullName}</span> : null}
                  </label>

                  <label className="employee-create-field">
                    <span className="employee-create-field__label">Vai trò hệ thống</span>
                    <ShieldCheck size={18} className="employee-create-field__icon" />
                    <select value={form.role} onChange={handleChange("role")} className="employee-create-field__control">
                      {EMPLOYEE_FORM_ROLE_OPTIONS.map((roleOption) => (
                        <option key={roleOption.value} value={roleOption.value}>
                          {roleOption.label}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.role ? <span className="employee-create-field__error">{fieldErrors.role}</span> : null}
                  </label>

                  <label className="employee-create-field">
                    <span className="employee-create-field__label">Quản lý trực tiếp</span>
                    <BriefcaseBusiness size={18} className="employee-create-field__icon" />
                    <select
                      value={form.managerId}
                      onChange={handleChange("managerId")}
                      className="employee-create-field__control"
                      disabled={form.role === "Owner" || managerLoading}
                    >
                      <option value="">
                        {form.role === "Owner"
                          ? "Owner không có quản lý trực tiếp"
                          : managerLoading
                            ? "Đang tải danh sách quản lý..."
                            : availableManagers.length
                              ? "Chọn quản lý trực tiếp"
                              : "Chưa có quản lý phù hợp"}
                      </option>
                      {availableManagers.map((manager) => (
                        <option key={manager.id} value={manager.id}>
                          {manager.fullName} - {getSystemRoleLabel(manager.primarySystemRole || manager.roles[0] || "")}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.managerId ? <span className="employee-create-field__error">{fieldErrors.managerId}</span> : null}
                  </label>
                </div>

                <div className="employee-create-banner">
                  <span>{getManagerRoleHint(form.role)}</span>
                </div>

                {managerError ? (
                  <div className="employee-create-banner employee-create-banner--error">
                    <CircleAlert size={18} />
                    <span>{managerError}</span>
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
