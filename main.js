import { db } from "./firebase.js";
import { ref, get, set, update, onValue, remove } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// 로그인 체크
const currentUser = localStorage.getItem("currentUser");
if (!currentUser) {
  alert("로그인이 필요합니다.");
  location.href = "index.html";
}

// 기본 요소 셀렉터
const welcomeBox = document.getElementById("welcomeBox");
const seasonInfoDiv = document.getElementById("seasonInfo");
const noticeUl = document.getElementById("noticeList");
const matchStatus = document.getElementById("statusText");
const matchTimer = document.getElementById("timer");
const matchResultBox = document.getElementById("matchResult");
const billingInfo = document.getElementById("billingInfo");
const tournamentInfo = document.getElementById("tournamentInfo");

const matchSound = new Audio("videoplayback (3).m4a");

// 공지사항 표시
const noticeList = JSON.parse(localStorage.getItem("notices") || "[]");
function renderNotices() {
  noticeUl.innerHTML = "";
  noticeList.slice().reverse().forEach((notice) => {
    const li = document.createElement("li");
    li.innerHTML = `<div style="background:#222; padding:10px; border:1px solid gold; border-radius:6px;">📌 ${notice}</div>`;
    noticeUl.appendChild(li);
  });
}
renderNotices();

// 시즌 정보
const savedSeason = localStorage.getItem("seasonText") || "시즌 1 : 2025년 5월 1일 ~ 6월 30일";

get(ref(db, `users/${currentUser}`)).then(snapshot => {
  if (!snapshot.exists()) {
    alert("사용자 정보를 찾을 수 없습니다.");
    location.href = "index.html";
    return;
  }

  const user = snapshot.val();
  const clan = user.clan ? `[${user.clan}] ` : "";
  welcomeBox.innerHTML = `<h2>안녕하세요, ${clan + currentUser}님!</h2>
  <p>티어: ${user.tier || "없음"} / 점수: ${user.points || 0}</p>`;

  const joinedAt = new Date(user.joinedAt);
  const today = new Date();
  const daysUsed = Math.floor((today - joinedAt) / (1000 * 60 * 60 * 24));
  const daysLeft = 30 - daysUsed;

  billingInfo.innerHTML =
    daysLeft >= 0
      ? `<span style="color:${daysLeft <= 5 ? 'orange' : 'lime'}">남은 이용 기간: ${daysLeft}일</span>`
      : `<span style="color:red;">⛔ 이용 기간이 만료되었습니다. 연장 필요!</span>`;

  if (user.role === "admin") {
    seasonInfoDiv.innerHTML = `<textarea id="seasonInput" rows="2">${savedSeason}</textarea><br><button onclick="saveSeason()">저장</button>`;
  } else {
    seasonInfoDiv.innerHTML = `<p>${savedSeason}</p>`;
  }
});

// 시즌 저장
window.saveSeason = () => {
  const newText = document.getElementById("seasonInput").value.trim();
  if (!newText) return alert("내용을 입력하세요.");
  localStorage.setItem("seasonText", newText);
  alert("시즌 정보가 저장되었습니다.");
  location.reload();
};

// 로그아웃
window.logout = () => {
  localStorage.removeItem("currentUser");
  alert("로그아웃 되었습니다.");
  location.href = "index.html";
};

// 매칭 대기열 관리
let matchQueue = [];
let matchTime = 0;
let timerInterval = null;

const userScores = JSON.parse(localStorage.getItem("userScores") || "{}");
if (!(currentUser in userScores)) {
  userScores[currentUser] = 1000;
  localStorage.setItem("userScores", JSON.stringify(userScores));
}

window.joinMatch = async () => {
  const matchSnap = await get(ref(db, "currentMatch"));
  if (matchSnap.exists()) {
    alert("진행 중인 매치가 있습니다. 결과 입력 후 다시 시도하세요.");
    return;
  }

  const snap = await get(ref(db, "matchQueue"));
  matchQueue = snap.exists() ? snap.val() : [];
  if (matchQueue.includes(currentUser)) return alert("이미 대기 중입니다.");
  matchQueue.push(currentUser);
  await set(ref(db, "matchQueue"), matchQueue);
  clearTimer();
  startTimer();
};

window.cancelMatch = async () => {
  const snap = await get(ref(db, "matchQueue"));
  let currentQueue = snap.exists() ? snap.val() : [];
  currentQueue = currentQueue.filter(id => id !== currentUser);
  await set(ref(db, "matchQueue"), currentQueue);
  matchQueue = currentQueue;
  clearTimer();
};

onValue(ref(db, "matchQueue"), (snap) => {
  matchQueue = snap.exists() ? snap.val() : [];
  updateMatchStatus();
});

function updateMatchStatus() {
  matchStatus.innerText = `현재 ${matchQueue.length}/10명 대기 중...`;

  if (matchQueue.length >= 10) {
    clearTimer();
    const players = matchQueue.slice(0, 10);
    const mapList = [
      "영원의 전쟁터", "용의 둥지", "하늘 사원",
      "브락시스 항전", "파멸의 탑", "볼스카야 공장",
      "저주의 골짜기", "거미 여왕의 무덤"
    ];
    const map = mapList[Math.floor(Math.random() * mapList.length)];
    const teams = createBalancedTeams(players);

    const matchData = {
      id: `match-${Date.now()}`,
      teamA: teams.teamA,
      teamB: teams.teamB,
      map,
      timestamp: new Date().toISOString()
    };

    set(ref(db, "currentMatch"), matchData); // ⭐ 파이어베이스에 저장
    matchQueue = matchQueue.slice(10);
    set(ref(db, "matchQueue"), matchQueue);

    matchSound.play();
    matchResultBox.innerHTML = `
      <h3>🎮 매칭 완료!</h3>
      <p><strong>맵:</strong> ${map}</p>
      <p><strong>팀 A:</strong> ${teams.teamA.join(", ")}</p>
      <p><strong>팀 B:</strong> ${teams.teamB.join(", ")}</p>
    `;
    matchStatus.innerText = "3초 후 결과 입력 화면으로 이동합니다...";
    setTimeout(() => location.href = "result.html", 3000);
  }
}

function startTimer() {
  matchTime = 0;
  matchTimer.innerText = `경과 시간: ${matchTime}초`;
  clearTimer();
  timerInterval = setInterval(() => {
    matchTime++;
    matchTimer.innerText = `경과 시간: ${matchTime}초`;
  }, 1000);
}

function clearTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  matchTimer.innerText = "";
}

function createBalancedTeams(players) {
  const scored = players.map(name => ({
    name,
    score: userScores[name] || 1000
  })).sort((a, b) => b.score - a.score);

  const teamA = [];
  const teamB = [];
  let scoreA = 0, scoreB = 0;
  for (const p of scored) {
    if (scoreA <= scoreB) {
      teamA.push(p.name); scoreA += p.score;
    } else {
      teamB.push(p.name); scoreB += p.score;
    }
  }
  return { teamA, teamB };
}

// (이하 토너먼트 관련 부분은 그대로 유지)
