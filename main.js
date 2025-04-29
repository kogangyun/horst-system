import { db } from "./firebase.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
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

const matchSound = document.getElementById("matchSound");
const statusText = document.getElementById("statusText");
const timerText = document.getElementById("timer");
const matchResult = document.getElementById("matchResult");
const tournamentMap = document.getElementById("tournamentMap");
const tournamentTime = document.getElementById("tournamentTime");
const queueStatus = document.getElementById("queueStatus");
const participantList = document.getElementById("participantList");
const usagePeriodEl = document.getElementById("usagePeriod");

const auth = getAuth();
const currentUser = localStorage.getItem("currentUser");
if (!currentUser) {
  alert("로그인이 필요합니다.");
  location.href = "index.html";
}

async function loadUsagePeriod() {
  try {
    const snap = await get(ref(db, `users/${currentUser}/joinedAt`));
    if (!snap.exists()) {
      usagePeriodEl.innerText = "가입일 정보 없음";
      return;
    }
    const joinedAt = new Date(snap.val()).getTime();
    const EXPIRATION_MS = 30 * 24 * 60 * 60 * 1000;

    async function updateRemaining() {
      const now = Date.now();
      const diff = joinedAt + EXPIRATION_MS - now;
      if (diff <= 0) {
        usagePeriodEl.innerText = "이용 기간 만료";
        clearInterval(intervalId);
        alert("이용 기간이 만료되었습니다. 오픈카톡에 문의 주세요.");
        await signOut(auth);
        location.href = "index.html";
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
  const userNode = ref(db, `matchQueue/${currentUser}`);
  await set(userNode, { name: currentUser, joinedAt: Date.now() });
  userNode.onDisconnect().remove();
  startTimer(); // ✅ 여기 반드시 있어야 타이머 시작합니다
}

async function cancelMatch() {
  const userNode = ref(db, `matchQueue/${currentUser}`);
  await remove(userNode);
  clearTimer(); // ✅ 매칭 취소하면 타이머도 정지
}

onValue(ref(db, "matchQueue"), (snapshot) => {
  if (!snapshot.exists()) {
    matchQueue = [];
  } else {
    matchQueue = Object.keys(snapshot.val());
  }
  updateMatchStatus();

  // ✅ 추가
  if (matchQueue.includes(currentUser) && !timerInterval) {
    startTimer();
  }
});

async function updateMatchStatus() {
  console.log("✅ 현재 대기열 인원:", matchQueue.length);
  statusText.innerText = `현재 ${matchQueue.length}/10명 대기 중...`;

  if (matchQueue.length >= 10) {
    clearTimer();
    const players = matchQueue.slice(0, 10);
    const mapList = [
      "영원의 전쟁터", "용의 둥지", "하늘 사원", "브락시스 항전",
      "파멸의 탑", "볼스카야 공장", "저주의 골짜기", "거미 여왕의 무덤"
    ];
    const map = mapList[Math.floor(Math.random() * mapList.length)];
    const teams = await createBalancedTeams(players);

    const matchData = {
      id: `match-${Date.now()}`,
      teamA: teams.teamA,
      teamB: teams.teamB,
      map,
      timestamp: new Date().toISOString()
    };

    try {
      await set(ref(db, "matchQueue"), {});
      await set(ref(db, "currentMatch"), matchData);

      if (matchSound) {
        await matchSound.play().catch(e => console.error("🎵 사운드 재생 실패:", e));
      }

      matchResult.innerHTML = `
        <h3>🎮 매칭 완료!</h3>
        <p><strong>맵:</strong> ${map}</p>
        <p><strong>팀 A:</strong> ${teams.teamA.map((n, i) => i === 0 ? "⭐" + n : n).join(", ")}</p>
        <p><strong>팀 B:</strong> ${teams.teamB.map((n, i) => i === 0 ? "⭐" + n : n).join(", ")}</p>
      `;
      statusText.innerText = "3초 후 결과 입력 화면으로 이동합니다...";
    } catch (error) {
      console.error("❌ 매칭 저장 중 오류:", error);
      matchResult.innerHTML = `<h3>⚠️ 매칭 실패</h3><p>오류가 발생했습니다. 3초 후 결과 화면으로 이동합니다.</p>`;
      statusText.innerText = "⚠️ 오류 발생, 결과화면으로 이동합니다.";
    } finally {
      setTimeout(() => {
        location.href = "result.html";
      }, 3000);
    }
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

async function createBalancedTeams(players) {
  const scored = [];
  for (const name of players) {
    try {
      const historySnap = await get(ref(db, `history/${name}`));
      let totalScore = 1000;
      if (historySnap.exists()) {
        const history = Object.values(historySnap.val());
        for (const record of history) {
          totalScore += record.pointChange || 0;
        }
      }
      scored.push({ name, score: totalScore });
    } catch (e) {
      console.error(`❌ ${name} 점수 불러오기 실패`, e);
      scored.push({ name, score: 1000 });
    }
  }

  scored.sort((a, b) => b.score - a.score);

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
    const day = now.getDay();
    const hour = now.getHours();
    const minute = now.getMinutes();

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
    partNode.onDisconnect().remove();
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

// 브라우저 창/탭 닫을 때 매칭큐 강제 제거
window.addEventListener('beforeunload', async (e) => {
  try {
    const userNode = ref(db, `matchQueue/${currentUser}`);
    await remove(userNode);
  } catch (error) {
    console.error("창 닫을 때 매칭 큐 제거 실패:", error);
  }
});


window.joinMatch = joinMatch;
window.cancelMatch = cancelMatch;
window.joinTournament = joinTournament;
window.cancelTournament = cancelTournament;
setInterval(updateTournamentCountdown, 1000);
updateTournamentCountdown();
