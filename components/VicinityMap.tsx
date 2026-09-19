"use client";

import { useEffect, useRef } from "react";
import { HERO } from "@/lib/site";
import "leaflet/dist/leaflet.css";

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

type GoogleMaps = {
  Map: new (el: HTMLElement, opts: Record<string, unknown>) => unknown;
  Marker: new (opts: Record<string, unknown>) => unknown;
};

type Props = {
  visible: boolean;
};

export function VicinityMap({ visible }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const built = useRef(false);

  useEffect(() => {
    if (!visible || !el.current || built.current) return;
    built.current = true;
    const node = el.current;

    if (GOOGLE_KEY) {
      const src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}`;
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
      const boot = () => {
        const g = (window as unknown as { google?: { maps: GoogleMaps } }).google;
        if (!g?.maps) return;
        const map = new g.maps.Map(node, {
          center: { lat: HERO.lat, lng: HERO.lng },
          zoom: 16,
          mapTypeId: "hybrid",
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: true,
        });
        new g.maps.Marker({
          map,
          position: { lat: HERO.lat, lng: HERO.lng },
          title: HERO.name,
        });
      };
      if (existing) boot();
      else {
        const s = document.createElement("script");
        s.src = src;
        s.async = true;
        s.onload = boot;
        document.head.appendChild(s);
      }
      return;
    }

    let map: import("leaflet").Map | null = null;
    let cancelled = false;
      import("leaflet").then((L) => {
      if (cancelled || !node) return;
      map = L.map(node, {
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: false,
      }).setView([HERO.lat, HERO.lng], 16);
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "Tiles © Esri",
          maxZoom: 19,
        },
      ).addTo(map);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; OSM &copy; CARTO",
        pane: "overlayPane",
      }).addTo(map);
      const icon = L.divIcon({
        className: "",
        html: '<div class="map-flag"></div>',
        iconSize: [18, 28],
        iconAnchor: [2, 28],
      });
      L.marker([HERO.lat, HERO.lng], { icon })
        .addTo(map)
        .bindPopup(
          `<strong>${HERO.name}</strong><br/>${HERO.address}<br/>${HERO.place}<br/><span class="tmpl">TEMPLATE SITE</span>`,
        )
        .openPopup();
      setTimeout(() => map?.invalidateSize(), 80);
    });

    return () => {
      cancelled = true;
      map?.remove();
      built.current = false;
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 120);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <div
      ref={el}
      className={GOOGLE_KEY ? "gmap" : "map-root"}
      role="img"
      aria-label={`Satellite map of ${HERO.name} in ${HERO.place}`}
      style={{ display: visible ? "block" : "none" }}
    />
  );
}
