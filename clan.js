// clan.js
import { getDatabase, ref, get, set, update, onValue, remove } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { database } from './firebase.js';

const db = database;
const currentUser = localStorage.getItem("currentUser");

// 섹션 DOM
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
let isLeader = false;

// ✅ 클랜 신청
window.applyToClan = async () => {
  const clanName = clanNameInput.value.trim();
  if (!clanName) return alert("클랜 이름을 입력하세요.");

  const userRef = ref(db, `users/${currentUser}`);
  const userSnap = await get(userRef);

  if (!userSnap.exists()) {
    alert("사용자 정보를 찾을 수 없습니다.");
    return;
  }
  if (userSnap.val().clan) {
    alert("이미 클랜에 가입되어 있습니다.");
    return;
  }

  const pendingRef = ref(db, `pendingClans/${clanName}`);
  const clanRef = ref(db, `clans/${clanName}`);

  const [pendingSnap, clanSnap] = await Promise.all([
    get(pendingRef),
    get(clanRef)
  ]);

  if (clanSnap.exists()) {
    alert("이미 생성된 클랜입니다.");
    return;
  }

  let applicants = pendingSnap.exists() ? pendingSnap.val() : [];
  if (!Array.isArray(applicants)) applicants = [];

  if (applicants.includes(currentUser)) {
    alert("이미 이 클랜에 신청하셨습니다.");
    return;
  }

  applicants.push(currentUser);
  await set(pendingRef, applicants);

  if (applicants.length >= 5) {
    // 5명 모이면 클랜 생성
    await set(clanRef, {
      leader: applicants[0],
      members: applicants
    });
    for (const member of applicants) {
      await update(ref(db, `users/${member}`), { clan: clanName });
    }
    await remove(pendingRef);
    alert(`🎉 클랜 ${clanName} 생성 완료!`);
  } else {
    alert(`✅ ${applicants.length}/5명 신청 완료!`);
  }

  clanNameInput.value = "";
};

// ✅ 내 클랜 불러오기
async function loadMyClan() {
  const userSnap = await get(ref(db, `users/${currentUser}`));
  if (!userSnap.exists()) {
    clanMembersList.innerHTML = "<li>사용자 정보를 찾을 수 없습니다.</li>";
    return;
  }

  myClanName = userSnap.val().clan || null;
  if (!myClanName) {
    clanMembersList.innerHTML = "<li>아직 클랜에 가입되어 있지 않습니다.</li>";
    return;
  }

  const clanRef = ref(db, `clans/${myClanName}`);
  onValue(clanRef, (snap) => {
    if (!snap.exists()) {
      clanMembersList.innerHTML = "<li>클랜 정보를 불러올 수 없습니다.</li>";
      return;
    }

    const clan = snap.val();
    const members = clan.members || [];
    clanMembersList.innerHTML = "";

    members.forEach(member => {
      const li = document.createElement('li');
      li.innerText = member;
      if (member === clan.leader) li.classList.add('leader');
      clanMembersList.appendChild(li);
    });

    isLeader = (clan.leader === currentUser);

    if (members.length >= 5) {
      nextButton.classList.remove('hidden');
    } else {
      nextButton.classList.add('hidden');
    }
  });
}

// ✅ 클랜 관리 화면으로 전환
window.showManageSection = () => {
  mainSection.classList.add('hidden');
  manageSection.classList.remove('hidden');
  loadManageScreen();
};

// ✅ 메인 화면으로 복귀
window.showMainSection = () => {
  manageSection.classList.add('hidden');
  mainSection.classList.remove('hidden');
};

// ✅ 관리 화면 데이터 불러오기
async function loadManageScreen() {
  if (!myClanName) return;

  const clanSnap = await get(ref(db, `clans/${myClanName}`));
  if (!clanSnap.exists()) return;

  const clan = clanSnap.val();
  const members = clan.members || [];

  manageMembersList.innerHTML = "";
  members.forEach(member => {
    const li = document.createElement('li');
    li.innerText = member;
    if (member === clan.leader) li.classList.add('leader');
    manageMembersList.appendChild(li);
  });

  if (clan.leader === currentUser) {
    leaderActions.classList.remove('hidden');
    memberActions.classList.add('hidden');
    loadPendingList();
    loadTransferList(members);
  } else {
    leaderActions.classList.add('hidden');
    memberActions.classList.remove('hidden');
  }
}

