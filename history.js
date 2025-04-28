import { db } from "./firebase.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// 로그인 체크
const currentUser = localStorage.getItem("currentUser");
if (!currentUser) {
  alert("로그인이 필요합니다.");
  location.href = "index.html";
}

// DOM 준비
const tableBody = document.querySelector("table tbody");

async function loadHistory() {
  const snap = await get(ref(db, `history/${currentUser}`));
  if (!snap.exists()) {
    tableBody.innerHTML = `<tr><td class="no-history" colspan="5">전적이 없습니다.</td></tr>`;
    return;
  }

  const data = snap.val();
  const entries = Object.entries(data);

  // 최신순 정렬
  entries.sort((a, b) => b[1].timestamp - a[1].timestamp);

  tableBody.innerHTML = "";

  for (let [matchId, info] of entries) {
    const date = new Date(info.timestamp).toLocaleString();
    const team = info.team;
    const map = info.map || "-";
    const result = info.result;
    const pointChange = info.pointChange;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${date}</td>
      <td>${team}</td>
      <td>${map}</td>
      <td class="${result === 'win' ? 'win' : 'lose'}">${result.toUpperCase()}</td>
      <td>${pointChange > 0 ? '+' + pointChange : pointChange}</td>
    `;
    tableBody.appendChild(tr);
  }
}

loadHistory();