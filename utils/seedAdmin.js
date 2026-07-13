const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
const { INITIAL_ADMIN_USERNAME, INITIAL_ADMIN_PASSWORD } = require('../config');

// Bootstraps the very first login: with no users in the database, nobody
// could otherwise sign in to create one. Runs once at startup and is a no-op
// once at least one user exists.
const seedInitialAdmin = async () => {
  const existingCount = await User.countDocuments();
  if (existingCount > 0) return;

  const username = (INITIAL_ADMIN_USERNAME || 'admin').toLowerCase();
  const password = INITIAL_ADMIN_PASSWORD || 'ChangeMe@123';
  const passwordHash = await bcrypt.hash(password, 10);

  await User.create({ username, passwordHash, role: 'admin' });

  console.log('='.repeat(60));
  console.log('No users existed — created the initial admin account:');
  console.log(`  Username: ${username}`);
  console.log(`  Password: ${password}`);
  console.log('Log in and create a proper admin account (or change this password) right away.');
  console.log('='.repeat(60));
};

module.exports = { seedInitialAdmin };
