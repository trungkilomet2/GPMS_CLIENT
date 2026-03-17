import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, FileText, Loader2, AlertCircle } from 'lucide-react';
import AddMaterialModal from '@/components/orders/AddMaterialModal';
import MaterialsTable from '@/components/orders/MaterialsTable';
import { MATERIALS_TABLE_EMPTY_TEXT } from '@/lib/orders/materials';
import CloudinaryService from '@/services/CloudinaryService';
import OwnerLayout from '@/layouts/OwnerLayout';
import '@/styles/homepage.css';
import '@/styles/leave.css';

export default function CreateManualOrder() {
  const navigate = useNavigate();

  const [customerData, setCustomerData] = useState({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
  });

  const [materials, setMaterials] = useState([]);
  const [orderData, setOrderData] = useState({
    image: '',
    orderName: '',
    type: '',
    size: '',
    color: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    quantity: '',
    cpu: '',
    note: '',
    status: 'Chờ xét duyệt',
  });

  const [errors, setErrors] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [materialFormData, setMaterialFormData] = useState({
    materialName: '',
    value: '',
    uom: '',
    image: '',
    imageFile: null,
    imagePreview: '',
    note: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderImageFile, setOrderImageFile] = useState(null);
  const [orderImagePreview, setOrderImagePreview] = useState('');
  const [templateFiles, setTemplateFiles] = useState([]);
  const [hardCopyQty, setHardCopyQty] = useState('');

  const validateForm = () => {
    const newErrors = {};

    if (!customerData.customerName?.trim()) newErrors.customerName = 'Vui lòng nhập tên khách hàng';
    if (!customerData.customerPhone?.trim()) newErrors.customerPhone = 'Vui lòng nhập số điện thoại';
    if (!customerData.customerAddress?.trim()) newErrors.customerAddress = 'Vui lòng nhập địa chỉ';

    if (!orderImageFile && !orderData.image) newErrors.image = 'Vui lòng chọn ảnh đơn hàng';
    if (!orderData.orderName?.trim()) newErrors.orderName = 'Tên đơn hàng không được để trống';
    else if (orderData.orderName.trim().length < 3 || orderData.orderName.trim().length > 50) {
      newErrors.orderName = 'Tên đơn hàng phải từ 3 đến 50 ký tự';
    }
    if (!orderData.type?.trim()) newErrors.type = 'Vui lòng nhập loại sản phẩm (vd: Sơ mi, Quần tây)';
    if (!orderData.size?.trim()) newErrors.size = 'Kích thước không được để trống';
    if (!orderData.color?.trim()) newErrors.color = 'Màu sắc không được để trống';
    if (orderData.quantity <= 0) newErrors.quantity = 'Số lượng sản xuất phải lớn hơn 0';
    if (orderData.cpu < 0) newErrors.cpu = 'Chi phí đơn vị không được âm';

    if (orderData.size.length > 5) newErrors.size = 'Kích thước quá dài, tối đa 5 ký tự';
    if (!orderData.startDate) {
      newErrors.startDate = 'Vui lòng chọn ngày bắt đầu';
    } else {
      const today = new Date();
      const todayStr = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString().split('T')[0];
      if (orderData.startDate < todayStr) {
        newErrors.startDate = 'Ngày bắt đầu không được trước ngày hiện tại';
      }
    }
    if (!orderData.endDate) {
      newErrors.endDate = 'Vui lòng chọn ngày kết thúc';
    } else if (orderData.startDate && new Date(orderData.startDate) > new Date(orderData.endDate)) {
      newErrors.endDate = 'Ngày kết thúc không được trước ngày bắt đầu';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCustomerChange = (e) => {
    const { name, value } = e.target;
    setCustomerData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleOrderChange = (e) => {
    const { name, value } = e.target;
    const finalValue = (name === 'quantity' || name === 'cpu')
      ? (value === '' ? '' : Number(value))
      : value;

    setOrderData((prev) => ({ ...prev, [name]: finalValue }));

    if (errors[name]) {
      setErrors((prev) => {
        const newErrs = { ...prev };
        delete newErrs[name];
        return newErrs;
      });
    }
  };

  const parseMaterialValue = (val) => {
    if (val === null || val === undefined) return 0;
    const s = String(val).replace(',', '.').trim();
    const n = Number(s);
    return Number.isNaN(n) ? 0 : n;
  };

  const handleSaveMaterial = async () => {
    const pendingMaterial = {
      materialName: materialFormData.materialName,
      value: parseMaterialValue(materialFormData.value),
      uom: materialFormData.uom,
      image: materialFormData.image || '',
      imageFile: materialFormData.imageFile || null,
      imagePreview: materialFormData.imagePreview || materialFormData.image || '',
      note: materialFormData.note?.trim() || '',
    };

    let targetIndex = editingIndex;
    if (editingIndex === null) {
      setMaterials((prev) => {
        targetIndex = prev.length;
        return [...prev, pendingMaterial];
      });
    } else {
      setMaterials((prev) => {
        const updated = [...prev];
        updated[editingIndex] = pendingMaterial;
        return updated;
      });
    }

    if (errors.materials) {
      setErrors((prev) => ({ ...prev, materials: null }));
    }
    setIsModalOpen(false);

    if (pendingMaterial.imageFile) {
      try {
        const uploadRes = await CloudinaryService.uploadImage(pendingMaterial.imageFile);
        const imageUrl = uploadRes?.url || '';
        if (imageUrl) {
          setMaterials((prev) => {
            const updated = [...prev];
            const idx = targetIndex;
            if (updated[idx]) {
              updated[idx] = {
                ...updated[idx],
                image: imageUrl,
                imageFile: null,
                imagePreview: imageUrl,
              };
            }
            return updated;
          });
        }
      } catch {
        // keep preview; user can edit to retry
      }
    }
  };

  const totalCost = (Number(orderData.quantity) || 0) * (Number(orderData.cpu) || 0);

  const handleOrderImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      alert('Chỉ chấp nhận ảnh JPG/JPEG/PNG');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Ảnh quá lớn (tối đa 2MB)');
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setOrderImageFile(file);
    setOrderImagePreview(previewUrl);
  };

  const ALLOWED_TEMPLATE_EXTENSIONS = ['.dxf', '.iba', '.mdl', '.plt', '.pdf', '.docx', '.xlsx'];
  const MAX_TEMPLATE_SIZE = 10 * 1024 * 1024;

  const handleTemplateFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const valid = [];
    const invalid = [];

    files.forEach((file) => {
      const lower = file.name.toLowerCase();
      const isAllowed = ALLOWED_TEMPLATE_EXTENSIONS.some((ext) => lower.endsWith(ext));
      const isSizeOk = file.size <= MAX_TEMPLATE_SIZE;
      if (isAllowed && isSizeOk) {
        valid.push(file);
      } else {
        invalid.push(file.name);
      }
    });

    if (invalid.length > 0) {
      alert(`File không hợp lệ (định dạng/size): ${invalid.join(', ')}`);
    }

    if (valid.length > 0) {
      setTemplateFiles((prev) => [...prev, ...valid]);
    }

    e.target.value = '';
  };

  const removeTemplateFile = (index) => {
    setTemplateFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      setIsSubmitting(true);
      let orderImageUrl = orderData.image;

      if (orderImageFile) {
        const uploadRes = await CloudinaryService.uploadImage(orderImageFile);
        orderImageUrl = uploadRes?.url || orderImageUrl;
      }

      const materialsPayload = await Promise.all(
        materials.map(async (m) => {
          if (m.imageFile) {
            const uploadRes = await CloudinaryService.uploadImage(m.imageFile);
            return {
              materialName: m.materialName,
              value: Number(m.value) || 0,
              uom: m.uom,
              image: uploadRes?.url || '',
              note: m.note ?? '',
            };
          }
          const isRemoteUrl = typeof m.image === 'string' && /^https?:\/\//i.test(m.image);
          return {
            materialName: m.materialName,
            value: Number(m.value) || 0,
            uom: m.uom,
            image: isRemoteUrl ? m.image : '',
            note: m.note ?? '',
          };
        })
      );

      const templatesPayload = [];
      if (templateFiles.length > 0) {
        const uploadResults = await Promise.all(
          templateFiles.map((file) => CloudinaryService.uploadTemplateFile(file))
        );
        uploadResults.forEach((res, idx) => {
          const url = res?.url || '';
          if (!url) return;
          templatesPayload.push({
            templateName: templateFiles[idx]?.name || 'Bản mềm',
            type: 'SOFT',
            file: url,
            quantity: null,
            note: '',
          });
        });
      }
      if (Number(hardCopyQty) > 0) {
        templatesPayload.push({
          templateName: 'Bản cứng',
          type: 'HARD',
          file: null,
          quantity: Number(hardCopyQty),
          note: '',
        });
      }

      const payload = {
        customer: { ...customerData },
        order: {
          ...orderData,
          image: orderImageUrl,
          materials: materialsPayload,
          templates: templatesPayload,
        },
      };

      console.log('Manual order payload (hardcode):', payload);
      alert('Tạo đơn thủ công thành công! (Hardcode, chưa gọi API)');
      navigate('/orders');
    } catch (error) {
      console.error('Lỗi xử lý:', error);
      alert('Lỗi: Không thể xử lý tạo đơn thủ công');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <OwnerLayout>
      <div className="leave-page leave-list-page">
        <div className="leave-shell mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Tạo đơn hàng thủ công</h1>
              <p className="text-slate-600">Nhập thông tin và tạo đơn hàng mới theo mẫu của xưởng.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4 border-b border-slate-100 pb-2 text-slate-900">Thông tin khách hàng</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Tên khách hàng" name="customerName" value={customerData.customerName} onChange={handleCustomerChange} error={errors.customerName} placeholder="Ví dụ: Nguyễn Văn A" />
                <Input label="Số điện thoại" name="customerPhone" value={customerData.customerPhone} onChange={handleCustomerChange} error={errors.customerPhone} placeholder="Ví dụ: 0901 234 567" />
                <Input label="Địa chỉ" name="customerAddress" value={customerData.customerAddress} onChange={handleCustomerChange} error={errors.customerAddress} placeholder="Ví dụ: 123 Lê Lợi, Q1, TP.HCM" />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4 border-b border-slate-100 pb-2 text-slate-900">Thông tin chung</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="text-sm font-bold text-slate-700 mb-2 block">Ảnh đơn hàng</label>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="w-24 h-24 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                      {orderImagePreview || orderData.image ? (
                        <img src={orderImagePreview || orderData.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-slate-300 text-[11px]">Chưa có ảnh</span>
                      )}
                    </div>
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
                      <span>Chọn ảnh</span>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png"
                        onChange={handleOrderImageChange}
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
                <Input label="Tên đơn hàng" name="orderName" value={orderData.orderName} onChange={handleOrderChange} error={errors.orderName} placeholder="Ví dụ: Đơn hàng Sơ mi công sở Nam" />
                <Input label="Loại sản phẩm" name="type" value={orderData.type} onChange={handleOrderChange} error={errors.type} placeholder="Sơ mi, Quần tây..." />
                <Input label="Kích thước" name="size" value={orderData.size} onChange={handleOrderChange} error={errors.size} placeholder="M, L, XL, XXL" />
                <Input label="Màu sắc" name="color" value={orderData.color} onChange={handleOrderChange} error={errors.color} placeholder="Trắng, Xanh Navy..." />
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Input label="Số lượng sản xuất" name="quantity" type="number" value={orderData.quantity} onChange={handleOrderChange} error={errors.quantity} placeholder="Ví dụ: 100" suffix="sp" />
                  <Input label="Giá / sản phẩm" name="cpu" type="number" value={orderData.cpu} onChange={handleOrderChange} error={errors.cpu} placeholder="Ví dụ: 15000" suffix="VND" />
                  <Input label="Tổng tiền đơn hàng" name="totalCost" type="text" value={totalCost.toLocaleString('vi-VN')} readOnly suffix="VND" />
                </div>
                <Input label="Ngày bắt đầu" name="startDate" type="date" value={orderData.startDate} onChange={handleOrderChange} error={errors.startDate} />
                <Input label="Ngày kết thúc (Dự kiến)" name="endDate" type="date" value={orderData.endDate} onChange={handleOrderChange} error={errors.endDate} />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4 border-b border-slate-100 pb-2 text-slate-900">Mẫu thiết kế</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-2 block">Bản mềm (upload file)</label>
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
                      <span>Chọn file</span>
                      <input
                        type="file"
                        multiple
                        accept=".dxf,.iba,.mdl,.plt,.pdf,.docx,.xlsx"
                        onChange={handleTemplateFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">Định dạng: .dxf, .iba, .mdl, .plt, .pdf, .docx, .xlsx — tối đa 10MB/file</p>
                  {templateFiles.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {templateFiles.map((file, idx) => (
                        <li key={`${file.name}-${idx}`} className="flex items-center justify-between text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                          <span className="truncate">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeTemplateFile(idx)}
                            className="text-rose-600 text-xs font-semibold hover:text-rose-700"
                          >
                            Xóa
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-2 block">Bản cứng (số lượng đã cung cấp)</label>
                  <input
                    type="number"
                    min="0"
                    value={hardCopyQty}
                    onChange={(e) => setHardCopyQty(e.target.value)}
                    placeholder="Ví dụ: 2"
                    className="w-full border rounded-xl px-4 py-2.5 text-sm transition-all outline-none border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                <h2 className="text-lg font-semibold text-slate-900">Vật liệu cung cấp</h2>
                <button
                  type="button"
                  onClick={() => {
                    setEditingIndex(null);
                    setMaterialFormData({ materialName: '', color: '', value: '', uom: '', image: '', imageFile: null, imagePreview: '', note: '' });
                    setIsModalOpen(true);
                  }}
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
                  onEdit={(i) => {
                    setEditingIndex(i);
                    setMaterialFormData({
                      materialName: materials[i].materialName ?? materials[i].name ?? '',
                      value: materials[i].value ?? materials[i].quantity ?? '',
                      uom: materials[i].uom ?? '',
                      image: materials[i].image ?? '',
                      imageFile: null,
                      imagePreview: '',
                      note: materials[i].note ?? '',
                    });
                    setIsModalOpen(true);
                  }}
                  onDelete={(i) => setMaterials(materials.filter((_, idx) => idx !== i))}
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
                value={orderData.note}
                onChange={handleOrderChange}
                placeholder="Nhập yêu cầu đặc biệt về kỹ thuật, đường may hoặc đóng gói..."
                className="block w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50/30 transition-all outline-none"
              />
            </div>

            <div className="flex gap-4 justify-end pt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={() => navigate(-1)}
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
          </form>
        </div>

        <AddMaterialModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveMaterial}
          formData={materialFormData}
          onChange={(e) => setMaterialFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))}
          editingIndex={editingIndex}
        />
      </div>
    </OwnerLayout>
  );
}

function Input({ label, name, value, onChange, type = 'text', placeholder, error, suffix, readOnly = false }) {
  const isRequired = ['orderName', 'type', 'size', 'color', 'quantity', 'cpu', 'startDate', 'endDate', 'customerName', 'customerPhone', 'customerAddress'].includes(name);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-bold text-slate-700 flex items-center gap-1">
        {label} {isRequired && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          type={type}
          name={name}
          value={value}
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
