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
        <div className="space-y-3">
            {title && (
                <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</h2>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        {softTemplates.length} file
                    </span>
                </div>
            )}
            
            <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
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
                            <div key={idx} className="flex items-start justify-between p-3 rounded-xl border border-slate-100 hover:border-emerald-200 transition-all bg-slate-50/50 group">
                                <div className="flex items-start gap-3 overflow-hidden w-full">
                                    {isImage ? (
                                        <div 
                                            className="w-10 h-10 rounded-lg shrink-0 bg-slate-100 overflow-hidden cursor-zoom-in border border-slate-200 hover:opacity-80 transition-opacity mt-0.5"
                                            onClick={() => handleZoom(fileUrl)}
                                            title="Xem ảnh chi tiết"
                                        >
                                            <img src={fileUrl} alt="thumbnail" className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="w-10 h-10 rounded-lg shrink-0 bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100 mt-0.5">
                                            <FileText size={18} />
                                        </div>
                                    )}
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <p 
                                            className={`text-sm font-bold text-slate-700 truncate ${isImage ? 'cursor-pointer hover:text-emerald-600 transition-colors' : ''}`} 
                                            title={fileName}
                                            onClick={() => isImage && handleZoom(fileUrl)}
                                        >
                                            {fileName}
                                        </p>
                                        {fileNote && (
                                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed" title={fileNote}>
                                                <span className="font-semibold text-slate-400 mr-1">Ghi chú:</span>{fileNote}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-2 mt-1">
                                            {file.size ? (
                                                <span className="text-[10px] text-slate-400 font-bold uppercase">{file.size}</span>
                                            ) : (
                                                <span className="text-[10px] text-slate-400 font-medium">{isImage ? 'Ảnh đính kèm' : 'File đính kèm'}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {fileUrl ? (
                                    <a 
                                        href={fileUrl} 
                                        download 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="w-8 h-8 rounded-full flex items-center justify-center bg-white text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 border border-slate-200 shadow-sm shrink-0 ml-2 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 mt-0.5" 
                                        title="Tải xuống"
                                    >
                                        <Download size={14} />
                                    </a>
                                ) : (
                                    <span className="text-[10px] text-slate-400 shrink-0 ml-2 mt-2">Không có link</span>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/20">
                        <FileText size={24} className="text-slate-300 mb-2" />
                        <p className="text-slate-400 text-[11px] font-medium px-4">{emptyText}</p>
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
