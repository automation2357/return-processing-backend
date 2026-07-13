const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const routes = require('./routes/index.js');
const globalErrorHandler = require('./middleware/globalErrorHandler.js');
const { PORT, CORS_ORIGIN, NODE_ENV } = require('./config/index.js');
const { connectDB } = require('./config/db');
const { seedInitialAdmin } = require('./utils/seedAdmin');

const app = express();

app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'return-processing-system' });
});

app.use('/api', routes);

app.use(globalErrorHandler);

connectDB()
  .then(() => seedInitialAdmin())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`The server is running on ${PORT} number`);
    });
  });

module.exports = app;
