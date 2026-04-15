
const { https } = require("firebase-functions");
const { storage } = require('./utils/storage.js');
// ... rest of imports ...

// Replace with your actual bucket name
const BUCKET_NAME = process.env.VITE_STORAGE_BUCKET
const bucket = storage.bucket(BUCKET_NAME);

export const generateSignedUploadUrl = https.onCall(async (data, context) => {
    
    // 1. ⚠️ REMOVED: context.auth check
    //    The function is now callable by anyone who knows the endpoint URL.
    //    If you need security, you MUST add custom API key validation here.
    
    const { fileName, contentType } = data; // e.g., 'profile/123.jpg', 'image/jpeg'
    if (!fileName || !contentType) {
        // Still enforce necessary input
        throw new https.HttpsError('invalid-argument', 'File details are required.');
    }

    const file = bucket.file(fileName);

    // 2. Define the signed URL options (same as before)
    const options = {
        version: 'v4',
        action: 'write', // 'write' action corresponds to an HTTP PUT upload
        expires: Date.now() + 10 * 60 * 1000, // URL expires in 10 minutes
        contentType: contentType, 
    };

    // 3. Generate the URL and return it
    const [url] = await file.getSignedUrl(options);

    return {
        signedUrl: url,
        storagePath: fileName
    };
});