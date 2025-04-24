const currentUser = localStorage.getItem("currentUser");
const users = JSON.parse(localStorage.getItem("users") || "{}");
const role = users[currentUser]?.role || "user";
const clans = JSON.parse(localStorage.getItem("clanRequests") || "{}");

const welcomeBox = document.getElementById("welcomeBox");
const clanInfo = document.getElementById("clanInfo");
const clanActions = document.getElementById("clanActions");
const seasonInfoDiv = document.getElementById("seasonInfo");
const noticeList = JSON.parse(localStorage.getItem("notices") || "[]");
const noticeUl = document.getElementById("noticeList");
const formArea = document.getElementById("noticeFormArea");

// 로그인 확인
if (!currentUser || !users[currentUser]) {
  alert("로그인이 필요합니다.");
  location.href = "index.html";
} else {
  const userInfo = users[currentUser];
  const displayName = userInfo.clan ? `[${userInfo.clan}] ${currentUser}` : currentUser;
  welcomeBox.innerHTML = `
    <h2>안녕하세요, ${displayName}님!</h2>
    <p>티어: ${userInfo.tier || "없음"} / 점수: ${userInfo.points || 0}</p>
  `;
}

// 로그아웃
function logout() {
  localStorage.removeItem("currentUser");
  alert("로그아웃 되었습니다.");
  location.href = "index.html";
}

// 시즌 정보
const savedSeason = localStorage.getItem("seasonText") || "시즌 1 : 2025년 5월 1일 ~ 6월 30일";
if (role === "admin") {
  seasonInfoDiv.innerHTML = `
    <textarea id="seasonInput" rows="2">${savedSeason}</textarea><br>
    <button onclick="saveSeason()">저장</button>
  `;
} else {
  seasonInfoDiv.innerHTML = `<p>${savedSeason}</p>`;
}

function saveSeason() {
  const newText = document.getElementById("seasonInput").value.trim();
  if (!newText) return alert("내용을 입력하세요.");
  localStorage.setItem("seasonText", newText);
  alert("시즌 정보가 저장되었습니다.");
  location.reload();
}

// 공지사항
if (role === "admin") {
  formArea.innerHTML = `
    <form onsubmit="addNotice(event)">
      <textarea id="noticeInput" placeholder="공지 내용을 입력하세요" rows="4"></textarea><br>
      <button type="submit">등록</button>
    </form>
  `;
}

function addNotice(event) {
  event.preventDefault();
  const input = document.getElementById("noticeInput");
  const text = input.value.trim();
  if (!text) return alert("공지 내용을 입력하세요.");
  noticeList.push(text);
  localStorage.setItem("notices", JSON.stringify(noticeList));
  input.value = "";
  renderNotices();
}

function renderNotices() {
  noticeUl.innerHTML = "";
  noticeList.slice().reverse().forEach((notice) => {
    const li = document.createElement("li");
    li.innerHTML = `<div style="background:#222; padding:10px; border:1px solid gold; border-radius:6px;">📌 ${notice}</div>`;
    noticeUl.appendChild(li);
  });
}
renderNotices();

