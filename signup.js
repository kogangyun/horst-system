function signup() {
  // 입력값 가져오기 및 공백 제거
  const id = document.getElementById("username").value.trim();
  const pw = document.getElementById("password").value;
  const confirm = document.getElementById("confirm").value;

  // 아이디 정규식: 한글, 영어, 숫자 / 2~12자
  const idRegex = /^[a-zA-Z0-9가-힣]{2,12}$/;

  // 아이디 유효성 검사
  if (!idRegex.test(id)) {
    alert("아이디는 영어, 숫자, 한글만 포함 가능하고 2~12자 사이여야 합니다.");
    return;
  }

  // 특수 문자 금지 (XSS 대응)
  if (/[<>]/.test(id)) {
    alert("아이디에 사용할 수 없는 문자가 포함되어 있습니다.");
    return;
  }

  // 비밀번호 유효성 검사 (6자 이상, 영문+숫자 포함)
  const pwValid = pw.length >= 6 && /[a-zA-Z]/.test(pw) && /[0-9]/.test(pw);
  if (!pwValid) {
    alert("비밀번호는 6자 이상이어야 하며, 영문과 숫자를 포함해야 합니다.");
    return;
  }

  // 비밀번호 확인
  if (pw !== confirm) {
    alert("비밀번호가 일치하지 않습니다.");
    return;
  }

  // 기존 사용자 확인
  const users = JSON.parse(localStorage.getItem("users")) || {};
  const existingUser = users[id];

  if (existingUser) {
    if (existingUser.blocked) {
      alert("이 아이디는 차단되어 있어 가입할 수 없습니다.");
      return;
    } else {
      alert("이미 존재하는 아이디입니다.");
      return;
    }
  }

  // 새로운 사용자 저장
  users[id] = {
    password: pw,
    status: "pending",    // 기본 상태: 승인 대기
    role: "user",         // 기본 권한: 일반 사용자
    blocked: false        // 차단 상태: 기본값 false
  };

  // 로컬스토리지에 저장
  localStorage.setItem("users", JSON.stringify(users));

  // 완료 안내 및 로그인 페이지로 이동
  alert("가입이 완료되었습니다! 관리자의 승인을 기다려주세요.");
  location.href = "index.html";
}
