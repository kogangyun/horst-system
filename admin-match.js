// 매칭 조건 확인
if (updatedQueue.length >= 10) {
    const matchId = `match_${Date.now()}`;
    const teamA = updatedQueue.slice(0, 5);
    const teamB = updatedQueue.slice(5, 10);
  
    const newMatch = {
      id: matchId,
      teamA,
      teamB,
      players: [...teamA, ...teamB],
      confirmed: [],
      results: {}
    };
  
    // match 저장
    const matches = JSON.parse(localStorage.getItem("matchData") || "[]");
    matches.push(newMatch);
    localStorage.setItem("matchData", JSON.stringify(matches));
    localStorage.setItem("currentMatch", JSON.stringify(newMatch));
  
    // 대기열 초기화
    const remainingQueue = updatedQueue.slice(10);
    localStorage.setItem("matchQueue", JSON.stringify(remainingQueue));
    alert("매칭이 완료되었습니다!");
    location.href = "result.html";
  }
  