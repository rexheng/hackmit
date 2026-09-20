# FZ6 model evidence and limits

The repair-accurate, nearly pixel-identical target is **not achieved**.

## Vehicle identity

The reference photographs depict a Fazer S2. The OEM inventory is specifically
2007 FZ6-SHG (4S81), Europe / South Africa. The user's actual year, model code,
market and ABS status have not been confirmed. Do not silently apply this
catalogue to another variant.

## Exterior representations

- `baseline-model.js`: original procedural approximation, retained for comparison.
- `model.js`: refined procedural exterior. Source photos guide proportions;
  detailed engine internals are absent.
- `sourced-model.js`: local evaluation combines Satyam / S3D's 2008 FZ6 shared
  exterior components with the independent procedural Fazer bodywork, seat/tail, fork/caliper and exhaust. The source
  asset has a naked front end. It is an artistic mesh, not dimensional CAD.
  Its uploaded geometry contains 1,418,189 triangles before the local component
  substitutions and front wheel size adjustment. Wheelbase normalization does not verify the other dimensions.

S3D original: https://www.patreon.com/posts/yamaha-fz6-2008-71957179
Listing: https://open3dlab.com/project/c9b98f8b-d0e4-4ccf-9520-69ad33c2ad90/
Uploader lists CC BY-NC-ND 4.0 and says dimensions might not match the real bike.
The 62 MB adapted GLB remains in gitignored `web/local-assets/`; only Vite's local
server serves it. It is not copied into production builds. Material node
conversion, paint, texture resizing and local cowl substitution are adaptations.
Do not redistribute the adapted asset without the necessary permission.

## Internal evidence

`oem-catalogue.json` contains 46 figures and 1,169 rows extracted from the Yamaha
catalogue. These are catalogue rows, not a count of unique physical parts; there
are assembly children, kits, variants, bearing colours and optional rows.
The script preserves the reference number, quantity, description, remarks, page
and subassembly indentation. Quantities within kits are not interchangeable with
physical component counts. `UR` alternatives must not be summed.

Source: https://pecasoriginaisyamaha.com.br/pdfs/sport/FZ6%20S/FZ6S_2007.pdf
Rebuild: `python3 scripts/fz6/build_catalogue.py /path/to/FZ6S_2007.pdf`

The S2 caliper study follows the component inventory on printed manual page 4-30
(PDF 203): two clips, one pin, one spring, two pads, four pistons, eight seals and
one bleed screw, in addition to the housing. Catalogue figure 30 is PDF page 50.
The 30.20 / 27.00 mm figures are **bore specifications**, not measured piston
outside diameters. Clearances, case contours, seal profiles, pad outlines and
fastener positions in the mesh remain approximations. The animation separates
an inventory; it is not a validated disassembly or brake-service procedure.

Service manual: https://download.gkoonz.com/Yamaha_FZ6_2007_ALL_VERSIONS_Service_Manual.pdf

Crankshaft, pistons, valves, camshafts, transmission, clutch, pumps, wiring, and
other internal assemblies have catalogue coverage but not complete validated 3D
meshes. No part is certified as fully dimensionally verified.

## Image comparison

`/fz6/compare` renders actual geometry beside the source photo at an approximate
matched pose. Original photos are never projected onto the model. Side-view
regions provide close inspection; an absolute RGB heatmap exposes differences.

IoU uses foreground pixels with any RGB channel below 205. RGB MAE is calculated
over the union of both foreground masks. No similarity threshold is treated as
proof of correctness. The camera's lens, pose, light rig, exposure, glass and
source shadows remain imperfectly matched. Crops are diagnostic regions, not
segmentation labels. Internal correctness cannot be inferred from these photos.

The downloaded fork/fender surfaces exhibited coincident geometry artifacts.
The main local study uses the independent procedural fork, fender and calipers
instead. Source component splitting was retained in the conversion research.
