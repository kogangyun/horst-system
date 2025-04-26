// result.js
import { db } from "./firebase.js";
import { ref, get, set, update, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// 로그인 체크
const currentUser = sessionStorage.getItem("currentUser");
if (!currentUser) {
  alert("로그인이 필요합니다.");
  location.href = "index.html";
}

// 페이지 벗어남 방지
window.addEventListener("beforeunload", e => {
  e.preventDefault();
  e.returnValue = "";
});

// DOM 요소
const resultForm    = document.getElementById("resultForm");
const mapCenter     = document.getElementById("mapCenter");
const teamABox      = document.getElementById("teamA");
const teamBBox      = document.getElementById("teamB");
const submitBtn     = document.getElementById("submitResultBtn");
const appealLink    = document.getElementById("appealLink");

// 글로우 클래스 결정
function getGlowClass(score) {
  if (score >= 1200)     return "high-glow";
  if (score >= 1000)     return "mid-upper-glow";
  if (score >= 800)      return "middle-glow";
  if (score >= 600)      return "lower-glow";
  return "default-glow";
}

// 클랜명 조회
async function fetchClan(userId) {
  const snap = await get(ref(db, `users/${userId}/clan`));
  return snap.exists() ? snap.val() : "미소속";
}

// 매칭 정보 렌더링
async function loadAndRenderMatch() {
  const snap = await get(ref(db, "currentMatch"));
  if (!snap.exists()) {
    resultForm.innerHTML = "<p>✨ 매칭 정보가 없습니다.</p>";
    return;
  }
  const { id, map, teamA, teamB } = snap.val();
  mapCenter.textContent = `맵: ${map}`;

  // 팀장 판별
  const captainA = teamA[0];
  const captainB = teamB[0];
  const isCaptain = (currentUser === captainA) || (currentUser === captainB);

  // 팀 박스 생성
  async function makeTeamBox(players, container, fieldId, captain) {
    container.innerHTML = "";
    const ul = document.createElement("ul");
    const scores = players.map(() => 1000);

    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      const clan = await fetchClan(p);
      const li = document.createElement("li");
      li.className = getGlowClass(scores[i]);
      // 왕관 아이콘 및 클랜명 표시
      const crown = (i === 0) ? "👑 " : "";
      li.innerHTML = `<span>${crown}${p} [${clan}] (${scores[i]}점)</span>`;

      // 팀장 & 본인일 때만 select
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

  // 제출 버튼 활성/비활성
  if (!isCaptain) {
    submitBtn.disabled    = true;
    submitBtn.textContent = "팀장만 결과 입력 가능";
  } else {
    submitBtn.onclick = async () => {
      // 이의제기 후에는 제출 불가
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

      // 2) 점수 반영 (Win +100, Lose -100)
      const delta = 100;
      const updates = {};
      // A팀
      for (let u of teamA) {
        const oldSnap = await get(ref(db, `users/${u}/score`));
        const oldScore = oldSnap.exists() ? oldSnap.val() : 1000;
        updates[`users/${u}/score`] = oldScore + (resA === "win" ? delta : -delta);
      }
      // B팀
      for (let u of teamB) {
        const oldSnap = await get(ref(db, `users/${u}/score`));
        const oldScore = oldSnap.exists() ? oldSnap.val() : 1000;
        updates[`users/${u}/score`] = oldScore + (resB === "win" ? delta : -delta);
      }
      await update(ref(db), updates);

      // 3) 로컬스토리지 매치 히스토리 저장
      const history = JSON.parse(localStorage.getItem("matchHistory")||"[]");
      history.push({ id, map, teamA, teamB, resultA: resA, resultB: resB, timestamp: Date.now() });
      localStorage.setItem("matchHistory", JSON.stringify(history));

      alert("✅ 결과가 저장되었습니다.");
      window.onbeforeunload = null;
      location.href = "main.html";
    };
  }

  // 이의제기 링크 클릭 시 플래그 설정
  appealLink.addEventListener("click", () => {
    appealLink.dataset.clicked = "true";
  });

  // 저장 완료 시 자동 리다이렉트
  onValue(ref(db, `matchResults/${id}`), snapRes => {
    if (snapRes.exists()) {
      window.onbeforeunload = null;
      location.href = "main.html";
    }
  });
}

loadAndRenderMatch();
