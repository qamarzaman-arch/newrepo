/**
 * One-time Leaflet bootstrap.
 *
 * - Imports Leaflet's default CSS
 * - Patches the default marker icons. Leaflet's marker images are normally
 *   resolved relative to the leaflet/dist css path; under Vite they need to
 *   be re-pointed at the bundled assets.
 */
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Vite-resolved icon URLs
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// @ts-expect-error — Leaflet's internal mergeOptions API
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export { L };
