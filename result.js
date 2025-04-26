// result.js
import { db } from "./firebase.js";
import { ref, get, set, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// 1) 로그인 체크 → sessionStorage 사용
const currentUser = sessionStorage.getItem("currentUser");
if (!currentUser) {
  alert("로그인이 필요합니다.");
  location.href = "index.html";
}

// 2) DOM 요소들
const resultForm = document.getElementById("resultForm");
if (!resultForm) {
  console.error("⚠️ #resultForm 요소를 찾을 수 없습니다.");
}

// 3) 점수별 네온 글로우 클래스 함수
function getGlowClass(score) {
  if (score >= 1200)     return "high-glow";
  if (score >= 1000)     return "mid-upper-glow";
  if (score >= 800)      return "middle-glow";
  if (score >= 600)      return "lower-glow";
  return "default-glow";
}

// 4) 매칭 정보를 불러와서 화면 렌더링
async function loadAndRenderMatch() {
  try {
    const snap = await get(ref(db, "currentMatch"));
    if (!snap.exists()) {
      resultForm.innerHTML = "<p>✨ 매칭 정보가 없습니다.</p>";
      return;
    }
    const match = snap.val();
    const { id, map, teamA, teamB } = match;

    // 맵 중앙 표시
    const mapDiv = document.createElement("div");
    mapDiv.className = "map-center";
    mapDiv.textContent = `맵: ${map}`;
    resultForm.appendChild(mapDiv);

    // 팀 박스 생성
    function makeTeamBox(name, players, field) {
      const box = document.createElement("div");
      box.className = "team";

      const title = document.createElement("h3");
      title.textContent = name;
      box.appendChild(title);

      const ul = document.createElement("ul");
      // (현재 점수는 모두 1000점으로 고정; 실제 점수 데이터가 있으면 대체)
      const scores = players.map(() => 1000);
      // 팀장(최고 점수)를 players[0]로 가정
      const captain = players[0];

      players.forEach((p, i) => {
        const li = document.createElement("li");
        li.className = getGlowClass(scores[i]);
        li.innerHTML = `<span>${p} (${scores[i]}점)</span>`;
        if (p === captain) {
          const sel = document.createElement("select");
          sel.id = field;
          sel.innerHTML = `
            <option value="">-- 결과 선택 --</option>
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

    // 매칭 박스 컨테이너
    const matchBox = document.createElement("div");
    matchBox.className = "match-box";
    matchBox.appendChild(makeTeamBox("팀 A", teamA, "resultA"));
    matchBox.appendChild(makeTeamBox("팀 B", teamB, "resultB"));
    resultForm.appendChild(matchBox);

    // 제출 버튼
    const btn = document.createElement("button");
    btn.textContent = "결과 제출";
    btn.onclick = async () => {
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
    resultForm.appendChild(btn);

  } catch (err) {
    console.error("❌ 매칭 정보를 불러오는 중 오류:", err);
    resultForm.innerHTML = "<p>매칭 정보를 가져오는 중 오류가 발생했습니다.</p>";
  }
}

// 실행
loadAndRenderMatch();
