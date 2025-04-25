import { db } from "./firebase.js";
import { ref, get, set, update, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

const currentUser = localStorage.getItem("currentUser");
if (!currentUser) {
  alert("로그인이 필요합니다.");
  location.href = "index.html";
}

const tournamentInfo = document.getElementById("tournamentInfo");

// ✅ 토너먼트 상태 실시간 업데이트
onValue(ref(db, "tournament"), (snap) => {
  const data = snap.val();
  if (!data) {
    tournamentInfo.innerHTML = "현재 등록된 토너먼트가 없습니다.";
    return;
  }

  const now = new Date();
  const startTime = new Date(data.startTime);
  const diffMs = startTime - now;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  tournamentInfo.innerHTML = `
    <p>토너먼트 시작까지: <span style="color:lime;">${diffHours}시간 ${diffMinutes}분 남음</span></p>
    <p>참가 현황: <span style="color:gold;">${data.participants ? data.participants.length : 0}/20명</span></p>
    <button onclick="joinTournament()">참가 신청</button>
    <button onclick="cancelTournament()">신청 취소</button>
  `;

  // 🔥 금요일 7시 도달 시 처리
  if (diffMs <= 0) {
    if (data.participants && data.participants.length === 20) {
      // 자동 팀 배정 후 이동
      autoAssignTeams(data.participants);
    } else {
      tournamentInfo.innerHTML = `<span style="color:red;">정원이 충족되지 않아 시작되지 않았습니다.</span>`;
    }
  }
});

// 참가 신청
window.joinTournament = async () => {
  const snap = await get(ref(db, "tournament"));
  const data = snap.val();

  if (!data.participants) data.participants = [];
  if (data.participants.includes(currentUser)) return alert("이미 신청하셨습니다.");
  if (data.participants.length >= 20) return alert("정원이 가득 찼습니다.");

  data.participants.push(currentUser);
  await update(ref(db, "tournament"), { participants: data.participants });
};

// 참가 취소
window.cancelTournament = async () => {
  const snap = await get(ref(db, "tournament"));
  const data = snap.val();

  if (!data.participants || !data.participants.includes(currentUser)) return alert("신청하지 않았습니다.");

  data.participants = data.participants.filter(id => id !== currentUser);
  await update(ref(db, "tournament"), { participants: data.participants });
};

// 팀 자동 배정 및 페이지 이동
async function autoAssignTeams(participants) {
  const scoresSnap = await get(ref(db, "users"));
  const scores = scoresSnap.val();

  participants.sort((a, b) => (scores[b].points || 0) - (scores[a].points || 0));

  const teams = { A: [], B: [], C: [], D: [] };
  participants.forEach((player, idx) => {
    const teamKey = ['A', 'B', 'C', 'D'][idx % 4];
    teams[teamKey].push(player);
  });

  await update(ref(db, "tournament"), { teams, status: "ongoing" });

  localStorage.setItem("tournamentTeams", JSON.stringify(teams));
  location.href = "tournament.html";
}
