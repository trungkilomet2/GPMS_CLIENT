import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import CloudinaryService from '@/services/CloudinaryService';
import OrderService from '@/services/OrderService';
import { userService } from '@/services/userService';
import { getStoredUser } from '@/lib/authStorage';
import OwnerLayout from '@/layouts/OwnerLayout';
import { OrderFormSections } from '@/pages/orders/components/OrderFormSections';
import OrderSuccessModal from '@/pages/orders/components/OrderSuccessModal';
import '@/styles/homepage.css';
import '@/styles/leave.css';

export default function CreateOrder() {
  const getUserId = () => {
    const user = getStoredUser();
    return user?.userId ?? user?.id ?? null;
  };

  const userId = getUserId();
  const navigate = useNavigate();

  const [profileCheck, setProfileCheck] = useState({ checking: true, missing: [] });

  useEffect(() => {
    let active = true;

    const checkProfile = async () => {
      try {
        const profile = await userService.getProfile();
        const email = profile?.email ?? '';
        const phone = profile?.phoneNumber ?? profile?.phone ?? '';
        const address = profile?.location ?? profile?.address ?? '';

        const missing = [];
        if (!String(email).trim()) missing.push('email');
        if (!String(phone).trim()) missing.push('số điện thoại');
        if (!String(address).trim()) missing.push('địa chỉ');

        if (active) setProfileCheck({ checking: false, missing });
      } catch (error) {
        if (active) setProfileCheck({ checking: false, missing: ['email', 'số điện thoại', 'địa chỉ'] });
      }
    };

    checkProfile();

    return () => {
      active = false;
    };
  }, []);

  const [materials, setMaterials] = useState([]);
  const [orderData, setOrderData] = useState({
    userId,
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
    color: '',
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

  const validateForm = () => {
    const newErrors = {};

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
    return Object.keys(newErrors).length === 0;
  };

  const handleOrderChange = (e) => {
    const { name, value } = e.target;
    const finalValue = (name === 'quantity' || name === 'cpu' || name === 'userId')
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
      color: materialFormData.color,
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

  const removeTemplateItem = (index) => {
    setTemplateItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (profileCheck.missing.length > 0) {
      alert('Vui lòng cập nhật email, số điện thoại và địa chỉ trước khi tạo đơn hàng.');
      return;
    }

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
          const imageUrl = m.imageFile
            ? (await CloudinaryService.uploadImage(m.imageFile))?.url || ''
            : (typeof m.image === 'string' && /^https?:\/\//i.test(m.image) ? m.image : '');

          return {
            materialName: m.materialName ?? '',
            image: imageUrl,
            value: Number(m.value) || 0,
            note: m.note ?? '',
            uom: m.uom ?? '',
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
        userId: Number(orderData.userId ?? userId) || 0,
        image: orderImageUrl || '',
        orderName: orderData.orderName ?? '',
        type: orderData.type ?? '',
        size: orderData.size ?? '',
        color: orderData.color ?? '',
        startDate: orderData.startDate ?? '',
        endDate: orderData.endDate ?? '',
        quantity: Number(orderData.quantity) || 0,
        cpu: Number(orderData.cpu) || 0,
        note: orderData.note ?? '',
        materials: materialsPayload,
        templates: templatesPayload,
      };
      console.log('CreateOrder payload:', payload);

      await OrderService.createOrder(payload);
      setIsSuccessOpen(true);
    } catch (error) {
      console.error('Lỗi API:', error.response?.data || error.message);
      alert('Lỗi: ' + (error.response?.data?.title || 'Không thể kết nối đến máy chủ'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <OwnerLayout>
      <div className="leave-page leave-list-page">
        <div className="leave-shell mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          {profileCheck.checking && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-slate-600">
                <Loader2 className="animate-spin text-emerald-600" size={20} />
                <div className="text-sm font-medium">Đang kiểm tra thông tin hồ sơ...</div>
              </div>
            </div>
          )}

          {!profileCheck.checking && profileCheck.missing.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-amber-500" size={20} />
                <div>
                  <div className="mb-1 font-bold text-slate-900">Cần cập nhật thông tin hồ sơ</div>
                  <div className="text-sm text-slate-600">
                    Vui lòng cập nhật đầy đủ email, số điện thoại và địa chỉ trước khi tạo đơn hàng.
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/profile/edit')}
                    className="mt-4 inline-flex items-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
                  >
                    Đi đến chỉnh sửa hồ sơ
                  </button>
                </div>
              </div>
            </div>
          )}

          {!profileCheck.checking && profileCheck.missing.length === 0 && (
            <>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Gửi yêu cầu đặt hàng</h1>
                  <p className="text-slate-600">Nhập thông tin để tạo đơn hàng mới.</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
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
                    color: materials[i].color ?? '',
                    value: materials[i].value ?? materials[i].quantity ?? '',
                    uom: materials[i].uom ?? '',
                    image: materials[i].image ?? '',
                    imageFile: null,
                    imagePreview: '',
                    note: materials[i].note ?? '',
                  });
                  setIsModalOpen(true);
                }}
                onDeleteMaterial={(i) => setMaterials(materials.filter((_, idx) => idx !== i))}
                templateItems={templateItems}
                onTemplateFileChange={handleTemplateFileChange}
                onTemplateMetaChange={updateTemplateMeta}
                onRemoveTemplateItem={removeTemplateItem}
                totalCost={totalCost}
                isSubmitting={isSubmitting}
                onCancel={() => navigate(-1)}
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
            </>
          )}

          <OrderSuccessModal
            isOpen={isSuccessOpen}
            onClose={() => {
              setIsSuccessOpen(false);
              navigate('/orders');
            }}
            onConfirm={() => {
              setIsSuccessOpen(false);
              navigate('/orders');
            }}
          />
        </div>
      </div>
    </OwnerLayout>
  );
}
