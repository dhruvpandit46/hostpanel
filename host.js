// ✅ Firebase SDK Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// ✅ Firebase Config (Fixed bucket name)
const firebaseConfig = {
  apiKey: "AIzaSyCLRpi50-Tn0JVUqowd3wR11hg9XZ1zCQc",
  authDomain: "anique-dialer.firebaseapp.com",
  databaseURL: "https://anique-dialer-default-rtdb.firebaseio.com",
  projectId: "anique-dialer",
  storageBucket: "anique-dialer.firebasestorage.app", // ✅ CORRECT bucket
  messagingSenderId: "105864685118",
  appId: "1:105864685118:web:2d32f8a0fc47ff77d8136f",
  measurementId: "G-PKHZF7JCVH",
};

// ✅ Initialize Firebase and Storage
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app, "gs://anique-dialer.firebasestorage.app"); // ✅ Explicitly correct

// 🎥 Create New Playlist
window.createPlaylist = async () => {
  const input = document.getElementById("playlistName");
  const name = input.value.trim().toLowerCase();
  if (!name) return alert("Please enter a playlist name.");

  const refDoc = doc(db, "playlists", name);
  const exists = await getDoc(refDoc);
  if (exists.exists()) {
    alert("Playlist already exists.");
    return;
  }

  await setDoc(refDoc, { videos: [] });
  alert("✅ Playlist created!");
  input.value = "";
  refreshPlaylists();
};

// 📤 Upload Video to Playlist
window.uploadVideo = async () => {
  const fileInput = document.getElementById("videoFile");
  const titleInput = document.getElementById("videoTitle");
  const playlist = document.getElementById("playlistSelect").value;

  const file = fileInput.files[0];
  const title = titleInput.value.trim();

  if (!file || !title || !playlist) {
    alert("Please complete all fields.");
    return;
  }

  const validTypes = ["video/mp4", "video/webm"];
  if (!validTypes.includes(file.type)) {
    alert("Only MP4 or WebM files are supported.");
    return;
  }

  const uniqueName = `${Date.now()}_${Math.floor(Math.random() * 9999)}_${file.name.slice(-40)}`;
  const storageRef = ref(storage, `videos/${uniqueName}`);
  const uploadTask = uploadBytesResumable(storageRef, file);

  uploadTask.on(
    "state_changed",
    (snap) => {
      const progress = Math.floor((snap.bytesTransferred / snap.totalBytes) * 100);
      console.log(`📶 Uploading: ${progress}%`);
    },
    (err) => {
      console.error("❌ Upload error:", err);
      alert("Upload failed.");
    },
    async () => {
      const url = await getDownloadURL(uploadTask.snapshot.ref);

      const refDoc = doc(db, "playlists", playlist);
      const snap = await getDoc(refDoc);
      const data = snap.data();
      const videos = data.videos || [];

      videos.push({ title, url, path: `videos/${uniqueName}` });
      await updateDoc(refDoc, { videos });

      alert("✅ Video uploaded!");
      fileInput.value = "";
      titleInput.value = "";
      refreshPlaylists();
    }
  );
};

// 🔁 Refresh Playlist View
async function refreshPlaylists() {
  const select = document.getElementById("playlistSelect");
  const manager = document.getElementById("playlistManager");
  const prev = select.value;

  select.innerHTML = `<option value="">-- Select Playlist --</option>`;
  manager.innerHTML = "";

  const snap = await getDocs(collection(db, "playlists"));
  const available = [];

  for (const docSnap of snap.docs) {
    const name = docSnap.id;
    available.push(name);
    const { videos = [] } = docSnap.data();

    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);

    const block = document.createElement("div");
    block.className = "playlist-block";
    block.innerHTML = `<h3>${name}</h3>`;

    videos.forEach((vid, i) => {
      const id = `title-${encodeURIComponent(name)}-${i}`;
      const item = document.createElement("div");
      item.className = "video-item";
      item.innerHTML = `
        <video src="${vid.url}" controls width="250"></video>
        <input type="text" value="${vid.title}" id="${id}" />
        <div class="video-controls">
          <button onclick="saveEdit('${name}', ${i})">💾 Save</button>
          <button onclick="deleteVideo('${name}', ${i})">🗑 Delete</button>
        </div>
      `;
      block.appendChild(item);
    });

    manager.appendChild(block);
  }

  if (available.includes(prev)) {
    select.value = prev;
  }
}

// 💾 Save Edited Title
window.saveEdit = async (playlist, index) => {
  const input = document.getElementById(`title-${encodeURIComponent(playlist)}-${index}`);
  const newTitle = input.value.trim();
  if (!newTitle) return alert("Title cannot be empty.");

  const refDoc = doc(db, "playlists", playlist);
  const snap = await getDoc(refDoc);
  const data = snap.data();
  const videos = data.videos || [];

  videos[index].title = newTitle;
  await updateDoc(refDoc, { videos });

  alert("✅ Title updated!");
};

// ❌ Delete a Video
window.deleteVideo = async (playlist, index) => {
  if (!confirm("Are you sure you want to delete this video?")) return;

  const refDoc = doc(db, "playlists", playlist);
  const snap = await getDoc(refDoc);
  const data = snap.data();
  const videos = data.videos || [];

  const filePath = videos[index]?.path;
  if (filePath) {
    const refFile = ref(storage, filePath);
    await deleteObject(refFile).catch(() =>
      console.warn("⚠️ File may have already been deleted from storage.")
    );
  }

  videos.splice(index, 1);
  await updateDoc(refDoc, { videos });

  alert("🗑 Video deleted.");
  refreshPlaylists();
};

// 🚀 Init
window.onload = refreshPlaylists;
