// FIREBASE IMPORTS
// =====================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js";
import {
    getFirestore, doc, getDoc, setDoc, addDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy, limit, collection, onSnapshot
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";
import {
    getAuth,
    signInWithPopup,
    GoogleAuthProvider,
    FacebookAuthProvider,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js";

// =====================================================
// FIREBASE CONFIG
// =====================================================

const firebaseConfig = {
    apiKey: "AIzaSyAsi_WiBKwWyqRCrgDV-urNkksC7n8kdic",
    authDomain: "tarfli.firebaseapp.com",
    databaseURL: "https://tarfli-default-rtdb.firebaseio.com",
    projectId: "tarfli",
    storageBucket: "tarfli.firebasestorage.app",
    messagingSenderId: "879818146182",
    appId: "1:879818146182:web:b300c1e7fe10160afc6c07",
    measurementId: "G-G73SRBEZ5L"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

// دالة إخفاء شاشة التحميل
function hideLoadingScreen() {
    const loader = document.getElementById("app-loading");
    if (loader) loader.style.display = "none";
}

// =====================================================
// VARIABLES
// =====================================================

let currentUser = null;
let selectedRecipient = null;
let messages = [];
let uploadedImageBase64 = null;
let tempAvatarBase64 = null;
let allUsersList = [];
let sentUsers = [];

const presetAvatars = [
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Aiden",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Robot1",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=Luna",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Zoe",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Leo",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Cyber2",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=Mia",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Alex",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Ryan",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Adam",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Sara",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Noah",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=Olivia",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=Layla",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=Yasmine",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Alpha",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Neo",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Cyber",
    "https://api.dicebear.com/7.x/bottts/svg?seed=RoboX"
];

// =====================================================
// START
// =====================================================

document.addEventListener("DOMContentLoaded", async () => {
    renderPresetsGrid();
    convertEmojisToApple();
});

// =====================================================
// GOOGLE / FACEBOOK LOGIN
// =====================================================

document.getElementById("google-login-btn")?.addEventListener("click", () => {
    signInWithPopup(auth, provider)
        .then(() => {
            showToast("تم تسجيل الدخول بنجاح 🚀");
        })
        .catch(error => {
            console.error(error);
            showToast("خطأ تسجيل الدخول بجوجل ❌");
        });
});

document.getElementById("facebook-login-btn")?.addEventListener("click", () => {
    signInWithPopup(auth, facebookProvider)
        .then(() => {
            showToast("تم تسجيل الدخول بنجاح 🚀");
        })
        .catch(error => {
            console.error(error);
            showToast("خطأ تسجيل الدخول بفيسبوك ❌");
        });
});

// =====================================================
// AUTH STATE
// =====================================================

onAuthStateChanged(auth, async user => {
    if (user) {
        await syncUserToDatabase(user);
    } else {
        currentUser = null;
        sentUsers = [];
        document.documentElement.removeAttribute("data-palette");
        document.querySelectorAll(".app-view").forEach(view => {
            view.classList.remove("active");
        });
        document.getElementById("view-auth")?.classList.add("active");

        const nav = document.getElementById("nav-bar");
        if (nav) nav.style.display = "none";

        // إخفاء التحميل في حال عدم وجود مستخدم
        hideLoadingScreen();
    }
});

// =====================================================
// SYNC USER
// =====================================================

async function syncUserToDatabase(user) {
    try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
            currentUser = snap.data();
        } else {
            currentUser = {
                uid: user.uid,
                name: user.displayName || "مستخدم جديد",
                handle: "@" + (user.email ? user.email.split("@")[0] : "user"),
                bio: "واش عينيا أبعثـ(ي) مساج للكراش تاعك و أعتارفـلو بحبك بالسر 👀😍",
                avatar: user.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.uid}`,
                theme: "default"
            };
            await setDoc(userRef, currentUser);
        }

        applySavedTheme(currentUser.theme);
        loadSentUsers();
        initAppUI();
    } catch (err) {
        console.error("Sync error:", err);
    } finally {
        // إخفاء الشاشة دائماً بعد انتهاء جلب البيانات
        hideLoadingScreen();
    }

    const userBioEl = document.getElementById('display-bio');
    if (userBioEl) {
        if (currentUser && currentUser.bio) {
            userBioEl.textContent = currentUser.bio;
        } else {
            userBioEl.textContent = "واش عينيا ابعت(ي) مساج للكراش تاعك 👀";
        }
    }
}

// =====================================================
// THEMES
// =====================================================

function applySavedTheme(themeName) {
    if (themeName && themeName !== "default") {
        document.documentElement.setAttribute("data-palette", themeName);
    } else {
        document.documentElement.removeAttribute("data-palette");
    }
}

// =====================================================
// LOGOUT
// =====================================================

window.handleLogout = async function () {
    try {
        await auth.signOut();

        if (typeof closeSettingsModal === 'function') {
            closeSettingsModal();
        }

        window.location.reload();
    } catch (error) {
        console.error("خطأ أثناء تسجيل الخروج:", error);
    }
};

// =====================================================
// INIT UI
// =====================================================

function initAppUI() {
    document.getElementById("view-auth")?.classList.remove("active");
    updateProfileUI();

    const nav = document.getElementById("nav-bar");
    if (nav) nav.style.display = "flex";

    switchTab("inbox", document.querySelector(".nav-item"));

    fetchCloudMessages();
    fetchAllUsers();
    renderSentUsers();

    const editBioEl = document.getElementById('edit-bio-input');
    const userBioEl = document.getElementById('display-bio');
    if (userBioEl && editBioEl) {
        const newBio = editBioEl.value.trim();
        userBioEl.textContent = newBio || (currentUser ? currentUser.bio : "واش عينيا ابعت(ي) مساج للكراش تاعك 👀");
    }
}

// =====================================================
// PROFILE UI
// =====================================================

function updateProfileUI() {
    if (!currentUser) return;

    const name = document.getElementById("display-name");
    const handle = document.getElementById("display-handle");
    const bio = document.getElementById("display-bio");
    const avatar = document.getElementById("display-avatar");

    if (name) name.innerText = currentUser.name;
    if (handle) handle.innerText = currentUser.handle;
    if (bio) bio.innerText = currentUser.bio;
    if (avatar) avatar.src = currentUser.avatar;
}

// =====================================================
// SAVE SENT USER
// =====================================================

function saveSentUser(user) {
    if (!currentUser || !user) return;

    const exists = sentUsers.some(item => item.uid === user.uid);

    if (!exists) {
        sentUsers.unshift({
            uid: user.uid,
            name: user.name,
            handle: user.handle,
            avatar: user.avatar,
            bio: user.bio || ""
        });
    } else {
        sentUsers = sentUsers.map(item => {
            if (item.uid === user.uid) {
                return {
                    ...item,
                    name: user.name,
                    handle: user.handle,
                    avatar: user.avatar,
                    bio: user.bio || ""
                };
            }
            return item;
        });
    }

    sentUsers = sentUsers.slice(0, 30);
    localStorage.setItem("i3tarfli_sent_users_" + currentUser.uid, JSON.stringify(sentUsers));
    renderSentUsers();
}

// =====================================================
// LOAD SENT USERS
// =====================================================

function loadSentUsers() {
    if (!currentUser) return;
    try {
        const saved = localStorage.getItem("i3tarfli_sent_users_" + currentUser.uid);
        sentUsers = saved ? JSON.parse(saved) : [];
    } catch (error) {
        console.error(error);
        sentUsers = [];
    }
    renderSentUsers();
}

// =====================================================
// RENDER SENT USERS
// =====================================================

window.renderSentUsers = function () {
    const list = document.getElementById("sent-users-list");
    if (!list) return;

    if (!sentUsers || sentUsers.length === 0) {
        list.innerHTML = `
            <div class="glass-card" style="text-align:center; padding:30px 15px;">
                <i class="fa-solid fa-paper-plane" style="font-size:35px; margin-bottom:10px; opacity:.6;"></i>
                <p style="color:var(--text-muted); margin:0;">مازال ما رسلت حتى واحد 📭</p>
            </div>
        `;
        return;
    }

    list.innerHTML = sentUsers.map(user => `
        <div class="glass-card" style="display:flex; align-items:center; gap:12px; margin-bottom:10px; cursor:pointer;" onclick='openSentUser(${JSON.stringify(user)})'>
            <img src="${escapeHtml(user.avatar)}" style="width:50px; height:50px; border-radius:50%; object-fit:cover; flex-shrink:0;">
            <div style="flex:1; min-width:0;">
                <div style="font-weight:800; font-size:15px;">${escapeHtml(user.name)}</div>
                <div style="font-size:12px; color:var(--text-sub); margin-top:3px;">${escapeHtml(user.handle)}</div>
            </div>
            <i class="fa-solid fa-paper-plane" style="opacity:.7;"></i>
        </div>
    `).join("");
};

// =====================================================
// OPEN SENT USER
// =====================================================

window.openSentUser = function (user) {
    if (!user) return;
    selectedRecipient = user;

    const name = document.getElementById("recipient-name");
    const handle = document.getElementById("recipient-handle");
    const avatar = document.getElementById("recipient-avatar");
    const bio = document.getElementById("recipient-bio");

    if (name) name.innerText = `أرسل صراحة إلى: ${user.name}`;
    if (handle) handle.innerText = user.handle;
    if (avatar) avatar.src = user.avatar;
    if (bio) bio.innerText = user.bio || "ما كتبش Bio حتى الآن ✨";

    switchTab("send", null);
};

// =====================================================
// SEND MESSAGE
// =====================================================

window.sendCloudMessage = async function () {
    const input = document.getElementById("send-input");
    const btn = document.getElementById("sendBtn");
    const text = input?.value.trim();

    if (!text && !uploadedImageBase64) {
        showToast("اكتب رسالة ولا أرفق صورة 📩");
        return;
    }

    if (!selectedRecipient) {
        showToast("اختار شخص من البحث أولاً 👀");
        return;
    }

    try {
        if (btn) {
            btn.disabled = true;
            btn.innerText = "جاري الإرسال...";
        }

        await addDoc(collection(db, "messages"), {
            recipientUid: selectedRecipient.uid,
            text: text || "",
            img: uploadedImageBase64 || null,
            time: new Date().toLocaleString(),
            timestamp: Date.now(),
            isPinned: false,
            reply: null
        });

        saveSentUser(selectedRecipient);

        if (input) input.value = "";
        uploadedImageBase64 = null;

        const preview = document.getElementById("image-preview");
        if (preview) {
            preview.src = "";
            preview.style.display = "none";
        }

        showToast("تم إرسال الرسالة 🚀");
        switchTab("sent-users", document.querySelectorAll(".nav-item")[2]);
    } catch (error) {
        console.error(error);
        showToast("فشل إرسال الرسالة ❌");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> إرسال الصراحة الآن';
        }
    }
};

// =====================================================
// FETCH MESSAGES
// =====================================================

window.fetchCloudMessages = function () {
    if (!currentUser) return;

    try {
        const q = query(
            collection(db, "messages"),
            where("recipientUid", "==", currentUser.uid)
        );

        onSnapshot(q, (snapshot) => {
            messages = [];
            snapshot.forEach(item => {
                messages.push({ id: item.id, ...item.data() });
            });

            messages.sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return (b.timestamp || 0) - (a.timestamp || 0);
            });

            renderMessages();
        }, (error) => {
            console.error("خطأ جلب الرسائل:", error);
        });
    } catch (error) {
        console.error("خطأ الاستعلام:", error);
    }
};

// =====================================================
// FETCH USERS
// =====================================================

window.fetchAllUsers = async function () {
    try {
        const snapshot = await getDocs(collection(db, "users"));
        allUsersList = [];
        snapshot.forEach(item => {
            const user = item.data();
            if (currentUser && user.uid !== currentUser.uid) {
                allUsersList.push(user);
            }
        });

        const list = document.getElementById("search-results");
        if (list) {
            list.innerHTML = `<p style="text-align:center; color:var(--text-muted); padding:20px;">اكتب اسم الشخص للبحث عنه...</p>`;
        }
    } catch (error) {
        console.error(error);
    }
};

// =====================================================
// SEARCH
// =====================================================

window.handleSearch = function () {
    const input = document.getElementById("search-input");
    const text = input?.value.toLowerCase().trim();
    const list = document.getElementById("search-results");

    if (!text) {
        if (list) {
            list.innerHTML = `<p style="text-align:center; color:var(--text-muted); padding:20px;">اكتب اسم الشخص للبحث عنه...</p>`;
        }
        return;
    }

    const filtered = allUsersList.filter(user =>
        user.name?.toLowerCase().includes(text) ||
        user.handle?.toLowerCase().includes(text)
    );

    renderUsersList(filtered);
};

// =====================================================
// RENDER USERS
// =====================================================

window.renderUsersList = function (users) {
    const list = document.getElementById("search-results");
    if (!list) return;

    if (!users || users.length === 0) {
        list.innerHTML = `<p style="text-align:center; color:var(--text-muted); padding:20px;">ما لقيتش حتى واحد 🤷</p>`;
        return;
    }

    list.innerHTML = users.map(user => `
        <div class="glass-card" style="display:flex; align-items:center; gap:12px; cursor:pointer; margin-bottom:10px;" onclick='openSendToUser(${JSON.stringify(user)})'>
            <img src="${escapeHtml(user.avatar)}" style="width:45px; height:45px; border-radius:50%; object-fit:cover;">
            <div style="flex:1;">
                <div style="font-weight:bold;">${escapeHtml(user.name)}</div>
                <div style="font-size:12px; color:var(--text-sub);">${escapeHtml(user.handle)}</div>
            </div>
            <i class="fa-solid fa-paper-plane"></i>
        </div>
    `).join("");
};

// =====================================================
// OPEN SEND TO USER
// =====================================================

window.openSendToUser = function (user) {
    selectedRecipient = user;
    const name = document.getElementById("recipient-name");
    const handle = document.getElementById("recipient-handle");
    const avatar = document.getElementById("recipient-avatar");
    const bio = document.getElementById("recipient-bio");

    if (name) name.innerText = `أرسل صراحة إلى: ${user.name}`;
    if (handle) handle.innerText = user.handle;
    if (avatar) avatar.src = user.avatar;
    if (bio) bio.innerText = user.bio || "ما كتبش Bio حتى الآن ✨";

    switchTab("send", null);
};

// =====================================================
// DELETE MESSAGE
// =====================================================

window.deleteCloudMessage = async function (id) {
    try {
        await deleteDoc(doc(db, "messages", id));
        showToast("تم حذف الرسالة 🗑️");
        fetchCloudMessages();
    } catch (error) {
        console.error(error);
    }
};

// =====================================================
// REPLY
// =====================================================

window.updateCloudReply = async function (id, replyText) {
    try {
        await updateDoc(doc(db, "messages", id), { reply: replyText });
        showToast("تم حفظ الرد 💬");
        fetchCloudMessages();
    } catch (error) {
        console.error(error);
    }
};

window.toggleReply = function (id) {
    const form = document.getElementById(`reply-form-${id}`);
    if (!form) return;
    form.style.display = form.style.display === "none" ? "flex" : "none";
};

window.submitReply = function (id) {
    const input = document.getElementById(`reply-input-${id}`);
    const text = input?.value.trim();
    if (text) updateCloudReply(id, text);
};

// =====================================================
// PIN
// =====================================================

window.toggleCloudPin = async function (id, status) {
    try {
        await updateDoc(doc(db, "messages", id), { isPinned: !status });
        fetchCloudMessages();
    } catch (error) {
        console.error(error);
    }
};

// =====================================================
// RENDER MESSAGES
// =====================================================

window.renderMessages = function () {
    const list = document.getElementById("messages-list");
    if (!list) return;

    if (!messages || messages.length === 0) {
        list.innerHTML = `<p style="text-align:center; color:var(--text-muted); padding:20px;">لا توجد رسائل حالياً 😔</p>`;
        return;
    }

    list.innerHTML = messages.map(msg => `
        <div class="glass-card ${msg.isPinned ? "pinned" : ""}">
            ${msg.isPinned ? `<div style="font-size:11px; color:#f59e0b; margin-bottom:6px; font-weight:bold;"><i class="fa-solid fa-thumbtack"></i> مثبتة في الأعلى</div>` : ""}
            <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-sub); margin-bottom:10px;">
                <span>مجهول 🔒</span>
                <span>${escapeHtml(msg.time || "")}</span>
            </div>
            <div style="font-size:15px; margin-bottom:10px;">${escapeHtml(msg.text || "")}</div>
            ${msg.img ? `<img src="${msg.img}" style="width:100%; border-radius:12px; margin-bottom:10px;">` : ""}
            ${msg.reply ? `
                <div class="reply-box">
                    <div class="reply-header"><i class="fa-solid fa-reply"></i> ردك:</div>
                    <div>${escapeHtml(msg.reply)}</div>
                </div>
            ` : `
                <div id="reply-form-${msg.id}" style="display:none; gap:8px; margin-top:10px;">
                    <input type="text" id="reply-input-${msg.id}" class="glass-input" style="margin:0; font-size:12px;" placeholder="اكتب ردك هنا...">
                    <button class="btn-main" style="width:auto; padding:8px 15px;" onclick="submitReply('${msg.id}')">رد</button>
                </div>
            `}
            <div class="card-actions">
                <button class="action-btn ${msg.isPinned ? "active-pin" : ""}" onclick="toggleCloudPin('${msg.id}', ${msg.isPinned})">
                    <i class="fa-solid fa-thumbtack"></i> ${msg.isPinned ? "إلغاء" : "تثبيت"}
                </button>
                <button class="action-btn" onclick="toggleReply('${msg.id}')">
                    <i class="fa-solid fa-comment-dots"></i> ${msg.reply ? "تعديل" : "رد"}
                </button>
                <button class="action-btn" onclick="openStoryModal('${escapeHtml(msg.text || "")}', '${msg.img || ""}', '${escapeHtml(msg.reply || "")}')">
                    <i class="fa-solid fa-share-nodes"></i> ستوري
                </button>
                <button class="action-btn delete" onclick="deleteCloudMessage('${msg.id}')">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        </div>
    `).join("");
};

// =====================================================
// NAVIGATION
// =====================================================

window.switchTab = function (viewName, tabEl) {
    document.querySelectorAll(".app-view").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));

    if (viewName === "inbox") {
        document.getElementById("view-inbox")?.classList.add("active");
        fetchCloudMessages();
    } else if (viewName === "search") {
        document.getElementById("view-search")?.classList.add("active");
        fetchAllUsers();
    } else if (viewName === "sent-users") {
        document.getElementById("view-sent-users")?.classList.add("active");
        renderSentUsers();
    } else if (viewName === "send") {
        document.getElementById("view-send")?.classList.add("active");
    } else if (viewName === "settings") {
        document.getElementById("view-settings")?.classList.add("active");
    } else if (viewName === "premium") {
        document.getElementById("view-premium")?.classList.add("active");
        loadPremiumStatus();
    }

    if (tabEl) tabEl.classList.add("active");
};

// =====================================================
// EDIT PROFILE
// =====================================================

window.openEditModal = function () {
    if (!currentUser) return;
    const name = document.getElementById("edit-name-input");
    const handle = document.getElementById("edit-handle-input");
    const bio = document.getElementById("edit-bio-input");
    const avatar = document.getElementById("edit-preview-avatar");

    if (name) name.value = currentUser.name;
    if (handle) handle.value = currentUser.handle;
    if (bio) bio.value = currentUser.bio;
    tempAvatarBase64 = currentUser.avatar;
    if (avatar) avatar.src = currentUser.avatar;

    document.getElementById("edit-modal")?.classList.add("active");
};

window.closeEditModal = function () {
    document.getElementById("edit-modal")?.classList.remove("active");
};

// =====================================================
// SAVE PROFILE
// =====================================================

window.saveCloudProfile = async function () {
    if (!currentUser) return;
    const name = document.getElementById("edit-name-input")?.value.trim();
    const handle = document.getElementById("edit-handle-input")?.value.trim();
    const bio = document.getElementById("edit-bio-input")?.value.trim();

    if (!name) {
        showToast("دخل الاسم أولاً ❌");
        return;
    }

    const updatedData = {
        name,
        handle: handle.startsWith("@") ? handle : "@" + handle,
        bio,
        avatar: tempAvatarBase64 || currentUser.avatar
    };

    try {
        await updateDoc(doc(db, "users", currentUser.uid), updatedData);
        currentUser = { ...currentUser, ...updatedData };
        updateProfileUI();
        closeEditModal();
        showToast("تم حفظ التعديلات ✨");
    } catch (error) {
        console.error(error);
        showToast("صار خطأ أثناء الحفظ ❌");
    }
};

// =====================================================
// AVATAR UPLOAD
// =====================================================

window.handleAvatarUpload = function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        tempAvatarBase64 = e.target.result;
        const preview = document.getElementById("edit-preview-avatar");
        if (preview) preview.src = tempAvatarBase64;
        showToast("تم تجهيز صورة البروفايل 📸");
    };
    reader.readAsDataURL(file);
};

// =====================================================
// MESSAGE IMAGE
// =====================================================

window.handleImageUpload = function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        uploadedImageBase64 = e.target.result;
        const preview = document.getElementById("image-preview");
        if (preview) {
            preview.src = uploadedImageBase64;
            preview.style.display = "block";
        }
        showToast("تم إرفاق الصورة 📸");
    };
    reader.readAsDataURL(file);
};

// =====================================================
// AVATARS
// =====================================================

function renderPresetsGrid() {
    const container = document.getElementById("presets-container");
    if (!container) return;
    const visibleCount = 4;

    container.innerHTML = presetAvatars.map((url, index) => `
        <img src="${url}" class="preset-avatar avatar-item" data-index="${index}" style="${index >= visibleCount ? "display:none;" : ""}" onclick="selectPresetAvatar('${url}')">
    `).join("");

    if (presetAvatars.length > visibleCount) {
        container.innerHTML += `
            <button type="button" id="show-more-avatars" class="action-btn" style="width:100%; margin-top:6px;" onclick="toggleMoreAvatars()">
                <i class="fa-solid fa-chevron-down"></i> عرض المزيد
            </button>
        `;
    }
}

window.toggleMoreAvatars = function () {
    const avatars = document.querySelectorAll(".avatar-item");
    const button = document.getElementById("show-more-avatars");
    const hidden = [...avatars].filter(avatar => avatar.style.display === "none");

    if (hidden.length > 0) {
        hidden.forEach(avatar => avatar.style.display = "block");
        if (button) button.innerHTML = `<i class="fa-solid fa-chevron-up"></i> إخفاء الأفتارات`;
    } else {
        avatars.forEach((avatar, index) => {
            if (index >= 4) avatar.style.display = "none";
        });
        if (button) button.innerHTML = `<i class="fa-solid fa-chevron-down"></i> عرض المزيد`;
    }
};

window.selectPresetAvatar = function (url) {
    tempAvatarBase64 = url;
    const preview = document.getElementById("edit-preview-avatar");
    if (preview) preview.src = url;
    showToast("تم اختيار الأفتار 🎭");
};

// =====================================================
// THEMES
// =====================================================

window.openPaletteModal = function () {
    document.getElementById("palette-modal")?.classList.add("active");
};

window.closePaletteModal = function () {
    document.getElementById("palette-modal")?.classList.remove("active");
};

window.changePalette = async function (themeName) {
    if (!currentUser) {
        showToast("لازم تسجل الدخول أولاً ❌");
        return;
    }

    try {
        applySavedTheme(themeName);
        await setDoc(doc(db, "users", currentUser.uid), { theme: themeName }, { merge: true });
        currentUser = { ...currentUser, theme: themeName };
        closePaletteModal();
        showToast("تم تغيير الثيم 🎨");
    } catch (error) {
        console.error(error);
        showToast("فشل حفظ الثيم ❌");
    }
};

// =====================================================
// STORY
// =====================================================

window.openStoryModal = function (text, img, reply) {
    if (!currentUser) return;

    document.getElementById("story-user-name").innerText = currentUser.name;
    document.getElementById("story-user-handle").innerText = currentUser.handle;
    document.getElementById("story-user-avatar").src = currentUser.avatar;
    document.getElementById("story-text-content").innerText = text;

    const replyEl = document.getElementById("story-reply-content");
    if (reply && reply !== "null") {
        replyEl.innerText = `💬 ردك: ${reply}`;
        replyEl.style.display = "block";
    } else {
        replyEl.style.display = "none";
    }

    const imgEl = document.getElementById("story-img-content");
    if (img) {
        imgEl.src = img;
        imgEl.style.display = "block";
    } else {
        imgEl.style.display = "none";
    }

    document.getElementById("story-modal")?.classList.add("active");
};

window.closeStoryModal = function () {
    document.getElementById("story-modal")?.classList.remove("active");
};

// =====================================================
// STORY DOWNLOAD
// =====================================================

window.downloadStoryImage = async function () {
    const element = document.getElementById("story-card-element");
    if (!element) {
        showToast("ما لقيتش الستوري ❌");
        return;
    }

    showToast("جاري تجهيز الصورة... ⏳");

    try {
        const rect = element.getBoundingClientRect();
        const canvas = await html2canvas(element, {
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            scale: 4,
            useCORS: true,
            allowTaint: false,
            backgroundColor: null,
            logging: false,
            scrollX: 0,
            scrollY: 0
        });

        const link = document.createElement("a");
        link.download = "i3tarfli-story-hd.png";
        link.href = canvas.toDataURL("image/png", 1);
        document.body.appendChild(link);
        link.click();
        link.remove();
        showToast("تم حفظ الستوري 📸✨");
    } catch (error) {
        console.error(error);
        showToast("صار خطأ في إنشاء الصورة ❌");
    }
};

// =====================================================
// COPY SHARE LINK
// =====================================================

window.copyShareLink = function () {
    navigator.clipboard.writeText(window.location.href)
        .then(() => showToast("تم نسخ الرابط 📋"))
        .catch(() => showToast("ما قدرناش ننسخو الرابط ❌"));
};

// =====================================================
// TOAST
// =====================================================

window.showToast = function (text) {
    const toast = document.getElementById("toast");
    const toastText = document.getElementById("toast-text");
    if (!toast || !toastText) return;

    toastText.innerText = text;
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
};

// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// =====================================================
// APPLE EMOJI
// =====================================================

function convertEmojisToApple(root = document.body) {
    const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode(node) {
                if (!node.nodeValue.trim() || node.parentElement.closest("script, style, textarea, input")) {
                    return NodeFilter.FILTER_REJECT;
                }
                return /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(node.nodeValue)
                    ? NodeFilter.FILTER_ACCEPT
                    : NodeFilter.FILTER_REJECT;
            }
        }
    );

    const nodes = [];
    let node;
    while ((node = walker.nextNode())) {
        nodes.push(node);
    }

    nodes.forEach(textNode => {
        const text = textNode.nodeValue;
        const parts = text.split(/([\p{Emoji_Presentation}\p{Extended_Pictographic}](?:\uFE0F|\u200D[\p{Emoji_Presentation}\p{Extended_Pictographic}])*)/gu);
        const fragment = document.createDocumentFragment();

        parts.forEach(part => {
            if (/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(part)) {
                const span = document.createElement("span");
                span.className = "emoji";
                span.textContent = part;
                fragment.appendChild(span);
            } else {
                fragment.appendChild(document.createTextNode(part));
            }
        });

        textNode.parentNode.replaceChild(fragment, textNode);
    });
}

// =====================================================
// PREMIUM
// =====================================================

let selectedPremiumPlan = null;
let receiptBase64 = null;

window.selectPremiumPlan = function (plan) {
    selectedPremiumPlan = plan;
    document.querySelectorAll(".premium-plan").forEach(btn => btn.classList.remove("selected"));
    const buttons = document.querySelectorAll(".premium-plan");

    if (plan === "week") buttons[0]?.classList.add("selected");
    if (plan === "month") buttons[1]?.classList.add("selected");

    showToast(plan === "week" ? "اخترت Premium أسبوعي 👑" : "اخترت Premium شهري 👑");
    const paymentStep = document.getElementById("premium-payment-step");
    if (paymentStep && paymentStep.style.display !== "none") goToPaymentStep();
};

window.goToPaymentStep = function () {
    if (!currentUser) {
        showToast("لازم تسجل الدخول أولاً ❌");
        return;
    }
    if (!selectedPremiumPlan) {
        showToast("اختار الباقة أولاً 👑");
        return;
    }

    const amount = selectedPremiumPlan === "week" ? "100 دج" : "300 دج";
    const amountText = document.getElementById("premium-amount-text");
    if (amountText) amountText.textContent = amount;

    const step = document.getElementById("premium-payment-step");
    if (step) {
        step.style.display = "block";
        step.scrollIntoView({ behavior: "smooth", block: "start" });
    }
};

window.copyPaymentNumber = function () {
    const raw = document.getElementById("payment-number-text")?.textContent || "";
    const cleaned = raw.replace(/\(.*\)/, "").trim();
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(cleaned)
            .then(() => showToast("تم نسخ رقم التحويل 📋"))
            .catch(() => showToast("تعذر نسخ الرقم ❌"));
    }
};

window.handleReceiptUpload = function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        receiptBase64 = e.target.result;
        const preview = document.getElementById("receipt-preview");
        if (preview) {
            preview.src = receiptBase64;
            preview.style.display = "block";
        }
        showToast("تم إرفاق صورة الوصل 🧾");
    };
    reader.readAsDataURL(file);
};

window.submitPremiumRequest = async function () {
    if (!currentUser) {
        showToast("لازم تسجل الدخول أولاً ❌");
        return;
    }
    if (!selectedPremiumPlan) {
        showToast("اختار الباقة أولاً 👑");
        return;
    }
    if (!receiptBase64) {
        showToast("لازم ترفع صورة وصل التحويل 🧾");
        return;
    }

    const amount = selectedPremiumPlan === "week" ? 100 : 300;
    const note = document.getElementById("receipt-note")?.value.trim() || "";
    const submitBtn = document.getElementById("premium-submit-btn");
    if (submitBtn) submitBtn.disabled = true;

    try {
        await addDoc(collection(db, "premiumRequests"), {
            uid: currentUser.uid,
            userName: currentUser.name || "",
            userHandle: currentUser.handle || "",
            plan: selectedPremiumPlan,
            amount,
            receiptImage: receiptBase64,
            note,
            status: "pending",
            createdAt: Date.now()
        });
        showToast("تم إرسال طلبك، غادي نفعلولك Premium يدوياً خلال ساعات ⏳");
        receiptBase64 = null;
        const noteInput = document.getElementById("receipt-note");
        if (noteInput) noteInput.value = "";
        loadPremiumStatus();
    } catch (error) {
        console.error(error);
        showToast("فشل إرسال الطلب، حاول مرة أخرى ❌");
        if (submitBtn) submitBtn.disabled = false;
    }
};

window.loadPremiumStatus = async function () {
    const statusBox = document.getElementById("premium-status-box");
    const planSection = document.getElementById("premium-plan-section");
    const paymentStep = document.getElementById("premium-payment-step");
    const continueBtn = document.getElementById("premium-continue-btn");

    if (!currentUser || !statusBox) return;

    if (isPremiumActive()) {
        const expiresAt = currentUser.premium?.expiresAt;
        const dateText = expiresAt ? new Date(expiresAt).toLocaleDateString("ar-DZ") : "";

        statusBox.style.display = "block";
        statusBox.innerHTML = `
            <div class="glass-card" style="text-align:center; border:1px solid rgba(16,185,129,.35);">
                <i class="fa-solid fa-circle-check" style="color:#10b981; font-size:22px;"></i>
                <p style="margin:8px 0 0; font-weight:800;">Premium مفعل ✅</p>
                <p style="margin:4px 0 0; font-size:12px; color:var(--text-sub);">صالح لين ${dateText}</p>
            </div>
        `;
        if (planSection) planSection.style.display = "none";
        if (paymentStep) paymentStep.style.display = "none";
        if (continueBtn) continueBtn.style.display = "none";
        return;
    }

    if (planSection) planSection.style.display = "";
    if (continueBtn) continueBtn.style.display = "";

    try {
        const q = query(
            collection(db, "premiumRequests"),
            where("uid", "==", currentUser.uid),
            orderBy("createdAt", "desc"),
            limit(1)
        );
        const snap = await getDocs(q);

        if (snap.empty) {
            statusBox.style.display = "none";
            if (paymentStep) paymentStep.style.display = "none";
            return;
        }

        const req = snap.docs[0].data();
        if (req.status === "pending") {
            statusBox.style.display = "block";
            statusBox.innerHTML = `
                <div class="glass-card" style="text-align:center; border:1px solid rgba(245,158,11,.35);">
                    <i class="fa-solid fa-clock" style="color:#f59e0b; font-size:22px;"></i>
                    <p style="margin:8px 0 0; font-weight:800;">طلبك قيد المراجعة ⏳</p>
                    <p style="margin:4px 0 0; font-size:12px; color:var(--text-sub);">غادي نفعلو حسابك يدوياً بعد التأكد من وصل التحويل</p>
                </div>
            `;
            if (paymentStep) paymentStep.style.display = "none";
            if (continueBtn) continueBtn.style.display = "none";
        } else if (req.status === "rejected") {
            statusBox.style.display = "block";
            statusBox.innerHTML = `
                <div class="glass-card" style="text-align:center; border:1px solid rgba(239,68,68,.35);">
                    <i class="fa-solid fa-circle-xmark" style="color:#ef4444; font-size:22px;"></i>
                    <p style="margin:8px 0 0; font-weight:800;">الطلب السابق مرفوض ❌</p>
                    <p style="margin:4px 0 0; font-size:12px; color:var(--text-sub);">${escapeHtml(req.rejectReason || "تأكد من صورة الوصل وجرب مرة أخرى")}</p>
                </div>
            `;
        } else {
            statusBox.style.display = "none";
        }
    } catch (error) {
        console.error(error);
    }
};

function isPremiumActive() {
    if (!currentUser) return false;
    let premium = currentUser.premium;

    if (!premium) {
        const saved = localStorage.getItem("i3tarfli_premium_" + currentUser.uid);
        if (saved) {
            premium = JSON.parse(saved);
            currentUser.premium = premium;
        }
    }

    if (!premium?.active) return false;

    if (Date.now() >= premium.expiresAt) {
        currentUser.premium = { ...premium, active: false };
        localStorage.setItem("i3tarfli_premium_" + currentUser.uid, JSON.stringify(currentUser.premium));
        return false;
    }

    return true;
}

// =====================================================
// EMAIL & PASSWORD AUTH LOGIC
// =====================================================

let isRegisterMode = false;

window.toggleAuthMode = function () {
    isRegisterMode = !isRegisterMode;

    const subTitle = document.getElementById("auth-sub-title");
    const nameField = document.getElementById("register-name-field");
    const submitBtn = document.getElementById("auth-submit-btn");
    const toggleText = document.getElementById("auth-toggle-text");
    const toggleBtn = document.getElementById("auth-toggle-btn");

    if (isRegisterMode) {
        if (subTitle) subTitle.innerText = "أنشئ حسابك الجديد وابدأ استقبال الرسائل السرية";
        if (nameField) nameField.style.display = "block";
        if (submitBtn) submitBtn.innerText = "إنشاء حساب جديد";
        if (toggleText) toggleText.innerText = "عندك حساب؟";
        if (toggleBtn) toggleBtn.innerText = "تسجيل الدخول";
    } else {
        if (subTitle) subTitle.innerText = "سجل الدخول باش تبدا تستقبل رسائلك السرية";
        if (nameField) nameField.style.display = "none";
        if (submitBtn) submitBtn.innerText = "تسجيل الدخول";
        if (toggleText) toggleText.innerText = "ما عندكش حساب؟";
        if (toggleBtn) toggleBtn.innerText = "إنشاء حساب جديد";
    }
};

window.handleEmailAuth = async function (event) {
    event.preventDefault();

    const email = document.getElementById("auth-email")?.value.trim();
    const password = document.getElementById("auth-password")?.value;
    const name = document.getElementById("auth-name")?.value.trim();

    if (!email || !password) {
        showToast("يرجى ملء جميع الحقول المطلوبة ❌");
        return;
    }

    if (isRegisterMode && !name) {
        showToast("يرجى إدخال الاسم الكامل ❌");
        return;
    }

    const submitBtn = document.getElementById("auth-submit-btn");
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = "جاري المعالجة... ⏳";
    }

    try {
        if (isRegisterMode) {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            await syncUserToDatabase({ ...user, displayName: name });
            showToast("تم إنشاء الحساب بنجاح 🚀");
        } else {
            await signInWithEmailAndPassword(auth, email, password);
            showToast("تم تسجيل الدخول بنجاح 🚀");
        }
    } catch (error) {
        console.error(error);
        let errorMsg = "حدث خطأ أثناء العملية ❌";
        if (error.code === 'auth/email-already-in-use') {
            errorMsg = "البريد الإلكتروني مستخدم بالفعل ❌";
        } else if (error.code === 'auth/invalid-email') {
            errorMsg = "البريد الإلكتروني غير صالحة صيغته ❌";
        } else if (error.code === 'auth/weak-password') {
            errorMsg = "كلمة السر ضعيفة (يجب أن تكون 6 أحرف على الأقل) ❌";
        } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            errorMsg = "البريد الإلكتروني أو كلمة السر غير صحيحة ❌";
        }
        showToast(errorMsg);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = isRegisterMode ? "إنشاء حساب جديد" : "تسجيل الدخول";
        }
    }
};

window.copyProfileLink = function () {
    if (!currentUser) return;
    const profileUrl = window.location.origin + window.location.pathname + "?u=" + currentUser.uid;
    navigator.clipboard.writeText(profileUrl)
        .then(() => showToast("تم نسخ رابط حسابك 📋"))
        .catch(() => showToast("تعذر نسخ الرابط ❌"));
};

// =====================================================
// SETTINGS MODAL LOGIC
// =====================================================

window.openSettingsModal = function () {
    const modal = document.getElementById('settings-modal');
    if (modal) modal.classList.add('active');
};

window.closeSettingsModal = function () {
    const modal = document.getElementById('settings-modal');
    if (modal) modal.classList.remove('active');
};

window.switchToEditProfile = function () {
    closeSettingsModal();
    if (typeof openEditModal === 'function') {
        openEditModal();
    } else {
        const editModal = document.getElementById('edit-modal');
        if (editModal) editModal.classList.add('active');
    }
};
// =====================================================
// SUPPORT MODAL LOGIC
// =====================================================

window.openSupportModal = function () {
    closeSettingsModal(); // إغلاق نافذة الإعدادات الأولى
    const modal = document.getElementById('support-modal');
    if (modal) modal.classList.add('active');
};

window.closeSupportModal = function () {
    const modal = document.getElementById('support-modal');
    if (modal) modal.classList.remove('active');
};