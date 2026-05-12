import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
let adminApp: admin.app.App;

export function initializeFirebaseAdmin(
  projectId: string,
  privateKey: string,
  clientEmail: string,
  databaseUrl?: string
): admin.app.App {
  if (adminApp) {
    return adminApp;
  }

  const serviceAccount = {
    projectId,
    privateKey: privateKey.replace(/\\n/g, '\n'),
    clientEmail,
  };

  adminApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    databaseURL: databaseUrl,
  });

  return adminApp;
}

// Auto-initialize from environment variables if available
function autoInitialize(): void {
  if (adminApp) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const databaseUrl = process.env.FIREBASE_DATABASE_URL;

  if (projectId && privateKey && clientEmail) {
    initializeFirebaseAdmin(projectId, privateKey, clientEmail, databaseUrl);
  }
}

// Auto-initialize on module load
autoInitialize();

export function getFirebaseAdmin(): admin.app.App {
  if (!adminApp) {
    throw new Error('Firebase Admin SDK not initialized. Call initializeFirebaseAdmin first.');
  }
  return adminApp;
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
  const db = getFirebaseAdmin().database();
  if (!db) {
    throw new Error('Firebase Realtime Database not available');
  }
  return db;
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
