const { initializeApp } = require("firebase/app");
const { getStorage,getDownloadURL,ref } = require("firebase/storage")
const config = { apiKey:process.env.VITE_FIREBASE_API_KEY,
  authDomain:process.env.VITE_AUTH_DOMAIN,
  databaseURL: process.env.VITE_DATABASE_URL,
  projectId: process.env.VITE_PROJECT_ID,
  storageBucket: process.env.VITE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_APP_ID,
  measurementId: process.env.VITE_MEASUREMENT_ID,
storageBucket:process.env.VITE_STORAGE_BUCKET}
const firebaseConfig = config
const firebase = initializeApp(firebaseConfig);

const storage = getStorage(firebase)
module.exports = {storage}