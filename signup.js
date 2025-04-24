function signup() {
  const id = document.getElementById("username").value.trim();
  const pw = document.getElementById("password").value;
  const confirm = document.getElementById("confirm").value;

  const idRegex = /^[a-zA-Z0-9가-힣]{2,12}$/;
  if (!idRegex.test(id)) {
    alert("아이디는 영어, 숫자, 한글만 포함 가능하고 2~12자 사이여야 합니다.");
    return;
  }

  if (/[<>]/.test(id)) {
    alert("아이디에 사용할 수 없는 문자가 포함되어 있습니다.");
    return;
  }

  const pwValid = pw.length >= 6 && /[a-zA-Z]/.test(pw) && /[0-9]/.test(pw);
  if (!pwValid) {
    alert("비밀번호는 6자 이상이어야 하며, 영문과 숫자를 포함해야 합니다.");
    return;
  }

  if (pw !== confirm) {
    alert("비밀번호가 일치하지 않습니다.");
    return;
  }

  const users = JSON.parse(localStorage.getItem("users")) || {};
  if (users[id]) {
    if (users[id].blocked) {
      alert("이 아이디는 차단되어 있어 가입할 수 없습니다.");
    } else {
      alert("이미 존재하는 아이디입니다.");
    }
    return;
  }

  // 🔥 관리자 자동 승인 + 자동 로그인
  const role = id === "admin" ? "admin" : "user";
  const status = role === "admin" ? "approved" : "pending";

  users[id] = {
    password: pw,
    status,
    role,
    blocked: false,
    joinedAt: new Date().toISOString()
  };

  localStorage.setItem("users", JSON.stringify(users));
  localStorage.setItem("currentUser", id); // 자동 로그인 처리

  if (role === "admin") {
    location.href = "admin.html"; // 관리자 페이지 바로 이동
  } else {
    alert("가입이 완료되었습니다! 관리자의 승인을 기다려주세요.");
    location.href = "index.html";
  }
}
