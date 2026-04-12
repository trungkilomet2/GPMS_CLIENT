import { Info } from "lucide-react";
import { getOrderCustomerInfo } from "@/lib/orders/customerInfo";

export default function CustomerInfoCard({
  order,
  profile = null,
  title = "Thông tin khách hàng",
  nameLabel = "Tên khách hàng",
  phoneLabel = "Số điện thoại",
  addressLabel = "Địa chỉ",
  className = "rounded-2xl border border-black bg-white shadow-sm p-6",
  titleClassName = "text-[10px] font-bold uppercase tracking-[0.15em] text-gray-600 mb-4",
  rowClassName = "flex items-start justify-between gap-4",
  showHeaderIcon = false,
}) {
  const customerInfo = getOrderCustomerInfo(order, profile);

  return (
    <div className={className}>
      {title ? (
        showHeaderIcon ? (
          <div className="mb-4 flex items-center gap-2 text-gray-600">
            <Info size={16} />
            <h2 className="text-[10px] font-bold uppercase tracking-[0.15em]">{title}</h2>
          </div>
        ) : (
          <div className={titleClassName}>{title}</div>
        )
      ) : null}
      <div className="space-y-4 text-[13px] text-gray-700">
        <div className={rowClassName}>
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider shrink-0 mt-0.5">{nameLabel}</span>
          <span className="font-bold text-gray-900 text-right leading-tight">{customerInfo.name || "-"}</span>
        </div>
        <div className={rowClassName}>
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider shrink-0 mt-0.5">{phoneLabel}</span>
          <span className="font-bold text-gray-800 text-right">{customerInfo.phone || "-"}</span>
        </div>
        <div className={rowClassName}>
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider shrink-0 mt-0.5">{addressLabel}</span>
          <span className="font-bold text-gray-700 text-right leading-relaxed">{customerInfo.address || "-"}</span>
        </div>
      </div>
    </div>
  );
}
