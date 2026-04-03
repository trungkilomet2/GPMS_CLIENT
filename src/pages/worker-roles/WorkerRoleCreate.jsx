import { useEffect, useState } from "react";
import { ArrowLeft, LoaderCircle, PencilLine, Shapes } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import WorkerRoleService, { getWorkerRoleErrorMessage } from "@/services/WorkerRoleService";
import "@/styles/worker-roles.css";

export default function WorkerRoleCreate() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [existingRoles, setExistingRoles] = useState([]);

  useEffect(() => {
    let mounted = true;

    const fetchRoles = async () => {
      try {
        const roles = await WorkerRoleService.getWorkerRoles();
        if (mounted) {
          setExistingRoles(roles.slice(0, 6));
        }
      } catch {
        if (mounted) {
          setExistingRoles([]);
        }
      }
    };

    fetchRoles();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      setSubmitting(true);
      await WorkerRoleService.createWorkerRole({ name });
      navigate("/worker-roles");
    } catch (err) {
      setError(getWorkerRoleErrorMessage(err, "Không thể tạo chuyên môn thợ mới."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="worker-role-page">
        <div className="worker-role-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="worker-role-hero worker-role-hero--create">
            <div>
              <Link to="/worker-roles" className="worker-role-back">
                <ArrowLeft size={18} />
                <span>Quay lại danh sách</span>
              </Link>
              <h1 className="worker-role-hero__title">Thêm chuyên môn thợ</h1>
              <p className="worker-role-hero__subtitle">
                Tạo mới chuyên môn nghề may cho nhân sự sản xuất, không dùng để tạo vai trò điều hành trong hệ thống.
              </p>
            </div>
          </div>

          <div className="worker-role-create-grid">
            <form onSubmit={handleSubmit} className="worker-role-create-card">
              <div className="worker-role-create-card__header">
                <h2>Thông tin chuyên môn</h2>
                <p>Biểu mẫu này chỉ nhận chuyên môn nghề may và tự loại các vai trò hệ thống khỏi danh mục.</p>
              </div>

              <label className="worker-role-create-field">
                <span className="worker-role-create-field__label">Tên chuyên môn thợ</span>
                <PencilLine size={18} className="worker-role-create-field__icon" />
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ví dụ: Cắt, May, Kiểm hàng..."
                  className="worker-role-create-field__control"
                />
              </label>

              {error ? <div className="worker-role-create-banner">{error}</div> : null}

              <div className="worker-role-create-actions">
                <button
                  type="button"
                  onClick={() => navigate("/worker-roles")}
                  className="worker-role-btn worker-role-btn--ghost"
                >
                  Hủy
                </button>
                <button type="submit" disabled={submitting} className="worker-role-btn worker-role-btn--primary">
                  {submitting ? (
                    <>
                      <LoaderCircle size={18} className="worker-role-btn__spin" />
                      <span>Đang tạo...</span>
                    </>
                  ) : (
                    <>
                      <Shapes size={18} />
                      <span>Tạo chuyên môn thợ</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            <aside className="worker-role-side-card">
              <div className="worker-role-side-card__header">
                <h2>Chuyên môn hiện có</h2>
                <p>Một số chuyên môn nghề may đang được sử dụng trong hệ thống.</p>
              </div>

              <div className="worker-role-chip-list">
                {existingRoles.length === 0 ? (
                  <div className="worker-role-chip-list__empty">Chưa có dữ liệu danh mục chuyên môn.</div>
                ) : (
                  existingRoles.map((role) => (
                    <div key={role.id} className="worker-role-chip">
                      <div className="worker-role-chip__name">{role.label}</div>
                      <div className="worker-role-chip__meta">CM-{String(role.id).padStart(3, "0")}</div>
                    </div>
                  ))
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
