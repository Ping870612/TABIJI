import React, { useEffect } from "react";
window.mapStats = { mounts: 0, routes: 0 };
window.google = { maps: {
  DirectionsService: function () { this.route = async () => { window.mapStats.routes++; return {}; }; },
  TravelMode: { DRIVING: "DRIVING" }, LatLngBounds: function () { this.extend = () => {}; },
} };
export const useJsApiLoader = () => ({ isLoaded: !window.mapsUnavailable, loadError: window.mapsUnavailable ? new Error("Offline") : null });
export const Autocomplete = ({ children }) => children;
const map = { fitBounds() {}, setCenter() {}, setZoom() {} };
export const GoogleMap = ({ onLoad, children }) => { useEffect(() => { window.mapStats.mounts++; onLoad(map); }, [onLoad]); return <div style={{ background: "#e7ece3", height: "100%" }} data-testid="map">地圖測試區{children}</div>; };
export const Marker = () => null, DirectionsRenderer = () => null;
