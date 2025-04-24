document.addEventListener("DOMContentLoaded", () => {
  const currentUser = localStorage.getItem("currentUser");
  const currentMatch = JSON.parse(localStorage.getItem("currentMatch"));
  const resultForm = document.getElementById("resultForm");

  if (!currentUser || !currentMatch) {
    alert("잘못된 접근입니다. 메인 페이지로 이동합니다.");
    location.href = "main.html";
    return;
  }

  const matchId = currentMatch.id;
  const allPlayers = [...currentMatch.teamA, ...currentMatch.teamB];
  const results = JSON.parse(localStorage.getItem("matchResults") || "{}");
  const matchResult = results[matchId] || {};

  if (matchResult[currentUser]) {
    resultForm.innerHTML = `<p>${currentUser}님은 이미 결과를 입력하셨습니다.</p>`;
    return;
  }

  resultForm.innerHTML = `
    <p>결과 선택 (${currentUser})</p>
    <select id="resultSelect">
      <option value="win">WIN</option>
      <option value="lose">LOSE</option>
    </select><br><br>
    <button id="submitResult">결과 제출</button><br><br>
    <button id="manualDisputeBtn" style="background-color:tomato; color:white;">⚠ 수동 이의제기</button>
    <p id="manualDisputeNotice" style="display:none; color:tomato; margin-top:10px;">
      📎 수동 이의제기 접수 완료! 오픈카톡으로 스크린샷 제출 바랍니다.
    </p>
  `;

  document.getElementById("submitResult").addEventListener("click", () => {
    const selected = document.getElementById("resultSelect").value;
    matchResult[currentUser] = selected;
    results[matchId] = matchResult;
    localStorage.setItem("matchResults", JSON.stringify(results));

    const inputCount = Object.keys(matchResult).length;
    alert(`입력 완료! 현재 ${inputCount}/10명이 입력했습니다.`);

    if (inputCount === 10) {
      const teamAWins = currentMatch.teamA.filter(n => matchResult[n] === "win").length;
      const teamBWins = currentMatch.teamB.filter(n => matchResult[n] === "win").length;

      if ((teamAWins === 5 && teamBWins === 0) || (teamAWins === 0 && teamBWins === 5)) {
        const winnerTeam = teamAWins === 5 ? currentMatch.teamA : currentMatch.teamB;
        applyMatchResult(matchResult, currentMatch, winnerTeam);
      } else {
        alert("승패 결과가 불일치합니다. 자동 이의제기 처리됩니다.");
        registerDispute("auto");
      }
    }
  });

  document.getElementById("manualDisputeBtn").addEventListener("click", () => {
    const disputes = JSON.parse(localStorage.getItem("disputes") || "[]");
    if (disputes.some(d => d.matchId === matchId)) {
      alert("이미 이의제기가 접수된 경기입니다.");
      return;
    }
    registerDispute("manual");
    document.getElementById("manualDisputeNotice").style.display = "block";
  });

  function registerDispute(mode) {
    const disputes = JSON.parse(localStorage.getItem("disputes") || "[]");
    disputes.push({
      matchId,
      data: currentMatch,
      result: matchResult,
      date: new Date().toISOString(),
      status: mode
    });
    localStorage.setItem("disputes", JSON.stringify(disputes));
    localStorage.setItem("matchingPaused", "true");
    alert("📎 이의제기가 접수되었습니다. 매칭이 일시 중단됩니다.");
    location.href = "main.html";
  }

  function applyMatchResult(matchResult, match, winnerTeam) {
    const users = JSON.parse(localStorage.getItem("users") || "{}");
    const history = JSON.parse(localStorage.getItem("matchHistory") || {});
    const matchDate = new Date().toISOString().split("T")[0];

    [...match.teamA, ...match.teamB].forEach(name => {
      const isWinner = matchResult[name] === "win";
      const delta = isWinner ? 10 : -10;
      users[name].points = (users[name].points || 0) + delta;

      history[name] = history[name] || [];
      history[name].push({
        matchId: match.id,
        date: matchDate,
        result: matchResult[name],
        team: match.teamA.includes(name) ? "A" : "B"
      });
    });

    localStorage.setItem("users", JSON.stringify(users));
    localStorage.setItem("matchHistory", JSON.stringify(history));
    localStorage.removeItem("currentMatch");
    alert("점수 및 히스토리 저장 완료!");
    location.href = "main.html";
  }
});
