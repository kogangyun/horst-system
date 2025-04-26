import { db } from "./firebase.js";
import { ref, get, set, update, onValue, push } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// 로그인 체크
const currentUser = localStorage.getItem("currentUser");
if (!currentUser) {
  alert("로그인이 필요합니다.");
  location.href = "index.html";
}

// 매치 결과 저장 함수
async function saveMatchResult(userId, team, result) {
  const matchRef = push(ref(db, `history/${userId}`));
  await set(matchRef, {
    team: team,
    result: result,
    timestamp: Date.now()
  });
}

// 변경 감지 플래그
let isDirty = false;

// DOM 요소
const resultForm    = document.getElementById("resultForm");
const mapCenter     = document.getElementById("mapCenter");
const teamABox      = document.getElementById("teamA");
const teamBBox      = document.getElementById("teamB");
const submitBtn     = document.getElementById("submitResultBtn");
const appealLink    = document.getElementById("appealLink");
const matchIdDisplay = document.getElementById("matchIdDisplay");

// 변경(change) 이벤트 감지
document.addEventListener("change", e => {
  if (e.target.id === "resultA" || e.target.id === "resultB") {
    isDirty = true;
  }
});

// 페이지를 벗어나기 전 경고
window.addEventListener("beforeunload", e => {
  if (!isDirty) return;
  e.preventDefault();
  e.returnValue = "";
});

// 전체 유저 점수+랭킹 미리 불러오기
let rankingMap = {}; // { userId: { score, rank } }

async function loadRanking() {
  const snap = await get(ref(db, "users"));
  if (!snap.exists()) return;

  const users = Object.entries(snap.val())
    .map(([id, data]) => ({
      id,
      score: data.score || 0
    }))
    .sort((a, b) => b.score - a.score);

  users.forEach((user, index) => {
    rankingMap[user.id] = {
      score: user.score,
      rank: index + 1
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

function renderNickname(userId) {
  const info = rankingMap[userId];
  if (!info) return userId;

  const score = info.score > 3400 ? 3400 : info.score;
  const rank = info.rank;
  const glowClass = getGlowClass(score);

  let stars = "";
  if (rank <= 5) {
    stars = `<span style="color: #ffd700;">${"★".repeat(6 - rank)}</span>`;
  }

  return `<span class="${glowClass}">${userId} (${score}) ${stars}</span>`;
}

async function fetchClan(userId) {
  const snap = await get(ref(db, `users/${userId}/clan`));
  return snap.exists() ? snap.val() : "미소속";
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

  const captainA = teamA[0];
  const captainB = teamB[0];
  const isCaptain = (currentUser === captainA || currentUser === captainB);

  async function makeTeamBox(players, container, fieldId, captain) {
    container.innerHTML = "";
    const ul = document.createElement("ul");

    for (let p of players) {
      const clan = await fetchClan(p);
      const li = document.createElement("li");
      li.innerHTML = `${renderNickname(p)} [${clan}]`;

      if (p === captain && isCaptain) {
        const sel = document.createElement("select");
        sel.id = fieldId;
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

  await makeTeamBox(teamA, teamABox, "resultA", captainA);
  await makeTeamBox(teamB, teamBBox, "resultB", captainB);

  if (!isCaptain) {
    submitBtn.disabled = true;
    submitBtn.textContent = "팀장만 결과 입력 가능";
  } else {
    submitBtn.onclick = async () => {
      if (appealLink.dataset.clicked === "true") {
        return alert("이의제기 후에는 결과를 제출할 수 없습니다.");
      }
      const resA = document.getElementById("resultA")?.value;
      const resB = document.getElementById("resultB")?.value;
      if (!resA || !resB) {
        return alert("팀장 승패를 모두 선택해주세요.");
      }

      await set(ref(db, `matchResults/${id}`), {
        map,
        teamA, resultA: resA,
        teamB, resultB: resB,
        timestamp: new Date().toISOString()
      });

      const delta = 100;
      const updates = {};
      for (let u of teamA) {
        const oldSnap = await get(ref(db, `users/${u}/score`));
        const oldScore = oldSnap.exists() ? oldSnap.val() : 1000;
        updates[`users/${u}/score`] = oldScore + (resA === "win" ? delta : -delta);

        await saveMatchResult(u, "A", resA);
      }
      for (let u of teamB) {
        const oldSnap = await get(ref(db, `users/${u}/score`));
        const oldScore = oldSnap.exists() ? oldSnap.val() : 1000;
        updates[`users/${u}/score`] = oldScore + (resB === "win" ? delta : -delta);

        await saveMatchResult(u, "B", resB);
      }
      await update(ref(db), updates);

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

  onValue(ref(db, `matchResults/${id}`), snapRes => {
    if (snapRes.exists()) {
      isDirty = false;
      window.onbeforeunload = null;
      location.href = "main.html";
    }
  });
}

loadAndRenderMatch();