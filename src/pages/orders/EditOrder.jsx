import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash, ArrowLeft, FileText, Loader2, Pencil, AlertCircle, Save } from 'lucide-react';
import AddMaterialModal from '@/components/AddMaterialModal';
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
    const [materialFormData, setMaterialFormData] = useState({ materialName: '', quantity: '', uom: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFetching, setIsFetching] = useState(true);

    const normalizeMaterial = (material = {}) => ({
        ...material,
        materialName: material.materialName ?? material.name ?? '',
        quantity: Number(material.quantity ?? material.value ?? 0),
        uom: material.uom ?? '',
        image: material.image ?? '',
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

        if (!orderData.orderName?.trim()) newErrors.orderName = 'Tên đơn hàng không được để trống';
        if (!orderData.type?.trim()) newErrors.type = 'Vui lòng nhập loại sản phẩm (vd: Sơ mi, Quần tây)';
        if (!orderData.size?.trim()) newErrors.size = 'Kích thước không được để trống';
        if (!orderData.color?.trim()) newErrors.color = 'Màu sắc không được để trống';
        if (orderData.quantity <= 0) newErrors.quantity = 'Số lượng sản xuất phải lớn hơn 0';
        if (orderData.cpu < 0) newErrors.cpu = 'Chi phí đơn vị không được âm';

        if (orderData.size?.length > 5) newErrors.size = 'Kích thước quá dài, tối đa 5 ký tự';
        if (!orderData.startDate) {
            newErrors.startDate = 'Vui lòng chọn ngày bắt đầu';
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
            quantity: Number(materialFormData.quantity),
            uom: materialFormData.uom,
            image: materialFormData.image,
        });

        if (editingIndex === null) {
            setMaterials([...materials, newMaterial]);
        } else {
            const updated = [...materials];
            updated[editingIndex] = newMaterial;
            setMaterials(updated);
        }

        if (errors.materials) {
            setErrors((prev) => ({ ...prev, materials: null }));
        }
        setIsModalOpen(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        try {
            setIsSubmitting(true);
            const payload = {
                ...orderData,
                materials: materials.map((m) => ({
                    ...m,
                    materialName: m.materialName,
                    quantity: Number(m.quantity) || 0,
                    name: m.materialName,
                    value: Number(m.quantity) || 0,
                })),
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
                            <Input label="Tên đơn hàng" name="orderName" value={orderData.orderName} onChange={handleOrderChange} error={errors.orderName} placeholder="Ví dụ: Đơn hàng Sơ mi công sở Nam" />
                            <Input label="Loại sản phẩm" name="type" value={orderData.type} onChange={handleOrderChange} error={errors.type} placeholder="Sơ mi, Quần tây..." />
                            <Input label="Kích thước" name="size" value={orderData.size} onChange={handleOrderChange} error={errors.size} placeholder="M, L, XL, XXL" />
                            <Input label="Màu sắc" name="color" value={orderData.color} onChange={handleOrderChange} error={errors.color} placeholder="Trắng, Xanh Navy..." />
                            <Input label="Số lượng sản xuất" name="quantity" type="number" value={orderData.quantity} onChange={handleOrderChange} error={errors.quantity} />
                            <Input label="Chi phí dự kiến (CPU)" name="cpu" type="number" value={orderData.cpu} onChange={handleOrderChange} error={errors.cpu} />
                            <Input label="Ngày bắt đầu" name="startDate" type="date" value={orderData.startDate} onChange={handleOrderChange} error={errors.startDate} />
                            <Input label="Ngày kết thúc (Dự kiến)" name="endDate" type="date" value={orderData.endDate} onChange={handleOrderChange} error={errors.endDate} />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border p-6 transition-all border-gray-100">
                        <div className="flex items-center justify-between mb-4 border-b pb-2">
                            <h2 className="text-lg font-semibold text-gray-800">Vật liệu cung cấp</h2>
                            <button
                                type="button"
                                onClick={() => {
                                    setEditingIndex(null);
                                    setMaterialFormData({ materialName: '', quantity: '', uom: '', image: '' });
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
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 text-[11px] uppercase font-bold text-gray-500 tracking-wider">
                                    <tr>
                                        <th className="px-4 py-3 text-center w-24">Ảnh</th>
                                        <th className="px-4 py-3 text-left">Tên vật liệu</th>
                                        <th className="px-4 py-3 text-left w-32">Số lượng</th>
                                        <th className="px-4 py-3 text-left w-32">Đơn vị</th>
                                        <th className="px-4 py-3 w-24"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-sm bg-white">
                                    {materials.map((m, i) => (
                                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 text-center align-middle">
                                                <div className="w-12 h-12 border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center mx-auto rounded">
                                                    {m.image ? (
                                                        <img src={m.image} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-4 py-3 font-semibold text-gray-700 align-middle">{m.materialName}</td>
                                            <td className="px-4 py-3 text-gray-600 align-middle">{m.quantity}</td>
                                            <td className="px-4 py-3 text-gray-500 align-middle">{m.uom}</td>

                                            <td className="px-4 py-3 text-right align-middle">
                                                <div className="flex gap-3 justify-end items-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditingIndex(i);
                                                            setMaterialFormData({
                                                                materialName: materials[i].materialName ?? materials[i].name ?? '',
                                                                quantity: materials[i].quantity ?? materials[i].value ?? '',
                                                                uom: materials[i].uom ?? '',
                                                                image: materials[i].image ?? '',
                                                            });
                                                            setIsModalOpen(true);
                                                        }}
                                                        className="text-blue-600 hover:text-blue-800 transition-colors"
                                                    >
                                                        <Pencil size={18} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setMaterials(materials.filter((_, idx) => idx !== i))}
                                                        className="text-red-500 hover:text-red-700 transition-colors"
                                                    >
                                                        <Trash size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}

                                    {materials.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-10 text-center text-gray-400 italic">
                                                Danh sách vật liệu đang trống...
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
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
                onChange={(e) => setMaterialFormData({ ...materialFormData, [e.target.name]: e.target.value })}
                editingIndex={editingIndex}
            />
        </MainLayout>
    );
}

function Input({ label, name, value, onChange, type = 'text', placeholder, error }) {
    const isRequired = ['orderName', 'type', 'size', 'color', 'quantity', 'cpu', 'startDate', 'endDate'].includes(name);

    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-gray-700 flex items-center gap-1">
                {label} {isRequired && <span className="text-red-500">*</span>}
            </label>
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={`block w-full border rounded-xl px-4 py-2.5 text-sm transition-all outline-none
                    ${error
                        ? 'border-red-500 bg-red-50/30 focus:ring-2 focus:ring-red-100'
                        : 'border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 bg-white'
                    }`}
            />
            {error && (
                <div className="flex items-center gap-1 text-[11px] text-red-600 font-semibold mt-1 animate-in fade-in slide-in-from-top-1">
                    <AlertCircle size={12} /> {error}
                </div>
            )}
        </div>
    );
}
