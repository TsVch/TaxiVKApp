import dayjs from 'dayjs';

export function getKtod(now = dayjs()) {
  const day = now.day();
  const hour = now.hour();
  const weekend = day === 0 || day === 6;
  if (!weekend) return hour >= 6 && hour < 22 ? 1.0 : 1.5;
  return hour >= 9 && hour < 22 ? 1.5 : 2.0;
}

export function calcFare(baseFare:number, perKm:number, perMinute:number, distanceKm:number, durationMin:number, ktod:number){
  return Number((baseFare + distanceKm*perKm + durationMin*perMinute*ktod).toFixed(2));
}
