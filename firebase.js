// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app-check.js";

// 🔥 너의 Firebase 프로젝트 설정
const firebaseConfig = {
  apiKey: "AIzaSyDoCGtKlYz1UHjbayvrcnZPBYGnbIfi9oA",
  authDomain: "horst-system.firebaseapp.com",
  databaseURL: "https://horst-system-default-rtdb.firebaseio.com",
  projectId: "horst-system",
  storageBucket: "horst-system.appspot.com",
  messagingSenderId: "910572344791",
  appId: "1:910572344791:web:c09935b85832f83a1ca792",
  measurementId: "G-DDRGEQLFX5"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// ✅ App Check(reCAPTCHA v3) 초기화
initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('6Ld5tiYrAAAAAJGFHhJOWZlQwcK3HOT_mCdxLM2j'),
  isTokenAutoRefreshEnabled: true, // 토큰 자동 새로고침 켜기
});

// Realtime Database 인스턴스 가져오기
export const database = getDatabase(app);
export const db = database;
