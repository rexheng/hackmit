# FZ6 Motion Lab

Run `npm run dev -w web -- --host 127.0.0.1 --port 5173`.

- `/fz6`: orbit, zoom, pan, part selection, studio/PBR, Fresnel X-ray, mesh view,
  paint, exploded groups, camera presets, PNG export and caliper inventory study.
- `/fz6/compare`: source photos against independent matched-angle renders,
  six side-view detail regions, overlay, absolute pixel-difference heatmap,
  foreground IoU and RGB error. Includes original/procedural/local model choices.
- `/fz6/parts`: 46 OEM assembly figures and 1,169 searchable catalogue rows,
  internal caliper study and third-party model research.
- `/`: existing service desk.

**The repair-accurate, pixel-identical objective is not achieved.** Read
[VALIDATION.md](./VALIDATION.md) for exact source coverage and unresolved gaps.
The user's actual vehicle variant is unconfirmed. The internal catalogue is
2007 FZ6-SHG (4S81), Europe / South Africa; the local artistic exterior source
is a 2008 FZ6 with a naked front end, adapted with procedural Fazer bodywork.

## Local detailed mesh

Satyam / S3D's publicly linked Blender model was inspected with embedded scripts
disabled. Source: https://www.patreon.com/posts/yamaha-fz6-2008-71957179
Uploader's licence and dimensional caveat:
https://open3dlab.com/project/c9b98f8b-d0e4-4ccf-9520-69ad33c2ad90/

The adapted GLB is in gitignored `web/local-assets/fz6-s3d.glb`. Vite serves it
only during local development; production builds use the procedural model.
No decimation is applied. Materials are converted to glTF PBR; stock bodywork,
seat/tail, fork/caliper and exhaust are procedural substitutions. The front wheel receives a visual size adjustment. These changes do not establish fit.
The caliper/fender are split from disconnected source fork pieces for selection.

The listed CC BY-NC-ND licence does not permit redistribution of this adapted
asset without permission. It is not bundled in the code or production build.
Conversion script: `scripts/fz6/convert_s3d.py`, requires Blender's `bpy` module.

## CV interface

Photo import and normalized detection JSON are supported. No automatic
recognition, segmentation, calibrated pose estimation, or image-to-mesh
registration is implemented. Detection confidence is not geometry confidence.

```js
window.fz6Viewer.applyDetection({
  partId: 'front-brake', confidence: 0.96,
  bbox: [0.6, 0.5, 0.1, 0.2]
});
window.fz6Viewer.playRepair(); // legacy API name: illustrative inventory study
window.fz6Viewer.getParts();
window.fz6Viewer.selectPart('engine');
window.dispatchEvent(new CustomEvent('fz6:detection', {
  detail: {partId: 'front-brake', confidence: 0.96}
}));
```

Part IDs: `front-brake`, `front-wheel`, `fork`, `fairing`, `tank`, `engine`,
`exhaust`, `frame`, `seat`, `rear-wheel`. These are coarse visual assembly groups,
not a mapping of all catalogue rows to independently validated meshes.

## Evidence

Yamaha S2 release / dimensions:
https://global.yamaha-motor.com/news/2006/1010/fz6-fazer.html

OEM inventory:
https://pecasoriginaisyamaha.com.br/pdfs/sport/FZ6%20S/FZ6S_2007.pdf

Yamaha service manual mirror, S2 caliper inventory PDF 203 / printed 4-30:
https://download.gkoonz.com/Yamaha_FZ6_2007_ALL_VERSIONS_Service_Manual.pdf

Side and three-quarter source-photo galleries:
https://www.1000ps.de/modellnews-id-1916313-yamaha-fz6-s2-2007
https://www.fazer-hispania.com/historico_versiones/historico.htm

Photos © Yamaha Motor Co., Ltd.; third-party assets retain their own licences.
They are not covered by any project code licence.
