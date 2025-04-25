import { db } from "./firebase.js";
import { ref, get, set, update, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

const currentUser = localStorage.getItem("currentUser");
if (!currentUser) {
  alert("로그인이 필요합니다.");
  location.href = "index.html";
}

const welcomeBox = document.getElementById("welcomeBox");
const seasonInfoDiv = document.getElementById("seasonInfo");
const noticeUl = document.getElementById("noticeList");
const matchStatus = document.getElementById("statusText");
const matchTimer = document.getElementById("timer");
const matchResultBox = document.getElementById("matchResult");
const billingInfo = document.getElementById("billingInfo");
const tournamentInfo = document.getElementById("tournamentInfo");

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

window.saveSeason = () => {
  const newText = document.getElementById("seasonInput").value.trim();
  if (!newText) return alert("내용을 입력하세요.");
  localStorage.setItem("seasonText", newText);
  alert("시즌 정보가 저장되었습니다.");
  location.reload();
};

window.logout = () => {
  localStorage.removeItem("currentUser");
  alert("로그아웃 되었습니다.");
  location.href = "index.html";
};

let matchQueue = [];
let matchTime = 0;
let timerInterval = null;
const userScores = JSON.parse(localStorage.getItem("userScores") || "{}");
if (!(currentUser in userScores)) {
  userScores[currentUser] = 1000;
  localStorage.setItem("userScores", JSON.stringify(userScores));
}

window.joinMatch = async () => {
  const snap = await get(ref(db, "matchQueue"));
  matchQueue = snap.exists() ? snap.val() : [];
  if (matchQueue.includes(currentUser)) return alert("이미 대기 중입니다.");
  matchQueue.push(currentUser);
  await set(ref(db, "matchQueue"), matchQueue);
  localStorage.setItem("matchQueue", JSON.stringify(matchQueue));
  updateMatchStatus();
  if (!timerInterval) startTimer();
};

window.cancelMatch = async () => {
  const snap = await get(ref(db, "matchQueue"));
  let currentQueue = snap.exists() ? snap.val() : [];
  currentQueue = currentQueue.filter(id => id !== currentUser);
  await set(ref(db, "matchQueue"), currentQueue);
  matchQueue = currentQueue;
  localStorage.setItem("matchQueue", JSON.stringify(currentQueue));
  updateMatchStatus();
  clearTimer();
};

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

    matchQueue = matchQueue.slice(10);
    set(ref(db, "matchQueue"), matchQueue);
    localStorage.setItem("currentMatch", JSON.stringify(matchData));

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
  timerInterval = setInterval(() => {
    matchTime++;
    matchTimer.innerText = `경과 시간: ${matchTime}초`;
  }, 1000);
}

function clearTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  matchTimer.innerText = "";
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
      teamA.push(p.name); scoreA += p.score;
    } else {
      teamB.push(p.name); scoreB += p.score;
    }
  }
  return { teamA, teamB };
}

// ✅ 매주 금요일 오후 7시마다 자동 오픈
(function autoOpenTournament() {
  const now = new Date();
  const isFriday = true; // 테스트용 강제 true

  const mapList = [
    "영원의 전쟁터", "용의 둥지", "하늘 사원",
    "브락시스 항전", "파멸의 탑", "볼스카야 공장",
    "저주의 골짜기", "거미 여왕의 무덤"
  ];
  const randomMap = mapList[Math.floor(Math.random() * mapList.length)];

  const tournamentRef = ref(db, "tournament");
  get(tournamentRef).then((snap) => {
    const current = snap.val();
    const newStart = new Date();
    newStart.setHours(19, 0, 0, 0);
    if (!current || new Date(current.startTime) < now || current.status === "ended") {
      set(tournamentRef, {
        startTime: newStart.toISOString(),
        status: "open",
        participants: [],
        map: randomMap,
        teams: null,
        matches: null
      });
    }
  });
})();

// ✅ 토너먼트 버튼 처리 포함
window.registerTournament = async () => {
  const snap = await get(ref(db, "tournament"));
  const data = snap.val();
  if (!data) return;
  if (!data.participants.includes(currentUser)) {
    data.participants.push(currentUser);
    await update(ref(db, "tournament"), { participants: data.participants });
    alert("✅ 토너먼트 참가 신청 완료!");
  } else {
    alert("이미 참가 신청하셨습니다.");
  }
};

window.unregisterTournament = async () => {
  const snap = await get(ref(db, "tournament"));
  const data = snap.val();
  if (!data) return;
  data.participants = data.participants.filter((u) => u !== currentUser);
  await update(ref(db, "tournament"), { participants: data.participants });
  alert("❌ 참가 신청이 취소되었습니다.");
};

// ✅ 실시간 토너먼트 정보 렌더링
onValue(ref(db, "tournament"), async (snap) => {
  const data = snap.val();
  if (!data) {
    tournamentInfo.innerHTML = "현재 등록된 토너먼트가 없습니다.";
    return;
  }

  const now = new Date();
  const startTime = new Date(data.startTime);
  const diffMs = startTime - now;
  const participants = data.participants || [];
  const mapName = data.map || "맵 정보 없음";

  const remaining = `${Math.floor(diffMs / (1000 * 60 * 60 * 24))}일 ${Math.floor(diffMs / (1000 * 60 * 60)) % 24}시간 ${(Math.floor(diffMs / (1000 * 60)) % 60)}분 ${(Math.floor(diffMs / 1000) % 60)}초`;

  tournamentInfo.innerHTML = `
    <p>📍 맵: <strong style="color:skyblue;">${mapName}</strong></p>
    <p>토너먼트 시작까지: <span style="color:lime;">${remaining} 남음</span></p>
    <p>참가자 수: <span style="color:gold;">${participants.length}/20</span></p>
    <div id="tournamentButtons"></div>
  `;

  const buttonDiv = document.getElementById("tournamentButtons");
  buttonDiv.innerHTML = `
    <button onclick="registerTournament()">✅ 참가 신청</button>
    <button onclick="unregisterTournament()">❌ 신청 취소</button>
  `;

  if (diffMs <= 0 && participants.length === 20 && !data.teams) {
    autoAssignTeams(participants);
  }
});

async function autoAssignTeams(participants) {
  const scoresSnap = await get(ref(db, "users"));
  const scores = scoresSnap.val();
  participants.sort((a, b) => (scores[b]?.points || 0) - (scores[a]?.points || 0));

  const teams = { A: [], B: [], C: [], D: [] };
  participants.forEach((player, idx) => {
    const teamKey = ['A', 'B', 'C', 'D'][idx % 4];
    teams[teamKey].push(player);
  });

  const tournamentSnap = await get(ref(db, "tournament"));
  const map = tournamentSnap.val()?.map || "저주의 골짜기";

  await update(ref(db, "tournament"), {
    teams,
    status: "ongoing",
    matches: {
      semiFinal1: { team1: "A", team2: "B", winner: "" },
      semiFinal2: { team1: "C", team2: "D", winner: "" },
      final: { team1: "", team2: "", winner: "" }
    }
  });

  localStorage.setItem("tournamentTeams", JSON.stringify(teams));
  location.href = "tournament.html";
}
