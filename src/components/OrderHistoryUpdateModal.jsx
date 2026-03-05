import React from 'react';
import { X, History, ArrowRight } from 'lucide-react';

export default function OrderHistoryUpdateModal({ isOpen, onClose, orderId }) {
    if (!isOpen) return null;

    // Mock dữ liệu lịch sử chỉnh sửa
    const historyData = [
        {
            id: 1,
            author: "Lê Văn C",
            time: "04:00 PM - 04/02/2024",
            field: "Màu sắc",
            oldValue: "Xanh",
            newValue: "Đỏ"
        },
        {
            id: 2,
            author: "Trần Thị B",
            time: "10:20 AM - 05/02/2024",
            field: "Giá mong muốn",
            oldValue: "18,000/chiếc",
            newValue: "20,000/chiếc"
        },
        {
            id: 3,
            author: "Trần Thị C",
            time: "10:20 AM - 05/02/2024",
            field: "Giá mong muốn",
            oldValue: "15,000/chiếc",
            newValue: "19,000/chiếc"
        }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[85vh]">

                {/* Header */}
                <div className="p-6 border-b flex justify-between items-start">
                    <div className="flex gap-4">
                        <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                            <History size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Lịch sử chỉnh sửa</h3>
                            <p className="text-sm text-gray-500">Đơn hàng #{orderId} - {historyData.length} lần chỉnh sửa</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Danh sách lịch sử (Scrollable) */}
                <div className="p-6 overflow-y-auto space-y-6 bg-gray-50/30 flex-1">
                    {historyData.map((item) => (
                        <div key={item.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                            {/* Thông tin người sửa và thời gian */}
                            <div className="flex justify-between mb-4 border-b border-gray-50 pb-2">
                                <span className="font-bold text-gray-800 text-sm">{item.author}</span>
                                <span className="text-xs text-gray-400">{item.time}</span>
                            </div>

                            {/* So sánh giá trị cũ - mới */}
                            <div className="grid grid-cols-12 items-center gap-2">
                                <div className="col-span-3">
                                    <p className="text-xs text-gray-400 mb-1">Trường chỉnh sửa</p>
                                    <p className="font-bold text-gray-700 text-sm">{item.field}</p>
                                </div>

                                <div className="col-span-4 bg-red-50 p-2 rounded-lg text-center">
                                    <p className="text-[10px] text-red-400 uppercase font-semibold">Giá trị cũ</p>
                                    <p className="text-red-600 text-sm line-through">{item.oldValue}</p>
                                </div>

                                <div className="col-span-1 flex justify-center text-gray-400">
                                    <ArrowRight size={18} />
                                </div>

                                <div className="col-span-4 bg-emerald-50 p-2 rounded-lg text-center border border-emerald-100">
                                    <p className="text-[10px] text-emerald-400 uppercase font-semibold">Giá trị mới</p>
                                    <p className="text-emerald-700 text-sm font-bold">{item.newValue}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-white flex justify-end rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="px-8 py-2 border border-gray-200 text-gray-600 font-semibold rounded-lg hover:bg-gray-50 transition-all active:scale-95"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
}