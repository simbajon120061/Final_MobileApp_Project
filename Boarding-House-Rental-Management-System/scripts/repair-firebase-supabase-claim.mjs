import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const [credentialPath, uid] = process.argv.slice(2);
if (!credentialPath || !uid) {
  console.error('Usage: node scripts/repair-firebase-supabase-claim.mjs <path-to-service-account.json> <firebase-user-uid>');
  process.exit(1);
}

const credential = JSON.parse(await readFile(path.resolve(credentialPath), 'utf8'));
if (credential.project_id !== 'boardinghouse-rental-mgt') {
  throw new Error('This service account must belong to the boardinghouse-rental-mgt Firebase project.');
}

initializeApp({ credential: cert(credential), projectId: credential.project_id });
const auth = getAuth();
const firestore = getFirestore();
const user = await auth.getUser(uid);
const profile = await firestore.collection('users').doc(uid).get();
const appRole = profile.exists ? profile.data().role : null;
const allowedRoles = new Set(['tenant', 'owner', 'landlord', 'caretaker']);

if (!allowedRoles.has(appRole)) {
  throw new Error(`Firebase user ${uid} has no valid app role in Firestore users/${uid}; claim was not changed.`);
}

const customClaims = { ...(user.customClaims || {}), role: 'authenticated' };
if (['owner', 'landlord', 'caretaker'].includes(appRole)) {
  customClaims.app_role = appRole;
} else {
  delete customClaims.app_role;
}

await auth.setCustomUserClaims(uid, customClaims);
const verifiedUser = await auth.getUser(uid);
if (verifiedUser.customClaims?.role !== 'authenticated') {
  throw new Error(`Claim update could not be verified for Firebase user ${uid}.`);
}

console.log(`Verified role="authenticated" for Firebase user ${uid} (${appRole}).`);
console.log('The app can now force-refresh its Firebase ID token; no service-account key change is needed.');
