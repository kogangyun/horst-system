import { db } from "./firebase.js";
import { ref, get, set, update, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// 로그인 체크
const currentUser = sessionStorage.getItem("currentUser");
if (!currentUser) {
  alert("로그인이 필요합니다.");
  location.href = "index.html";
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
const matchIdDisplay = document.getElementById("matchIdDisplay");  // 매칭 ID 표시 요소 추가

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

// 점수에 따른 글로우 클래스
function getGlowClass(score) {
  if (score >= 3000) return "high-glow";
  if (score >= 2600) return "mid-upper-glow";
  if (score >= 2200) return "middle-glow";
  if (score >= 1800) return "lower-glow";
  if (score >= 1200) return ""; // 기본 파랑
  return "default-glow";
}

// 닉네임 렌더링 (점수+별 뒤에)
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

// 클랜명 조회
async function fetchClan(userId) {
  const snap = await get(ref(db, `users/${userId}/clan`));
  return snap.exists() ? snap.val() : "미소속";
}

// 매칭 불러오기 및 렌더링
async function loadAndRenderMatch() {
  await loadRanking(); // 랭킹 먼저 불러오기

  const snap = await get(ref(db, "currentMatch"));
  if (!snap.exists()) {
    resultForm.innerHTML = "<p>✨ 매칭 정보가 없습니다.</p>";
    return;
  }
  const { id, map, teamA, teamB } = snap.val();

  // 매칭 ID 표시
  matchIdDisplay.textContent = `매칭 ID: ${id}`;  // 매칭 ID 화면에 표시

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

  // 팀 A / B 렌더
  await makeTeamBox(teamA, teamABox, "resultA", captainA);
  await makeTeamBox(teamB, teamBBox, "resultB", captainB);

  // 제출 버튼 제어
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

      // 1) 결과 저장
      await set(ref(db, `matchResults/${id}`), {
        map,
        teamA, resultA: resA,
        teamB, resultB: resB,
        timestamp: new Date().toISOString()
      });

      // 2) 점수 반영
      const delta = 100;
      const updates = {};
      for (let u of teamA) {
        const oldSnap = await get(ref(db, `users/${u}/score`));
        const oldScore = oldSnap.exists() ? oldSnap.val() : 1000;
        updates[`users/${u}/score`] = oldScore + (resA === "win" ? delta : -delta);
      }
      for (let u of teamB) {
        const oldSnap = await get(ref(db, `users/${u}/score`));
        const oldScore = oldSnap.exists() ? oldSnap.val() : 1000;
        updates[`users/${u}/score`] = oldScore + (resB === "win" ? delta : -delta);
      }
      await update(ref(db), updates);

      // 3) 로컬 히스토리 기록
      const history = JSON.parse(localStorage.getItem("matchHistory") || "[]");
      history.push({ id, map, teamA, teamB, resultA: resA, resultB: resB, timestamp: Date.now() });
      localStorage.setItem("matchHistory", JSON.stringify(history));

      // 완료 후 이동
      isDirty = false;
      window.onbeforeunload = null;
      alert("✅ 결과가 저장되었습니다.");
      location.href = "main.html";
    };
  }

  // 이의제기 클릭 시 dirty 해제
  appealLink.addEventListener("click", () => {
    appealLink.dataset.clicked = "true";
    isDirty = false;
  });

  // DB에 결과가 생기면 자동 이동
  onValue(ref(db, `matchResults/${id}`), snapRes => {
    if (snapRes.exists()) {
      isDirty = false;
      window.onbeforeunload = null;
      location.href = "main.html";
    }
  });
}

loadAndRenderMatch();
