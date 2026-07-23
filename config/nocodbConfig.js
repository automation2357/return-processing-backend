const ApiError = require('../utils/ApiError');

const {
  NOCODB_URL,
  NOCODB_TABLE_ID,
  NOCODB_VIEW_ID,
  NOCODB_TOKEN,
  NOCODB_SCAN_TRACKING_TABLE_ID,
  NOCODB_SCAN_TRACKING_VIEW_ID,
} = process.env;

if (!NOCODB_URL || !NOCODB_TABLE_ID || !NOCODB_TOKEN) {
  throw new ApiError(500, 'NocoDB environment variables are missing');
}
const NOCODB_CONFIG = (order_id) => ({
  method: 'GET',
  url: `${NOCODB_URL}/${NOCODB_TABLE_ID}/records`,
  params: {
    offset: '0',
    limit: '25',
    where: `(order_id,eq,${order_id})`,
    viewId: `${NOCODB_VIEW_ID}`,
  },
  headers: {
    'xc-token': NOCODB_TOKEN,
  },
});

// Separate NocoDB table that tracks who scanned an order (Processed page
// shows whatever name lands in its scan_tracking field). Checked lazily,
// not at module load, so a missing table/view id only breaks this one
// lookup instead of crashing every NocoDB-dependent route on startup.
const NOCODB_SCAN_TRACKING_CONFIG = (order_id) => {
  if (!NOCODB_SCAN_TRACKING_TABLE_ID || !NOCODB_SCAN_TRACKING_VIEW_ID) {
    throw new ApiError(500, 'NocoDB scan-tracking environment variables are missing');
  }
  return {
    method: 'GET',
    url: `${NOCODB_URL}/${NOCODB_SCAN_TRACKING_TABLE_ID}/records`,
    params: {
      offset: '0',
      limit: '25',
      where: `(order_id,eq,${order_id})`,
      viewId: `${NOCODB_SCAN_TRACKING_VIEW_ID}`,
    },
    headers: {
      'xc-token': NOCODB_TOKEN,
    },
  };
};

module.exports = { NOCODB_CONFIG, NOCODB_SCAN_TRACKING_CONFIG };
