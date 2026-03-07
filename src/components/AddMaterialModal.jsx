import React from 'react';

// Danh sách đơn vị đo lường phổ biến trong ngành may
const UNIT_OPTIONS = [
    'Mét',
    'Cái',
    'Cuộn',
    'Bộ',
    'Kg',
    'Tấm',
    'Yards',
    'Hộp',
    'Cặp'
];

export default function AddMaterialModal({ isOpen, onClose, onSave, formData, onChange, editingIndex }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 backdrop-blur-md bg-white/10 flex items-center justify-center z-50 transition-all">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 p-6 border border-gray-100 animate-in fade-in zoom-in duration-200">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">
                    {editingIndex === null ? 'Thêm vật liệu mới' : 'Chỉnh sửa vật liệu'}
                </h3>

                <div className="space-y-4">
                    {/* Tên vật liệu */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tên vật liệu</label>
                        <input
                            type="text"
                            name="materialName"
                            value={formData.materialName || ''}
                            onChange={onChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            placeholder="Ví dụ: Vải cotton, Chỉ tơ..."
                        />
                    </div>

                    {/* Số lượng */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng</label>
                        <input
                            type="number"
                            name="quantity"
                            value={formData.quantity || ''}
                            onChange={onChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            placeholder="Nhập số lượng..."
                            min="1"
                        />
                    </div>

                    {/* Đơn vị (Dropdown) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Đơn vị tính</label>
                        <select
                            name="uom"
                            value={formData.uom || ''}
                            onChange={onChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white cursor-pointer"
                        >
                            <option value="">-- Chọn đơn vị --</option>
                            {UNIT_OPTIONS.map((unit) => (
                                <option key={unit} value={unit}>
                                    {unit}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="mt-8 flex gap-3 justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        onClick={onSave}
                        className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold shadow-md shadow-emerald-100 transition-all active:scale-95"
                    >
                        {editingIndex === null ? 'Thêm vật liệu' : 'Lưu thay đổi'}
                    </button>
                </div>
            </div>
        </div>
    );
}