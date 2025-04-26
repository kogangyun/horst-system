import { db } from "./firebase.js";
import { ref, get, set, update, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

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

// 사용자 정보 표시
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
  if (localStorage.getItem("currentMatch")) {
    alert("진행 중인 매치가 있습니다. 결과 입력 후 다시 시도하세요.");
    return;
  }

  const snap = await get(ref(db, "matchQueue"));
  matchQueue = snap.exists() ? snap.val() : [];
  if (matchQueue.includes(currentUser)) return alert("이미 대기 중입니다.");
  matchQueue.push(currentUser);
  await set(ref(db, "matchQueue"), matchQueue);
  localStorage.setItem("matchQueue", JSON.stringify(matchQueue));
  if (!timerInterval) startTimer();
};

window.cancelMatch = async () => {
  const snap = await get(ref(db, "matchQueue"));
  let currentQueue = snap.exists() ? snap.val() : [];
  currentQueue = currentQueue.filter(id => id !== currentUser);
  await set(ref(db, "matchQueue"), currentQueue);
  matchQueue = currentQueue;
  localStorage.setItem("matchQueue", JSON.stringify(currentQueue));
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

    matchQueue = matchQueue.slice(10);
    set(ref(db, "matchQueue"), matchQueue);
    localStorage.setItem("currentMatch", JSON.stringify(matchData));
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

// ========================================
// ✅ 추가된 토너먼트 관련 부분
// ========================================

// 토너먼트 정보 실시간 표시
onValue(ref(db, "tournament"), (snapshot) => {
  const data = snapshot.val();
  if (data) {
    tournamentInfo.innerHTML = `
      <p>현재 토너먼트 상태: ${data.status || '정보 없음'}</p>
      <p>맵: ${data.map || '정보 없음'}</p>
    `;
  } else {
    tournamentInfo.innerText = "현재 토너먼트 정보가 없습니다.";
  }
});

// 토너먼트 참가
window.joinTournament = async () => {
  const snap = await get(ref(db, "tournament/participants"));
  const participants = snap.exists() ? snap.val() : {};
  if (participants[currentUser]) {
    alert("이미 참가 신청하셨습니다.");
    return;
  }
  if (Object.keys(participants).length >= 20) {
    alert("정원이 초과되었습니다.");
    return;
  }
  await set(ref(db, `tournament/participants/${currentUser}`), {
    name: currentUser,
    joinedAt: Date.now()
  });
  alert("토너먼트 참가 완료!");
};

// 토너먼트 참가 취소
window.cancelTournament = async () => {
  const snap = await get(ref(db, "tournament/participants"));
  const participants = snap.exists() ? snap.val() : {};
  if (!participants[currentUser]) {
    alert("참가 내역이 없습니다.");
    return;
  }
  await set(ref(db, `tournament/participants/${currentUser}`), null);
  alert("토너먼트 참가 취소 완료!");
};
// ✅ 금요일 7시까지 남은 시간 표시
function updateTournamentCountdown() {
  const timeBox = document.getElementById("tournamentTime");
  if (!timeBox) return;

  const now = new Date();
  const day = now.getDay(); // 0(일)~6(토)
  const diffToFriday = (5 - day + 7) % 7 || 7;

  const target = new Date(now);
  target.setDate(now.getDate() + diffToFriday);
  target.setHours(19, 0, 0, 0); // 오후 7시

  const diff = target - now;

  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diff % (1000 * 60)) / 1000);

  timeBox.innerText = `매주 금요일 19:00까지 남은 시간: ${d}일 ${h}시간 ${m}분 ${s}초`;
  timeBox.style.color = "#00ff88";
  timeBox.style.fontWeight = "bold";
}
setInterval(updateTournamentCountdown, 1000);
updateTournamentCountdown();
// ✅ 참가자 수 표시
const queueStatus = document.getElementById("queueStatus");
onValue(ref(db, "tournament/participants"), (snap) => {
  const participants = snap.exists() ? snap.val() : {};
  const count = Object.keys(participants).length;
  queueStatus.innerText = `현재 참가자: ${count}/20`;
});

// ✅ 금요일 19:00가 되면 자동 매칭 실행
let tournamentMatched = false;
function checkAndRunTournamentMatch() {
  const now = new Date();
  const isFriday = now.getDay() === 5;
  const hour = now.getHours();
  const minute = now.getMinutes();

  if (isFriday && hour === 19 && !tournamentMatched) {
    tournamentMatched = true;

    get(ref(db, "tournament/participants")).then((snap) => {
      const data = snap.val();
      if (!data) return;

      const all = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      if (all.length < 2) return; // 최소 2명 이상일 때만 매칭

      // 랜덤 셔플
      for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [all[i], all[j]] = [all[j], all[i]];
      }

      const mid = Math.ceil(all.length / 2);
      const teamA = all.slice(0, mid).map(p => p.id);
      const teamB = all.slice(mid).map(p => p.id);

      get(ref(db, "tournament/map")).then((mapSnap) => {
        const map = mapSnap.exists() ? mapSnap.val() : "맵 미지정";

        set(ref(db, "tournament/currentMatch"), {
          teamA,
          teamB,
          map,
          startedAt: new Date().toISOString()
        });
      });
    });
  }

  // 토요일이 되면 플래그 초기화
  if (now.getDay() === 6) {
    tournamentMatched = false;
  }
}
setInterval(checkAndRunTournamentMatch, 10000); // 10초마다 체크
const tournamentMap = document.getElementById("tournamentMap");
onValue(ref(db, "tournament"), (snapshot) => {
  const data = snapshot.val();
  if (data && data.map) {
    tournamentMap.innerText = data.map;
  } else {
    tournamentMap.innerText = "맵 정보 없음";
  }
});
