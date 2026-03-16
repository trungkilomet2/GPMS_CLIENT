// src/components/orders/OrderCard.jsx
export default function OrderCard({ order }) {
  const statusMap = {
    "Chờ xét duyệt": { label: "Chờ xét duyệt", color: "bg-amber-100 text-amber-800" },
    "Cho xet duyet": { label: "Chờ xét duyệt", color: "bg-amber-100 text-amber-800" },
    "Cần cập nhật": { label: "Cần cập nhật", color: "bg-blue-100 text-blue-800" },
    "Can cap nhat": { label: "Cần cập nhật", color: "bg-blue-100 text-blue-800" },
    "Từ chối": { label: "Từ chối", color: "bg-red-100 text-red-800" },
    "Tu choi": { label: "Từ chối", color: "bg-red-100 text-red-800" },
    "Chấp nhận": { label: "Chấp nhận", color: "bg-green-100 text-green-800" },
    "Chap nhan": { label: "Chấp nhận", color: "bg-green-100 text-green-800" },
  };

  const status = statusMap[order.status] || { label: order.status, color: "bg-gray-100 text-gray-800" };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-bold text-gray-900">#{order.id}</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
          {status.label}
        </span>
      </div>

      <div className="space-y-2 text-sm text-gray-700 mb-6">
        <p><span className="font-medium">Loại sản phẩm:</span> {order.product}</p>
        <p><span className="font-medium">Số lượng:</span> {order.quantity} cái</p>
        <p><span className="font-medium">Ngày dự kiến:</span> {order.expectedDate}</p>
      </div>

      <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
        Xem chi tiết
      </button>
    </div>
  );
}
