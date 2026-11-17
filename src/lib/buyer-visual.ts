import { useEffect,useState } from 'react';
import {buyerVisualDefault,type BuyerVisual} from '../../shared/buyer-visual';
export function useBuyerVisual(){const [visual,setVisual]=useState<BuyerVisual>(buyerVisualDefault);useEffect(()=>{const controller=new AbortController();fetch('/api/site/lojistas',{signal:controller.signal}).then(r=>r.ok?r.json():null).then(v=>{if(v?.clips?.length)setVisual(v);}).catch(()=>{});return()=>controller.abort();},[]);return visual;}
