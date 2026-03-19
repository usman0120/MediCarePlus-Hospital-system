// src/firebase.js
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyBiiF1M-QmniA0Oo372t9CO4beP3PiUtZw",
  authDomain: "fyp2-175ea.firebaseapp.com",
  projectId: "fyp2-175ea",
  storageBucket: "fyp2-175ea.firebasestorage.app",
  messagingSenderId: "1054789967626",
  appId: "1:1054789967626:web:1a93dc542572ad4f46a4f3"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)