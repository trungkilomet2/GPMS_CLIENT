import { useState } from 'react';
import { FileText, Download } from 'lucide-react';
import OrderImageZoomModal from '@/pages/orders/components/OrderImageZoomModal';

/**
 * Unified Design Templates Section component.
 * Displays a list of soft templates/files with thumbnails and zoom support.
 * 
 * @param {Object} props
 * @param {Array} props.templates - List of template files (raw or pre-filtered)
 * @param {string} props.title - Custom title for the section (optional)
 * @param {string} props.emptyText - Text to show when no files are available (optional)
 */
export default function DesignTemplatesSection({
    templates = [],
    title = "Mẫu thiết kế",
    emptyText = "Không có file thiết kế nào được đính kèm"
}) {
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [zoomImageUrl, setZoomImageUrl] = useState('');

    // Filter soft templates if they haven't been filtered yet
    const softTemplates = templates.filter((t) => {
        const type = (t.type ?? '').toString().toLowerCase();
        return type.includes('soft') || !!t.file || !!t.url;
    });

    const handleZoom = (url) => {
        setZoomImageUrl(url);
        setIsImageModalOpen(true);
    };

    return (
        <div className="space-y-4">
            {title && (
                <div className="flex items-center justify-between">
                    <h2 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{title}</h2>
                    <span className="text-[10px] font-bold text-gray-600 bg-gray-50 px-2.5 py-1 rounded-full">
                        {softTemplates.length} tệp
                    </span>
                </div>
            )}

            <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-100">
                {softTemplates.length > 0 ? (
                    softTemplates.map((file, idx) => {
                        const fileName = file.templateName ?? file.name ?? `File ${idx + 1}`;
                        const fileUrl = file.file ?? file.url ?? '';
                        const fileNote = file.note ?? file.Note ?? '';
                        const isImage = fileUrl && (
                            fileUrl.toLowerCase().match(/\.(jpeg|jpg|gif|png|webp|svg)($|\?)/) ||
                            (file.type && String(file.type).toLowerCase().includes('image'))
                        );

                        return (
                            <div key={idx} className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all group">
                                <div className="flex items-start gap-4 overflow-hidden w-full">
                                    {isImage ? (
                                        <div
                                            className="w-11 h-11 rounded-xl shrink-0 bg-gray-50 overflow-hidden cursor-zoom-in border border-gray-100 hover:opacity-80 transition-opacity"
                                            onClick={() => handleZoom(fileUrl)}
                                            title="Xem ảnh chi tiết"
                                        >
                                            <img src={fileUrl} alt="hình thu nhỏ" className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="w-11 h-11 rounded-xl shrink-0 bg-[#f0f9f4] flex items-center justify-center text-[#1e6e43] border border-[#d4e3da]">
                                            <FileText size={20} />
                                        </div>
                                    )}
                                    <div className="flex flex-col min-w-0 flex-1 justify-center min-h-[44px]">
                                        <p
                                            className={`text-[13px] font-bold text-gray-700 truncate ${isImage ? 'cursor-pointer hover:text-[#1e6e43] transition-colors' : ''}`}
                                            title={fileName}
                                            onClick={() => isImage && handleZoom(fileUrl)}
                                        >
                                            {fileName}
                                        </p>
                                        {fileNote && (
                                            <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1 italic font-medium" title={fileNote}>
                                                {fileNote}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {fileUrl ? (
                                    <a
                                        href={fileUrl}
                                        download
                                        target="_blank"
                                        rel="noreferrer"
                                        className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-50 text-gray-500 hover:text-[#1e6e43] hover:bg-[#f0f9f4] border border-gray-100 shrink-0 ml-2 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 mt-1.5"
                                        title="Tải xuống"
                                    >
                                        <Download size={14} />
                                    </a>
                                ) : (
                                    <span className="text-[10px] text-gray-500 shrink-0 ml-2 mt-3 font-bold">Link trống</span>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
                        <FileText size={28} className="text-gray-200 mb-2" />
                        <p className="text-gray-600 text-[10px] font-bold uppercase tracking-wider px-4">{emptyText}</p>
                    </div>
                )}
            </div>

            <OrderImageZoomModal
                isOpen={isImageModalOpen}
                imageUrl={zoomImageUrl}
                onClose={() => {
                    setIsImageModalOpen(false);
                    setZoomImageUrl('');
                }}
            />
        </div>
    );
}
