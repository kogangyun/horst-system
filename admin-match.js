// 관리자 페이지에서 매칭 결과 수정
function editMatchResult() {
  const matchId = document.getElementById("matchIdEdit").value.trim();
  const playerId = document.getElementById("editPlayer").value.trim();
  const result = document.getElementById("editResult").value;

  const editStatus = document.getElementById("editStatus");

  if (!matchId || !playerId || !result) {
    editStatus.innerText = "모든 필드를 입력해주세요!";
    return;
  }

  // 저장된 매칭 데이터 가져오기
  const matches = JSON.parse(localStorage.getItem("matchData") || "[]");
  const match = matches.find(m => m.id === matchId);

  if (!match) {
    editStatus.innerText = "매칭 ID를 찾을 수 없습니다.";
    return;
  }

  // 참가자 찾기
  const team = match.teamA.concat(match.teamB);
  const player = team.find(p => p === playerId);

  if (!player) {
    editStatus.innerText = "참가자 ID를 찾을 수 없습니다.";
    return;
  }

  // 결과 수정
  match.results[playerId] = result;

  // 수정된 매칭 데이터 저장
  localStorage.setItem("matchData", JSON.stringify(matches));

  editStatus.innerText = `결과 수정 완료! ${playerId}의 결과: ${result}`;
}
