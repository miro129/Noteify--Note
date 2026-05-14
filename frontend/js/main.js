// Noteify Main Application

// Global Variables
let notes = [];
let filteredNotes = [];
let editingIndex = null;
let currentUser = null;
let sortBy = "newest";
let filterByTag = "all";

// DOM Elements
const notesContainer = document.getElementById("notesContainer");
const addNoteBtn = document.getElementById("addNoteBtn");
const searchInput = document.getElementById("searchInput");
const scratchPad = document.getElementById("scratchPad");

// Modal Elements
const noteModal = document.getElementById("noteModal");
const modalTitle = document.getElementById("modalTitle");
const noteTitle = document.getElementById("noteTitle");
const noteBody = document.getElementById("noteBody");
const saveNoteBtn = document.getElementById("saveNoteBtn");
const closeModalBtn = document.getElementById("closeModalBtn");

// Initialization
document.addEventListener("DOMContentLoaded", function () {
  // Check if user is logged in
  currentUser = StorageManager.getCurrentUser();

  if (!currentUser || !localStorage.getItem("noteify_token")) {
    UIManager.showNotification("Please login first", "error");
    window.location.href = "login.html";
    return;
  }

  // Initialize application
  initializeApp();
});

function initializeApp() {
  // Display welcome message
  UIManager.displayWelcomeMessage(currentUser.name);

  // Load user data
  loadUserData();

  // Setup event listeners
  setupEventListeners();

  // Initial render
  renderNotes();
  UIManager.updateNotesCount(notes.length);

  // If opened from file viewer to edit a specific note, handle it now
  try {
    const openId = localStorage.getItem("openNoteIdForEdit");
    if (openId) {
      const idx = notes.findIndex((n) => String(n.id) === String(openId));
      if (idx >= 0) {
        // open edit modal for this note
        editingIndex = idx;
        modalTitle.textContent = "Edit Note";
        noteTitle.value = notes[idx].title;
        noteBody.value = notes[idx].body;
        UIManager.showModal(noteModal);
      }
      localStorage.removeItem("openNoteIdForEdit");
    }
  } catch (e) {
    console.warn("Could not process openNoteIdForEdit", e);
  }

  console.log("Noteify app initialized successfully");
}

function loadUserData() {
  notes = StorageManager.loadUserNotes(currentUser.id);
  filteredNotes = [...notes];

  // Load scratch pad
  if (scratchPad) {
    const scratchContent = StorageManager.loadScratchPad(currentUser.id);
    scratchPad.value = scratchContent;
  }
}

function setupEventListeners() {
  // Note operations
  addNoteBtn.addEventListener("click", openNewNoteModal);
  saveNoteBtn.addEventListener("click", saveNote);
  closeModalBtn.addEventListener("click", closeModal);

  // Search functionality
  searchInput.addEventListener("input", UIManager.debounce(handleSearch, 300));

  // Scratch pad auto-save
  if (scratchPad) {
    scratchPad.addEventListener(
      "input",
      UIManager.debounce(() => {
        StorageManager.saveScratchPad(currentUser.id, scratchPad.value);
      }, 1000),
    );
  }

  // Sort functionality
  const sortSelect = document.getElementById("sortSelect");
  if (sortSelect) {
    sortSelect.addEventListener("change", function () {
      sortBy = this.value;
      renderNotes();
    });
  }

  // Modal close on outside click
  if (noteModal) {
    noteModal.addEventListener("click", function (e) {
      if (e.target === noteModal) {
        closeModal();
      }
    });
  }

  // Templates modal
  const templatesModal = document.getElementById("templatesModal");
  if (templatesModal) {
    templatesModal.addEventListener("click", function (e) {
      if (e.target === templatesModal) {
        TemplatesManager.closeTemplatesModal();
      }
    });
  }

  const closeTemplatesBtn = document.getElementById("closeTemplatesBtn");
  if (closeTemplatesBtn) {
    closeTemplatesBtn.addEventListener(
      "click",
      TemplatesManager.closeTemplatesModal,
    );
  }

  // Tags modal
  const tagsModal = document.getElementById("tagsModal");
  if (tagsModal) {
    tagsModal.addEventListener("click", function (e) {
      if (e.target === tagsModal) {
        TagsManager.closeTagsModal();
      }
    });
  }

  const closeTagsBtn = document.getElementById("closeTagsBtn");
  if (closeTagsBtn) {
    closeTagsBtn.addEventListener("click", TagsManager.closeTagsModal);
  }
}

