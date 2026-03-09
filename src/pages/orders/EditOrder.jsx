import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Plus, Trash, ArrowLeft, Upload, Pencil, Save, FileText } from 'lucide-react';
import AddMaterialModal from '@/components/AddMaterialModal';

const mockDetail = {
    id: 'DH003',
    product: 'Áo phông',
    size: 'M',
    color: 'Đỏ',
    quantity: 200,
    startDate: '2024-03-01',
    endDate: '2024-03-10',
    price: '20000',
    note: 'Yêu cầu kiểm tra kỹ đường may cổ áo.',
    hardCopy: 2, // Số lượng bản cứng
    files: [ // Danh sách file cũ
        { name: 'thiet-ke-ao-phong.pdf', size: '2.4 MB' },
    ],
    materials: [
        { name: 'Vải', qty: 200, uom: 'Mét' },
        { name: 'Cúc áo', qty: 200, uom: 'Cái' },
    ],
};

export default function EditOrder() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [orderData, setOrderData] = useState(mockDetail);
    const [materials, setMaterials] = useState(mockDetail.materials);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState(null);
    const [materialFormData, setMaterialFormData] = useState({ name: '', qty: '', uom: '' });

    const handleOrderChange = (e) => {
        const { name, value } = e.target;
        setOrderData(prev => ({ ...prev, [name]: value }));
    };

    // Xử lý xóa file cũ (chế độ Edit thường cần chức năng này)
    const removeFile = (index) => {
        const updatedFiles = orderData.files.filter((_, i) => i !== index);
        setOrderData(prev => ({ ...prev, files: updatedFiles }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Cập nhật thành công!', { ...orderData, materials });
        alert('Đã lưu thay đổi!');
        navigate(`/orders/${id}`);
    };

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto py-8">
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => navigate(-1)} className="p-2 rounded hover:bg-gray-100">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">Chỉnh sửa đơn hàng #{id}</h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* 1. Thông tin đơn hàng */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold mb-4 border-b pb-2">Thông tin đơn hàng</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Loại sản phẩm" name="product" value={orderData.product} onChange={handleOrderChange} />
                            <Input label="Kích thước" name="size" value={orderData.size} onChange={handleOrderChange} />
                            <Input label="Màu sắc" name="color" value={orderData.color} onChange={handleOrderChange} />
                            <Input label="Số lượng" name="quantity" type="number" value={orderData.quantity} onChange={handleOrderChange} />
                            <Input label="Thời gian bắt đầu" name="startDate" type="date" value={orderData.startDate} onChange={handleOrderChange} />
                            <Input label="Thời gian kết thúc" name="endDate" type="date" value={orderData.endDate} onChange={handleOrderChange} />
                            <Input label="Giá mong muốn" name="price" value={orderData.price} onChange={handleOrderChange} />
                        </div>
                    </div>

                    {/* 2. Cung cấp mẫu (Files & Hardcopies) */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold mb-4 border-b pb-2">Mẫu thiết kế & Tài liệu</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* File mềm */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">File bản mềm (PDF, Image)</label>
                                <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 hover:border-emerald-400 transition-colors">
                                    <input type="file" multiple className="hidden" id="file-upload" />
                                    <label htmlFor="file-upload" className="flex flex-col items-center cursor-pointer">
                                        <Upload className="text-gray-400 mb-2" size={24} />
                                        <span className="text-sm text-gray-500">Click để tải lên file mới</span>
                                    </label>
                                </div>
                                {/* Hiển thị danh sách file hiện có */}
                                <ul className="mt-4 space-y-2">
                                    {orderData.files.map((file, index) => (
                                        <li key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-100">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <FileText size={16} className="text-blue-500 shrink-0" />
                                                <span className="text-sm text-gray-700 truncate">{file.name}</span>
                                            </div>
                                            <button type="button" onClick={() => removeFile(index)} className="text-red-500 hover:text-red-700 ml-2">
                                                <Trash size={14} />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Bản cứng */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Số lượng bản cứng</label>
                                <input
                                    type="number"
                                    name="hardCopy"
                                    value={orderData.hardCopy}
                                    onChange={handleOrderChange}
                                    className="block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    placeholder="Ví dụ: 2"
                                />
                                <p className="mt-2 text-xs text-gray-400 font-italic">
                                    * Bản cứng dùng để công nhân đối chiếu trực tiếp tại xưởng.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 3. Vật liệu & Ghi chú (Giữ nguyên logic cũ) */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-4 border-b pb-2">
                            <h2 className="text-lg font-semibold">Vật liệu cung cấp</h2>
                            <button type="button" onClick={() => { setEditingIndex(null); setMaterialFormData({ name: '', qty: '', uom: '' }); setIsModalOpen(true); }}
                                className="flex items-center gap-2 px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 shadow-sm transition-all">
                                <Plus size={16} /> Thêm vật liệu
                            </button>
                        </div>
                        {/* Table vật liệu ở đây... (giống code trước) */}
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] tracking-wider">
                                <tr>
                                    <th className="px-4 py-3 text-left font-bold">Tên vật liệu</th>
                                    <th className="px-4 py-3 text-left font-bold">Số lượng</th>
                                    <th className="px-4 py-3 text-left font-bold">Đơn vị</th>
                                    <th className="px-4 py-3 w-24"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {materials.map((m, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-700">{m.materialName}</td>
                                        <td className="px-4 py-3">{m.quantity}</td>
                                        <td className="px-4 py-3 text-gray-500">{m.uom}</td>
                                        <td className="px-4 py-3 text-right flex gap-2 justify-end">
                                            <button type="button" onClick={() => { setEditingIndex(i); setMaterialFormData(materials[i]); setIsModalOpen(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil size={16} /></button>
                                            <button type="button" onClick={() => setMaterials(materials.filter((_, idx) => idx !== i))} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* 4. Ghi chú quan trọng (Tách biệt hoàn toàn xuống dưới) */}
                    <div className="bg-white rounded-lg shadow p-6 mb-6 border-l-4 border-l-amber-400">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-amber-700">
                            <FileText size={20} /> Ghi chú từ khách hàng
                        </h2>
                        <textarea
                            name="note"
                            rows={4}
                            value={orderData.note}
                            onChange={handleOrderChange}
                            placeholder="Nhập các yêu cầu kỹ thuật đặc biệt hoặc lưu ý về đường may..."
                            className="block w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50/50"
                        />
                        <p className="mt-2 text-sm text-gray-500">
                            * Ghi chú này sẽ được hiển thị trực tiếp trên lệnh sản xuất của công nhân.
                        </p>
                    </div>


                    {/* Footer Buttons */}
                    <div className="flex gap-3 justify-end pt-4 border-t">
                        <button type="button" onClick={() => navigate(-1)} className="px-6 py-2 border border-gray-300 text-gray-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors">
                            Hủy bỏ
                        </button>
                        <button type="submit" className="px-10 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 shadow-lg shadow-emerald-200 flex items-center gap-2 transition-all active:scale-95">
                            <Save size={18} /> Lưu thay đổi
                        </button>
                    </div>
                </form>
            </div>

            <AddMaterialModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={() => {
                    const newMaterial = { ...materialFormData, qty: Number(materialFormData.qty) };
                    if (editingIndex === null) setMaterials([...materials, newMaterial]);
                    else {
                        const updated = [...materials];
                        updated[editingIndex] = newMaterial;
                        setMaterials(updated);
                    }
                    setIsModalOpen(false);
                }}
                formData={materialFormData}
                onChange={(e) => setMaterialFormData({ ...materialFormData, [e.target.name]: e.target.value })}
                editingIndex={editingIndex}
            />
        </DashboardLayout>
    );
}

function Input({ label, name, value, onChange, type = 'text' }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
            />
        </div>
    );
}