import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCFlGHsydbpmeYylysbjqzCGbk4s78McWk",
  authDomain: "hjb--gestion.firebaseapp.com",
  projectId: "hjb--gestion",
  storageBucket: "hjb--gestion.firebasestorage.app",
  messagingSenderId: "95036681510",
  appId: "1:95036681510:web:4730dfee80a88e8eb165e7",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export default app;
