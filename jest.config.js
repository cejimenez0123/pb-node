require('dotenv').config({ path: '.env.test' });
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
module.exports = {
  testEnvironment: 'node',
};