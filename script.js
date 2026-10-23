// FIREBASE IMPORTS
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js";
import {
    getFirestore, doc, getDoc, setDoc, addDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy, limit, collection, onSnapshot, serverTimestamp
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

// FIREBASE CONFIG
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

function hideLoadingScreen() {
    const loader = document.getElementById("app-loading");
    if (loader) loader.style.display = "none";
}

let currentUser = null;
let selectedRecipient = null;
let messages = [];
let uploadedImageBase64 = null;
let tempAvatarBase64 = null;
let allUsersList = [];
let sentUsers = [];
let currentTargetUserId = null;

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

let isSignUpMode = false;

window.toggleAuthMode = function (e) {
    if (e) e.preventDefault();
    isSignUpMode = !isSignUpMode;

    const submitBtn = document.getElementById("auth-submit-btn");
    const toggleText = document.getElementById("auth-toggle-text");
    const toggleBtn = document.getElementById("auth-toggle-btn");

    if (isSignUpMode) {
        submitBtn.innerText = "إنشاء حساب جديد";
        toggleText.innerText = "عندك حساب بالفعل؟";
        toggleBtn.innerText = "تسجيل الدخول";
    } else {
        submitBtn.innerText = "تسجيل الدخول";
        toggleText.innerText = "ما عندكش حساب؟";
        toggleBtn.innerText = "إنشاء حساب جديد";
    }
};

window.handleEmailAuth = async function (e) {
    e.preventDefault();
    const email = document.getElementById("auth-email")?.value.trim();
    const password = document.getElementById("auth-password")?.value;
    const submitBtn = document.getElementById("auth-submit-btn");

    if (!email || !password) {
        showToast("عمر الإيمايل والمتباس قبل ");
        return;
    }

    if (password.length < 6) {
        showToast("كلمة السر لازم تكون فيها 6 حروف أو أرقام على الأقل ");
        return;
    }

    try {
        if (submitBtn) submitBtn.disabled = true;
        if (isSignUpMode) {
            await createUserWithEmailAndPassword(auth, email, password);
            showToast("تم إنشاء الحساب بنجاح ");
        } else {
            await signInWithEmailAndPassword(auth, email, password);
            showToast("تم تسجيل الدخول بنجاح ");
        }
    } catch (error) {
        console.error("Auth Error:", error);
        if (error.code === 'auth/email-already-in-use') {
            showToast("هذا البريد مسجل به حساب بالفعل ");
        } else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            showToast("الإيمايل أو كلمة السر خاطئة ");
        } else if (error.code === 'auth/invalid-email') {
            showToast("صيغة البريد الإلكتروني غير صحيحة ");
        } else {
            showToast("حدث خطأ في التسجيل ");
        }
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
};

document.addEventListener("DOMContentLoaded", async () => {
    renderPresetsGrid();
    convertEmojisToApple();

    document.getElementById("sendMessageBtn")?.addEventListener("click", sendAnonymousMessage);
    document.getElementById("sendBtn")?.addEventListener("click", sendCloudMessage);

    await loadProfileFromUrl();
});

onAuthStateChanged(auth, async user => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasRecipient = urlParams.get('u');

    if (user) {
        await syncUserToDatabase(user);
        await checkAndSendPendingMessage();
    } else {
        currentUser = null;
        sentUsers = [];
        document.documentElement.removeAttribute("data-palette");

        if (hasRecipient) {
            await loadProfileFromUrl();
        } else {
            document.querySelectorAll(".app-view").forEach(view => view.classList.remove("active"));
            document.getElementById("view-auth")?.classList.add("active");
            const nav = document.getElementById("nav-bar");
            if (nav) nav.style.display = "none";
        }
        hideLoadingScreen();
    }
});

document.getElementById("google-login-btn")?.addEventListener("click", () => {
    signInWithPopup(auth, provider)
        .then(() => showToast("تم تسجيل الدخول بنجاح "))
        .catch(error => {
            console.error(error);
            showToast("خطأ تسجيل الدخول بجوجل ");
        });
});

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
                handle: "@" + (user.email ? user.email.split("@")[0] : "user_" + user.uid.substring(0, 4)),
                bio: "واش عينيا أبعثـ(ي) مساج للكراش تاعك و أعتارفـلو بحبك بالسر ",
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
        hideLoadingScreen();
    }
}

