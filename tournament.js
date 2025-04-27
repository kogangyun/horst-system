// 팀 데이터 세팅 (추가로 appeal 상태 추가)
const teams = [
    { name: "A팀", players: ["player1", "player2", "player3", "player4", "player5"], captain: "player1", appeal: false, status: "" },
    { name: "B팀", players: ["player6", "player7", "player8", "player9", "player10"], captain: "player6", appeal: false, status: "" },
    { name: "C팀", players: ["player11", "player12", "player13", "player14", "player15"], captain: "player11", appeal: false, status: "" },
    { name: "D팀", players: ["player16", "player17", "player18", "player19", "player20"], captain: "player16", appeal: false, status: "" }
  ];
  
  // 현재 로그인한 사용자
  const user = localStorage.getItem('currentUser') || 'player1';
  
  // 토너먼트 카드 삽입할 div
  const tournamentDiv = document.getElementById('tournament');
  
  // 카드 그리기 함수
  function renderTournament() {
    tournamentDiv.innerHTML = ''; // 기존 카드 삭제
    teams.forEach((team, index) => {
      const card = document.createElement('div');
      card.className = 'team-card';
      card.id = `team-${index}`;
  
      let html = `<div class="team-title">${team.name}</div>`;
  
      team.players.forEach(p => {
        const isCaptain = p === team.captain ? '<span class="captain-star">⭐</span>' : '';
        html += `<div class="player-info">${p} ${isCaptain}</div>`;
      });
  
      // 팀장이면서 이의제기가 아닌 경우 승/패 버튼 표시
      if (user === team.captain && !team.appeal) {
        html += `
          <div class="win-lose-btns">
            <button class="btn" onclick="markResult(${index}, 'win')">승리</button>
            <button class="btn" onclick="markResult(${index}, 'lose')">패배</button>
            <button class="btn" onclick="appeal(${index})">이의제기</button>
          </div>`;
      }
  
      // 결과 표시
      if (team.status === 'win') {
        html += `<div style="color: #00ff00; font-weight: bold; margin-top: 10px;">🏆 승리</div>`;
      } else if (team.status === 'lose') {
        html += `<div class="skull">💀</div>`;
      }
  
      // 이의제기 상태 표시
      if (team.appeal) {
        html += `<div style="color: #ff4444; font-weight: bold; margin-top: 10px;">❗ 이의제기 중</div>`;
      }
  
      card.innerHTML = html;
      tournamentDiv.appendChild(card);
    });
  }
  
  // 승리/패배 처리 함수
  function markResult(index, result) {
    if (teams[index].appeal) {
      alert("⚠️ 현재 이의제기 중입니다. 매치를 진행할 수 없습니다.");
      return;
    }
    teams[index].status = result;
    if (result === 'win') {
      alert(`${teams[index].name} 팀 승리! 선물 요청을 위해 오픈카톡을 이용하세요.`);
    }
    renderTournament();
  }
  
  // 이의제기 처리 함수
  function appeal(index) {
    if (teams[index].appeal) {
      alert("이미 이의제기 중입니다.");
      return;
    }
    if (confirm("정말로 이의제기를 신청하시겠습니까?")) {
      teams[index].appeal = true;
      alert("이의제기 신청 완료! 오픈카톡으로 문의해주세요.");
      window.open('https://open.kakao.com/o/yourlink', '_blank');
      renderTournament();
    }
  }
  
  // 첫 화면 그리기
  renderTournament();
  