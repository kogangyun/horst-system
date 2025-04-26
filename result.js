// result.js
import { db } from "./firebase.js";
import { ref, get, set, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// 로그인 체크
const currentUser = sessionStorage.getItem("currentUser");
if (!currentUser) {
  alert("로그인이 필요합니다.");
  location.href = "index.html";
}

// 요소 참조
const resultForm       = document.getElementById("resultForm");
const teamAContainer   = document.getElementById("teamA");
const teamBContainer   = document.getElementById("teamB");
const mapCenter        = document.getElementById("mapCenter");
const submitBtn        = document.getElementById("submitResultBtn");
const appealText       = document.getElementById("appealText");
const appealBtn        = document.getElementById("appealBtn");

// 점수별 네온 글로우 클래스
function getGlowClass(score) {
  if (score >= 1200)     return "high-glow";
  if (score >= 1000)     return "mid-upper-glow";
  if (score >= 800)      return "middle-glow";
  if (score >= 600)      return "lower-glow";
  return "default-glow";
}

// 매칭 정보 불러와서 렌더링
async function loadMatch() {
  const snap = await get(ref(db, "currentMatch"));
  if (!snap.exists()) {
    resultForm.innerHTML = "<p>✨ 매칭 정보가 없습니다.</p>";
    return;
  }
  const { id, map, teamA, teamB } = snap.val();

  mapCenter.textContent = `맵: ${map}`;

  // 팀박스 렌더링 함수
  function renderTeam(container, players, fieldId) {
    container.innerHTML = "";
    const scores = players.map(() => 1000); // 임시 점수
    const captain = players[0];
    const ul = document.createElement("ul");
    players.forEach((p, idx) => {
      const li = document.createElement("li");
      li.className = getGlowClass(scores[idx]);
      li.innerHTML = `<span>${p} (${scores[idx]}점)</span>`;
      // 팀장에게만 select 추가
      if (p === captain) {
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
    });
    container.appendChild(ul);
  }

  renderTeam(teamAContainer, teamA, "resultA");
  renderTeam(teamBContainer, teamB, "resultB");

  // 제출 버튼 핸들러
  submitBtn.onclick = async () => {
    const resA = document.getElementById("resultA").value;
    const resB = document.getElementById("resultB").value;
    if (!resA || !resB) {
      return alert("팀장 승패를 모두 선택해주세요.");
    }
    await set(ref(db, `matchResults/${id}`), {
      map,
      teamA, resultA: resA,
      teamB, resultB: resB,
      timestamp: new Date().toISOString()
    });
    alert("✅ 결과가 저장되었습니다.");
    location.href = "main.html";
  };

  // 이의제기 버튼 핸들러 (누구나)
  appealBtn.onclick = async () => {
    const text = appealText.value.trim();
    if (!text) return alert("이의제기 내용을 입력해주세요.");
    await set(ref(db, `matchAppeals/${id}/${currentUser}`), {
      user: currentUser,
      content: text,
      timestamp: new Date().toISOString()
    });
    alert("✔️ 이의제기가 접수되었습니다.");
    appealText.value = "";
  };
}

loadMatch();
