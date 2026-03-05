import React from 'react';

export default function AddMaterialModal({ isOpen, onClose, onSave, formData, onChange, editingIndex }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 backdrop-blur-md bg-white/10 flex items-center justify-center z-10 transition-all">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 p-6 border border-gray-100">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">
                    {editingIndex === null ? 'Thêm vật liệu mới' : 'Sửa vật liệu'}
                </h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tên vật liệu</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={onChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500"
                            placeholder="Ví dụ: Vải cotton"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng</label>
                        <input
                            type="number"
                            name="qty"
                            value={formData.qty}
                            onChange={onChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500"
                            placeholder="Ví dụ: 150"
                            min="1"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Đơn vị</label>
                        <input
                            type="text"
                            name="uom"
                            value={formData.uom}
                            onChange={onChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500"
                            placeholder="Ví dụ: Mét / Cuộn / Cái"
                        />
                    </div>
                </div>

                <div className="mt-6 flex gap-3 justify-end">
                    <button type="button" onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-50">
                        Hủy
                    </button>
                    <button type="button" onClick={onSave} className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700">
                        {editingIndex === null ? 'Thêm' : 'Lưu'}
                    </button>
                </div>
            </div>
        </div>
    );
}