function applySavedTheme(themeName) {
    if (themeName && themeName !== "default") {
        document.documentElement.setAttribute("data-palette", themeName);
    } else {
        document.documentElement.removeAttribute("data-palette");
    }
}

window.openPaletteModal = function () {
    const modal = document.getElementById("palette-modal");
    if (modal) modal.classList.add("active");
};

window.closePaletteModal = function () {
    const modal = document.getElementById("palette-modal");
    if (modal) modal.classList.remove("active");
};

window.changePalette = async function (themeName) {
    applySavedTheme(themeName);
    if (currentUser && currentUser.uid) {
        try {
            await setDoc(doc(db, "users", currentUser.uid), { theme: themeName }, { merge: true });
            currentUser.theme = themeName;
            showToast("تم تغيير ألوان التطبيق ");
        } catch (error) {
            console.error("خطأ في حفظ الثيم:", error);
            showToast("فشل حفظ الثيم ");
        }
    } else {
        showToast("تم تغيير الألوان ");
    }
    closePaletteModal();
};

window.handleLogout = async function () {
    try {
        await signOut(auth);
        if (typeof closeSettingsModal === 'function') closeSettingsModal();
        window.location.reload();
    } catch (error) {
        console.error("خطأ أثناء تسجيل الخروج:", error);
    }
};

function togglePaletteIcon(show) {
    const paletteBtn = document.getElementById("palette-icon-btn");
    if (paletteBtn) paletteBtn.style.display = show ? "flex" : "none";
}

function initAppUI() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('u')) return;

    togglePaletteIcon(true);
    document.getElementById("view-auth")?.classList.remove("active");
    updateProfileUI();

    const nav = document.getElementById("nav-bar");
    if (nav) nav.style.display = "flex";

    switchTab("inbox", document.querySelector(".nav-item"));
    fetchCloudMessages();
    fetchAllUsers();
    renderSentUsers();
}

function updateProfileUI() {
    if (!currentUser) return;
    const name = document.getElementById("display-name");
    const handle = document.getElementById("display-handle");
    const bio = document.getElementById("display-bio");
    const avatar = document.getElementById("display-avatar");

    if (name) name.innerText = currentUser.name;
    if (handle) handle.innerText = currentUser.handle;
    if (bio) bio.innerText = currentUser.bio || "واش عينيا ابعت(ي) مساج للكراش تاعك ";
    if (avatar) avatar.src = currentUser.avatar;
}

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
        sentUsers = sentUsers.map(item => item.uid === user.uid ? { ...item, name: user.name, handle: user.handle, avatar: user.avatar, bio: user.bio || "" } : item);
    }

    sentUsers = sentUsers.slice(0, 30);
    localStorage.setItem("i3tarfli_sent_users_" + currentUser.uid, JSON.stringify(sentUsers));
    renderSentUsers();
}

function loadSentUsers() {
    if (!currentUser) return;
    try {
        const saved = localStorage.getItem("i3tarfli_sent_users_" + currentUser.uid);
        sentUsers = saved ? JSON.parse(saved) : [];
    } catch (error) {
        sentUsers = [];
    }
    renderSentUsers();
}

