import { db } from "./firebase.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

document.addEventListener("DOMContentLoaded", async () => {
  const tbody = document.querySelector("#rankingTable tbody");
  const snapshot = await get(ref(db, "users"));
  if (!snapshot.exists()) return;

  const users = snapshot.val();
  const sorted = Object.entries(users)
    .map(([name, data]) => ({
      name,
      clan: data.clan || "-",
      points: data.points || 0,
      role: data.role || "user"
    }))
    .sort((a, b) => b.points - a.points);

  tbody.innerHTML = "";

  sorted.forEach((user, index) => {
    const tr = document.createElement("tr");

    // ✨ 점수에 따른 class 적용
    let pointClass = "";
    if (user.role === "admin") {
      pointClass = "admin-glow"; // 관리자는 특별한 클래스 적용
    } else if (user.points >= 3400) {
      pointClass = "neon-glow";  // 최고 점수
    } else if (user.points >= 2700) {
      pointClass = "high-glow";  // 상위 점수
    } else if (user.points >= 2200) {
      pointClass = "mid-upper-glow";  // 중상위 점수
    } else if (user.points >= 1500) {
      pointClass = "middle-glow";  // 중간 점수
    } else if (user.points >= 1200) {
      pointClass = "lower-glow";  // 하위 점수
    } else {
      pointClass = "default-glow";  // 기본 색상
    }

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td class="${pointClass}">${user.clan !== "-" ? `[${user.clan}] ` : ""}${user.name}</td>
      <td>${user.clan}</td>
      <td>${user.points}</td>
    `;

    tbody.appendChild(tr);
  });
});
