import {readFile, writeFile, stat, readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve, dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {brotliCompressSync, brotliDecompressSync, constants} from 'node:zlib';
import assert from 'node:assert/strict';
import {NodeIO} from '@gltf-transform/core';
import {VEHICLES} from '../../shared/vehicles.js';
import {ALL_EXTENSIONS, EXTMeshoptCompression} from '@gltf-transform/extensions';
import {MeshoptEncoder, MeshoptDecoder} from 'meshoptimizer';

const vehicleId = process.argv[2] || 'yzf-2021';
if (!VEHICLES[vehicleId]) throw new Error('Unknown vehicle');
const folder = resolve(dirname(fileURLToPath(import.meta.url)), '../../web/local-assets', vehicleId);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder});
await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
const input = await io.read(resolve(folder, 'scene.gltf'));
const source = input.getRoot();

// Only the lossless codec. No quantization, mesh joining, simplification,
// texture conversion, hierarchy flattening, or removal of unused source nodes.
input.createExtension(EXTMeshoptCompression).setRequired(true)
  .setEncoderOptions({method: EXTMeshoptCompression.EncoderMethod.QUANTIZE});
const target = resolve(folder, 'model.glb');
await io.write(target, input);
// The writer omits near-identity transforms by tolerance. Restore the exact
// source transforms so even tiny authored rotations survive the round trip.
const rawSource = JSON.parse(await readFile(resolve(folder, 'scene.gltf'), 'utf8'));
const written = await readFile(target);
const jsonLength = written.readUInt32LE(12);
const outputJSON = JSON.parse(written.subarray(20, 20 + jsonLength).toString());
for (let i = 0; i < rawSource.nodes.length; i++) {
  assert.equal(outputJSON.nodes[i].name, rawSource.nodes[i].name);
  for (const field of ['matrix', 'translation', 'rotation', 'scale']) {
    if (rawSource.nodes[i][field]) outputJSON.nodes[i][field] = rawSource.nodes[i][field];
    else delete outputJSON.nodes[i][field];
  }
}
const jsonText = JSON.stringify(outputJSON);
const jsonBytes = Buffer.from(jsonText + ' '.repeat((4 - Buffer.byteLength(jsonText) % 4) % 4));
const binaryChunks = written.subarray(20 + jsonLength);
const header = Buffer.alloc(20);
header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4);
header.writeUInt32LE(20 + jsonBytes.length + binaryChunks.length, 8);
header.writeUInt32LE(jsonBytes.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
await writeFile(target, Buffer.concat([header, jsonBytes, binaryChunks]));
const decoded = (await io.read(target)).getRoot();
const counts = root => ({nodes: root.listNodes().length, meshes: root.listMeshes().length, materials: root.listMaterials().length, textures: root.listTextures().length, skins: root.listSkins().length});
assert.deepEqual(counts(decoded), counts(source));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
let triangles = 0, attributesVerified = 0;
for (let m = 0; m < source.listMeshes().length; m++) {
  const a = source.listMeshes()[m], b = decoded.listMeshes()[m];
  assert.equal(a.getName(), b.getName());
  assert.equal(a.listPrimitives().length, b.listPrimitives().length);
  for (let p = 0; p < a.listPrimitives().length; p++) {
    const x = a.listPrimitives()[p], y = b.listPrimitives()[p];
    assert.deepEqual(x.listSemantics(), y.listSemantics());
    assert.equal(x.getMaterial()?.getName(), y.getMaterial()?.getName());
    for (const semantic of x.listSemantics()) {
      const xa = x.getAttribute(semantic), ya = y.getAttribute(semantic);
      assert.equal(xa.getNormalized(), ya.getNormalized());
      assert.equal(xa.getType(), ya.getType());
      const u = xa.getArray(), v = ya.getArray();
      assert.equal(u.constructor.name, v.constructor.name);
      assert.equal(hash(new Uint8Array(u.buffer, u.byteOffset, u.byteLength)), hash(new Uint8Array(v.buffer, v.byteOffset, v.byteLength)), `Attribute changed: ${m}/${semantic}`);
      attributesVerified++;
    }
    const u = x.getIndices().getArray(), v = y.getIndices().getArray();
    assert.equal(u.length, v.length);
    assert.equal(x.getMode(), 4);
    for (let i = 0; i < u.length; i += 3) {
      // The triangle codec may rotate a triangle's first vertex. Winding and
      // all three vertex indices must remain identical; no triangle is removed.
      assert.ok([0, 1, 2].some(s => [0, 1, 2].every(k => u[i + k] === v[i + (k + s) % 3])), `Triangle changed at ${m}/${i}`);
    }
    triangles += u.length / 3;
  }
}
for (let i = 0; i < source.listNodes().length; i++) {
  const a = source.listNodes()[i], b = decoded.listNodes()[i];
  assert.equal(a.getName(), b.getName());
  assert.deepEqual(a.listChildren().map(n => n.getName()), b.listChildren().map(n => n.getName()));
  assert.deepEqual(a.getMatrix(), b.getMatrix());
}
for (let i = 0; i < source.listTextures().length; i++) {
  assert.equal(hash(source.listTextures()[i].getImage()), hash(decoded.listTextures()[i].getImage()));
}
for (let i = 0; i < source.listSkins().length; i++) {
  const a = source.listSkins()[i], b = decoded.listSkins()[i];
  assert.deepEqual(a.listJoints().map(n => n.getName()), b.listJoints().map(n => n.getName()));
  assert.deepEqual(a.getInverseBindMatrices().getArray(), b.getInverseBindMatrices().getArray());
}
const binary = await readFile(target);
const brotli = brotliCompressSync(binary, {params: {[constants.BROTLI_PARAM_QUALITY]: 11}});
assert.deepEqual(brotliDecompressSync(brotli), binary);
await writeFile(`${target}.br`, brotli);
const sourceFiles = ['scene.gltf', 'scene.bin', 'license.txt', ...(await readdir(resolve(folder, 'textures'))).map(n => `textures/${n}`)];
let originalBytes = 0;
for (const file of sourceFiles) originalBytes += (await stat(resolve(folder, file))).size;
const audit = {
  ...counts(source), triangles, attributesVerified,
  originalBytes, glbBytes: binary.length, transferBytes: brotli.length,
  savingsPercent: Number(((1 - brotli.length / originalBytes) * 100).toFixed(1)),
  geometryAttributes: 'Byte-identical after decoding',
  trianglesCheck: 'Every triangle retained with the same vertices and winding',
  textureCheck: 'Every source image retained byte-for-byte',
  hierarchyCheck: 'All node names, transforms, children and skin joints retained',
  geometrySimplified: false, geometryQuantized: false,
  license: VEHICLES[vehicleId].source.license,
};
await writeFile(resolve(folder, 'audit.json'), JSON.stringify(audit, null, 2) + '\n');
console.log(JSON.stringify(audit, null, 2));
