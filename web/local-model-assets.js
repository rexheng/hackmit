import {createReadStream, existsSync, statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

import {VEHICLES} from '../shared/vehicles.js';
const assetsRoot = fileURLToPath(new URL('./local-assets/', import.meta.url));
const types = {gltf: 'model/gltf+json', glb: 'model/gltf-binary', bin: 'application/octet-stream', png: 'image/png', txt: 'text/plain', json: 'application/json'};

export const serveYZF = (req, res) => serveVehicleAsset('yzf-2021', req, res);
export function serveVehicleAsset(vehicleId, req, res, localRoot = assetsRoot) {
  if (!VEHICLES[vehicleId]) { res.statusCode = 404; return res.end(); }
  if (!['GET', 'HEAD'].includes(req.method)) { res.statusCode = 405; return res.end(); }
  let name;
  try { name = decodeURIComponent(req.url.split('?')[0]).replace(/^\//, ''); }
  catch { res.statusCode = 400; return res.end('Invalid asset path.'); }
  if (!/^(scene\.(gltf|bin)|model\.glb|audit\.json|license\.txt|textures\/[^/\\]+\.png)$/.test(name) || name.includes('..')) {
    res.statusCode = 404; return res.end('Unknown model asset.');
  }
  let path = resolve(localRoot, vehicleId, name);
  // Lossless HTTP compression; decoded GLB is identical to the file on disk.
  const acceptsBrotli = (req.headers['accept-encoding'] || '').split(',').some(value => {
    const [encoding, ...params] = value.trim().split(';');
    const quality = params.find(p => /^\s*q\s*=/.test(p));
    return encoding === 'br' && (!quality || Number(quality.split('=')[1]) > 0);
  });
  const encoded = name === 'model.glb' && acceptsBrotli && existsSync(`${path}.br`);
  if (encoded) path += '.br';
  try {
    const stat = statSync(path);
    if (!stat.isFile()) throw new Error('Not a file');
    res.setHeader('Content-Type', types[name.split('.').pop()] || 'application/octet-stream');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Vary', 'Accept-Encoding');
    if (encoded) res.setHeader('Content-Encoding', 'br');
    if (req.method === 'HEAD') return res.end();
    const stream = createReadStream(path);
    stream.on('error', () => res.destroy());
    res.on('close', () => stream.destroy());
    stream.pipe(res);
  } catch { res.statusCode = 404; res.end('Local vehicle model is not installed.'); }
}

export function localYZFPlugin() {
  const configure = server => { for (const id of Object.keys(VEHICLES)) server.middlewares.use(`/models/${id}/`, (req,res) => serveVehicleAsset(id,req,res)); };
  return {name: 'local-vehicle-models', configureServer: configure, configurePreviewServer: configure};
}
