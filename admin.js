// ✨ 최상단 import
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
  child,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// -----------------------------

window.currentPage = 1;
window.pageSize = 5;

function renderUserLabel({ name, score = 0 }, index = -1) {
  const displayScore = Math.min(score, 3400);
  let pointClass = "";
  if (displayScore >= 3000) pointClass = "high-glow";
  else if (displayScore >= 2600) pointClass = "mid-upper-glow";
  else if (displayScore >= 2200) pointClass = "middle-glow";
  else if (displayScore >= 1800) pointClass = "lower-glow";
  else pointClass = "default-glow";

  let star = "";
  if (index >= 0 && index < 5) {
    star = `<span style="color:#ffd700">${"★".repeat(5 - index)}</span> `;
  }
  return `<span class="${pointClass}">${star}${name}</span>`;
}

async function renderUserList() {
  const keyword = document.getElementById("searchUser")?.value?.toLowerCase() || "";
  const listEl = document.getElementById("userList");
  const pageNumberEl = document.getElementById("pageNumber");
  const totalPagesEl = document.getElementById("totalPages");

  const snap = await get(child(ref(db), "users"));
  if (!snap.exists()) return;

  const users = Object.entries(snap.val()).filter(
    ([uid, data]) => data.status === "approved" && uid.toLowerCase().includes(keyword)
  );

  const totalPages = Math.ceil(users.length / window.pageSize);
  totalPagesEl.innerText = totalPages;

  const startIndex = (window.currentPage - 1) * window.pageSize;
  const paginated = users.slice(startIndex, startIndex + window.pageSize);

  listEl.innerHTML = "";
  if (paginated.length === 0) {
    listEl.innerHTML = `<li>등록된 유저 없음</li>`;
    pageNumberEl.innerText = window.currentPage;
    return;
  }

  paginated.forEach(([uid, data], idx) => {
    const globalIndex = startIndex + idx;
    const labelHtml = renderUserLabel({ name: uid, score: data.points || 0 }, globalIndex);
    const li = document.createElement("li");

    let reapproveBtnHtml = "";
    if (data.approvedAt) {
      const approvedTime = new Date(data.approvedAt).getTime();
      const now = Date.now();
      const daysSinceApproval = (now - approvedTime) / (1000 * 60 * 60 * 24);
      if (daysSinceApproval > 30) {
        reapproveBtnHtml = `<button onclick="reapproveUser('${uid}')" class="ban-btn" style="background: limegreen;">🔄 재승인</button>`;
      }
    }

    li.innerHTML = `
      <span>${labelHtml} (${data.role || "user"})</span>
      <button onclick="banUser('${uid}')" class="ban-btn">❌ 추발</button>
      ${reapproveBtnHtml}
    `;
    listEl.appendChild(li);
  });

  pageNumberEl.innerText = window.currentPage;
  document.getElementById("prevPage").disabled = window.currentPage === 1;
  document.getElementById("nextPage").disabled = window.currentPage === totalPages;
}
function changePage(direction) {
  const totalPages = parseInt(document.getElementById("totalPages").innerText);
  if (direction === "prev" && window.currentPage > 1) window.currentPage--;
  else if (direction === "next" && window.currentPage < totalPages) window.currentPage++;
  renderUserList();
}
window.changePage = changePage;

window.banUser = async (uid) => {
  if (!confirm(`${uid} 님을 차단하시겠습니까?`)) return;
  await update(ref(db, `users/${uid}`), { isBlocked: true });
  alert(`${uid} 님 차단됨`);
  renderBlockedUsers();
  renderUserList();
};

window.unblockUser = async (uid) => {
  await update(ref(db, `users/${uid}`), { isBlocked: false });
  alert(`${uid} 님 차단 해제됨`);
  renderBlockedUsers();
  renderUserList();
};

window.reapproveUser = async (uid) => {
  if (!confirm(`${uid}님을 재승인하시겠습니까?`)) return;
  await update(ref(db, `users/${uid}`), { approvedAt: new Date().toISOString() });
  alert(`${uid}님 재승인 완료`);
  renderUserList();
};

async function renderBlockedUsers() {
  const ul = document.getElementById("blockedUsers");
  ul.innerHTML = "";
  const q = query(ref(db, "users"), orderByChild("isBlocked"), equalTo(true));
  const snap = await get(q);
  if (!snap.exists()) return;
  Object.entries(snap.val()).forEach(([uid, data]) => {
    const labelHtml = renderUserLabel({ name: uid, score: data.points || 0 });
    const li = document.createElement("li");

    let reapproveBtnHtml = "";
    if (data.approvedAt) {
      const approvedTime = new Date(data.approvedAt).getTime();
      const now = Date.now();
      const daysSinceApproval = (now - approvedTime) / (1000 * 60 * 60 * 24);
      if (daysSinceApproval > 30) {
        reapproveBtnHtml = `<button onclick="reapproveUser('${uid}')" class="ban-btn" style="background: limegreen;">🔄 재승인</button>`;
      }
    }

    li.innerHTML = `
      <span>${labelHtml}</span>
      <button onclick="unblockUser('${uid}')" class="ban-btn">차단 해제</button>
      ${reapproveBtnHtml}
    `;
    ul.appendChild(li);
  });
}

