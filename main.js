import { db } from "./firebase.js";
import {
  ref,
  get,
  set,
  onValue,
  child,
  update,
  onChildAdded,
  remove,
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
// ----- 매칭 대기 로직 -----
let matchQueue = [];
let matchElapsed = 0;
let timerInterval;

async function joinMatch() {
  const userNode = ref(db, `matchQueueMap/${currentUser}`);
  userNode.onDisconnect().remove();
  await set(userNode, Date.now());
  startTimer();
}

window.cancelMatch = async function() {
  const userNode = ref(db, `matchQueueMap/${currentUser}`);
  await remove(userNode);
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

    const remainder = matchQueue.slice(10);
    const updates = {};
    remainder.forEach(uid => {
      updates[uid] = Date.now();
    });
    await set(ref(db, "matchQueueMap"), updates);
    remainder.forEach(uid => {
      ref(db, `matchQueueMap/${uid}`).onDisconnect().remove();
    });

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
    if (sumA <= sumB) {
      teamA.push(p.name);
      sumA += p.score;
    } else {
      teamB.push(p.name);
      sumB += p.score;
    }
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
  queueStatus.innerText = `현재 참가자: ${count}명`;
});

window.joinTournament = async function() {
  try {
    const now = new Date();
    const day = now.getDay();    // 요일 (0=일, 5=금)
    const hour = now.getHours(); // 시
    const minute = now.getMinutes(); // 분

    if (!(day === 5 && (hour > 18 || (hour === 18 && minute >= 30)))) {
      alert("⏰ 토너먼트 참가 신청은 매주 금요일 18:30 이후에만 가능합니다.");
      return;
    }

    const partsSnap = await get(ref(db, "tournament/participants"));
    const parts = partsSnap.exists() ? partsSnap.val() : {};
    if (parts[currentUser]) {
      alert("이미 신청됨");
      return;
    }

    const partNode = ref(db, `tournament/participants/${currentUser}`);
    partNode.onDisconnect().remove(); // ✅ 먼저 등록
    await set(partNode, {
      name: currentUser,
      joinedAt: Date.now(),
    });

    alert("✅ 토너먼트 참가 완료!");
  } catch (e) {
    console.error("토너먼트 참가 중 오류:", e);
    alert("❌ 참가 실패. 다시 시도해주세요.");
  }
};

window.cancelTournament = async function() {
  await remove(ref(db, `tournament/participants/${currentUser}`));
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

// ----- 토너먼트 매칭 생성 함수 -----
async function runTournamentMatchMaking() {
  const partsSnap = await get(ref(db, "tournament/participants"));
  if (!partsSnap.exists()) {
    console.log("❌ 참가자가 없습니다.");
    return;
  }

  const participants = Object.keys(partsSnap.val());

  if (participants.length < 20) {
    console.log("❌ 참가자가 20명 미만입니다.");
    return;
  }

  const scores = {};
  for (const uid of participants) {
    let total = 1000;
    try {
      const historySnap = await get(ref(db, `history/${uid}`));
      if (historySnap.exists()) {
        const history = Object.values(historySnap.val());
        for (const record of history) {
          total += record.pointChange || 0;
        }
      }
    } catch (e) {
      console.error(`Error loading history for ${uid}`, e);
    }
    scores[uid] = total;
  }

  const shuffled = shuffleArray(participants);
  const selected = shuffled.slice(0, 20).map(uid => ({ uid, score: scores[uid] }));

  const teamA = [], teamB = [];
  let sumA = 0, sumB = 0;
  selected.forEach(p => {
    if (sumA <= sumB) {
      teamA.push(p.uid);
      sumA += p.score;
    } else {
      teamB.push(p.uid);
      sumB += p.score;
    }
  });

  const matchData = {
    id: `tournament-${Date.now()}`,
    teamA,
    teamB,
    createdAt: new Date().toISOString()
  };

  await set(ref(db, `tournament/matches/${matchData.id}`), matchData);
  matchSound.play().catch(console.error);
  console.log("✅ Tournament match created:", matchData);
}

// ----- 배열 섞기 함수 -----
function shuffleArray(array) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ----- 카운트다운 및 금요일 19:00 체크 -----
function updateTournamentCountdown() {
  const now = new Date();
  const day = now.getDay();
  const toFriday = (5 - day + 7) % 7 || 7;
  const target = new Date(now);
  target.setDate(now.getDate() + toFriday);
  target.setHours(19, 0, 0, 0);

  const diff = target - now;

  if (diff <= 0 && diff > -1000) {
    runTournamentMatchMaking().catch(console.error);
  }

  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diff % (1000 * 60)) / 1000);
  tournamentTime.innerText = `매주 금요일 19:00까지: ${d}일 ${h}시간 ${m}분 ${s}초`;
}

// ====== 버튼에서 쓸 수 있게 전역 등록 ======
window.joinMatch = joinMatch;
window.cancelMatch = cancelMatch;
window.joinTournament = joinTournament;
window.cancelTournament = cancelTournament;

// ✅ DOMContentLoaded 이후에 버튼 이벤트 연결
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('joinMatchButton').addEventListener('click', window.joinMatch);
  document.getElementById('cancelMatchButton').addEventListener('click', window.cancelMatch);
});

setInterval(updateTournamentCountdown, 1000);
updateTournamentCountdown();