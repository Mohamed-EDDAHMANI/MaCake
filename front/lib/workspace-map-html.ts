/**
 * Builds Leaflet/OpenStreetMap HTML for the livreur workspace.
 * Shows user's current location with a "You" marker (same map style as register).
 */
const OSM_DEFAULT = { lat: 31.7917, lng: -7.0926 };

export function buildWorkspaceMapHtml(
  userLat: number,
  userLng: number
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #e2e8f0; }
    .leaflet-control-attribution { font-size: 10px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var userLat = ${userLat};
    var userLng = ${userLng};
    var center = [userLat, userLng];
    var map = L.map('map', { zoomControl: false }).setView(center, 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    var youIcon = L.divIcon({
      className: 'you-marker',
      html: '<div style="width:24px;height:24px;border-radius:50%;background:#da1b61;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);"></div><div style="margin-top:4px;background:#da1b61;color:#fff;font-size:10px;font-weight:bold;padding:2px 6px;border-radius:999px;white-space:nowrap;">You</div>',
      iconSize: [24, 36],
      iconAnchor: [12, 12]
    });
    L.marker([userLat, userLng], { icon: youIcon }).addTo(map);
  </script>
</body>
</html>
`;
}

export { OSM_DEFAULT };
