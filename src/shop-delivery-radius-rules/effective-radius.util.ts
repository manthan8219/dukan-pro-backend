export type RadiusRuleInput = {
  minOrderAmount: number;
  maxServiceRadiusKm: number;
};

/**
 * Same rule as ShopDeliveryRadiusRulesService.resolveEffectiveRadius:
 * pick the tier with the greatest minOrderAmount that is still <= orderAmountRupees;
 * if none match, use the shop's default serviceRadiusKm.
 */
export function effectiveMaxServiceRadiusKmForOrder(params: {
  shopDefaultRadiusKm: number;
  rules: RadiusRuleInput[];
  orderAmountRupees: number;
}): number {
  const { shopDefaultRadiusKm, rules, orderAmountRupees } = params;
  const sorted = [...rules].sort((a, b) => b.minOrderAmount - a.minOrderAmount);
  const match = sorted.find((r) => orderAmountRupees >= r.minOrderAmount);
  return match !== undefined ? match.maxServiceRadiusKm : shopDefaultRadiusKm;
}
