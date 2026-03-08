import React, { useState, useEffect } from 'react';

const UNIT_OPTIONS = ['Mét', 'Cái', 'Cuộn', 'Bộ', 'Kg', 'Tấm', 'Yards', 'Hộp', 'Cặp'];

export default function AddMaterialModal({ isOpen, onClose, onSave, formData, onChange, editingIndex }) {
    // State quản lý lỗi cục bộ trong Modal
    const [errors, setErrors] = useState({});

    // Reset lỗi mỗi khi đóng/mở Modal hoặc đổi vật liệu đang sửa
    useEffect(() => {
        setErrors({});
    }, [isOpen, editingIndex]);

    if (!isOpen) return null;

    // Hàm kiểm tra dữ liệu trước khi lưu
    const handleValidateAndSave = () => {
        let newErrors = {};

        if (!formData.materialName?.trim()) {
            newErrors.materialName = "Tên vật liệu không được để trống";
        }
        if (!formData.quantity || Number(formData.quantity) <= 0) {
            newErrors.quantity = "Số lượng phải lớn hơn 0";
        }
        if (!formData.uom) {
            newErrors.uom = "Vui lòng chọn đơn vị tính";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        // Nếu không có lỗi, gọi hàm onSave từ props
        onSave();
    };

    // Xóa lỗi của field khi người dùng bắt đầu nhập liệu lại
    const handleInputChange = (e) => {
        const { name } = e.target;
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
        onChange(e);
    };

    return (
        <div className="fixed inset-0 backdrop-blur-md bg-white/10 flex items-center justify-center z-50 transition-all p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-100 animate-in fade-in zoom-in duration-200">
                <h3 className="text-xl font-bold mb-6 text-gray-800 border-b pb-3">
                    {editingIndex === null ? '📦 Thêm vật liệu mới' : '✏️ Chỉnh sửa vật liệu'}
                </h3>

                <div className="space-y-5">
                    {/* Tên vật liệu */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-bold text-gray-700">Tên vật liệu <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            name="materialName"
                            value={formData.materialName || ''}
                            onChange={handleInputChange}
                            className={`w-full border rounded-xl px-4 py-2.5 transition-all outline-none ${errors.materialName ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                                }`}
                            placeholder="Ví dụ: Vải cotton, Chỉ tơ..."
                        />
                        {errors.materialName && <p className="text-[11px] text-red-600 font-medium ml-1">⚠️ {errors.materialName}</p>}
                    </div>

                    {/* Số lượng */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-bold text-gray-700">Số lượng <span className="text-red-500">*</span></label>
                        <input
                            type="number"
                            name="quantity"
                            value={formData.quantity || ''}
                            onChange={handleInputChange}
                            className={`w-full border rounded-xl px-4 py-2.5 transition-all outline-none ${errors.quantity ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                                }`}
                            placeholder="Nhập số lượng..."
                        />
                        {errors.quantity && <p className="text-[11px] text-red-600 font-medium ml-1">⚠️ {errors.quantity}</p>}
                    </div>

                    {/* Đơn vị */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-bold text-gray-700">Đơn vị tính <span className="text-red-500">*</span></label>
                        <select
                            name="uom"
                            value={formData.uom || ''}
                            onChange={handleInputChange}
                            className={`w-full border rounded-xl px-4 py-2.5 transition-all outline-none bg-white cursor-pointer ${errors.uom ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                                }`}
                        >
                            <option value="">-- Chọn đơn vị --</option>
                            {UNIT_OPTIONS.map((unit) => (
                                <option key={unit} value={unit}>{unit}</option>
                            ))}
                        </select>
                        {errors.uom && <p className="text-[11px] text-red-600 font-medium ml-1">⚠️ {errors.uom}</p>}
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="mt-8 flex gap-3 justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 text-gray-500 font-bold hover:text-gray-700 transition-colors"
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        onClick={handleValidateAndSave}
                        className="px-8 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all active:scale-95"
                    >
                        {editingIndex === null ? 'Thêm ngay' : 'Cập nhật'}
                    </button>
                </div>
            </div>
        </div>
    );
}