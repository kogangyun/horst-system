import { db } from "./firebase.js";
import {
  ref,
  get,
  set,
  remove,
  update,
  query,
  orderByChild,
  equalTo,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// 🔐 관리자 확인
const currentUser = localStorage.getItem("currentUser");
get(ref(db, `users/${currentUser}`)).then((snap) => {
  if (!snap.exists() || snap.val().role !== "admin") {
    alert("관리자만 접근 가능합니다.");
    location.href = "index.html";
  } else {
    renderUserList();
    renderBlockedUsers();
    renderPendingUsers();
    renderNotices();
    renderDisputes();
  }
});

// ✅ 차단된 유저 목록
function renderBlockedUsers() {
  const ul = document.getElementById("blockedUsers");
  ul.innerHTML = "";

  const blockedUsersQuery = query(ref(db, "users"), orderByChild("isBlocked"), equalTo(true));
  get(blockedUsersQuery).then((snap) => {
    if (!snap.exists()) return;
    const users = snap.val();
    Object.entries(users).forEach(([uid]) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span>${uid}</span>
        <button onclick="unblockUser('${uid}')" class="ban-btn">차단 해제</button>
      `;
      ul.appendChild(li);
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

// ✅ 유저 차단
window.banUser = async (uid) => {
  if (!confirm(`${uid} 님을 차단하시겠습니까?`)) return;
  await update(ref(db, `users/${uid}`), { isBlocked: true });
  alert(`${uid} 님 차단됨`);
  renderBlockedUsers();
  renderUserList();
};

// ✅ 회원 목록 (승인된 유저만)
window.renderUserList = () => {
  const listEl = document.getElementById("userList");
  const keyword = document.getElementById("searchUser")?.value?.toLowerCase() || "";

  get(ref(db, "users")).then((snap) => {
    if (!snap.exists()) return;
    const users = Object.entries(snap.val())
      .filter(([uid, data]) =>
        data.status === "approved" &&
        uid.toLowerCase().includes(keyword)
      );

    listEl.innerHTML = "";
    if (users.length === 0) {
      listEl.innerHTML = "<li>등록된 유저 없음</li>";
      return;
    }

    users.forEach(([uid, data]) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span>${uid} (${data.role || "user"})</span>
        <button onclick="banUser('${uid}')" class="ban-btn">❌ 추방</button>
      `;
      listEl.appendChild(li);
    });
  });
};

// ✅ 가입 대기자 목록
function renderPendingUsers() {
  const ul = document.getElementById("pendingUsers");
  ul.innerHTML = "";

  get(ref(db, "users")).then((snap) => {
    if (!snap.exists()) return;
    const users = snap.val();
    Object.entries(users).forEach(([uid, user]) => {
      if (user.status === "pending") {
        const li = document.createElement("li");
        li.innerHTML = `
          <span>${uid} (${user.status})</span>
          <button onclick="approveUser('${uid}')">승인</button>
          <button onclick="rejectUser('${uid}')">거절</button>
        `;
        ul.appendChild(li);
      }
    });
  });
}

// ✅ 가입 승인
window.approveUser = async (uid) => {
  await update(ref(db, `users/${uid}`), { status: "approved" });
  alert(`${uid}님이 승인되었습니다.`);
  renderPendingUsers();
  renderUserList();
};

// ✅ 가입 거절
window.rejectUser = async (uid) => {
  await update(ref(db, `users/${uid}`), { status: "rejected" });
  alert(`${uid}님이 거절되었습니다.`);
  renderPendingUsers();
};

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

// ✅ 이의제기 관리
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
    timestamp: new Date().toISOString(),
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
