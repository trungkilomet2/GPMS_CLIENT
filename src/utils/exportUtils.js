import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

/**
 * Xuất dữ liệu bảng lương ra file Excel (.xlsx)
 * @param {Array} data Danh sách thợ và các chỉ số (workerSummary)
 * @param {number} month Tháng báo cáo
 * @param {number} year Năm báo cáo
 */
export const exportPayrollToExcel = (data, month, year) => {
  if (!data || data.length === 0) return;

  // Chuẩn bị dữ liệu cho Excel (Phẳng hóa dữ liệu)
  const excelData = data.map((w, idx) => ({
    "STT": idx + 1,
    "Họ tên": w.fullName || w.workerName,
    "Số công đoạn": w.uniquePartCount || 0,
    "Số báo cáo": w.logCount || 0,
    "Tổng thu nhập (VND)": w.totalSalary || 0
  }));

  // Tạo worksheet và workbook
  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Payroll");

  // Định dạng độ rộng cột (đơn vị: characters)
  const wscols = [
    { wch: 5 },  // STT
    { wch: 30 }, // Họ tên
    { wch: 15 }, // Số công đoạn
    { wch: 15 }, // Số báo cáo
    { wch: 20 }  // Thu nhập
  ];
  worksheet["!cols"] = wscols;

  // Tải file
  const fileName = `BangLuong_ThanhToan_Thang_${month}_${year}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

/**
 * Xuất dữ liệu bảng lương ra file PDF (.pdf)
 * Lưu ý: jspdf mặc định không hỗ trợ tiếng Việt nếu không có font.
 * Ở đây chúng ta sẽ tạo bảng cơ bản, nếu lỗi font sẽ khuyên dùng Excel.
 */
export const exportPayrollToPDF = (data, month, year) => {
  if (!data || data.length === 0) return;

  const doc = new jsPDF();
  
  // Tiêu đề
  doc.setFontSize(18);
  // doc.text(`Bảng lương tháng ${month}/${year}`, 14, 20); // Có thể lỗi font tiếng Việt
  doc.text(`BANGLUONG_THANG_${month}_${year}`, 14, 20);

  const tableColumn = ["STT", "Ten Tho", "So Cong Doan", "So Bao Cao", "Thu Nhap (VND)"];
  const tableRows = data.map((w, idx) => [
    idx + 1,
    w.fullName || w.workerName,
    w.uniquePartCount || 0,
    w.logCount || 0,
    (w.totalSalary || 0).toLocaleString("vi-VN")
  ]);

  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 30,
    theme: 'grid',
    headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255] }, // Emerald-600
  });

  const fileName = `BangLuong_Thang_${month}_${year}.pdf`;
  doc.save(fileName);
};

/**
 * Xuất chi tiết lương của một thợ ra Excel
 */
export const exportDetailToExcel = (logs, workerName, month, year) => {
  if (!logs || logs.length === 0) return;

  const excelData = logs.map((log, idx) => ({
    "STT": idx + 1,
    "Ngày làm": new Date(log.reportDate).toLocaleDateString("vi-VN"),
    "Đơn hàng": log.orderName,
    "Công đoạn": log.partName,
    "Đơn giá": log.cpu,
    "Số lượng": log.quantity,
    "Thành tiền": log.quantity * log.cpu,
    "Trạng thái": log.paidAt ? "Đã thanh toán" : "Chưa thanh toán"
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Detail");

  const wscols = [
    { wch: 5 }, { wch: 15 }, { wch: 30 }, { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 }
  ];
  worksheet["!cols"] = wscols;

  const fileName = `ChiTietLuong_${workerName}_Thang_${month}_${year}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};
