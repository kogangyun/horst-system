function signup() {
    const id = document.getElementById("username").value.trim();
    const pw = document.getElementById("password").value;
    const confirm = document.getElementById("confirm").value;
  
    const idRegex = /^[a-zA-Z0-9가-힣]{2,12}$/;
  
    // 입력값 유효성 검사
    if (!id || !pw || !confirm) {
      alert("모든 입력란을 채워주세요.");
      return;
    }
  
    if (!idRegex.test(id)) {
      alert("아이디는 한글, 영어, 숫자 포함 2~12자여야 합니다.");
      return;
    }
  
    if (pw.length < 4) {
      alert("비밀번호는 최소 4자 이상이어야 합니다.");
      return;
    }
  
    if (pw !== confirm) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }
  
    const users = JSON.parse(localStorage.getItem("users") || "{}");
  
    if (users[id]) {
      alert("이미 존재하는 아이디입니다.");
      return;
    }
  
    // 신규 유저 등록
    users[id] = {
      password: pw,
      role: "user",
      status: "pending"  // 승인 대기 상태
    };
  
    localStorage.setItem("users", JSON.stringify(users));
    alert("회원가입이 완료되었습니다.\n관리자의 승인 후 로그인할 수 있습니다.");
    location.href = "index.html";
  }
  