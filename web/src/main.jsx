import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
const YZF = React.lazy(() => import("./bikes/YZF.jsx"));
import "./index.css";
import {VEHICLES, VEHICLE_REDIRECTS} from "../../shared/vehicles.js";

const root = import.meta.hot?.data.root || createRoot(document.getElementById("root"));
if (import.meta.hot) import.meta.hot.data.root = root;
const pathname = window.location.pathname;
const isViewer = /^(\/vehicles\/|\/bikes\/|\/yzf(?:\/|$)|\/fz6)/.test(pathname);
const requestedId = pathname.split('/')[2];
const vehicleId = VEHICLE_REDIRECTS[requestedId] || requestedId;
if (VEHICLE_REDIRECTS[requestedId]) history.replaceState(null, '', `/vehicles/${vehicleId}`);
const vehicle = VEHICLES[vehicleId] || VEHICLES['yzf-2021'];
if (pathname.startsWith('/fz6')) history.replaceState(null, '', '/vehicles/yzf-2021');
root.render(isViewer ? <React.Suspense fallback={<div style={{background:"#101519",color:"#a0d7bd",height:"100vh",display:"grid",placeItems:"center"}}>Opening Motion Lab…</div>}><YZF key={vehicle.id} vehicle={vehicle}/></React.Suspense> : <App />);
