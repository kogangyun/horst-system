// clan.js
import { getDatabase, ref, get, set, update, onValue, remove, child } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { database } from './firebase.js';

const db = database;
const currentUser = localStorage.getItem("currentUser");

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
    star = `<span style=\"color:#ffd700\">${"★".repeat(5 - index)}</span> `;
  }
  return `<span class=\"${pointClass}\">${star}${name}</span>`;
}

// DOM 요소
const mainSection = document.getElementById('mainSection');
const manageSection = document.getElementById('manageSection');
const clanNameInput = document.getElementById('clanNameInput');
const clanMembersList = document.getElementById('clanMembersList');
const nextButton = document.getElementById('nextButton');
const manageMembersList = document.getElementById('manageMembersList');
const pendingList = document.getElementById('pendingList');
const transferTarget = document.getElementById('transferTarget');
const leaderActions = document.getElementById('leaderActions');
const memberActions = document.getElementById('memberActions');

let myClanName = null;

// 클랜 신청
window.applyToClan = async () => {
  const clanName = clanNameInput.value.trim();
  if (!clanName) return alert("클랜 이름을 입력하세요.");

  const userSnap = await get(ref(db, `users/${currentUser}`));
  if (!userSnap.exists()) return alert("사용자 정보를 찾을 수 없습니다.");
  if (userSnap.val().clan) return alert("이미 클랜에 가입되어 있습니다.");

  const pendingRef = ref(db, `pendingClans/${clanName}`);
  const clanRef = ref(db, `clans/${clanName}`);
  const [pendingSnap, clanSnap] = await Promise.all([get(pendingRef), get(clanRef)]);

  if (clanSnap.exists()) {
    const data = clanSnap.val();
    const arr = Array.isArray(data.pending) ? data.pending : [];
    if (arr.includes(currentUser)) return alert("이미 가입 신청하셨습니다.");
    arr.push(currentUser);
    await update(clanRef, { pending: arr });
    alert(`✅ ${clanName} 클랜에 가입 신청 완료!`);
  } else {
    const arr = pendingSnap.exists() && Array.isArray(pendingSnap.val()) ? pendingSnap.val() : [];
    if (arr.includes(currentUser)) return alert("이미 신청하셨습니다.");
    arr.push(currentUser);
    await set(pendingRef, arr);
    if (arr.length >= 5) {
      // 클랜 생성
      await set(clanRef, { leader: arr[0], members: arr, pending: [] });
      for (const u of arr) await update(ref(db, `users/${u}`), { clan: clanName });
      await remove(pendingRef);
      alert(`🎉 클랜 ${clanName} 생성 완료!`);
    } else {
      alert(`✅ 신청 ${arr.length}/5 완료!`);
    }
  }
  clanNameInput.value = '';
  loadMyClan();
};

// 내 클랜 정보 로드
async function loadMyClan() {
  const userSnap = await get(ref(db, `users/${currentUser}`));
  if (!userSnap.exists()) return;
  myClanName = userSnap.val().clan || null;
  renderMemberList();
  toggleNextButton();
}

// 멤버 리스트 렌더링
function renderMemberList() {
  clanMembersList.innerHTML = '';
  if (!myClanName) {
    clanMembersList.innerHTML = '<li>클랜에 속해 있지 않습니다.</li>';
    return;
  }
  onValue(ref(db, `clans/${myClanName}/members`), snap => {
    const list = snap.exists() ? snap.val() : [];
    clanMembersList.innerHTML = '';
    list.forEach((member, idx) => {
      const li = document.createElement('li');
      li.innerHTML = renderUserLabel({ name: member, score: 0 }, idx);
      li.classList.toggle('leader', snap.val().leader === member);
      clanMembersList.appendChild(li);
    });
  });
}

// 다음 버튼 토글
function toggleNextButton() {
  nextButton.classList.toggle('hidden', !myClanName);
}

