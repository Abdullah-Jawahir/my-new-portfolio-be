import * as admin from 'firebase-admin';

const getFirebaseAdmin = () => {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  
  if (!serviceAccount) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set');
  }

  try {
    const credentials = JSON.parse(serviceAccount);
    
    return admin.initializeApp({
      credential: admin.credential.cert(credentials),
    });
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    throw error;
  }
};

export const firebaseAdmin = getFirebaseAdmin();
export const db = admin.firestore();
export const auth = admin.auth();
