const apn = require('apn');

const provider = new apn.Provider({
    token: {
        key: './AuthKey_ZH9A97395R.p8',
        keyId: process.env.APPLE_KEY_ID,
        teamId: process.env.APPLE_TEAM_ID
    },
    production: false
});

module.exports = async function sendSilentPush(deviceToken, title, body) {
    const notification = new apn.Notification();
    
    notification.contentAvailable = 1;
    notification.pushType = 'background';
    notification.priority = 5;
    notification.topic = 'com.plumbum.app'; // your bundle ID
    notification.payload = {
        title: title,
        body: body
    };

    const result = await provider.send(notification, deviceToken);
    console.log('Sent:', result.sent);
    console.log('Failed:', result.failed);
}