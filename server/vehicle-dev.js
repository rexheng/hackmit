import 'dotenv/config';
import express from 'express';
import {vehicleVisionRoutes} from './routes/vehicle-vision.js';
const app = express();
app.use('/api/vehicles', vehicleVisionRoutes());
app.listen(3001, '127.0.0.1', () => console.log('Vehicle vision API listening on http://127.0.0.1:3001'));