window.renderSentUsers = function () {
    const list = document.getElementById("sent-users-list");
    if (!list) return;

    if (!sentUsers || sentUsers.length === 0) {
        list.innerHTML = `
            <div class="glass-card" style="text-align:center; padding:30px 15px;">
                <i class="fa-solid fa-paper-plane" style="font-size:35px; margin-bottom:10px; opacity:.6;"></i>
                <p style="color:var(--text-sub); margin:0;">مازال ما رسلت حتى واحد </p>
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
    if (bio) bio.innerText = user.bio || "ما كتبش Bio حتى الآن ";

    switchTab("send", null);
};

window.sendAnonymousMessage = async function () {
    const sendBtn = document.getElementById("sendMessageBtn");
    const messageInput = document.getElementById("anonymousMessageInput");
    const text = messageInput ? messageInput.value.trim() : "";

    if (!text && !uploadedImageBase64) {
        showToast("اكتب رسالة أو أرفق صورة أولاً ");
        return;
    }

    if (!currentTargetUserId) {
        showToast("لم يتم التعرف على المستلم ");
        return;
    }

    try {
        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.innerText = "جاري الإرسال...";
        }

        await addDoc(collection(db, "messages"), {
            recipientUid: currentTargetUserId,
            text: text,
            img: uploadedImageBase64,
            time: new Date().toLocaleString('ar-EG'),
            timestamp: Date.now(),
            isPinned: false,
            reply: null
        });

        if (messageInput) messageInput.value = "";
        uploadedImageBase64 = null;
        const preview = document.getElementById("image-preview");
        if (preview) {
            preview.src = "";
            preview.style.display = "none";
        }

        showToast("تم إرسال رسالتك بنجاح ");
        setTimeout(() => { redirectToAppropriateView(); }, 1200);

    } catch (error) {
        console.error("خطأ أثناء الإرسال:", error);
        showToast("حدث خطأ أثناء الإرسال ");
    } finally {
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> إرسال سرّي';
        }
    }
};

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

async function fetchAllUsers() {
    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        allUsersList = [];
        querySnapshot.forEach((docSnap) => {
            allUsersList.push({ uid: docSnap.id, ...docSnap.data() });
        });
    } catch (error) {
        console.error("خطأ جلب قائمة المستخدمين:", error);
    }
}

window.handleSearch = function () {
    const input = document.getElementById("search-input");
    const text = input?.value.toLowerCase().trim();
    const list = document.getElementById("search-results");

    if (!text) {
        if (list) list.innerHTML = `<p style="text-align:center; color:var(--text-sub); padding:20px;">اكتب اسم الشخص للبحث عنه...</p>`;
        return;
    }

    const filtered = allUsersList.filter(user =>
        user.name?.toLowerCase().includes(text) ||
        user.handle?.toLowerCase().includes(text)
    );

    renderUsersList(filtered);
};

window.renderUsersList = function (users) {
    const list = document.getElementById("search-results");
    if (!list) return;

    if (!users || users.length === 0) {
        list.innerHTML = `<p style="text-align:center; color:var(--text-sub); padding:20px;">ما لقيتش حتى واحد </p>`;
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

window.openSendToUser = function (user) {
    selectedRecipient = user;
    const name = document.getElementById("recipient-name");
    const handle = document.getElementById("recipient-handle");
    const avatar = document.getElementById("recipient-avatar");
    const bio = document.getElementById("recipient-bio");

    if (name) name.innerText = `أرسل صراحة إلى: ${user.name}`;
    if (handle) handle.innerText = user.handle;
    if (avatar) avatar.src = user.avatar;
    if (bio) bio.innerText = user.bio || "ما كتبش Bio حتى الآن ";

    switchTab("send", null);
};

window.deleteCloudMessage = async function (id) {
    try {
        await deleteDoc(doc(db, "messages", id));
        showToast("تم حذف الرسالة ");
        fetchCloudMessages();
    } catch (error) {
        console.error(error);
    }
};

window.updateCloudReply = async function (id, replyText) {
    try {
        await updateDoc(doc(db, "messages", id), { reply: replyText });
        showToast("تم حفظ الرد ");
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

window.toggleCloudPin = async function (id, status) {
    try {
        await updateDoc(doc(db, "messages", id), { isPinned: !status });
        fetchCloudMessages();
    } catch (error) {
        console.error(error);
    }
};

window.renderMessages = function () {
    const list = document.getElementById("messages-list");
    if (!list) return;

    if (!messages || messages.length === 0) {
        list.innerHTML = `<p style="text-align:center; color:var(--text-sub); padding:20px;">لا توجد رسائل حالياً</p>`;
        return;
    }

    list.innerHTML = messages.map(msg => `
        <div class="glass-card ${msg.isPinned ? "pinned" : ""}">
            ${msg.isPinned ? `<div style="font-size:11px; margin-bottom:6px; font-weight:bold;"><i class="fa-solid fa-thumbtack"></i> مثبتة في الأعلى</div>` : ""}
            <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-sub); margin-bottom:10px;">
                <span>مجهول </span>
                <span>${escapeHtml(msg.time || "")}</span>
            </div>
            <div style="font-size:15px; margin-bottom:10px;">${escapeHtml(msg.text || "")}</div>
            ${msg.img ? `<img src="${msg.img}" class="msg-thumb-img" onclick="openImageModal('${msg.img}')">` : ""}
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
                <button class="action-btn delete" onclick="deleteCloudMessage('${msg.id}')">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        </div>
    `).join("");
};

window.openImageModal = function (src) {
    const modal = document.getElementById("image-modal");
    const modalImg = document.getElementById("image-modal-src");
    if (modal && modalImg) {
        modalImg.src = src;
        modal.classList.add("active");
    }
};

window.closeImageModal = function () {
    document.getElementById("image-modal")?.classList.remove("active");
};

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
    }

    if (tabEl) tabEl.classList.add("active");
};

window.openEditModal = function () {
    if (!currentUser) return;
    const name = document.getElementById("edit-name-input");
    const handle = document.getElementById("edit-handle-input");
    const bio = document.getElementById("edit-bio-input");
    const avatar = document.getElementById("edit-preview-avatar");

    if (name) name.value = currentUser.name;
    if (handle) handle.value = currentUser.handle;
    if (bio) bio.value = currentUser.bio || "";
    tempAvatarBase64 = currentUser.avatar;
    if (avatar) avatar.src = currentUser.avatar;

    document.getElementById("edit-modal")?.classList.add("active");
};

window.closeEditModal = function () {
    document.getElementById("edit-modal")?.classList.remove("active");
};

window.saveCloudProfile = async function () {
    if (!currentUser) return;
    const name = document.getElementById("edit-name-input")?.value.trim();
    const handle = document.getElementById("edit-handle-input")?.value.trim();
    const bio = document.getElementById("edit-bio-input")?.value.trim();

    if (!name) {
        showToast("دخل الاسم أولاً ");
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
        showToast("تم حفظ التعديلات ");
    } catch (error) {
        console.error(error);
        showToast("صار خطأ أثناء الحفظ ");
    }
};

window.handleAvatarUpload = function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        tempAvatarBase64 = e.target.result;
        const preview = document.getElementById("edit-preview-avatar");
        if (preview) preview.src = tempAvatarBase64;
        showToast("تم تجهيز صورة البروفايل ");
    };
    reader.readAsDataURL(file);
};

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
        showToast("تم إرفاق الصورة ");
    };
    reader.readAsDataURL(file);
};

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
    showToast("تم اختيار الأفتار ");
};

window.copyProfileLink = function () {
    if (!currentUser) return;
    const rawHandle = currentUser.handle ? currentUser.handle.replace('@', '') : currentUser.uid;
    const profileUrl = `https://akrambaghdali01-ship-it.github.io/?u=${encodeURIComponent(rawHandle)}`;

    navigator.clipboard.writeText(profileUrl)
        .then(() => showToast("تم نسخ رابط حسابك "))
        .catch(() => showToast("تعذر نسخ الرابط "));
};