async function renderNotices() {
  const seasonUl = document.getElementById("seasonList");
  const noticeUl = document.getElementById("noticeList");
  seasonUl.innerHTML = "";
  noticeUl.innerHTML = "";
  try {
    const snap = await get(ref(db, "notices"));
    if (!snap.exists()) {
      noticeUl.innerHTML = "<li>등록된 공지사항 없음</li>";
      return;
    }
    const arr = Array.isArray(snap.val()) ? snap.val() : Object.values(snap.val());
    if (arr.length === 0) {
      noticeUl.innerHTML = "<li>등록된 공지사항 없음</li>";
      return;
    }

    const seasonLi = document.createElement("li");
    seasonLi.textContent = arr[0];
    seasonUl.appendChild(seasonLi);

    for (let i = 1; i < arr.length; i++) {
      const li = document.createElement("li");
      li.textContent = arr[i] + " ";
      const btn = document.createElement("button");
      btn.textContent = "삭제";
      btn.onclick = () => deleteNotice(i);
      li.appendChild(btn);
      noticeUl.appendChild(li);
    }
  } catch (e) {
    console.error(e);
    noticeUl.innerHTML = "<li>공지사항 로딩 오류</li>";
  }
}
window.deleteNotice = async (index) => {
  const snap = await get(ref(db, "notices"));
  if (!snap.exists()) return;
  const arr = Array.isArray(snap.val()) ? snap.val() : Object.values(snap.val());
  if (index === 0) {
    alert("⛔ 시즌 정보는 삭제 불가능");
    return;
  }
  arr.splice(index, 1);
  await set(ref(db, "notices"), arr);
  renderNotices();
};

async function renderDisputes() {
  const tbody = document.getElementById("disputeList");
  tbody.innerHTML = "";
  const snap = await get(ref(db, "matchDisputes"));
  if (!snap.exists()) return;
  const now = Date.now();
  Object.entries(snap.val()).forEach(([matchId, disp]) => {
    const ts = new Date(disp.timestamp).getTime();
    if (disp.status === "resolved" && now - ts > 24 * 3600 * 1000) {
      remove(ref(db, `matchDisputes/${matchId}`));
      return;
    }
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${matchId}</td>
      <td>${disp.status || "대기 중"}</td>
      <td>${disp.status !== "resolved"
        ? `<button onclick="resolveDispute('${matchId}')">해결</button>`
        : "✅"}</td>
    `;
    tbody.appendChild(tr);
  });
}

window.resolveDispute = async (matchId) => {
  await update(ref(db, `matchDisputes/${matchId}`), {
    status: "resolved",
    timestamp: new Date().toISOString(),
  });
  alert("이의제기 해결 완료");
  renderDisputes();
};

// 시즌 추가
document.getElementById("seasonForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const val = document.getElementById("seasonInput").value.trim();
  if (!val) return alert("내용을 입력해주세요.");

  await set(ref(db, "notices"), [val]);
  document.getElementById("seasonInput").value = "";
  renderNotices();
});

// 공지 추가
document.getElementById("noticeForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const val = document.getElementById("noticeContent").value.trim();
  if (!val) return alert("내용을 입력해주세요.");

  const snap = await get(ref(db, "notices"));
  const arr = snap.exists() ? (Array.isArray(snap.val()) ? snap.val() : Object.values(snap.val())) : [];
  arr.push(val);
  await set(ref(db, "notices"), arr);

  document.getElementById("noticeContent").value = "";
  renderNotices();
});

window.logout = () => {
  localStorage.removeItem("currentUser");
  location.href = "index.html";
};

window.hardResetPoints = async () => {
  if (!confirm("정말 모든 유저 포인트를 초기화하시겠습니까?")) return;

  const snap = await get(ref(db, "users"));
  if (!snap.exists()) return;

  const updates = {};
  Object.keys(snap.val()).forEach((uid) => {
    updates[`users/${uid}/points`] = 1000;
    updates[`users/${uid}/score`] = 1000;
  });

  await update(ref(db), updates);
  alert("✅ 포인트 초기화 완료");
  renderUserList();
};

document.getElementById("hardResetBtn")?.addEventListener("click", window.hardResetPoints);

document.addEventListener("DOMContentLoaded", () => {
  renderUserList();
  renderBlockedUsers();
  renderNotices();
  renderDisputes();
});
