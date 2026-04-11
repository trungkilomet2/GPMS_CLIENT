import { Plus, FileText, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import AddMaterialModal from '@/components/orders/AddMaterialModal';
import MaterialsTable from '@/components/orders/MaterialsTable';
import { MATERIALS_TABLE_EMPTY_TEXT } from '@/lib/orders/materials';

const SIZE_COLUMNS = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
const REQUIRED_FIELDS = ['orderName', 'cpu', 'startDate', 'endDate'];

export function OrderFormSections({
  orderData,
  errors,
  onOrderChange,
  orderImagePreview,
  orderImageValue,
  onOrderImageChange,
  materials,
  onOpenMaterialModal,
  onEditMaterial,
  onDeleteMaterial,
  templateItems,
  onTemplateFileChange,
  onTemplateMetaChange,
  onRemoveTemplateItem,
  totalCost,
  isSubmitting,
  onCancel,
  variants,
  onAddVariant,
  onRemoveVariant,
  onVariantChange,
  materialModalProps,
  submitLabel = 'Xác nhận tạo đơn',
  submitIcon = <Plus size={20} />,
}) {
  return (
    <>
      <div className="space-y-8">
        {/* MAIN ORDER CARD */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 uppercase tracking-tight">
              <FileText size={20} className="text-green-600" /> THÔNG TIN ĐƠN HÀNG
            </h2>
          </div>

          <div className="p-6 space-y-10">
            {/* Section 1: Basic Info */}
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-1.5 h-6 bg-green-500 rounded-full" />
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">1. Thông tin chung</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-8">
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-3 block uppercase tracking-widest">Ảnh sản phẩm</label>
                  <div className="relative group">
                    <div className="w-full aspect-square rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden transition-all group-hover:border-emerald-400 group-hover:bg-emerald-50/20 shadow-sm">
                      {orderImagePreview || orderImageValue ? (
                        <img src={orderImagePreview || orderImageValue} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center p-4">
                          <Plus size={24} className="mx-auto text-slate-300 mb-2" />
                          <span className="text-[10px] text-slate-400 font-bold block">Tải ảnh lên</span>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      onChange={onOrderImageChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                  {errors.image && <p className="text-[10px] text-red-500 font-bold mt-2 ml-1">{errors.image}</p>}
                </div>

                <div className="space-y-6">
                  <OrderInput
                    label="Tên đơn hàng"
                    name="orderName"
                    value={orderData.orderName}
                    onChange={onOrderChange}
                    error={errors.orderName}
                    placeholder="Ví dụ: Áo thun Polo Nam V2"
                    required
                  />

                  <div className="flex items-center gap-2 pt-2">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest px-2">Kế hoạch sản xuất</span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <OrderInput
                      label="Ngày bắt đầu"
                      name="startDate"
                      type="date"
                      value={orderData.startDate}
                      onChange={onOrderChange}
                      error={errors.startDate}
                      required
                    />
                    <OrderInput
                      label="Hạn hoàn thành"
                      name="endDate"
                      type="date"
                      value={orderData.endDate}
                      onChange={onOrderChange}
                      error={errors.endDate}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Variants Table */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-green-500 rounded-full" />
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                    2. Chi tiết kích thước & màu sắc <span className="text-red-500">*</span>
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={onAddVariant}
                  className="px-4 py-2 text-[11px] font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 transition-all shadow-md shadow-green-100 flex items-center gap-2 active:scale-95"
                >
                  <Plus size={14} /> Thêm phối màu
                </button>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white ml-1">
                <div className="overflow-x-auto">
                  <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                    <table className="w-full border-collapse">
                      <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="py-4 px-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-48 text-left">Phối màu</th>
                          {SIZE_COLUMNS.map(size => (
                            <th key={size} className="py-4 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">{size}</th>
                          ))}
                          <th className="py-4 pr-5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest w-16">Xóa</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-100">
                        {variants.map((v, idx) => (
                          <tr key={v.id || idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-4 px-5">
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={v.color || ''}
                                  onChange={(e) => onVariantChange(idx, 'color', e.target.value)}
                                  placeholder="Màu..."
                                  className={`w-full bg-transparent border-b-2 px-1 py-1 text-sm font-bold outline-none transition focus:border-emerald-500 focus:text-slate-900
                                    ${errors.variants?.[idx]?.color ? 'border-red-300 text-red-600' : 'border-slate-200 text-slate-700'}`}
                                />
                              </div>
                              {errors.variants?.[idx]?.color && (
                                <p className="text-[9px] text-red-500 font-bold mt-1 pl-6">{errors.variants[idx].color}</p>
                              )}
                            </td>
                            {SIZE_COLUMNS.map(size => (
                              <td key={size} className="py-4 px-2">
                                <div className="flex justify-center">
                                  <input
                                    type="text"
                                    value={v[size.toLowerCase()] || ''}
                                    onChange={(e) => {
                                      const val = e.target.value.replace(/[^0-9]/g, '');
                                      onVariantChange(idx, size.toLowerCase(), val === '' ? '' : Number(val));
                                    }}
                                    className={`w-14 h-10 rounded-xl border-2 text-center text-sm font-black transition-all outline-none
                                      ${v[size.toLowerCase()] > 0
                                        ? 'border-green-500 bg-green-50 text-green-700 shadow-sm ring-2 ring-green-500/10'
                                        : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 focus:border-green-400 focus:text-slate-900'
                                      }`}
                                  />
                                </div>
                              </td>
                            ))}
                            <td className="py-4 pr-5 text-right">
                              <button
                                type="button"
                                onClick={() => onRemoveVariant(idx)}
                                disabled={variants.length <= 1}
                                className="p-2 text-slate-300 hover:text-rose-500 disabled:opacity-0 transition-all rounded-xl hover:bg-rose-50 hover:scale-110"
                                title="Xóa phối màu"
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              {errors.variantsGlobal && (
                <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs font-bold text-red-600">
                  <AlertCircle size={16} /> {errors.variantsGlobal}
                </div>
              )}
            </div>

            {/* Section 3: Cost / Summary */}
            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tổng sản phẩm</label>
                <div className="relative">
                  <input
                    type="text"
                    value={orderData.quantity ?? 0}
                    readOnly
                    className="block w-full border border-slate-100 rounded-xl px-4 py-3 text-lg font-black bg-slate-50 text-green-600 shadow-inner"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300 uppercase">SP</span>
                </div>
                {errors.quantity && <p className="text-[10px] text-red-500 font-bold mt-1">{errors.quantity}</p>}
              </div>

              <OrderInput
                label="Đơn giá / Sản phẩm"
                name="cpu"
                type="number"
                value={orderData.cpu}
                onChange={onOrderChange}
                error={errors.cpu}
                placeholder="0"
                suffix="VND"
                required
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Thanh toán dự kiến</label>
                <div className="relative">
                  <input
                    type="text"
                    value={totalCost.toLocaleString('vi-VN')}
                    readOnly
                    className="block w-full border border-slate-100 rounded-xl px-4 py-3 text-lg font-black bg-green-600 text-white shadow-lg shadow-green-100"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold opacity-70">VND</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* DESIGN TEMPLATES CARD */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
            <div className="w-1.5 h-6 bg-green-600 rounded-full" />
            <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Mẫu thiết kế (Tech pack)</h2>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 border-dashed transition-all hover:bg-slate-100">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400">
                <Plus size={24} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-700">Tải lên tài liệu kỹ thuật</p>
                <p className="text-[11px] text-slate-500">Hỗ trợ PDF, DXF, Word, Excel, Hình ảnh (Tối đa 10MB)</p>
              </div>
              <label className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm active:scale-95 transition-all">
                Chọn tệp
                <input type="file" multiple accept=".dxf,.iba,.mdl,.plt,.pdf,.docx,.xlsx,.png,.jpg,.jpeg" onChange={onTemplateFileChange} className="hidden" />
              </label>
            </div>

            {templateItems.length > 0 && (
              <div className="max-h-[350px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                <div className="space-y-3">
                  {templateItems.map((item, idx) => {
                    const isImage = item.type === 'IMAGE';
                    const previewUrl = isImage ? (item.fileUrl || (item.file instanceof File ? URL.createObjectURL(item.file) : null)) : null;

                    return (
                      <div key={item.id || `template-${idx}`} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3 rounded-2xl border border-slate-100 bg-white shadow-sm hover:border-green-200 hover:shadow-md transition-all group">
                        {/* PREVIEW AREA */}
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden border border-slate-100 shadow-inner group-hover:bg-white transition-colors">
                          {isImage && previewUrl ? (
                            <img src={previewUrl} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                          ) : (
                            <div className="text-center">
                              <FileText size={24} className={isImage ? "text-amber-500" : "text-emerald-500"} />
                              <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-tight">{isImage ? 'Image' : 'Docs'}</p>
                            </div>
                          )}
                        </div>

                        {/* CONTENT AREA */}
                        <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tên mẫu thiết kế</label>
                            <input
                              type="text"
                              value={item.templateName ?? ''}
                              onChange={(e) => onTemplateMetaChange(idx, 'templateName', e.target.value)}
                              placeholder="Ví dụ: Rập thân trước..."
                              className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none transition
                                ${errors.templates?.[idx]?.templateName ? 'border-red-300 bg-red-50/20' : 'border-slate-100 bg-slate-50/30 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/5'}`}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Ghi chú kỹ thuật</label>
                            <input
                              type="text"
                              value={item.note ?? ''}
                              onChange={(e) => onTemplateMetaChange(idx, 'note', e.target.value)}
                              placeholder="Khổ A4, in 2 mặt..."
                              className="w-full border border-slate-100 bg-slate-50/30 rounded-xl px-3 py-2 text-xs font-medium outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/5"
                            />
                          </div>
                        </div>

                        {/* ACTIONS */}
                        <div className="flex flex-row sm:flex-col items-center justify-center gap-2 pr-2">
                          <button
                            type="button"
                            onClick={() => onRemoveTemplateItem(idx)}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                            title="Xóa mẫu"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MATERIALS CARD */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-green-600 rounded-full" />
              <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Vật liệu sản xuất</h2>
            </div>
            <button
              type="button"
              onClick={onOpenMaterialModal}
              className="px-5 py-2.5 bg-green-600 text-white text-xs font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-100 flex items-center gap-2 transition-all active:scale-95"
            >
              <Plus size={16} /> Thêm vật liệu
            </button>
          </div>

          <div className="overflow-x-auto">
            <MaterialsTable
              materials={materials}
              variant="create"
              showImage
              showActions
              emptyText={MATERIALS_TABLE_EMPTY_TEXT.create}
              onEdit={onEditMaterial}
              onDelete={onDeleteMaterial}
              errors={errors.materialsList}
            />
          </div>
          {errors.materials && <div className="mt-4 p-3 rounded-xl bg-red-50 text-red-600 text-xs font-bold flex items-center gap-2"><AlertCircle size={16} /> {errors.materials}</div>}
        </div>

        {/* FINAL NOTES CARD */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm border-l-8 border-l-green-500">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={20} className="text-green-500" />
            <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Ghi chú sản xuất</h2>
          </div>
          <textarea
            name="note"
            rows={3}
            maxLength={255}
            value={orderData.note}
            onChange={onOrderChange}
            placeholder="Mô tả yêu cầu đặc biệt về quy trình, đóng gói hoặc lưu ý đường may..."
            className="block w-full border border-slate-100 bg-slate-50/50 rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/5 transition-all resize-none"
          />
          <div className="flex justify-between items-center mt-3">
            {errors.note ? <p className="text-xs text-red-500 font-bold flex items-center gap-1"><AlertCircle size={14} /> {errors.note}</p> : <span />}
            <span className={`text-[10px] font-bold ${(orderData.note?.length ?? 0) > 230 ? 'text-amber-500' : 'text-slate-400'}`}>
              {orderData.note?.length ?? 0} / 255 ký tự
            </span>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex gap-4 justify-end pt-4 pb-12">
          <button type="button" onClick={onCancel} disabled={isSubmitting} className="px-10 py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors uppercase tracking-widest text-xs">Hủy bỏ</button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-12 py-3.5 bg-green-600 text-white font-bold rounded-2xl hover:bg-green-700 shadow-xl shadow-green-100 flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : submitIcon}
            <span className="uppercase tracking-widest text-xs">{isSubmitting ? 'Đang xử lý...' : submitLabel}</span>
          </button>
        </div>
      </div>

      <AddMaterialModal
        isOpen={materialModalProps?.isOpen}
        onClose={materialModalProps?.onClose}
        onSave={materialModalProps?.onSave}
        formData={materialModalProps?.formData}
        onChange={materialModalProps?.onChange}
        editingIndex={materialModalProps?.editingIndex}
      />
    </>
  );
}

export function OrderInput({
  label,
  name,
  value,
  onChange,
  type = 'text',
  placeholder,
  error,
  suffix,
  readOnly = false,
  required,
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          type={type}
          name={name}
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
          readOnly={readOnly}
          className={`block w-full border rounded-xl px-4 py-3 text-sm font-semibold transition-all outline-none
            ${readOnly
              ? 'bg-slate-50 text-slate-500 border-slate-100'
              : error
                ? 'border-red-300 bg-red-50/30 focus:border-red-500'
                : 'border-slate-100 bg-slate-50/50 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/5'
            }`}
        />
        {suffix && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">{suffix}</span>}
      </div>
      {error && <p className="text-[10px] text-red-500 font-bold ml-1 flex items-center gap-1 leading-none"><AlertCircle size={12} /> {error}</p>}
    </div>
  );
}
