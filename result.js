// import 부분
import { db } from "./firebase.js";
import { ref, get, set, update, push, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// 로그인 체크
const currentUser = localStorage.getItem("currentUser");
if (!currentUser) {
  alert("로그인이 필요합니다.");
  location.href = "index.html";
}

// DOM 요소
const resultForm = document.getElementById("resultForm");
const mapCenter = document.getElementById("mapCenter");
const teamABox = document.getElementById("teamA");
const teamBBox = document.getElementById("teamB");
const submitBtn = document.getElementById("submitResultBtn");
const appealLink = document.getElementById("appealLink");
const matchIdDisplay = document.getElementById("matchIdDisplay");

// 변경 감지 플래그
let isDirty = false;
document.addEventListener("change", (e) => {
  if (e.target.id === "resultA" || e.target.id === "resultB") {
    isDirty = true;
  }
});

window.addEventListener("beforeunload", (e) => {
  if (!isDirty) return;
  e.preventDefault();
  e.returnValue = "";
});

// 유저 점수+랭킹 불러오기
let rankingMap = {};
async function loadRanking() {
  const snap = await get(ref(db, "users"));
  if (!snap.exists()) return;

  const users = Object.entries(snap.val())
    .map(([id, data]) => ({ id, score: data.score || 0 }))
    .sort((a, b) => b.score - a.score);

  users.forEach((user, index) => {
    rankingMap[user.id] = {
      score: user.score,
      rank: index + 1,
    };
  });
}

function getGlowClass(score) {
  if (score >= 3000) return "high-glow";
  if (score >= 2600) return "mid-upper-glow";
  if (score >= 2200) return "middle-glow";
  if (score >= 1800) return "lower-glow";
  if (score >= 1200) return "";
  return "default-glow";
}

function renderNickname(userId, isGlobalTop, isTeamLeader) {
  const info = rankingMap[userId];
  if (!info) return userId;

  const score = info.score > 3400 ? 3400 : info.score;
  const glowClass = getGlowClass(score);

  let stars = "";
  if (isGlobalTop) {
    stars = ` <span style="color: gold;">⭐⭐</span>`;
  } else if (isTeamLeader) {
    stars = ` <span style="color: gold;">⭐</span>`;
  }

  return `<span class="${glowClass}">${userId} (${score})</span>${stars}`;
}
async function fetchClan(userId) {
  const snap = await get(ref(db, `users/${userId}/clan`));
  return snap.exists() ? snap.val() : "미소속";
}

async function saveMatchResult(userId, team, result, map, delta) {
  const matchRef = push(ref(db, `history/${userId}`));
  await set(matchRef, {
    team,
    result,
    map,
    pointChange: delta,
    timestamp: Date.now(),
  });
}

function getTeamTopPlayer(team) {
  const scored = team.map(uid => ({ id: uid, score: rankingMap[uid]?.score || 1000 }));
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.id.localeCompare(b.id);
  });
  return scored[0].id;
}

function getTopRankedLeader(teamAPlayer, teamBPlayer) {
  const scoreA = rankingMap[teamAPlayer]?.score || 1000;
  const scoreB = rankingMap[teamBPlayer]?.score || 1000;
  if (scoreA > scoreB) return teamAPlayer;
  if (scoreB > scoreA) return teamBPlayer;
  return teamAPlayer.localeCompare(teamBPlayer) <= 0 ? teamAPlayer : teamBPlayer;
}

