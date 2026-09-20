import 'dotenv/config';
import {MongoClient} from 'mongodb';
import {directorySnapshot} from '../shared/vendors.js';
// Separate from deterministic demo prices. Upsert only this curated dataset's own IDs.
if(!process.env.MONGODB_URI)throw new Error('Set MONGODB_URI to import the directory. File-backed JSON/CSV works without MongoDB.');
const client=new MongoClient(process.env.MONGODB_URI);
try{
  await client.connect();const db=client.db(process.env.MONGODB_DB||'bike');
  const {vendors,offers}=directorySnapshot();
  for(const [name,rows] of [['vendorDirectory',vendors],['vendorOffers',offers]]){
    await db.collection(name).createIndex({id:1},{unique:true});
    await db.collection(name).bulkWrite(rows.map(row=>({updateOne:{filter:{id:row.id},update:{$set:row},upsert:true}})));
  }
  console.log(`Imported ${vendors.length} directory records and ${offers.length} offers. Demo prices and quotes were not modified.`);
}finally{await client.close();}
