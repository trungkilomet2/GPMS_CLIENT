import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ImagePlus } from 'lucide-react';

const UNIT_OPTIONS = ['Mét', 'Cái', 'Cuộn', 'Bộ', 'Kg', 'Tấm', 'Yards', 'Hộp', 'Cặp'];

export default function AddMaterialModal({ isOpen, onClose, onSave, formData, onChange, editingIndex }) {
  const [errors, setErrors] = useState({});
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setErrors({});
    if (formData.imagePreview) {
      setPreview(formData.imagePreview);
      return;
    }
    if (formData.image) {
      setPreview(formData.image);
      return;
    }
    setPreview(null);
  }, [isOpen, editingIndex, formData.image, formData.imagePreview]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        setErrors((prev) => ({ ...prev, image: 'Chỉ chấp nhận ảnh JPG/JPEG/PNG' }));
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, image: 'Ảnh quá lớn (tối đa 2MB)' }));
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);
      onChange({ target: { name: 'imageFile', value: file } });
      onChange({ target: { name: 'imagePreview', value: previewUrl } });
    }
  };

  const isDecimalUom = (uom) => ['Mét', 'Kg', 'Yards'].includes(uom);
  const normalizeNumber = (val) => {
    if (val === null || val === undefined) return NaN;
    const s = String(val).replace(',', '.').trim();
    return Number(s);
  };

  const handleValidateAndSave = async () => {
    const newErrors = {};

    if (!formData.materialName?.trim()) {
      newErrors.materialName = 'Tên vật liệu không được để trống';
    }
    const parsedValue = normalizeNumber(formData.value);
    if (!formData.value || Number.isNaN(parsedValue) || parsedValue <= 0) {
      newErrors.value = 'Số lượng phải lớn hơn 0';
    } else if (!isDecimalUom(formData.uom) && !Number.isInteger(parsedValue)) {
      newErrors.value = 'Đơn vị này chỉ cho phép số nguyên';
    }
    if (!formData.uom) {
      newErrors.uom = 'Vui lòng chọn đơn vị tính';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    await onSave();
  };

  const handleInputChange = (e) => {
    const { name } = e.target;
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
    onChange(e);
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-lg font-bold text-slate-900">
            {editingIndex === null ? 'Thêm vật liệu mới' : 'Chỉnh sửa vật liệu'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-500 hover:text-slate-700"
          >
            Đóng
          </button>
        </div>

        <div className="mt-5 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">Ảnh vật liệu</label>
            <div className="flex items-center gap-4">
              <div className="h-24 w-24 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {preview ? (
                  <img src={preview} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-300">
                    <ImagePlus size={20} />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                  <span>Chọn ảnh</span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".jpg,.jpeg,.png"
                    className="hidden"
                  />
                </label>
                <div className="text-[11px] text-slate-500">JPG/JPEG/PNG, tối đa 2MB</div>
                {errors.image && (
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                    <AlertCircle size={12} /> {errors.image}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-sm font-bold text-slate-700">Tên vật liệu <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="materialName"
                value={formData.materialName || ''}
                onChange={handleInputChange}
                className={`w-full rounded-xl border px-4 py-2.5 text-sm transition-all outline-none ${errors.materialName ? 'border-red-500 bg-red-50/30 focus:ring-2 focus:ring-red-100' : 'border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 bg-white'}`}
                placeholder="Ví dụ: Vải cotton, Chỉ tơ..."
              />
              {errors.materialName && (
                <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                  <AlertCircle size={12} /> {errors.materialName}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700">Màu sắc</label>
              <input
                type="text"
                name="color"
                value={formData.color || ''}
                onChange={handleInputChange}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition-all outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 bg-white"
                placeholder="Ví dụ: Trắng, #FFFFFF"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700">Số lượng <span className="text-red-500">*</span></label>
              <input
                type="number"
                name="value"
                value={formData.value || ''}
                onChange={handleInputChange}
                step={isDecimalUom(formData.uom) ? '0.01' : '1'}
                className={`w-full rounded-xl border px-4 py-2.5 text-sm transition-all outline-none ${errors.value ? 'border-red-500 bg-red-50/30 focus:ring-2 focus:ring-red-100' : 'border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 bg-white'}`}
              />
              {errors.value && (
                <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                  <AlertCircle size={12} /> {errors.value}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700">Đơn vị <span className="text-red-500">*</span></label>
              <select
                name="uom"
                value={formData.uom || ''}
                onChange={handleInputChange}
                className={`w-full rounded-xl border px-4 py-2.5 text-sm transition-all outline-none bg-white ${errors.uom ? 'border-red-500 bg-red-50/30 focus:ring-2 focus:ring-red-100' : 'border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'}`}
              >
                <option value="">-- Chọn --</option>
                {UNIT_OPTIONS.map((unit) => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
              {errors.uom && (
                <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                  <AlertCircle size={12} /> {errors.uom}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-sm font-bold text-slate-700">Ghi chú</label>
              <textarea
                name="note"
                rows={2}
                value={formData.note || ''}
                onChange={handleInputChange}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition-all outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 bg-white"
                placeholder="Ví dụ: cắt dư 2%, ưu tiên lô màu #A1B2..."
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3 justify-end border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 font-bold text-slate-500 hover:text-slate-700 transition-colors"
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
