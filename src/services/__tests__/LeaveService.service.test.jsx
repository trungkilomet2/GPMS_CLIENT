import { getLeaveErrorMessage } from "@/services/LeaveService";

describe("LeaveService", () => {
  it("returns problem details validation messages when backend provides errors", () => {
    const error = {
      response: {
        status: 400,
        data: {
          errors: {
            fromDate: ["Ngày bắt đầu nghỉ không hợp lệ."],
            toDate: ["Ngày kết thúc nghỉ không hợp lệ."],
          },
        },
      },
    };

    expect(getLeaveErrorMessage(error, "fallback")).toBe(
      "Ngày bắt đầu nghỉ không hợp lệ. Ngày kết thúc nghỉ không hợp lệ."
    );
  });

  it("falls back to a friendly 400 message when backend returns an empty body", () => {
    const error = {
      response: {
        status: 400,
        data: "",
      },
    };

    expect(getLeaveErrorMessage(error, "fallback")).toBe(
      "Dữ liệu gửi lên chưa hợp lệ. Vui lòng kiểm tra lại nội dung và thời gian nghỉ."
    );
  });

  it("translates backend leave validation messages to Vietnamese", () => {
    const error = {
      response: {
        status: 400,
        data: {
          errors: {
            denyContent: ["Deny reason must not exceed 100 characters."],
          },
        },
      },
    };

    expect(getLeaveErrorMessage(error, "fallback")).toBe(
      "Lý do từ chối không được vượt quá 100 ký tự."
    );
  });
});
