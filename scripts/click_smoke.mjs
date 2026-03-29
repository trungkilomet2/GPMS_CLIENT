import { chromium } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

const ACCOUNTS = {
  owner: {
    userName: process.env.OWNER_USERNAME || "",
    password: process.env.OWNER_PASSWORD || "",
  },
  admin: {
    userName: process.env.ADMIN_USERNAME || "",
    password: process.env.ADMIN_PASSWORD || "",
  },
  pm: {
    userName: process.env.PM_USERNAME || "",
    password: process.env.PM_PASSWORD || "",
  },
};

const results = [];

function logResult(role, step, status, note = "") {
  const entry = { role, step, status, note };
  results.push(entry);
  console.log(`[${status.toUpperCase()}] [${role}] ${step}${note ? ` - ${note}` : ""}`);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function bodyText(page) {
  const text = await page.locator("body").innerText().catch(() => "");
  return String(text || "");
}

async function expectBodyContains(page, patterns) {
  const text = await bodyText(page);
  for (const pattern of patterns) {
    if (pattern instanceof RegExp && pattern.test(text)) return true;
    if (!(pattern instanceof RegExp) && text.includes(String(pattern))) return true;
  }
  throw new Error(`Expected page to contain one of: ${patterns.map((item) => item.toString()).join(", ")}`);
}

async function gotoAndCheck(page, role, path, patterns) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);

  const text = await bodyText(page);
  if (page.url().includes("/login")) {
    throw new Error(`Redirected to login while opening ${path}`);
  }
  if (text.includes("Trang không tồn tại (404)")) {
    throw new Error(`Route ${path} returned 404`);
  }

  await expectBodyContains(page, patterns);
  logResult(role, path, "pass");
}

async function clickFirstAction(page, labels) {
  for (const label of labels) {
    const pattern = new RegExp(escapeRegex(label), "i");
    const locator = page.locator("a,button").filter({ hasText: pattern }).first();
    if (await locator.count()) {
      await locator.click();
      await page.waitForTimeout(1200);
      return label;
    }
  }

  return null;
}

async function login(page, role, credentials) {
  if (!credentials.userName || !credentials.password) {
    throw new Error(`Missing credentials for ${role}`);
  }

  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  await page.getByPlaceholder("Nhập tên đăng nhập").fill(credentials.userName);
  await page.getByPlaceholder("Nhập mật khẩu").fill(credentials.password);
  await page.getByRole("button", { name: /Đăng nhập/i }).click();

  await page.waitForTimeout(2000);

  if (page.url().includes("/login")) {
    const text = await bodyText(page);
    throw new Error(`Login failed: ${text.slice(0, 300)}`);
  }

  logResult(role, "login", "pass", page.url());
}

