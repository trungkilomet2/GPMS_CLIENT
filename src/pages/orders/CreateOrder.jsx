import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Plus, Trash, ArrowLeft, Upload, Pencil } from 'lucide-react';
import AddMaterialModal from '@/components/AddMaterialModal';

export default function CreateOrder() {
    const [softFiles, setSoftFiles] = useState([]);

    const navigate = useNavigate();
    const [materials, setMaterials] = useState([
        { name: 'Vải', qty: 100, uom: 'Mét' },
        { name: 'Cúc áo', qty: 200, uom: 'Cái' },
        { name: 'Chỉ', qty: 20, uom: 'Cuộn' },
    ]);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState(null); // null = thêm mới
    const [formData, setFormData] = useState({ name: '', qty: '', uom: '' });

    const openAddModal = () => {
        setEditingIndex(null);
        setFormData({ name: '', qty: '', uom: '' });
        setIsModalOpen(true);
    };

    const openEditModal = (index) => {
        setEditingIndex(index);
        setFormData(materials[index]);
        setIsModalOpen(true);
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSaveMaterial = () => {
        if (!formData.name.trim() || !formData.qty || !formData.uom.trim()) {
            alert('Vui lòng điền đầy đủ thông tin vật liệu');
            return;
        }

        const newMaterial = {
            name: formData.name.trim(),
            qty: Number(formData.qty),
            uom: formData.uom.trim(),
        };

        if (editingIndex === null) {
            // Thêm mới
            setMaterials([...materials, newMaterial]);
        } else {
            // Cập nhật
            const updated = [...materials];
            updated[editingIndex] = newMaterial;
            setMaterials(updated);
        }

        setIsModalOpen(false);
    };

    const removeMaterial = (index) => {
        if (window.confirm('Bạn có chắc muốn xóa vật liệu này?')) {
            setMaterials(materials.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // TODO: gửi dữ liệu lên API (bao gồm materials)
        console.log('Order created!', { materials });
        // navigate('/orders') hoặc tương tự
    };

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto py-8">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded hover:bg-gray-100"
                        aria-label="Quay lại"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">Tạo đơn hàng mới</h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Thông tin đơn hàng - giữ nguyên */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold mb-4">Thông tin đơn hàng</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Loại sản phẩm" name="product" placeholder="Ví dụ: Áo phông" />
                            <Input label="Kích thước" name="size" placeholder="Ví dụ: XL" />
                            <Input label="Màu sắc" name="color" placeholder="Ví dụ: Đen" />
                            <Input label="Số lượng" name="quantity" type="number" />
                            {/* Hình thức mẫu cung cấp */}
                            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">File bản mềm</label>
                                    <div className="mt-1 flex items-center gap-2">
                                        <input type="file" multiple className="border rounded px-2 py-1" />

                                        <Upload size={18} className="text-gray-500" />
                                        <ul className="mt-2 text-sm text-gray-600">
                                            {softFiles.map((f, i) => (
                                                <li key={i}>{f.name} ({(f.size / 1024 / 1024).toFixed(2)} MB)</li>
                                            ))}
                                        </ul>

                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Số lượng bản cứng</label>
                                    <input
                                        type="number"
                                        name="hardCopy"
                                        className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500"
                                        placeholder="Ví dụ: 2"
                                    />
                                </div>
                            </div>
                            <Input label="Thời gian bắt đầu" name="startDate" type="date" />
                            <Input label="Thời gian kết thúc" name="endDate" type="date" />
                            <Input label="Giá mong muốn" name="price" placeholder="0 VND" />
                        </div>
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700">Ghi chú</label>
                            <textarea
                                name="note"
                                rows={3}
                                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500"
                                placeholder="Nhập ghi chú..."
                            />
                        </div>
                    </div>

                    {/* Vật liệu cung cấp */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">Vật liệu cung cấp</h2>
                            <button
                                type="button"
                                onClick={openAddModal}
                                className="flex items-center gap-2 px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                            >
                                <Plus size={16} /> Thêm vật liệu
                            </button>
                        </div>

                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left font-medium text-gray-700">Tên vật liệu</th>
                                    <th className="px-4 py-2 text-left font-medium text-gray-700">Số lượng</th>
                                    <th className="px-4 py-2 text-left font-medium text-gray-700">Đơn vị</th>
                                    <th className="px-4 py-2 w-24"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {materials.map((m, i) => (
                                    <tr key={i}>
                                        <td className="px-4 py-3">{m.name}</td>
                                        <td className="px-4 py-3">{m.qty}</td>
                                        <td className="px-4 py-3">{m.uom}</td>
                                        <td className="px-4 py-3 text-right flex gap-2 justify-end">
                                            <button
                                                type="button"
                                                onClick={() => openEditModal(i)}
                                                className="text-blue-600 hover:text-blue-800"
                                                title="Sửa"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeMaterial(i)}
                                                className="text-red-600 hover:text-red-800"
                                                title="Xóa"
                                            >
                                                <Trash size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {materials.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                                            Chưa có vật liệu nào
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3">
                        <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 border rounded">
                            Hủy bỏ
                        </button>
                        <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700">
                            Tạo đơn
                        </button>
                    </div>
                </form>
            </div>

            <AddMaterialModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveMaterial}
                formData={formData}
                onChange={handleFormChange}
                editingIndex={editingIndex}
            />
        </DashboardLayout>
    );
}

// Giữ nguyên component Input
function Input({ label, name, type = 'text', placeholder }) {
    return (
        <div>
            <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label>
            <input
                type={type}
                name={name}
                id={name}
                placeholder={placeholder}
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
        </div>
    );
}
