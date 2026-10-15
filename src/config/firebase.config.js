/* import dotenv from 'dotenv';
import admin from 'firebase-admin';

dotenv.config();

admin.initializeApp({
    credential: admin.credential.cert({
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
    })
});

export const db = admin.firestore();
export const auth = admin.auth(); */

import dotenv from 'dotenv';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

dotenv.config();

const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

const app = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert(serviceAccount),
    });

export const db = getFirestore(app);
export const auth = getAuth(app);