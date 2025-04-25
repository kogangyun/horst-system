// signup.js - Firebase 연동 기반 회원가입 처리

import { getDatabase, ref, get, set } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { database } from "./firebase.js";

function signup() {
  const id = document.getElementById("username").value.trim().toLowerCase();
  const pw = document.getElementById("password").value;
  const confirm = document.getElementById("confirm").value;

  // 아이디 유효성 검사
  const idRegex = /^[a-zA-Z0-9가-힣]{2,12}$/;
  if (!idRegex.test(id)) {
    alert("아이디는 영어, 숫자, 한글만 포함 가능하고 2~12자 사이여야 합니다.");
    return;
  }

  // 특수문자 제한 (보안)
  if (/[<>]/.test(id)) {
    alert("아이디에 사용할 수 없는 문자가 포함되어 있습니다.");
    return;
  }

  // 비밀번호 유효성 검사
  const pwValid = pw.length >= 6 && /[a-zA-Z]/.test(pw) && /[0-9]/.test(pw);
  if (!pwValid) {
    alert("비밀번호는 6자 이상이며, 영문과 숫자를 포함해야 합니다.");
    return;
  }

  // 비밀번호 확인
  if (pw !== confirm) {
    alert("비밀번호가 일치하지 않습니다.");
    return;
  }

  const db = getDatabase();
  const userRef = ref(db, `users/${id}`);

  get(userRef).then((snapshot) => {
    if (snapshot.exists()) {
      const userData = snapshot.val();
      if (userData.blocked) {
        alert("이 아이디는 차단되어 있어 가입할 수 없습니다.");
      } else {
        alert("이미 존재하는 아이디입니다.");
      }
    } else {
      const role = id === "admin" ? "admin" : "user";
      const status = role === "admin" ? "approved" : "pending";
      const joinedAt = new Date().toISOString();

      const newUser = {
        password: pw,
        status,             // "pending" 또는 "approved"
        role,               // "user" 또는 "admin"
        blocked: false,
        joinedAt            // 가입일 (30일 유효기간 체크용)
      };

      set(userRef, newUser)
        .then(() => {
          localStorage.setItem("currentUser", id);
          if (role === "admin") {
            location.href = "admin.html";
          } else {
            alert("가입이 완료되었습니다! 관리자의 승인을 기다려주세요.");
            location.href = "index.html";
          }
        })
        .catch((error) => {
          console.error("가입 중 오류 발생:", error);
          alert("⚠️ 가입 중 오류가 발생했습니다. 다시 시도해주세요.");
        });
    }
  });
}

window.signup = signup;
