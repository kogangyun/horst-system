// result.js
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

// 변경(change) 이벤트 감지: select 박스(resultA, resultB) 변경 시 dirty 설정
document.addEventListener("change", e => {
  if (e.target.id === "resultA" || e.target.id === "resultB") {
    isDirty = true;
  }
});

// 페이지를 벗어나기 전 경고: dirty 상태일 때만
window.addEventListener("beforeunload", e => {
  if (!isDirty) return;
  e.preventDefault();
  e.returnValue = "";
});

// 글로우 클래스 결정
function getGlowClass(score) {
  if (score >= 1200) return "high-glow";
  if (score >= 1000) return "mid-upper-glow";
  if (score >= 800)  return "middle-glow";
  if (score >= 600)  return "lower-glow";
  return "default-glow";
}

// 클랜명 조회
async function fetchClan(userId) {
  const snap = await get(ref(db, `users/${userId}/clan`));
  return snap.exists() ? snap.val() : "미소속";
}

// 매칭 정보 불러와서 렌더링
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
  const isCaptain = (currentUser === captainA || currentUser === captainB);

  // 팀 박스 생성 함수
  async function makeTeamBox(players, container, fieldId, captain) {
    container.innerHTML = "";
    const ul = document.createElement("ul");
    const scores = players.map(() => 1000);

    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      const clan = await fetchClan(p);
      const li = document.createElement("li");
      li.className = getGlowClass(scores[i]);
      const crown = (i === 0) ? "👑 " : "";
      li.innerHTML = `<span>${crown}${p} [${clan}] (${scores[i]}점)</span>`;

      // 팀장 & 본인만 select 추가
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
    submitBtn.disabled    = true;
    submitBtn.textContent = "팀장만 결과 입력 가능";
  } else {
    submitBtn.onclick = async () => {
      // 이의제기 후엔 제출 불가
      if (appealLink.dataset.clicked === "true") {
        return alert("이의제기 후에는 결과를 제출할 수 없습니다.");
      }
      const resA = document.getElementById("resultA")?.value;
      const resB = document.getElementById("resultB")?.value;
      if (!resA || !resB) {
        return alert("팀장 승패를 모두 선택해주세요.");
      }

      // 1) Firebase에 결과 저장
      await set(ref(db, `matchResults/${id}`), {
        map,
        teamA, resultA: resA,
        teamB, resultB: resB,
        timestamp: new Date().toISOString()
      });

      // 2) 점수 반영 (Win +100, Lose -100)
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

      // 3) 로컬스토리지에 매치 히스토리 저장
      const history = JSON.parse(localStorage.getItem("matchHistory")||"[]");
      history.push({ id, map, teamA, teamB, resultA: resA, resultB: resB, timestamp: Date.now() });
      localStorage.setItem("matchHistory", JSON.stringify(history));

      // 완료 후 경고 해제 후 메인으로 이동
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

  // DB에 결과가 저장되면 자동 이동
  onValue(ref(db, `matchResults/${id}`), snapRes => {
    if (snapRes.exists()) {
      isDirty = false;
      window.onbeforeunload = null;
      location.href = "main.html";
    }
  });
}

loadAndRenderMatch();