// 메인/관리 섹션 전환
window.showManageSection = () => {
  mainSection.classList.add('hidden');
  manageSection.classList.remove('hidden');
  loadManageScreen();
};
window.showMainSection = () => {
  manageSection.classList.add('hidden');
  mainSection.classList.remove('hidden');
};

// 관리 화면 로드
async function loadManageScreen() {
  if (!myClanName) return;
  const clanSnap = await get(ref(db, `clans/${myClanName}`));
  if (!clanSnap.exists()) return;
  const clan = clanSnap.val();

  // 멤버 관리
  manageMembersList.innerHTML = '';
  clan.members.forEach((member, idx) => {
    const li = document.createElement('li');
    li.innerHTML = renderUserLabel({ name: member, score: 0 }, idx);
    li.classList.toggle('leader', clan.leader === member);
    manageMembersList.appendChild(li);
  });

  // 권한에 따른 UI
  if (clan.leader === currentUser) {
    leaderActions.classList.remove('hidden');
    memberActions.classList.add('hidden');
    loadPendingList();
    loadTransferList(clan.members);
  } else {
    leaderActions.classList.add('hidden');
    memberActions.classList.remove('hidden');
  }
}

// 가입 대기자 목록
async function loadPendingList() {
  const clanSnap = await get(ref(db, `clans/${myClanName}`));
  const pending = clanSnap.val().pending || [];
  pendingList.innerHTML = '';
  pending.forEach((member, idx) => {
    const li = document.createElement('li');
    li.innerHTML = renderUserLabel({ name: member, score: 0 }, idx) +
      `<button onclick="approveMember('${member}')">승인</button>` +
      `<button onclick="rejectMember('${member}')">거절</button>`;
    pendingList.appendChild(li);
  });
  if (!pending.length) pendingList.innerHTML = '<li>대기자가 없습니다.</li>';
}

window.approveMember = async (member) => {
  const clanRef = ref(db, `clans/${myClanName}`);
  const clanSnap = await get(clanRef);
  const { members, pending } = clanSnap.val();
  await update(clanRef, {
    members: [...members, member],
    pending: pending.filter(m => m !== member)
  });
  await update(ref(db, `users/${member}`), { clan: myClanName });
  loadManageScreen();
};

window.rejectMember = async (member) => {
  const clanRef = ref(db, `clans/${myClanName}`);
  const clanSnap = await get(clanRef);
  const pending = clanSnap.val().pending;
  await update(clanRef, { pending: pending.filter(m => m !== member) });
  loadManageScreen();
};

// 양도 대상 로드
function loadTransferList(members) {
  transferTarget.innerHTML = '';
  members.filter(m => m !== currentUser).forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.innerText = m;
    transferTarget.appendChild(opt);
  });
}

window.transferLeadership = async () => {
  const newLeader = transferTarget.value;
  if (!newLeader) return alert("양도할 대상을 선택하세요.");
  await update(ref(db, `clans/${myClanName}`), { leader: newLeader });
  loadManageScreen();
};

window.disbandClan = async () => {
  if (!confirm("정말 클랜을 해체하시겠습니까?")) return;
  const clanRef = ref(db, `clans/${myClanName}`);
  const clanSnap = await get(clanRef);
  const members = clanSnap.val().members || [];
  for (const m of members) {
    await update(ref(db, `users/${m}`), { clan: null });
  }
  await remove(clanRef);
  location.href = "main.html";
};

window.leaveClan = async () => {
  if (!confirm("정말 클랜을 탈퇴하시겠습니까?")) return;
  const clanRef = ref(db, `clans/${myClanName}`);
  const clanSnap = await get(clanRef);
  const members = clanSnap.val().members.filter(m => m !== currentUser);
  await update(clanRef, { members });
  await update(ref(db, `users/${currentUser}`), { clan: null });
  location.href = "main.html";
};

// 초기 실행
loadMyClan();