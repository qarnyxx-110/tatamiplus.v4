// Public configuration for the optional Neshan map and clubs list integration.
// Use a Web SDK key restricted to the exact production domain(s), never a service key.
// TP_CLUBS_JSON_URL is a same-origin GET endpoint when possible.
// Expected response fields, filters, and validation rules: shared/CLUBS_API_CONTRACT.md.
// Keep both values empty until the backend endpoint and restricted Web SDK key are ready.
window.TP_NESHAN_WEB_KEY = window.TP_NESHAN_WEB_KEY || '';
window.TP_CLUBS_JSON_URL = window.TP_CLUBS_JSON_URL || '';
