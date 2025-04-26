import { db } from "./firebase.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

let fullUserList = [];

document.addEventListener("DOMContentLoaded", async () => {
  const tbody = document.querySelector("#rankingTable tbody");
  const searchInput = document.getElementById("searchInput");

  const snapshot = await get(ref(db, "users"));
  if (!snapshot.exists()) return;

  const users = snapshot.val();
  fullUserList = Object.entries(users)
    .map(([name, data]) => ({
      name,
      clan: data.clan || "-",
      score: data.score || 0,
    }))
    .sort((a, b) => b.score - a.score);

  renderTable(fullUserList);

  // 🔍 검색 기능
  searchInput.addEventListener("input", () => {
    const keyword = searchInput.value.toLowerCase();
    const filtered = fullUserList.filter(user => user.name.toLowerCase().includes(keyword));
    renderTable(filtered);
  });

  function renderTable(userList) {
    tbody.innerHTML = "";

    userList.forEach((user, index) => {
      const tr = document.createElement("tr");

      // 점수별 색상 class 적용
      let pointClass = "";
      const displayScore = user.score > 3400 ? 3400 : user.score;

      if (displayScore >= 3000) pointClass = "high-glow";
      else if (displayScore >= 2600) pointClass = "mid-upper-glow";
      else if (displayScore >= 2200) pointClass = "middle-glow";
      else if (displayScore >= 1800) pointClass = "lower-glow";
      else if (displayScore >= 1200) pointClass = "";
      else pointClass = "default-glow";

      // 상위 5등 별 표시
      let star = "";
      if (index < 5) {
        const stars = 5 - index;
        star = `<span style="color: #ffd700;">${"★".repeat(stars)}</span> `;
      }

      tr.innerHTML = `
        <td>${index + 1}</td>
        <td class="${pointClass}">${star}${user.name}</td>
        <td>${user.clan}</td>
        <td>${displayScore}</td>
      `;

      tbody.appendChild(tr);
    });
  }
});
