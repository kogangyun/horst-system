import { db } from "./firebase.js"; // Firebase 연동
import { ref, get, set, update, remove, child } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

const currentUser = localStorage.getItem("currentUser");
if (!currentUser) {
  alert("로그인이 필요합니다.");
  location.href = "index.html";
}

let timerInterval = null;
let elapsedSeconds = 0;

const maps = [
  "영원의 전쟁터", "용의 둥지", "하늘 사원",
  "브락시스 항전", "파멸의 탑", "볼스카야 공장", "저주의 골짜기", "거미 여왕의 무덤"
];

// DOM 요소 접근
const statusText = document.getElementById("statusText");
const timerBox = document.getElementById("timer");
const resultBox = document.getElementById("matchResult");

// 점수 초기화 (localStorage -> Firebase로 나중에 확장 가능)
const userScores = JSON.parse(localStorage.getItem("userScores") || "{}");
if (!(currentUser in userScores)) {
  userScores[currentUser] = 1000;
  localStorage.setItem("userScores", JSON.stringify(userScores));
}

// 매칭 대기열 상태 업데이트
async function updateStatus() {
  const snap = await get(ref(db, "matchQueue"));
  const queue = snap.exists() ? Object.values(snap.val()) : [];

  if (statusText) statusText.innerText = `현재 ${queue.length}/10명 대기 중...`;

  if (queue.length >= 10) {
    clearInterval(timerInterval);
    timerInterval = null;

    // ✅ 매칭 성사시 사운드 재생
    matchSound.play().catch(console.error);

    const players = queue.slice(0, 10);
    const map = maps[Math.floor(Math.random() * maps.length)];
    const teams = createBalancedTeams(players);
    const matchId = `match-${Date.now()}`;

    const matchData = {
      id: matchId,
      teamA: teams.teamA.map(p => p.name),
      teamB: teams.teamB.map(p => p.name),
      map,
      timestamp: new Date().toISOString(),
      results: {},
    };

    // 매칭 완료된 10명 대기열에서 제거
    for (const player of players) {
      await remove(ref(db, `matchQueue/${player.name}`));
    }

    // 매칭 결과 저장
    await set(ref(db, `matches/${matchId}`), matchData);
    await set(ref(db, `matchHistory/${matchId}`), matchData);

    showMatchResult(matchData);

    if (statusText) statusText.innerText = "3초 후 결과 입력 화면으로 이동합니다...";
    setTimeout(() => {
      window.location.href = "result.html";
    }, 3000);
  }
}

// 매칭 대기 시작
function startTimer() {
  if (timerInterval) return; // 중복 방지
  elapsedSeconds = 0;
  if (timerBox) timerBox.innerText = `경과 시간: 0초`;

  timerInterval = setInterval(() => {
    elapsedSeconds++;
    if (timerBox) timerBox.innerText = `경과 시간: ${elapsedSeconds}초`;
    updateStatus();
  }, 1000);
}

// 팀 균형 맞추기
function createBalancedTeams(players) {
  const scored = players.map(name => ({
    name: name.name, // player 객체에 name 속성 있음
    score: userScores[name.name] || 1000
  })).sort((a, b) => b.score - a.score);

  const teamA = [], teamB = [];
  let scoreA = 0, scoreB = 0;

  for (const p of scored) {
    if (scoreA <= scoreB) {
      teamA.push(p); scoreA += p.score;
    } else {
      teamB.push(p); scoreB += p.score;
    }
  }

  return { teamA, teamB };
}

// 매칭 결과 보여주기
function showMatchResult(match) {
  if (!resultBox) return;
  resultBox.innerHTML = `
    <h3>🎮 매칭 완료!</h3>
    <p><strong>맵:</strong> ${match.map}</p>
    <p><strong>팀 A:</strong> ${match.teamA.join(", ")}</p>
    <p><strong>팀 B:</strong> ${match.teamB.join(", ")}</p>
  `;
}

// 매칭 대기열 참가
window.joinMatch = async () => {
  if (!currentUser) return alert("로그인이 필요합니다.");

  const snap = await get(ref(db, "matchQueue"));
  const queue = snap.exists() ? Object.keys(snap.val()) : [];

  if (queue.includes(currentUser)) return alert("이미 대기 중입니다.");
  if (localStorage.getItem("matchingPaused") === "true") return alert("매칭이 일시 중단되었습니다.");

  await update(ref(db, `matchQueue/${currentUser}`), {
    name: currentUser,
    joinedAt: Date.now(),
  });

  updateStatus();
  startTimer();
};

