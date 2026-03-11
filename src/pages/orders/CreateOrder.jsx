import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Plus, ArrowLeft, FileText, Loader2, AlertCircle } from 'lucide-react';
import AddMaterialModal from '@/components/AddMaterialModal';
import MaterialsTable from '@/components/MaterialsTable';
import { MATERIALS_TABLE_EMPTY_TEXT } from '@/lib/constants';
import CloudinaryService from '@/services/CloudinaryService';
import OrderService from '@/services/OrderService';
import { userService } from '@/services/userService';
import MainLayout from '../../layouts/MainLayout';
import '@/styles/homepage.css';

export default function CreateOrder() {
    const getUserId = () => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            return user.userId; // hoặc user.userId tùy cách bạn đặt tên
        }
        return null;
    };

    const userId = getUserId();
    const navigate = useNavigate();

    const [profileCheck, setProfileCheck] = useState({ checking: true, missing: [] });

    useEffect(() => {
        let active = true;

        const checkProfile = async () => {
            try {
                const profile = await userService.getProfile();
                const email = profile?.email ?? "";
                const phone = profile?.phoneNumber ?? profile?.phone ?? "";
                const address = profile?.location ?? profile?.address ?? "";

                const missing = [];
                if (!String(email).trim()) missing.push("email");
                if (!String(phone).trim()) missing.push("so dien thoai");
                if (!String(address).trim()) missing.push("dia chi");

                if (active) setProfileCheck({ checking: false, missing });
            } catch (error) {
                if (active) setProfileCheck({ checking: false, missing: ["email", "so dien thoai", "dia chi"] });
            }
        };

        checkProfile();

        return () => { active = false; };
    }, []);

    // 1. State quản lý danh sách vật liệu
    const [materials, setMaterials] = useState([]);

    // 2. State quản lý thông tin đơn hàng
    const [orderData, setOrderData] = useState({
        userId: userId, // Có thể lấy từ LocalStorage nếu cần
        image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTQsTBf5IHNCDXiFB_PjTIuyi9FdnM6-wGyTg&s",
        orderName: '',
        type: '',
        size: '',
        color: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        quantity: '',
        cpu: '',
        note: '',
        status: "Pending"
    });

    // 3. State quản lý lỗi (Validation)
    const [errors, setErrors] = useState({});

    // States cho Modal và Loading
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState(null);
    const [materialFormData, setMaterialFormData] = useState({ materialName: '', value: '', uom: '', image: '', imageFile: null, imagePreview: '', note: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderImageFile, setOrderImageFile] = useState(null);
    const [orderImagePreview, setOrderImagePreview] = useState('');
    const [templateFiles, setTemplateFiles] = useState([]);
    const [hardCopyQty, setHardCopyQty] = useState('');

    // Hàm Validate toàn bộ Form
    const validateForm = () => {
        let newErrors = {};

        if (!orderData.orderName?.trim()) newErrors.orderName = "Tên đơn hàng không được để trống";
        if (!orderData.type?.trim()) newErrors.type = "Vui lòng nhập loại sản phẩm (vd: Sơ mi, Quần tây)";
        if (!orderData.size?.trim()) newErrors.size = "Kích thước không được để trống";
        if (!orderData.color?.trim()) newErrors.color = "Màu sắc không được để trống";
        if (orderData.quantity <= 0) newErrors.quantity = "Số lượng sản xuất phải lớn hơn 0";
        if (orderData.cpu < 0) newErrors.cpu = "Chi phí đơn vị không được âm";

        if (orderData.size.length > 5) newErrors.size = "Kích thước quá dài, tối đa 5 ký tự";
        if (!orderData.startDate) {
            newErrors.startDate = "Vui lòng chọn ngày bắt đầu";
        }
        if (!orderData.endDate) {
            newErrors.endDate = "Vui lòng chọn ngày kết thúc";
        } else if (orderData.startDate && new Date(orderData.startDate) > new Date(orderData.endDate)) {
            newErrors.endDate = "Ngày kết thúc không được trước ngày bắt đầu";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Xử lý thay đổi input đơn hàng & xóa lỗi khi user nhập
    const handleOrderChange = (e) => {
        const { name, value } = e.target;
        const finalValue = (name === 'quantity' || name === 'cpu' || name === 'userId')
            ? (value === '' ? '' : Number(value))
            : value;

        setOrderData(prev => ({ ...prev, [name]: finalValue }));

        // Xóa lỗi ngay khi người dùng bắt đầu nhập lại trường đó
        if (errors[name]) {
            setErrors(prev => {
                const newErrs = { ...prev };
                delete newErrs[name];
                return newErrs;
            });
        }
    };

    const handleSaveMaterial = () => {
        const newMaterial = {
            materialName: materialFormData.materialName,
            value: Number(materialFormData.quantity),
            uom: materialFormData.uom,
            image: materialFormData.image,
            imageFile: materialFormData.imageFile || null,
            imagePreview: materialFormData.imagePreview || materialFormData.image || '',
            note: materialFormData.note?.trim() || '',
        };

        if (editingIndex === null) {
            setMaterials([...materials, newMaterial]);
        } else {
            const updated = [...materials];
            updated[editingIndex] = newMaterial;
            setMaterials(updated);
        }

        // Xóa lỗi phần vật liệu nếu có
        if (errors.materials) {
            setErrors(prev => ({ ...prev, materials: null }));
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

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (profileCheck.missing.length > 0) {
            alert("Vui lòng cập nhật email, số điện thoại và địa chỉ trước khi tạo đơn hàng.");
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
                    if (m.imageFile) {
                        const uploadRes = await CloudinaryService.uploadImage(m.imageFile);
                        return {
                            ...m,
                            image: uploadRes?.url || '',
                            imageFile: undefined,
                            imagePreview: undefined,
                        };
                    }
                    const isRemoteUrl = typeof m.image === 'string' && /^https?:\/\//i.test(m.image);
                    return {
                        ...m,
                        image: isRemoteUrl ? m.image : '',
                        imageFile: undefined,
                        imagePreview: undefined,
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
                ...orderData,
                image: orderImageUrl,
                materials: materialsPayload,
                templates: templatesPayload,
            };
            console.log('CreateOrder payload:', payload);

            await OrderService.createOrder(payload);
            alert('Tạo đơn hàng thành công!');
            navigate('/orders');
        } catch (error) {
            console.error('Lỗi API:', error.response?.data || error.message);
            alert('Lỗi: ' + (error.response?.data?.title || 'Không thể kết nối đến máy chủ'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <MainLayout>
            {profileCheck.checking && (
                <div className="max-w-3xl mx-auto py-10 px-4 font-sans">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 flex items-center gap-3">
                        <Loader2 className="animate-spin text-emerald-600" size={20} />
                        <div className="text-sm text-gray-600">Dang kiem tra thong tin ho so...</div>
                    </div>
                </div>
            )}

            {!profileCheck.checking && profileCheck.missing.length > 0 && (
                <div className="max-w-3xl mx-auto py-10 px-4 font-sans">
                    <div className="bg-white rounded-lg shadow-sm border border-amber-200 p-6">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="text-amber-500" size={20} />
                            <div>
                                <div className="font-bold text-gray-900 mb-1">Can cap nhat thong tin ho so</div>
                                <div className="text-sm text-gray-600">
                                    Vui long cap nhat day du email, so dien thoai va dia chi truoc khi tao don hang.
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigate("/profile/edit")}
                                    className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all text-sm font-bold"
                                >
                                    Di den chinh sua ho so
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {!profileCheck.checking && profileCheck.missing.length === 0 && (
                <div className="max-w-5xl mx-auto py-8 px-4 font-sans">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6">
                        <button onClick={() => navigate(-1)} className="p-2 rounded hover:bg-gray-100 transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-2xl font-bold text-gray-900">Gửi yêu cầu đặt hàng</h1>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* 1. Thông tin đơn hàng */}
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
                        {/* 2. Vật liệu cung cấp */}
                        <div className="bg-white rounded-lg shadow-sm border p-6 transition-all border-gray-100">
                            <div className="flex items-center justify-between mb-4 border-b pb-2">
                                <h2 className="text-lg font-semibold text-gray-800">Vật liệu cung cấp</h2>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingIndex(null);
                                        setMaterialFormData({ materialName: '', quantity: '', uom: '', image: '', imageFile: null, imagePreview: '', note: '' });
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
                                            quantity: materials[i].quantity ?? materials[i].value ?? '',
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
                                    {templateFiles.length > 0 && (
                                        <ul className="mt-3 space-y-2">
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

                        {/* 3. Ghi chú */}
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

                        {/* Actions */}
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
                                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                                {isSubmitting ? 'Đang xử lý...' : 'Xác nhận tạo đơn'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <AddMaterialModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveMaterial}
                formData={materialFormData}
                onChange={(e) => setMaterialFormData({ ...materialFormData, [e.target.name]: e.target.value })}
                editingIndex={editingIndex}
            />
        </MainLayout>
    );
}

// Component Input Tái sử dụng (Kèm Logic Hiển thị Lỗi)
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