window.showToast = function (text) {
    const toast = document.getElementById("toast");
    const toastText = document.getElementById("toast-text");
    if (!toast || !toastText) return;

    toastText.innerText = text;
    toast.classList.add("show");
    setTimeout(() => { toast.classList.remove("show"); }, 3000);
};

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function convertEmojisToApple(root = document.body) {
    const walker = document.createTreeWalker(
        root, NodeFilter.SHOW_TEXT,
        {
            acceptNode(node) {
                if (!node.nodeValue.trim() || node.parentElement.closest("script, style, textarea, input")) {
                    return NodeFilter.FILTER_REJECT;
                }
                return /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            }
        }
    );

    const nodes = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);

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

window.openSettingsModal = function () {
    document.getElementById('settings-modal')?.classList.add('active');
};

window.closeSettingsModal = function () {
    document.getElementById('settings-modal')?.classList.remove('active');
};

window.switchToEditProfile = function () {
    closeSettingsModal();
    if (typeof openEditModal === 'function') {
        openEditModal();
    } else {
        document.getElementById('edit-modal')?.classList.add('active');
    }
};

window.openSupportModal = function () {
    closeSettingsModal();
    document.getElementById('support-modal')?.classList.add('active');
};

window.closeSupportModal = function () {
    document.getElementById('support-modal')?.classList.remove('active');
};

async function checkAndSendPendingMessage() {
    const savedMsg = localStorage.getItem("pending_anonymous_msg");
    if (!savedMsg || !currentUser) return;

    try {
        const msgData = JSON.parse(savedMsg);
        await addDoc(collection(db, "messages"), {
            recipientUid: msgData.recipientUid,
            text: msgData.text,
            img: msgData.img,
            time: msgData.time || new Date().toLocaleString('ar-EG'),
            timestamp: Date.now(),
            isPinned: false,
            reply: null
        });

        localStorage.removeItem("pending_anonymous_msg");
        showToast("تم إرسال رسالتك المعلقة بنجاح ");
    } catch (err) {
        console.error("Error sending pending message:", err);
    }
}

