import 'dotenv/config';
import express from 'express';
import {vehicleVisionRoutes} from './routes/vehicle-vision.js';
import {vendorDirectoryRoutes} from './routes/vendor-directory.js';
const app = express();
app.use('/api/vehicles', vehicleVisionRoutes());
app.use('/api/vehicles', vendorDirectoryRoutes());
app.listen(3001, '127.0.0.1', () => console.log('Vehicle vision API listening on http://127.0.0.1:3001'));
