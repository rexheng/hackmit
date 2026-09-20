# Vendor research · Cambridge, MA 02139

Public-source snapshot checked September 19, 2026. Canonical records and calculation rules are in `shared/vendors.js`. Run `npm run export:vendors` to regenerate:

- `directory.json`: complete structured data, provenance and shipping rules.
- `vendors.csv`: 14 retailer, catalog and service records.
- `offers.csv`: 7 observed part listings, OEM/SKU identifiers, condition, fitment and price evidence.
- `services.csv`: published local rates and a quote-required Chevrolet service lead.

All five suppliers from Audrey's list are included under **bicycles**. The Pro's Closet has a verified used-components category. Ajo documents used bicycles; standalone used parts are not verified. Recycled Cycling is retained as a sourcing lead and requires a call before online orders. These sellers are not matched to the modeled motorcycles or car.

The three Yamaha catalog links remain separate source records. The researched Rocky Mountain submodel is YZFR1M1CL; Yamaha/Partzilla's supplied catalog is YZFR1M1B / B3LB0. Do not merge regional fitment records. No listing establishes that the imported YZF asset is an R1, or that the current R7 manual applies to it.

## Prices and quotations

Listings are evidence snapshots, not live stock or reserved inventory. `source.access` distinguishes browser/page inspection from search-index evidence. Partzilla blocks direct research-tool access; its Honda prices are indexed evidence. A price range is not collapsed to its minimum. Unknown prices, shipping, tax and totals are null, never zero.

Published service prices are **not individualized quotations**. Madhouse Motors lists standard motorcycle labor at $165/hour; NEMO lists $95 standard bicycle visits and $135 e-bike/cargo visits, plus parts. Quirk Chevrolet requires vehicle-specific pricing; its general oil-change coupon excludes Corvettes. No businesses were contacted, appointments booked, or requests submitted. The UI prepares an editable, unsent request for the user to deliver.

Shipping estimates apply only to eligible standard parcels going to US 02139. They use published seller policies, not a carrier-rate integration. The user must explicitly select the parcel assumption. Oversize, hazardous goods, freight and uncertain threshold boundaries stay quote-required. Dino's C8 exhaust has a known $121 crating fee; freight remains unknown. Taxes and delivered totals are not invented.

## App and database integration

The vehicle viewer's **03 / Suppliers** tab works with the bundled snapshot and allows category/condition filtering, conditional shipping estimates, published-rate labor calculations, quote-request downloads and full JSON export.

Read-only API (both full app and vehicle dev server):

```
GET /api/vehicles/vendors
GET /api/vehicles/vendors?category=motorcycle
GET /api/vehicles/vendors/rocky-mountain/shipping?subtotalUsd=50&postalCode=02139&country=US&standardParcel=true
```

The app serves the checked-in snapshot. For downstream MongoDB work, `npm run seed:vendors` upserts records by `id` into `vendorDirectory` and `vendorOffers` using the configured `MONGODB_URI` and `MONGODB_DB`. This import is optional and was not run against an external database. It does not replace the app's demonstration `prices` collection or turn the existing demo checkout into real commerce.

Next data needed for an actual delivered repair quotation: exact VIN/year/trim/RPO or bicycle specification, confirmed diagnosis, OEM numbers and quantities, item condition, package characteristics, labor scope, provider availability and written estimate validity. Service meshes remain unverified; no parts are automatically ordered or substituted based on a model label.
