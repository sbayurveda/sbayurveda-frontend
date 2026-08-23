// Filter shape shared between the dashboard page and the filter panel. Kept in
// its own module so the panel file exports only its component (which is what
// Vite's fast refresh needs to work reliably).

export const EMPTY_FILTERS = {
  search: "",
  dateFrom: "",
  dateTo: "",
  status: "any",
  paymentStatus: "any",
  customerName: "",
  customerEmail: "",
  phone: "",
  paymentMethod: "any",
  productName: "",
  minAmount: "",
  maxAmount: "",
};

export const PAYMENT_STATUSES = [
  { value: "any", label: "All payments" },
  { value: "paid", label: "Paid" },
  { value: "cod", label: "COD — due" },
  { value: "unpaid", label: "Unpaid" },
  { value: "refunded", label: "Refunded" },
  { value: "failed", label: "Failed" },
];

// How many filters are narrowing the list, so the UI can show a count — the
// search box is excluded because it has its own visible input.
export function activeFilterCount(filters) {
  return Object.entries(filters).filter(([key, value]) => {
    if (key === "search") return false;
    return value && value !== "any";
  }).length;
}
