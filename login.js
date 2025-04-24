// login.js
import { getDatabase, ref, get, child } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";
import { db } from "./firebase.js";

document.addEventListener("DOMContentLoaded", () => {
  const loginButton = document.querySelector("button");
  loginButton.addEventListener("click", login);
});

async function login() {
  const id = document.getElementById("username").value.trim();
  const pw = document.getElementById("password").value;
  const errorBox = document.getElementById("error");

  if (!id || !pw) {
    errorBox.innerText = "아이디와 비밀번호를 모두 입력하세요.";
    return;
  }

  const snapshot = await get(child(ref(db), `users/${id}`));

  if (!snapshot.exists()) {
    errorBox.innerText = "존재하지 않는 아이디입니다.";
    return;
  }

  const user = snapshot.val();

  if (user.blocked) {
    errorBox.innerText = "차단된 유저입니다. 관리자에게 문의하세요.";
    return;
  }

  if (user.password !== pw) {
    errorBox.innerText = "비밀번호가 일치하지 않습니다.";
    return;
  }

  // 관리자 자동 승인 처리
  if (id === "admin") {
    user.status = "approved";
    user.role = "admin";
  }

  if (user.status !== "approved") {
    errorBox.innerText = "가입 승인 대기 중입니다.";
    alert("📢 가입 신청이 완료되었습니다. 승인을 위해 5,000원을 입금해 주세요.");
    return;
  }

  const joinedAt = new Date(user.joinedAt || new Date());
  const today = new Date();
  const diff = (today - joinedAt) / (1000 * 60 * 60 * 24);
  if (diff > 30 && id !== "admin") {
    errorBox.innerText = "⛔ 이용 기간이 만료되었습니다. 오픈카톡으로 문의해 연장해 주세요.";
    return;
  }

  localStorage.setItem("currentUser", id);
  if (user.role === "admin") {
    location.href = "admin.html";
  } else {
    location.href = "main.html";
  }
}
