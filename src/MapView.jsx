import React, { useEffect, useMemo, useState } from "react";
import { GoogleMap, Marker, DirectionsRenderer } from "@react-google-maps/api";

export const hasCoordinates = point => Number.isFinite(point.lat) && Number.isFinite(point.lng) &&
  Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180;
const containerStyle = { width: "100%", height: "100%" };
const mapOptions = { disableDefaultUI: true, gestureHandling: "cooperative" };
const rendererOptions = { preserveViewport: true, suppressMarkers: true };
const routeCache = new Map();

export default function MapView({ points = [] }) {
  const pointKey = JSON.stringify(points.filter(hasCoordinates).map(p => [p.lat, p.lng, p.category]));
  const effectivePoints = useMemo(() => JSON.parse(pointKey).map(([lat, lng, category]) => ({ lat, lng, category })), [pointKey]);
  const [directions, setDirections] = useState(null);
  const [routeError, setRouteError] = useState(false);
  const [map, setMap] = useState(null);
  const center = useMemo(() => effectivePoints[0] && ({ lat: effectivePoints[0].lat, lng: effectivePoints[0].lng }), [effectivePoints]);

  useEffect(() => {
    let cancelled = false;
    setDirections(null);
    setRouteError(false);
    const land = effectivePoints.filter(p => p.category !== "flight");
    if (land.length < 2) return;
    // shortcut: show all pins beyond Google's 25-waypoint limit; split routes if long days become common.
    if (land.length > 27) { setRouteError(true); return; }
    const key = JSON.stringify(land);
    if (!routeCache.has(key)) {
      const position = ({ lat, lng }) => ({ lat, lng });
      const request = new window.google.maps.DirectionsService().route({
        origin: position(land[0]),
        destination: position(land[land.length - 1]),
        waypoints: land.slice(1, -1).map(p => ({ location: position(p), stopover: true })),
        travelMode: window.google.maps.TravelMode.DRIVING,
      });
      routeCache.set(key, request);
      if (routeCache.size > 40) routeCache.delete(routeCache.keys().next().value);
      request.catch(() => { if (routeCache.get(key) === request) routeCache.delete(key); });
    }
    routeCache.get(key).then(response => {
      if (!cancelled) setDirections(response);
    }).catch(() => { if (!cancelled) setRouteError(true); });
    return () => { cancelled = true; };
  }, [effectivePoints]);

  useEffect(() => {
    if (!map || !effectivePoints.length) return;
    if (effectivePoints.length === 1) {
      map.setCenter(center);
      map.setZoom(14);
    } else {
      const bounds = new window.google.maps.LatLngBounds();
      effectivePoints.forEach(({ lat, lng }) => bounds.extend({ lat, lng }));
      map.fitBounds(bounds);
    }
  }, [map, effectivePoints, center]);

  if (!effectivePoints.length) return <div>無座標資訊，請編輯地點並選取搜尋結果</div>;
  return (
    <div className="w-full h-[250px] shadow-sm border border-white rounded-2xl z-0 relative mb-2 overflow-hidden">
      <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={12} options={mapOptions} onLoad={setMap}>
        {effectivePoints.map((p, index) => <Marker key={index} position={{ lat: p.lat, lng: p.lng }} />)}
        {directions && <DirectionsRenderer directions={directions} options={rendererOptions} />}
      </GoogleMap>
      {routeError && <p role="status" className="absolute bottom-1 left-1 right-1 bg-white/90 text-xs p-2 rounded-xl">暫時無法繪製路線，已顯示全部地點</p>}
    </div>
  );
}
