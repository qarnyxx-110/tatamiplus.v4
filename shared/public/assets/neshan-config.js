// Public configuration for the optional Neshan map integration.
// Use a Web SDK key restricted to the exact production domain(s), never a service key.
// The JSON endpoint must return clubs with: id, name, latitude, longitude, city,
// optional distance_km and detail_url. Leave both values empty until the backend is ready.
window.TP_NESHAN_WEB_KEY = window.TP_NESHAN_WEB_KEY || '';
window.TP_CLUBS_JSON_URL = window.TP_CLUBS_JSON_URL || '';