// Note Operations



  // Tags modal
  const tagsModal = document.getElementById("tagsModal");
  if (tagsModal) {
    tagsModal.addEventListener("click", function (e) {
      if (e.target === tagsModal) {
        TagsManager.closeTagsModal();
      }
    });
  }

  const closeTagsBtn = document.getElementById("closeTagsBtn");
  if (closeTagsBtn) {
    closeTagsBtn.addEventListener("click", TagsManager.closeTagsModal);
  }
}

// Note Operations

function openNewNoteModal() {
  editingIndex = null;
  modalTitle.textContent = "New Note";
  noteTitle.value = "";
  noteBody.value = "";
  UIManager.showModal(noteModal);
  noteTitle.focus();
}

function closeModal() {
  UIManager.hideModal(noteModal);
}

async function saveNote() {
  const title = noteTitle.value.trim();
  const body = noteBody.value.trim();

  if (title === "" || body === "") {
    UIManager.showNotification("Please fill out all fields.", "error");
    return;
  }

  const btn = saveNoteBtn;
  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    if (editingIndex === null) {
      const newNote = await NoteifyAPI.createNote(title, body, []);
      notes.unshift(newNote);
      UIManager.showNotification("Note created successfully!", "success");
    } else {
      const noteId = notes[editingIndex].id;
      const tags = notes[editingIndex].tags || [];
      const updatedNote = await NoteifyAPI.updateNote(noteId, title, body, tags);
      notes[editingIndex] = updatedNote;
      UIManager.showNotification("Note updated successfully!", "success");
    }

    renderNotes();
    UIManager.updateNotesCount(notes.length);
    closeModal();
  } catch (err) {
    UIManager.showNotification(err.message || 'Failed to save note', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save';
  }
}

function handleSearch() {
  const keyword = searchInput.value.toLowerCase().trim();

  if (keyword === "") {
    // Show all notes
    document.querySelectorAll(".note-card").forEach((card) => {
      card.style.display = "block";
    });
    return;
  }

  // Filter notes based on title, body, and tags
  document.querySelectorAll(".note-card").forEach((card) => {
    const noteTitle = card.querySelector("h4").textContent.toLowerCase();
    const noteBody = card.querySelector("p").textContent.toLowerCase();
    const noteTags =
      card.querySelector(".note-tags")?.textContent.toLowerCase() || "";

    const searchText = noteTitle + " " + noteBody + " " + noteTags;
    card.style.display = searchText.includes(keyword) ? "block" : "none";
  });
}

// Rendering

function renderNotes() {
  notesContainer.innerHTML = "";

  if (notes.length === 0) {
    renderEmptyState();
    return;
  }

  // Filter notes by tag first
  let filteredNotes = NotesManager.filterNotesByTag(notes, filterByTag);
  // Sort the filtered notes by most recent activity (createdAt or updatedAt)
  const sortedByActivity = [...filteredNotes].sort((a, b) => {
    const aDate = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const bDate = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return bDate - aDate;
  });

  // Limit to most recent three notes for main page display
  const shownNotes = sortedByActivity.slice(0, 3);

  // Group by tags if sorting by tags (operate on limited set)
  if (sortBy === "tags") {
    renderGroupedNotes(shownNotes);
  } else {
    renderRegularNotes(shownNotes);
  }
}

function renderEmptyState() {
  notesContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #666;">
            <h3>No notes yet</h3>
            <p>Click "Add Note" in the sidebar to create your first note!</p>
        </div>
    `;
}

function renderGroupedNotes(notes) {
  const { groups, untagged } = NotesManager.groupNotesByTag(notes);

  // Render tagged groups
  Object.keys(groups)
    .sort()
    .forEach((tag) => {
      const groupDiv = createTagGroup(tag, groups[tag]);
      notesContainer.appendChild(groupDiv);
    });

function renderNotes() {
  notesContainer.innerHTML = "";

  if (notes.length === 0) {
    renderEmptyState();
    return;
  }

  // Filter notes by tag first
  let filteredNotes = NotesManager.filterNotesByTag(notes, filterByTag);
  // Sort the filtered notes by most recent activity (createdAt or updatedAt)
  const sortedByActivity = [...filteredNotes].sort((a, b) => {
    const aDate = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const bDate = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return bDate - aDate;
  });

  // Limit to most recent three notes for main page display
  const shownNotes = sortedByActivity.slice(0, 3);

  // Group by tags if sorting by tags (operate on limited set)
  if (sortBy === "tags") {
    renderGroupedNotes(shownNotes);
  } else {
    renderRegularNotes(shownNotes);
  }
}

function renderEmptyState() {
  notesContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #666;">
            <h3>No notes yet</h3>
            <p>Click "Add Note" in the sidebar to create your first note!</p>
        </div>
    `;
}

