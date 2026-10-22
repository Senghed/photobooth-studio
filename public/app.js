async function api(url, options) {
  let response;
  try {
    response = await fetch(url, options);
  } catch {
    return { ok: false, data: { error: "Kunde inte nå servern. Försök igen." } };
  }
  let data;
  try {
    data = await response.json();
  } catch {
    data = { error: "Ogiltigt svar från servern." };
  }
  return { ok: response.ok, data };
}

function filterCss(filter, amount) {
  return filter === "none" ? "none" : `${filter}(${amount})`;
}

let currentUser = null;
const statusText = document.getElementById("status");
const loggedOut = document.getElementById("logged-out");
const loggedIn = document.getElementById("logged-in");
const overview = document.getElementById("overview");
const editor = document.getElementById("editor");
const editorBack = document.getElementById("editor-back");
const editorTitle = document.getElementById("editor-title");
const editorImage = document.getElementById("editor-image");
const filterSelect = document.getElementById("filter-select");
const filterAmount = document.getElementById("filter-amount");
const filterSave = document.getElementById("filter-save");
const editorStatus = document.getElementById("editor-status");
let editingPhoto = null;

function openEditor(photo) {
  editingPhoto = photo;
  editorStatus.textContent = "";
  overview.hidden = true;
  editor.hidden = false;
  editorTitle.textContent = photo.title;
  editorImage.src = photo.file_path;
  editorImage.alt = photo.title;
  filterSelect.value = photo.filter;
  filterAmount.value = Math.round(photo.filter_amount * 100);
  updatePreview();
}

function updatePreview() {
  editorImage.style.filter = filterCss(filterSelect.value, Number(filterAmount.value) / 100);
}

filterSelect.addEventListener("change", () => {
  if (filterSelect.value !== "none" && Number(filterAmount.value) === 0) {
    filterAmount.value = 100;
  }
  updatePreview();
});
filterAmount.addEventListener("input", updatePreview);

filterSave.addEventListener("click", async () => {
  const { ok, data } = await api(`/api/photos/${editingPhoto.id}/filter`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filter: filterSelect.value,
      amount: Number(filterAmount.value) / 100,
    }),
  });
  if (!ok) {
    editorStatus.textContent = data.error;
    return;
  }
  editorStatus.textContent = "Filtret sparades.";
});

editorBack.addEventListener("click", () => {
  editor.hidden = true;
  overview.hidden = false;
  loadPhotos();
});

function showUser(user) {
  currentUser = user;
  editor.hidden = true;
  overview.hidden = false;
  statusText.hidden = true;
  if (user) {
    document.getElementById("current-user").textContent = user.username;
    loggedIn.hidden = false;
    loggedOut.hidden = true;
    loadPhotos();
  } else {
    loggedIn.hidden = true;
    loggedOut.hidden = false;
  }
}

async function loadMe() {
  const { ok, data } = await api("/api/me");
  if (!ok) {
    statusText.textContent = data.error;
    return;
  }
  showUser(data.user);
}

loadMe();

const loginForm = document.getElementById("login-form");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = document.getElementById("login-username").value;
  const password = document.getElementById("login-password").value;

  const { ok, data } = await api("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const loginError = document.getElementById("login-error");
  if (!ok) {
    loginError.textContent = data.error;
    return;
  }
  loginError.textContent = "";
  showUser(data);
});

document.getElementById("logout-button").addEventListener("click", async () => {
  const { ok, data } = await api("/api/logout", { method: "POST" });
  if (!ok) {
    uploadStatus.textContent = data.error;
    return;
  }
  loginForm.reset();
  showUser(null);
});

const registerForm = document.getElementById("register-form");

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = document.getElementById("register-username").value;
  const password = document.getElementById("register-password").value;

  const { ok, data } = await api("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const registerError = document.getElementById("register-error");
  if (!ok) {
    registerError.textContent = data.error;
    return;
  }

  registerError.textContent = "";
  registerForm.reset();
  showUser(data);
});

const photoInput = document.getElementById("photo-input");
const uploadStatus = document.getElementById("upload-status");

