/**
 * GST calculation utilities for Indian tax compliance.
 * Handmade goods in India are subject to 18% GST (CGST + SGST, each 9%).
 */

export interface GSTBreakdown {
  taxableAmount: number;
  gstAmount: number;
  cgst: number;
  sgst: number;
  totalWithGST: number;
}

/**
 * Calculate GST (Goods and Services Tax) for an order subtotal.
 * Defaults to 18% GST rate (9% CGST + 9% SGST) as applicable for
 * handmade goods in India.
 *
 * @param subtotal - The pre-tax amount
 * @param gstRate - GST rate as a decimal (default 0.18 for 18%)
 * @returns GST breakdown with taxable amount, total GST, CGST, SGST, and grand total
 */
export function calculateGST(
  subtotal: number,
  gstRate: number = 0.18
): GSTBreakdown {
  const gstAmount = Math.round(subtotal * gstRate * 100) / 100;
  const cgst = Math.round(gstAmount / 2 * 100) / 100;
  const sgst = Math.round(gstAmount / 2 * 100) / 100;
  const totalWithGST = Math.round((subtotal + gstAmount) * 100) / 100;

  return {
    taxableAmount: subtotal,
    gstAmount,
    cgst,
    sgst,
    totalWithGST,
  };
}