// 클랜 정보 렌더링
function renderClanStatus() {
  const user = users[currentUser];
  if (!user || !user.clan) {
    clanInfo.innerHTML = "클랜에 가입되어 있지 않습니다.";
    clanActions.innerHTML = `<button onclick="location.href='clan.html'">클랜 생성 / 가입 신청</button>`;
    return;
  }

  const clan = clans[user.clan];
  if (!clan || !clan.approved) {
    clanInfo.innerHTML = "클랜 정보가 유실되었거나 승인되지 않았습니다.";
    return;
  }

  const isLeader = clan.leader === currentUser;
  const members = clan.members || [];
  const pendingList = clan.pending || [];

  clanInfo.innerHTML = `
    <strong>클랜명:</strong> ${user.clan}<br>
    <strong>클랜장:</strong> ${clan.leader}<br>
    <strong>클랜원:</strong> ${members.join(", ") || "없음"}
  `;

  clanActions.innerHTML = "";

  if (isLeader) {
    clanActions.innerHTML += `
      <h4>승인 대기자 목록</h4>
      ${pendingList.length === 0 ? "<p>없음</p>" : ""}
      <ul>
        ${pendingList.map(name => `
          <li>
            ${name}
            <button onclick="approveMember('${user.clan}', '${name}')">승인</button>
            <button onclick="rejectMember('${user.clan}', '${name}')">거절</button>
          </li>
        `).join("")}
      </ul>
      <h4>👑 클랜장 양도</h4>
      <select id="transferTo">
        ${members.filter(m => m !== currentUser).map(m => `<option value="${m}">${m}</option>`).join("")}
      </select>
      <button onclick="transferLeadership('${user.clan}')">양도</button><br><br>
      <button onclick="disbandClan('${user.clan}')">🧨 클랜 해체</button>
    `;
  } else {
    clanActions.innerHTML = `<button onclick="leaveClan()">클랜 탈퇴</button>`;
  }
}

function approveMember(clanName, username) {
  const clan = clans[clanName];
  if (!clan) return;
  clan.pending = (clan.pending || []).filter(n => n !== username);
  clan.members = clan.members || [];
  clan.members.push(username);
  users[username].clan = clanName;
  saveAll();
  alert(`${username}님이 승인되었습니다.`);
  renderClanStatus();
}

function rejectMember(clanName, username) {
  const clan = clans[clanName];
  if (!clan) return;
  clan.pending = (clan.pending || []).filter(n => n !== username);
  delete users[username].clan;
  saveAll();
  alert(`${username}님이 거절되었습니다.`);
  renderClanStatus();
}

function leaveClan() {
  if (!confirm("클랜을 탈퇴하시겠습니까?")) return;
  const clanName = users[currentUser].clan;
  const clan = clans[clanName];
  if (!clan) return;
  clan.members = (clan.members || []).filter(m => m !== currentUser);
  delete users[currentUser].clan;
  saveAll();
  alert("클랜을 탈퇴했습니다.");
  location.reload();
}

function disbandClan(clanName) {
  if (!confirm("정말 클랜을 해체하시겠습니까?")) return;
  const clan = clans[clanName];
  if (!clan) return;
  const allUsers = [...(clan.members || []), ...(clan.pending || [])];
  allUsers.forEach(name => delete users[name].clan);
  delete clans[clanName];
  saveAll();
  alert("클랜이 해체되었습니다.");
  location.reload();
}

function transferLeadership(clanName) {
  const newLeader = document.getElementById("transferTo").value;
  if (!newLeader) return alert("양도할 대상을 선택하세요.");
  clans[clanName].leader = newLeader;
  saveAll();
  alert(`클랜장이 ${newLeader}님으로 변경되었습니다.`);
  renderClanStatus();
}

function saveAll() {
  localStorage.setItem("clanRequests", JSON.stringify(clans));
  localStorage.setItem("users", JSON.stringify(users));
}

renderClanStatus();


// ✅ 실시간 매칭 시스템 통합
const matchStatus = document.getElementById("matchStatus");
const matchTimer = document.getElementById("matchTimer");
const matchResultBox = document.getElementById("matchResultBox");
const userScores = JSON.parse(localStorage.getItem("userScores") || "{}");
let matchQueue = JSON.parse(localStorage.getItem("matchQueue") || "[]");
let matchTime = 0;
let timerInterval = null;

function joinRealtimeMatch() {
  if (!currentUser) return alert("로그인이 필요합니다.");
  if (matchQueue.includes(currentUser)) return alert("이미 대기 중입니다.");

  matchQueue.push(currentUser);
  localStorage.setItem("matchQueue", JSON.stringify(matchQueue));
  updateMatchStatus();
}

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
  const scored = players.map(name => ({
    name,
    score: userScores[name] || 1000
  })).sort((a, b) => b.score - a.score);

  const teamA = [], teamB = [];
  let scoreA = 0, scoreB = 0;

  for (const p of scored) {
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
