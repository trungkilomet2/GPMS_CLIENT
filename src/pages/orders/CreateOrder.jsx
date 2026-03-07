import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Plus, Trash, ArrowLeft, Upload, Pencil, FileText, Loader2 } from 'lucide-react';
import AddMaterialModal from '@/components/AddMaterialModal';
import OrderService from '@/services/OrderService'; // Đảm bảo đường dẫn đúng

export default function CreateOrder() {
    const navigate = useNavigate();

    // 1. State quản lý danh sách vật liệu (Khớp schema BE)
    const [materials, setMaterials] = useState([]);

    // 2. State quản lý thông tin đơn hàng (Khớp 100% Schema JSON BE)
    const [orderData, setOrderData] = useState({
        userId: 2, // Thay bằng ID thực tế của User
        image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTQsTBf5IHNCDXiFB_PjTIuyi9FdnM6-wGyTg&s",
        orderName: '',
        type: '',
        size: '',
        color: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        quantity: 0,
        cpu: 0,
        note: '',
        status: "Pending"
    });

    // States cho Modal và Loading
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState(null);
    const [materialFormData, setMaterialFormData] = useState({ materialName: '', quantity: '', uom: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Xử lý thay đổi input đơn hàng
    const handleOrderChange = (e) => {
        const { name, value } = e.target;
        // Tự động ép kiểu số cho các trường quantity, cpu, userId
        const finalValue = (name === 'quantity' || name === 'cpu' || name === 'userId')
            ? (value === '' ? 0 : Number(value))
            : value;

        setOrderData(prev => ({ ...prev, [name]: finalValue }));
    };

    // Xử lý lưu vật liệu từ Modal
    const handleSaveMaterial = () => {
        const newMaterial = {
            materialName: materialFormData.materialName,
            quantity: Number(materialFormData.quantity),
            uom: materialFormData.uom
        };

        if (editingIndex === null) {
            setMaterials([...materials, newMaterial]);
        } else {
            const updated = [...materials];
            updated[editingIndex] = newMaterial;
            setMaterials(updated);
        }
        setIsModalOpen(false);
    };

    // CALL API GỬI DỮ LIỆU
    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setIsSubmitting(true);

            // Chuẩn bị payload khớp hoàn toàn với Backend
            const payload = {
                ...orderData,
                materials: materials, // Đã khớp materialName, quantity, uom
                templates: [
                    { templateName: "Bản thiết kế gốc" } // BE yêu cầu mảng templates
                ]
            };

            const response = await OrderService.createOrder(payload);
            console.log("Response:", response);

            alert('Tạo đơn hàng thành công!');
            navigate('/orders');
        } catch (error) {
            console.error('Lỗi khi call API:', error.response?.data || error.message);
            alert('Có lỗi xảy ra: ' + (error.response?.data?.title || 'Vui lòng kiểm tra lại dữ liệu'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto py-8 px-4">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => navigate(-1)} className="p-2 rounded hover:bg-gray-100 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">Tạo đơn hàng mới</h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* 1. Thông tin đơn hàng */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                        <h2 className="text-lg font-semibold mb-4 border-b pb-2">Thông tin chung</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Tên đơn hàng" name="orderName" value={orderData.orderName} onChange={handleOrderChange} placeholder="Đơn hàng sơ mi tháng 3" />
                            <Input label="Loại sản phẩm" name="type" value={orderData.type} onChange={handleOrderChange} placeholder="Sơ mi nam" />
                            <Input label="Kích thước" name="size" value={orderData.size} onChange={handleOrderChange} placeholder="M, L, XL" />
                            <Input label="Màu sắc" name="color" value={orderData.color} onChange={handleOrderChange} placeholder="Xanh biển" />
                            <Input label="Số lượng sản xuất" name="quantity" type="number" value={orderData.quantity} onChange={handleOrderChange} />
                            <Input label="CPU (Chi phí/đơn vị)" name="cpu" type="number" value={orderData.cpu} onChange={handleOrderChange} />
                            <Input label="Ngày bắt đầu" name="startDate" type="date" value={orderData.startDate} onChange={handleOrderChange} />
                            <Input label="Ngày kết thúc" name="endDate" type="date" value={orderData.endDate} onChange={handleOrderChange} />
                        </div>
                    </div>

                    {/* 2. Vật liệu cung cấp */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center justify-between mb-4 border-b pb-2">
                            <h2 className="text-lg font-semibold">Vật liệu cung cấp</h2>
                            <button
                                type="button"
                                onClick={() => {
                                    setEditingIndex(null);
                                    setMaterialFormData({ materialName: '', quantity: '', uom: '' });
                                    setIsModalOpen(true);
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-all text-sm font-medium"
                            >
                                <Plus size={16} /> Thêm vật liệu
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Tên vật liệu</th>
                                        <th className="px-4 py-3 text-left">Số lượng</th>
                                        <th className="px-4 py-3 text-left">Đơn vị</th>
                                        <th className="px-4 py-3 w-24"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-sm">
                                    {materials.map((m, i) => (
                                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 font-medium text-gray-700">{m.materialName}</td>
                                            <td className="px-4 py-3">{m.quantity}</td>
                                            <td className="px-4 py-3 text-gray-500">{m.uom}</td>
                                            <td className="px-4 py-3 text-right flex gap-2 justify-end">
                                                <button type="button" onClick={() => { setEditingIndex(i); setMaterialFormData(materials[i]); setIsModalOpen(true); }} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Pencil size={16} /></button>
                                                <button type="button" onClick={() => setMaterials(materials.filter((_, idx) => idx !== i))} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                    {materials.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic text-sm">Chưa có vật liệu nào</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 3. Ghi chú */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 border-l-4 border-l-amber-400">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-amber-800">
                            <FileText size={20} /> Ghi chú kỹ thuật
                        </h2>
                        <textarea
                            name="note"
                            rows={3}
                            value={orderData.note}
                            onChange={handleOrderChange}
                            placeholder="Nhập yêu cầu đặc biệt về may mặc, đóng gói..."
                            className="block w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50/30 transition-all"
                        />
                    </div>

                    {/* Footer Actions */}
                    <div className="flex gap-4 justify-end pt-6 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            disabled={isSubmitting}
                            className="px-8 py-2.5 border border-gray-300 text-gray-600 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-10 py-2.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 shadow-lg shadow-emerald-100 flex items-center gap-2 transition-all active:scale-95 disabled:bg-emerald-400"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                            {isSubmitting ? 'Đang gửi...' : 'Tạo đơn hàng'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Modal - Đảm bảo AddMaterialModal sử dụng đúng key: materialName, quantity, uom */}
            <AddMaterialModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveMaterial}
                formData={materialFormData}
                onChange={(e) => setMaterialFormData({ ...materialFormData, [e.target.name]: e.target.value })}
                editingIndex={editingIndex}
            />
        </DashboardLayout>
    );
}

// Reusable Input Component
function Input({ label, name, value, onChange, type = 'text', placeholder }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">{label}</label>
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="block w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
            />
        </div>
    );
}