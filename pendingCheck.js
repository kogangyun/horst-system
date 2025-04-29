// pendingCheck.js

import { db } from "./firebase.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// 로그인 유저 확인
const currentUser = localStorage.getItem("currentUser");
if (!currentUser) {
  alert("로그인이 필요합니다.");
  location.href = "index.html";
}

// 안전한 joinMatch
async function safeJoinMatch() {
  try {
    const pendingSnap = await get(ref(db, `pendingResults/${currentUser}`));
    if (pendingSnap.exists()) {
      alert("⚠️ 이전 매칭 결과를 입력하지 않았습니다. 결과 입력 후 매칭 참여가 가능합니다.");
      return;
    }

    // pending 없으면 원래 joinMatch() 호출
    if (typeof window.originalJoinMatch === 'function') {
      window.originalJoinMatch();
    } else if (typeof window.joinMatch === 'function') {
      window.joinMatch();
    } else {
      alert("⚠️ 시스템 오류: joinMatch 함수가 없습니다.");
    }
  } catch (error) {
    console.error("pendingResults 확인 중 오류:", error);
    alert("⚠️ 서버 통신 오류. 다시 시도해주세요.");
  }
}

// 초기 세팅: 기존 joinMatch 저장 후 교체
function interceptJoinMatch() {
  if (typeof window.joinMatch === 'function') {
    window.originalJoinMatch = window.joinMatch;
    window.joinMatch = safeJoinMatch;
  } else {
    console.error("⚠️ joinMatch 함수가 존재하지 않습니다.");
  }
}

// 페이지 로드 후 실행
window.addEventListener("DOMContentLoaded", () => {
  interceptJoinMatch();
});