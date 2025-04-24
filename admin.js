// 관리자 권한 확인
const currentUser = localStorage.getItem("currentUser");
const users = JSON.parse(localStorage.getItem("users") || "{}");
const user = users[currentUser];
if (!user || user.role !== "admin") {
  alert("관리자만 접근 가능합니다.");
  location.href = "index.html";
}

// 클랜 신청 관리
const clanRequests = JSON.parse(localStorage.getItem("clanRequests") || "{}");
const pendingClans = document.getElementById("pendingClans");

function renderPendingClans() {
  pendingClans.innerHTML = '';
  Object.entries(clanRequests).forEach(([clanName, data]) => {
    const applicants = data.applicants || [data.requester];
    const highlight = applicants.length >= 5 ? "<strong>(신청자 많음)</strong>" : "";
    const li = document.createElement("li");
    li.innerHTML = `${clanName} - 신청자 수: ${applicants.length} ${highlight} <button onclick="approveClan('${clanName}')">승인</button>`;
    pendingClans.appendChild(li);
  });
}

function approveClan(clanName) {
  const applicants = clanRequests[clanName].applicants || [clanRequests[clanName].requester];
  applicants.forEach(userId => {
    if (users[userId] && !users[userId].clan) {
      users[userId].clan = clanName;
    }
  });
  delete clanRequests[clanName];
  localStorage.setItem("users", JSON.stringify(users));
  localStorage.setItem("clanRequests", JSON.stringify(clanRequests));
  alert(`클랜 \"${clanName}\" 승인 완료`);
  renderPendingClans();
}

renderPendingClans();

// 공지사항 관리
const notices = JSON.parse(localStorage.getItem("notices") || "[]");
const noticeList = document.getElementById("noticeList");
const noticeForm = document.getElementById("noticeForm");

noticeForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const content = document.getElementById("noticeContent").value.trim();
  if (!content) return alert("공지 내용을 입력하세요.");
  notices.push(content);
  localStorage.setItem("notices", JSON.stringify(notices));
  renderNotices();
  document.getElementById("noticeContent").value = "";
});

function renderNotices() {
  noticeList.innerHTML = '';
  [...notices].reverse().forEach((notice, index) => {
    const li = document.createElement("li");
    li.innerHTML = `${notice} <button onclick="deleteNotice(${index})">삭제</button>`;
    noticeList.appendChild(li);
  });
}

function deleteNotice(index) {
  notices.splice(index, 1);
  localStorage.setItem("notices", JSON.stringify(notices));
  renderNotices();
}

renderNotices();

// 이의 제기 관리
const disputes = JSON.parse(localStorage.getItem("disputes") || "[]");
const disputeList = document.getElementById("disputeList");

function renderDisputes() {
  disputeList.innerHTML = '';
  [...disputes].reverse().forEach((dispute, i) => {
    const actualIndex = disputes.length - 1 - i;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${dispute.matchId}</td>
      <td>${dispute.status}</td>
      <td><button onclick="resolveDispute(${actualIndex})">해결</button></td>
    `;
    disputeList.appendChild(tr);
  });
}

function resolveDispute(index) {
  disputes[index].status = 'resolved';
  localStorage.setItem("disputes", JSON.stringify(disputes));
  const stillPending = disputes.some(d => d.status !== "resolved");
  if (!stillPending) {
    localStorage.setItem("matchingPaused", "false");
    alert("📗 모든 이의제기가 해결되어 매칭이 다시 재개됩니다.");
  }
  renderDisputes();
}

renderDisputes();

// 문제 유저 차단
const blockedUsers = JSON.parse(localStorage.getItem("blockedUsers") || "[]");
const blockedUserList = document.getElementById("blockedUsers");

function blockUser() {
  const username = document.getElementById("blockUser").value.trim();
  if (!username) return alert("아이디를 입력하세요.");
  if (blockedUsers.includes(username)) return alert("이미 차단된 유저입니다.");

  blockedUsers.push(username);
  localStorage.setItem("blockedUsers", JSON.stringify(blockedUsers));

  // 사용자 객체에도 반영
  if (users[username]) {
    users[username].blocked = true;
    localStorage.setItem("users", JSON.stringify(users));
  }

  renderBlockedUsers();
  document.getElementById("blockUser").value = "";
}

function renderBlockedUsers() {
  blockedUserList.innerHTML = '';
  blockedUsers.forEach(user => {
    const li = document.createElement("li");
    li.textContent = user;
    blockedUserList.appendChild(li);
  });
}

renderBlockedUsers();
