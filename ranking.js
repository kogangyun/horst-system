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

    // ✨ 등급별 class 적용
    let pointClass = "";
    if (user.role === "admin") pointClass = "admin-glow";
    else if (user.points >= 2000) pointClass = "neon-glow";
    else if (user.points >= 1500) pointClass = "high-rank";
    else if (user.points >= 1000) pointClass = "mid-rank";
    else pointClass = "low-rank";

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td class="${pointClass}">${user.clan !== "-" ? `[${user.clan}] ` : ""}${user.name}</td>
      <td>${user.clan}</td>
      <td>${user.points}</td>
    `;

    tbody.appendChild(tr);
  });
});