function renderGroupedNotes(notes) {
  const { groups, untagged } = NotesManager.groupNotesByTag(notes);

  // Render tagged groups
  Object.keys(groups)
    .sort()
    .forEach((tag) => {
      const groupDiv = createTagGroup(tag, groups[tag]);
      notesContainer.appendChild(groupDiv);
    });

  // Render untagged notes
  if (untagged.length > 0) {
    const ungroupedDiv = createTagGroup("untagged", untagged, "Untagged Notes");
    notesContainer.appendChild(ungroupedDiv);
  }
}

function createTagGroup(tag, groupNotes, customTitle = null) {
  const groupDiv = document.createElement("div");
  groupDiv.style.cssText = `
        margin-bottom: 30px;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 8px;
        padding: 15px;
        background: rgba(255,255,255,0.02);
    `;

  const tagHeader = document.createElement("h4");
  tagHeader.style.cssText = `
        margin: 0 0 15px 0;
        color: ${tag === "untagged" ? "#999" : "#2dabff"};
        font-size: 16px;
        display: flex;
        align-items: center;
        gap: 8px;
    `;

  if (customTitle) {
    tagHeader.textContent = customTitle + " (" + groupNotes.length + ")";
  } else {
    tagHeader.innerHTML = `
            <span style="background: #2dabff; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px;">
                #${tag}
            </span>
            <span style="color: #ccc; font-size: 14px;">(${groupNotes.length} notes)</span>
        `;
  }

  groupDiv.appendChild(tagHeader);

  const notesGrid = document.createElement("div");
  notesGrid.className = "notes-grid";
  notesGrid.style.display = "grid";
  notesGrid.style.gridTemplateColumns = "repeat(auto-fit, minmax(280px, 1fr))";
  notesGrid.style.gap = "15px";

  groupNotes.forEach((note) => {
    const originalIndex = notes.findIndex((n) => n.id === note.id);
    const noteCard = NotesManager.createNoteCard(note, originalIndex);
    notesGrid.appendChild(noteCard);
  });

  groupDiv.appendChild(notesGrid);
  return groupDiv;
}

function renderRegularNotes(sortedNotes) {
  sortedNotes.forEach((note) => {
    const originalIndex = notes.findIndex((n) => n.id === note.id);
    const noteCard = NotesManager.createNoteCard(note, originalIndex);
    notesContainer.appendChild(noteCard);
  });
}

// Global Handlers (called from other modules)

window.editNoteHandler = function (index) {
  editingIndex = index;
  modalTitle.textContent = "Edit Note";
  noteTitle.value = notes[index].title;
  noteBody.value = notes[index].body;
  UIManager.showModal(noteModal);
  noteTitle.focus();
};

window.deleteNoteHandler = function (index) {
  const note = notes[index];
  if (!confirm('Are you sure you want to delete "' + note.title + '"?')) return;

  notes.splice(index, 1);
  StorageManager.saveUserNotes(currentUser.id, notes);
  renderNotes();
  UIManager.updateNotesCount(notes.length);
  UIManager.showNotification("Note deleted successfully!", "success");
};

window.useTemplateHandler = function (template) {
  editingIndex = null;
  modalTitle.textContent = "New Note from Template";
  noteTitle.value = template.title;
  noteBody.value = template.template;
  UIManager.showModal(noteModal);
  noteTitle.focus();
};

window.selectTagHandler = function (tag) {
  filterByTag = tag;
  renderNotes();
  UIManager.updateFilterStatus(filterByTag, notes);
};

window.clearTagFilterHandler = function () {
  filterByTag = "all";
  renderNotes();
  UIManager.updateFilterStatus(filterByTag, notes);
};

// Global Functions (called from HTML)

function showTemplates() {
  TemplatesManager.showTemplates();
}

function showTagsModal() {
  TagsManager.showTagsModal(notes, filterByTag);
}

function exportNotes() {
  if (notes.length === 0) {
    UIManager.showNotification("No notes to export!", "warning");
    return;
  }

  const exportData = StorageManager.exportNotes(
    currentUser.id,
    currentUser.name,
    notes,
  );
  const filename =
    "noteify-export-" + new Date().toISOString().split("T")[0] + ".json";

  StorageManager.downloadExport(exportData, filename);
  UIManager.showNotification("Notes exported successfully!", "success");
}

