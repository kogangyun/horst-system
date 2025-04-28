import { db } from "./firebase.js";
import {
  ref,
  get,
  set,
  onValue,
  child,
  update,
  onChildAdded,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// ----- DOM 요소 가져오기 -----
const matchSound      = document.getElementById("matchSound");
const statusText      = document.getElementById("statusText");
const timerText       = document.getElementById("timer");
const matchResult     = document.getElementById("matchResult");
const tournamentMap   = document.getElementById("tournamentMap");
const tournamentTime  = document.getElementById("tournamentTime");
const queueStatus     = document.getElementById("queueStatus");
const participantList = document.getElementById("participantList");
const usagePeriodEl   = document.getElementById("usagePeriod");

// 로그인 체크
const currentUser = localStorage.getItem("currentUser");
if (!currentUser) {
  alert("로그인이 필요합니다.");
  location.href = "index.html";
}

// ----- 이용 기간 표시 -----
async function loadUsagePeriod() {
  try {
    const snap = await get(ref(db, `users/${currentUser}/joinedAt`));
    if (!snap.exists()) {
      usagePeriodEl.innerText = "가입일 정보 없음";
      return;
    }
    const joinedAt = new Date(snap.val()).getTime();
    const EXPIRATION_MS = 30 * 24 * 60 * 60 * 1000;

    function updateRemaining() {
      const now = Date.now();
      const diff = joinedAt + EXPIRATION_MS - now;
      if (diff <= 0) {
        usagePeriodEl.innerText = "이용 기간 만료";
        clearInterval(intervalId);
        return;
      }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      usagePeriodEl.innerText = `${d}일 ${h}시간 ${m}분 ${s}초`;
    }

    updateRemaining();
    const intervalId = setInterval(updateRemaining, 1000);
  } catch (e) {
    usagePeriodEl.innerText = "기간 로딩 중 오류";
    console.error("Usage period load error:", e);
  }
}
loadUsagePeriod();

// ----- 매칭 대기 로직 (keyed onDisconnect) -----
let matchQueue   = [];
let matchElapsed = 0;
let timerInterval;

window.joinMatch = async () => {
  const userNode = ref(db, `matchQueueMap/${currentUser}`);
  await set(userNode, Date.now());
  userNode.onDisconnect().remove();
  startTimer();
};

window.cancelMatch = async () => {
  const userNode = ref(db, `matchQueueMap/${currentUser}`);
  await set(userNode, null);
  clearTimer();
};

onValue(ref(db, "matchQueueMap"), snap => {
  matchQueue = snap.exists() ? Object.keys(snap.val()) : [];
  updateMatchStatus();
});

async function updateMatchStatus() {
  statusText.innerText = `현재 ${matchQueue.length}/10명 대기 중...`;
  if (matchQueue.length >= 10) {
    clearTimer();
    const players = matchQueue.slice(0, 10);
    const mapList = [
      "영원의 전쟁터", "용의 둥지", "하늘 사원", "브락시스 항전",
      "파멸의 탑", "볼스카야 공장", "저주의 골짜기", "거미 여왕의 무덤"
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

    await set(ref(db, "matchQueueMap"), matchQueue.slice(10).reduce((acc, uid) => { acc[uid] = true; return acc; }, {}));
    await set(ref(db, "currentMatch"), matchData);

    matchSound.play().catch(console.error);

    matchResult.innerHTML = `
      <h3>🎮 매칭 완료!</h3>
      <p><strong>맵:</strong> ${map}</p>
      <p><strong>팀 A:</strong> ${teams.teamA.map((n, i) => i === 0 ? "⭐" + n : n).join(", ")}</p>
      <p><strong>팀 B:</strong> ${teams.teamB.map((n, i) => i === 0 ? "⭐" + n : n).join(", ")}</p>
    `;

    statusText.innerText = "3초 후 결과 입력 화면으로 이동합니다...";
    setTimeout(() => location.href = "result.html", 3000);
  }
}

function startTimer() {
  clearTimer();
  matchElapsed = 0;
  timerText.innerText = `경과 시간: ${matchElapsed}초`;
  timerInterval = setInterval(() => {
    matchElapsed++;
    timerText.innerText = `경과 시간: ${matchElapsed}초`;
  }, 1000);
}

function clearTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerText.innerText = "";
  timerInterval = null;
}

function createBalancedTeams(players) {
  const scored = players.map(n => ({ name: n, score: 1000 }))
                        .sort((a, b) => b.score - a.score);
  const teamA = [], teamB = [];
  let sumA = 0, sumB = 0;
  scored.forEach(p => {
    if (sumA <= sumB) { teamA.push(p.name); sumA += p.score; }
    else              { teamB.push(p.name); sumB += p.score; }
  });
  return { teamA, teamB };
}

// ----- 토너먼트 로직 -----
onValue(ref(db, "tournament"), snap => {
  const data = snap.val() || {};
  tournamentMap.innerText = data.map || "정보 없음";
});

onValue(ref(db, "tournament/participants"), async snap => {
  const parts = snap.exists() ? snap.val() : {};
  const count = Object.keys(parts).length;
  const dataSnap = await get(ref(db, "tournament"));
  const capacity = dataSnap.exists() ? dataSnap.val().capacity : 20;
  queueStatus.innerText = `현재 참가자: ${count}/${capacity}`;
});

function updateTournamentCountdown() {
  const now = new Date();
  const day = now.getDay();
  const toFriday = (5 - day + 7) % 7 || 7;
  const target = new Date(now);
  target.setDate(now.getDate() + toFriday);
  target.setHours(19, 0, 0, 0);

  const diff = target - now;
  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diff % (1000 * 60)) / 1000);
  tournamentTime.innerText = `매주 금요일 19:00까지: ${d}일 ${h}시간 ${m}분 ${s}초`;
}
setInterval(updateTournamentCountdown, 1000);
updateTournamentCountdown();

window.joinTournament = async () => {
  const partsSnap = await get(ref(db, "tournament/participants"));
  const parts = partsSnap.exists() ? partsSnap.val() : {};
  const count = Object.keys(parts).length;
  const dataSnap = await get(ref(db, "tournament"));
  const capacity = dataSnap.exists() ? dataSnap.val().capacity : 20;
  if (parts[currentUser]) return alert("이미 신청됨");
  if (count >= capacity) return alert("정원 초과");
  await update(ref(db, `tournament/participants/${currentUser}`), {
    name: currentUser,
    joinedAt: Date.now(),
  });
  alert("✅ 토너먼트 참가 완료!");
};

window.cancelTournament = async () => {
  await set(ref(db, `tournament/participants/${currentUser}`), null);
  alert("✅ 참가 취소 완료!");
};

onChildAdded(ref(db, "tournament/matches"), snap => {
  const matchData = snap.val();
  if (!matchData) return;
  const teamA = matchData.teamA || [];
  const teamB = matchData.teamB || [];
  if (teamA.includes(currentUser) || teamB.includes(currentUser)) {
    matchSound.play().catch(console.error);
  }
});
