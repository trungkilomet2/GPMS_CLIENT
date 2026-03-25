const pickFirstNonEmpty = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }
  return "";
};

export const getOrderCustomerId = (order) =>
  order?.userId ??
  order?.customerId ??
  order?.ownerId ??
  order?.user?.id ??
  order?.user?.userId ??
  null;

export const getOrderCustomerInfo = (order, profile = null) => ({
  name: pickFirstNonEmpty(
    profile?.fullName,
    profile?.name,
    order?.customerName,
    order?.userName,
    order?.fullName,
    order?.user?.fullName,
    order?.user?.name
  ),
  phone: pickFirstNonEmpty(
    profile?.phoneNumber,
    profile?.phone,
    order?.customerPhone,
    order?.phone,
    order?.phoneNumber,
    order?.user?.phoneNumber,
    order?.user?.phone
  ),
  address: pickFirstNonEmpty(
    profile?.location,
    profile?.address,
    order?.customerAddress,
    order?.address,
    order?.location,
    order?.user?.address,
    order?.user?.location
  ),
});
