const currentUser = localStorage.getItem("currentUser");
const userScores = JSON.parse(localStorage.getItem("userScores") || "{}");
let queue = JSON.parse(localStorage.getItem("matchQueue") || "[]");
let timerInterval = null;
let elapsedSeconds = 0;

const maps = [
  "영원의 전쟁터", "죽음의 광산", "용의 둥지", "핵탄두 격전지", "하늘 사원",
  "브락시스 항전", "파멸의 탑", "볼스카야 공장", "저주의 골짜기", "거미 여왕의 무덤"
];

function joinMatch() {
  if (!currentUser) return alert("로그인이 필요합니다.");
  if (queue.includes(currentUser)) return alert("이미 대기 중입니다.");
  if (localStorage.getItem("matchingPaused") === "true") return alert("이의제기 처리 중입니다. 매칭이 일시 중단되었습니다.");

  queue.push(currentUser);
  localStorage.setItem("matchQueue", JSON.stringify(queue));
  updateStatus();
}

function updateStatus() {
  document.getElementById("statusText").innerText = `현재 ${queue.length}/10명 대기 중...`;

  if (queue.length >= 10) {
    clearInterval(timerInterval);
    timerInterval = null;
    document.getElementById("timer").innerText = "";

    const matchPlayers = queue.slice(0, 10);
    const map = maps[Math.floor(Math.random() * maps.length)];
    const teams = createBalancedTeams(matchPlayers);
    const matchId = `match-${Date.now()}`;

    const matchData = {
      id: matchId,
      teamA: teams.teamA.map(p => p.name),
      teamB: teams.teamB.map(p => p.name),
      map,
      timestamp: new Date().toISOString()
    };

    localStorage.setItem("currentMatch", JSON.stringify(matchData));

    queue = queue.slice(10);
    localStorage.setItem("matchQueue", JSON.stringify(queue));

    saveMatch(matchData);
    showMatchResult(matchData);

    setTimeout(() => {
      window.location.href = "result.html";
    }, 600000); // 10분 = 600000ms
  } else {
    if (!timerInterval) startTimer();
  }
}

function startTimer() {
  elapsedSeconds = 0;
  document.getElementById("timer").innerText = `경과 시간: 0초`;

  timerInterval = setInterval(() => {
    elapsedSeconds++;
    document.getElementById("timer").innerText = `경과 시간: ${elapsedSeconds}초`;
    updateStatus();
  }, 1000);
}

function createBalancedTeams(players) {
  const scored = players.map(name => ({
    name,
    score: userScores[name] || 1000
  })).sort((a, b) => b.score - a.score);

  const teamA = [], teamB = [];
  let scoreA = 0, scoreB = 0;

  for (const p of scored) {
    if (scoreA <= scoreB) {
      teamA.push(p);
      scoreA += p.score;
    } else {
      teamB.push(p);
      scoreB += p.score;
    }
  }

  return {
    teamA: markLeader(teamA),
    teamB: markLeader(teamB)
  };
}

function markLeader(team) {
  const maxScore = Math.max(...team.map(p => p.score));
  return team.map(p => ({
    ...p,
    name: p.score === maxScore ? `👑${p.name} (${p.score})` : `${p.name} (${p.score})`
  }));
}

function showMatchResult(match) {
  const resultBox = document.getElementById("matchResult");
  resultBox.innerHTML = `
    <h3>🎮 매칭 완료!</h3>
    <p><strong>맵:</strong> ${match.map}</p>
    <p><strong>팀 A:</strong> ${match.teamA.join(", ")}</p>
    <p><strong>팀 B:</strong> ${match.teamB.join(", ")}</p>
  `;
  document.getElementById("statusText").innerText = "10분 후 결과 입력 페이지로 이동합니다...";
}

function saveMatch(matchData) {
  const matchHistory = JSON.parse(localStorage.getItem("matchHistory") || "[]");
  matchHistory.push(matchData);
  localStorage.setItem("matchHistory", JSON.stringify(matchHistory));
}
