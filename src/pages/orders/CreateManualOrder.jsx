import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Users, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import CloudinaryService from '@/services/CloudinaryService';
import OwnerLayout from '@/layouts/OwnerLayout';
import { OrderFormSections, OrderInput } from '@/pages/orders/components/OrderFormSections';
import SuccessModal from '@/components/SuccessModal';
import ConfirmModal from '@/components/ConfirmModal';
import '@/styles/homepage.css';
import '@/styles/leave.css';
import OrderService from '@/services/OrderService';
import { getStoredUser } from '@/lib/authStorage';

export default function CreateManualOrder() {
  const navigate = useNavigate();
  const location = useLocation();

  const [customerData, setCustomerData] = useState({
    customerName: '',
    customerPhone: '',
    province: null,
    ward: null,
    detail: '',
    customerAddress: '',
  });

  const [parsingAddress, setParsingAddress] = useState(""); // Track original address for auto-matching

  const [provinces, setProvinces] = useState([]);
  const [wards, setWards] = useState([]);

  // Fetch VN Provinces (v2)
  useEffect(() => {
    fetch('https://provinces.open-api.vn/api/v2/p/')
      .then(res => res.json())
      .then(data => setProvinces(data))
      .catch(() => { });
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
        .catch(() => { });
    } else {
      setWards([]);
    }
  }, [customerData.province]);

  // Auto-concatenate address or keep reused string if no parts selected
  useEffect(() => {
    // If we have selected parts, generate the string
    if (customerData.province || customerData.ward || customerData.detail) {
      const parts = [
        customerData.detail,
        customerData.ward?.name,
        customerData.province?.name
      ].filter(Boolean);
      setCustomerData(prev => ({ ...prev, customerAddress: parts.join(', ') }));
    }
  }, [customerData.detail, customerData.ward, customerData.province]);

  // AUTO-MATCH PROVINCE/WARD from reused string
  useEffect(() => {
    if (parsingAddress && provinces.length > 0 && !customerData.province) {
      const addr = parsingAddress;
      const foundP = provinces.find(p => addr.toLowerCase().includes(p.name.toLowerCase()));
      if (foundP) {
        setCustomerData(prev => ({ ...prev, province: foundP }));
      }
    }
  }, [provinces, parsingAddress]);

  useEffect(() => {
    if (parsingAddress && wards.length > 0 && customerData.province && !customerData.ward) {
      const addr = parsingAddress;

      // Sort by length descending to match most specific name
      const sortedWards = [...wards].sort((a, b) => b.name.length - a.name.length);
      const foundW = sortedWards.find(w => addr.toLowerCase().includes(w.name.toLowerCase()));

      if (foundW) {
        // Extract Detail: everything before the ward name
        const wardIndex = addr.toLowerCase().indexOf(foundW.name.toLowerCase());
        let extractedDetail = "";
        if (wardIndex > 0) {
          extractedDetail = addr.substring(0, wardIndex).replace(/[,-]\s*$/, "").trim();
        }

        setCustomerData(prev => ({
          ...prev,
          ward: foundW,
          detail: extractedDetail || prev.detail
        }));

        // Clear parsing flag after successful ward match to stop over-writing
        setParsingAddress("");
      }
    }
  }, [wards, parsingAddress, customerData.province]);

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
      desc: 'Bạn có chắc chắn muốn xóa phối màu này? Dữ liệu về số lượng các kích thước của phối màu này sẽ bị mất.'
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
  useEffect(() => {
    const total = variants.reduce((acc, v) => {
      const sum = ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl'].reduce((s, size) => s + (Number(v[size]) || 0), 0);
      return acc + sum;
    }, 0);
    setOrderData(prev => ({ ...prev, quantity: total }));
  }, [variants]);

  useEffect(() => {
    const reuse = location.state?.reuseOrder;
    if (!reuse) return;

    // 1. Basic Order Info
    setOrderData(prev => ({
      ...prev,
      orderName: reuse.orderName || '',
      image: reuse.image || '',
      note: reuse.note || '',
      cpu: reuse.cpu || '',
    }));

    // Identify reuse address for smarter parsing
    let prefAddress = '';
    if (reuse.guest) {
      prefAddress = reuse.guest.address || '';
    } else if (reuse.userFullName || reuse.userPhone || reuse.userLocation) {
      prefAddress = reuse.userLocation || '';
    } else if (reuse.guestName || reuse.customerName) {
      prefAddress = reuse.guestAddress || reuse.customerAddress || '';
    }

    if (prefAddress) {
      setParsingAddress(prefAddress);
      setCustomerData(prev => ({ ...prev, customerAddress: prefAddress }));
    }

    // 2. Materials
    if (reuse.materials && Array.isArray(reuse.materials)) {
      setMaterials(reuse.materials.map(m => ({
        materialName: m.materialName || '',
        color: m.color || '',
        value: m.value || m.quantity || '',
        uom: m.uom || '',
        image: m.image || '',
        imageFile: null,
        imagePreview: m.image || '',
        note: m.note || '',
      })));
    }

    // 3. Size / Variants Mapping (Matrix Conversion)
    const rawSizes = reuse.sizes || reuse.size || [];
    if (Array.isArray(rawSizes) && rawSizes.length > 0) {
      const grouped = {};
      const SIZE_ID_TO_KEY = { 1: 'xs', 2: 's', 3: 'm', 4: 'l', 5: 'xl', 6: '2xl', 7: '3xl' };
      rawSizes.forEach((item, idx) => {
        const colorLabel = item.color || 'Mặc định';
        if (!grouped[colorLabel]) {
          grouped[colorLabel] = {
            id: `reuse-${idx}-${Date.now()}`,
            color: colorLabel,
            xs: 0, s: 0, m: 0, l: 0, xl: 0, '2xl': 0, '3xl': 0
          };
        }
        const key = SIZE_ID_TO_KEY[item.sizeId];
        if (key) grouped[colorLabel][key] = Number(item.quantity) || 0;
      });
      setVariants(Object.values(grouped));
    }

    // 4. Templates
    const rawTemplates = reuse.templates || reuse.template || [];
    if (Array.isArray(rawTemplates)) {
      setTemplateItems(rawTemplates.map((t, idx) => ({
        id: `reuse-tmp-${idx}-${Date.now()}`,
        file: t.file || '',
        fileName: t.templateName || 'Bản sao thiết kế',
        templateName: t.templateName || 'Bản sao thiết kế',
        type: t.type || 'FILE',
        note: t.note || '',
      })));
    }

    // 5. Customer / Guest Info extraction
    if (reuse.guest) {
      setCustomerData(prev => ({
        ...prev,
        customerName: reuse.guest.fullName || reuse.guest.fullName || '',
        customerPhone: reuse.guest.phoneNumber || reuse.guest.phoneNumber || '',
        customerAddress: reuse.guest.address || reuse.guest.address || '',
      }));
    } else if (reuse.userFullName || reuse.userPhone || reuse.userLocation) {
      setCustomerData(prev => ({
        ...prev,
        customerName: reuse.userFullName || '',
        customerPhone: reuse.userPhone || '',
        customerAddress: reuse.userLocation || '',
      }));
    } else if (reuse.guestName || reuse.customerName) {
      setCustomerData(prev => ({
        ...prev,
        customerName: reuse.guestName || reuse.customerName || '',
        customerPhone: reuse.guestPhone || reuse.customerPhone || '',
        customerAddress: reuse.guestAddress || reuse.customerAddress || '',
      }));
    }

    toast.info('Đã tải dữ liệu từ đơn hàng cũ.');
  }, [location.state]);

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

    if (!customerData.customerName?.trim()) {
      newErrors.customerName = 'Vui lòng nhập tên khách hàng';
    } else if (customerData.customerName.trim().length > 100) {
      newErrors.customerName = 'Tên khách hàng tối đa 100 ký tự';
    }

    if (!customerData.customerPhone?.trim()) {
      newErrors.customerPhone = 'Vui lòng nhập số điện thoại';
    } else if (customerData.customerPhone.trim().length > 20) {
      newErrors.customerPhone = 'Số điện thoại tối đa 20 ký tự';
    }

    if (!customerData.province) {
      newErrors.province = 'Vui lòng chọn Tỉnh/Thành phố';
    }
    if (!customerData.ward) {
      newErrors.ward = 'Vui lòng chọn Phường/Xã';
    }

    if (!customerData.customerAddress?.trim()) {
      newErrors.customerAddress = 'Vui lòng nhập địa chỉ';
    } else if (customerData.customerAddress.trim().length > 255) {
      newErrors.customerAddress = 'Tổng địa chỉ không được vượt quá 255 ký tự';
    }

    if (!orderImageFile && !orderData.image) newErrors.image = 'Vui lòng chọn ảnh đơn hàng';
    if (!orderData.orderName?.trim()) {
      newErrors.orderName = 'Tên đơn hàng không được để trống';
    } else if (orderData.orderName.trim().length < 3) {
      newErrors.orderName = 'Tên đơn hàng phải có ít nhất 3 ký tự';
    } else if (orderData.orderName.trim().length > 100) {
      newErrors.orderName = 'Tên đơn hàng không được vượt quá 100 ký tự';
    }

    // VARIANTS
    const variantErrors = [];
    let hasAnyQuantity = false;
    variants.forEach((v, idx) => {
      const vErrs = {};
      if (!v.color?.trim()) {
        vErrs.color = 'Vui lòng nhập tên màu';
      } else if (v.color.trim().length > 50) {
        vErrs.color = 'Tên màu tối đa 50 ký tự';
      }

      ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl'].forEach(size => {
        const val = Number(v[size]) || 0;
        if (val > 9999) {
          vErrs[size] = 'Tối đa 9999';
        }
      });

      const sumSize = ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl'].reduce((s, size) => s + (Number(v[size]) || 0), 0);
      if (sumSize > 0) hasAnyQuantity = true;
      if (Object.keys(vErrs).length > 0) variantErrors[idx] = vErrs;
    });

    if (variantErrors.length > 0) newErrors.variants = variantErrors;
    if (!hasAnyQuantity) newErrors.variantsGlobal = 'Vui lòng nhập ít nhất một kích thước có số lượng > 0';
    if (orderData.quantity === '' || isNaN(orderData.quantity)) {
      newErrors.quantity = 'Số lượng sản xuất không được để trống';
    } else {
      const qty = Number(orderData.quantity);
      if (!Number.isInteger(qty)) {
        newErrors.quantity = 'Số lượng phải là số nguyên';
      } else if (qty < 10) {
        newErrors.quantity = 'Số lượng sản xuất tối thiểu là 10 sản phẩm';
      } else if (qty > 9999) {
        newErrors.quantity = 'Số lượng sản xuất tối đa là 9999 sản phẩm';
      }
    }

    if (orderData.cpu === '' || isNaN(orderData.cpu)) {
      newErrors.cpu = 'Giá / sản phẩm không được để trống';
    } else {
      const cpu = Number(orderData.cpu);
      if (cpu < 1000 || cpu > 10000000) {
        newErrors.cpu = 'Giá / sản phẩm phải từ 1.000 VND đến 10.000.000 VND';
      }
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

    // TEMPLATES VALIDATION
    if (templateItems.length > 0) {
      const templateErrors = [];
      templateItems.forEach((t, idx) => {
        const tErrs = {};
        if (t.templateName && t.templateName.length > 100) {
          tErrs.templateName = 'Tên mẫu tối đa 100 ký tự';
        }
        if (t.note && t.note.length > 100) {
          tErrs.note = 'Ghi chú tối đa 100 ký tự';
        }
        if (Object.keys(tErrs).length > 0) {
          templateErrors[idx] = tErrs;
        }
      });
      if (templateErrors.length > 0) {
        newErrors.templates = templateErrors;
      }
    }

    // MATERIALS VALIDATION
    if (materials.length > 0) {
      const materialErrors = [];
      materials.forEach((m, idx) => {
        const mErrs = {};
        if (!m.materialName?.trim()) {
          mErrs.materialName = 'Tên vật liệu là bắt buộc';
        } else if (m.materialName.trim().length > 150) {
          mErrs.materialName = 'Tên vật liệu tối đa 150 ký tự';
        }

        if (m.color && m.color.length > 30) {
          mErrs.color = 'Màu sắc tối đa 30 ký tự';
        }

        if (!m.value || isNaN(m.value) || Number(m.value) <= 0) {
          mErrs.value = 'Số lượng phải lớn hơn 0';
        } else if (Number(m.value) > 99999) {
          mErrs.value = 'Số lượng tối đa 99.999';
        }

        if (!m.uom?.trim()) {
          mErrs.uom = 'Đơn vị tính là bắt buộc';
        } else if (m.uom.trim().length > 50) {
          mErrs.uom = 'Đơn vị tính tối đa 50 ký tự';
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
      if (name === 'cpu' && value.length > 8) value = value.slice(0, 8);
      if (name === 'quantity' && value.length > 4) value = value.slice(0, 4);
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
            imageUrl = null;
          }

          return {
            materialName: m.materialName,
            value: Number(m.value) || 0,
            uom: m.uom,
            image: imageUrl,
            color: m.color || '',
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

      // Size ID Mapping: XS:1, S:2, M:3, L:4, XL:5, 2XL:6, 3XL:7
      const sizeIdMap = {
        'xs': 1, 's': 2, 'm': 3, 'l': 4, 'xl': 5, '2xl': 6, '3xl': 7
      };

      const sizesPayload = [];
      variants.forEach(v => {
        ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl'].forEach(sKey => {
          const qty = Number(v[sKey]) || 0;
          if (qty > 0) {
            sizesPayload.push({
              sizeId: sizeIdMap[sKey],
              color: v.color || 'Default',
              quantity: qty
            });
          }
        });
      });

      const payload = {
        order: {
          userId: getStoredUser()?.userId || getStoredUser()?.id || 0,
          image: orderImageUrl || '',
          orderName: orderData.orderName || '',
          startDate: orderData.startDate,
          endDate: orderData.endDate,
          quantity: Number(orderData.quantity) || 0,
          cpu: Number(orderData.cpu) || 0,
          note: orderData.note || '',
          createTime: new Date().toISOString(),
          materials: materialsPayload,
          templates: templatesPayload,
          sizes: sizesPayload
        },
        guest: {
          fullName: customerData.customerName || '',
          phoneNumber: customerData.customerPhone || '',
          address: customerData.customerAddress || ''
        }
      };


      const response = await OrderService.createManualOrder(payload);

      // Since our axiosClient returns response.data directly, 
      // getting here means the request was successful.
      toast.success("Tạo đơn hàng thủ công thành công!");
      setIsSuccessOpen(true);

    } catch (error) {
      console.error('Lỗi API (CreateManualOrder):', error.response?.data || error.message);
      const data = error.response?.data;
      let errorMsg = 'Không thể kết nối đến máy chủ';

      if (data) {
        if (typeof data === 'string') {
          errorMsg = data;
        } else if (data.errors) {
          errorMsg = Object.values(data.errors)
            .flat()
            .map(translateError)
            .join(' - ');
        } else {
          errorMsg = translateError(data.detail || data.title || error.message);
        }
      } else {
        errorMsg = error.message;
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
                  maxLength={100}
                  showCounter
                />
                <OrderInput
                  label="Số điện thoại"
                  name="customerPhone"
                  value={customerData.customerPhone}
                  onChange={handleCustomerChange}
                  error={errors.customerPhone}
                  placeholder="Ví dụ: 0901 234 567"
                  required
                  maxLength={20}
                  showCounter
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
                      if (errors.province || errors.customerAddress) {
                        setErrors(prev => {
                          const next = { ...prev };
                          delete next.province;
                          delete next.customerAddress;
                          return next;
                        });
                      }
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
                      if (errors.ward || errors.customerAddress) {
                        setErrors(prev => {
                          const next = { ...prev };
                          delete next.ward;
                          delete next.customerAddress;
                          return next;
                        });
                      }
                    }}
                    placeholder="Chọn Phường/Xã"
                    error={errors.ward}
                    required
                    disabled={!customerData.province}
                  />
                </div>

                <OrderInput
                  label="Địa chỉ chi tiết (Số nhà, tên đường...)"
                  name="detail"
                  value={customerData.detail}
                  onChange={handleCustomerChange}
                  placeholder="Số nhà, tên đường, tòa nhà..."
                  maxLength={150}
                  showCounter
                />

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 italic">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Xem trước địa chỉ hợp nhất (2025):</p>
                    <span className={`text-[10px] font-bold ${customerData.customerAddress?.length > 255 ? 'text-red-500' : 'text-slate-500'}`}>
                      {customerData.customerAddress?.length || 0}/255
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-600 break-words">{customerData.customerAddress || "—"}</p>
                  {customerData.customerAddress?.length > 255 && (
                    <p className="text-[9px] text-red-500 font-bold mt-1 uppercase tracking-tighter">Địa chỉ quá dài, vui lòng rút ngắn phần địa chỉ chi tiết</p>
                  )}
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
                const m = materials[i];
                setEditingIndex(i);
                setMaterialFormData({
                  materialName: m.materialName ?? m.name ?? '',
                  color: m.color ?? '',
                  value: m.value ?? m.quantity ?? '',
                  uom: m.uom ?? '',
                  image: m.image ?? '',
                  imageFile: null,
                  imagePreview: m.imagePreview || m.image || '',
                  note: m.note ?? '',
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

      <SuccessModal
        isOpen={isSuccessOpen}
        onClose={() => navigate('/orders')}
        message="Đơn hàng thủ công đã được tạo thành công!"
      />

      <ConfirmModal
        isOpen={deleteConfirm.show}
        title={deleteConfirm.title}
        description={deleteConfirm.desc}
        onConfirm={executeDelete}
        onClose={() => setDeleteConfirm({ show: false, type: null, index: null, title: '', desc: '' })}
        variant="danger"
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
