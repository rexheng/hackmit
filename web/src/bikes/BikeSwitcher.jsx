import React from 'react';
import './bikes.css';
import {VEHICLES, vehicleUrl} from '../../../shared/vehicles.js';

export default function BikeSwitcher({value = 'yzf-2021'}) {
  return <label className="bike-switcher"><span>VEHICLE</span><select aria-label="Choose vehicle" value={value} onChange={e => { window.location.href = vehicleUrl(e.target.value); }}>
    {Object.values(VEHICLES).map(v => <option key={v.id} value={v.id}>{v.source.title}</option>)}
  </select></label>;
}