photoInput.addEventListener("change", async () => {
  const file = photoInput.files[0];
  if (!file) return;
  uploadStatus.textContent = `Vald fil: ${file.name} (${Math.round(file.size / 1024)} kb, ${file.type})`;

  const { ok, data } = await api("/api/photos", {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!ok) {
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
const adminPanel = document.getElementById("admin-panel");
const adminStatus = document.getElementById("admin-status");
const adminList = document.getElementById("admin-list");

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

async function loadAdmin() {
  adminStatus.textContent = "Laddar bilder...";
  const { ok, data: photos } = await api("/api/admin/photos");

  if (!ok) {
    adminStatus.textContent = photos.error;
    return;
  }

  adminList.replaceChildren();
  if (photos.length === 0) {
    adminStatus.textContent = "Inga publicerade bilder att moderera.";
    return;
  }
  adminStatus.textContent = "";

  for (const photo of photos) {
    const item = document.createElement("li");

    const img = document.createElement("img");
    img.src = photo.file_path;
    img.alt = photo.title;
    img.style.filter = filterCss(photo.filter, photo.filter_amount);

    const caption = document.createElement("p");
    caption.textContent = `${photo.title} av ${photo.username} (${photo.status === "hidden" ? "dold" : "synlig"})`;

    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.textContent = photo.status === "hidden" ? "Visa" : "Dölj";
    toggleButton.addEventListener("click", async () => {
      const { ok, data } = await api(`/api/photos/${photo.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: photo.status === "hidden" ? "visible" : "hidden" }),
      });
      if (!ok) {
        adminStatus.textContent = data.error;
        return;
      }
      loadPhotos();
    });

    item.append(img, caption, toggleButton);
    adminList.append(item);
  }
}


function loadPhotos() {
  loadMyPhotos();
  loadGallery();
  const isAdmin = currentUser && currentUser.role === "admin";
  adminPanel.hidden = !isAdmin;
  if (isAdmin) {
    loadAdmin();
  }
}

let searchTimer;
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadGallery, 300);
});
sortSelect.addEventListener("change", loadGallery);

async function renderPhotos(url, list, statusElement, emptyText, showStatus) {
  statusElement.textContent = "Laddar bilder...";
  const { ok, data: photos } = await api(url);

  if (!ok) {
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
    img.style.filter = filterCss(photo.filter, photo.filter_amount);

    const caption = document.createElement("p");
    caption.textContent = `${photo.title} av ${photo.username}`;
    if (showStatus) {
      caption.textContent += photo.published ? " (publicerad)" : " (privat)";
    }

    item.append(img, caption);

    if (showStatus) {
      const publishButton = document.createElement("button");
      publishButton.type = "button";
      publishButton.textContent = photo.published ? "Avpublicera" : "Publicera";
      publishButton.addEventListener("click", async () => {
        const { ok, data } = await api(`/api/photos/${photo.id}/published`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ published: !photo.published }),
        });
        if (!ok) {
          statusElement.textContent = data.error;
          return;
        }
        loadPhotos();
      });
      item.append(publishButton);

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.textContent = "Redigera";
      editButton.addEventListener("click", () => openEditor(photo));
      item.append(editButton);
    }

    if (showStatus) {
      const titleForm = document.createElement("form");

      const titleLabel = document.createElement("label");
      titleLabel.textContent = "Titel ";
      const titleInput = document.createElement("input");
      titleInput.type = "text";
      titleInput.value = photo.title;
      titleInput.maxLength = 60;
      titleInput.required = true;
      titleLabel.append(titleInput);

      const saveButton = document.createElement("button");
      saveButton.type = "submit";
      saveButton.textContent = "Spara titel";

      titleForm.append(titleLabel, saveButton);
      titleForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const { ok, data } = await api(`/api/photos/${photo.id}/title`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: titleInput.value }),
        });
        if (!ok) {
          statusElement.textContent = data.error;
          return;
        }
        loadPhotos();
      });
      item.append(titleForm);
    }

    if (currentUser && (currentUser.id === photo.user_id || currentUser.role === "admin")) {
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.textContent = "Ta bort";
      deleteButton.addEventListener("click", async () => {
        const { ok, data } = await api(`/api/photos/${photo.id}`, { method: "DELETE" });
        if (!ok) {
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