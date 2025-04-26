import { getDatabase, ref, get, child, set, update } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";
import { db } from "./firebase.js";

document.addEventListener("DOMContentLoaded", () => {
  const loginButton = document.querySelector("button");
  loginButton.addEventListener("click", login);
});

async function login() {
  const id = document.getElementById("username").value.trim().toLowerCase();
  const pw = document.getElementById("password").value;
  const errorBox = document.getElementById("error");

  if (!id || !pw) {
    errorBox.innerText = "아이디와 비밀번호를 모두 입력하세요.";
    return;
  }

  try {
    const snapshot = await get(child(ref(db), `users/${id}`));

    if (!snapshot.exists()) {
      errorBox.innerText = "존재하지 않는 아이디입니다.";
      return;
    }

    const user = snapshot.val();

    // 🚫 차단 확인
    if (user.blocked || false) {
      errorBox.innerText = "차단된 유저입니다. 관리자에게 문의하세요.";
      return;
    }

    // 🔐 비밀번호 확인
    if (user.password !== pw) {
      errorBox.innerText = "비밀번호가 일치하지 않습니다.";
      return;
    }

    // 👑 관리자 자동 승인 및 역할 부여
    if (id === "admin") {
      user.status = "approved";
      user.role = "admin";
      await set(ref(db, `users/${id}`), user);
    }

    // 🕒 승인 여부 확인
    if (user.status !== "approved") {
      errorBox.innerText = "가입 승인 대기 중입니다.";
      alert(
        "📢 가입 신청이 완료되었습니다.\n" +
        "승인을 위해 5,000원을 입금해 주세요.\n" +
        "첫달은 무료입니다. 궁금한 사항은 오픈카톡으로 문의 부탁드립니다:\n" +
        "https://open.kakao.com/o/sn8r4Psh"
      );
      return;
    }

    // ✅ 가입 시점(joinedAt) 없으면 저장
    user.joinedAt = user.joinedAt || new Date().toISOString();
    await set(ref(db, `users/${id}`), user);

    // ⏳ 30일 유효기간 체크
    const joinedAt = new Date(user.joinedAt);
    const today = new Date();
    const daysPassed = (today - joinedAt) / (1000 * 60 * 60 * 24);

    if (daysPassed > 30 && id !== "admin") {
      errorBox.innerText = "⛔ 이용 기간이 만료되었습니다. 오픈카톡으로 문의해 연장해 주세요.";
      return;
    }

    // ✅ 로그인 완료 (localStorage로 변경)
    localStorage.setItem("currentUser", id);
    alert("🎉 로그인 성공!");
    location.href = user.role === "admin" ? "admin.html" : "main.html";

  } catch (error) {
    console.error("로그인 오류:", error);
    errorBox.innerText = "⚠️ 로그인 중 오류가 발생했습니다.";
  }
}
