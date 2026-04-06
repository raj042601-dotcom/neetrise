import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import App from './App.tsx';
import './index.css';

const firebaseConfig = {
  apiKey: "AIzaSyAyc7ng_W_AK3sUOEZ3sSZeCSgFvPOE7cY",
  authDomain: "neetrise.firebaseapp.com",
  projectId: "neetrise",
  storageBucket: "neetrise.firebasestorage.app",
  messagingSenderId: "160254289498",
  appId: "1:160254289498:web:832346224aeb92e18cda63",
  measurementId: "G-1EW6GC57Y4"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