// ✅ 대기자 리스트 불러오기
async function loadPendingList() {
  const pendingSnap = await get(ref(db, `pendingClans/${myClanName}`));
  pendingList.innerHTML = "";

  if (!pendingSnap.exists()) {
    pendingList.innerHTML = "<li>대기자가 없습니다.</li>";
    return;
  }

  const applicants = pendingSnap.val();
  applicants.forEach(name => {
    const li = document.createElement('li');
    li.innerHTML = `${name} 
      <button onclick="approveMember('${name}')">승인</button>
      <button onclick="rejectMember('${name}')">거절</button>`;
    pendingList.appendChild(li);
  });
}

// ✅ 승인 처리
window.approveMember = async (username) => {
  const pendingRef = ref(db, `pendingClans/${myClanName}`);
  const clanRef = ref(db, `clans/${myClanName}`);
  const [pendingSnap, clanSnap] = await Promise.all([get(pendingRef), get(clanRef)]);

  if (!pendingSnap.exists() || !clanSnap.exists()) return;

  const applicants = pendingSnap.val().filter(name => name !== username);
  const members = [...(clanSnap.val().members || []), username];

  await set(pendingRef, applicants.length ? applicants : null);
  await update(clanRef, { members });

  await update(ref(db, `users/${username}`), { clan: myClanName });

  loadManageScreen();
};

// ✅ 거절 처리
window.rejectMember = async (username) => {
  const pendingRef = ref(db, `pendingClans/${myClanName}`);
  const pendingSnap = await get(pendingRef);

  if (!pendingSnap.exists()) return;

  const applicants = pendingSnap.val().filter(name => name !== username);
  await set(pendingRef, applicants.length ? applicants : null);
  loadManageScreen();
};

// ✅ 클랜장 양도
async function loadTransferList(members) {
  transferTarget.innerHTML = "";
  members.filter(m => m !== currentUser).forEach(m => {
    const option = document.createElement('option');
    option.value = m;
    option.innerText = m;
    transferTarget.appendChild(option);
  });
}

window.transferLeadership = async () => {
  const newLeader = transferTarget.value;
  if (!newLeader) return alert("양도할 대상을 선택하세요.");

  await update(ref(db, `clans/${myClanName}`), { leader: newLeader });
  alert(`클랜장이 ${newLeader}님으로 변경되었습니다.`);
  loadManageScreen();
};

// ✅ 클랜 해체
window.disbandClan = async () => {
  if (!confirm("정말 클랜을 해체하시겠습니까?")) return;

  const clanRef = ref(db, `clans/${myClanName}`);
  const clanSnap = await get(clanRef);

  if (!clanSnap.exists()) return;

  const allMembers = clanSnap.val().members || [];
  for (const member of allMembers) {
    await update(ref(db, `users/${member}`), { clan: null });
  }

  await remove(ref(db, `clans/${myClanName}`));
  await remove(ref(db, `pendingClans/${myClanName}`));
  alert("클랜이 해체되었습니다.");
  location.href = "main.html";
};

// ✅ 클랜 탈퇴
window.leaveClan = async () => {
  if (!confirm("정말 클랜을 탈퇴하시겠습니까?")) return;

  const clanRef = ref(db, `clans/${myClanName}`);
  const clanSnap = await get(clanRef);

  if (!clanSnap.exists()) return;

  const members = clanSnap.val().members.filter(name => name !== currentUser);
  await update(clanRef, { members });
  await update(ref(db, `users/${currentUser}`), { clan: null });

  alert("클랜을 탈퇴했습니다.");
  location.href = "main.html";
};

// ✅ 처음 실행
loadMyClan();
