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
  if (e.target.id === "myResult") {
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

  const avgA = teamA.reduce((sum, uid) => sum + (rankingMap[uid]?.score || 1000), 0) / teamA.length;
  const avgB = teamB.reduce((sum, uid) => sum + (rankingMap[uid]?.score || 1000), 0) / teamB.length;
  const diff = Math.abs(avgA - avgB);
  const bonusEligible = diff > 100;

  // ⭐⭐ 별 2개 유저 찾기
  const allPlayers = [...teamA, ...teamB];
  const sortedPlayers = allPlayers
    .map(uid => ({ id: uid, score: rankingMap[uid]?.score || 1000 }))
    .sort((a, b) => b.score !== a.score ? b.score - a.score : a.id.localeCompare(b.id));
  const star2Player = sortedPlayers[0].id;

  // ⭐ 별 1개 유저 찾기 (반대 팀)
  const isStar2InTeamA = teamA.includes(star2Player);
  const oppositeTeam = isStar2InTeamA ? teamB : teamA;
  const sortedOpposite = oppositeTeam
    .map(uid => ({ id: uid, score: rankingMap[uid]?.score || 1000 }))
    .sort((a, b) => b.score !== a.score ? b.score - a.score : a.id.localeCompare(b.id));
  const star1Player = sortedOpposite[0]?.id || "";

  // ⭐⭐ 별 2개 가진 사람만 제출 가능
  const isSubmitter = currentUser === star2Player;

  async function makeTeamBox(players, container, teamName) {
    container.innerHTML = "";
    const ul = document.createElement("ul");

    for (let p of players) {
      const clan = await fetchClan(p);
      const score = rankingMap[p]?.score || 0;
      const isStar2 = p === star2Player;
      const isStar1 = p === star1Player;

      let stars = "";
      if (isStar2) {
        stars = ` <span style="color: gold;">⭐⭐</span>`;
      } else if (isStar1) {
        stars = ` <span style="color: gold;">⭐</span>`;
      }

      const glowClass = getGlowClass(score);
      const li = document.createElement("li");
      li.innerHTML = `<span class="${glowClass}">${p} (${score})</span>${stars} [${clan}]`;

      if (isSubmitter && p === currentUser) {
        const sel = document.createElement("select");
        sel.id = "myResult";
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

  await makeTeamBox(teamA, teamABox, "A");
  await makeTeamBox(teamB, teamBBox, "B");

  if (!isSubmitter) {
    submitBtn.disabled = true;
    submitBtn.textContent = "⭐️⭐️ 받은 최고 점수 유저만 결과 입력 가능";
  } else {
    submitBtn.onclick = async () => {
      if (appealLink.dataset.clicked === "true") {
        return alert("이의제기 후에는 결과를 제출할 수 없습니다.");
      }

      const myResult = document.getElementById("myResult")?.value;
      if (!myResult) {
        return alert("본인 팀 승패를 선택해주세요.");
      }

      const isInTeamA = teamA.includes(currentUser);
      const isInTeamB = teamB.includes(currentUser);

      let resA = "";
      let resB = "";

      if (isInTeamA) {
        resA = myResult;
        resB = myResult === "win" ? "lose" : "win";
      } else if (isInTeamB) {
        resB = myResult;
        resA = myResult === "win" ? "lose" : "win";
      } else {
        return alert("당신은 이 매칭에 참가하지 않았습니다.");
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
