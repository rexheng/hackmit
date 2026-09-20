import {Router} from 'express';
import {directorySnapshot,estimateShipping} from '../../shared/vendors.js';

export function vendorDirectoryRoutes(){
  const router=Router();
  router.get('/vendors', (req,res)=>{
    const {category}=req.query;
    if(category!==undefined&&!['motorcycle','car','bicycle'].includes(category))return res.status(400).json({error:'Use motorcycle, car or bicycle.'});
    const data=directorySnapshot();
    if(category){data.vendors=data.vendors.filter(v=>v.category===category);data.offers=data.offers.filter(o=>o.category===category);}
    res.json(data);
  });
  router.get('/vendors/:id/shipping',(req,res)=>{
    const allowed=['subtotalUsd','postalCode','country','standardParcel'];
    if(Object.keys(req.query).some(k=>!allowed.includes(k))||typeof req.query.subtotalUsd!=='string'||!req.query.subtotalUsd.trim())return res.status(400).json({error:'Supply subtotalUsd and an eligible standardParcel flag.'});
    if(req.query.standardParcel!==undefined&&!['true','false'].includes(req.query.standardParcel))return res.status(400).json({error:'standardParcel must be true or false.'});
    try{res.json(estimateShipping(req.params.id,{subtotalUsd:Number(req.query.subtotalUsd),postalCode:req.query.postalCode??'02139',country:req.query.country??'US',standardParcel:req.query.standardParcel==='true'}));}
    catch(e){res.status(e.message==='Unknown vendor.'?404:400).json({error:e.message});}
  });
  return router;
}
