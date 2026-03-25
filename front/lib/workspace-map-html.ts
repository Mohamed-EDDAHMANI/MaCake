/**
 * Builds Leaflet/OpenStreetMap HTML for the livreur workspace.
 * Shows user's current location and optional delivery markers (client delivery point, patissiere).
 */
const OSM_DEFAULT = { lat: 31.7917, lng: -7.0926 };

export type MapMarker = { lat: number; lng: number; label: string; type?: "delivery" | "pickup" };

export function buildWorkspaceMapHtml(
  userLat: number,
  userLng: number,
  markers: MapMarker[] = []
): string {
  const markersJson = JSON.stringify(markers);
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
    .marker-pin {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .marker-pin .dot {
      width: 28px; height: 28px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 3px 10px rgba(0,0,0,.35);
    }
    .marker-pin .dot-inner {
      width: 12px; height: 12px;
      border-radius: 50%;
      background: rgba(255,255,255,0.85);
      transform: rotate(45deg);
    }
    .marker-pin .label {
      margin-top: 3px;
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 999px;
      white-space: nowrap;
      box-shadow: 0 1px 4px rgba(0,0,0,.25);
    }
    /* dashed route line pulse */
    @keyframes dash { to { stroke-dashoffset: -20; } }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var userLat = ${userLat};
    var userLng = ${userLng};
    var markers = ${markersJson};
    var center = [userLat, userLng];
    var map = L.map('map', { zoomControl: false }).setView(center, 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    /* ── You (driver) marker ── */
    var youIcon = L.divIcon({
      className: '',
      html: '<div class="marker-pin"><div class="dot" style="background:#da1b61;"><div class="dot-inner"></div></div><div class="label" style="background:#da1b61;">You</div></div>',
      iconSize: [30, 52],
      iconAnchor: [15, 42],
      popupAnchor: [0, -44]
    });
    var youMarker = L.marker([userLat, userLng], { icon: youIcon }).addTo(map);

    /* ── Delivery / Pickup markers ── */
    var colors = { delivery: '#0d9488', pickup: '#f59e0b', default: '#6366f1' };
    var allLatLngs = [[userLat, userLng]];

    markers.forEach(function(m) {
      var color = m.type === 'pickup' ? colors.pickup : m.type === 'delivery' ? colors.delivery : colors.default;
      var icon = L.divIcon({
        className: '',
        html: '<div class="marker-pin"><div class="dot" style="background:' + color + ';"><div class="dot-inner"></div></div><div class="label" style="background:' + color + ';">' + (m.label || '') + '</div></div>',
        iconSize: [30, 52],
        iconAnchor: [15, 42],
        popupAnchor: [0, -44]
      });
      L.marker([m.lat, m.lng], { icon: icon }).addTo(map).bindPopup('<b>' + (m.label || '') + '</b>');
      allLatLngs.push([m.lat, m.lng]);
    });

    /* ── Auto-fit bounds to show all points ── */
    if (markers.length > 0) {
      var bounds = L.latLngBounds(allLatLngs);
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
    }
  </script>
</body>
</html>
`;
}

export { OSM_DEFAULT };
