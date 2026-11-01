import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import MapView, { hasCoordinates } from "./MapView";
const mockMap = { fitBounds: jest.fn(), setCenter: jest.fn(), setZoom: jest.fn() };
jest.mock("@react-google-maps/api", () => {
  const React = require("react");
  return {
    GoogleMap: ({ onLoad, children }) => { React.useEffect(() => onLoad(mockMap), [onLoad]); return <div>{children}</div>; },
    Marker: () => <span data-marker="true" />,
    DirectionsRenderer: ({ directions }) => <span data-route={directions.id} />,
  };
});
let container, root, route;
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  route = jest.fn(() => Promise.resolve({ id: "route" }));
  window.google = { maps: { DirectionsService: function () { this.route = route; }, TravelMode: { DRIVING: "DRIVING" }, LatLngBounds: function () { this.extend = jest.fn(); } } };
  Object.values(mockMap).forEach(fn => fn.mockClear());
});
afterEach(() => { act(() => root.unmount()); container.remove(); });
const render = points => act(async () => { root.render(<MapView points={points} />); });
test("zero coordinates are valid, null and out-of-range coordinates are not", () => {
  expect(hasCoordinates({ lat: 0, lng: 0 })).toBe(true);
  for (const point of [{ lat: null, lng: 0 }, { lat: NaN, lng: 0 }, { lat: 91, lng: 20 }]) expect(hasCoordinates(point)).toBe(false);
});
test("equivalent snapshots reuse the request and do not repeatedly fit bounds", async () => {
  const points = [{ lat: 1, lng: 2 }, { lat: 3, lng: 4 }];
  await render(points);
  await render(points.map(p => ({ ...p, notes: "typing" })));
  expect(route).toHaveBeenCalledTimes(1);
  expect(mockMap.fitBounds).toHaveBeenCalledTimes(1);
  expect(container.querySelectorAll("[data-marker]")).toHaveLength(2);
  act(() => root.unmount()); root = createRoot(container);
  await render(points);
  expect(route).toHaveBeenCalledTimes(1);
});
test("old route callbacks cannot overwrite the current day", async () => {
  let finish;
  route.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await render([{ lat: 5, lng: 6 }, { lat: 7, lng: 8 }]);
  await render([{ lat: 9, lng: 10 }, { lat: 11, lng: 12 }]);
  await act(async () => finish({ id: "stale" }));
  expect(container.querySelector("[data-route]").dataset.route).toBe("route");
});
test("single stop and over-limit routes keep all pins without API calls", async () => {
  await render([{ lat: 0, lng: 0 }]);
  expect(mockMap.setZoom).toHaveBeenCalledWith(14);
  await render(Array.from({ length: 28 }, (_, index) => ({ lat: index, lng: index })));
  expect(route).not.toHaveBeenCalled();
  expect(container.querySelectorAll("[data-marker]")).toHaveLength(28);
  expect(container.textContent).toContain("全部地點");
});
test("route failure preserves pins, including flight stops", async () => {
  route.mockRejectedValueOnce(new Error("unavailable"));
  await render([{ lat: 31, lng: 32 }, { lat: 33, lng: 34 }, { lat: 35, lng: 36, category: "flight" }]);
  expect(container.querySelectorAll("[data-marker]")).toHaveLength(3);
  expect(container.textContent).toContain("全部地點");
  expect(route.mock.calls[0][0].destination).toEqual({ lat: 33, lng: 34 });
});
