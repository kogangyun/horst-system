document.addEventListener("DOMContentLoaded", () => {
    const users = JSON.parse(localStorage.getItem("users") || "{}");
    const tbody = document.querySelector("#rankingTable tbody");
  
    const sorted = Object.entries(users)
      .map(([name, data]) => ({
        name,
        clan: data.clan || "-",
        points: data.points || 0
      }))
      .sort((a, b) => b.points - a.points);
  
    tbody.innerHTML = "";
    sorted.forEach((user, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${user.clan !== "-" ? `[${user.clan}] ` : ""}${user.name}</td>
        <td>${user.clan}</td>
        <td>${user.points}</td>
      `;
      tbody.appendChild(tr);
    });
  });
  
  
  
  