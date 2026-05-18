export const TARiffs = {
  economy: { baseFare: 80, perKm: 12, perMinute: 11 },
  comfort: { baseFare: 120, perKm: 17, perMinute: 15 },
  business: { baseFare: 200, perKm: 26, perMinute: 23 }
} as const;

export const DISPATCH_RADII_KM = [2, 5, 8];
