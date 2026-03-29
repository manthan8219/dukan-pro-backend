/** Structured postal address lines; reusable for billing, shipping, shop location. */
export interface StructuredAddress {
  line1: string | null;
  line2: string | null;
  city: string | null;
  stateRegion: string | null;
  postalCode: string | null;
  country: string | null;
}
