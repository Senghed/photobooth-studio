fetch("/api/ping")
  .then((res) => res.json())
  .then((data) => {
    document.getElementById("status").textContent = data.ok ? "Servern svarar" : "Fel";
  });