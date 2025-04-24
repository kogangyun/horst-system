const currentUser = localStorage.getItem("currentUser");
const users = JSON.parse(localStorage.getItem("users") || "{}");
const clans = JSON.parse(localStorage.getItem("clanRequests") || "{}");

const clanInfo = document.getElementById("clanInfo");
const clanActions = document.getElementById("clanActions");

function renderClanStatus() {
  const user = users[currentUser];
  if (!user || !user.clan) {
    clanInfo.innerHTML = "클랜에 가입되어 있지 않습니다.";
    clanActions.innerHTML = `
      <button onclick="location.href='clan.html'">클랜 생성 / 가입 신청</button>
    `;
    return;
  }

  const clan = clans[user.clan];
  if (!clan) {
    clanInfo.innerHTML = "클랜 정보가 유실되었거나 승인되지 않았습니다.";
    return;
  }

  const isLeader = clan.leader === currentUser;
  const members = clan.members || [];
  const pendingList = clan.pending || [];

  // 클랜 정보 표시
  clanInfo.innerHTML = `
    <strong>클랜명:</strong> ${user.clan}<br>
    <strong>클랜장:</strong> ${clan.leader}<br>
    <strong>클랜원:</strong> ${members.join(", ") || "없음"}
  `;

  clanActions.innerHTML = "";

  if (isLeader) {
    // 클랜장 전용 기능
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
      <button onclick="transferLeadership('${user.clan}')">양도</button>

      <br><br>
      <button onclick="disbandClan('${user.clan}')">🧨 클랜 해체</button>
    `;
  } else {
    // 일반 유저는 탈퇴만 가능
    clanActions.innerHTML = `
      <button onclick="leaveClan()">클랜 탈퇴</button>
    `;
  }
}

function approveMember(clanName, username) {
  const clan = clans[clanName];
  if (!clan) return;

  clan.pending = (clan.pending || []).filter(name => name !== username);
  clan.members = clan.members || [];
  clan.members.push(username);

  if (!users[username]) users[username] = {};
  users[username].clan = clanName;

  saveAll();
  alert(`${username}님이 승인되었습니다.`);
  renderClanStatus();
}

function rejectMember(clanName, username) {
  const clan = clans[clanName];
  if (!clan) return;

  clan.pending = (clan.pending || []).filter(name => name !== username);
  if (users[username]) delete users[username].clan;

  saveAll();
  alert(`${username}님이 거절되었습니다.`);
  renderClanStatus();
}

function disbandClan(clanName) {
  if (!confirm("정말 클랜을 해체하시겠습니까?")) return;

  const clan = clans[clanName];
  if (!clan) return;

  const allUsers = [...(clan.members || []), ...(clan.pending || [])];
  allUsers.forEach(name => {
    if (users[name]) delete users[name].clan;
  });

  delete clans[clanName];

  saveAll();
  alert("클랜이 해체되었습니다.");
  location.href = "main.html";
}

function leaveClan() {
  if (!confirm("클랜을 탈퇴하시겠습니까?")) return;

  const clanName = users[currentUser].clan;
  const clan = clans[clanName];
  if (!clan) return;

  clan.members = (clan.members || []).filter(name => name !== currentUser);
  delete users[currentUser].clan;

  saveAll();
  alert("클랜을 탈퇴했습니다.");
  location.href = "main.html";
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
