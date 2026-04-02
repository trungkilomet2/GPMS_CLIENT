import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'react-toastify';
import CloudinaryService from '@/services/CloudinaryService';
import OwnerLayout from '@/layouts/OwnerLayout';
import { OrderFormSections, OrderInput } from '@/pages/orders/components/OrderFormSections';
import OrderSuccessModal from '@/pages/orders/components/OrderSuccessModal';
import ConfirmModal from '@/components/ConfirmModal';
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
  const [templateItems, setTemplateItems] = useState([]);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({
    show: false,
    type: null,
    index: null,
    title: '',
    desc: ''
  });

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
    if (orderData.cpu !== '' && Number(orderData.cpu) < 10) {
      newErrors.cpu = 'Giá / sản phẩm phải từ 10 trở lên';
    }

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
    if (Object.keys(newErrors).length > 0) {
      console.warn('Lỗi xác thực đơn hàng thủ công:', newErrors);
    }
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
    if (errors.materialsList && errors.materialsList[targetIndex]) {
      setErrors((prev) => {
        const newMaterialsList = prev.materialsList ? { ...prev.materialsList } : {};
        if (targetIndex !== null) delete newMaterialsList[targetIndex];
        return { ...prev, materialsList: newMaterialsList };
      });
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
      toast.warn('Chỉ chấp nhận ảnh JPG/JPEG/PNG');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.warn('Ảnh quá lớn (tối đa 2MB)');
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setOrderImageFile(file);
    setOrderImagePreview(previewUrl);
  };

  const ALLOWED_TEMPLATE_EXTENSIONS = ['.dxf', '.iba', '.mdl', '.plt', '.pdf', '.docx', '.xlsx', '.png', '.jpg', '.jpeg'];
  const IMAGE_TEMPLATE_EXTENSIONS = ['.png', '.jpg', '.jpeg'];
  const MAX_TEMPLATE_SIZE = 10 * 1024 * 1024;
  const getTemplateNameFromFile = (fileName = '') => fileName.replace(/\.[^/.]+$/, '') || fileName;
  const buildTemplateId = (file) => `${Date.now()}-${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`;
  const getFileExtension = (fileName = '') => {
    const parts = String(fileName).toLowerCase().split('.');
    return parts.length > 1 ? `.${parts.pop()}` : '';
  };
  const detectTemplateType = (file) => {
    const mime = String(file?.type || '').toLowerCase();
    if (mime.startsWith('image/')) return 'IMAGE';
    const ext = getFileExtension(file?.name || '');
    return IMAGE_TEMPLATE_EXTENSIONS.includes(ext) ? 'IMAGE' : 'FILE';
  };
  const uploadTemplateByType = (item) => {
    const normalizedType = String(item?.type || '').toUpperCase();
    if (normalizedType === 'IMAGE') return CloudinaryService.uploadImage(item.file);
    return CloudinaryService.uploadTemplateFile(item.file);
  };

  const handleTemplateFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const valid = [];
    const invalid = [];

    files.forEach((file) => {
      const lower = file.name.toLowerCase();
      const isAllowed = ALLOWED_TEMPLATE_EXTENSIONS.some((ext) => lower.endsWith(ext));
      const isSizeOk = file.size <= MAX_TEMPLATE_SIZE;
      const isNameOk = file.name.length <= 255;

      if (isAllowed && isSizeOk && isNameOk) {
        valid.push(file);
      } else {
        let reason = "Định dạng không hỗ trợ";
        if (!isSizeOk) reason = "Dung lượng vượt quá 10MB";
        else if (!isNameOk) reason = "Tên file quá 255 ký tự";
        
        invalid.push(`${file.name} (${reason})`);
      }
    });

    if (invalid.length > 0) {
      toast.error(invalid.join(', '));
    }

    if (valid.length > 0) {
      setTemplateItems((prev) => [
        ...prev,
        ...valid.map((file) => ({
          id: buildTemplateId(file),
          file,
          fileName: file.name,
          templateName: getTemplateNameFromFile(file.name),
          type: detectTemplateType(file),
          note: '',
        })),
      ]);
    }

    e.target.value = '';
  };

  const updateTemplateMeta = (index, field, value) => {
    setTemplateItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const handleDeleteMaterial = (index) => {
    setDeleteConfirm({
      show: true,
      type: 'material',
      index: index,
      title: 'Xác nhận xóa vật liệu',
      desc: 'Bạn có chắc chắn muốn xóa vật liệu này không? Hành động này sẽ gỡ bỏ mục này khỏi danh sách đơn hàng và không thể hoàn tác.'
    });
  };

  const removeTemplateItem = (index) => {
    setDeleteConfirm({
      show: true,
      type: 'template',
      index: index,
      title: 'Xác nhận xóa mẫu thiết kế',
      desc: 'Bạn có chắc chắn muốn xóa mẫu thiết kế này không? Hành động này sẽ gỡ bỏ mục này khỏi danh sách đơn hàng và không thể hoàn tác.'
    });
  };

  const executeDelete = () => {
    const { type, index } = deleteConfirm;
    if (type === 'material') {
      setMaterials((prev) => prev.filter((_, i) => i !== index));
      if (errors.materialsList) {
        setErrors((prev) => {
          const newMaterialsList = { ...prev.materialsList };
          delete newMaterialsList[index];
          const adjustedList = {};
          Object.keys(newMaterialsList).forEach((key) => {
            const k = parseInt(key);
            if (k > index) adjustedList[k - 1] = newMaterialsList[key];
            else adjustedList[k] = newMaterialsList[key];
          });
          return { ...prev, materialsList: adjustedList };
        });
      }
    } else if (type === 'template') {
      setTemplateItems((prev) => prev.filter((_, i) => i !== index));
    }
    setDeleteConfirm({ show: false, type: null, index: null, title: '', desc: '' });
  };

  const translateError = (msg) => {
    const dictionary = {
      'Image must be a valid URL': 'Ảnh phải là đường dẫn (URL) hợp lệ',
      'File must be a valid URL': 'Tệp tin phải là đường dẫn (URL) hợp lệ',
      'Start date must be greater than current date.': 'Ngày bắt đầu phải sau ngày hiện tại',
      'One or more validation errors occurred.': 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại',
    };
    return dictionary[msg] || msg;
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
          let imageUrl = m.image || null;
          if (m.imageFile) {
            const uploadRes = await CloudinaryService.uploadImage(m.imageFile);
            imageUrl = uploadRes?.url || null;
          } else if (typeof m.image === 'string' && !/^https?:\/\//i.test(m.image)) {
            imageUrl = null; // Ensure invalid strings/empty are null
          }

          return {
            materialName: m.materialName,
            value: Number(m.value) || 0,
            uom: m.uom,
            image: imageUrl,
            note: m.note ?? '',
          };
        })
      );

      const templatesPayload = [];
      if (templateItems.length > 0) {
        const uploadResults = await Promise.all(
          templateItems.map((item) => uploadTemplateByType(item))
        );
        uploadResults.forEach((res, idx) => {
          const url = res?.url || '';
          if (!url) return;
          const item = templateItems[idx];
          templatesPayload.push({
            templateName: item?.templateName?.trim() || getTemplateNameFromFile(item?.fileName || '') || 'Template',
            type: item?.type || detectTemplateType(item?.file),
            file: url,
            note: item?.note?.trim() || '',
          });
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
      setIsSuccessOpen(true);
    } catch (error) {
      console.error('Lỗi xử lý (CreateManualOrder):', error.response?.data || error.message);
      const data = error.response?.data;
      let errorMsg = 'Không thể kết nối đến máy chủ';
      
      if (data) {
        if (data.errors) {
          errorMsg = Object.values(data.errors)
            .flat()
            .map(translateError)
            .join(' - ');
        } else {
          errorMsg = translateError(data.detail || data.title || error.message);
        }
      }
      toast.error('Lỗi: ' + errorMsg);
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
              onClick={() => navigate('/orders/owner')}
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
                <OrderInput
                  label="Tên khách hàng"
                  name="customerName"
                  value={customerData.customerName}
                  onChange={handleCustomerChange}
                  error={errors.customerName}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  required
                />
                <OrderInput
                  label="Số điện thoại"
                  name="customerPhone"
                  value={customerData.customerPhone}
                  onChange={handleCustomerChange}
                  error={errors.customerPhone}
                  placeholder="Ví dụ: 0901 234 567"
                  required
                />
                <OrderInput
                  label="Địa chỉ"
                  name="customerAddress"
                  value={customerData.customerAddress}
                  onChange={handleCustomerChange}
                  error={errors.customerAddress}
                  placeholder="Ví dụ: 123 Lê Lợi, Q1, TP.HCM"
                  required
                />
              </div>
            </div>

            <OrderFormSections
              orderData={orderData}
              errors={errors}
              onOrderChange={handleOrderChange}
              orderImagePreview={orderImagePreview}
              orderImageValue={orderData.image}
              onOrderImageChange={handleOrderImageChange}
              materials={materials}
              onOpenMaterialModal={() => {
                setEditingIndex(null);
                setMaterialFormData({ materialName: '', color: '', value: '', uom: '', image: '', imageFile: null, imagePreview: '', note: '' });
                setIsModalOpen(true);
              }}
              onEditMaterial={(i) => {
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
              onDeleteMaterial={handleDeleteMaterial}
              templateItems={templateItems}
              onTemplateFileChange={handleTemplateFileChange}
              onTemplateMetaChange={updateTemplateMeta}
              onRemoveTemplateItem={removeTemplateItem}
              totalCost={totalCost}
              isSubmitting={isSubmitting}
              onCancel={() => navigate('/orders/owner')}
              materialModalProps={{
                isOpen: isModalOpen,
                onClose: () => setIsModalOpen(false),
                onSave: handleSaveMaterial,
                formData: materialFormData,
                onChange: (e) => setMaterialFormData((prev) => ({ ...prev, [e.target.name]: e.target.value })),
                editingIndex,
              }}
            />
          </form>
        </div>
      </div>

      <OrderSuccessModal
        isOpen={isSuccessOpen}
        title="Tạo đơn thủ công thành công"
        description="Đơn hàng thủ công đã được ghi nhận."
        onClose={() => {
          setIsSuccessOpen(false);
          navigate('/orders');
        }}
        onConfirm={() => {
          setIsSuccessOpen(false);
          navigate('/orders');
        }}
      />

      <ConfirmModal
        isOpen={deleteConfirm.show}
        title={deleteConfirm.title}
        description={deleteConfirm.desc}
        onConfirm={executeDelete}
        onClose={() => setDeleteConfirm({ show: false, type: null, index: null, title: '', desc: '' })}
      />
    </OwnerLayout>
  );
}
