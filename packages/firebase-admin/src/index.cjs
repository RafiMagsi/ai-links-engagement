const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let adminApp;
let serviceAccount;

function loadCredential() {
  const candidatePaths = [
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    path.join(process.cwd(), '.config/serviceAccountKey.json'),
    path.resolve(__dirname, '../../.config/serviceAccountKey.json'),
    path.resolve(__dirname, '../../../.config/serviceAccountKey.json'),
    path.resolve(__dirname, '../../../../.config/serviceAccountKey.json'),
  ].filter(Boolean);

  console.log('[Firebase] Looking for credentials in:', candidatePaths);

  for (const candidatePath of candidatePaths) {
    try {
      if (fs.existsSync(candidatePath)) {
        console.log('[Firebase] Found credentials at:', candidatePath);
        serviceAccount = require(candidatePath);
        return admin.credential.cert(serviceAccount);
      }
    } catch (error) {
      console.log('[Firebase] Path not accessible:', candidatePath, (error).message);
    }
  }

  console.log('[Firebase] Using applicationDefault() credentials');
  return admin.credential.applicationDefault();
}

function initializeFirebaseAdmin() {
  if (adminApp) {
    return adminApp;
  }

  if (admin.apps.length > 0) {
    adminApp = admin.app();
    return adminApp;
  }

  console.log('[Firebase] Initializing Firebase Admin SDK');

  adminApp = admin.initializeApp({
    credential: loadCredential(),
  });

  console.log('[Firebase] App initialized successfully');

  const db = adminApp.firestore();

  // Disable gRPC and use REST API instead
  db.settings({
    ignoreUndefinedProperties: true,
    preferRest: true,
  });

  console.log('[Firebase] Firestore configured (preferRest: true)');

  return adminApp;
}

function getFirebaseAdmin() {
  if (adminApp) {
    return adminApp;
  }

  if (admin.apps.length > 0) {
    adminApp = admin.app();
    return adminApp;
  }

  throw new Error('Firebase Admin SDK not initialized.');
}

function getFirestore() {
  const db = getFirebaseAdmin().firestore();
  return db;
}

// Auto-initialize
try {
  initializeFirebaseAdmin();
} catch (error) {
  console.warn('[Firebase] Initialization deferred:', error.message);
}

module.exports = {
  initializeFirebaseAdmin,
  getFirebaseAdmin,
  getFirestore,
  admin,
};
