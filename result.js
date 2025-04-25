import { db } from "./firebase.js";
import { ref, get, set, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// 현재 로그인한 유저
const currentUser = localStorage.getItem("currentUser");
if (!currentUser) {
  alert("로그인이 필요합니다.");
  location.href = "index.html";
}

let queue = []; // 매칭 대기열
let maxQueueSize = 20; // 최대 대기 인원
let tournamentStarted = false; // 토너먼트 시작 여부

// DOM 요소
const statusText = document.getElementById("statusText");
const queueStatus = document.getElementById("queueStatus");
const tournamentTime = document.getElementById("tournamentTime");
const matchResult = document.getElementById("matchResult");

// 토너먼트 대기 시간 설정
const tournamentStartTime = new Date(); // 예시로, 지금부터 7일 후로 설정
tournamentStartTime.setDate(tournamentStartTime.getDate() + 7); // 7일 후

// 토너먼트 시작 카운트다운 업데이트
function updateTournamentTime() {
  const now = new Date();
  const timeDiff = tournamentStartTime - now;

  if (timeDiff <= 0) {
    tournamentTime.innerText = "토너먼트 시작!";
  } else {
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
    tournamentTime.innerText = `다음 토너먼트 시작까지 남은 시간: ${days}일 ${hours}시간 ${minutes}분 ${seconds}초`;
  }
}

// 대기열 상태 실시간 업데이트
onValue(ref(db, "matchQueue"), (snapshot) => {
  queue = snapshot.val() || [];
  updateQueueStatus();
});

// 대기 인원 상태 업데이트
function updateQueueStatus() {
  const queueLength = queue.length;
  queueStatus.innerText = `현재 대기 중: ${queueLength}/${maxQueueSize}`;

  if (queueLength >= maxQueueSize && !tournamentStarted) {
    // 대기열이 꽉 차면 토너먼트 시작
    startTournament();
  }
}

// 매칭 대기열에 참가
window.joinMatch = () => {
  if (!currentUser) return alert("로그인이 필요합니다.");
  if (queue.includes(currentUser)) return alert("이미 대기 중입니다.");
  if (localStorage.getItem("matchingPaused") === "true") return alert("매칭이 일시 중단되었습니다.");

  queue.push(currentUser);
  set(ref(db, "matchQueue"), queue);
  updateQueueStatus();
};

// 매칭 취소
window.cancelMatch = () => {
  queue = queue.filter(user => user !== currentUser);
  set(ref(db, "matchQueue"), queue);
  updateQueueStatus();
};

// 토너먼트 시작
window.startTournament = () => {
  if (queue.length < maxQueueSize) {
    alert("매칭 대기 인원이 충분하지 않습니다.");
    return;
  }

  alert("토너먼트가 시작되었습니다!");
  tournamentStarted = true;

  // 토너먼트 맵 랜덤 선택
  const maps = [
    "영원의 전쟁터", "용의 둥지", "하늘 사원", "브락시스 항전",
    "파멸의 탑", "볼스카야 공장", "저주의 골짜기", "거미 여왕의 무덤"
  ];
  const map = maps[Math.floor(Math.random() * maps.length)];
  matchResult.innerHTML = `
    <h3>🎮 매칭 완료!</h3>
    <p><strong>맵:</strong> ${map}</p>
    <p><strong>팀 A:</strong> ...</p>
    <p><strong>팀 B:</strong> ...</p>
  `;

  // 대기열 초기화
  queue = [];
  set(ref(db, "matchQueue"), queue);
  updateQueueStatus();
};

// 토너먼트 취소
window.cancelTournament = () => {
  alert("토너먼트가 취소되었습니다.");
  tournamentStarted = false;

  // 대기열 초기화
  queue = [];
  set(ref(db, "matchQueue"), queue);
  updateQueueStatus();
};

// 실시간 카운트다운 시작
setInterval(updateTournamentTime, 1000);

// 초기 대기열 상태 업데이트
updateQueueStatus();
