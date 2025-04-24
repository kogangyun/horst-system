// main.js - Firebase 기반 유저 상태 렌더링 및 매칭 시스템
import { db } from "./firebase.js";
import { ref, get, onValue, set, update } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// 🔒 로그인 확인
const currentUser = localStorage.getItem("currentUser");
if (!currentUser) {
  alert("로그인이 필요합니다.");
  location.href = "index.html";
}

// 📌 HTML 요소 참조
const welcomeBox = document.getElementById("welcomeBox");
const seasonInfoDiv = document.getElementById("seasonInfo");
const noticeUl = document.getElementById("noticeList");
const formArea = document.getElementById("noticeFormArea");
const matchStatus = document.getElementById("matchStatus");
const matchTimer = document.getElementById("matchTimer");
const matchResultBox = document.getElementById("matchResultBox");

// 🗓️ 시즌 정보 표시
const savedSeason = localStorage.getItem("seasonText") || "시즌 1 : 2025년 5월 1일 ~ 6월 30일";

// 🧾 공지사항 불러오기
const noticeList = JSON.parse(localStorage.getItem("notices") || "[]");

// 🎮 매칭 관련 상태
let matchQueue = JSON.parse(localStorage.getItem("matchQueue") || "[]");
let matchTime = 0;
let timerInterval = null;

function renderNotices() {
  noticeUl.innerHTML = "";
  noticeList.slice().reverse().forEach((notice) => {
    const li = document.createElement("li");
    li.innerHTML = `<div style="background:#222; padding:10px; border:1px solid gold; border-radius:6px;">📌 ${notice}</div>`;
    noticeUl.appendChild(li);
  });
}
renderNotices();

// ✅ 사용자 정보 불러오기 및 표시
get(ref(db, `users/${currentUser}`)).then((snapshot) => {
  if (!snapshot.exists()) {
    alert("사용자 정보를 찾을 수 없습니다.");
    location.href = "index.html";
    return;
  }

  const userInfo = snapshot.val();
  const displayName = userInfo.clan ? `[${userInfo.clan}] ${currentUser}` : currentUser;
  welcomeBox.innerHTML = `
    <h2>안녕하세요, ${displayName}님!</h2>
    <p>티어: ${userInfo.tier || "없음"} / 점수: ${userInfo.points || 0}</p>
  `;

  if (userInfo.role === "admin") {
    seasonInfoDiv.innerHTML = `
      <textarea id="seasonInput" rows="2">${savedSeason}</textarea><br>
      <button onclick="saveSeason()">저장</button>
    `;
    formArea.innerHTML = `
      <form onsubmit="addNotice(event)">
        <textarea id="noticeInput" placeholder="공지 내용을 입력하세요" rows="4"></textarea><br>
        <button type="submit">등록</button>
      </form>
    `;
  } else {
    seasonInfoDiv.innerHTML = `<p>${savedSeason}</p>`;
  }
});

// 📝 시즌 저장
window.saveSeason = () => {
  const newText = document.getElementById("seasonInput").value.trim();
  if (!newText) return alert("내용을 입력하세요.");
  localStorage.setItem("seasonText", newText);
  alert("시즌 정보가 저장되었습니다.");
  location.reload();
};

// 📝 공지사항 등록
window.addNotice = (event) => {
  event.preventDefault();
  const input = document.getElementById("noticeInput");
  const text = input.value.trim();
  if (!text) return alert("공지 내용을 입력하세요.");
  noticeList.push(text);
  localStorage.setItem("notices", JSON.stringify(noticeList));
  input.value = "";
  renderNotices();
};

// 🔓 로그아웃
window.logout = () => {
  localStorage.removeItem("currentUser");
  alert("로그아웃 되었습니다.");
  location.href = "index.html";
};

// 🎮 매칭
window.joinRealtimeMatch = () => {
  if (!currentUser) return alert("로그인이 필요합니다.");
  if (matchQueue.includes(currentUser)) return alert("이미 대기 중입니다.");

  matchQueue.push(currentUser);
  localStorage.setItem("matchQueue", JSON.stringify(matchQueue));
  updateMatchStatus();
};

function updateMatchStatus() {
  matchStatus.innerText = `현재 ${matchQueue.length}/10명 대기 중...`;

  if (matchQueue.length >= 10) {
    clearInterval(timerInterval);
    timerInterval = null;
    matchTimer.innerText = "";

    const players = matchQueue.slice(0, 10);
    const balanced = createBalancedTeams(players);

    matchQueue = matchQueue.slice(10);
    localStorage.setItem("matchQueue", JSON.stringify(matchQueue));
    showMatchResult(balanced.teamA, balanced.teamB);
  } else {
    if (!timerInterval) startCountUp();
  }
}

function startCountUp() {
  matchTime = 0;
  timerInterval = setInterval(() => {
    matchTime++;
    matchTimer.innerText = `매칭 시작까지 경과 시간: ${matchTime}초`;
    updateMatchStatus();
  }, 1000);
}

function createBalancedTeams(players) {
  const scores = JSON.parse(localStorage.getItem("userScores") || "{}");
  const sorted = players.map(name => ({
    name,
    score: scores[name] || 1000
  })).sort((a, b) => b.score - a.score);

  const teamA = [], teamB = [];
  let scoreA = 0, scoreB = 0;

  for (const p of sorted) {
    if (scoreA <= scoreB) {
      teamA.push(p.name); scoreA += p.score;
    } else {
      teamB.push(p.name); scoreB += p.score;
    }
  }
  return { teamA, teamB };
}

function showMatchResult(teamA, teamB) {
  matchResultBox.innerHTML = `
    <h3>🎮 매칭 완료!</h3>
    <p><strong>팀 A:</strong> ${teamA.join(", ")}</p>
    <p><strong>팀 B:</strong> ${teamB.join(", ")}</p>
  `;
  matchStatus.innerText = "새로운 매칭 대기 가능";
}