async function loadAndRenderMatch() {
  await loadRanking();

  const snap = await get(ref(db, "currentMatch"));
  if (!snap.exists()) {
    resultForm.innerHTML = "<p>✨ 매칭 정보가 없습니다.</p>";
    return;
  }

  const { id, map, teamA, teamB } = snap.val();

  matchIdDisplay.textContent = `매칭 ID: ${id}`;
  mapCenter.textContent = `맵: ${map}`;

  const getAverageScore = (team) => {
    const scores = team.map(uid => rankingMap[uid]?.score || 1000);
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  };

  const avgA = getAverageScore(teamA);
  const avgB = getAverageScore(teamB);
  const diff = Math.abs(avgA - avgB);
  const bonusEligible = diff > 100;
  const stronger = avgA > avgB ? "A" : avgB > avgA ? "B" : "동일";

  document.getElementById("matchInfo").innerHTML = `
    <p>
      평균 포인트 → 🟥 Team A: <strong>${avgA.toFixed(1)}</strong> |
      🟦 Team B: <strong>${avgB.toFixed(1)}</strong><br>
      ${bonusEligible
        ? `<span style="color: gold;">⚡ ${stronger}팀이 더 강합니다. 반대 팀이 이기면 +40 보너스!</span>`
        : `<span style="color: gray;">보너스 없음 (점수 차이 100 이하)</span>`}
    </p>
  `;

  const teamAPlayer = getTeamTopPlayer(teamA);
  const teamBPlayer = getTeamTopPlayer(teamB);

// 전역 최고 포인트 플레이어 (⭐⭐)
const globalTopPlayer = getTopRankedLeader(teamAPlayer, teamBPlayer);
const globalSubmitter = globalTopPlayer;
const isSubmitter = currentUser === globalSubmitter;

async function makeTeamBox(players, container, teamName, isSubmitter) {
  container.innerHTML = "";
  const ul = document.createElement("ul");

  for (let p of players) {
    const clan = await fetchClan(p);
    const isTeamLeader = (teamName === "A" && p === teamAPlayer) || (teamName === "B" && p === teamBPlayer);
    const isGlobalTop = p === globalTopPlayer;

    const li = document.createElement("li");
    li.innerHTML = `${renderNickname(p, isGlobalTop, isTeamLeader)} [${clan}]`;

    if (isSubmitter && p === currentUser) {
      const sel = document.createElement("select");
      sel.id = teamName === "A" ? "resultA" : "resultB";
      sel.innerHTML = `
        <option value="">-- 선택 --</option>
        <option value="win">Win</option>
        <option value="lose">Lose</option>
      `;
      li.appendChild(sel);
    }    

    ul.appendChild(li);
  }

  container.appendChild(ul);
}

await makeTeamBox(teamA, teamABox, "A", isSubmitter);
await makeTeamBox(teamB, teamBBox, "B", isSubmitter);

if (!isSubmitter) {
  submitBtn.disabled = true;
  submitBtn.textContent = "최고 포인트 유저만 결과 입력 가능";
} else {
  submitBtn.onclick = async () => {
    if (appealLink.dataset.clicked === "true") {
      return alert("이의제기 후에는 결과를 제출할 수 없습니다.");
    }

    const resA = document.getElementById("resultA")?.value;
    const resB = document.getElementById("resultB")?.value;
    if (!resA || !resB) {
      return alert("팀 승패를 모두 선택해주세요.");
    }

    await set(ref(db, `matchResults/${id}`), {
      map,
      teamA,
      resultA: resA,
      teamB,
      resultB: resB,
      timestamp: new Date().toISOString(),
    });

    const updates = {};
    const baseDelta = 100;
    const aWins = resA === "win";
    const bWins = resB === "win";
    const bonusForA = bonusEligible && avgA < avgB && aWins ? 40 : 0;
    const bonusForB = bonusEligible && avgB < avgA && bWins ? 40 : 0;

    for (let u of teamA) {
      const oldSnap = await get(ref(db, `users/${u}/score`));
      const oldScore = oldSnap.exists() ? oldSnap.val() : 1000;
      const change = aWins ? baseDelta + bonusForA : -baseDelta;
      updates[`users/${u}/score`] = oldScore + change;
      updates[`users/${u}/points`] = oldScore + change;
      await saveMatchResult(u, "A", resA, map, change);
    }

    for (let u of teamB) {
      const oldSnap = await get(ref(db, `users/${u}/score`));
      const oldScore = oldSnap.exists() ? oldSnap.val() : 1000;
      const change = bWins ? baseDelta + bonusForB : -baseDelta;
      updates[`users/${u}/score`] = oldScore + change;
      updates[`users/${u}/points`] = oldScore + change;
      await saveMatchResult(u, "B", resB, map, change);
    }

    await update(ref(db), updates);
    await set(ref(db, "currentMatch"), null);

    isDirty = false;
    window.onbeforeunload = null;
    alert("✅ 결과가 저장되었습니다.");
    location.href = "main.html";
  };
}

appealLink.addEventListener("click", () => {
  appealLink.dataset.clicked = "true";
  isDirty = false;
});

onValue(ref(db, `matchResults/${id}`), (snapRes) => {
  if (snapRes.exists()) {
    isDirty = false;
    window.onbeforeunload = null;
    location.href = "main.html";
  }
});
}

loadAndRenderMatch();
