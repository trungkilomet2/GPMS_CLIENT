import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import CloudinaryService from '@/services/CloudinaryService';
import OrderService from '@/services/OrderService';
import { userService } from '@/services/userService';
import { getStoredUser } from '@/lib/authStorage';
import { getErrorMessage } from '@/utils/errorUtils';
import OwnerLayout from '@/layouts/OwnerLayout';
import { OrderFormSections } from '@/pages/orders/components/OrderFormSections';
import OrderSuccessModal from '@/pages/orders/components/OrderSuccessModal';
import ConfirmModal from '@/components/ConfirmModal';
import { getPrimaryWorkspaceRole, splitRoles } from '@/lib/internalRoleFlow';
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
        const roleValue = profile?.role || profile?.roles || '';
        const roles = splitRoles(roleValue);
        const primaryRole = getPrimaryWorkspaceRole(roles);

        const { email, phoneNumber, address } = profile || {};
        const missing = [];
        // If Customer, we strictly require Phone and Address as requested. 
        // Email is handled as secondary or optional here if not mentioned.
        if (primaryRole === 'customer') {
          if (!String(phoneNumber || "").trim()) missing.push('số điện thoại');
          if (!String(address || "").trim()) missing.push('địa chỉ');
        } else {
          // Internal staff (Owner, PM) still get the standard full check.
          if (!String(email || "").trim()) missing.push('email');
          if (!String(phoneNumber || "").trim()) missing.push('số điện thoại');
          if (!String(address || "").trim()) missing.push('địa chỉ');
        }

        if (active) setProfileCheck({ checking: false, missing });
      } catch (error) {
        if (active) {
          setProfileCheck({ checking: false, missing: ['email', 'số điện thoại', 'địa chỉ'] });
          console.error("Profile check failed:", error);
        }
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

  useEffect(() => {
    const total = variants.reduce((acc, v) => {
      const sum = ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl'].reduce((s, size) => s + (Number(v[size]) || 0), 0);
      return acc + sum;
    }, 0);
    setOrderData(prev => ({ ...prev, quantity: total }));
  }, [variants]);

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
      title: 'Xóa phối màu',
      desc: 'Bạn có chắc chắn muốn xóa phối màu này? Dữ liệu về số lượng các size của phối màu này sẽ bị mất.'
    });
  };

  const handleVariantChange = (index, field, value) => {
    setVariants(prev => prev.map((v, i) => i === index ? { ...v, [field]: value } : v));
    
    // Clear global variants error if any
    if (errors.variantsGlobal) {
      setErrors(prev => {
        const next = { ...prev };
        delete next.variantsGlobal;
        return next;
      });
    }
    // Clear specific variant error
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
  };

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
  const [deleteConfirm, setDeleteConfirm] = useState({
    show: false,
    type: null,
    index: null,
    title: '',
    desc: ''
  });

  const validateForm = () => {
    const newErrors = {};

    // IMAGE
    if (!orderImageFile && !orderData.image) newErrors.image = 'Vui lòng chọn ảnh đơn hàng';

    // ORDER_NAME: NOT NULL, NVARCHAR(100)
    if (!orderData.orderName?.trim()) {
      newErrors.orderName = 'Tên đơn hàng không được để trống';
    } else if (orderData.orderName.trim().length < 3) {
      newErrors.orderName = 'Tên đơn hàng phải có ít nhất 3 ký tự';
    } else if (orderData.orderName.trim().length > 100) {
      newErrors.orderName = 'Tên đơn hàng không được vượt quá 100 ký tự';
    }



    // VARIANTS VALIDATION
    const variantErrors = [];
    let hasAnyQuantity = false;
    variants.forEach((v, idx) => {
      const vErrs = {};
      if (!v.color?.trim()) {
        vErrs.color = 'Vui lòng nhập tên màu';
      }
      const sum = ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl'].reduce((s, size) => s + (Number(v[size]) || 0), 0);
      if (sum > 0) hasAnyQuantity = true;
      
      if (Object.keys(vErrs).length > 0) {
        variantErrors[idx] = vErrs;
      }
    });

    if (variantErrors.length > 0) {
      newErrors.variants = variantErrors;
    }
    if (!hasAnyQuantity) {
      newErrors.variantsGlobal = 'Vui lòng nhập ít nhất một kích thước có số lượng > 0';
    }

    // QUANTITY: INT NOT NULL, khoảng [100, 999] theo yêu cầu nghiệp vụ
    const qty = Number(orderData.quantity);
    if (orderData.quantity === '' || isNaN(qty)) {
      newErrors.quantity = 'Số lượng sản xuất không được để trống';
    } else if (!Number.isInteger(qty)) {
      newErrors.quantity = 'Số lượng phải là số nguyên';
    } else if (qty < 10) {
      newErrors.quantity = 'Số lượng sản xuất tối thiểu là 10 sản phẩm';
    } else if (qty > 9999) {
      newErrors.quantity = 'Số lượng sản xuất tối đa là 9999 sản phẩm';
    }

    // CPU: DECIMAL(18,2) NOT NULL, >= 0
    const cpu = Number(orderData.cpu);
    if (orderData.cpu === '' || isNaN(cpu)) {
      newErrors.cpu = 'Giá / sản phẩm không được để trống';
    } else if (cpu < 0) {
      newErrors.cpu = 'Giá / sản phẩm không được âm';
    } else if (cpu < 1000 || cpu > 1000000000) {
      newErrors.cpu = 'Giá / sản phẩm phải từ 1.000 VND đến 1.000.000.000 VND';
    }

    // NOTE: NVARCHAR(255) — nullable, chỉ check độ dài
    if (orderData.note && orderData.note.length > 255) {
      newErrors.note = 'Ghi chú không được vượt quá 255 ký tự';
    }

    // START_DATE: DATE NOT NULL
    if (!orderData.startDate) {
      newErrors.startDate = 'Vui lòng chọn ngày bắt đầu';
    } else {
      const todayStr = new Date().toLocaleDateString('sv-SE');
      if (orderData.startDate < todayStr) {
        newErrors.startDate = 'Ngày bắt đầu không được trước ngày hiện tại';
      }
    }

    // END_DATE: DATE NOT NULL, >= START_DATE
    if (!orderData.endDate) {
      newErrors.endDate = 'Vui lòng chọn ngày kết thúc';
    } else if (orderData.startDate && new Date(orderData.startDate) > new Date(orderData.endDate)) {
      newErrors.endDate = 'Ngày kết thúc không được trước ngày bắt đầu';
    }

    // TEMPLATES VALIDATION (O_TEMPLATE)
    if (templateItems.length > 0) {
      const templateErrors = [];
      templateItems.forEach((item, idx) => {
        const itemErrs = {};
        if (!item.templateName?.trim()) {
          itemErrs.templateName = 'Tên mẫu thiết kế là bắt buộc';
        } else if (item.templateName.trim().length > 100) {
          itemErrs.templateName = 'Tên mẫu không được quá 100 ký tự';
        }
        if (item.note && item.note.length > 100) {
          itemErrs.note = 'Ghi chú không được quá 100 ký tự';
        }
        if (Object.keys(itemErrs).length > 0) {
          templateErrors[idx] = itemErrs;
        }
      });
      if (templateErrors.length > 0) {
        newErrors.templates = templateErrors;
      }
    }

    // MATERIALS VALIDATION (O_MATERIAL)
    if (materials.length > 0) {
      const materialErrors = [];
      materials.forEach((m, idx) => {
        const mErrs = {};
        if (!m.image && !m.imageFile) mErrs.image = 'Vui lòng chọn ảnh vật liệu';
        if (!m.materialName?.trim()) {
          mErrs.materialName = 'Tên vật liệu là bắt buộc';
        } else if (m.materialName.trim().length > 150) {
          mErrs.materialName = 'Tên vật liệu không được quá 150 ký tự';
        }

        if (m.color && m.color.length > 30) {
          mErrs.color = 'Màu sắc không được quá 30 ký tự';
        } else if (!m.color?.trim()) {
          mErrs.color = 'Màu sắc không được để trống';
        }

        if (!m.value || isNaN(m.value) || Number(m.value) <= 0) {
          mErrs.value = 'Số lượng phải lớn hơn 0';
        } else if (Number(m.value) > 99999) {
          mErrs.value = 'Số lượng tối đa là 99.999';
        }

        if (!m.uom?.trim()) {
          mErrs.uom = 'Đơn vị tính là bắt buộc';
        } else if (m.uom.trim().length > 50) {
          mErrs.uom = 'Đơn vị tính không được quá 50 ký tự';
        }

        if (m.note && m.note.length > 100) {
          mErrs.note = 'Ghi chú không được quá 100 ký tự';
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
      console.warn('Lỗi xác thực tạo đơn hàng:', newErrors);
    }
    return Object.keys(newErrors).length === 0;
  };

  const handleOrderChange = (e) => {
    let { name, value } = e.target;
    if (name === 'quantity' || name === 'cpu') {
      value = value.replace(/[^0-9]/g, '');
    }
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
      } catch (error) {
        console.error("Material image upload failed:", error);
        toast.error(getErrorMessage(error, "Không thể tải ảnh vật liệu lên Cloudinary."));
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
  
  const removeTemplateItem = (index) => {
    setDeleteConfirm({
      show: true,
      type: 'template',
      index: index,
      title: 'Xác nhận xóa mẫu thiết kế',
      desc: 'Bạn có chắc chắn muốn xóa mẫu thiết kế này không? Hành động này sẽ gỡ bỏ mục này khỏi danh sách đơn hàng và không thể hoàn tác.'
    });
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

  const executeDelete = () => {
    const { type, index } = deleteConfirm;
    if (type === 'template') {
      setTemplateItems((prev) => prev.filter((_, i) => i !== index));
      if (errors.templates) {
        setErrors((prev) => {
          const newTemplates = { ...prev.templates };
          delete newTemplates[index];
          const adjusted = {};
          Object.keys(newTemplates).forEach((key) => {
            const k = parseInt(key);
            if (k > index) adjusted[k - 1] = newTemplates[key];
            else adjusted[k] = newTemplates[key];
          });
          return { ...prev, templates: adjusted };
        });
      }
    } else if (type === 'material') {
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

    if (profileCheck.missing.length > 0) {
      toast.warn('Vui lòng cập nhật email, số điện thoại và địa chỉ trước khi tạo đơn hàng.');
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
          let imageUrl = m.image || null;
          if (m.imageFile) {
            const uploadRes = await CloudinaryService.uploadImage(m.imageFile);
            imageUrl = uploadRes?.url || null;
          } else if (typeof m.image === 'string' && !/^https?:\/\//i.test(m.image)) {
            imageUrl = null; // Ensure invalid strings/empty are null
          }

          return {
            materialName: m.materialName ?? '',
            image: imageUrl,
            color: m.color ?? '',
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
            templateName: item?.templateName?.trim() || 'Template',
            type: item?.type || detectTemplateType(item?.file),
            file: url,
            note: item?.note?.trim() || '',
          });
        });
      }

      const sizesPayload = [];
      const SIZE_ID_MAP = {
        'xs': 1,
        's': 2,
        'm': 3,
        'l': 4,
        'xl': 5,
        '2xl': 6,
        '3xl': 7
      };

      variants.forEach(v => {
        ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl'].forEach(sizeKey => {
          const qty = Number(v[sizeKey]) || 0;
          if (qty > 0) {
            sizesPayload.push({
              sizeId: SIZE_ID_MAP[sizeKey],
              color: v.color?.trim() || '',
              quantity: qty
            });
          }
        });
      });

      const payload = {
        userId: Number(orderData.userId || userId) || 0,
        image: orderImageUrl || "",
        orderName: (orderData.orderName || "").trim(),
        startDate: orderData.startDate || "",
        endDate: orderData.endDate || "",
        quantity: Math.floor(Number(orderData.quantity) || 0),
        cpu: Number(orderData.cpu) || 0,
        note: (orderData.note || "").trim(),
        materials: materialsPayload.map(m => ({
          ...m,
          image: m.image || "",
          note: (m.note || "").trim()
        })),
        o_Material: materialsPayload.map(m => ({
          ...m,
          image: m.image || "",
          note: (m.note || "").trim()
        })),
        templates: templatesPayload.map(t => ({
          ...t,
          type: "SOFT", // Thống nhất với chuẩn hệ thống (Bản mềm)
          file: t.file || "",
          note: (t.note || "").trim()
        })),
        o_Template: templatesPayload.map(t => ({
          ...t,
          type: "SOFT",
          file: t.file || "",
          note: (t.note || "").trim()
        })),
        sizes: sizesPayload
      };
      console.log('CreateOrder payload (AutoMapper focus):', payload);

      await OrderService.createOrder(payload);
      setIsSuccessOpen(true);
    } catch (error) {
      console.error('--- LỖI API CHI TIẾT (CreateOrder) ---');
      console.error('Status:', error?.response?.status);
      console.error('Data từ Backend:', error?.response?.data);
      console.error('Message:', error?.message);
      
      const errMsg = getErrorMessage(error, 'Không thể kết nối đến máy chủ');
      toast.error('Lỗi: ' + errMsg);
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
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-amber-50">
                  <AlertCircle className="text-amber-500" size={24} />
                </div>
                <div className="flex-1">
                  <div className="mb-1 text-lg font-bold text-slate-900">Thông tin tài khoản chưa hoàn thiện</div>
                  <p className="text-slate-600 leading-relaxed mb-4">
                    Để đảm bảo việc liên lạc và giao nhận hàng chính xác, vui lòng cập nhật đầy đủ 
                    <span className="font-bold text-slate-900"> số điện thoại</span> và 
                    <span className="font-bold text-slate-900"> địa chỉ</span> của bạn.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/profile/edit')}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 shadow-lg shadow-emerald-100"
                  >
                    Cập nhật hồ sơ ngay
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
                  onClick={() => navigate('/orders')}
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
                  onDeleteMaterial={handleDeleteMaterial}
                  templateItems={templateItems}
                  onTemplateFileChange={handleTemplateFileChange}
                  onTemplateMetaChange={updateTemplateMeta}
                  onRemoveTemplateItem={removeTemplateItem}
                  totalCost={totalCost}
                  isSubmitting={isSubmitting}
                  onCancel={() => navigate('/orders')}
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
