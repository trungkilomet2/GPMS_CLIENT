import { Info } from "lucide-react";
import { getOrderCustomerInfo } from "@/lib/orders/customerInfo";

export default function CustomerInfoCard({
  order,
  profile = null,
  title = "Thông tin khách hàng",
  nameLabel = "Tên khách hàng",
  phoneLabel = "Số điện thoại",
  addressLabel = "Địa chỉ",
  className = "rounded-2xl border border-slate-200 bg-white shadow-sm p-5",
  titleClassName = "text-xs font-bold uppercase tracking-widest text-slate-600 mb-3",
  rowClassName = "flex items-center justify-between gap-3",
  showHeaderIcon = false,
}) {
  const customerInfo = getOrderCustomerInfo(order, profile);

  return (
    <div className={className}>
      {title ? (
        showHeaderIcon ? (
          <div className="mb-3 flex items-center gap-2 text-slate-600">
            <Info size={16} />
            <h2 className="text-xs font-bold uppercase tracking-widest">{title}</h2>
          </div>
        ) : (
          <div className={titleClassName}>{title}</div>
        )
      ) : null}
      <div className="space-y-2 text-sm text-slate-700">
        <div className={rowClassName}>
          <span className="text-[11px] font-bold text-slate-400 uppercase">{nameLabel}</span>
          <span className="font-semibold text-slate-800 text-right">{customerInfo.name || "-"}</span>
        </div>
        <div className={rowClassName}>
          <span className="text-[11px] font-bold text-slate-400 uppercase">{phoneLabel}</span>
          <span className="font-semibold text-slate-800 text-right">{customerInfo.phone || "-"}</span>
        </div>
        <div className={rowClassName}>
          <span className="text-[11px] font-bold text-slate-400 uppercase">{addressLabel}</span>
          <span className="font-semibold text-slate-800 text-right">{customerInfo.address || "-"}</span>
        </div>
      </div>
    </div>
  );
}
