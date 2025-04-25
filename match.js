import { db } from "./firebase.js"; // Firebase 연동이 필요한 경우 대비
// 현재는 localStorage 기반으로 동작

const currentUser = localStorage.getItem("currentUser");
if (!currentUser) {
  alert("로그인이 필요합니다.");
  location.href = "index.html";
}

const userScores = JSON.parse(localStorage.getItem("userScores") || "{}");
let queue = JSON.parse(localStorage.getItem("matchQueue") || "[]");
let timerInterval = null;
let elapsedSeconds = 0;

const maps = [
  "영원의 전쟁터", "용의 둥지", "하늘 사원",
  "브락시스 항전", "파멸의 탑", "볼스카야 공장", "저주의 골짜기", "거미 여왕의 무덤"
];

// DOM 요소 초기 접근
const statusText = document.getElementById("statusText");
const timerBox = document.getElementById("timer");
const resultBox = document.getElementById("matchResult");

// 페이지 진입 시 상태 초기화
updateStatus();
if (queue.includes(currentUser)) {
  startTimer();
}

window.joinMatch = () => {
  if (!currentUser) return alert("로그인이 필요합니다.");
  if (queue.includes(currentUser)) return alert("이미 대기 중입니다.");
  if (localStorage.getItem("matchingPaused") === "true") return alert("매칭이 일시 중단되었습니다.");

  queue.push(currentUser);
  localStorage.setItem("matchQueue", JSON.stringify(queue));
  updateStatus();
  startTimer();
};

function updateStatus() {
  if (statusText) statusText.innerText = `현재 ${queue.length}/10명 대기 중...`;

  if (queue.length >= 10) {
    clearInterval(timerInterval);
    timerInterval = null;

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

    queue = queue.slice(10);
    localStorage.setItem("matchQueue", JSON.stringify(queue));
    localStorage.setItem("currentMatch", JSON.stringify(matchData));

    saveMatch(matchData);
    showMatchResult(matchData);

    if (statusText) statusText.innerText = "3초 후 결과 입력 화면으로 이동합니다...";
    setTimeout(() => {
      window.location.href = "result.html";
    }, 3000);
  }
}

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

function createBalancedTeams(players) {
  const scored = players.map(name => ({
    name,
    score: userScores[name] || 1000
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

function showMatchResult(match) {
  if (!resultBox) return;
  resultBox.innerHTML = `
    <h3>🎮 매칭 완료!</h3>
    <p><strong>맵:</strong> ${match.map}</p>
    <p><strong>팀 A:</strong> ${match.teamA.join(", ")}</p>
    <p><strong>팀 B:</strong> ${match.teamB.join(", ")}</p>
  `;
}

function saveMatch(matchData) {
  const matchHistory = JSON.parse(localStorage.getItem("matchHistory") || "[]");
  matchHistory.push(matchData);
  localStorage.setItem("matchHistory", JSON.stringify(matchHistory));
}

// 초기 점수 없을 경우 기본값 설정
if (!(currentUser in userScores)) {
  userScores[currentUser] = 1000;
  localStorage.setItem("userScores", JSON.stringify(userScores));
}
