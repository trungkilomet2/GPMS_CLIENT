import { Pencil, Trash } from 'lucide-react';
import { MATERIALS_TABLE_LABELS } from '@/lib/constants';

const VARIANT_STYLES = {
    create: {
        table: 'min-w-full divide-y divide-gray-200',
        thead: 'bg-gray-50 text-[11px] uppercase font-bold text-gray-500 tracking-wider',
        tbody: 'divide-y divide-gray-100 text-sm bg-white',
        row: 'hover:bg-gray-50 transition-colors',
        nameHeader: 'px-4 py-3 text-left',
        name: 'px-4 py-3 font-semibold text-gray-700 align-middle',
        value: 'px-4 py-3 text-gray-600 align-middle',
        uom: 'px-4 py-3 text-gray-500 align-middle',
        empty: 'px-4 py-10 text-center text-gray-400 italic',
        imageHeader: 'px-4 py-3 text-center w-24',
        valueHeader: 'px-4 py-3 text-left w-32',
        uomHeader: 'px-4 py-3 text-left w-32',
        actionsHeader: 'px-4 py-3 w-24',
    },
    detail: {
        table: 'w-full text-left border-collapse',
        thead: 'bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100',
        tbody: 'divide-y divide-gray-50 text-sm',
        row: 'hover:bg-gray-50/80 transition-colors',
        nameHeader: 'px-6 py-3',
        name: 'px-6 py-4 font-semibold text-gray-700',
        value: 'px-6 py-4 text-center text-emerald-700 font-bold',
        uom: 'px-6 py-4 text-right text-gray-500 font-medium uppercase',
        empty: 'px-6 py-10 text-center text-gray-400 text-xs italic',
        imageHeader: 'px-6 py-3 text-center w-24',
        valueHeader: 'px-6 py-3 text-center',
        uomHeader: 'px-6 py-3 text-right',
        actionsHeader: 'px-6 py-3 w-24',
    },
};

function normalizeMaterial(material = {}) {
    return {
        materialName: material.materialName ?? material.name ?? '',
        value: material.value ?? material.quantity ?? '',
        uom: material.uom ?? '',
        image: material.image ?? '',
        imagePreview: material.imagePreview ?? '',
        note: material.note ?? '',
    };
}

export default function MaterialsTable({
    materials = [],
    variant = 'create',
    showImage = false,
    showActions = false,
    showNote = true,
    onImageClick,
    onEdit,
    onDelete,
    emptyText = 'Danh sách vật liệu đang trống...',
    labels,
}) {
    const styles = VARIANT_STYLES[variant] ?? VARIANT_STYLES.create;
    const defaultLabels = MATERIALS_TABLE_LABELS[variant] ?? MATERIALS_TABLE_LABELS.create;
    const finalLabels = { ...defaultLabels, ...(labels ?? {}) };
    const normalized = materials.map(normalizeMaterial);

    return (
        <table className={styles.table}>
            <thead className={styles.thead}>
                <tr>
                    {showImage && <th className={styles.imageHeader}>{finalLabels.image}</th>}
                    <th className={styles.nameHeader}>{finalLabels.name}</th>
                    <th className={styles.valueHeader}>{finalLabels.value}</th>
                    <th className={styles.uomHeader}>{finalLabels.uom}</th>
                    {showNote && <th className={styles.uomHeader}>{finalLabels.note}</th>}
                    {showActions && <th className={styles.actionsHeader}></th>}
                </tr>
            </thead>
            <tbody className={styles.tbody}>
                {normalized.map((m, i) => (
                    <tr key={i} className={styles.row}>
                        {showImage && (
                            <td className="px-4 py-3 text-center align-middle">
                                {m.image || m.imagePreview ? (
                                    onImageClick ? (
                                        <button
                                            type="button"
                                            onClick={() => onImageClick(m.imagePreview || m.image)}
                                            className="w-12 h-12 border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center mx-auto rounded cursor-zoom-in"
                                            title="Click de zoom"
                                        >
                                            <img src={m.imagePreview || m.image} alt="" className="w-full h-full object-cover" />
                                        </button>
                                    ) : (
                                        <div className="w-12 h-12 border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center mx-auto rounded">
                                            <img src={m.imagePreview || m.image} alt="" className="w-full h-full object-cover" />
                                        </div>
                                    )
                                ) : (
                                    <span className="text-[11px] text-gray-400 inline-flex w-full justify-center">-</span>
                                )}
                            </td>
                        )}
                        <td className={styles.name}>{m.materialName}</td>
                        <td className={styles.value}>{m.value}</td>
                        <td className={styles.uom}>{m.uom}</td>
                        {showNote && (
                            <td className={styles.uom}>
                                {m.note ? m.note : <span className="inline-flex w-full justify-center text-gray-400">-</span>}
                            </td>
                        )}
                        {showActions && (
                            <td className="px-4 py-3 text-right align-middle">
                                <div className="flex gap-3 justify-end items-center">
                                    <button
                                        type="button"
                                        onClick={() => onEdit?.(i)}
                                        className="p-2 rounded border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                                    >
                                        <Pencil size={18} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onDelete?.(i)}
                                        className="p-2 rounded border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                                    >
                                        <Trash size={18} />
                                    </button>
                                </div>
                            </td>
                        )}
                    </tr>
                ))}

                {normalized.length === 0 && (
                    <tr>
                        <td colSpan={(showImage ? 1 : 0) + 3 + (showNote ? 1 : 0) + (showActions ? 1 : 0)} className={styles.empty}>
                            {emptyText}
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
    );
}





