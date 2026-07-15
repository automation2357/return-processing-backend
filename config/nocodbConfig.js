const ApiError = require('../utils/ApiError');

const { NOCODB_URL, NOCODB_TABLE_ID, NOCODB_VIEW_ID, NOCODB_TOKEN } = process.env;

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

module.exports = { NOCODB_CONFIG };
