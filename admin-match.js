// 관리자 페이지 매칭 결과 수정 및 검색 기능 추가

// 페이지 로드 시 matchData 기반으로 <datalist> 채우기
// HTML에 아래 요소가 필요합니다:
// <input list="matchList" id="matchIdEdit" placeholder="매칭 ID">
// <datalist id="matchList"></datalist>

document.addEventListener("DOMContentLoaded", () => {
  populateMatchDatalist();
});

/**
 * matchData(localStorage)에 저장된 매칭 ID 목록을 가져와 datalist에 추가
 */
function populateMatchDatalist() {
  const matches = JSON.parse(localStorage.getItem("matchData") || "[]");
  const datalist = document.getElementById("matchList");
  if (!datalist) return;
  datalist.innerHTML = "";
  matches.forEach(match => {
    const option = document.createElement("option");
    option.value = match.id;
    datalist.appendChild(option);
  });
}

/**
 * 로컬스토리지 기반 매칭 결과 수정 함수
 */
function editMatchResult() {
  const matchId = document.getElementById("matchIdEdit").value.trim();
  const playerId = document.getElementById("editPlayer").value.trim();
  const result = document.getElementById("editResult").value;
  const editStatus = document.getElementById("editStatus");

  if (!matchId || !playerId || !result) {
    editStatus.innerText = "모든 필드를 입력해주세요!";
    return;
  }

  // 로컬스토리지에서 매칭 데이터 조회
  const matches = JSON.parse(localStorage.getItem("matchData") || "[]");
  const match = matches.find(m => m.id === matchId);

  if (!match) {
    editStatus.innerText = "매칭 ID를 찾을 수 없습니다.";
    return;
  }

  // 참가자 확인
  const players = [...(match.teamA || []), ...(match.teamB || [])];
  if (!players.includes(playerId)) {
    editStatus.innerText = "참가자 ID를 찾을 수 없습니다.";
    return;
  }

  // 결과 수정
  if (!match.results) match.results = {};
  match.results[playerId] = result;

  // 변경사항 저장
  localStorage.setItem("matchData", JSON.stringify(matches));
  editStatus.innerText = `✅ ${playerId}의 결과가 '${result}'(으)로 수정되었습니다.`;
}

// 전역 함수 노출
window.populateMatchDatalist = populateMatchDatalist;
window.editMatchResult = editMatchResult;
