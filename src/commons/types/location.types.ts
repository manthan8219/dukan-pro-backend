import type { Coordinates } from './coordinates.types';
import type { StructuredAddress } from './structured-address.types';

/** Coordinates + free-text + structured address; reusable across modules. */
export interface Location {
  coordinates: Coordinates;
  addressText: string | null;
  structured: StructuredAddress;
}
