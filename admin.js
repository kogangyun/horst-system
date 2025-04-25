import { db } from "./firebase.js";
import {
  ref, get, set, remove, update
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// 🔐 관리자 확인
const currentUser = localStorage.getItem("currentUser");
get(ref(db, `users/${currentUser}`)).then(snap => {
  if (!snap.exists() || snap.val().role !== "admin") {
    alert("관리자만 접근 가능합니다.");
    location.href = "index.html";
  } else {
    renderUserList();
    renderBlockedUsers();
    renderNotices();
    renderDisputes();
  }
});

// ✅ 차단된 유저 목록
function renderBlockedUsers() {
  const ul = document.getElementById("blockedUsers");
  ul.innerHTML = "";

  get(ref(db, "users")).then(snap => {
    if (!snap.exists()) return;
    const users = snap.val();
    Object.entries(users).forEach(([uid, user]) => {
      if (user.isBlocked) {
        const li = document.createElement("li");
        li.innerHTML = ` 
          <span>${uid}</span>
          <button onclick="unblockUser('${uid}')" class="ban-btn" style="background:#0ff; color:#000;">차단 해제</button>
        `;
        ul.appendChild(li);
      }
    });
  });
}

// ✅ 차단 해제
window.unblockUser = async (uid) => {
  await update(ref(db, `users/${uid}`), { isBlocked: false });
  alert(`${uid} 님 차단 해제됨`);
  renderBlockedUsers();
  renderUserList();
};

// ✅ 유저 차단 (삭제 대신 플래그)
window.banUser = async (uid) => {
  if (!confirm(`${uid} 님을 차단하시겠습니까?`)) return;
  await update(ref(db, `users/${uid}`), { isBlocked: true });
  alert(`${uid} 님 차단됨`);
  renderBlockedUsers();
  renderUserList();
};

// ✅ 유저 검색 + 페이징
let currentPage = 1;
const usersPerPage = 10;

window.renderUserList = () => {
  const listEl = document.getElementById("userList");
  const keyword = document.getElementById("searchUser")?.value?.toLowerCase() || "";

  get(ref(db, "users")).then((snap) => {
    if (!snap.exists()) return;
    const users = Object.entries(snap.val())
      .filter(([uid, data]) =>
        uid.toLowerCase().includes(keyword) && !data.isBlocked && uid !== currentUser
      );

    const totalPages = Math.ceil(users.length / usersPerPage);
    currentPage = Math.min(currentPage, totalPages || 1);
    const start = (currentPage - 1) * usersPerPage;
    const pagedUsers = users.slice(start, start + usersPerPage);

    listEl.innerHTML = "";
    pagedUsers.forEach(([uid, data]) => {
      const li = document.createElement("li");
      li.innerHTML = ` 
        <span>${uid} (${data.role || "user"})</span>
        <button onclick="banUser('${uid}')" class="ban-btn">❌ 추방</button>
      `;
      listEl.appendChild(li);
    });

    renderPagination(totalPages);
  });
};

function renderPagination(totalPages) {
  const container = document.getElementById("userList");
  const nav = document.createElement("div");
  nav.style.marginTop = "10px";

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.onclick = () => {
      currentPage = i;
      renderUserList();
    };
    if (i === currentPage) btn.style.fontWeight = "bold";
    nav.appendChild(btn);
  }

  container.appendChild(nav);
}

// ✅ 공지사항 관리
document.getElementById("noticeForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const content = document.getElementById("noticeContent").value.trim();
  if (!content) return alert("공지 내용을 입력하세요.");
  const snap = await get(ref(db, "notices"));
  const notices = snap.exists() ? snap.val() : [];
  notices.push(content);
  await set(ref(db, "notices"), notices);
  document.getElementById("noticeContent").value = "";
  renderNotices();
});

function renderNotices() {
  const ul = document.getElementById("noticeList");
  ul.innerHTML = "";
  get(ref(db, "notices")).then((snap) => {
    if (!snap.exists()) return;
    snap.val().slice().reverse().forEach((text, i) => {
      const li = document.createElement("li");
      li.innerHTML = `${text} <button onclick="deleteNotice(${i})">삭제</button>`;
      ul.appendChild(li);
    });
  });
}

window.deleteNotice = async (index) => {
  const snap = await get(ref(db, "notices"));
  if (!snap.exists()) return;
  const list = snap.val();
  list.splice(index, 1);
  await set(ref(db, "notices"), list);
  renderNotices();
};

// ✅ 이의제기 관리 + 24시간 지나면 자동 삭제
function renderDisputes() {
  const tbody = document.getElementById("disputeList");
  tbody.innerHTML = "";

  get(ref(db, "matchDisputes")).then((snap) => {
    if (!snap.exists()) return;
    const all = snap.val();
    const now = Date.now();

    Object.entries(all).forEach(([matchId, dispute]) => {
      const ts = new Date(dispute.timestamp).getTime();
      const resolved = dispute.status === "resolved";

      if (resolved && now - ts > 24 * 60 * 60 * 1000) {
        remove(ref(db, `matchDisputes/${matchId}`));
        return;
      }

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${matchId}</td>
        <td>${dispute.status || "대기 중"}</td>
        <td>
          ${dispute.status !== "resolved"
            ? `<button onclick="resolveDispute('${matchId}')">해결</button>`
            : "✅"}
        </td>
      `;
      tbody.appendChild(tr);
    });
  });
}

window.resolveDispute = async (matchId) => {
  await update(ref(db, `matchDisputes/${matchId}`), {
    status: "resolved",
    timestamp: new Date().toISOString()
  });
  alert("이의제기 해결됨");
  renderDisputes();
};

// ✅ 시즌 저장
window.saveSeason = () => {
  const val = document.getElementById("seasonInput").value.trim();
  if (!val) return alert("내용을 입력하세요.");
  localStorage.setItem("seasonText", val);
  alert("시즌 정보 저장됨");
};

// ✅ 로그아웃
window.logout = () => {
  localStorage.removeItem("currentUser");
  location.href = "index.html";
};
