import { db } from "./firebase.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// 로그인 체크
const currentUser = sessionStorage.getItem("currentUser");
if (!currentUser) {
  alert("로그인이 필요합니다.");
  location.href = "index.html";
}

// DOM
const tableBody = document.querySelector("table tbody");

// 페이징 관련 변수
const itemsPerPage = 10;
let currentPage = 1;
let totalPages = 1;
let historyEntries = [];

// 승률 표시용
const winRateElement = document.createElement("p");
document.body.insertBefore(winRateElement, document.querySelector("table"));

// 페이징 네비게이션
const pagination = document.createElement("div");
pagination.style.marginTop = "20px";
pagination.style.fontSize = "1.2rem";
pagination.style.color = "#ccc";
document.body.appendChild(pagination);

async function loadHistory() {
  const snap = await get(ref(db, `history/${currentUser}`));
  if (!snap.exists()) {
    tableBody.innerHTML = `<tr><td class="no-history" colspan="3">전적이 없습니다.</td></tr>`;
    return;
  }

  const data = snap.val();
  historyEntries = Object.entries(data);

  // 최신순 정렬
  historyEntries.sort((a, b) => b[1].timestamp - a[1].timestamp);

  totalPages = Math.ceil(historyEntries.length / itemsPerPage);

  renderPage(currentPage);
  updateWinRate();
  renderPagination();
}

function renderPage(page) {
  tableBody.innerHTML = "";

  const start = (page - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const entriesToShow = historyEntries.slice(start, end);

  for (let [matchId, info] of entriesToShow) {
    const date = new Date(info.timestamp).toLocaleString();
    const team = info.team;
    const result = info.result;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${date}</td>
      <td>${team}</td>
      <td class="${result === "win" ? "win" : "lose"}">${result.toUpperCase()}</td>
    `;
    tableBody.appendChild(tr);
  }
}

function updateWinRate() {
  const totalGames = historyEntries.length;
  const wins = historyEntries.filter(([_, info]) => info.result === "win").length;
  const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : 0;

  winRateElement.innerHTML = `📊 전체 승률: <span style="color:#00ff99">${winRate}%</span> (${wins}승 ${totalGames - wins}패)`;
}

function renderPagination() {
  pagination.innerHTML = "";

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.style.margin = "0 5px";
    btn.style.padding = "5px 10px";
    btn.style.background = i === currentPage ? "#7b2ff7" : "#333";
    btn.style.color = "#00f2ff";
    btn.style.border = "none";
    btn.style.borderRadius = "6px";
    btn.style.cursor = "pointer";
    btn.onclick = () => {
      currentPage = i;
      renderPage(currentPage);
      renderPagination();
    };
    pagination.appendChild(btn);
  }
}

loadHistory();
