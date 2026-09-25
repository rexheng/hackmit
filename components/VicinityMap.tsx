"use client";

import { useCallback, useEffect, useRef } from "react";
import { HERO } from "@/lib/site";
import "leaflet/dist/leaflet.css";

type Props = { visible: boolean };

type Zoomable = {
  zoomIn: () => void;
  zoomOut: () => void;
  invalidate?: () => void;
};

declare global {
  interface Window {
    google?: {
      maps: {
        Map: new (
          el: HTMLElement,
          opts: Record<string, unknown>,
        ) => {
          setZoom: (n: number) => void;
          getZoom: () => number | undefined;
        };
        Marker: new (opts: Record<string, unknown>) => unknown;
      };
    };
  }
}

function loadGoogle(key: string) {
  if (window.google?.maps) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-cw-gmaps]");
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("gmaps")), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}`;
    s.async = true;
    s.dataset.cwGmaps = "1";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("gmaps"));
    document.head.appendChild(s);
  });
}

export function VicinityMap({ visible }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Zoomable | null>(null);

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    let cancelled = false;
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();

    async function boot() {
      if (key) {
        try {
          await loadGoogle(key);
          if (cancelled || !node || mapRef.current) return;
          const g = window.google!.maps;
          const map = new g.Map(node, {
            center: { lat: HERO.lat, lng: HERO.lng },
            zoom: 16,
            mapTypeId: "hybrid",
            disableDefaultUI: true,
            gestureHandling: "cooperative",
            backgroundColor: "#1a2418",
          });
          new g.Marker({
            position: { lat: HERO.lat, lng: HERO.lng },
            map,
            title: HERO.name,
          });
          mapRef.current = {
            zoomIn: () => map.setZoom((map.getZoom() ?? 16) + 1),
            zoomOut: () => map.setZoom((map.getZoom() ?? 16) - 1),
          };
          return;
        } catch {
          /* fall through to Esri tiles */
        }
      }

      const L = await import("leaflet");
      if (cancelled || !node || mapRef.current) return;
      const map = L.map(node, {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
        zoomSnap: 0.5,
      }).setView([HERO.lat, HERO.lng], 16);
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19 },
      ).addTo(map);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png", {
        pane: "overlayPane",
      }).addTo(map);
      const icon = L.divIcon({
        className: "cw-flag-wrap",
        html: '<div class="map-flag"></div>',
        iconSize: [18, 28],
        iconAnchor: [2, 28],
      });
      L.marker([HERO.lat, HERO.lng], { icon }).addTo(map);
      mapRef.current = {
        zoomIn: () => map.zoomIn(),
        zoomOut: () => map.zoomOut(),
        invalidate: () => map.invalidateSize(),
      };
      requestAnimationFrame(() => map.invalidateSize());
      setTimeout(() => map.invalidateSize(), 280);
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const t = window.setTimeout(() => mapRef.current?.invalidate?.(), 80);
    return () => window.clearTimeout(t);
  }, [visible]);

  const zoomIn = useCallback(() => mapRef.current?.zoomIn(), []);
  const zoomOut = useCallback(() => mapRef.current?.zoomOut(), []);

  return (
    <div
      className="map-frame"
      role="img"
      aria-label={`Satellite map of ${HERO.name} in ${HERO.place}`}
      style={{
        visibility: visible ? "visible" : "hidden",
        pointerEvents: visible ? "auto" : "none",
        zIndex: visible ? 3 : 0,
      }}
    >
      <div ref={el} className="gmap" />
      <div className="map-zooms" aria-label="Map zoom">
        <button type="button" onClick={zoomIn} aria-label="Zoom in">
          +
        </button>
        <button type="button" onClick={zoomOut} aria-label="Zoom out">
          −
        </button>
      </div>
      <aside className="map-legend">
        <b>{HERO.name}</b>
        <br />
        {HERO.address}
        <br />
        {HERO.place}
        <br />
        <span className="tmpl">TEMPLATE SITE</span> · THE FLAG IS THE PLANT
        <br />
        TILES · ESRI WORLD IMAGERY · OSM LABELS
      </aside>
    </div>
  );
}