async function runOwnerChecks(browser) {
  const role = "owner";
  const context = await browser.newContext();
  const page = await context.newPage();
  const clientErrors = [];

  page.on("pageerror", (error) => clientErrors.push(`pageerror: ${error.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") clientErrors.push(`console: ${msg.text()}`);
  });

  try {
    await login(page, role, ACCOUNTS.owner);

    await gotoAndCheck(page, role, "/employees", ["Danh sách nhân viên"]);
    await gotoAndCheck(page, role, "/employees/workers", ["Danh sách nhân viên", "Nhân viên sản xuất"]);

    const employeeDetailAction = await clickFirstAction(page, ["Xem chi tiết"]);
    if (employeeDetailAction) {
      await expectBodyContains(page, ["Thông tin chi tiết nhân viên"]);
      logResult(role, "employee-detail", "pass");

      const editAction = await clickFirstAction(page, ["Sửa hồ sơ"]);
      if (editAction) {
        await expectBodyContains(page, ["Cập nhật thông tin nhân viên"]);
        logResult(role, "employee-update", "pass");
      } else {
        logResult(role, "employee-update", "skip", "Edit button not found");
      }
    } else {
      logResult(role, "employee-detail", "skip", "No employee row available");
      logResult(role, "employee-update", "skip", "No employee detail available");
    }

    await gotoAndCheck(page, role, "/employees/create", ["Thêm nhân viên mới"]);
    await gotoAndCheck(page, role, "/worker-roles", ["Danh sách vai trò thợ"]);
    await gotoAndCheck(page, role, "/worker-roles/create", ["Thêm vai trò thợ"]);
    await gotoAndCheck(page, role, "/salary", ["Danh sách lương"]);
    await gotoAndCheck(page, role, "/salary/1", ["Chi tiết lương"]);

    await gotoAndCheck(page, role, "/leave", ["Quản lý nghỉ phép"]);
    const leaveDetailAction = await clickFirstAction(page, ["Xem chi tiết"]);
    if (leaveDetailAction) {
      await expectBodyContains(page, ["Chi tiết đơn xin nghỉ"]);
      logResult(role, "leave-detail", "pass");

      const rejectToggle = await clickFirstAction(page, ["Từ chối đơn", "Từ chối yêu cầu hủy"]);
      if (rejectToggle) {
        await expectBodyContains(page, ["Lý do từ chối", "Lý do từ chối yêu cầu hủy"]);
        logResult(role, "deny-reason", "pass");
      } else {
        logResult(role, "deny-reason", "skip", "No reject action for current leave status");
      }
    } else {
      logResult(role, "leave-detail", "skip", "No leave row available");
      logResult(role, "deny-reason", "skip", "No leave detail available");
    }

    await gotoAndCheck(page, role, "/leave-history", ["Lịch sử đơn nghỉ"]);
    const leaveHistoryDetailAction = await clickFirstAction(page, ["Xem chi tiết"]);
    if (leaveHistoryDetailAction) {
      await expectBodyContains(page, ["Chi tiết lịch sử đơn nghỉ"]);
      logResult(role, "leave-history-detail", "pass");
    } else {
      logResult(role, "leave-history-detail", "skip", "No leave history row available");
    }

    await gotoAndCheck(page, role, "/worker/leave-requests", ["Đơn xin nghỉ phép", "Tạo đơn nghỉ mới"]);
    await page.getByRole("button", { name: /Gửi đơn nghỉ/i }).click();
    await page.waitForTimeout(500);
    await expectBodyContains(page, ["Vui lòng nhập nội dung đơn nghỉ.", "Vui lòng chọn đầy đủ thời gian nghỉ."]);
    logResult(role, "create-leave-request", "pass", "Client-side validation shown");

    await gotoAndCheck(page, role, "/employees", ["Danh sách nhân viên"]);
  } catch (error) {
    logResult(role, "scenario", "fail", error.message);
  } finally {
    if (clientErrors.length) {
      logResult(role, "browser-errors", "warn", clientErrors.slice(0, 5).join(" | "));
    }
    await context.close();
  }
}

async function runAdminChecks(browser) {
  const role = "admin";
  const context = await browser.newContext();
  const page = await context.newPage();
  const clientErrors = [];

  page.on("pageerror", (error) => clientErrors.push(`pageerror: ${error.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") clientErrors.push(`console: ${msg.text()}`);
  });

  try {
    await login(page, role, ACCOUNTS.admin);

    await gotoAndCheck(page, role, "/admin/users", ["Quản lý tài khoản", "Danh sách tài khoản"]);
    await gotoAndCheck(page, role, "/admin/users/create", ["Tạo tài khoản mới"]);

    await gotoAndCheck(page, role, "/admin/users", ["Quản lý tài khoản", "Danh sách tài khoản"]);
    const userDetailAction = await clickFirstAction(page, ["Xem"]);
    if (userDetailAction) {
      await expectBodyContains(page, ["Chi tiết tài khoản"]);
      logResult(role, "admin-user-detail", "pass");

      const updateAction = await clickFirstAction(page, ["Cập nhật", "Sửa"]);
      if (updateAction) {
        await expectBodyContains(page, ["Cập nhật tài khoản"]);
        logResult(role, "admin-user-update", "pass");
      } else {
        logResult(role, "admin-user-update", "skip", "Update button not found");
      }
    } else {
      logResult(role, "admin-user-detail", "skip", "No user row available");
      logResult(role, "admin-user-update", "skip", "No user detail available");
    }

    await gotoAndCheck(page, role, "/admin/logs", ["Nhật ký hệ thống"]);
    await gotoAndCheck(page, role, "/admin/permissions", ["Phân quyền hệ thống"]);
  } catch (error) {
    logResult(role, "scenario", "fail", error.message);
  } finally {
    if (clientErrors.length) {
      logResult(role, "browser-errors", "warn", clientErrors.slice(0, 5).join(" | "));
    }
    await context.close();
  }
}

async function runPmChecks(browser) {
  const role = "pm";
  const context = await browser.newContext();
  const page = await context.newPage();
  const clientErrors = [];

  page.on("pageerror", (error) => clientErrors.push(`pageerror: ${error.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") clientErrors.push(`console: ${msg.text()}`);
  });

  try {
    await login(page, role, ACCOUNTS.pm);

    await gotoAndCheck(page, role, "/employees", ["Danh sách nhân viên"]);
    const employeesBody = await bodyText(page);
    if (employeesBody.includes("Nhóm quản lý")) {
      logResult(role, "employee-directory-scope", "fail", "PM still sees management card");
    } else {
      logResult(role, "employee-directory-scope", "pass");
    }

    await gotoAndCheck(page, role, "/employees/workers", ["Danh sách nhân viên", "Nhân viên sản xuất"]);
    await gotoAndCheck(page, role, "/leave", ["Quản lý nghỉ phép"]);
  } catch (error) {
    logResult(role, "scenario", "fail", error.message);
  } finally {
    if (clientErrors.length) {
      logResult(role, "browser-errors", "warn", clientErrors.slice(0, 5).join(" | "));
    }
    await context.close();
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  try {
    await runOwnerChecks(browser);
    await runAdminChecks(browser);
    await runPmChecks(browser);
  } finally {
    await browser.close();
  }

  console.log("\n=== SUMMARY ===");
  for (const item of results) {
    console.log(`${item.status.toUpperCase()} | ${item.role} | ${item.step}${item.note ? ` | ${item.note}` : ""}`);
  }

  const failed = results.filter((item) => item.status === "fail");
  process.exitCode = failed.length ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
