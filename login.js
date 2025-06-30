import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

/**
 * Firebase 專案設定
 */
const firebaseConfig = {
  apiKey: "AIzaSyAB5pLZ_zZVA6a3TNDip5kTiGoARAKIRyk",
  authDomain: "veggibuddy-db.firebaseapp.com",
  projectId: "veggibuddy-db",
  storageBucket: "veggibuddy-db.firebasestorage.app",
  messagingSenderId: "604849657161",
  appId: "1:604849657161:web:5d98aabf189abd4cedf698",
  measurementId: "G-03L2VK6RQG"
};

// 初始化 Firebase App
const firebaseApp = initializeApp(firebaseConfig);

// 取得 Firebase Authentication 服務
const auth = getAuth(firebaseApp);

// Google OAuth 登入提供者
const provider = new GoogleAuthProvider();

/**
 * 使用 Google Popup 進行登入，並取得後端 session token
 * @returns {Promise<string|undefined>} 回傳 session token 或 undefined（失敗時）
 */
export async function loginWithGoogle() {
  try {
    const userCredential = await signInWithPopup(auth, provider);
    const session_token = await refresh(userCredential);
    return session_token
  } catch(error) {
    console.error("登入錯誤：", error.message);
  }
}

/**
 * 使用 Email/密碼註冊新帳號
 * @param {string} email - 使用者電子郵件
 * @param {string} password - 使用者密碼
 */
export async function register(email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log("註冊成功", userCredential.user);
  } catch (error) {
    console.error("註冊失敗", error.message);
  }
}


/**
 * 使用 Email/密碼登入，並取得後端 session token
 * @param {string} email - 使用者電子郵件
 * @param {string} password - 使用者密碼
 * @returns {Promise<string|undefined>} 回傳 session token 或 undefined（失敗時）
 */
export async function login(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const session_token = await refresh(userCredential);
    return session_token
  } catch (error) {
    console.error("登入錯誤：", error.message);
  }
}

/**
 * 透過 Firebase ID Token 向後端驗證並取得 session token
 * Firebase ID Token 預設 1 小時過期
 * @param {firebase.auth.UserCredential} userCredential - Firebase 登入回傳的使用者憑證
 * @returns {Promise<string|undefined>} 回傳後端 session token 或 undefined（失敗時）
 */
async function refresh(userCredential) {
  try {
    const token = await userCredential.user.getIdToken();
    const res = await fetch("http://localhost:8000/auth", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
    });

    if (res.ok) {
      const data = await res.json();
      console.log("登入成功")
      return data.session_token
    } else {
      console.log("登入失敗")
    }
  } catch (error) {
    console.error("登入失敗：", error);
  }
}

let ws = null;

/**
 * 建立 WebSocket 連線以取得寵物回應
 * @param {string} session_token - 後端認證用的 session token
 * @returns {Promise<WebSocket>} 回傳建立好的 WebSocket 物件
 */
export function generatePetResponse(session_token) {
  return new Promise((resolve, reject) => {
    try {
      ws = new WebSocket(`ws://localhost:8000/response/${session_token}`);

      ws.onopen = () => {
        console.log("WebSocket 連線成功！");
        ws.send("嗨!");
        resolve(ws);
      };

      ws.onmessage = (event) => {
        console.log("收到訊息：", event.data);
      };

      ws.onclose = () => {
        console.log("WebSocket 已關閉");
      };

      ws.onerror = (error) => {
        console.error("發生錯誤：", error);
        reject(error);
      };

    } catch (error) {
      console.error("回應生成失敗：", error);
      reject(error);
    }
  });
}

/**
 * 透過已建立的 WebSocket 發送訊息
 * @param {string} message - 要傳送的訊息文字
 */
export function sendMessage(message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(message);
    console.log("已傳送訊息: " + message)
  } else {
    appendMessage("尚未建立連線");
  }
}



