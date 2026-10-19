const statusText = document.getElementById("status");
const loggedOut = document.getElementById("logged-out");
const loggedIn = document.getElementById("logged-in");

function showUser(user) {
  statusText.hidden = true;
  if(user) {
    document.getElementById("current-user").textContent = user.username;
    loggedIn.hidden = false;
    loggedOut.hidden = true;
  } else {
    loggedIn.hidden = true;
    loggedOut.hidden = false;
  }
}

async function loadMe(){
  const response = await fetch("/api/me");
  const data = await response.json();
  showUser(data.user);
}

loadMe();

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

   const loginError = document.getElementById("login-error");
   if (!response.ok){
    loginError.textContent = data.error;
    return;
   }
   loginError.textContent = "";
   showUser(data);
});