import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, ArrowLeft, FileText, Loader2, AlertCircle, Save } from 'lucide-react';
import AddMaterialModal from '@/components/AddMaterialModal';
import MaterialsTable from '@/components/MaterialsTable';
import { MATERIALS_TABLE_EMPTY_TEXT } from '@/lib/constants';
import CloudinaryService from '@/services/CloudinaryService';
import OrderService from '@/services/OrderService';
import MainLayout from '../../layouts/MainLayout';

export default function EditOrder() {
    const { userId } = localStorage.getItem("userId") ? JSON.parse(localStorage.getItem("userId")) : {};
    const { id } = useParams();
    const navigate = useNavigate();

    const [materials, setMaterials] = useState([]);
    const [orderData, setOrderData] = useState({
        userId: userId,
        image: '',
        orderName: '',
        type: '',
        size: '',
        color: '',
        startDate: '',
        endDate: '',
        quantity: 0,
        cpu: 0,
        note: '',
        status: '',
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
    const [isFetching, setIsFetching] = useState(true);
    const [orderImageFile, setOrderImageFile] = useState(null);
    const [orderImagePreview, setOrderImagePreview] = useState('');
    const [templateFiles, setTemplateFiles] = useState([]);
    const [existingTemplates, setExistingTemplates] = useState([]);
    const [hardCopyQty, setHardCopyQty] = useState('');

    const normalizeMaterial = (material = {}) => ({
        ...material,
        materialName: material.materialName ?? material.name ?? '',
        value: Number(material.value ?? material.quantity ?? 0),
        uom: material.uom ?? '',
        image: material.image ?? '',
        imageFile: material.imageFile ?? null,
        imagePreview: material.imagePreview ?? material.image ?? '',
        note: material.note ?? '',
    });

    useEffect(() => {
        const fetchOrderDetails = async () => {
            try {
                setIsFetching(true);
                const response = await OrderService.getOrderDetail(id);
                const data = response?.data?.data || response?.data || {};

                const formattedData = {
                    ...data,
                    startDate: data.startDate ? data.startDate.split('T')[0] : '',
                    endDate: data.endDate ? data.endDate.split('T')[0] : '',
                };

                setOrderData((prev) => ({ ...prev, ...formattedData }));
                setMaterials((data.materials || []).map(normalizeMaterial));
                const rawTemplates = data.templates ?? data.template ?? data.Templates ?? [];
                const templatesArr = Array.isArray(rawTemplates) ? rawTemplates : [];
                const softTemplates = templatesArr
                    .filter((t) => {
                        const type = (t.type ?? t.Type ?? '').toString().toLowerCase();
                        return type.startsWith('soft') && (t.file ?? t.File);
                    })
                    .map((t) => ({
                        templateName: t.templateName ?? t.name ?? t.TemplateName ?? 'Bản mềm',
                        type: 'SOFT',
                        file: t.file ?? t.File ?? '',
                        quantity: null,
                        note: t.note ?? t.Note ?? '',
                    }))
                    .filter((t) => t.file);
                setExistingTemplates(softTemplates);

                const hardTemplate = templatesArr.find((t) => {
                    const type = (t.type ?? t.Type ?? '').toString().toLowerCase();
                    return type.startsWith('hard');
                });
                const hardQty = hardTemplate?.quantity ?? hardTemplate?.Quantity ?? '';
                setHardCopyQty(hardQty ? String(hardQty) : '');
            } catch (error) {
                console.error('Lỗi khi tải chi tiết đơn hàng:', error);
                alert('Không thể tải thông tin đơn hàng.');
                navigate('/orders');
            } finally {
                setIsFetching(false);
            }
        };

        fetchOrderDetails();
    }, [id, navigate]);

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

        if (orderData.size?.length > 5) newErrors.size = 'Kích thước quá dài, tối đa 5 ký tự';
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

    const handleSaveMaterial = () => {
        const newMaterial = normalizeMaterial({
            materialName: materialFormData.materialName,
            value: Number(materialFormData.value),
            uom: materialFormData.uom,
            image: materialFormData.image,
            imageFile: materialFormData.imageFile || null,
            imagePreview: materialFormData.imagePreview || materialFormData.image || '',
            note: materialFormData.note?.trim() || '',
        });

        if (editingIndex === null) {
            setMaterials((prev) => [...prev, newMaterial]);
            const newIndex = materials.length;
            if (newMaterial.imageFile) {
                CloudinaryService.uploadImage(newMaterial.imageFile)
                    .then((res) => {
                        const url = res?.url;
                        if (!url) return;
                        setMaterials((prev) => {
                            const next = [...prev];
                            if (!next[newIndex]) return prev;
                            next[newIndex] = { ...next[newIndex], image: url, imageFile: null, imagePreview: url };
                            return next;
                        });
                    })
                    .catch(() => null);
            }
        } else {
            setMaterials((prev) => {
                const updated = [...prev];
                updated[editingIndex] = newMaterial;
                return updated;
            });
            if (newMaterial.imageFile) {
                const targetIndex = editingIndex;
                CloudinaryService.uploadImage(newMaterial.imageFile)
                    .then((res) => {
                        const url = res?.url;
                        if (!url) return;
                        setMaterials((prev) => {
                            const next = [...prev];
                            if (!next[targetIndex]) return prev;
                            next[targetIndex] = { ...next[targetIndex], image: url, imageFile: null, imagePreview: url };
                            return next;
                        });
                    })
                    .catch(() => null);
            }
        }

        if (errors.materials) {
            setErrors((prev) => ({ ...prev, materials: null }));
        }
        setIsModalOpen(false);
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

    const removeExistingTemplate = (index) => {
        setExistingTemplates((prev) => prev.filter((_, i) => i !== index));
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

            const templatesPayload = [...existingTemplates];
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
                ...orderData,
                image: orderImageUrl,
                materials: materialsPayload,
                templates: templatesPayload,
            };

            await OrderService.updateOrder(id, payload);
            alert('Cập nhật đơn hàng thành công!');
            navigate(`/orders/detail/${id}`);
        } catch (error) {
            console.error('Lỗi cập nhật:', error.response?.data || error.message);
            alert('Lỗi: ' + (error.response?.data?.title || 'Không thể cập nhật'));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isFetching) {
        return (
            <MainLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <Loader2 className="animate-spin text-emerald-600 mb-2" size={40} />
                    <p className="text-gray-500">Đang tải dữ liệu đơn hàng...</p>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="max-w-5xl mx-auto py-8 px-4 font-sans">
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => navigate(-1)} className="p-2 rounded hover:bg-gray-100 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">Chỉnh sửa đơn hàng #{id}</h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                        <h2 className="text-lg font-semibold mb-4 border-b pb-2 text-gray-800">Thông tin chung</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="text-sm font-bold text-gray-700 mb-2 block">Ảnh đơn hàng</label>
                                <div className="flex items-center gap-4">
                                    <div className="w-24 h-24 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
                                        {orderImagePreview || orderData.image ? (
                                            <img src={orderImagePreview || orderData.image} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-gray-300 text-[11px]">Chưa có ảnh</span>
                                        )}
                                    </div>
                                    <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer">
                                        <span>Chọn ảnh</span>
                                        <input
                                            type="file"
                                            accept=".jpg,.jpeg,.png"
                                            onChange={handleOrderImageChange}
                                            className="hidden"
                                        />
                                    </label>
                                    <div className="text-[11px] text-gray-500">JPG/JPEG/PNG, tối đa 2MB</div>
                                </div>
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

                    {/* 2.5. Mẫu thiết kế */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                        <h2 className="text-lg font-semibold mb-4 border-b pb-2 text-gray-800">Mẫu thiết kế</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-sm font-bold text-gray-700 mb-2 block">Bản mềm (upload file)</label>
                                <div className="flex items-center gap-3">
                                    <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer">
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
                                <p className="text-[11px] text-gray-500 mt-2">Định dạng: .dxf, .iba, .mdl, .plt, .pdf, .docx, .xlsx — tối đa 10MB/file</p>
                                {(existingTemplates.length > 0 || templateFiles.length > 0) && (
                                    <ul className="mt-3 space-y-2">
                                        {existingTemplates.map((tpl, idx) => (
                                            <li key={`existing-${tpl.file}-${idx}`} className="flex items-center justify-between text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                                                <a
                                                    href={tpl.file}
                                                    download
                                                    className="truncate text-emerald-700 hover:underline"
                                                >
                                                    {tpl.templateName || 'Bản mềm'}
                                                </a>
                                                <button
                                                    type="button"
                                                    onClick={() => removeExistingTemplate(idx)}
                                                    className="text-red-600 text-xs font-semibold hover:text-red-700"
                                                >
                                                    Xóa
                                                </button>
                                            </li>
                                        ))}
                                        {templateFiles.map((file, idx) => (
                                            <li key={`${file.name}-${idx}`} className="flex items-center justify-between text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                                                <span className="truncate">{file.name}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeTemplateFile(idx)}
                                                    className="text-red-600 text-xs font-semibold hover:text-red-700"
                                                >
                                                    Xóa
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <div>
                                <label className="text-sm font-bold text-gray-700 mb-2 block">Bản cứng (số lượng đã cung cấp)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={hardCopyQty}
                                    onChange={(e) => setHardCopyQty(e.target.value)}
                                    placeholder="Ví dụ: 2"
                                    className="w-full border rounded-xl px-4 py-2.5 text-sm transition-all outline-none border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border p-6 transition-all border-gray-100">
                        <div className="flex items-center justify-between mb-4 border-b pb-2">
                            <h2 className="text-lg font-semibold text-gray-800">Vật liệu cung cấp</h2>
                            <button
                                type="button"
                                onClick={() => {
                                    setEditingIndex(null);
                                    setMaterialFormData({ materialName: '', value: '', uom: '', image: '', imageFile: null, imagePreview: '', note: '' });
                                    setIsModalOpen(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all text-sm font-bold shadow-md shadow-emerald-100"
                            >
                                <Plus size={18} /> Thêm vật liệu
                            </button>
                        </div>

                        {errors.materials && (
                            <div className="mb-4 flex items-center gap-2 text-red-600 text-sm font-medium bg-red-50 p-2 rounded-md">
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
                                        imagePreview: materials[i].imagePreview ?? materials[i].image ?? '',
                                        note: materials[i].note ?? '',
                                    });
                                    setIsModalOpen(true);
                                }}
                                onDelete={(i) => setMaterials(materials.filter((_, idx) => idx !== i))}
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 border-l-4 border-l-emerald-500">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800">
                            <FileText size={20} className="text-emerald-600" /> Ghi chú sản xuất
                        </h2>
                        <textarea
                            name="note"
                            rows={3}
                            value={orderData.note}
                            onChange={handleOrderChange}
                            placeholder="Nhập yêu cầu đặc biệt về kỹ thuật, đường may hoặc đóng gói..."
                            className="block w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-gray-50/30 transition-all outline-none"
                        />
                    </div>

                    <div className="flex gap-4 justify-end pt-6 border-t">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            disabled={isSubmitting}
                            className="px-8 py-2.5 text-gray-500 font-bold hover:text-gray-700 disabled:opacity-50"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-10 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 flex items-center gap-2 transition-all active:scale-95 disabled:bg-emerald-400"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                            {isSubmitting ? 'Đang xử lý...' : 'Lưu thay đổi'}
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
        </MainLayout>
    );
}

function Input({ label, name, value, onChange, type = 'text', placeholder, error, suffix, readOnly = false }) {
    const isRequired = ['orderName', 'type', 'size', 'color', 'quantity', 'cpu', 'startDate', 'endDate'].includes(name);

    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-gray-700 flex items-center gap-1">
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
                            ? 'bg-gray-50 text-gray-600'
                            : error
                                ? 'border-red-500 bg-red-50/30 focus:ring-2 focus:ring-red-100'
                                : 'border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 bg-white'
                        }`}
                />
                {suffix && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500">
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
