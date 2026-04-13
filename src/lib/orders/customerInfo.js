const pickFirstNonEmpty = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }
  return "";
};

export const getOrderCustomerId = (order) => {
  if (!order) return null;
  return (
    order.userId ??
    order.customerId ??
    order.ownerId ??
    order.user?.id ??
    order.user?.userId ??
    null
  );
};

export const getOrderCustomerInfo = (order, profile = null) => ({
  name: pickFirstNonEmpty(
    order?.userFullName,
    profile?.fullName,
    profile?.name,
    order?.guest?.fullName,
    order?.guestName,
    order?.customerName,
    order?.userName,
    order?.fullName,
    order?.user?.fullName,
    order?.user?.name
  ),
  phone: pickFirstNonEmpty(
    order?.userPhone,
    profile?.phoneNumber,
    profile?.phone,
    order?.guest?.phoneNumber,
    order?.guestPhone,
    order?.customerPhone,
    order?.phone,
    order?.phoneNumber,
    order?.user?.phoneNumber,
    order?.user?.phone
  ),
  address: pickFirstNonEmpty(
    order?.userLocation,
    profile?.location,
    profile?.address,
    order?.guest?.address,
    order?.guestAddress,
    order?.customerAddress,
    order?.address,
    order?.location,
    order?.user?.address,
    order?.user?.location
  ),
});
