import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { prisma } from './lib/prisma.js';
import { TARiffs } from './config/constants.js';
import { calcFare, getKtod } from './services/pricing.js';
import { haversineKm } from './lib/geo.js';
import { rankDrivers } from './services/dispatch.js';
import { startSimulation } from './simulation/engine.js';

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });
const activeMeters = new Map<string, { lastLat:number; lastLng:number; startedAt:number; distanceKm:number; tariff:keyof typeof TARiffs }>();

app.get('/health', (_,res)=>res.json({ok:true}));

app.post('/api/passengers', async (req,res)=>res.json(await prisma.passenger.create({data:req.body})));
app.post('/api/drivers', async (req,res)=>res.json(await prisma.driver.create({data:req.body})));
app.post('/api/admin/topup', async (req,res)=>{
  const { passengerId, amount } = req.body;
  const p = await prisma.passenger.update({ where: { id: passengerId }, data: { balance: { increment: Number(amount) } } });
  io.emit('admin:balanceUpdated', p);
  res.json(p);
});

app.post('/api/orders', async (req,res)=>{
  const { passengerId,pickupLat,pickupLng,destLat,destLng,tariff,paymentMethod } = req.body;
  const t=TARiffs[tariff as keyof typeof TARiffs];
  const estimated = calcFare(t.baseFare,t.perKm,t.perMinute,haversineKm(pickupLat,pickupLng,destLat,destLng),15,getKtod());
  const order=await prisma.order.create({data:{passengerId,pickupLat,pickupLng,destLat,destLng,tariff,paymentMethod,estimatedPrice:estimated,livePrice:t.baseFare}});
  const drivers=await prisma.driver.findMany({where:{status:'free'}});
  const ranked=rankDrivers(drivers,pickupLat,pickupLng).slice(0,8);
  io.emit('dispatch:orderCreated',{order,drivers:ranked.map(r=>({id:r.d.id,distanceKm:r.dist,rating:r.d.rating}))});
  res.json(order);
});

io.on('connection', (socket) => {
  socket.on('driver:location', async (payload) => {
    await prisma.driver.update({ where: { id: payload.driverId }, data: { lat: payload.lat, lng: payload.lng, lastSeenAt:new Date() } });
    io.emit('driver:location', payload);
    if (payload.orderId && activeMeters.has(payload.orderId)) {
      const meter = activeMeters.get(payload.orderId)!;
      const d = haversineKm(meter.lastLat,meter.lastLng,payload.lat,payload.lng);
      meter.distanceKm += d; meter.lastLat = payload.lat; meter.lastLng = payload.lng;
      const durationMin = (Date.now()-meter.startedAt)/60000;
      const t=TARiffs[meter.tariff];
      const livePrice = calcFare(t.baseFare,t.perKm,t.perMinute,meter.distanceKm,durationMin,getKtod());
      await prisma.order.update({where:{id:payload.orderId},data:{distanceKm:meter.distanceKm,durationMin,livePrice}});
      io.emit('meter:update',{orderId:payload.orderId,distanceKm:meter.distanceKm,durationMin,livePrice,perKm:t.perKm,perMinute:t.perMinute});
    }
  });

  socket.on('order:accept', async ({ orderId, driverId }) => {
    const order=await prisma.order.update({ where: { id: orderId }, data: { status: 'accepted', driverId } });
    await prisma.driver.update({ where: { id: driverId }, data: { status: 'busy', currentOrderId: orderId } });
    io.emit('order:accepted', order);
  });

  socket.on('ride:start', async ({ orderId, lat, lng }) => {
    const order=await prisma.order.update({ where: { id: orderId }, data: { status: 'active', startedAt: new Date() } });
    activeMeters.set(orderId, { lastLat:lat,lastLng:lng, startedAt:Date.now(), distanceKm:0, tariff: order.tariff as keyof typeof TARiffs });
    io.emit('ride:started', order);
  });

  socket.on('ride:end', async ({ orderId }) => {
    const meter = activeMeters.get(orderId);
    if (!meter) return;
    const durationMin = (Date.now()-meter.startedAt)/60000;
    const t=TARiffs[meter.tariff];
    const finalPrice = calcFare(t.baseFare,t.perKm,t.perMinute,meter.distanceKm,durationMin,getKtod());
    const order=await prisma.order.update({ where: { id: orderId }, data: { status:'completed', completedAt:new Date(), finalPrice, livePrice:finalPrice, durationMin, distanceKm:meter.distanceKm } });
    if (order.driverId) await prisma.driver.update({ where: { id: order.driverId }, data: { status:'free', currentOrderId:null, currentShiftEarnings:{ increment: finalPrice }, balance:{increment:finalPrice}, idleSince:new Date() } });
    await prisma.passenger.update({ where: { id: order.passengerId }, data: { balance: { decrement: finalPrice } } });
    activeMeters.delete(orderId);
    io.emit('ride:ended', order);
  });

  socket.on('admin:simulation:start', ({speedMultiplier}) => startSimulation(io,speedMultiplier));
});

const PORT = Number(process.env.PORT || 4000);
httpServer.listen(PORT, ()=>console.log(`Taximeter backend on :${PORT}`));
