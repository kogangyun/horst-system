// 현재 로그인한 사용자의 ID와 로컬 스토리지에서 저장된 클랜, 유저 정보를 가져옵니다.
const currentUser = localStorage.getItem("currentUser");
const users = JSON.parse(localStorage.getItem("users") || "{}");
const clans = JSON.parse(localStorage.getItem("clanRequests") || "{}");

// DOM 요소를 가져옵니다.
const clanInfo = document.getElementById("clanInfo");
const clanActions = document.getElementById("clanActions");

function renderClanStatus() {
  const user = users[currentUser];
  
  // 클랜에 속하지 않은 사용자 처리
  if (!user || !user.clan) {
    clanInfo.innerHTML = "클랜에 가입되어 있지 않습니다.";
    clanActions.innerHTML = `
      <button onclick="location.href='clan.html'">클랜 생성 / 가입 신청</button>
    `;
    return;
  }

  const clan = clans[user.clan];
  
  // 클랜 정보가 없거나 승인되지 않은 클랜
  if (!clan) {
    clanInfo.innerHTML = "클랜 정보가 유실되었거나 승인되지 않았습니다.";
    return;
  }

  const isLeader = clan.leader === currentUser; // 현재 사용자가 클랜장인지 확인
  const members = clan.members || [];
  const pendingList = clan.pending || [];

  // 클랜 정보 표시
  clanInfo.innerHTML = `
    <strong>클랜명:</strong> ${user.clan}<br>
    <strong>클랜장:</strong> ${clan.leader}<br>
    <strong>클랜원:</strong> ${members.join(", ") || "없음"}
  `;

  // 클랜장일 경우, 관리 기능 표시
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

// 클랜 승인 함수
function approveMember(clanName, username) {
  const clan = clans[clanName];
  if (!clan) return;

  // 승인 대기자 목록에서 삭제하고, 클랜원에 추가
  clan.pending = (clan.pending || []).filter(name => name !== username);
  clan.members = clan.members || [];
  clan.members.push(username);

  // 유저 정보에 클랜 추가
  if (!users[username]) users[username] = {};
  users[username].clan = clanName;

  saveAll();
  alert(`${username}님이 승인되었습니다.`);
  renderClanStatus();
}

// 클랜 거절 함수
function rejectMember(clanName, username) {
  const clan = clans[clanName];
  if (!clan) return;

  // 승인 대기자 목록에서 삭제
  clan.pending = (clan.pending || []).filter(name => name !== username);

  // 유저의 클랜 정보 삭제
  if (users[username]) delete users[username].clan;

  saveAll();
  alert(`${username}님이 거절되었습니다.`);
  renderClanStatus();
}

// 클랜 해체 함수
function disbandClan(clanName) {
  if (!confirm("정말 클랜을 해체하시겠습니까?")) return;

  const clan = clans[clanName];
  if (!clan) return;

  // 클랜의 모든 유저에서 클랜 삭제
  const allUsers = [...(clan.members || []), ...(clan.pending || [])];
  allUsers.forEach(name => {
    if (users[name]) delete users[name].clan;
  });

  // 클랜 정보 삭제
  delete clans[clanName];

  saveAll();
  alert("클랜이 해체되었습니다.");
  location.href = "main.html"; // 메인 페이지로 이동
}

// 클랜 탈퇴 함수
function leaveClan() {
  if (!confirm("클랜을 탈퇴하시겠습니까?")) return;

  const clanName = users[currentUser].clan;
  const clan = clans[clanName];
  if (!clan) return;

  // 클랜원 목록에서 현재 유저 제거
  clan.members = (clan.members || []).filter(name => name !== currentUser);

  // 유저의 클랜 정보 삭제
  delete users[currentUser].clan;

  saveAll();
  alert("클랜을 탈퇴했습니다.");
  location.href = "main.html"; // 메인 페이지로 이동
}

// 클랜장 양도 함수
function transferLeadership(clanName) {
  const newLeader = document.getElementById("transferTo").value;
  if (!newLeader) return alert("양도할 대상을 선택하세요.");

  clans[clanName].leader = newLeader;
  saveAll();
  alert(`클랜장이 ${newLeader}님으로 변경되었습니다.`);
  renderClanStatus();
}

// 로컬 스토리지에 데이터 저장
function saveAll() {
  localStorage.setItem("clanRequests", JSON.stringify(clans));
  localStorage.setItem("users", JSON.stringify(users));
}

// 클랜 상태 렌더링
renderClanStatus();
