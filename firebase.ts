import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB1nVp5DCOUsbAJIelVWrSRVisWM26Aiok",
  authDomain: "expense-app-1c549.firebaseapp.com",
  projectId: "expense-app-1c549",
  storageBucket: "expense-app-1c549.firebasestorage.app",
  messagingSenderId: "965122876703",
  appId: "1:965122876703:web:07391551fa6c73c4033c2a"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
