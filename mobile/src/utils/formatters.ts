// Shared utility functions

/**
 * Format a number as Indian Rupees.
 * e.g. 45000 → "₹45,000"
 */
export const formatCurrency = (amount: number | string): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹0';
  return `₹${num.toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  })}`;
};

/**
 * Format a date string (YYYY-MM-DD) as a readable label.
 * e.g. "2025-08-01" → "1 Aug 2025"
 */
export const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Format YYYY-MM to a readable month label.
 * e.g. "2025-08" → "August 2025"
 */
export const formatMonth = (monthStr: string): string => {
  const [year, month] = monthStr.split('-').map(Number);
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

/**
 * Returns the first day of the current month as YYYY-MM-DD.
 */
export const currentMonthStart = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

/**
 * Determine badge color for bed/resident status.
 */
export const statusColor = (status: string): string => {
  switch (status) {
    case 'active':
    case 'vacant':
      return '#10B981';
    case 'checked_out':
    case 'occupied':
      return '#EF4444';
    default:
      return '#9CA3AF';
  }
};

/**
 * Payment method display label.
 */
export const paymentMethodLabel = (method: string): string => {
  const labels: Record<string, string> = {
    cash: 'Cash',
    upi: 'UPI',
    bank_transfer: 'Bank Transfer',
    cheque: 'Cheque',
  };
  return labels[method] || method;
};
