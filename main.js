// main.js
import { db } from "./firebase.js";
import {
  ref, get, set, remove, onValue
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// 로그인 체크
const currentUser = sessionStorage.getItem("currentUser");
if (!currentUser) {
  alert("로그인이 필요합니다.");
  location.href = "index.html";
}

// — 토너먼트 설정 —
const maxParticipants = 20;
// 사운드 중복 재생 방지 플래그
let tournamentSoundPlayed = false;

// 화면 요소
const tournamentTime  = document.getElementById("tournamentTime");
const mapDisplay      = document.getElementById("mapDisplay");
const queueStatus     = document.getElementById("queueStatus");
const participantList = document.getElementById("participantList");
const joinTournBtn    = document.getElementById("joinTournamentBtn");
const cancelTournBtn  = document.getElementById("cancelTournamentBtn");
const matchSound      = document.getElementById("matchSound");

// 다음 금요일 19:00 계산
function getNextFridayAt7PM() {
  const now = new Date();
  const daysUntilFri = (5 - now.getDay() + 7) % 7 || 7;
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntilFri);
  next.setHours(19,0,0,0);
  return next;
}

// 토너먼트 카운트다운 & 7시 사운드 처리
function updateTournamentTimer() {
  const now = new Date();
  const end = getNextFridayAt7PM();
  const diff = end - now;

  if (diff <= 0) {
    tournamentTime.innerText = "토너먼트 시작!";

    // 오후 7시 도달 시, 참가자 수 확인 후 사운드 재생 (한 번만)
    if (!tournamentSoundPlayed) {
      get(ref(db, "tournament/participants")).then(snap => {
        const parts = snap.val() || {};
        const cnt = Object.keys(parts).length;
        if (cnt >= maxParticipants) {
          matchSound.play();
        }
      });
      tournamentSoundPlayed = true;
    }

    return;
  }

  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  tournamentTime.innerText = `다음 토너먼트까지: ${d}일 ${h}시간 ${m}분 ${s}초`;
}
updateTournamentTimer();
setInterval(updateTournamentTimer, 1000);

// 토너먼트 정보 구독 (맵 표시)
onValue(ref(db, "tournament"), snap => {
  const data = snap.val() || {};
  mapDisplay.innerHTML = `<p><strong>맵:</strong> ${data.map||"정보 없음"}</p>`;
});

// 참가자 구독 및 버튼 상태 제어
onValue(ref(db, "tournament/participants"), snap => {
  const parts = snap.val() || {};
  const cnt = Object.keys(parts).length;

  queueStatus.innerText = `현재 참가자: ${cnt}/${maxParticipants}`;
  participantList.innerHTML =
    '<ul>' + Object.values(parts).map(p => `<li>${p.name}</li>`).join('') + '</ul>';

  const joined = !!parts[currentUser];
  joinTournBtn.disabled   = joined;
  cancelTournBtn.disabled = !joined;
});

// 참가 신청
joinTournBtn.addEventListener('click', async () => {
  const snap = await get(ref(db, "tournament/participants"));
  const parts = snap.val() || {};
  const cnt = Object.keys(parts).length;
  if (parts[currentUser]) return alert("이미 신청하셨습니다.");
  if (cnt >= maxParticipants)  return alert("정원 초과");

  await set(ref(db, `tournament/participants/${currentUser}`), { name: currentUser, joinedAt: Date.now() });
  alert("참가 신청 완료!");
});

// 참가 취소
cancelTournBtn.addEventListener('click', async () => {
  const snap = await get(ref(db, "tournament/participants"));
  const parts = snap.val() || {};
  if (!parts[currentUser]) return alert("신청 내역이 없습니다.");

  await remove(ref(db, `tournament/participants/${currentUser}`));
  alert("참가 취소 완료!");
});

// — 실시간 매칭 설정 —
const statusText = document.getElementById("statusText");
const timerBox   = document.getElementById("timer");
const resultBox  = document.getElementById("matchResult");

const maps = [
  "영원의 전쟁터", "용의 둥지", "하늘 사원",
  "브락시스 항전", "파멸의 탑", "볼스카야 공장",
  "저주의 골짜기", "거미 여왕의 무덤"
];

let queue = [];
let timerInterval;
let elapsed = 0;

// 매칭 대기열 구독
onValue(ref(db, "matchQueue"), snap => {
  queue = snap.val() || [];
  updateMatchStatus();
  if (queue.includes(currentUser)) startMatchTimer();
});

function updateMatchStatus() {
  statusText.innerText = `현재 ${queue.length}/10명 대기 중...`;
  if (queue.length < 10) return;

  const players = queue.slice(0,10);
  if (!players.includes(currentUser)) return;

  clearInterval(timerInterval);
  const map = maps[Math.floor(Math.random() * maps.length)];

  // 균등 편성
  const scored = players.map(n => ({ name: n, score: 1000 }));
  let teamA = [], teamB = [], sumA = 0, sumB = 0;
  scored.forEach(p => {
    if (sumA <= sumB) { teamA.push(p.name); sumA += p.score; }
    else               { teamB.push(p.name); sumB += p.score; }
  });

  // 결과 저장 및 표시
  set(ref(db, "matchQueue"), queue.slice(10));
  set(ref(db, "currentMatch"), {
    id: `match-${Date.now()}`,
    teamA, teamB, map,
    timestamp: new Date().toISOString()
  });

  matchSound.play();
  resultBox.innerHTML = `
    <h3>🎮 매칭 완료!</h3>
    <p><strong>맵:</strong> ${map}</p>
    <p><strong>팀 A:</strong> ${teamA.join(', ')}</p>
    <p><strong>팀 B:</strong> ${teamB.join(', ')}</p>
  `;

  statusText.innerText = "3초 후 결과 입력 화면으로 이동합니다...";
  setTimeout(() => location.href = "result.html", 3000);
}

// 참가 / 취소
window.joinMatch = () => {
  if (queue.includes(currentUser)) return alert("이미 대기 중입니다.");
  queue.push(currentUser);
  set(ref(db, "matchQueue"), queue);
  startMatchTimer();
};

window.cancelMatch = () => {
  if (!queue.includes(currentUser)) return alert("대기 중이 아닙니다.");
  queue = queue.filter(u => u !== currentUser);
  set(ref(db, "matchQueue"), queue);
  clearInterval(timerInterval);
  timerBox.innerText = "경과 시간: 0초";
};

function startMatchTimer() {
  elapsed = 0;
  timerBox.innerText = `경과 시간: 0초`;
  timerInterval = setInterval(() => {
    elapsed++;
    timerBox.innerText = `경과 시간: ${elapsed}초`;
  }, 1000);
}
