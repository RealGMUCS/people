// @ts-nocheck
// Student location map rendering.
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { esc } from './common';

const LOCATION_COORDS = {
    'Fairfax, VA': [38.8462, -77.3064],
    'Arlington, VA': [38.8816, -77.0910],
    'McLean, VA': [38.9339, -77.1773],
    'Williamsburg, VA': [37.2707, -76.7075],
    'Richmond, VA': [37.5407, -77.4360],
    'Delft, Netherlands': [52.0116, 4.3571],
    'Riverside, CA': [33.9806, -117.3755],
    'San Francisco, CA': [37.7749, -122.4194],
    'Foster City, CA': [37.5585, -122.2711],
    'Mountain View, CA': [37.3861, -122.0839],
    'Menlo Park, CA': [37.4530, -122.1817],
    'Cupertino, CA': [37.3230, -122.0322],
    'San Jose, CA': [37.3382, -121.8863],
    'Berkeley, CA': [37.8715, -122.2730],
    'Stanford, CA': [37.4275, -122.1697],
    'Burbank, CA': [34.1808, -118.3090],
    'San Diego, CA': [32.7157, -117.1611],
    'Austin, TX': [30.2672, -97.7431],
    'Houston, TX': [29.7604, -95.3698],
    'Seattle, WA': [47.6062, -122.3321],
    'Redmond, WA': [47.6740, -122.1215],
    'Oak Ridge, TN': [36.0104, -84.2696],
    'Charlotte, NC': [35.2271, -80.8431],
    'Morrisville, NC': [35.8235, -78.8256],
    'Baltimore, MD': [39.2904, -76.6122],
    'Cambridge, MA': [42.3736, -71.1097],
    'Boston, MA': [42.3601, -71.0589],
    'Armonk, NY': [41.1265, -73.7140],
    'New York, NY': [40.7128, -74.0060],
    'Pittsburgh, PA': [40.4406, -79.9959],
    'Chicago, IL': [41.8781, -87.6298],
    'Kuwait City, Kuwait': [29.3759, 47.9774],
    'Riyadh, Saudi Arabia': [24.7136, 46.6753],
    'Zurich, Switzerland': [47.3769, 8.5417],
    'London, UK': [51.5074, -0.1278],
    'College Park, MD': [38.9897, -76.9378],
    'Pasadena, CA': [34.1478, -118.1445],
    'Harrisburg, PA': [40.2732, -76.8867],
    'Cleveland, OH': [41.4993, -81.6944],
    'Tampa, FL': [27.9506, -82.4572],
    'Hoboken, NJ': [40.7440, -74.0324],
    'New Brunswick, NJ': [40.4862, -74.4518],
    'Bozeman, MT': [45.6770, -111.0429],
    'Toronto, Canada': [43.6532, -79.3832],
    'Dallas, TX': [32.7767, -96.7970],
    'Tulsa, OK': [36.1540, -95.9928],
    'Jinan, China': [36.6512, 117.1201],
    'Natick, MA': [42.2834, -71.3495],
    'Santa Clara, CA': [37.3541, -121.9552],
};

export function getCoords(locStr) {
    if (!locStr) return null;
    const cleanLoc = locStr.trim();
    if (LOCATION_COORDS[cleanLoc]) return LOCATION_COORDS[cleanLoc];
    for (const [key, coords] of Object.entries(LOCATION_COORDS)) {
        if (cleanLoc.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(cleanLoc.toLowerCase())) {
            return coords;
        }
    }
    return null;
}

let alumniMapInstance = null;

export function initOrUpdateMap(studentsSubset) {
    const container = document.getElementById('alumni-map');
    if (!container) return;

    const locationMap = new Map();
    studentsSubset.forEach(s => {
        const loc = s.location || 'Fairfax, VA';
        const coords = getCoords(loc);
        if (coords) {
            if (!locationMap.has(loc)) locationMap.set(loc, { coords, students: [] });
            locationMap.get(loc).students.push(s);
        }
    });

    if (alumniMapInstance) {
        alumniMapInstance.remove();
        alumniMapInstance = null;
    }

    alumniMapInstance = L.map(container, { scrollWheelZoom: false }).setView([38.5, -96], 4);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(alumniMapInstance);

    const bounds = [];

    locationMap.forEach(({ coords, students }, locName) => {
        bounds.push(coords);
        const radius = Math.min(25, 8 + Math.sqrt(students.length) * 4);

        const marker = L.circleMarker(coords, {
            radius: radius,
            fillColor: '#10b981',
            color: '#065f46',
            weight: 2,
            opacity: 0.9,
            fillOpacity: 0.75
        }).addTo(alumniMapInstance);

        const studentListHtml = students.slice(0, 4).map(s => `
            <li style="margin-bottom: 4px;">
                <strong>${esc(s.firstName + ' ' + s.lastName)}</strong> (${esc(s.degree || 'Alum')})
                ${s.currentJob ? `<br><span style="font-size: 0.85em; color: #666;">${esc(s.currentJob)}</span>` : ''}
            </li>
        `).join('');

        const moreText = students.length > 4 ? `<div style="font-size: 0.85em; margin-top: 4px; color: #888;">+ ${students.length - 4} more</div>` : '';

        const popupContent = `
            <div style="font-family: inherit; max-width: 250px;">
                <h4 style="margin: 0 0 6px 0; font-size: 1rem; border-bottom: 1px solid #eee; padding-bottom: 4px; color: #111;">
                    📍 ${esc(locName)} (${students.length})
                </h4>
                <ul style="padding-left: 16px; margin: 0; font-size: 0.85rem; color: #333;">
                    ${studentListHtml}
                </ul>
                ${moreText}
                <button type="button" class="map-filter-btn" data-loc="${esc(locName)}" style="margin-top: 8px; width: 100%; padding: 4px 8px; font-size: 0.8rem; background: #10b981; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">
                    Filter Roster by ${esc(locName)}
                </button>
            </div>
        `;

        marker.bindPopup(popupContent);
    });

    if (bounds.length > 0) {
        alumniMapInstance.fitBounds(bounds, { padding: [40, 40], maxZoom: 8 });
    }
}
