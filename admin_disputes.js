document.addEventListener("DOMContentLoaded", () => {
  const disputes = JSON.parse(localStorage.getItem("disputes")) || [];
  const disputeBody = document.getElementById("disputeBody");

  // 이의제기 목록이 비어있을 때 처리
  if (disputes.length === 0) {
    disputeBody.innerHTML = "<tr><td colspan='4'>이의제기된 경기가 없습니다.</td></tr>";
    return;
  }

  // 이의제기 항목을 테이블에 추가
  disputes.forEach((d, i) => {
    const tr = document.createElement("tr");
    const resolvedClass = d.status === "resolved" ? "class='resolved-row'" : "";
    tr.innerHTML = `
      <tr ${resolvedClass}>
        <td>${d.matchId}</td>
        <td>${formatDate(d.date)}</td>
        <td>${d.status === "resolved" ? "처리 완료" : "대기 중"}</td>
        <td>
          ${
            d.status === "resolved"
              ? "-"
              : `<button onclick="resolveDispute(${i})">처리 완료</button>`
          }
        </td>
      </tr>
    `;
    disputeBody.appendChild(tr);
  });
});

// 날짜 포맷 함수
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}

// 이의제기 처리 함수
function resolveDispute(index) {
  if (!confirm("정말로 이 이의제기를 처리하시겠습니까?")) return;

  const disputes = JSON.parse(localStorage.getItem("disputes")) || [];
  disputes[index].status = "resolved"; // 삭제 대신 상태 변경
  localStorage.setItem("disputes", JSON.stringify(disputes));
  alert("이의제기가 처리되었습니다.");
  location.reload(); // 페이지 새로고침하여 상태 반영
}
