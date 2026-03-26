import { useState, useEffect } from 'react';
import ProductionService from "@/services/ProductionService";
import { getProductionStatusLabel } from "@/utils/statusUtils";

function getProductionListErrorMessage(error) {
  const status = error?.response?.status;
  const data = error?.response?.data ?? {};

  if (status === 403) {
    return "Bạn không có quyền truy cập danh sách production.";
  }

  if (status === 404) {
    return "Không tìm thấy API danh sách production.";
  }

  if (error?.code === "ECONNABORTED") {
    return "Tải danh sách production quá lâu. Vui lòng thử lại.";
  }

  return data?.message || data?.title || data?.detail || "Không thể tải danh sách production.";
}

export function useProductionList(maxPagesConfig = 20, pageSizeFetchConfig = 50, requestTimeoutMs = 10000) {
  const [productions, setProductions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    let active = true;
    const fetchProductions = async () => {
      try {
        setLoading(true);
        setError("");
        const allItems = [];
        const seenKeys = new Set();
        let pageIndex = 0;
        let recordCount = null;

        while (pageIndex < maxPagesConfig) {
          const response = await ProductionService.getProductionList({
            PageIndex: pageIndex,
            PageSize: pageSizeFetchConfig,
            SortColumn: "Name",
            SortOrder: "ASC",
          }, {
            timeout: requestTimeoutMs,
          });
          if (!active) return;

          const payload = response?.data ?? response;
          const list = Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload)
              ? payload
              : [];

          let added = 0;
          list.forEach((item) => {
            const key = item?.productionId ?? item?.id ?? JSON.stringify(item);
            if (seenKeys.has(key)) return;
            seenKeys.add(key);
            // Ưu tiên statusId (số nguyên, đáng tin cậy) để tránh lỗi encoding chuỗi tiếng Việt
            const rawStatus = (item.statusId != null)
              ? item.statusId
              : (item.statusName ?? item.status);
            const resolvedStatus = getProductionStatusLabel(rawStatus);
            allItems.push({ ...item, statusName: resolvedStatus });
            added += 1;
          });

          if (recordCount == null) {
            const reported = Number(payload?.recordCount ?? payload?.totalCount ?? 0);
            recordCount = Number.isFinite(reported) && reported > 0 ? reported : null;
            if (recordCount != null && recordCount <= list.length) {
              recordCount = null;
            }
          }

          if (list.length === 0) break;
          if (added === 0) break;
          if (recordCount != null && allItems.length >= recordCount) break;
          if (list.length < pageSizeFetchConfig) break;

          pageIndex += 1;
        }

        const sortedItems = [...allItems].sort((a, b) => {
          const aId = Number(a?.productionId ?? a?.id ?? 0);
          const bId = Number(b?.productionId ?? b?.id ?? 0);
          if (Number.isFinite(aId) && Number.isFinite(bId) && aId !== bId) {
            return bId - aId;
          }
          return String(b?.productionId ?? b?.id ?? "").localeCompare(
            String(a?.productionId ?? a?.id ?? "")
          );
        });

        setProductions(sortedItems);
        setTotalCount(allItems.length);
      } catch (err) {
        if (!active) return;
        setError(getProductionListErrorMessage(err));
        setProductions([]);
        setTotalCount(0);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchProductions();
    return () => {
      active = false;
    };
  }, [maxPagesConfig, pageSizeFetchConfig, requestTimeoutMs]);

  return { productions, loading, error, totalCount };
}
