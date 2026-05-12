import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin SDK
let adminApp: admin.app.App | undefined;

function loadCredential() {
  const candidatePaths: string[] = [];

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    candidatePaths.push(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  }

  // Try multiple locations to find the credentials file
  candidatePaths.push(path.join(process.cwd(), '.config/serviceAccountKey.json'));
  candidatePaths.push(path.resolve(__dirname, '../../.config/serviceAccountKey.json'));
  candidatePaths.push(path.resolve(__dirname, '../../../.config/serviceAccountKey.json'));
  candidatePaths.push(path.resolve(__dirname, '../../../../.config/serviceAccountKey.json'));

  console.log('[Firebase] Looking for credentials in:', candidatePaths);

  for (const candidatePath of candidatePaths) {
    try {
      if (fs.existsSync(candidatePath)) {
        console.log('[Firebase] Found credentials at:', candidatePath);
        const serviceAccount = require(candidatePath);
        return admin.credential.cert(serviceAccount);
      }
    } catch (error) {
      console.warn(`[Firebase] Could not load credentials from ${candidatePath}:`, (error as any).message);
    }
  }

  console.log('[Firebase] Using applicationDefault() credentials');
  return admin.credential.applicationDefault();
}

export function initializeFirebaseAdmin(): admin.app.App {
  if (adminApp) {
    return adminApp;
  }

  if (admin.apps.length > 0) {
    return admin.app();
  }

  console.log('[Firebase] Initializing Firebase Admin SDK');

  adminApp = admin.initializeApp({
    credential: loadCredential(),
  });

  console.log('[Firebase] App initialized successfully');

  const db = adminApp.firestore();
  db.settings({
    ignoreUndefinedProperties: true,
    preferRest: true,
  });

  console.log('[Firebase] Firestore configured (preferRest: true)');

  return adminApp;
}

// Auto-initialize on module load
try {
  initializeFirebaseAdmin();
} catch (error) {
  console.warn('[Firebase] Initialization deferred:', (error as any).message);
}

export function getFirebaseAdmin(): admin.app.App {
  if (adminApp) {
    return adminApp;
  }

  if (admin.apps.length > 0) {
    adminApp = admin.app();
    return adminApp;
  }

  throw new Error('Firebase Admin SDK not initialized.');
}

// Convenience exports
export { admin };
export type { ServiceAccount } from 'firebase-admin';

// Auth helpers
export async function verifyIdToken(token: string): Promise<admin.auth.DecodedIdToken> {
  const auth = getFirebaseAdmin().auth();
  return auth.verifyIdToken(token);
}

export async function getUser(uid: string): Promise<admin.auth.UserRecord> {
  const auth = getFirebaseAdmin().auth();
  return auth.getUser(uid);
}

export async function setCustomClaims(
  uid: string,
  customClaims: Record<string, unknown>
): Promise<void> {
  const auth = getFirebaseAdmin().auth();
  return auth.setCustomUserClaims(uid, customClaims);
}

export async function createUser(
  email: string,
  password: string,
  displayName?: string
): Promise<admin.auth.UserRecord> {
  const auth = getFirebaseAdmin().auth();
  return auth.createUser({
    email,
    password,
    displayName,
  });
}

// Database helpers
export function getDatabase(): admin.database.Database {
  const databaseUrl = process.env.FIREBASE_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'FIREBASE_DATABASE_URL is missing. This is required only for Firebase Realtime Database. Use getFirestore() for Cloud Firestore.'
    );
  }

  return getFirebaseAdmin().database();
}

export function getFirestore(): admin.firestore.Firestore {
  const db = getFirebaseAdmin().firestore();
  return db;
}

// Exports for type safety
export type DecodedIdToken = admin.auth.DecodedIdToken;
export type UserRecord = admin.auth.UserRecord;
export type Database = admin.database.Database;
export type Firestore = admin.firestore.Firestore;
