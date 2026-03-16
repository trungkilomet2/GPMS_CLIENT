import React from 'react';

export default function Pagination({
    currentPage = 1,
    totalPages = 1,
    onPageChange,
    totalCount,
    pageSize,
    className = '',
    showSummary = true,
}) {
    const safeTotalPages = Math.max(1, Number(totalPages) || 1);
    const safeCurrent = Math.min(Math.max(1, Number(currentPage) || 1), safeTotalPages);

    const goToPage = (p) => {
        if (!onPageChange) return;
        const next = Math.max(1, Math.min(safeTotalPages, p));
        if (next !== safeCurrent) onPageChange(next);
    };

    const buttonBase = 'px-3 py-2 border rounded-lg transition cursor-pointer hover:bg-slate-100 hover:border-slate-300';
    const buttonDisabled = 'opacity-40';
    const pageButtonBase = 'px-3 py-2 min-w-10 rounded-lg border transition cursor-pointer hover:bg-slate-100 hover:border-slate-300';

    const renderPages = () => {
        const pages = [];
        for (let i = 1; i <= safeTotalPages; i += 1) {
            if (i === 1 || i === safeTotalPages || Math.abs(i - safeCurrent) <= 2) {
                pages.push(
                    <button
                        key={i}
                        onClick={() => goToPage(i)}
                        className={`${pageButtonBase} ${i === safeCurrent ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-600' : ''}`}
                    >
                        {i}
                    </button>
                );
            } else if (Math.abs(i - safeCurrent) === 3) {
                pages.push(
                    <span key={`ellipsis-${i}`} className="px-2 text-slate-400">...</span>
                );
            }
        }
        return pages;
    };

    return (
        <div className={`flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-slate-600 ${className}`}>
            {showSummary && Number.isFinite(totalCount) && Number.isFinite(pageSize) && (
                <div>
                    Hiển thị {(safeCurrent - 1) * pageSize + 1} - {Math.min(safeCurrent * pageSize, totalCount)} / {totalCount}
                </div>
            )}
            <div className="flex gap-2 flex-wrap justify-center">
                <button
                    onClick={() => goToPage(1)}
                    disabled={safeCurrent === 1}
                    className={`${buttonBase} ${safeCurrent === 1 ? buttonDisabled : ''}`}
                >
                    Đầu
                </button>
                <button
                    onClick={() => goToPage(safeCurrent - 1)}
                    disabled={safeCurrent === 1}
                    className={`${buttonBase} ${safeCurrent === 1 ? buttonDisabled : ''}`}
                >
                    Trước
                </button>

                {renderPages()}

                <button
                    onClick={() => goToPage(safeCurrent + 1)}
                    disabled={safeCurrent === safeTotalPages}
                    className={`${buttonBase} ${safeCurrent === safeTotalPages ? buttonDisabled : ''}`}
                >
                    Sau
                </button>
                <button
                    onClick={() => goToPage(safeTotalPages)}
                    disabled={safeCurrent === safeTotalPages}
                    className={`${buttonBase} ${safeCurrent === safeTotalPages ? buttonDisabled : ''}`}
                >
                    Cuối
                </button>
            </div>
        </div>
    );
}
