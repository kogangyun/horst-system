// ✨ 항상 최상단 import
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

// 공통 헬퍼: 아이디에 점수별 glow와 상위 5★ 적용
function renderUserLabel({ name, score = 0 }, index = -1) {
  const displayScore = Math.min(score, 3400);
  let pointClass;
  if      (displayScore >= 3000) pointClass = "high-glow";
  else if (displayScore >= 2600) pointClass = "mid-upper-glow";
  else if (displayScore >= 2200) pointClass = "middle-glow";
  else if (displayScore >= 1800) pointClass = "lower-glow";
  else if (displayScore >= 1200) pointClass = "";
  else                            pointClass = "default-glow";

  let star = "";
  if (index >= 0 && index < 5) {
    star = `<span style="color:#ffd700">${"★".repeat(5 - index)}</span> `;
  }
  return `<span class="${pointClass}">${star}${name}</span>`;
}

// 회원 목록 렌더링
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

  const totalPages = Math.ceil(users.length / pageSize);
  totalPagesEl.innerText = totalPages;

  const startIndex = (currentPage - 1) * pageSize;
  const paginated = users.slice(startIndex, startIndex + pageSize);

  listEl.innerHTML = "";
  if (paginated.length === 0) {
    listEl.innerHTML = `<li>등록된 유저 없음</li>`;
    pageNumberEl.innerText = currentPage;
    return;
  }

  paginated.forEach(([uid, data], idx) => {
    const globalIndex = startIndex + idx;
    const labelHtml = renderUserLabel({ name: uid, score: data.points || 0 }, globalIndex);

    const li = document.createElement("li");

    // 🛠️ 재승인 버튼 조건 추가
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
      <button onclick="banUser('${uid}')" class="ban-btn">❌ 추방</button>
      ${reapproveBtnHtml}
    `;
    listEl.appendChild(li);
  });

  pageNumberEl.innerText = currentPage;
  document.getElementById("prevPage").disabled = currentPage === 1;
  document.getElementById("nextPage").disabled = currentPage === totalPages;
}

// 페이지 이동
function changePage(direction) {
  const totalPages = parseInt(document.getElementById("totalPages").innerText);
  if (direction === "prev" && currentPage > 1) currentPage--;
  else if (direction === "next" && currentPage < totalPages) currentPage++;
  renderUserList();
}

// 유저 차단 / 해제
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

// 재승인
window.reapproveUser = async (uid) => {
  if (!confirm(`${uid}님을 재승인하시겠습니까?`)) return;
  await update(ref(db, `users/${uid}`), {
    approvedAt: new Date().toISOString()
  });
  alert(`${uid}님이 재승인되었습니다.`);
  renderUserList();
};

// 차단된 유저 목록
async function renderBlockedUsers() {
  const ul = document.getElementById("blockedUsers");
  ul.innerHTML = "";
  const q = query(ref(db, "users"), orderByChild("isBlocked"), equalTo(true));
  const snap = await get(q);
  if (!snap.exists()) return;
  Object.entries(snap.val()).forEach(([uid, data], idx) => {
    const labelHtml = renderUserLabel({ name: uid, score: data.points || 0 }, idx);
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${labelHtml}</span>
      <button onclick="unblockUser('${uid}')" class="ban-btn">차단 해제</button>
    `;
    ul.appendChild(li);
  });
}

// 공지사항 관리
async function renderNotices() {
  const ul = document.getElementById("noticeList");
  ul.innerHTML = "";
  try {
    const snap = await get(ref(db, "notices"));
    if (!snap.exists()) {
      ul.innerHTML = "<li>등록된 공지사항이 없습니다.</li>";
      return;
    }
    const arr = Array.isArray(snap.val()) ? snap.val() : Object.values(snap.val());
    arr.slice().reverse().forEach((text, idx) => {
      const li = document.createElement("li");
      li.textContent = text + " ";
      const btn = document.createElement("button");
      btn.textContent = "삭제";
      btn.onclick = () => deleteNotice(arr.length - 1 - idx);
      li.appendChild(btn);
      ul.appendChild(li);
    });
  } catch (e) {
    console.error("공지 로딩 중 오류:", e);
    ul.innerHTML = "<li>공지사항 로딩 오류</li>";
  }
}
window.deleteNotice = async (index) => {
  const snap = await get(ref(db, "notices"));
  if (!snap.exists()) return;
  const arr = Array.isArray(snap.val()) ? snap.val() : Object.values(snap.val());
  arr.splice(index, 1);
  await set(ref(db, "notices"), arr);
  renderNotices();
};

// 이의제기 관리
async function renderDisputes() {
  const tbody = document.getElementById("disputeList");
  tbody.innerHTML = "";
  const snap = await get(ref(db, "matchDisputes"));
  if (!snap.exists()) return;
  const now = Date.now();
  Object.entries(snap.val()).forEach(([matchId, disp]) => {
    const ts = new Date(disp.timestamp).getTime();
    if (disp.status === "resolved" && now - ts > 24*3600*1000) {
      remove(ref(db, `matchDisputes/${matchId}`));
      return;
    }
    const tr = document.createElement("tr");
    const idHtml = renderUserLabel({ name: matchId }, -1);
    tr.innerHTML = `
      <td>${idHtml}</td>
      <td>${disp.status || "대기 중"}</td>
      <td>${disp.status!=="resolved" 
        ? `<button onclick="resolveDispute('${matchId}')">해결</button>` 
        : "✅"}</td>
    `;
    tbody.appendChild(tr);
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

// 시즌 추가 → 공지사항(notices)에 추가
document.getElementById("seasonForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const val = document.getElementById("seasonInput").value.trim();
  if (!val) return alert("내용을 입력하세요.");

  const snap = await get(ref(db, "notices"));
  const arr = snap.exists() ? (Array.isArray(snap.val()) ? snap.val() : Object.values(snap.val())) : [];

  arr.push(val); // 시즌도 공지사항처럼 누적 추가
  await set(ref(db, "notices"), arr);

  document.getElementById("seasonInput").value = "";
  renderNotices(); // 공지 다시 그리기
});

// 로그아웃
window.logout = () => {
  localStorage.removeItem("currentUser");
  location.href = "index.html";
};

// 모든 초기화 및 이벤트 바인딩
document.addEventListener("DOMContentLoaded", () => {
  window.currentPage = 1;
  window.pageSize = 5;

  renderUserList();
  renderBlockedUsers();
  renderNotices();
  renderDisputes();

  // ✅ 하드리셋 함수 선언
  window.hardResetPoints = async () => {
    if (!confirm("정말 포인트를 1000점으로 초기화할까요?")) return;
    const snap = await get(ref(db, "users"));
    if (!snap.exists()) return;

    const updates = {};
    Object.keys(snap.val()).forEach(uid => {
      updates[`users/${uid}/points`] = 1000;
      updates[`users/${uid}/score`] = 1000;
    });

    await update(ref(db), updates);
    alert("✅ 모든 유저 포인트가 1000점으로 초기화되었습니다.");
    renderUserList();
  };

  // ✅ 버튼에 하드리셋 함수 연결
  const hardResetBtn = document.getElementById("hardResetBtn");
  if (hardResetBtn) {
    hardResetBtn.addEventListener("click", window.hardResetPoints);
  }
}); // 딱 여기 하나만 닫기
