import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, Save } from 'lucide-react';
import { toast } from 'react-toastify';
import CloudinaryService from '@/services/CloudinaryService';
import OrderService from '@/services/OrderService';
import { getStoredUser } from '@/lib/authStorage';
import OwnerLayout from '@/layouts/OwnerLayout';
import { OrderFormSections } from '@/pages/orders/components/OrderFormSections';
import OrderSuccessModal from '@/pages/orders/components/OrderSuccessModal';
import '@/styles/homepage.css';
import '@/styles/leave.css';

export default function EditOrder() {
    const getUserId = () => {
        const user = getStoredUser();
        return user?.userId ?? user?.id ?? null;
    };

    const userId = getUserId();
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [materials, setMaterials] = useState([]);
    const [orderData, setOrderData] = useState({
        userId,
        image: '',
        orderName: '',
        type: '',
        size: '',
        color: '',
        startDate: '',
        endDate: '',
        quantity: '',
        cpu: '',
        note: '',
        status: '',
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
    const [isFetching, setIsFetching] = useState(true);
    const [orderImageFile, setOrderImageFile] = useState(null);
    const [orderImagePreview, setOrderImagePreview] = useState('');
    const [templateItems, setTemplateItems] = useState([]);
    const [isSuccessOpen, setIsSuccessOpen] = useState(false);
    const [initialState, setInitialState] = useState(null);

    const normalizeMaterial = (m = {}) => {
        return {
            id: m.id || m.materialId || null,
            materialName: (m.materialName || m.name || '').trim(),
            color: (m.color || '').trim(),
            value: m.value !== undefined && m.value !== null ? m.value : (m.quantity !== undefined ? m.quantity : ''),
            uom: (m.uom || '').trim(),
            image: m.image || '',
            imageFile: null,
            imagePreview: m.imagePreview || m.image || '',
            note: (m.note || '').trim(),
        };
    };

    const buildTemplateId = (file) => `${Date.now()}-${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`;
    const getFileExtension = (fileName = '') => {
        const parts = String(fileName).toLowerCase().split('.');
        return parts.length > 1 ? `.${parts.pop()}` : '';
    };
    const detectTemplateType = (fileOrUrl) => {
        const nameValue = typeof fileOrUrl === 'string' ? fileOrUrl : (fileOrUrl?.name || '');
        const ext = getFileExtension(nameValue);
        const IMAGE_TEMPLATE_EXTENSIONS = ['.png', '.jpg', '.jpeg'];
        return IMAGE_TEMPLATE_EXTENSIONS.includes(ext) ? 'IMAGE' : 'FILE';
    };

    const applyOrderData = (data = {}) => {
        const formattedData = {
            ...data,
            orderName: data.orderName || data.OrderName || '',
            type: data.type || data.Type || '',
            size: String(data.size || data.Size || '').trim().toUpperCase(),
            color: data.color || data.Color || '',
            note: data.note || data.Note || '',
            startDate: data.startDate ? String(data.startDate).split('T')[0] : '',
            endDate: data.endDate ? String(data.endDate).split('T')[0] : '',
            quantity: data.quantity ?? data.Quantity ?? '',
            cpu: data.cpu ?? data.Cpu ?? data.CPU ?? '',
        };

        setOrderData((prev) => ({ ...prev, ...formattedData }));
        setMaterials((data.materials || []).map(normalizeMaterial));

        const rawTemplates = data.templates ?? data.template ?? data.Templates ?? [];
        const templatesArr = Array.isArray(rawTemplates) ? rawTemplates : [];
        const items = templatesArr
            .filter((t) => {
                const type = (t.type ?? t.Type ?? '').toString().toLowerCase();
                return type.startsWith('soft') || (t.file ?? t.File);
            })
            .map((t, idx) => ({
                id: `existing-${idx}`,
                file: t.file ?? t.File ?? '',
                fileName: t.templateName ?? t.name ?? t.TemplateName ?? 'Bản mềm',
                templateName: t.templateName ?? t.name ?? t.TemplateName ?? 'Bản mềm',
                type: (t.type ?? '').toString().toUpperCase() === 'HARD' ? 'FILE' : (detectTemplateType(t.file ?? t.File)),
                note: t.note ?? t.Note ?? '',
            }))
            .filter((t) => t.file);
        setTemplateItems(items);
        
        // Save initial state for comparison
        setInitialState({
            orderData: { ...formattedData },
            materials: (data.materials || []).map(normalizeMaterial),
            templateItems: [...items]
        });
    };

    useEffect(() => {
        const prefill = location?.state?.order;
        if (prefill) {
            applyOrderData(prefill);
            setIsFetching(false);
        } else {
            const fetchOrderDetails = async () => {
                try {
                    setIsFetching(true);
                    const response = await OrderService.getOrderDetail(id);
                    const data = response?.data?.data || response?.data || {};
                    applyOrderData(data);
                } catch (error) {
                    console.error('Lỗi khi tải chi tiết đơn hàng:', error);
                    toast.error('Không thể tải thông tin đơn hàng.');
                    navigate('/orders');
                } finally {
                    setIsFetching(false);
                }
            };
            if (id) fetchOrderDetails();
        }
    }, [id, location?.state?.order, navigate]);

    const validateForm = () => {
        const newErrors = {};

        // IMAGE
        if (!orderImageFile && !orderData.image) newErrors.image = 'Vui lòng chọn ảnh đơn hàng';

        // ORDER_NAME
        if (!orderData.orderName?.trim()) {
            newErrors.orderName = 'Tên đơn hàng không được để trống';
        } else if (orderData.orderName.trim().length < 3) {
            newErrors.orderName = 'Tên đơn hàng phải có ít nhất 3 ký tự';
        } else if (orderData.orderName.trim().length > 100) {
            newErrors.orderName = 'Tên đơn hàng không được vượt quá 100 ký tự';
        }

        // TYPE
        if (!orderData.type?.trim()) {
            newErrors.type = 'Vui lòng nhập loại sản phẩm (vd: Sơ mi, Quần tây)';
        } else if (orderData.type.trim().length > 50) {
            newErrors.type = 'Loại sản phẩm không được vượt quá 50 ký tự';
        }

        // SIZE
        if (!orderData.size?.trim()) newErrors.size = 'Vui lòng chọn kích thước';

        // COLOR
        if (!orderData.color?.trim()) {
            newErrors.color = 'Màu sắc không được để trống';
        } else if (orderData.color.trim().length > 30) {
            newErrors.color = 'Màu sắc không được vượt quá 30 ký tự';
        }

        // QUANTITY
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

        // CPU
        const cpu = Number(orderData.cpu);
        if (orderData.cpu === '' || isNaN(cpu)) {
            newErrors.cpu = 'Giá / sản phẩm không được để trống';
        } else if (cpu < 0) {
            newErrors.cpu = 'Giá / sản phẩm không được âm';
        } else if (cpu < 1000 || cpu > 1000000000) {
            newErrors.cpu = 'Giá / sản phẩm phải từ 1.000 VND đến 1.000.000.000 VND';
        }

        // NOTE
        if (orderData.note && orderData.note.length > 255) {
            newErrors.note = 'Ghi chú không được vượt quá 255 ký tự';
        }

        // DATES
        if (!orderData.startDate) {
            newErrors.startDate = 'Vui lòng chọn ngày bắt đầu';
        } else {
            const today = new Date();
            const todayStr = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString().split('T')[0];
            // Only validate if it's a NEW date or if the original date was also in the future
            if (orderData.startDate < todayStr) {
                newErrors.startDate = 'Ngày bắt đầu không được trước ngày hiện tại';
            }
        }
        if (!orderData.endDate) {
            newErrors.endDate = 'Vui lòng chọn ngày kết thúc';
        } else if (orderData.startDate && new Date(orderData.startDate) > new Date(orderData.endDate)) {
            newErrors.endDate = 'Ngày kết thúc không được trước ngày bắt đầu';
        }

        // TEMPLATES
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

        // MATERIALS
        if (materials.length > 0) {
            const materialErrors = [];
            materials.forEach((m, idx) => {
                const mErrs = {};
                if (!m.image) mErrs.image = 'Vui lòng chọn ảnh vật liệu';
                if (!m.materialName?.trim()) {
                    mErrs.materialName = 'Tên vật liệu là bắt buộc';
                } else if (m.materialName.trim().length > 150) {
                    mErrs.materialName = 'Tên vật liệu không được quá 150 ký tự';
                }
                if (!m.color?.trim()) {
                    mErrs.color = 'Màu sắc không được để trống';
                } else if (m.color.length > 30) {
                    mErrs.color = 'Màu sắc không được quá 30 ký tự';
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

        if (Object.keys(newErrors).length > 0) {
            console.warn('Lỗi xác thực đơn hàng:', newErrors);
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

        // Clear error for this material if any
        if (errors.materialsList) {
            setErrors((prev) => {
                const newMaterialsList = prev.materialsList ? { ...prev.materialsList } : {};
                if (targetIndex !== null) delete newMaterialsList[targetIndex];
                return { ...prev, materialsList: newMaterialsList };
            });
        }

        if (errors.materials && materials.length + (editingIndex === null ? 1 : 0) > 0) {
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
                }
            } catch {
                // Keep preview
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
    const MAX_TEMPLATE_SIZE = 10 * 1024 * 1024;
    const getTemplateNameFromFile = (fileName = '') => fileName.replace(/\.[^/.]+$/, '') || fileName;

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
            toast.error(`File không hợp lệ (định dạng/size): ${invalid.join(', ')}`);
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

    const translateError = (msg) => {
        const dictionary = {
            'Image must be a valid URL': 'Ảnh phải là đường dẫn (URL) hợp lệ',
            'File must be a valid URL': 'Tệp tin phải là đường dẫn (URL) hợp lệ',
            'Start date must be greater than current date.': 'Ngày bắt đầu phải sau ngày hiện tại',
            'One or more validation errors occurred.': 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại',
        };
        return dictionary[msg] || msg;
    };

    const handleDeleteMaterial = (index) => {
        setMaterials((prev) => prev.filter((_, i) => i !== index));
        if (errors.materialsList) {
            setErrors((prev) => {
                const newMaterialsList = { ...prev.materialsList };
                delete newMaterialsList[index];
                
                // Shift subsequent errors back
                const adjustedList = {};
                Object.keys(newMaterialsList).forEach(key => {
                    const k = parseInt(key);
                    if (k > index) {
                        adjustedList[k - 1] = newMaterialsList[key];
                    } else {
                        adjustedList[k] = newMaterialsList[key];
                    }
                });
                
                return { ...prev, materialsList: adjustedList };
            });
        }
    };

    const isDataChanged = () => {
        if (!initialState) return true;

        // Check image files first
        if (orderImageFile || materials.some(m => m.imageFile) || templateItems.some(t => t.file instanceof File)) {
            return true;
        }

        // Compare orderData basic fields
        const fields = ['orderName', 'type', 'size', 'color', 'startDate', 'endDate', 'quantity', 'cpu', 'note'];
        const isOrderDataChanged = fields.some(f => {
            const current = orderData[f];
            const initial = initialState.orderData[f];
            return String(current ?? '').trim() !== String(initial ?? '').trim();
        });
        if (isOrderDataChanged) return true;

        // Compare materials
        if (materials.length !== initialState.materials.length) return true;
        const areMaterialsChanged = materials.some((m, idx) => {
            const initM = initialState.materials[idx];
            const mFields = ['materialName', 'color', 'value', 'uom', 'image', 'note'];
            return mFields.some(f => {
                const current = m[f];
                const initial = initM[f];
                if (f === 'value') return Number(current) !== Number(initial);
                return String(current ?? '').trim() !== String(initial ?? '').trim();
            });
        });
        if (areMaterialsChanged) return true;

        // Compare templates
        if (templateItems.length !== initialState.templateItems.length) return true;
        const areTemplatesChanged = templateItems.some((t, idx) => {
            const initT = initialState.templateItems[idx];
            const tFields = ['templateName', 'type', 'file', 'note'];
            return tFields.some(f => {
                const current = t[f];
                const initial = initT[f];
                return String(current ?? '').trim() !== String(initial ?? '').trim();
            });
        });
        if (areTemplatesChanged) return true;

        return false;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!isDataChanged()) {
            toast.info('Không có thay đổi nào để cập nhật.');
            return;
        }

        if (!validateForm()) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        try {
            setIsSubmitting(true);
            let orderImageUrl = orderData.image || null;

            if (orderImageFile) {
                const uploadRes = await CloudinaryService.uploadImage(orderImageFile);
                orderImageUrl = uploadRes?.url || null;
            } else if (typeof orderData.image === 'string' && !/^https?:\/\//i.test(orderData.image)) {
                orderImageUrl = null;
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
                        id: m.id || null,
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
                    templateItems.map((item) => {
                        if (typeof item.file === 'string' && /^https?:\/\//i.test(item.file)) {
                            return { url: item.file }; // Already a URL
                        }
                        const normalizedType = String(item?.type || '').toUpperCase();
                        if (normalizedType === 'IMAGE') return CloudinaryService.uploadImage(item.file);
                        return CloudinaryService.uploadTemplateFile(item.file);
                    })
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

            const payload = {
                userId: Number(orderData.userId ?? userId) || 0,
                image: orderImageUrl || null,
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

            await OrderService.updateOrder(id, payload);
            setIsSuccessOpen(true);
        } catch (error) {
            console.error('Lỗi API:', error.response?.data || error.message);
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

    if (isFetching) {
        return (
            <OwnerLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <Loader2 className="animate-spin text-emerald-600 mb-2" size={40} />
                    <p className="text-gray-500">Đang tải dữ liệu đơn hàng...</p>
                </div>
            </OwnerLayout>
        );
    }

    return (
        <OwnerLayout>
            <div className="leave-page leave-list-page">
                <div className="leave-shell mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => navigate('/orders')}
                            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Chỉnh sửa đơn hàng #{id}</h1>
                            <p className="text-slate-600">Cập nhật thông tin đơn hàng của bạn.</p>
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
                                    imagePreview: materials[i].imagePreview ?? materials[i].image ?? '',
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
                            submitLabel="Lưu thay đổi"
                            submitIcon={<Save size={20} />}
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

                    <OrderSuccessModal
                        isOpen={isSuccessOpen}
                        title="Cập nhật thành công!"
                        description={`Đơn hàng #${id} đã được cập nhật thông tin.`}
                        onClose={() => {
                            setIsSuccessOpen(false);
                            navigate(`/orders/detail/${id}`);
                        }}
                        onConfirm={() => {
                            setIsSuccessOpen(false);
                            navigate(`/orders/detail/${id}`);
                        }}
                    />
                </div>
            </div>
        </OwnerLayout>
    );
}