async function logout() {
  if (confirm("Are you sure you want to logout?")) {
    if (scratchPad)
      StorageManager.saveScratchPad(currentUser.id, scratchPad.value);

    const token = localStorage.getItem("noteify_token");
    if (token) {
      await fetch("/backend/auth/logout.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }).catch(() => {});
    }

    localStorage.removeItem("noteify_token");
    StorageManager.removeCurrentUser();
    UIManager.showNotification("Logged out successfully!", "success");
    setTimeout(() => (window.location.href = "index.html"), 1000);
  }
}

// ── Profile ────────────────────────────────────────────────────────────────

let pendingAvatarFile = null;
const DEFAULT_AVATAR = "../Static/image/profile.png";

function renderAvatar(el, user) {
  if (!el) return;
  const src = user.avatar || DEFAULT_AVATAR;
  const isLg = el.classList.contains("profile-avatar-lg");
  const size = isLg ? "88px" : "36px";
  el.innerHTML = `<img src="${src}" alt="Profile" style="width:${size};height:${size};object-fit:cover;display:block;border-radius:50%;" />`;
}

function syncAllAvatars() {
  currentUser = StorageManager.getCurrentUser();
  renderAvatar(document.getElementById("profileAvatar"), currentUser);
  const lg = document.getElementById("profileAvatarLg");
  if (lg) renderAvatar(lg, currentUser);
}

function buildProfileModal() {
  const overlay = document.createElement("div");
  overlay.id = "profileModal";
  overlay.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    width: 100vw; height: 100vh;
    background: rgba(0,0,0,0.72);
    backdrop-filter: blur(6px);
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  overlay.innerHTML = `
    <div style="
      width: 420px;
      max-width: 94vw;
      background: #1f2a63;
      border-radius: 18px;
      border: 1px solid rgba(255,255,255,0.12);
      box-shadow: 0 32px 80px rgba(0,0,0,0.65);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: Inter, Arial, sans-serif;
    ">
      <!-- Header -->
      <div style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 24px;
        border-bottom: 1px solid rgba(255,255,255,0.08);
      ">
        <span style="font-size:17px; font-weight:600; color:#fff;">Edit Profile</span>
        <button id="closeProfileBtn" style="
          width:28px; height:28px; border-radius:50%;
          border:1px solid rgba(255,255,255,0.15);
          background:rgba(255,255,255,0.06);
          color:rgba(255,255,255,0.55); font-size:13px;
          cursor:pointer; display:flex; align-items:center; justify-content:center;
          padding:0; transition:0.15s ease;
        ">&#x2715;</button>
      </div>

      <!-- Body -->
      <div style="
        padding: 28px 24px;
        display: flex;
        flex-direction: column;
        gap: 22px;
        overflow-y: auto;
        max-height: 58vh;
      ">
        <!-- Avatar -->
        <div style="display:flex; flex-direction:column; align-items:center; gap:14px;">
          <div class="profile-avatar-lg" id="profileAvatarLg" style="
            width:88px; height:88px; min-width:88px; min-height:88px;
            border-radius:50%; overflow:hidden;
            border:3px solid rgba(255,255,255,0.18);
            background:#1b2256;
          "></div>
          <div style="display:flex; gap:10px;">
            <label for="profileImageInput" style="
              padding:8px 14px; background:#1b2256;
              border:1px solid rgba(255,255,255,0.12); border-radius:8px;
              color:rgba(255,255,255,0.75); font-size:12px; cursor:pointer;
              transition:0.15s ease;
            ">Upload Photo</label>
            <input type="file" id="profileImageInput" accept="image/*" style="display:none;" />
            <button id="profileRemoveBtn" type="button" style="
              padding:8px 14px; background:transparent;
              border:1px solid rgba(255,255,255,0.1); border-radius:8px;
              color:rgba(255,255,255,0.4); font-size:12px; cursor:pointer;
              transition:0.15s ease;
            ">Remove</button>
          </div>
        </div>

        <!-- Name -->
        <div style="display:flex; flex-direction:column; gap:7px;">
          <label style="font-size:12px; font-weight:500; color:rgba(255,255,255,0.55);">Name</label>
          <input id="profileNameInput" type="text" placeholder="Your name" style="
            width:100%; background:#151e4f;
            border:1px solid rgba(255,255,255,0.1); border-radius:10px;
            padding:12px 14px; color:#fff; font-size:14px;
            outline:none; box-sizing:border-box;
          " />
        </div>

        <!-- Email -->
        <div style="display:flex; flex-direction:column; gap:7px;">
          <label style="font-size:12px; font-weight:500; color:rgba(255,255,255,0.55);">Email</label>
          <input id="profileEmailInput" type="email" placeholder="your@email.com" style="
            width:100%; background:#151e4f;
            border:1px solid rgba(255,255,255,0.1); border-radius:10px;
            padding:12px 14px; color:#fff; font-size:14px;
            outline:none; box-sizing:border-box;
          " />
        </div>

        <!-- Password -->
        <div style="display:flex; flex-direction:column; gap:7px;">
          <label style="font-size:12px; font-weight:500; color:rgba(255,255,255,0.55);">
            New Password
            <span style="font-size:11px; color:rgba(255,255,255,0.3); font-weight:400;">(leave blank to keep current)</span>
          </label>
          <input id="profilePasswordInput" type="password" placeholder="••••••••" style="
            width:100%; background:#151e4f;
            border:1px solid rgba(255,255,255,0.1); border-radius:10px;
            padding:12px 14px; color:#fff; font-size:14px;
            outline:none; box-sizing:border-box;
          " />
        </div>
      </div>

      <!-- Footer -->
      <div style="
        display:flex; justify-content:flex-end; gap:10px;
        padding:18px 24px;
        border-top:1px solid rgba(255,255,255,0.08);
      ">
        <button id="saveProfileBtn" style="
          background:linear-gradient(135deg,#2dabff,#1789ff);
          border:none; border-radius:10px;
          color:#fff; font-size:14px; font-weight:600;
          padding:11px 22px; cursor:pointer;
          box-shadow:0 4px 12px rgba(45,171,255,0.3);
          transition:0.15s ease;
        ">Save Changes</button>
        <button id="profileLogoutBtn" type="button" style="
          background:transparent;
          border:1px solid rgba(255,255,255,0.15); border-radius:10px;
          color:rgba(255,255,255,0.6); font-size:14px; font-weight:500;
          padding:11px 20px; cursor:pointer; transition:0.15s ease;
        ">Logout</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  return overlay;
}

function openProfileModal() {
  currentUser = StorageManager.getCurrentUser();
  pendingAvatarFile = null;

  let modal = document.getElementById("profileModal");
  if (!modal) {
    modal = buildProfileModal();
    attachProfileModalEvents(modal);
  }

  document.getElementById("profileNameInput").value = currentUser.name || "";
  document.getElementById("profileEmailInput").value = currentUser.email || "";
  document.getElementById("profilePasswordInput").value = "";
  renderAvatar(document.getElementById("profileAvatarLg"), currentUser);

  modal.style.display = "flex";
}

function attachProfileModalEvents(modal) {
  const closeModal = () => {
    modal.style.display = "none";
  };

  document
    .getElementById("closeProfileBtn")
    .addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  document
    .getElementById("profileImageInput")
    .addEventListener("change", function () {
      const file = this.files[0];
      if (!file) return;
      pendingAvatarFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        const lg = document.getElementById("profileAvatarLg");
        lg.innerHTML = `<img src="${e.target.result}" alt="Preview" style="width:88px;height:88px;object-fit:cover;display:block;border-radius:50%;" />`;
      };
      reader.readAsDataURL(file);
    });

  document.getElementById("profileRemoveBtn").addEventListener("click", () => {
    pendingAvatarFile = null;
    document.getElementById("profileImageInput").value = "";
    const lg = document.getElementById("profileAvatarLg");
    lg.innerHTML = `<img src="${DEFAULT_AVATAR}" alt="Default" style="width:88px;height:88px;object-fit:cover;display:block;border-radius:50%;" />`;
  });

  document.getElementById("profileLogoutBtn").addEventListener("click", logout);

  document
    .getElementById("saveProfileBtn")
    .addEventListener("click", async function () {
      const name = document.getElementById("profileNameInput").value.trim();
      const email = document.getElementById("profileEmailInput").value.trim();
      const password = document.getElementById("profilePasswordInput").value;

      if (!name || !email) {
        UIManager.showNotification("Name and email are required.", "error");
        return;
      }

      const payload = { name, email };
      if (password) payload.password = password;
      if (pendingAvatarFile) payload.avatarFile = pendingAvatarFile;

      this.disabled = true;
      this.textContent = "Saving...";

      try {
        const updated = await NoteifyAPI.updateProfile(payload);
        currentUser = updated;
        syncAllAvatars();
        UIManager.showNotification("Profile updated!", "success");
        closeModal();
      } catch (err) {
        UIManager.showNotification(err.message || "Update failed.", "error");
      } finally {
        this.disabled = false;
        this.textContent = "Save Changes";
      }
    });
}

document.addEventListener("DOMContentLoaded", () => {
  syncAllAvatars();
});
