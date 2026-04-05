import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import WorkerLayout from "@/layouts/WorkerLayout";
import { authService } from "@/services/authService";
import { userService } from "@/services/UserService";
import { getStoredUser } from "@/lib/authStorage";
import { getPrimaryWorkspaceRole } from "@/lib/internalRoleFlow";
import {
  normalizeSpaces,
  validateAvatarFile,
  validateEmail,
  validateFullName,
  validateLocation,
  validatePhoneNumber,
} from "@/lib/validators";

function getInitials(name = "") {
  return String(name || "")
    .split(" ")
    .map((item) => item[0])
    .filter(Boolean)
    .slice(-2)
    .join("")
    .toUpperCase();
}

async function buildAvatarFile(avatarFile, avatarPreview, initials = "") {
  if (avatarFile) return avatarFile;

  if (typeof avatarPreview === "string" && avatarPreview.trim()) {
    try {
      const response = await fetch(avatarPreview);
      if (response.ok) {
        const blob = await response.blob();
        const type = blob.type || "image/png";
        const extension = type.split("/")[1] || "png";
        return new File([blob], `avatar.${extension}`, { type });
      }
    } catch {
      // fall through
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Không thể tạo ảnh đại diện mặc định.");

  ctx.fillStyle = "#1f4d3a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const safeInitials = String(initials || "?").trim().slice(0, 2).toUpperCase() || "?";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 96px Lexend, 'Be Vietnam Pro', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(safeInitials, canvas.width / 2, canvas.height / 2);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Không thể tạo ảnh đại diện mặc định.");
  return new File([blob], "avatar.png", { type: "image/png" });
}

function mapApiErrors(errData) {
  const errors = errData?.errors && typeof errData.errors === "object" ? errData.errors : null;
  if (!errors) return { message: errData?.message || errData?.title || "Cập nhật thất bại.", fieldErrors: {} };

  const fieldErrors = {};
  for (const [field, messages] of Object.entries(errors)) {
    const firstMessage = Array.isArray(messages) ? messages[0] : messages;
    const message = String(firstMessage ?? "").trim();
    if (!message) continue;

    const key = String(field ?? "").trim().toLowerCase();
    if (key.includes("fullname")) fieldErrors.fullName = message;
    else if (key.includes("email")) fieldErrors.email = message;
    else if (key.includes("phone")) fieldErrors.phoneNumber = message;
    else if (key.includes("location") || key.includes("address")) fieldErrors.location = message;
  }

  const message =
    fieldErrors.fullName ||
    fieldErrors.email ||
    fieldErrors.phoneNumber ||
    fieldErrors.location ||
    errData?.detail ||
    errData?.message ||
    errData?.title ||
    "Cập nhật thất bại.";

  return { message, fieldErrors };
}

function isEmailVerificationRequiredMessage(value) {
  const message = String(value ?? "").trim().toLowerCase();
  if (!message) return false;
  return (
    message.includes("email chưa được xác thực") ||
    message.includes("xác thực email trước khi cập nhật") ||
    message.includes("verify email") ||
    message.includes("email not verified")
  );
}

function isEmailAlreadyVerifiedMessage(value) {
  const message = String(value ?? "").trim().toLowerCase();
  if (!message) return false;
  return (
    message.includes("email đã được xác thực trước đó") ||
    message.includes("email da duoc xac thuc truoc do") ||
    message.includes("email already verified") ||
    message.includes("already verified")
  );
}

function isEmailAlreadyRegisteredMessage(value) {
  const message = String(value ?? "").trim().toLowerCase();
  if (!message) return false;
  return (
    message.includes("email đã được đăng ký") ||
    message.includes("email da duoc dang ky") ||
    message.includes("email already registered") ||
    message.includes("email already exists") ||
    message.includes("already exists")
  );
}

function isGenericEntitySaveError(value) {
  const message = String(value ?? "").trim().toLowerCase();
  if (!message) return false;
  return (
    message.includes("an error occurred while saving the entity changes") ||
    message.includes("see the inner exception for details")
  );
}

function getFallbackSaveErrorMessage(errData, fallbackMessage) {
  const status = Number(errData?.status ?? 0);
  const detail = String(errData?.detail ?? "").trim();
  const title = String(errData?.title ?? "").trim();
  const message = String(fallbackMessage ?? "").trim();
  const genericMessage = detail || title || message;

  if (status >= 500 && isGenericEntitySaveError(genericMessage)) {
    return "Không thể lưu hồ sơ do backend trả lỗi nội bộ chung chung. Hãy kiểm tra lại email, số điện thoại hoặc ảnh đại diện rồi thử lại.";
  }

  return message || "Cập nhật thất bại.";
}

function resolveOtpStageByEmail(currentEmail = "", verifiedEmail = "") {
  const normalizedCurrentEmail = String(currentEmail || "").trim().toLowerCase();
  const normalizedVerifiedEmail = String(verifiedEmail || "").trim().toLowerCase();
  return normalizedCurrentEmail && normalizedCurrentEmail === normalizedVerifiedEmail ? "verified" : "idle";
}

export default function InternalProfileEdit() {
  const navigate = useNavigate();
  const location = useLocation();
  const storedUser = useMemo(() => getStoredUser(), []);
  const Layout = useMemo(() => {
    const primaryRole = getPrimaryWorkspaceRole(storedUser?.role);

    if (primaryRole === "worker") return WorkerLayout;
    return DashboardLayout;
  }, [storedUser]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [touched, setTouched] = useState({});
  const [serverErrors, setServerErrors] = useState({});
  const [otpCode, setOtpCode] = useState("");
  const [otpStage, setOtpStage] = useState("idle");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [initialEmail, setInitialEmail] = useState("");
  const [backendRequiresEmailVerification, setBackendRequiresEmailVerification] = useState(false);

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    location: "",
  });

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setMessage(null);
        const profile = await userService.getProfile();
        if (!mounted) return;

        setForm({
          fullName: profile?.fullName || storedUser?.fullName || storedUser?.name || "",
          email: profile?.email || storedUser?.email || "",
          phoneNumber: profile?.phoneNumber || storedUser?.phoneNumber || storedUser?.phone || "",
          location: profile?.location || storedUser?.location || storedUser?.address || "",
        });
        const resolvedEmail = String(profile?.email || "").trim();
        const emailVerified = profile?.emailVerified === true;
        setInitialEmail(resolvedEmail);
        setVerifiedEmail(emailVerified || resolvedEmail ? resolvedEmail.toLowerCase() : "");
        setOtpStage(resolveOtpStageByEmail(resolvedEmail, resolvedEmail));
        setBackendRequiresEmailVerification(false);
        setOtpCode("");
        setAvatarPreview(profile?.avatarUrl || storedUser?.avatarUrl || "");
      } catch (e) {
        if (!mounted) return;
        setMessage({
          type: "error",
          text: e?.response?.data?.message || e?.response?.data?.title || "Không thể tải hồ sơ.",
        });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    // allow entering edit from forced completion or refresh state
  }, [location?.state?.forceProfileCompletion, location?.state?.refresh, storedUser]);

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(avatarPreview);
        } catch {
          // ignore
        }
      }
    };
  }, [avatarPreview]);

  const validateField = (name, value) => {
    if (name === "fullName") return validateFullName(value);
    if (name === "email") return validateEmail(value);
    if (name === "phoneNumber") return validatePhoneNumber(value);
    if (name === "location") return validateLocation(value);
    return "";
  };

  const errors = {
    fullName: touched.fullName ? validateField("fullName", form.fullName) : "",
    email: touched.email ? validateField("email", form.email) : "",
    phoneNumber: touched.phoneNumber ? validateField("phoneNumber", form.phoneNumber) : "",
    location: touched.location ? validateField("location", form.location) : "",
  };

  const effectiveErrors = {
    fullName: errors.fullName || serverErrors.fullName || "",
    email: errors.email || serverErrors.email || "",
    phoneNumber: errors.phoneNumber || serverErrors.phoneNumber || "",
    location: errors.location || serverErrors.location || "",
  };

  const hasErrors = Object.values(effectiveErrors).some(Boolean);
  const normalizedCurrentEmail = String(form.email || "").trim().toLowerCase();
  const normalizedInitialEmail = String(initialEmail || "").trim().toLowerCase();
  const normalizedVerifiedEmail = String(verifiedEmail || "").trim().toLowerCase();
  const emailChanged = normalizedCurrentEmail !== normalizedInitialEmail;
  const isCurrentEmailVerified =
    !!normalizedCurrentEmail && normalizedCurrentEmail === normalizedVerifiedEmail;
  const emailVerificationRequired = backendRequiresEmailVerification || emailChanged;

  const onChange = (name) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [name]: value }));
    setTouched((prev) => ({ ...prev, [name]: true }));
    setServerErrors((prev) => ({ ...prev, [name]: "" }));
    setMessage(null);

    if (name === "email") {
      const normalizedEmail = String(value || "").trim().toLowerCase();
      const nextStage = resolveOtpStageByEmail(normalizedEmail, verifiedEmail);
      setOtpStage(nextStage);
      if (nextStage !== "verified") setOtpCode("");
      setBackendRequiresEmailVerification(normalizedEmail !== normalizedInitialEmail);
    }
  };

  const onAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const avatarError = validateAvatarFile(file);
    if (avatarError) {
      setTouched((prev) => ({ ...prev, avatar: true }));
      setMessage({ type: "error", text: avatarError });
      e.target.value = "";
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setTouched((prev) => ({ ...prev, avatar: true }));
    setMessage(null);
  };

  const handleSendOtp = async () => {
    const emailError = validateField("email", form.email);
    setTouched((prev) => ({ ...prev, email: true }));

    if (emailError) {
      setMessage({ type: "error", text: emailError });
      return;
    }

    try {
      setSendingOtp(true);
      setMessage(null);
      const normalizedEmail = String(form.email || "").trim();

      try {
        await authService.sendRegisterOtp({ email: normalizedEmail });
      } catch (err) {
        const errData = err?.response?.data;
        const sendMessage =
          errData?.message ||
          errData?.detail ||
          errData?.title ||
          "";

        if (!isEmailAlreadyRegisteredMessage(sendMessage)) {
          throw err;
        }

        await authService.resendRegisterOtp({ email: normalizedEmail });
      }

      setOtpStage("sent");
      setOtpCode("");
      setVerifiedEmail("");
      setBackendRequiresEmailVerification(true);
      setMessage({
        type: "success",
        text: "Mã xác thực đã được gửi tới email. Nhập OTP rồi bấm Xác minh email.",
      });
    } catch (err) {
      const errData = err?.response?.data;
      setMessage({
        type: "error",
        text:
          errData?.message ||
          errData?.title ||
          "Không thể gửi mã xác thực. Vui lòng thử lại.",
      });
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!String(otpCode || "").trim()) {
      setMessage({ type: "error", text: "Vui lòng nhập mã OTP đã nhận trong email." });
      return;
    }

    try {
      setVerifyingOtp(true);
      setMessage(null);
      try {
        await authService.verifyRegisterOtp({
          email: String(form.email || "").trim(),
          otp: String(otpCode || "").trim(),
        });
      } catch (err) {
        const errData = err?.response?.data;
        const verifyMessage =
          errData?.message ||
          errData?.detail ||
          errData?.title ||
          "";

        if (!isEmailAlreadyVerifiedMessage(verifyMessage)) {
          throw err;
        }
      }
      setOtpStage("verified");
      setVerifiedEmail(String(form.email || "").trim().toLowerCase());
      setBackendRequiresEmailVerification(false);
      setMessage({
        type: "success",
        text: "Email đã được xác thực. Bạn có thể lưu thay đổi hồ sơ.",
      });
    } catch (err) {
      const errData = err?.response?.data;
      setMessage({
        type: "error",
        text:
          errData?.message ||
          errData?.title ||
          "Xác minh email không thành công. Vui lòng kiểm tra lại OTP.",
      });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setTouched((prev) => ({
      ...prev,
      fullName: true,
      email: true,
      phoneNumber: true,
      location: true,
    }));

    const nextErrors = {
      fullName: validateField("fullName", form.fullName),
      email: validateField("email", form.email),
      phoneNumber: validateField("phoneNumber", form.phoneNumber),
      location: validateField("location", form.location),
    };

    if (Object.values(nextErrors).some(Boolean)) {
      setMessage({ type: "error", text: "Vui lòng kiểm tra lại các trường bắt buộc." });
      return;
    }

    if (emailVerificationRequired && !isCurrentEmailVerified) {
      setOtpStage((prev) => (prev === "idle" ? "sent" : prev));
      setMessage({
        type: "error",
        text: "Vui lòng xác minh email hiện tại bằng mã OTP trước khi lưu hồ sơ.",
      });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);
      setServerErrors({});

      const user = getStoredUser();
      const fd = new FormData();
      fd.append("FullName", normalizeSpaces(form.fullName));
      fd.append("PhoneNumber", String(form.phoneNumber || "").trim());
      fd.append("Location", normalizeSpaces(form.location));
      fd.append("Email", String(form.email || "").trim());

      if (avatarFile instanceof File) {
        fd.append("AvartarUrl", avatarFile);
      } else if (!String(avatarPreview || "").trim()) {
        const avatarUpload = await buildAvatarFile(null, "", getInitials(form.fullName));
        fd.append("AvartarUrl", avatarUpload);
      }

      const updateResult = await userService.updateProfile(user?.userId ?? user?.id, fd);

      if (updateResult?.otpRequired) {
        setBackendRequiresEmailVerification(true);
        setOtpStage("sent");
        setMessage({
          type: "success",
          text: updateResult?.message || "Hệ thống đã gửi OTP về email. Vui lòng xác nhận để hoàn tất cập nhật hồ sơ.",
        });
        return;
      }

      const refreshedProfile = await userService.getProfile();
      const nextEmail = String(refreshedProfile?.email || form.email || "").trim();
      const nextFullName = String(refreshedProfile?.fullName || form.fullName || "");
      const nextPhoneNumber = String(refreshedProfile?.phoneNumber || form.phoneNumber || "");
      const nextLocation = String(refreshedProfile?.location || form.location || "");

      setForm({
        fullName: nextFullName,
        email: nextEmail,
        phoneNumber: nextPhoneNumber,
        location: nextLocation,
      });
      setInitialEmail(nextEmail);
      setVerifiedEmail(nextEmail.toLowerCase());
      setBackendRequiresEmailVerification(false);
      setOtpStage(nextEmail ? "verified" : "idle");

      setMessage({ type: "success", text: "Lưu hồ sơ thành công!" });
      setTimeout(() => navigate("/profile", { state: { refresh: Date.now() } }), 900);
    } catch (err) {
      const errData = err?.response?.data ?? {};
      const mapped = mapApiErrors(errData);
      const friendlyMessage = getFallbackSaveErrorMessage(errData, mapped.message);
      const shouldPromptVerify =
        isEmailVerificationRequiredMessage(friendlyMessage) ||
        isEmailVerificationRequiredMessage(errData?.detail);

      setServerErrors(mapped.fieldErrors || {});
      setTouched((prev) => ({
        ...prev,
        ...(mapped.fieldErrors.fullName ? { fullName: true } : {}),
        ...(mapped.fieldErrors.email ? { email: true } : {}),
        ...(mapped.fieldErrors.phoneNumber ? { phoneNumber: true } : {}),
        ...(mapped.fieldErrors.location ? { location: true } : {}),
      }));
      if (shouldPromptVerify) {
        setBackendRequiresEmailVerification(true);
        setOtpStage((prev) => (prev === "verified" ? prev : "sent"));
        setMessage({
          type: "error",
          text: "Email này chưa được xác thực. Vui lòng gửi mã OTP, xác minh email rồi lưu lại hồ sơ.",
        });
      } else {
        setMessage({ type: "error", text: friendlyMessage });
      }
    } finally {
      setSaving(false);
    }
  };

  const displayName = form.fullName || storedUser?.fullName || storedUser?.name || "Người dùng";
  const initials = getInitials(displayName);

  return (
    <Layout>
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[28px] border border-emerald-100/70 bg-white/85 p-6 shadow-[0_18px_40px_rgba(30,110,67,0.10)] backdrop-blur">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="avatar"
                  className="h-[76px] w-[76px] rounded-2xl border border-emerald-100 object-cover shadow-sm"
                />
              ) : (
                <div className="flex h-[76px] w-[76px] items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-2xl font-extrabold text-emerald-800">
                  {initials || "GP"}
                </div>
              )}

              <div>
                <div className="text-xl font-extrabold tracking-tight text-slate-900">
                  Chỉnh sửa hồ sơ
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-500">
                  Cập nhật thông tin liên hệ cho nhân sự nội bộ.
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-extrabold text-emerald-800 shadow-sm transition hover:bg-emerald-50"
              >
                Huỷ
              </button>
              <button
                type="submit"
                form="internal-profile-edit-form"
                disabled={saving || loading}
                className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-extrabold text-white shadow-[0_16px_30px_rgba(30,110,67,0.18)] transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-[28px] border border-emerald-100/70 bg-white/85 p-6 shadow-[0_18px_40px_rgba(30,110,67,0.10)] backdrop-blur">
          {message ? (
            <div
              className={`mb-5 rounded-2xl border px-4 py-3 text-sm font-semibold ${
                message.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
              role="alert"
            >
              {message.text}
            </div>
          ) : null}

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[82px] animate-pulse rounded-2xl border border-emerald-100 bg-white/70"
                />
              ))}
            </div>
          ) : (
            <form id="internal-profile-edit-form" onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Ảnh đại diện
                </label>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onAvatarChange}
                    className="block w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700 file:mr-4 file:rounded-xl file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-extrabold file:text-emerald-800 hover:file:bg-emerald-100"
                  />
                  <div className="text-xs font-semibold text-slate-400">
                    PNG/JPG, tối đa 2MB
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Họ và tên *
                </label>
                <input
                  value={form.fullName}
                  onChange={onChange("fullName")}
                  onBlur={() => setTouched((prev) => ({ ...prev, fullName: true }))}
                  className={`mt-2 w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 ${
                    effectiveErrors.fullName ? "border-rose-300" : "border-emerald-100"
                  }`}
                  placeholder="Nhập họ và tên"
                />
                {effectiveErrors.fullName ? (
                  <div className="mt-2 text-sm font-semibold text-rose-700">{effectiveErrors.fullName}</div>
                ) : null}
              </div>

              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Email *
                </label>
                <input
                  value={form.email}
                  onChange={onChange("email")}
                  onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                  className={`mt-2 w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 ${
                    effectiveErrors.email ? "border-rose-300" : "border-emerald-100"
                  }`}
                  placeholder="Nhập email"
                />
                {effectiveErrors.email ? (
                  <div className="mt-2 text-sm font-semibold text-rose-700">{effectiveErrors.email}</div>
                ) : null}
              </div>

              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Số điện thoại *
                </label>
                <input
                  value={form.phoneNumber}
                  onChange={onChange("phoneNumber")}
                  onBlur={() => setTouched((prev) => ({ ...prev, phoneNumber: true }))}
                  className={`mt-2 w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 ${
                    effectiveErrors.phoneNumber ? "border-rose-300" : "border-emerald-100"
                  }`}
                  placeholder="Nhập số điện thoại"
                />
                {effectiveErrors.phoneNumber ? (
                  <div className="mt-2 text-sm font-semibold text-rose-700">{effectiveErrors.phoneNumber}</div>
                ) : null}
              </div>

              <div className="sm:col-span-2">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-extrabold text-emerald-900">
                          {emailVerificationRequired ? "Cần xác minh email để lưu hồ sơ" : "Xác minh email"}
                        </div>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold ${
                            otpStage === "verified"
                              ? "bg-emerald-200 text-emerald-900"
                              : "bg-white text-slate-500"
                          }`}
                        >
                          {otpStage === "verified" ? "Đã xác minh" : "Chưa xác minh"}
                        </span>
                      </div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">
                          {emailVerificationRequired
                            ? "Email hiện tại cần được xác minh bằng mã OTP trước khi cập nhật hồ sơ."
                            : "Email hiện tại đã được xác minh. Nếu bạn đổi email, hệ thống sẽ yêu cầu xác minh bằng mã OTP trước khi lưu."}
                        </div>
                      </div>

                    {emailVerificationRequired ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={sendingOtp || verifyingOtp}
                          className="whitespace-nowrap rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-extrabold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {sendingOtp ? "Đang gửi..." : otpStage === "sent" ? "Gửi lại OTP" : "Gửi mã OTP"}
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {emailVerificationRequired ? (
                    <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center">
                      <input
                        type="text"
                        name="profileOtpCode"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        autoComplete="one-time-code"
                        inputMode="numeric"
                        className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                        placeholder="Nhập mã OTP"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={verifyingOtp || !String(otpCode || "").trim()}
                        className="whitespace-nowrap rounded-xl bg-emerald-700 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {verifyingOtp ? "Đang xác minh..." : "Xác minh"}
                      </button>
                    </div>
                  ) : null}

                  {emailVerificationRequired && otpStage === "verified" ? (
                    <div className="mt-3 text-sm font-extrabold text-emerald-700">
                      Email hiện tại đã được xác minh. Bạn có thể lưu thay đổi hồ sơ.
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Địa chỉ *
                </label>
                <input
                  value={form.location}
                  onChange={onChange("location")}
                  onBlur={() => setTouched((prev) => ({ ...prev, location: true }))}
                  className={`mt-2 w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 ${
                    effectiveErrors.location ? "border-rose-300" : "border-emerald-100"
                  }`}
                  placeholder="Nhập địa chỉ"
                />
                {effectiveErrors.location ? (
                  <div className="mt-2 text-sm font-semibold text-rose-700">{effectiveErrors.location}</div>
                ) : null}
              </div>

              {hasErrors ? (
                <div className="sm:col-span-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                  Vui lòng kiểm tra lại các trường được đánh dấu lỗi.
                </div>
              ) : null}
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
}
