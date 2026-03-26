import { Plus, FileText, Loader2, AlertCircle } from 'lucide-react';
import AddMaterialModal from '@/components/orders/AddMaterialModal';
import MaterialsTable from '@/components/orders/MaterialsTable';
import { MATERIALS_TABLE_EMPTY_TEXT } from '@/lib/orders/materials';

const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
const REQUIRED_FIELDS = ['orderName', 'type', 'size', 'color', 'quantity', 'cpu', 'startDate', 'endDate'];
const TEMPLATE_NAME_HINT = 'Gợi ý tên: Rập áo thun mặt trước, Mockup logo ngực trái, Bảng thông số size.';
const TEMPLATE_NOTE_HINT = 'Gợi ý ghi chú: Khổ A4, in 2 màu, phiên bản V2, ưu tiên đường may cổ.';

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
  materialModalProps,
}) {
  return (
    <>
      <div className="space-y-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 border-b border-slate-100 pb-2 text-slate-900">Thông tin chung</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="text-sm font-bold text-slate-700 mb-2 block">Ảnh đơn hàng</label>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="w-24 h-24 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                  {orderImagePreview || orderImageValue ? (
                    <img src={orderImagePreview || orderImageValue} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-slate-300 text-[11px]">Chưa có ảnh</span>
                  )}
                </div>
                <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
                  <span>Chọn ảnh</span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    onChange={onOrderImageChange}
                    className="hidden"
                  />
                </label>
                <div className="text-[11px] text-slate-500">JPG/JPEG/PNG, tối đa 2MB</div>
              </div>
              {errors.image && (
                <div className="mt-2 flex items-center gap-1 text-[11px] text-red-600 font-semibold">
                  <AlertCircle size={12} /> {errors.image}
                </div>
              )}
            </div>

            <OrderInput
              label="Tên đơn hàng"
              name="orderName"
              value={orderData.orderName}
              onChange={onOrderChange}
              error={errors.orderName}
              placeholder="Ví dụ: Đơn hàng Sơ mi công sở Nam"
            />
            <OrderInput
              label="Loại sản phẩm"
              name="type"
              value={orderData.type}
              onChange={onOrderChange}
              error={errors.type}
              placeholder="Sơ mi, Quần tây..."
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-1">
                Kích thước <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  name="size"
                  value={orderData.size}
                  onChange={onOrderChange}
                  className={`block w-full border rounded-xl px-4 pr-4 py-2.5 text-sm transition-all outline-none
                    ${errors.size
                      ? 'border-red-500 bg-red-50/30 focus:ring-2 focus:ring-red-100'
                      : 'border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 bg-white'
                    }`}
                >
                  <option value="">Chọn kích thước</option>
                  {SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
              {errors.size && (
                <div className="flex items-center gap-1 text-[11px] text-red-600 font-semibold mt-1 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle size={12} /> {errors.size}
                </div>
              )}
            </div>

            <OrderInput
              label="Màu sắc"
              name="color"
              value={orderData.color}
              onChange={onOrderChange}
              error={errors.color}
              placeholder="Trắng, Xanh Navy..."
            />

            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
              <OrderInput
                label="Số lượng sản xuất"
                name="quantity"
                type="number"
                value={orderData.quantity}
                onChange={onOrderChange}
                error={errors.quantity}
                placeholder="Ví dụ: 100"
                suffix="sp"
              />
              <OrderInput
                label="Giá / sản phẩm"
                name="cpu"
                type="number"
                value={orderData.cpu}
                onChange={onOrderChange}
                error={errors.cpu}
                placeholder="Ví dụ: 15000"
                suffix="VND"
              />
              <OrderInput
                label="Tổng tiền đơn hàng"
                name="totalCost"
                type="text"
                value={totalCost.toLocaleString('vi-VN')}
                readOnly
                suffix="VND"
              />
            </div>

            <OrderInput
              label="Ngày bắt đầu"
              name="startDate"
              type="date"
              value={orderData.startDate}
              onChange={onOrderChange}
              error={errors.startDate}
            />
            <OrderInput
              label="Ngày kết thúc (Dự kiến)"
              name="endDate"
              type="date"
              value={orderData.endDate}
              onChange={onOrderChange}
              error={errors.endDate}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 border-b border-slate-100 pb-2 text-slate-900">Mẫu thiết kế</h2>
          <label className="text-sm font-bold text-slate-700 mb-2 block">Upload file mẫu</label>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
              <span>Chọn file</span>
              <input
                type="file"
                multiple
                accept=".dxf,.iba,.mdl,.plt,.pdf,.docx,.xlsx,.png,.jpg,.jpeg"
                onChange={onTemplateFileChange}
                className="hidden"
              />
            </label>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Định dạng: .dxf, .iba, .mdl, .plt, .pdf, .docx, .xlsx, .png, .jpg, .jpeg - tối đa 10MB/file</p>

          {templateItems.length > 0 ? (
            <div className="mt-3 max-h-112 space-y-3 overflow-y-auto pr-1">
              {templateItems.map((item, idx) => (
                <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-700">File #{idx + 1}</div>
                      <div className="truncate text-sm text-slate-600">{item.fileName}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveTemplateItem(idx)}
                      className="text-rose-600 text-xs font-semibold hover:text-rose-700"
                    >
                      Xóa
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">
                        Tên mẫu thiết kế
                      </label>
                      <input
                        type="text"
                        value={item.templateName ?? ''}
                        onChange={(e) => onTemplateMetaChange(idx, 'templateName', e.target.value)}
                        placeholder="Tên mẫu thiết kế"
                        className="w-full border rounded-lg px-3 py-2 text-sm outline-none border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                      />
                      <p className="mt-1 text-[11px] text-slate-500">{TEMPLATE_NAME_HINT}</p>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">
                        Ghi chú
                      </label>
                      <input
                        type="text"
                        value={item.note ?? ''}
                        onChange={(e) => onTemplateMetaChange(idx, 'note', e.target.value)}
                        placeholder="Ví dụ: Khổ A4, in 2 màu, phiên bản V2, ưu tiên đường may cổ..."
                        className="w-full border rounded-lg px-3 py-2 text-sm outline-none border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                      />
                      <p className="mt-1 text-[11px] text-slate-500">{TEMPLATE_NOTE_HINT}</p>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    Loại tự nhận diện: <span className="font-semibold text-slate-700">{item.type === 'IMAGE' ? 'Ảnh' : 'File'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-white px-3 py-3 text-xs text-slate-500">
              Chưa có file mẫu thiết kế nào.
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
            <h2 className="text-lg font-semibold text-slate-900">Vật liệu cung cấp</h2>
            <button
              type="button"
              onClick={onOpenMaterialModal}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
            >
              <span className="inline-flex items-center gap-2">
                <Plus size={18} /> Thêm vật liệu
              </span>
            </button>
          </div>

          {errors.materials && (
            <div className="mb-4 flex items-center gap-2 text-rose-600 text-sm font-medium bg-rose-50 p-2 rounded-md">
              <AlertCircle size={16} /> {errors.materials}
            </div>
          )}

          <div className="overflow-x-auto">
            <MaterialsTable
              materials={materials}
              variant="create"
              showImage
              showActions
              emptyText={MATERIALS_TABLE_EMPTY_TEXT.create}
              onEdit={onEditMaterial}
              onDelete={onDeleteMaterial}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm border-l-4 border-l-emerald-500">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-900">
            <FileText size={20} className="text-emerald-600" /> Ghi chú sản xuất
          </h2>
          <textarea
            name="note"
            rows={3}
            maxLength={255}
            value={orderData.note}
            onChange={onOrderChange}
            placeholder="Nhập yêu cầu đặc biệt về kỹ thuật, đường may hoặc đóng gói..."
            className={`block w-full border rounded-xl px-4 py-3 focus:ring-2 bg-slate-50/30 transition-all outline-none
              ${errors.note
                ? 'border-red-500 focus:ring-red-100'
                : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20'
              }`}
          />
          <div className="flex justify-between items-center mt-1">
            {errors.note ? (
              <div className="flex items-center gap-1 text-[11px] text-red-600 font-semibold animate-in fade-in slide-in-from-top-1">
                <AlertCircle size={12} /> {errors.note}
              </div>
            ) : (
              <span />
            )}
            <span className={`text-[11px] ${(orderData.note?.length ?? 0) > 240 ? 'text-amber-500 font-semibold' : 'text-slate-400'}`}>
              {orderData.note?.length ?? 0}/255
            </span>
          </div>
        </div>

        <div className="flex gap-4 justify-end pt-6 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-8 py-2.5 text-slate-500 font-bold hover:text-slate-700 disabled:opacity-50"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-10 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 flex items-center gap-2 transition-all active:scale-95 disabled:bg-emerald-400"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
            {isSubmitting ? 'Đang xử lý...' : 'Xác nhận tạo đơn'}
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
  const isRequired = typeof required === 'boolean' ? required : REQUIRED_FIELDS.includes(name);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-bold text-slate-700 flex items-center gap-1">
        {label} {isRequired && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          type={type}
          name={name}
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
          readOnly={readOnly}
          className={`block w-full border rounded-xl px-4 ${suffix ? 'pr-16' : 'pr-4'} py-2.5 text-sm transition-all outline-none
            ${readOnly
              ? 'bg-slate-50 text-slate-600'
              : error
                ? 'border-red-500 bg-red-50/30 focus:ring-2 focus:ring-red-100'
                : 'border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 bg-white'
            }`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <div className="flex items-center gap-1 text-[11px] text-red-600 font-semibold mt-1 animate-in fade-in slide-in-from-top-1">
          <AlertCircle size={12} /> {error}
        </div>
      )}
    </div>
  );
}


