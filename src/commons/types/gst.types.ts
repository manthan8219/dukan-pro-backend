/** GST flags and number; reuse for shops or invoices. */
export interface Gst {
  isGstApplicable: boolean;
  gstNo: string | null;
}
