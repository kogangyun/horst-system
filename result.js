// result.js - Firebase 기반 경기 결과 입력 처리
import { db } from "./firebase.js";
import {
  ref,
  get,
  set,
  update,
  onValue,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

const currentUser = localStorage.getItem("currentUser");
const matchData = JSON.parse(localStorage.getItem("currentMatch") || "{}");
const resultBox = document.getElementById("resultForm");

if (!currentUser || !matchData || !matchData.id) {
  alert("잘못된 접근입니다.");
  location.href = "main.html";
}

const matchId = matchData.id;
const allPlayers = [...matchData.teamA, ...matchData.teamB];
const userScores = JSON.parse(localStorage.getItem("userScores") || "{}");
const userData = JSON.parse(localStorage.getItem("users") || "{}");

const matchRef = ref(db, `matchResults/${matchId}`);

// ✅ 입력 여부 저장용
const resultInputs = {};

// 🧩 각 플레이어 승/패 선택 UI 생성
function createPlayerRow(name) {
  const wrapper = document.createElement("div");
  wrapper.className = "player";
  wrapper.style.marginBottom = "12px";

  const clan = userData[name]?.clan ? `[${userData[name].clan}] ` : "";
  const score = userScores[name] || 1000;
  const label = document.createElement("span");
  label.innerText = `${clan}${name} (${score})`;

  const select = document.createElement("select");
  select.innerHTML = `
    <option value="">결과</option>
    <option value="win">승</option>
    <option value="lose">패</option>
  `;

  select.disabled = name !== currentUser;

  // ✅ 이미 입력된 경우: select 값 지정 + 비활성화
  get(ref(db, `matchResults/${matchId}/${name}`)).then(snap => {
    if (snap.exists()) {
      select.value = snap.val();
      select.disabled = true;
    }
  });

  select.onchange = () => {
    const value = select.value;
    if (value) {
      set(ref(db, `matchResults/${matchId}/${currentUser}`), value);
      select.disabled = true;
    }
  };

  wrapper.appendChild(label);
  wrapper.appendChild(select);
  return wrapper;
}

// 🧩 결과 입력 UI 렌더링
function renderMatchUI() {
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.justifyContent = "center";
  container.style.alignItems = "flex-start";
  container.style.gap = "30px";

  const teamACol = document.createElement("div");
  const teamBCol = document.createElement("div");

  teamACol.innerHTML = `<h3 style="color:#7b2ff7;">Team A</h3>`;
  teamBCol.innerHTML = `<h3 style="color:#7b2ff7;">Team B</h3>`;

  matchData.teamA.forEach(name => teamACol.appendChild(createPlayerRow(name)));
  matchData.teamB.forEach(name => teamBCol.appendChild(createPlayerRow(name)));

  const mapDiv = document.createElement("div");
  mapDiv.style.textAlign = "center";
  mapDiv.innerHTML = `
    <h2 style="color: gold;">VS</h2>
    <div style="font-size: 20px; color: gold;">${matchData.map}</div>
  `;

  container.appendChild(teamACol);
  container.appendChild(mapDiv);
  container.appendChild(teamBCol);

  resultBox.appendChild(container);

  const disputeBtn = document.createElement("button");
  disputeBtn.innerText = "⚠ 수동 이의제기";
  disputeBtn.style.backgroundColor = "#ff2f5e";
  disputeBtn.style.color = "white";
  disputeBtn.style.marginTop = "20px";
  disputeBtn.onclick = () => {
    get(ref(db, `matchDisputes/${matchId}`)).then(snap => {
      if (snap.exists()) {
        alert("이미 이의제기된 매치입니다.");
      } else {
        set(ref(db, `matchDisputes/${matchId}`), {
          data: matchData,
          raisedBy: currentUser,
          reason: "manual",
          timestamp: new Date().toISOString()
        });
        alert("📎 수동 이의제기 완료! 메인화면으로 이동합니다.");
        localStorage.setItem("matchingPaused", "true");
        location.href = "main.html";
      }
    });
  };
  resultBox.appendChild(disputeBtn);
}

// ✅ 결과 실시간 감시 + 처리
onValue(matchRef, (snapshot) => {
  const data = snapshot.val();
  if (!data) return;

  const resultValues = Object.values(data);
  if (resultValues.length < 10) return;

  const teamAWins = matchData.teamA.filter(n => data[n] === "win").length;
  const teamBWins = matchData.teamB.filter(n => data[n] === "win").length;

  const isValid =
    (teamAWins === 5 && teamBWins === 0) ||
    (teamAWins === 0 && teamBWins === 5);

  if (!isValid) {
    set(ref(db, `matchDisputes/${matchId}`), {
      data: matchData,
      result: data,
      raisedBy: "system",
      reason: "auto",
      timestamp: new Date().toISOString()
    });
    alert("⚠ 결과가 불일치하여 자동 이의제기 처리되었습니다.");
    localStorage.setItem("matchingPaused", "true");
    location.href = "main.html";
  } else {
    // ✅ 점수 반영
    const updates = {};
    [...matchData.teamA, ...matchData.teamB].forEach(name => {
      const win = data[name] === "win";
      updates[`users/${name}/points`] = (userScores[name] || 1000) + (win ? 100 : -100);
    });
    update(ref(db), updates).then(() => {
      localStorage.removeItem("currentMatch");
      alert("✅ 결과가 반영되었습니다.");
      location.href = "main.html";
    });
  }
});

// 🚀 시작!
renderMatchUI();
