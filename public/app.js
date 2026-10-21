let currentUser = null;
const statusText = document.getElementById("status");
const loggedOut = document.getElementById("logged-out");
const loggedIn = document.getElementById("logged-in");

function showUser(user) {
  currentUser = user;
  statusText.hidden = true;
  if(user) {
    document.getElementById("current-user").textContent = user.username;
    loggedIn.hidden = false;
    loggedOut.hidden = true;
    loadPhotos();
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

document.getElementById("logout-button").addEventListener("click", async() => {
  await fetch("/api/logout", {method: "POST"});
  loginForm.reset();
  showUser(null);
});

const registerForm = document.getElementById("register-form");

registerForm.addEventListener("submit", async (event) =>{
  event.preventDefault();
  const username = document.getElementById("register-username").value;
  const password = document.getElementById("register-password").value;

  const response = await fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({username, password}),
  });
  const data = await response.json();

  const registerError = document.getElementById("register-error");
  if (!response.ok){
    registerError.textContent = data.error;
    return;
  }

  registerError.textContent = "";
  registerForm.reset();
  showUser(data);
});

const photoInput = document.getElementById("photo-input");
const uploadStatus = document.getElementById("upload-status");

photoInput.addEventListener("change", async () =>{
  const file = photoInput.files[0];
  if(!file) return;
  uploadStatus.textContent = `Vald fil: ${file.name} (${Math.round(file.size/ 1024)} kb, ${file.type})`;

  const response = await fetch("/api/photos", {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });
  const data = await response.json();

  if(!response.ok) {
    uploadStatus.textContent = data.error;
    return;
  }
  uploadStatus.textContent = `Uppladdad: ${data.bytes} bytes`;
  loadPhotos();
});

const gallery = document.getElementById("gallery");
const galleryStatus = document.getElementById("gallery-status");
const myPhotos = document.getElementById("my-photos");
const myStatus = document.getElementById("my-status");
const searchInput = document.getElementById("search-input");
const sortSelect = document.getElementById("sort-select");

function loadMyPhotos() {
  renderPhotos("/api/photos?mine=1", myPhotos, myStatus, "Du har inga bilder än.", true);
}

function loadGallery() {
  const params = new URLSearchParams({
    search: searchInput.value,
    sort: sortSelect.value,
  });
  const emptyText = searchInput.value.trim()
    ? "Inga bilder matchar sökningen."
    : "Inga publicerade bilder än.";
  renderPhotos("/api/photos?" + params, gallery, galleryStatus, emptyText, false);
}

function loadPhotos() {
  loadMyPhotos();
  loadGallery();
}

let searchTimer;
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadGallery, 300);
});
sortSelect.addEventListener("change", loadGallery);

async function renderPhotos(url, list, statusElement, emptyText, showStatus) {
  statusElement.textContent = "Laddar bilder...";
  const response = await fetch(url);
  const photos = await response.json();

  if (!response.ok) {
    statusElement.textContent = photos.error;
    return;
  }

  list.replaceChildren();
  if (photos.length === 0) {
    statusElement.textContent = emptyText;
    return;
  }
  statusElement.textContent = "";

  for (const photo of photos) {
    const item = document.createElement("li");

    const img = document.createElement("img");
    img.src = photo.file_path;
    img.alt = photo.title;

    const caption = document.createElement("p");
    caption.textContent = `${photo.title} av ${photo.username}`;
    if (showStatus) {
      caption.textContent += photo.published ? " (publicerad)" : " (privat)";
    }

    item.append(img, caption);

    if(showStatus) {
      const publishButton = document.createElement("button");
      publishButton.type = "button";
      publishButton.textContent = photo.published ? "Avpublicera" : "Publicera";
      publishButton.addEventListener("click", async () =>{
        const response = await fetch(`/api/photos/${photo.id}/published`,{
          method: "PUT",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({published: !photo.published}),
        });
        if (!response.ok){
          const data = await response.json();
          statusElement.textContent = data.error;
          return;
        }
        loadPhotos();
      });
      item.append(publishButton);
    }

    if (currentUser && (currentUser.id === photo.user_id || currentUser.role === "admin")) {
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.textContent = "Ta bort";
      deleteButton.addEventListener("click", async () => {
        const response = await fetch(`/api/photos/${photo.id}`, { method: "DELETE" });
        if (!response.ok) {
          const data = await response.json();
          statusElement.textContent = data.error;
          return;
        }
        loadPhotos();
      });
      item.append(deleteButton);
    }

    list.append(item);
  }
}