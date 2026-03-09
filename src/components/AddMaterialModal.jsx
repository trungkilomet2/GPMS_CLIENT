import React, { useState, useEffect, useRef } from 'react';

const UNIT_OPTIONS = ['Mét', 'Cái', 'Cuộn', 'Bộ', 'Kg', 'Tấm', 'Yards', 'Hộp', 'Cặp'];

export default function AddMaterialModal({ isOpen, onClose, onSave, formData, onChange, editingIndex }) {
    const [errors, setErrors] = useState({});
    const [preview, setPreview] = useState(null);
    const fileInputRef = useRef(null);

    // Cập nhật ảnh preview khi mở modal hoặc đổi vật liệu
    useEffect(() => {
        setErrors({});
        if (formData.image) {
            setPreview(formData.image);
        } else {
            setPreview(null);
        }
    }, [isOpen, editingIndex, formData.image]);

    if (!isOpen) return null;

    // Xử lý khi chọn file
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // Giới hạn 2MB
                setErrors(prev => ({ ...prev, image: "Ảnh quá lớn (tối đa 2MB)" }));
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result);
                // Gửi dữ liệu base64 về component cha qua hàm onChange
                onChange({ target: { name: 'image', value: reader.result } });
            };
            reader.readAsDataURL(file);
        }
    };

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

        onSave();
    };

    const handleInputChange = (e) => {
        const { name } = e.target;
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
        onChange(e);
    };

    return (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 flex items-center justify-center z-1000 transition-all p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-100 animate-in fade-in zoom-in duration-200">
                <h3 className="text-xl font-bold mb-6 text-gray-800 border-b pb-3">
                    {editingIndex === null ? 'Thêm vật liệu mới' : 'Chỉnh sửa vật liệu'}
                </h3>

                <div className="space-y-5">
                    {/* Phần Upload Ảnh */}
                    <div className="flex flex-col items-center justify-center gap-3">
                        <label className="text-sm font-bold text-gray-700 w-full text-left">Ảnh vật liệu</label>
                        <div
                            onClick={() => fileInputRef.current.click()}
                            className={`relative w-32 h-32 rounded-2xl border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden transition-all
                                ${preview ? 'border-emerald-500' : 'border-gray-300 hover:border-emerald-400 bg-gray-50'}`}
                        >
                            {preview ? (
                                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <div className="flex flex-col items-center text-gray-400">
                                    <span className="text-2xl">📷</span>
                                    <span className="text-[10px] font-medium uppercase mt-1">Tải ảnh</span>
                                </div>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                className="hidden"
                            />
                        </div>
                        {errors.image && <p className="text-[11px] text-red-600 font-medium">⚠️ {errors.image}</p>}
                    </div>

                    {/* Tên vật liệu */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-bold text-gray-700">Tên vật liệu <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            name="materialName"
                            value={formData.materialName || ''}
                            onChange={handleInputChange}
                            className={`w-full border rounded-xl px-4 py-2.5 transition-all outline-none ${errors.materialName ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'}`}
                            placeholder="Ví dụ: Vải cotton, Chỉ tơ..."
                        />
                        {errors.materialName && <p className="text-[11px] text-red-600 font-medium ml-1">⚠️ {errors.materialName}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Số lượng */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-bold text-gray-700">Số lượng <span className="text-red-500">*</span></label>
                            <input
                                type="number"
                                name="quantity"
                                value={formData.quantity || ''}
                                onChange={handleInputChange}
                                className={`w-full border rounded-xl px-4 py-2.5 transition-all outline-none ${errors.quantity ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'}`}
                            />
                            {errors.quantity && <p className="text-[11px] text-red-600 font-medium ml-1">⚠️ {errors.quantity}</p>}
                        </div>

                        {/* Đơn vị */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-bold text-gray-700">Đơn vị <span className="text-red-500">*</span></label>
                            <select
                                name="uom"
                                value={formData.uom || ''}
                                onChange={handleInputChange}
                                className={`w-full border rounded-xl px-4 py-2.5 transition-all outline-none bg-white cursor-pointer ${errors.uom ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'}`}
                            >
                                <option value="">-- Chọn --</option>
                                {UNIT_OPTIONS.map((unit) => (
                                    <option key={unit} value={unit}>{unit}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="mt-8 flex gap-3 justify-end border-t pt-4">
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
