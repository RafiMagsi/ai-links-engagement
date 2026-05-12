const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function loadCredential() {
  const candidatePaths = [
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    path.join(__dirname, 'public/serviceAccountKey.json'),
  ].filter(Boolean);

  console.log('[TEST] Looking for credentials in:', candidatePaths);

  for (const candidatePath of candidatePaths) {
    if (fs.existsSync(candidatePath)) {
      console.log('[TEST] Found credentials at:', candidatePath);
      const serviceAccount = require(candidatePath);
      return admin.credential.cert(serviceAccount);
    }
  }

  return admin.credential.applicationDefault();
}

if (!admin.apps.length) {
  console.log('[TEST] Initializing Firebase Admin SDK');
  admin.initializeApp({
    credential: loadCredential(),
  });
  console.log('[TEST] Firebase initialized');
}

const db = admin.firestore();

async function testFirestore() {
  try {
    console.log('[TEST] Attempting to read from "profiles" collection...');
    const snapshot = await db.collection('profiles').limit(1).get();
    console.log('[TEST] ✓ READ successful! Found', snapshot.docs.length, 'documents');

    console.log('[TEST] Attempting to write test document...');
    const testDocId = `test-direct-${Date.now()}`;
    await db.collection('automationAccounts').doc(testDocId).set({
      id: testDocId,
      userId: 'test-user',
      linkedinUrl: 'https://test.com',
      isActive: true,
      dailyPostLimit: 1,
      createdAt: new Date(),
    });
    console.log('[TEST] ✓ WRITE successful! Test doc ID:', testDocId);
    process.exit(0);
  } catch (error) {
    console.error('[TEST] ✗ FAILED:', error.message);
    process.exit(1);
  }
}

testFirestore();
