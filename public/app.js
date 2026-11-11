//Fetch wrapper, kollar nätverksfel och inte giltiga json retrun ok och json
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

//gör css filter från namn och styrka(browser funktion)
function filterCss(filter, amount) {
  return filter === "none" ? "none" : `${filter}(${amount})`;
}

//Ritar ett fotos sticker som ett layer(span)
function stickerLayer(stickers) {
  const layer = document.createElement("div");
  layer.className = "sticker-layer";
  for (const sticker of stickers) {
    const span = document.createElement("span");
    span.className = "sticker";
    span.textContent = sticker.content;
    span.style.left = `${sticker.x * 100}%`;
    span.style.top = `${sticker.y * 100}%`;
    layer.append(span);
  }
  return layer;
}

// referenser till elements på sidan
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
const editorPhoto = document.getElementById("editor-photo");
let editingPhoto = null;

//öppnar editorn för ett foto
function openEditor(photo) {
  editingPhoto = photo;
  editorStatus.textContent = "";
  overview.hidden = true;
  editor.hidden = false;
  editorTitle.textContent = photo.title;
  editorImage.src = photo.file_path;
  editorImage.alt = photo.title;
  editorPhoto.replaceChildren(editorImage, stickerLayer(photo.stickers));
  filterSelect.value = photo.filter;
  filterAmount.value = Math.round(photo.filter_amount * 100);
  updatePreview();
}

//visar filter live i editorn
function updatePreview() {
  editorImage.style.filter = filterCss(filterSelect.value, Number(filterAmount.value) / 100);
}

//lyssnare till välja filter 
filterSelect.addEventListener("change", () => {
  if (filterSelect.value !== "none" && Number(filterAmount.value) === 0) {
    filterAmount.value = 100;
  }
  updatePreview();
});
//slider styrka filter
filterAmount.addEventListener("input", updatePreview);

//sparar filter till server
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

let selectedSticker = "⭐";

//lyssanre för klick på fotot för att placera sticker
editorPhoto.addEventListener("click", async (event) => {
  const rect = editorImage.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;

  const { ok, data } = await api(`/api/photos/${editingPhoto.id}/stickers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: selectedSticker, x, y }),
  });
  if (!ok) {
    editorStatus.textContent = data.error;
    return;
  }
  editingPhoto.stickers.push({ id: data.id, kind: "emoji", content: selectedSticker, x, y, scale: 1 });
  editorPhoto.replaceChildren(editorImage, stickerLayer(editingPhoto.stickers));
});

//tillbaka knapp 
editorBack.addEventListener("click", () => {
  editor.hidden = true;
  overview.hidden = false;
  loadPhotos();
});

//Tar bort den senaste stickern via id i databsen
const stickerUndo = document.getElementById("sticker-undo");
stickerUndo.addEventListener("click", async () => {
  const last = editingPhoto.stickers[editingPhoto.stickers.length - 1];
  if (!last) {
    editorStatus.textContent = "Inga klistermärken att ta bort.";
    return;
  }
  const { ok, data } = await api(`/api/stickers/${last.id}`, { method: "DELETE" });
  if (!ok) {
    editorStatus.textContent = data.error;
    return;
  }
  editingPhoto.stickers.pop();
  editorPhoto.replaceChildren(editorImage, stickerLayer(editingPhoto.stickers));
});


//sticker array, bygg en knapp för varje  emoji
const stickerChoices = ["⭐", "❤️", "😎", "🎩", "🎃", "👻", "🔥", "🎉"];
const stickerPalette = document.getElementById("sticker-palette");

for (const emoji of stickerChoices) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = emoji;
  button.setAttribute("aria-label", `Klistermärke ${emoji}`);
  button.setAttribute("aria-pressed", String(emoji === selectedSticker));
  button.addEventListener("click", () => {
    selectedSticker = emoji;
    for (const other of stickerPalette.children) {
      other.setAttribute("aria-pressed", String(other === button));
    }
  });
  stickerPalette.append(button);
}

//visar user och gömmer log in etc
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

//kolla vem som är inloggad
async function loadMe() {
  const { ok, data } = await api("/api/me");
  if (!ok) {
    statusText.textContent = data.error;
    return;
  }
  showUser(data.user);
}

loadMe();

//logga in visa en användare eller error
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

//log out och visa log in vy
document.getElementById("logout-button").addEventListener("click", async () => {
  const { ok, data } = await api("/api/logout", { method: "POST" });
  if (!ok) {
    uploadStatus.textContent = data.error;
    return;
  }
  loginForm.reset();
  showUser(null);
});


//Registrera och skapa konto
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

//fil väljare
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

//referenser till listor och status på sidan
const gallery = document.getElementById("gallery");
const galleryStatus = document.getElementById("gallery-status");
const myPhotos = document.getElementById("my-photos");
const myStatus = document.getElementById("my-status");
const searchInput = document.getElementById("search-input");
const sortSelect = document.getElementById("sort-select");
const adminPanel = document.getElementById("admin-panel");
const adminStatus = document.getElementById("admin-status");
const adminList = document.getElementById("admin-list");

//laddar och visar mina foton
function loadMyPhotos() {
  renderPhotos("/api/photos?mine=1", myPhotos, myStatus, "Du har inga bilder än.", true);
}
//laddar publicerade bilder i gallery
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

//Ladda foton för moderering
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

    const caption = document.createElement("figcaption");
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

    const frame = document.createElement("div");
    frame.className = "photo-frame";
    frame.append(img, stickerLayer(photo.stickers));

    const figure = document.createElement("figure");
    figure.append(frame, caption);

    const actions = document.createElement("div");
    actions.className = "actions";
    actions.append(toggleButton);

    item.append(figure, actions);
    adminList.append(item);
  }
}

//laddar flera fotoladdare
function loadPhotos() {
  loadMyPhotos();
  loadGallery();
  const isAdmin = currentUser && currentUser.role === "admin";
  adminPanel.hidden = !isAdmin;
  if (isAdmin) {
    loadAdmin();
  }
}

//sök
let searchTimer;
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadGallery, 300);
});
//ändrar ordningen (sortering)
sortSelect.addEventListener("change", loadGallery);

//Bygger foto kort och knappar
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

    const caption = document.createElement("figcaption");
    caption.textContent = `${photo.title} av ${photo.username}`;
    if (showStatus) {
      caption.textContent += photo.published ? " (publicerad)" : " (privat)";
    }

    const frame = document.createElement("div");
    frame.className = "photo-frame";
    frame.append(img, stickerLayer(photo.stickers));

    const figure = document.createElement("figure");
    figure.append(frame, caption);

    const actions = document.createElement("div");
    actions.className = "actions";

    item.append(figure, actions);

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
      actions.append(publishButton);

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.textContent = "Redigera";
      editButton.addEventListener("click", () => openEditor(photo));
      actions.append(editButton);
    }

    if (showStatus) {
      const titleForm = document.createElement("form");

      const titleLabel = document.createElement("label");
      titleLabel.textContent = "Titel ";
      const titleInput = document.createElement("input");
      titleInput.type = "text";
      titleInput.name = "title";
      titleInput.autocomplete = "off";
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
      actions.append(titleForm);
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
      actions.append(deleteButton);
    }

    list.append(item);
  }
}