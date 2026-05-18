import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { AdaptivityProvider, AppRoot, Button, Card, Div, FormItem, Group, Header, Panel, PanelHeader, Select, SimpleCell, SplitCol, SplitLayout, Tabs, TabsItem } from '@vkontakte/vkui';
import '@vkontakte/vkui/dist/vkui.css';
import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_BACKEND_URL);

function App(){
  const [tab,setTab]=useState<'passenger'|'driver'|'admin'>('passenger');
  const [meter,setMeter]=useState<any>(null);
  const [logs,setLogs]=useState<string[]>([]);
  const [tariff,setTariff]=useState('economy');
  useEffect(()=>{
    socket.on('meter:update', (m)=>setMeter(m));
    socket.onAny((ev,p)=>setLogs(l=>[`${ev}: ${JSON.stringify(p).slice(0,120)}`,...l].slice(0,20)));
  },[]);
  const dashboard = useMemo(()=> (
    <Card mode='shadow'><Div>Дистанция: {meter?.distanceKm?.toFixed?.(2) ?? '0.00'} км<br/>Время: {meter?.durationMin?.toFixed?.(1) ?? '0.0'} мин<br/>Тариф км: {meter?.perKm ?? '-'} ₽<br/>Тариф мин: {meter?.perMinute ?? '-'} ₽<br/>Итого: {meter?.livePrice?.toFixed?.(2) ?? '0.00'} ₽</Div></Card>
  ),[meter]);
  return <AdaptivityProvider><AppRoot><SplitLayout header={<PanelHeader>Taximeter</PanelHeader>}><SplitCol><Panel id='main'><Group><Tabs>
    <TabsItem selected={tab==='passenger'} onClick={()=>setTab('passenger')}>Пассажир</TabsItem><TabsItem selected={tab==='driver'} onClick={()=>setTab('driver')}>Водитель</TabsItem><TabsItem selected={tab==='admin'} onClick={()=>setTab('admin')}>Админ</TabsItem></Tabs>
    {tab==='passenger' && <><Header>Заказ поездки</Header><FormItem top='Тариф'><Select value={tariff} onChange={(e)=>setTariff(e.target.value)} options={[{label:'Эконом',value:'economy'},{label:'Комфорт',value:'comfort'},{label:'Бизнес',value:'business'}]}/></FormItem><Button size='l' stretched onClick={()=>fetch(`${import.meta.env.VITE_BACKEND_URL}/api/orders`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({passengerId:'demo-passenger',pickupLat:55.75,pickupLng:37.61,destLat:55.77,destLng:37.65,tariff,paymentMethod:'cash'})})}>Создать заказ</Button>{dashboard}</>}
    {tab==='driver' && <><Header>Рабочая смена</Header><Button onClick={()=>socket.emit('driver:location',{driverId:'demo-driver',lat:55.75+Math.random()/100,lng:37.61+Math.random()/100,orderId:'demo-order'})}>Отправить GPS</Button><Button onClick={()=>socket.emit('ride:start',{orderId:'demo-order',lat:55.75,lng:37.61})}>Старт поездки</Button><Button onClick={()=>socket.emit('ride:end',{orderId:'demo-order'})}>Завершить поездку</Button>{dashboard}</>}
    {tab==='admin' && <><Header>Центр управления</Header><Button onClick={()=>socket.emit('admin:simulation:start',{speedMultiplier:5})}>Симуляция 5x</Button><Group header={<Header>Логи</Header>}>{logs.map((l,i)=><SimpleCell key={i}>{l}</SimpleCell>)}</Group></>}
  </Group></Panel></SplitCol></SplitLayout></AppRoot></AdaptivityProvider>
}
ReactDOM.createRoot(document.getElementById('root')!).render(<App/>);
