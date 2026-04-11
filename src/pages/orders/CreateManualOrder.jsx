import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Users, AlertCircle } from 'lucide-react';
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
    province: null,
    ward: null,
    detail: '',
    customerAddress: '',
  });

  const [provinces, setProvinces] = useState([]);
  const [wards, setWards] = useState([]);

  // Fetch VN Provinces (v2)
  useEffect(() => {
    fetch('https://provinces.open-api.vn/api/v2/p/')
      .then(res => res.json())
      .then(data => setProvinces(data))
      .catch(() => {});
  }, []);

  // Cascading fetch for ALL Wards in a Province (v2, Bypassing Districts)
  useEffect(() => {
    if (customerData.province) {
      // In v2, depth=2 is used to get Wards directly from the Province object
      fetch(`https://provinces.open-api.vn/api/v2/p/${customerData.province.code}?depth=2`)
        .then(res => res.json())
        .then(data => {
          // In v2, 'wards' is directly a child of the province object
          setWards(data.wards || []);
        })
        .catch(() => {});
    } else {
      setWards([]);
    }
  }, [customerData.province]);

  // Auto-concatenate address
  useEffect(() => {
    const parts = [
      customerData.detail,
      customerData.ward?.name,
      customerData.province?.name
    ].filter(Boolean);
    setCustomerData(prev => ({ ...prev, customerAddress: parts.join(', ') }));
  }, [customerData.detail, customerData.ward, customerData.province]);

  const [materials, setMaterials] = useState([]);
  const [orderData, setOrderData] = useState({
    image: '',
    orderName: '',
    size: '',
    color: '',
    startDate: new Date().toLocaleDateString('sv-SE'),
    endDate: new Date().toLocaleDateString('sv-SE'),
    quantity: 0,
    cpu: '',
    note: '',
    status: 'Chờ xét duyệt',
  });

  const [variants, setVariants] = useState([
    { id: 1, color: '', xs: 0, s: 0, m: 0, l: 0, xl: 0, '2xl': 0, '3xl': 0 }
  ]);

  const handleAddVariant = () => {
    setVariants(prev => [
      ...prev,
      { id: Date.now(), color: '', xs: 0, s: 0, m: 0, l: 0, xl: 0, '2xl': 0, '3xl': 0 }
    ]);
  };

  const handleRemoveVariant = (index) => {
    if (variants.length <= 1) return;
    setDeleteConfirm({
      show: true,
      type: 'variant',
      index: index,
      title: 'Xác nhận xóa phối màu',
      desc: 'Bạn có chắc chắn muốn xóa phối màu này? Dữ liệu về số lượng các size của phối màu này sẽ bị mất.'
    });
  };

  const handleVariantChange = (index, field, value) => {
    setVariants(prev => prev.map((v, i) => i === index ? { ...v, [field]: value } : v));
    
    // Clear specific errors if they exist
    if (errors.variants?.[index]?.[field]) {
      setErrors(prev => {
        const next = { ...prev };
        const nextVariantsErrors = { ...next.variants };
        delete nextVariantsErrors[index][field];
        if (Object.keys(nextVariantsErrors[index]).length === 0) {
          delete nextVariantsErrors[index];
        }
        next.variants = nextVariantsErrors;
        return next;
      });
    }

    if (errors.variantsGlobal) {
      setErrors(prev => {
        const next = { ...prev };
        delete next.variantsGlobal;
        return next;
      });
    }
  };

  // Sync quantity automatically
  useState(() => {
    const total = variants.reduce((acc, v) => {
      const sum = ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl'].reduce((s, size) => s + (Number(v[size]) || 0), 0);
      return acc + sum;
    }, 0);
    setOrderData(prev => ({ ...prev, quantity: total }));
  }, [variants]);

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

    // VARIANTS
    const variantErrors = [];
    let hasAnyQuantity = false;
    variants.forEach((v, idx) => {
      const vErrs = {};
      if (!v.color?.trim()) vErrs.color = 'Vui lòng nhập tên màu';
      const sumSize = ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl'].reduce((s, size) => s + (Number(v[size]) || 0), 0);
      if (sumSize > 0) hasAnyQuantity = true;
      if (Object.keys(vErrs).length > 0) variantErrors[idx] = vErrs;
    });

    if (variantErrors.length > 0) newErrors.variants = variantErrors;
    if (!hasAnyQuantity) newErrors.variantsGlobal = 'Vui lòng nhập ít nhất một kích thước có số lượng > 0';
    if (orderData.quantity <= 0) newErrors.quantity = 'Số lượng sản xuất phải lớn hơn 0';
    if (orderData.cpu < 0) newErrors.cpu = 'Chi phí đơn vị không được âm';
    if (orderData.cpu !== '' && Number(orderData.cpu) < 10) {
      newErrors.cpu = 'Giá / sản phẩm phải từ 10 trở lên';
    }

    if (!orderData.startDate) {
      newErrors.startDate = 'Vui lòng chọn ngày bắt đầu';
    } else {
      const todayStr = new Date().toLocaleDateString('sv-SE');
      if (orderData.startDate < todayStr) {
        newErrors.startDate = 'Ngày bắt đầu không được trước ngày hiện tại';
      }
    }
    if (!orderData.endDate) {
      newErrors.endDate = 'Vui lòng chọn ngày kết thúc';
    } else if (orderData.startDate && new Date(orderData.startDate) > new Date(orderData.endDate)) {
      newErrors.endDate = 'Ngày kết thúc không được trước ngày bắt đầu';
    }

    // MATERIALS VALIDATION
    if (materials.length > 0) {
      const materialErrors = [];
      materials.forEach((m, idx) => {
        const mErrs = {};
        if (!m.image && !m.imageFile) mErrs.image = 'Vui lòng chọn ảnh vật liệu';
        if (!m.materialName?.trim()) {
          mErrs.materialName = 'Tên vật liệu là bắt buộc';
        }
        if (!m.value || isNaN(m.value) || Number(m.value) <= 0) {
          mErrs.value = 'Số lượng phải lớn hơn 0';
        }
        if (!m.uom?.trim()) {
          mErrs.uom = 'Đơn vị tính là bắt buộc';
        }
        if (Object.keys(mErrs).length > 0) {
          materialErrors[idx] = mErrs;
        }
      });
      if (materialErrors.length > 0) {
        newErrors.materialsList = materialErrors;
      }
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
    let { name, value } = e.target;
    if (name === 'quantity' || name === 'cpu') {
      value = value.replace(/[^0-9]/g, '');
    }
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

    const targetIndex = editingIndex !== null ? editingIndex : materials.length;
    if (editingIndex === null) {
      setMaterials((prev) => [...prev, pendingMaterial]);
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
        const newMaterialsList = { ...prev.materialsList };
        delete newMaterialsList[targetIndex];
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
            if (updated[targetIndex]) {
              updated[targetIndex] = {
                ...updated[targetIndex],
                image: imageUrl,
                imageFile: null,
                imagePreview: imageUrl,
              };
            }
            return updated;
          });
          // Also clear error if it was set during upload
          setErrors((prev) => {
            if (!prev.materialsList || !prev.materialsList[targetIndex]) return prev;
            const newMaterialsList = { ...prev.materialsList };
            delete newMaterialsList[targetIndex];
            return { ...prev, materialsList: newMaterialsList };
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
    } else if (type === 'variant') {
      setVariants((prev) => prev.filter((_, i) => i !== index));
      if (errors.variants) {
        setErrors((prev) => {
          const newVariants = { ...prev.variants };
          delete newVariants[index];
          const adjusted = {};
          Object.keys(newVariants).forEach((key) => {
            const k = parseInt(key);
            if (k > index) adjusted[k - 1] = newVariants[key];
            else adjusted[k] = newVariants[key];
          });
          return { ...prev, variants: adjusted };
        });
      }
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

      // Map variants to legacy fields
      const activeSizes = new Set();
      const activeColors = new Set();
      variants.forEach(v => {
        if (v.color?.trim()) activeColors.add(v.color.trim());
        ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl'].forEach(s => {
          if (v[s] > 0) activeSizes.add(s.toUpperCase());
        });
      });

      const payload = {
        customer: { ...customerData },
        order: {
          ...orderData,
          size: Array.from(activeSizes).join(', '),
          color: Array.from(activeColors).join(', '),
          image: orderImageUrl,
          materials: materialsPayload,
          templates: templatesPayload,
          variants: variants.map(v => ({
            color: v.color,
            xs: Number(v.xs) || 0,
            s: Number(v.s) || 0,
            m: Number(v.m) || 0,
            l: Number(v.l) || 0,
            xl: Number(v.xl) || 0,
            '2xl': Number(v['2xl']) || 0,
            '3xl': Number(v['3xl']) || 0,
          }))
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
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm space-y-8">
              <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                <Users size={20} className="text-emerald-500" />
                <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Thông tin khách hàng</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
              </div>

              <div className="pt-4 space-y-6">
                <div className="flex items-center gap-2 mb-2">
                   <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Địa chỉ giao hàng</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <OrderSelect
                    label="Tỉnh / Thành phố"
                    options={provinces.map(p => ({ value: p.code, label: p.name }))}
                    value={customerData.province?.code || ''}
                    onChange={(e) => {
                      const p = provinces.find(x => String(x.code) === String(e.target.value));
                      setCustomerData(prev => ({ ...prev, province: p, ward: null }));
                    }}
                    placeholder="Chọn Tỉnh/Thành"
                    error={errors.province}
                    required
                  />
                  <OrderSelect
                    label="Phường / Xã"
                    options={wards.map(w => ({ value: w.code, label: w.name }))}
                    value={customerData.ward?.code || ''}
                    onChange={(e) => {
                      const w = wards.find(x => String(x.code) === String(e.target.value));
                      setCustomerData(prev => ({ ...prev, ward: w }));
                    }}
                    placeholder="Chọn Phường/Xã"
                    error={errors.ward}
                    required
                    disabled={!customerData.province}
                  />
                </div>

                <OrderInput
                  label="Địa chỉ chi tiết"
                  name="detail"
                  value={customerData.detail}
                  onChange={(e) => setCustomerData(p => ({ ...p, detail: e.target.value }))}
                  placeholder="Số nhà, tên đường, tòa nhà..."
                />

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 italic">
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Xem trước địa chỉ hợp nhất (2025):</p>
                   <p className="text-xs font-bold text-slate-600">{customerData.customerAddress || "—"}</p>
                </div>
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
              variants={variants}
              onAddVariant={handleAddVariant}
              onRemoveVariant={handleRemoveVariant}
              onVariantChange={handleVariantChange}
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

export function OrderSelect({
  label,
  value,
  onChange,
  options = [],
  placeholder,
  error,
  required,
  disabled
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <select
          value={value ?? ''}
          onChange={onChange}
          disabled={disabled}
          className={`block w-full border rounded-xl px-4 py-3 text-sm font-semibold transition-all outline-none appearance-none cursor-pointer
            ${disabled
              ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
              : error
                ? 'border-red-300 bg-red-50/30 focus:border-red-500'
                : 'border-slate-100 bg-slate-50/50 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/5'
            }`}
        >
          <option value="" disabled>{placeholder}</option>
          {options.map((opt, i) => (
            <option key={i} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
          <ChevronRight size={16} className="rotate-90" />
        </div>
      </div>
      {error && <p className="text-[10px] text-red-500 font-bold ml-1 flex items-center gap-1 leading-none"><AlertCircle size={12} /> {error}</p>}
    </div>
  );
}
