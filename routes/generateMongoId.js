const { emit, pid } = require('process');
const crypto = require('crypto');

function generateMongoId(firestoreId) {
    const hash = crypto.createHash('sha1').update(firestoreId).digest();
  
    // Use the first 12 bytes (96 bits) from the hash to create a MongoDB ObjectID
    const mongoObjectId = hash.toString('hex').substring(0, 24);
  
    return mongoObjectId; }

module.exports = generateMongoId