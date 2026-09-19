/* ON THE RECORD — the real-records ledger for COMPUTE WORKS.
   Reads window.CW_LIVE (built by /pipeline/bundle.py). Adds a brass tab that opens a ledger:
   your bills first, then what is here, what the owners say (checked), the news, the filings.
   Simple first; every line opens for more. Anything missing reads NOT FOUND. Nothing here is invented.
   It also swaps the placeholder clippings on the clipboard for real headlines when it has them.
   It never touches the works' own script: it watches the serial plate to know which site is loaded. */
(function () {
  const L = window.CW_LIVE;
  if (!L) return;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const usd = (n) => "$" + Number(n).toFixed(0);
  const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };
  const link = (u, t) => /^https?:/.test(u) ? '<a href="' + esc(u) + '" target="_blank" rel="noreferrer">' + esc(t || host(u)) + "</a>" : esc(u);
  const FUEL = { coal: "coal", gas: "natural gas", oil: "oil", nuclear: "nuclear", hydro: "dams", wind: "wind", solar: "solar", other: "other" };
  const MARK = { "Holds up": "✓", "Holds on paper only": "≈", "Does not hold up": "✕", "Can't be checked": "?" };
  const ORDER = { "Does not hold up": 0, "Holds on paper only": 1, "Holds up": 2, "Can't be checked": 3 };
  const WHY = { physical_gap: "most of its mapped sites plug into mostly-fossil grids", annual_wording: "yearly bookkeeping wording, easy to read as “runs on”",
    future_target: "a promise about a later year, not a result", hedged: "softening words", no_number: "nothing measurable in the sentence", no_boundary: "does not say which sites it covers" };

  const css = document.createElement("style");
  css.textContent = `
    #recTab{position:fixed;right:0;top:96px;z-index:60;writing-mode:vertical-rl;padding:12px 6px;cursor:pointer;
      font:600 17px/1 "Teko",sans-serif;letter-spacing:.18em;color:var(--ink);background:var(--brass);border:2px solid var(--ink);border-right:0;box-shadow:-3px 3px 0 var(--shadow)}
    #recTab b{color:var(--enamel-deep)}
    #rec{position:fixed;inset:0 0 0 auto;width:min(460px,100vw);z-index:70;overflow-y:auto;transform:translateX(102%);transition:transform .3s steps(6);
      background:var(--paper);border-left:3px solid var(--ink);box-shadow:-8px 0 0 var(--shadow);font-family:"Source Serif 4",Georgia,serif;color:var(--ink);padding:14px 16px 40px}
    #rec.open{transform:none}
    #rec h2{font:600 26px/1 "Teko",sans-serif;letter-spacing:.12em;margin:18px 0 2px;border-bottom:2px solid var(--ink)}
    #rec h2 small{font:400 12px "Special Elite",monospace;letter-spacing:0;float:right;padding-top:10px}
    #rec .x{position:sticky;top:0;float:right;font:600 18px "Teko",sans-serif;background:var(--enamel);color:var(--cream);border:2px solid var(--ink);padding:0 10px;cursor:pointer}
    #rec .where{font:400 12px "Special Elite",monospace}
    #rec .tag{background:#f7ecd0;border:2px solid var(--ink);padding:8px 10px;margin-top:8px;box-shadow:3px 3px 0 var(--shadow)}
    #rec .k{font:400 11px "Special Elite",monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--brass-deep)}
    #rec .big{font:600 34px/1 "Teko",sans-serif;letter-spacing:.02em}
    #rec .big small{font:400 14px "Source Serif 4",serif}
    #rec p{font-size:14px;line-height:1.4;margin-top:3px}
    #rec .fine{font:400 11px/1.4 "Special Elite",monospace;color:#5a4a30;margin-top:4px}
    #rec q{font-style:italic;quotes:"“" "”"}
    #rec details summary{cursor:pointer;font:600 15px "Teko",sans-serif;letter-spacing:.12em;color:var(--enamel-deep);margin-top:6px;list-style:none}
    #rec details summary::after{content:"  ▸ PULL FOR MORE"} #rec details[open] summary::after{content:"  ▾"}
    #rec table{width:100%;border-collapse:collapse;font:400 11px "Special Elite",monospace;margin-top:4px}
    #rec td,#rec th{border-bottom:1px dashed var(--brass-deep);padding:3px 2px;text-align:left;vertical-align:top} #rec td.n{text-align:right;white-space:nowrap}
    #rec .stamp{display:inline-block;font:600 15px "Teko",sans-serif;letter-spacing:.1em;border:2px solid;padding:0 7px;transform:rotate(-1.5deg);margin-top:6px}
    #rec .s0{color:var(--enamel);} #rec .s1{color:#8a5a00;} #rec .s2{color:var(--oxide);} #rec .s3{color:#5a5248;}
    #rec .meter{height:8px;border:1.5px solid var(--ink);background:#fff8e4;margin-top:3px} #rec .meter i{display:block;height:100%;background:var(--enamel)}
    #rec a{color:inherit}
    #rec .est,.cwp .est{font:600 12px "Teko",sans-serif;letter-spacing:.12em;background:var(--danger-y);border:1.5px solid var(--ink);padding:0 5px;margin-left:4px;color:var(--ink)}
    #rec details.sec{margin-top:18px} #rec summary.h{font:600 26px/1 "Teko",sans-serif !important;letter-spacing:.12em !important;color:var(--ink) !important;border-bottom:2px solid var(--ink)}
    #rec summary.h::after{content:"  ▸" !important} #rec details.sec[open] summary.h::after{content:"  ▾" !important}`;
  document.head.appendChild(css);

  const tab = document.createElement("button");
  tab.id = "recTab"; tab.type = "button"; tab.innerHTML = "ON THE RECORD · <b>REAL DATA</b>";
  const rec = document.createElement("aside");
  rec.id = "rec"; rec.setAttribute("aria-label", "On the record: real data for this site");
  document.body.append(tab, rec);
  tab.onclick = () => { render(); rec.classList.add("open"); };
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") rec.classList.remove("open"); });

  let sel = L.default_site && L.sites[L.default_site] ? L.default_site : "georgia";
  function current() { return sel; }
  function presetFromSerial() {
    const serial = (document.getElementById("serial") || {}).textContent || "";
    return /-N-/.test(serial) ? "nova" : "georgia";
  }

  function claimCard(k) {
    const r = k.receipt, parts = Object.entries(r.score_parts).filter((e) => e[1] > 0).sort((a, b) => b[1] - a[1]);
    return '<div class="tag"><div class="k">' + esc(k.owner) + " says</div><p><q>" + esc(k.text) + "</q></p>" +
      '<span class="stamp s' + ORDER[r.verdict] + '">' + MARK[r.verdict] + " " + esc(r.verdict).toUpperCase() + "</span>" +
      "<p>" + esc(r.explanation_plain) + "</p>" +
      "<details><summary>HOW LIKELY TO MISLEAD</summary>" +
      '<p class="fine">Chance this sentence leaves a false impression: ' + Math.round(r.score * 100) + ' of 100. How sure we are: ' + esc(r.confidence) + ".</p>" +
      '<div class="meter"><i style="width:' + r.score * 100 + '%"></i></div>' +
      (parts.length ? "<table>" + parts.map((e) => "<tr><td>" + esc(WHY[e[0]]) + (e[0] === "hedged" ? ": " + esc(r.text_features.hedged.join(", ")) : "") + '</td><td class="n">+' + e[1].toFixed(2) + "</td></tr>").join("") + "</table>" : "") +
      r.evidence.map((e) => '<p class="fine"><b>' + Number(e.value).toLocaleString("en-US") + " " + esc(e.unit) + "</b> " + esc(e.label) + ". " + esc(e.source) + "</p>").join("") +
      '<p class="fine">Quote checked word for word against ' + link(k.source_url) + " by code, " + esc(k.source_date) + ". Scores come from code, not a model. The claim covers the whole company, not only this county.</p></details></div>";
  }

  const range = (a) => a[0] === a[1] ? a[0].toLocaleString("en-US") : a[0].toLocaleString("en-US") + " to " + a[1].toLocaleString("en-US");
  function estimateHow() {
    const M = L.estimate_meta;
    return "<details><summary>HOW WE ESTIMATED THIS</summary><table>" + M.method.map((t, i) => "<tr><td>" + (i + 1) + ". " + esc(t) + "</td></tr>").join("") + "</table>" +
      Object.values(M.inputs).map((v) => '<p class="fine"><b>' + esc(v.value) + " " + esc(v.unit) + "</b> " + link(v.url, v.source) + "</p>").join("") +
      M.limits.map((t) => '<p class="fine">' + esc(t) + "</p>").join("") + "</details>";
  }

  function render(jump) {
    const S = L.sites[current()], m = L.bills_meta, y0 = String(m.base_year), y1 = String(m.latest_year);
    const us0 = m.us_average[y0].avg_monthly_bill_usd, us1 = m.us_average[y1].avg_monthly_bill_usd, usPct = Math.round(100 * (us1 - us0) / us0);
    const main = S.bills.find((b) => b.covers_most_homes);
    const g = S.grid, E = S.estimate;

    let electric = '<div class="k">Your electric bill</div><div class="big">NOT FOUND</div><p>No single utility\'s average covers most homes here.</p>';
    const txb = S.label && L.texas && L.texas.texas_bill;
    if (!main && txb) {
      const pctTx = Math.round(100 * (txb["2024"] - txb["2019"]) / txb["2019"]);
      electric = '<div class="k">Your electric bill</div><div class="big">' + usd(txb["2024"]) + ' <small>a month in 2024, average Texas home</small></div>' +
        "<p>" + usd(txb["2024"] - txb["2019"]) + " a month more than in 2019 (+" + pctTx + "%). The average U.S. home went up " + usPct + "%.</p>" +
        '<p class="fine">Most Texas homes pick their own power seller, so this is the average across every seller in the state. The record does not say why bills changed, so we do not say data centers caused it.</p>';
    }
    if (main) {
      const d = main.change_usd_per_month, cmp = main.change_pct < usPct - 3 ? "A smaller rise than the average U.S. home" : main.change_pct > usPct + 3 ? "A bigger rise than the average U.S. home" : "About the same as the average U.S. home";
      electric = '<div class="k">Your electric bill</div><div class="big">' + usd(main.avg_monthly_bill_usd[y1]) + " <small>a month in " + y1 + "</small></div>" +
        "<p>" + usd(Math.abs(d)) + " a month " + (d >= 0 ? "more" : "less") + " than in " + y0 + " (" + (d >= 0 ? "+" : "") + main.change_pct + "%). " + cmp + " (+" + usPct + "%).</p>" +
        '<p class="fine">Average home served by ' + esc(main.utility_name) + ". The record does not say why bills changed, so we do not say data centers caused it.</p>";
    }
    const billRows = S.bills.map((b) => "<tr><td>" + esc(b.utility_name) + (b.covers_most_homes ? "" : " (covers only " + Math.round((b.share_of_homes_covered || 0) * 100) + "% of homes)") + '</td><td class="n">' +
      usd(b.avg_monthly_bill_usd[y0]) + '</td><td class="n">' + usd(b.avg_monthly_bill_usd[y1]) + '</td><td class="n">' + (b.change_pct > 0 ? "+" : "") + b.change_pct + "%</td></tr>").join("");

    const claims = S.claims.slice().sort((a, b) => ORDER[a.receipt.verdict] - ORDER[b.receipt.verdict] || b.receipt.score - a.receipt.score);
    const top = claims.slice(0, 3), rest = claims.slice(3);
    const filings = Object.entries(S.filings);

    rec.innerHTML = '<button class="x" type="button">CLOSE</button>' +
      '<div class="where">ON THE RECORD · ' + esc(S.county).toUpperCase() + ", " + esc(S.state) + "<br>The toy is a model. Everything on this sheet is a real public record, with its source.</div>" +

      '<h2 id="rec-cost">1 · WHAT IT COSTS YOU</h2>' +
      '<div class="tag">' + electric + "<details><summary>EVERY UTILITY HERE</summary><table><tr><th>Utility</th><th>" + y0 + "</th><th>" + y1 + "</th><th></th></tr>" + billRows +
        '<tr><td>All U.S. homes</td><td class="n">' + usd(us0) + '</td><td class="n">' + usd(us1) + '</td><td class="n">+' + usPct + '%</td></tr></table><p class="fine">' + esc(m.caveat) + " Source: " + esc(m.source_table) + ".</p></details></div>" +
      '<div class="tag"><div class="k">Water the data centers here use <span class="est">ESTIMATE</span></div>' + (E
        ? '<div class="big">' + range(E.water_million_gallons_per_year) + " <small>million gallons a year</small></div><p>About what " + range(E.water_as_families) + " average families use at home. Nobody publishes the real number, so this is a range built from published figures.</p>" + estimateHow()
        : '<div class="big">NOT FOUND</div>') + "</div>" +
      '<div class="tag"><div class="k">Your water bill</div><div class="big">NOT FOUND</div><p>No national public record of household water bills exists, and the estimate above cannot tell us what it does to a bill.</p>' +
        '<details><summary>WHAT WOULD ANSWER IT</summary><p class="fine">Your water utility\'s yearly rate sheet, and the metered water use of each data center it serves. Ask for both at the hearing.</p></details></div>' +
      '<div class="tag"><div class="k">Your local taxes</div><div class="big">NOT FOUND</div><p>Tax breaks are set county by county. No public record found for this county yet.</p>' +
        '<details><summary>WHAT WOULD ANSWER IT</summary><p class="fine">The county\'s tax abatement agreement for each site, and the property tax each site paid each year. Both can be requested as public records.</p></details></div>' +

      '<h2 id="rec-here">2 · WHAT IS HERE</h2>' +
      '<div class="tag"><div class="k">Data centers in this county</div><div class="big">' + S.sites + " <small>on the public map</small></div>" +
        "<details><summary>WHO RUNS THEM</summary><table>" + S.operators.map((o) => "<tr><td>" + esc(o[0]) + '</td><td class="n">' + o[1] + "</td></tr>").join("") +
        '</table><p class="fine">IM3 Open Source Data Center Atlas (PNNL, from OpenStreetMap). Existing sites only; some are missing.</p></details></div>' +
      '<div class="tag"><div class="k">Electricity they use <span class="est">ESTIMATE</span></div>' + (E
        ? '<div class="big">' + range(E.electricity_as_homes) + " <small>homes' worth</small></div><p>About " + range(E.electricity_gwh_per_year) + " gigawatt-hours a year. This county holds about " + range(E.share_of_us_mapped_data_centers_pct) + "% of the mapped U.S. data centers.</p>" + estimateHow()
        : '<div class="big">NOT FOUND</div>') + "</div>" +
      '<div class="tag"><div class="k">The power grid they plug into</div>' + (g
        ? '<div class="big">' + Math.round(g.fossil_majority_hours_pct) + " <small>of every 100 hours in " + g.year + " it ran mostly on coal, gas and oil</small></div>" +
          "<details><summary>WHERE THE POWER CAME FROM</summary><table>" + Object.entries(g.fuel_shares).sort((a, b) => b[1] - a[1]).filter((e) => e[1] > 0.004).map((e) => "<tr><td>" + FUEL[e[0]] + '</td><td class="n">' + Math.round(e[1] * 100) + "%</td></tr>").join("") +
          '</table><p class="fine">Grid region ' + esc(S.grid_code) + ". " + esc(g.caveat) + " " + esc(g.source_table) + ".</p></details>"
        : '<div class="big">NOT FOUND</div><p>' + esc(S.grid_match) + "</p>") + "</div>" +

      '<details class="sec" id="rec-claims"><summary class="h">3 · WHAT THE OWNERS SAY</summary>' +
      (top.length ? top.map(claimCard).join("") : '<div class="tag"><div class="big">NOT FOUND</div></div>') +
      (rest.length ? "<details><summary>ALL " + claims.length + " CLAIMS</summary>" + rest.map(claimCard).join("") + "</details>" : "") +

      "</details>" + '<details class="sec" id="rec-filings"><summary class="h">4 · WHAT THEY TOLD INVESTORS</summary>' +
      (filings.length ? filings.map((f) => '<div class="tag"><div class="k">' + esc(f[0]) + " · " + esc(f[1].form) + " filed " + esc(f[1].filed) + "</div>" +
          "<p><q>" + esc(f[1].sentences[0]) + "</q></p><details><summary>MORE FROM THIS FILING</summary>" + f[1].sentences.slice(1).map((s) => "<p><q>" + esc(s) + "</q></p>").join("") +
          '<p class="fine">' + link(f[1].url, "SEC filing") + "</p></details></div>").join("")
        : '<div class="tag"><div class="big">NOT FOUND</div><p>SEC filings have not been fetched yet for the owners in this county.</p></div>') +

      "</details>" + '<details class="sec" id="rec-news"><summary class="h">5 · IN THE NEWS</summary>' +
      (S.news.length ? '<div class="tag"><table>' + S.news.map((n) => "<tr><td>" + link(n.url, n.title) + '<br><span class="fine">' + esc(n.outlet) + " · " + esc((n.seen || "").slice(0, 8)) + "</span></td></tr>").join("") + "</table></div>"
        : '<div class="tag"><div class="big">NOT FOUND</div></div>') +
      "</details>" + '<p class="fine" style="margin-top:14px">Fetched automatically ' + esc(L.built || "") + ". " + L.exposure_meta.limits.map(esc).join(" ") + "</p>";
    rec.querySelector(".x").onclick = () => rec.classList.remove("open");
    if (jump) { const el = rec.querySelector("#" + jump); if (el) { if (el.tagName === "DETAILS") el.open = true; el.scrollIntoView(); } }
  }
  function openAt(id) { render(id); rec.classList.add("open"); }


  /* ---- SIMPLE VIEW (the default). The full works is one switch away. ----
     Hides the crew, levers, punch card and union board; puts three big cost cards on the right
     and readable labels on the campus itself. Click any of them to open the ledger at that spot. */
  const plainCss = document.createElement("style");
  plainCss.textContent = `
    body.cw-plain .left .panel:nth-of-type(n+2), body.cw-plain .right > .panel, body.cw-plain footer.belt, body.cw-plain #recTab, body.cw-plain .stage-plate { display:none !important }
    body.cw-plain .left { display:none !important }
    body.cw-plain .floor { grid-template-columns: 1fr 420px }
    #cwMode{position:fixed;left:10px;bottom:10px;z-index:65;font:600 15px "Teko",sans-serif;letter-spacing:.14em;background:var(--soot);color:var(--cream);border:2px solid var(--brass);padding:3px 10px;cursor:pointer}
    .cwp{display:none;flex-direction:column;gap:10px;overflow-y:auto;padding-right:4px}
    body.cw-plain .cwp{display:flex}
    .cwp .head{font:600 24px/1 "Teko",sans-serif;letter-spacing:.12em;color:var(--cream)}
    .cwp .head small{display:block;font:400 12px "Special Elite",monospace;letter-spacing:0;color:var(--cream-dark);margin-top:3px}
    .cwp button.card{all:unset;box-sizing:border-box;cursor:pointer;display:block;width:100%;background:var(--paper);border:3px solid var(--ink);box-shadow:4px 4px 0 var(--shadow);padding:10px 12px;color:var(--ink)}
    .cwp .k{font:400 12px "Special Elite",monospace;letter-spacing:.06em;text-transform:uppercase;color:var(--brass-deep)}
    .cwp .big{font:600 40px/1 "Teko",sans-serif} .cwp .big small{font:400 15px "Source Serif 4",serif}
    .cwp p{font:400 15px/1.35 "Source Serif 4",serif;margin-top:2px}
    .cwp .more{font:600 14px "Teko",sans-serif;letter-spacing:.14em;color:var(--enamel-deep);margin-top:4px}
    .cwLabel{position:absolute;z-index:6;width:28%;min-width:150px;max-width:230px;background:var(--paper);border:2px solid var(--ink);box-shadow:3px 3px 0 var(--shadow);
      padding:4px 8px 3px;cursor:pointer;text-align:left;color:var(--ink)}
    .cwLabel b{display:block;font:600 17px/1 "Teko",sans-serif;letter-spacing:.12em;color:var(--enamel-deep)}
    .cwLabel span{display:block;font:400 13px/1.25 "Source Serif 4",serif}
    body:not(.cw-plain) .cwLabel, body:not(.cw-plain) #cwSat{display:none}
    #cwSat{position:absolute;right:10px;bottom:10px;z-index:8;font:600 15px "Teko",sans-serif;letter-spacing:.14em;background:var(--brass);color:var(--ink);border:2px solid var(--ink);box-shadow:3px 3px 0 var(--shadow);padding:3px 12px;cursor:pointer;transition:transform .12s}
    #cwSat:hover{transform:translateY(-2px)} #cwSat[hidden]{display:none}
    #cwSatBox{position:absolute;inset:0;z-index:4;opacity:0;pointer-events:none;transition:opacity .4s} #cwSatBox.on{opacity:1;pointer-events:auto}
    #cwSatBox .cesium-widget-credits{font-size:9px;opacity:.6} #cwSatBox .cesium-viewer-bottom{display:block}
    .cwp select{width:100%;font:400 16px "Source Serif 4",serif;padding:6px 8px;background:var(--paper);border:3px solid var(--ink);color:var(--ink);margin-top:2px}
    .nlabel{background:var(--paper);border:3px solid var(--ink);box-shadow:4px 4px 0 var(--shadow);padding:10px 12px;color:var(--ink)}
    .nlabel .strip{display:flex;align-items:center;gap:3px;margin:6px 0 4px} .nlabel .strip i{flex:1;text-align:center;font:600 20px/28px "Teko",sans-serif;font-style:normal;color:#fff;opacity:.45;border-radius:3px}
    .nlabel .strip i.on{flex:1.6;opacity:1;font-size:34px;line-height:44px;border:3px solid var(--ink);color:#fff;text-shadow:0 1px 0 #0006}
    .nlabel .fine,.nlabel p.fine{font:400 11px/1.4 "Special Elite",monospace;color:#5a4a30;margin-top:4px}
    .nlabel p{font:400 14px/1.4 "Source Serif 4",serif;margin-top:5px}
    .nrow{border-top:2px solid var(--ink);padding:7px 0 6px} .nrow summary{cursor:pointer;list-style:none;display:grid;grid-template-columns:38px 1fr;column-gap:10px;align-items:center}
    .nrow summary::-webkit-details-marker{display:none}
    .nrow .gchip.big{grid-row:span 3} .nrow .nm{font:600 17px/1 "Teko",sans-serif;letter-spacing:.14em;color:var(--brass-deep)}
    .nrow .nm::after{content:"  ▸";color:var(--enamel-deep)} .nrow[open] .nm::after{content:"  ▾"}
    .nrow .bigv{font:600 30px/1 "Teko",sans-serif;grid-column:2} .nrow .unit{font:400 13px/1.25 "Source Serif 4",serif;grid-column:2}
    .nrow summary > .nm:first-child, .nrow summary > .nm:first-child ~ .unit{grid-column:1 / -1}
    .gchip{display:inline-block;min-width:20px;text-align:center;font:600 15px/20px "Teko",sans-serif;border-radius:3px;padding:0 4px;border:1.5px solid var(--ink)}
    .gchip.big{font-size:30px;line-height:38px;min-width:38px}
    .nlabel table{width:100%;border-collapse:collapse;font:400 11px "Special Elite",monospace;margin-top:4px} .nlabel td,.nlabel th{border-bottom:1px dashed var(--brass-deep);padding:3px 2px;text-align:left} .nlabel td.n{text-align:right}
    .nlabel a{color:inherit}`;
  document.head.appendChild(plainCss);


  const polish = document.createElement("style");
  polish.textContent = `
    header.sign .lot{display:none !important}                       /* decorative plate: gone */
    header.sign{grid-template-columns:auto 1fr !important} header.sign .wordmark{text-align:center;padding-right:60px}
    body.cw-plain .works{max-width:1500px;margin:0 auto}
    body.cw-plain .cwp{align-items:stretch;padding:2px 6px 6px 2px;overflow:visible !important}
    body.cw-plain .right{overflow-x:hidden;overflow-y:auto;scrollbar-width:none} body.cw-plain .right::-webkit-scrollbar{display:none}
    body.cw-plain #objTip, body.cw-plain #workOrder{display:none !important}   /* the toy's made-up hover text stays out of the simple view */
    body.cw-plain #campus{transform:translateY(5%) scale(1.06);transform-origin:center}
    .nrow.flash{animation:cwFlash 1s ease-out} @keyframes cwFlash{0%,30%{background:#fde68a}100%{background:transparent}}
    .nrow:not([data-row]) .body{padding-left:4px} .nrow .tech:not(:has(.gchip)){grid-template-columns:1fr auto}
    .nrow .claim{border-top:1px dashed var(--brass-deep);padding:5px 0;font:400 13px/1.35 "Source Serif 4",serif} .nrow .claim q{font-style:italic}
    .nrow .claim .stamp{display:inline-block;font:600 12px "Teko",sans-serif;letter-spacing:.08em;border:1.5px solid;padding:0 5px;margin-right:4px}
    .nrow .s0{color:var(--enamel)} .nrow .s1{color:#8a5a00} .nrow .s2{color:var(--oxide)} .nrow .s3{color:#5a5248}
    .nrow details.more summary{cursor:pointer;font:600 13px "Teko",sans-serif;letter-spacing:.12em;color:var(--enamel-deep);padding-top:4px;list-style:none}
    .nrow{padding:5px 0 4px !important} .nrow .bigv{font-size:27px !important} .nlabel .strip i.on{font-size:30px !important;line-height:38px !important}
    .nlabel .ctr{text-align:center}
    .nlabel .strip i{transition:flex .35s cubic-bezier(.2,.9,.3,1.2),opacity .25s} .nlabel .strip i.on{animation:cwPop .45s cubic-bezier(.2,.9,.3,1.4)}
    .nrow{transition:background .15s} .nrow:hover{background:#fff6dc} .nrow summary{padding:2px 4px;border-radius:3px}
    .nrow summary:active{transform:scale(.99)} .nrow .gchip.big{transition:transform .18s cubic-bezier(.2,.9,.3,1.4)} .nrow:hover .gchip.big{transform:scale(1.1) rotate(-3deg)}
    .nrow .body{padding:0 4px 2px 52px} .nrow[open] .body{animation:cwOpen .28s ease-out}
    .nrow .bigv{animation:cwRise .4s ease-out backwards}
    .nrow .tech{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;font:400 12px "Special Elite",monospace;border-top:1px dashed var(--brass-deep);padding:4px 0 0;margin-top:6px}
    .nrow .tech b{font-weight:400} .nrow .tech span{text-align:right}
    .cwp button.card{transition:transform .12s,box-shadow .12s;text-align:center} .cwp button.card:hover{transform:translate(-1px,-1px);box-shadow:6px 6px 0 var(--shadow)} .cwp button.card:active{transform:translate(3px,3px);box-shadow:1px 1px 0 var(--shadow)}
    .cwLabel{width:auto !important;min-width:0 !important;max-width:170px;transition:transform .15s,box-shadow .15s;animation:cwRise .4s ease-out backwards}
    .cwLabel:hover{transform:translateY(-3px) scale(1.04);box-shadow:5px 6px 0 var(--shadow)} .cwLabel:active{transform:scale(.97)}
    .cwLabel b{font-size:14px !important} .cwLabel span{font:600 24px/1 "Teko",sans-serif !important}
    #rec{transition:transform .32s cubic-bezier(.2,.8,.2,1) !important} #rec details[open] > *:not(summary){animation:cwOpen .25s ease-out}
    #rec .tag{transition:transform .12s} #rec .tag:hover{transform:translate(-1px,-1px)}
    #cwMode{transition:transform .12s} #cwMode:hover{transform:translateY(-2px)}
    @keyframes cwOpen{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
    @keyframes cwRise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
    @keyframes cwPop{0%{transform:scale(.6)}100%{transform:scale(1)}}
    @media (prefers-reduced-motion:reduce){.cwp *,.cwLabel,#rec,#rec *,#cwMode{animation:none !important;transition:none !important}}

    /* Tall or narrow screens: stack, and let the page scroll. */
    @media (max-aspect-ratio: 11/10), (max-width: 900px) {
      html, body{height:auto !important;min-height:100%;overflow:auto !important}
      body.cw-plain .works{height:auto !important;min-height:100vh;display:block !important;padding:8px}
      body.cw-plain .floor{display:flex !important;flex-direction:column;gap:12px;padding:10px 0 14px}
      body.cw-plain .stage-wrap{height:min(68vw,44vh);min-height:240px;flex:none}
      body.cw-plain .right{overflow:visible !important;width:100%;max-width:620px;margin:0 auto}
      body.cw-plain .cwp{overflow:visible;padding:0}
      body.cw-plain header.sign .gear{display:none} header.sign .wordmark{padding-right:0} .wordmark h1{font-size:clamp(22px,7vw,40px) !important}
      #rec{width:100vw !important}
      header.sign{display:block !important;text-align:center} header.sign .wordmark{display:inline-block}
      #cwMode{position:static !important;display:block;margin:0 auto 16px}
      body.cw-plain .right{overflow:visible !important}
    }
    @media (max-width: 640px) { .cwLabel b{font-size:11px !important} .cwLabel span{font-size:17px !important} .cwLabel{padding:2px 5px !important;border-left-width:6px !important} }`;
  document.head.appendChild(polish);

  const right = document.querySelector(".right"), stage = document.getElementById("stage");
  const cards = document.createElement("div"); cards.className = "cwp";
  if (right) right.prepend(cards);
  const mode = document.createElement("button"); mode.id = "cwMode"; mode.type = "button";
  document.body.appendChild(mode);
  function setPlain(on) {
    document.body.classList.toggle("cw-plain", on);
    mode.textContent = on ? "FULL WORKS" : "SIMPLE VIEW";
    try { localStorage.setItem("cw-plain", on ? "1" : "0"); } catch {}
  }
  mode.onclick = () => setPlain(!document.body.classList.contains("cw-plain"));
  let saved = "1"; try { saved = localStorage.getItem("cw-plain") || "1"; } catch {}

  const SLOT = { cooling: { left: "3%", top: "4%" }, hallA: { left: "40%", top: "3%" }, substation: { right: "3%", top: "6%" }, office: { left: "3%", bottom: "5%" }, parking: { right: "3%", bottom: "5%" } };
  const GRADE_COLOR = { A: "#038141", B: "#85bb2f", C: "#fecb02", D: "#ee8100", E: "#e63e11" };
  const chip = (g, big) => '<span class="gchip' + (big ? " big" : "") + '" style="background:' + (GRADE_COLOR[g] || "#8a8272") + ';color:' + (g === "C" || g === "B" ? "#1c140c" : "#fff") + '">' + (g || "?") + "</span>";
  const OBJ_FOR = { power: "substation", water: "cooling", tax: "office", jobs: "parking", talk: "hallA" };

  function labelsFor(S) {
    if (S.label) {
      const out = {};
      for (const r of S.label.rows) out[OBJ_FOR[r.id]] = [r.name, r.plain_big, "row:" + r.id, r.grade];
      return out;
    }
    const g = S.grid, E = S.estimate;
    return {
      hallA: ["DATA CENTERS", S.sites + " in " + S.county + ".", "rec-here"],
      substation: ["POWER", g ? "The grid here ran mostly on coal and gas in " + Math.round(g.fossil_majority_hours_pct) + " of every 100 hours." : "Grid record not found.", "rec-here"],
      cooling: ["WATER", E ? "About " + range(E.water_million_gallons_per_year) + " million gallons a year (estimate)." : "Not found.", "rec-cost"],
      office: ["WHAT THE OWNERS SAY", S.claims.length + " claims checked word for word.", "rec-claims"],
      parking: ["JOBS AND TAXES", "Not found yet.", "rec-cost"],
    };
  }

  function techLine(t) {
    if (t.by_year) return "<table>" + Object.entries(t.by_year).map((e) => "<tr><td>" + e[0] + '</td><td class="n">$' + e[1].toLocaleString("en-US") + ' million</td><td class="n">$' + Math.round(t.per_home[e[0]]) + " a home</td></tr>").join("") + "</table>";
    return '<p class="fine">' + chip(t.grade) + " <b>" + esc(t.label) + ":</b> " + (t.value == null ? "not disclosed" : esc(t.value) + (t.unit ? " " + esc(t.unit) : "")) +
      (t.industry_average ? " (industry average " + t.industry_average + ")" : "") + ". " + esc(t.note || "") + "</p>";
  }

  function claimsInline(S) {
    const list = S.claims.slice().sort((a, b) => ORDER[a.receipt.verdict] - ORDER[b.receipt.verdict] || b.receipt.score - a.receipt.score);
    const one = (k) => '<div class="claim"><span class="stamp s' + ORDER[k.receipt.verdict] + '">' + MARK[k.receipt.verdict] + " " + esc(k.receipt.verdict) + "</span> <q>" + esc(k.text) + '</q><span class="fine"> ' + esc(k.owner) + " · " + link(k.source_url) + "</span></div>";
    return list.slice(0, 2).map(one).join("") + (list.length > 2 ? '<details class="more"><summary>All ' + list.length + " ▸</summary>" + list.slice(2).map(one).join("") + "</details>" : "");
  }

  const labelEls = {};
  function drawPlain() {
    const S = L.sites[current()], T = S.label;
    const tx = Object.entries(L.sites).filter((e) => e[1].label).sort((a, b) => (b[1].is_site ? 1e9 : b[1].sites) - (a[1].is_site ? 1e9 : a[1].sites));
    const picker = '<select id="cwCounty" aria-label="Your county">' +
      tx.map((e) => '<option value="' + e[0] + '"' + (e[0] === current() ? " selected" : "") + ">" + (e[1].is_site ? esc(e[1].county) + " · Fort Worth, TX" : esc(e[1].county) + ", TX · " + e[1].sites + " data centers") + "</option>").join("") + "</select>";
    if (T) {
      cards.innerHTML = picker +
        '<div class="nlabel">' +
        '<div class="strip">' + "ABCDE".split("").map((g) => '<i class="' + (g === T.overall ? "on" : "") + '" style="background:' + GRADE_COLOR[g] + '">' + g + "</i>").join("") + "</div>" +
        '<p class="fine ctr">A is best · ' + T.graded_rows + " of " + T.rows.length + " graded</p>" +
        T.rows.map((r) => '<details class="nrow" data-row="' + r.id + '"><summary>' + chip(r.grade, true) + '<span class="nm">' + esc(r.name) + (r.estimate ? ' <span class="est">ESTIMATE</span>' : "") + '</span><span class="bigv">' + esc(r.plain_big) + '</span><span class="unit">' + esc(r.plain_unit) + "</span></summary>" +
          '<div class="body">' + (r.plain ? "<p>" + esc(r.plain) + "</p>" : "") + (r.also ? "<p>" + esc(r.also) + "</p>" : "") + r.technical.map(techLine).join("") + (r.id === "talk" ? (r.claims ? r.claims.map((c) => '<div class="claim"><span class="stamp s' + ORDER[c.verdict] + '">' + MARK[c.verdict] + " " + esc(c.verdict) + "</span> <q>" + esc(c.text) + '</q><p class="fine">' + esc(c.why) + " " + link(c.url) + "</p></div>").join("") : claimsInline(S)) : "") +
          '<p class="fine">' + esc(r.caveat) + (r.source ? " " + link(r.source_url || "", r.source) : "") + "</p></div></details>").join("") +
        (!T.owners.length ? "" : '<details class="nrow"><summary><span class="nm">WHO PUBLISHES WHAT</span></summary><div class="body">' +
          "<table><tr><th>Owner</th><th>Sites</th><th>PUE</th><th>WUE</th><th>Talk</th><th>Tax certs</th></tr>" +
          T.owners.map((o) => "<tr><td>" + esc(o.owner) + '</td><td class="n">' + o.sites + "</td><td>" + chip(o.pue_grade) + " " + (o.pue ? o.pue.value : "") + "</td><td>" + chip(o.wue_grade) + " " + (o.wue ? o.wue.value : "") + "</td><td>" + chip(o.talk_grade) + '</td><td class="n">' + (o.state_tax_certificates == null ? "" : o.state_tax_certificates) + "</td></tr>").join("") +
          '</table><p class="fine">Company-wide numbers from each owner\'s own page. ? = not published. ' + link(L.texas.registry.url, "State tax registry") + "</p></div></details>") +
        '<details class="nrow"><summary><span class="nm">IN THE NEWS</span></summary><div class="body">' +
          (S.news.length ? S.news.slice(0, 4).map((n) => '<div class="claim">' + link(n.url, n.title) + '<span class="fine"> ' + esc(n.outlet || "") + "</span></div>").join("") : '<p class="fine">Not found.</p>') + "</div></details>" +
        (L.feeds ? '<details class="nrow"><summary><span class="nm">WHERE THIS COMES FROM</span></summary><div class="body">' +
          L.feeds.feeds.map((f) => '<div class="tech"><b>' + esc(f.kind) + "</b><span>" + f.count + '</span></div><p class="fine">' + esc(f.what) + "</p>").join("") +
          '<p class="fine">Pulled automatically every ' + esc(L.feeds.every) + ". Last pull: " + esc(L.feeds.retrieved) + ".</p></div></details>" : "") + "</div>";
    } else {
      cards.innerHTML = picker + '<button class="card" data-j="rec-cost"><div class="k">' + esc(S.county) + '</div><div class="more">OPEN THE RECORD ▸</div></button>';
    }
    cards.querySelectorAll("button.card").forEach((b) => (b.onclick = () => openAt(b.dataset.j)));
    const pick = cards.querySelector("#cwCounty");
    if (pick) pick.onchange = () => { sel = pick.value; if (clip) clip.dataset.real = ""; realClippings(); drawPlain(); };

    const spec = labelsFor(S);
    for (const id of Object.keys(SLOT)) {
      let el = labelEls[id];
      if (!el) { el = labelEls[id] = document.createElement("button"); el.type = "button"; el.className = "cwLabel"; stage && stage.appendChild(el); }
      if (!spec[id]) { el.dataset.off = "1"; continue; }
      el.dataset.off = "";
      el.style.borderLeft = "10px solid " + (spec[id][3] ? GRADE_COLOR[spec[id][3]] : "#8a8272");
      el.innerHTML = "<b>" + esc(spec[id][0]) + "</b><span>" + esc(spec[id][1]) + "</span>";
      el.onclick = () => (spec[id][2].startsWith("row:") ? focusRow(spec[id][2].slice(4)) : openAt(spec[id][2]));
    }
    // One row open at a time, so the label stays short.
    cards.querySelectorAll("details.nrow").forEach((d) => d.addEventListener("toggle", () => {
      if (d.open) cards.querySelectorAll("details.nrow[open]").forEach((o) => o !== d && (o.open = false));
      fit();
    }));
    fit();
  }
  function focusRow(id) {
    const row = cards.querySelector('details.nrow[data-row="' + id + '"]');
    if (!row) return;
    row.open = true;
    row.classList.remove("flash"); void row.offsetWidth; row.classList.add("flash");
    // Stacked layout: bring the row into view. Side-by-side: the label is fitted, so stay at the top.
    if (getComputedStyle(right).overflowY === "visible") row.scrollIntoView({ block: "nearest", behavior: "smooth" });
    else right.scrollTop = 0;
  }
  // Shrink the label to fit the column instead of scrolling (stacked layout scrolls the page instead).
  function fit() {
    const label = cards.querySelector(".nlabel");
    if (!label || !right) return;
    label.style.zoom = 1;
    if (getComputedStyle(right).overflowY === "visible") return;
    const room = right.clientHeight - (label.offsetTop - cards.offsetTop) - 8;
    label.style.zoom = Math.max(0.6, Math.min(1, room / label.offsetHeight));
  }
  window.addEventListener("resize", () => fit());
  // Labels sit in fixed slots around the edge of the stage so they never pile up, and a
  // leader line runs from each one to its piece of the campus (pieces can be dragged).
  const NS = "http://www.w3.org/2000/svg";
  const wires = document.createElementNS(NS, "svg");
  wires.setAttribute("style", "position:absolute;inset:0;width:100%;height:100%;z-index:5;pointer-events:none");
  stage && stage.appendChild(wires);
  function pinLabels() {
    if (!stage) return;
    const on = document.body.classList.contains("cw-plain") && !document.querySelector("#cutaway.open");
    if (typeof satBtn !== "undefined") satBtn.hidden = !L.sites[current()].lat;
    if (typeof satOn !== "undefined" && satOn) { wires.style.display = "none"; for (const id in labelEls) { const el = labelEls[id]; el.style.display = el.dataset.off ? "none" : ""; Object.assign(el.style, { left: "", right: "", top: "", bottom: "" }, SLOT[id]); } return; }
    wires.style.display = on ? "" : "none";
    if (!on) { for (const id in labelEls) labelEls[id].style.display = "none"; return; }
    const box = stage.getBoundingClientRect();
    let lines = "";
    for (const id of Object.keys(labelEls)) {
      const target = document.querySelector('#campus [data-obj="' + id + '"]'), el = labelEls[id];
      if (!target || el.dataset.off) { el.style.display = "none"; continue; }
      el.style.display = "";
      Object.assign(el.style, { left: "", right: "", top: "", bottom: "" }, SLOT[id]);
      const r = target.getBoundingClientRect(), l = el.getBoundingClientRect();
      const x1 = l.left + l.width / 2 - box.left, y1 = ("top" in SLOT[id] ? l.bottom : l.top) - box.top;
      lines += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + (r.left + r.width / 2 - box.left) + '" y2="' + (r.top + r.height / 2 - box.top) + '" stroke="#1c140c" stroke-width="2" stroke-dasharray="5 4"/>' +
        '<circle cx="' + (r.left + r.width / 2 - box.left) + '" cy="' + (r.top + r.height / 2 - box.top) + '" r="4" fill="#c01018" stroke="#1c140c" stroke-width="1.5"/>';
    }
    wires.innerHTML = lines;
  }
  drawPlain(); setPlain(saved === "1"); setInterval(pinLabels, 250);


  /* ---- SATELLITE: the real site, in Cesium. Loads only when asked. Keyless Esri imagery by default;
     if keys.js sets window.CW_KEYS.google, Google Photorealistic 3D Tiles are added on top. ---- */
  const satBtn = document.createElement("button"); satBtn.id = "cwSat"; satBtn.type = "button"; satBtn.textContent = "SATELLITE";
  const satBox = document.createElement("div"); satBox.id = "cwSatBox";
  if (stage) stage.append(satBox, satBtn);
  let viewer = null, satOn = false;
  function loadCesium() {
    if (window.Cesium) return Promise.resolve(window.Cesium);
    return new Promise((ok, fail) => {
      const base = "https://cdn.jsdelivr.net/npm/cesium@1.145.0/Build/Cesium/";
      window.CESIUM_BASE_URL = base;
      const css = document.createElement("link"); css.rel = "stylesheet"; css.href = base + "Widgets/widgets.css"; document.head.appendChild(css);
      const js = document.createElement("script"); js.src = base + "Cesium.js"; js.onload = () => ok(window.Cesium); js.onerror = () => fail(new Error("Cesium did not load")); document.head.appendChild(js);
    });
  }
  async function showSat() {
    const S = L.sites[current()];
    if (!S.lat) return;
    satBtn.textContent = "LOADING…";
    try {
      const C = await loadCesium();
      if (!viewer) {
        viewer = new C.Viewer(satBox, { animation: false, timeline: false, baseLayerPicker: false, geocoder: false, homeButton: false, sceneModePicker: false,
          navigationHelpButton: false, fullscreenButton: false, infoBox: false, selectionIndicator: false,
          baseLayer: new C.ImageryLayer(new C.UrlTemplateImageryProvider({ url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", maximumLevel: 19, credit: "Esri, Maxar, Earthstar Geographics" })) });
        const key = window.CW_KEYS && window.CW_KEYS.google;
        if (key && C.createGooglePhotorealistic3DTileset) { try { viewer.scene.primitives.add(await C.createGooglePhotorealistic3DTileset({ key })); } catch (e) { console.warn("Google 3D tiles unavailable", e); } }
      }
      viewer.entities.removeAll();
      const pin = (lat, lon, text, color) => viewer.entities.add({ position: C.Cartesian3.fromDegrees(lon, lat), point: { pixelSize: 12, color: C.Color.fromCssColorString(color), outlineColor: C.Color.WHITE, outlineWidth: 2, disableDepthTestDistance: Infinity },
        label: { text, font: "600 14px sans-serif", showBackground: true, backgroundColor: C.Color.fromCssColorString("#1c140c").withAlpha(.85), pixelOffset: new C.Cartesian2(0, -24), disableDepthTestDistance: Infinity } });
      pin(S.lat, S.lon, S.county, "#c01018");
      viewer.camera.flyTo({ destination: C.Cartesian3.fromDegrees(S.lon, S.lat - 0.012, 1500), orientation: { heading: 0, pitch: C.Math.toRadians(-50), roll: 0 }, duration: 1.8 });
      satOn = true; satBox.classList.add("on"); satBtn.textContent = "MODEL";
    } catch (e) { satBtn.textContent = "SATELLITE UNAVAILABLE"; console.error(e); }
  }
  satBtn.onclick = () => { if (satOn) { satOn = false; satBox.classList.remove("on"); satBtn.textContent = "SATELLITE"; } else showSat(); };

  // Real headlines on the clipboard, in place of the placeholder clippings.
  const clip = document.getElementById("clipboard");
  function realClippings() {
    const S = L.sites[current()];
    if (!clip || !S.news.length || clip.dataset.real === current()) return;
    clip.dataset.real = current();
    clip.innerHTML = S.news.slice(0, 3).map((n) => '<article class="clipping"><span class="pin">' + esc((n.outlet || "").toUpperCase()) + "</span><h3>" +
      link(n.url, n.title) + "</h3><p>" + esc(S.county) + ", " + esc(S.state) + " · real headline via GDELT</p></article>").join("");
  }
  if (clip) new MutationObserver(() => { if (!clip.querySelector("a")) { clip.dataset.real = ""; realClippings(); } }).observe(clip, { childList: true });
  const serial = document.getElementById("serial");
  if (serial) new MutationObserver(() => { if (!document.body.classList.contains("cw-plain")) sel = presetFromSerial(); clip && (clip.dataset.real = ""); realClippings(); drawPlain(); if (rec.classList.contains("open")) render(); }).observe(serial, { childList: true, characterData: true, subtree: true });
  realClippings();
})();
