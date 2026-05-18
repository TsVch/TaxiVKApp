import { Driver } from '@prisma/client';
import { DISPATCH_RADII_KM } from '../config/constants.js';
import { haversineKm } from '../lib/geo.js';

export function rankDrivers(drivers: Driver[], pickupLat:number, pickupLng:number) {
  return drivers
    .map((d) => ({ d, dist: d.lat && d.lng ? haversineKm(d.lat,d.lng,pickupLat,pickupLng) : Infinity, idle: d.idleSince ? Date.now()-new Date(d.idleSince).getTime() : 0 }))
    .sort((a,b)=>a.dist-b.dist || b.d.rating-a.d.rating || b.idle-a.idle);
}

export function radiusBuckets() { return DISPATCH_RADII_KM; }
