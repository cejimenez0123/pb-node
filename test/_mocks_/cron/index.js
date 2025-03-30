const cron = require('node-cron');

cron.schedule('* * * * *', () => {
  console.log('Running cron job at:', new Date().toLocaleString());
});

console.log('Cron job scheduled. Waiting for tasks...');