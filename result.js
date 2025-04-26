// result.js
import { db } from "./firebase.js";
import { ref, get, set, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// 1) 로그인 체크 → sessionStorage 사용
const currentUser = sessionStorage.getItem("currentUser");
if (!currentUser) {
  alert("로그인이 필요합니다.");
  location.href = "index.html";
}

// 2) 페이지 벗어나는 걸 막기
window.addEventListener("beforeunload", e => {
  e.preventDefault();
  e.returnValue = "";
});

// 3) DOM 요소들
const resultForm    = document.getElementById("resultForm");
const submitBtn     = document.getElementById("submitResultBtn");
const appealText    = document.getElementById("appealText");
const appealBtn     = document.getElementById("appealBtn");
if (!resultForm) {
  console.error("⚠️ #resultForm 요소를 찾을 수 없습니다.");
}

// 4) 점수별 네온 글로우 클래스 함수
function getGlowClass(score) {
  if (score >= 1200)     return "high-glow";
  if (score >= 1000)     return "mid-upper-glow";
  if (score >= 800)      return "middle-glow";
  if (score >= 600)      return "lower-glow";
  return "default-glow";
}

// 5) 매칭 정보를 불러와서 화면 렌더링
async function loadAndRenderMatch() {
  const snap = await get(ref(db, "currentMatch"));
  if (!snap.exists()) {
    resultForm.innerHTML = "<p>✨ 매칭 정보가 없습니다.</p>";
    return;
  }
  const { id, map, teamA, teamB } = snap.val();

  // 팀장 결정
  const captainA = teamA[0];
  const captainB = teamB[0];
  const isCaptain = (currentUser === captainA) || (currentUser === captainB);

  // 5-1) 맵 중앙 표시
  const mapDiv = document.createElement("div");
  mapDiv.className = "map-center";
  mapDiv.textContent = `맵: ${map}`;
  resultForm.appendChild(mapDiv);

  // 5-2) 팀 박스 생성 함수
  function makeTeamBox(titleText, players, fieldId, captain) {
    const box = document.createElement("div");
    box.className = "team";

    const title = document.createElement("h3");
    title.textContent = titleText;
    box.appendChild(title);

    const ul = document.createElement("ul");
    const scores = players.map(() => 1000);

    players.forEach((p, i) => {
      const li = document.createElement("li");
      li.className = getGlowClass(scores[i]);
      li.innerHTML = `<span>${p} (${scores[i]}점)</span>`;

      // 팀장만 select 생성
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
    });

    box.appendChild(ul);
    return box;
  }

  // 5-3) 매칭 박스 렌더링
  const matchBox = document.createElement("div");
  matchBox.className = "match-box";
  matchBox.appendChild(makeTeamBox("팀 A", teamA, "resultA", captainA));
  matchBox.appendChild(makeTeamBox("팀 B", teamB, "resultB", captainB));
  resultForm.appendChild(matchBox);

  // 6) 결과 제출 버튼 설정
  if (!isCaptain) {
    submitBtn.disabled = true;
    submitBtn.textContent = "팀장만 결과 입력 가능";
  } else {
    submitBtn.onclick = async () => {
      const resA = document.getElementById("resultA").value;
      const resB = document.getElementById("resultB").value;
      if (!resA || !resB) {
        return alert("팀장 승패를 모두 선택해주세요.");
      }
      // 저장
      await set(ref(db, `matchResults/${id}`), {
        map,
        teamA, resultA: resA,
        teamB, resultB: resB,
        timestamp: new Date().toISOString()
      });
      alert("✅ 결과가 저장되었습니다.");

      // unload 훅 해제 후 메인으로 이동
      window.onbeforeunload = null;
      location.href = "main.html";
    };
  }

  // 7) 이의제기: 누구나 사용 가능
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

  // 8) 모든 매칭 참가자에게도 결과 입력 후 리다이렉트
  onValue(ref(db, `matchResults/${id}`), snapRes => {
    if (snapRes.exists()) {
      window.onbeforeunload = null;
      location.href = "main.html";
    }
  });
}

loadAndRenderMatch();
