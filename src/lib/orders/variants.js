/**
 * Logic chi tiết để chuyển đổi từ dữ liệu thô của API (nhiều cấu trúc khác nhau qua các thời kỳ)
 * sang định dạng mảng các dòng (variants) để hiển thị lên bảng Ma trận (Matrix).
 */
export const processOrderVariants = (order) => {
    if (!order) return [];

    const SIZE_ID_TO_KEY = { 1: 'xs', 2: 's', 3: 'm', 4: 'l', 5: 'xl', 6: '2xl', 7: '3xl' };
    const grouped = {};

    // 1. Tìm kiếm mảng danh sách (Nhiều cấu trúc khác nhau của API)
    const rawList = 
        order.sizes || 
        order.orderSize || 
        order.orderSizes || 
        order.orderDetails || 
        order.orderDetailsList ||
        order.variants || 
        order.variantMatrix ||
        order.items || 
        (Array.isArray(order.size) ? order.size : null) || 
        [];

    if (Array.isArray(rawList) && rawList.length > 0) {
        // Kiểm tra xem đây là cấu trúc ngang (nhiều cột size) hay dọc (mỗi dòng 1 size)
        const isHorizontal = rawList.some(v => 
            v.xs || v.s || v.m || v.l || v.xl || v['2xl'] || v['3xl'] || 
            v.XS || v.S || v.M || v.L || v.XL || v['2XL'] || v['3XL']
        );

        if (isHorizontal) {
            return rawList.map(v => ({
                color: v.colorName || v.color || v.colorCode || 'Phối màu',
                colorCode: v.colorCode,
                xs: Number(v.xs || v.XS || 0),
                s: Number(v.s || v.S || 0),
                m: Number(v.m || v.M || 0),
                l: Number(v.l || v.L || 0),
                xl: Number(v.xl || v.XL || 0),
                '2xl': Number(v['2xl'] || v['2XL'] || 0),
                '3xl': Number(v['3xl'] || v['3XL'] || 0),
            }));
        }

        // Xử lý cấu trúc dọc (Group by Color + Smart Occupancy)
        const colorGroupsMap = {};

        rawList.forEach((item, idx) => {
            const color = item.colorName || item.color || item.colorCode || 'Chưa xác định';
            const sizeKeyFound = (item.sizeName || item.sizeValue || item.size || '').toLowerCase() || SIZE_ID_TO_KEY[item.sizeId];
            const sizeKey = sizeKeyFound || 's';
            
            const variantId = item.orderDetailId || item.orderDetailID || item.order_detail_id || item.variantId || item.orderVariantId || '';

            if (!colorGroupsMap[color]) {
                colorGroupsMap[color] = [];
            }

            // Tìm một nhóm cho màu này mà:
            // 1. Khớp với variantId (nếu có)
            // 2. HOẶC chưa có size này (nếu không có variantId, dùng logic kiểm tra ô trống)
            let targetGroup = colorGroupsMap[color].find(g => {
                if (variantId && g.variantId === variantId) return true;
                if (!variantId && !g.variantId && (g[sizeKey] === 0)) return true;
                return false;
            });

            if (!targetGroup) {
                targetGroup = { 
                    id: variantId || `v-${idx}-${Date.now()}`,
                    variantId: variantId,
                    color, 
                    colorCode: item.colorCode, 
                    xs: 0, s: 0, m: 0, l: 0, xl: 0, '2xl': 0, '3xl': 0,
                    idMap: {} 
                };
                colorGroupsMap[color].push(targetGroup);
            }

            if (targetGroup[sizeKey] !== undefined) {
                targetGroup[sizeKey] += (Number(item.quantity) || 0);
                // Lưu ID của bản ghi size cụ thể này
                const osId = item.id || item.orderSizeId || item.orderSizeID || item.order_size_id;
                if (osId) {
                    targetGroup.idMap[sizeKey] = osId;
                }
            }
        });
        
        return Object.values(colorGroupsMap).flat();
    }

    // 2. Fallback: single color/size (Dành cho đơn hàng đơn giản)
    const singleColor = order.colorName || order.color || order.colorCode;
    const singleSize = order.sizeName || order.size;

    if (singleColor || (typeof singleSize === 'string' && singleSize)) {
        const s = String(singleSize || '').toLowerCase();
        const record = { 
            color: singleColor || 'Mặc định', 
            xs: 0, s: 0, m: 0, l: 0, xl: 0, '2xl': 0, '3xl': 0 
        };
        if (s && record[s] !== undefined) record[s] = Number(order.quantity) || 0;
        else record.s = Number(order.quantity) || 0;
        return [record];
    }

    return [];
};