async function loadProfileFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const userParam = urlParams.get('u');

    if (userParam) {
        try {
            const formattedHandle = userParam.startsWith('@') ? userParam : '@' + userParam;

            let q = query(collection(db, "users"), where("handle", "==", formattedHandle), limit(1));
            let querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                q = query(collection(db, "users"), where("handle", "==", userParam), limit(1));
                querySnapshot = await getDocs(q);
            }

            if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0];
                currentTargetUserId = userDoc.id;
                setupVisitorUI(userDoc.data());
            } else {
                const docRef = doc(db, "users", userParam);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    currentTargetUserId = docSnap.id;
                    setupVisitorUI(docSnap.data());
                } else {
                    showToast("المستخدم غير موجود ");
                }
            }
        } catch (error) {
            console.error("خطأ في تحميل البروفايل عبر الرابط:", error);
        } finally {
            hideLoadingScreen();
        }
    }
}

function setupVisitorUI(userData) {
    document.body.classList.add("visitor-mode");

    const titleEl = document.getElementById("targetUserTitle");
    const sendCard = document.getElementById("anonymousSendCard");

    const profileNameEl = document.getElementById("visitor-display-name") || document.getElementById("display-name");
    const profileHandleEl = document.getElementById("visitor-display-handle") || document.getElementById("display-handle");
    const profileBioEl = document.getElementById("visitor-display-bio") || document.getElementById("display-bio");
    const profileAvatarEl = document.getElementById("visitor-display-avatar") || document.getElementById("display-avatar");

    if (profileNameEl) profileNameEl.innerText = userData.name || "مستخدم";
    if (profileHandleEl) profileHandleEl.innerText = userData.handle || "";
    if (profileBioEl) profileBioEl.innerText = userData.bio || "";
    if (profileAvatarEl && userData.avatar) profileAvatarEl.src = userData.avatar;

    if (titleEl) {
        titleEl.innerText = `أرسل رسالة سرية لـ ${userData.name || userData.handle || ""}`;
    }

    if (sendCard) {
        sendCard.style.display = "block";
    }
    hideLoadingScreen();
}

function redirectToAppropriateView() {
    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);

    if (auth.currentUser) {
        document.querySelectorAll(".app-view").forEach(view => view.classList.remove("active"));
        document.getElementById("view-inbox")?.classList.add("active");

        const nav = document.getElementById("nav-bar");
        if (nav) nav.style.display = "flex";

        const messagesList = document.getElementById("messages-list");
        if (messagesList) messagesList.style.display = "block";

        const copyBtn = document.getElementById("copy-link-btn");
        if (copyBtn) copyBtn.style.display = "flex";

        const sendCard = document.getElementById("anonymousSendCard");
        if (sendCard) sendCard.style.display = "none";

        updateProfileUI();
        fetchCloudMessages();
    } else {
        window.location.href = cleanUrl;
    }
}

window.sendCloudMessage = async function () {
    const sendBtn = document.getElementById("sendBtn");
    if (sendBtn && sendBtn.disabled) return;

    const input = document.getElementById("send-input");
    const text = input ? input.value.trim() : "";

    if (!text && !uploadedImageBase64) {
        showToast("اكتب رسالة أو أرفق صورة على الأقل ");
        return;
    }

    if (!selectedRecipient) {
        showToast("لم يتم تحديد المستلم ");
        return;
    }

    try {
        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.innerText = "جاري الإرسال...";
        }

        await addDoc(collection(db, "messages"), {
            recipientUid: selectedRecipient.uid,
            text: text,
            img: uploadedImageBase64,
            time: new Date().toLocaleString('ar-EG'),
            timestamp: Date.now(),
            isPinned: false,
            reply: null
        });

        if (input) input.value = "";
        uploadedImageBase64 = null;
        const preview = document.getElementById("image-preview");
        if (preview) {
            preview.src = "";
            preview.style.display = "none";
        }

        showToast("تم إرسال الرسالة بنجاح ");
        saveSentUser(selectedRecipient);

        setTimeout(() => { switchTab("sent-users", null); }, 1000);

    } catch (error) {
        console.error("خطأ الإرسال:", error);
        showToast("حدث خطأ أثناء الإرسال ");
    } finally {
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> إرسال الآن';
        }
    }
};
