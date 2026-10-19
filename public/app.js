const loginForm = document.getElementById("login-form");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = document.getElementById("login-username").value;
  const password = document.getElementById("login-password").value;

  const response = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({username, password}),  
  });
   const data = await response.json();
   console.log(response.status, data);
});