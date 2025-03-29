const jwt = require('jsonwebtoken');

const eventNewsletterTemplate = jest.fn(({ events, user }) => {
  if (!user) {
    throw new Error('User not provided');
  }

  // Mock JWT token generation
  const token = jwt.sign({ userId: user.id }, 'mock-secret');
  const params = new URLSearchParams({ token });

  return {
    from: 'mock@plumbum.app',
    to: user.email,
    subject: 'Mock - Plumbum Writers Community - Upcoming Events🎉',
    html: `<!DOCTYPE html>
<html>
<head>
  <title>Mock Plumbum Newsletter</title>
</head>
<body>
  <h1>Hello, ${user.email}!</h1>
  <p>Here are the upcoming events:</p>
  ${events.length ? events.map(area => `
    <h2>${area.area}</h2>
    <ul>
      ${area.events.map(event => `<li>${event.summary} - ${formatDate(event.start.dateTime)}</li>`).join('')}
    </ul>
  `).join('') : '<p>No events available</p>'}
  <p><a href="https://mock.plumbum.app/subscribe?${params.toString()}">Update your email preferences</a></p>
</body>
</html>`
  };
});

// Mock date formatting function
function formatDate(isoString) {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return 'Invalid Date';

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12;
  hours = hours ? hours : 12;

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${hours}:${minutes} ${ampm} ${month}/${day}`;
}

module.exports = eventNewsletterTemplate;
