import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc,
  query, orderBy, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// Mantém a configuração do seu projeto Firebase.
const firebaseConfig = {
  apiKey: "AIzaSyBi1ooFkGRv4YQwfwmiBoNJpts2jpgL0x8",
  authDomain: "among-us-3f840.firebaseapp.com",
  projectId: "among-us-3f840",
  storageBucket: "among-us-3f840.firebasestorage.app",
  messagingSenderId: "772719111558",
  appId: "1:772719111558:web:0a633439ccef81b7bdd007"
};

const $ = id => document.getElementById(id);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let currentUser = null;
let activeSpaceId = null;
let stopLetters = null;
let lettersCache = [];
let incomingLetter = null;
let toastTimer = null;

function say(id, message) {
  const el = $(id);
  if (el) el.textContent = message || "";
}
function setSignedIn(signedIn) {
  $("auth-screen").hidden = signedIn;
  $("app-screen").hidden = !signedIn;
}
function friendlyError(error) {
  const messages = {
    "auth/email-already-in-use": "Este e-mail já tem uma conta. Tente entrar.",
    "auth/invalid-email": "Confira o formato do e-mail.",
    "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/network-request-failed": "Falha de conexão. Tente novamente.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco e tente novamente."
  };
  return messages[error.code] || "Não foi possível concluir. Confira os dados e tente novamente.";
}
function goTo(page) {
  document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.page === page));
  document.querySelectorAll(".page").forEach(p => {
    const active = p.id === `page-${page}`;
    p.hidden = !active;
    p.classList.toggle("active-page", active);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}
document.querySelectorAll(".nav-item").forEach(b => b.addEventListener("click", () => goTo(b.dataset.page)));
document.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => goTo(b.dataset.go)));

function makeSpaceCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, b => chars[b % chars.length]).join("");
}
function displayName(email) {
  if (!email) return "Sua pessoa especial";
  const first = email.split("@")[0].replace(/[._-]+/g, " ");
  return first.charAt(0).toUpperCase() + first.slice(1);
}
function setSpaceState(hasSpace) {
  $("no-space").hidden = hasSpace;
  $("has-space").hidden = !hasSpace;
}
async function loadUserSpace() {
  activeSpaceId = null;
  if (stopLetters) { stopLetters(); stopLetters = null; }
  lettersCache = [];
  $("letters-list").innerHTML = '<div class="empty-state"><div>✉</div><p>As cartinhas de vocês vão aparecer aqui.</p><span>A primeira pode ser escrita agora. ♡</span></div>';
  $("letter-count").textContent = "0";
  setSpaceState(false);
  const userSnap = await getDoc(doc(db, "users", currentUser.uid));
  if (!userSnap.exists() || !userSnap.data().spaceId) {
    say("member-status", "");
    return;
  }
  activeSpaceId = userSnap.data().spaceId;
  const spaceSnap = await getDoc(doc(db, "spaces", activeSpaceId));
  if (!spaceSnap.exists()) { activeSpaceId = null; return; }
  setSpaceState(true);
  $("current-space-code").textContent = activeSpaceId;
  const members = spaceSnap.data().members || [];
  say("member-status", members.length >= 2 ? "♡ Vocês dois já estão neste espaço." : "Aguardando a outra pessoa aceitar o convite...");
  listenForLetters();
}
function renderLetters() {
  const list = $("letters-list");
  list.replaceChildren();
  $("letter-count").textContent = String(lettersCache.length);
  if (!lettersCache.length) {
    list.innerHTML = '<div class="empty-state"><div>✉</div><p>As cartinhas de vocês vão aparecer aqui.</p><span>A primeira pode ser escrita agora. ♡</span></div>';
    return;
  }
  lettersCache.forEach((item, index) => {
    const data = item.data;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "letter-tile";
    button.style.animationDelay = `${Math.min(index * 55, 250)}ms`;
    const title = document.createElement("h4");
    title.textContent = data.title || "Uma cartinha";
    const meta = document.createElement("small");
    const date = data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString("pt-BR") : "agora";
    meta.textContent = `De ${data.senderName || displayName(data.senderEmail)} · ${date}`;
    button.append(title, meta);
    button.addEventListener("click", () => openLetter(data));
    list.append(button);
  });
}
function openLetter(data) {
  $("modal-title").textContent = data.title || "Uma cartinha";
  $("modal-meta").textContent = `De ${data.senderName || displayName(data.senderEmail)} · ${data.createdAt?.toDate ? data.createdAt.toDate().toLocaleString("pt-BR") : "agora"}`;
  $("modal-body").textContent = data.body || "";
  $("letter-modal").hidden = false;
}
function closeLetter() { $("letter-modal").hidden = true; }
$("close-letter").addEventListener("click", closeLetter);
$("letter-modal").addEventListener("click", e => { if (e.target === $("letter-modal")) closeLetter(); });

function showIncoming(data) {
  incomingLetter = data;
  $("incoming-title").textContent = data.title || "Uma cartinha para você";
  $("incoming-from").textContent = `${data.senderName || displayName(data.senderEmail)} escreveu para você.`;
  $("incoming-toast").hidden = false;
  $("unread-dot").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $("incoming-toast").hidden = true; }, 14000);
}
$("dismiss-incoming").addEventListener("click", () => {
  $("incoming-toast").hidden = true;
  clearTimeout(toastTimer);
});
$("open-incoming").addEventListener("click", () => {
  $("incoming-toast").hidden = true;
  goTo("letters");
  if (incomingLetter) openLetter(incomingLetter);
  $("unread-dot").hidden = true;
});

function listenForLetters() {
  if (stopLetters) stopLetters();
  let firstSnapshot = true;
  const lettersQuery = query(collection(db, "spaces", activeSpaceId, "letters"), orderBy("createdAt", "desc"));
  stopLetters = onSnapshot(lettersQuery, snapshot => {
    const addedByOther = [];
    snapshot.docChanges().forEach(change => {
      if (change.type === "added" && !firstSnapshot) {
        const data = change.doc.data();
        if (data.senderUid !== currentUser.uid) addedByOther.push(data);
      }
    });
    firstSnapshot = false;
    lettersCache = snapshot.docs.map(d => ({ id: d.id, data: d.data() }));
    renderLetters();
    if (addedByOther.length) showIncoming(addedByOther[addedByOther.length - 1]);
  }, error => {
    say("letter-message", "Não foi possível carregar as cartas. Confira as regras do Firestore.");
    console.error(error);
  });
}

$("signup-btn").addEventListener("click", async () => {
  const email = $("email").value.trim();
  const password = $("password").value;
  if (!email || !password) return say("auth-message", "Preencha seu e-mail e sua senha primeiro.");
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    say("auth-message", "Conta criada! Agora vamos preparar o cantinho de vocês. ♡");
  } catch (e) { say("auth-message", friendlyError(e)); }
});
$("login-btn").addEventListener("click", async () => {
  const email = $("email").value.trim();
  const password = $("password").value;
  if (!email || !password) return say("auth-message", "Preencha seu e-mail e sua senha primeiro.");
  try { await signInWithEmailAndPassword(auth, email, password); }
  catch (e) { say("auth-message", friendlyError(e)); }
});
$("logout-btn").addEventListener("click", () => signOut(auth));

$("create-space-btn").addEventListener("click", async () => {
  try {
    const code = makeSpaceCode();
    await setDoc(doc(db, "spaces", code), {
      owner: currentUser.uid, members: [currentUser.uid], createdAt: serverTimestamp()
    });
    await setDoc(doc(db, "users", currentUser.uid), { spaceId: code }, { merge: true });
    await loadUserSpace();
    say("space-message", "Nosso cantinho foi criado! Compartilhe o convite. ♡");
  } catch (e) {
    say("space-message", "Não foi possível criar o espaço. Confira as regras do Firestore.");
    console.error(e);
  }
});
$("join-space-btn").addEventListener("click", async () => {
  try {
    const code = $("space-code").value.trim().toUpperCase();
    if (!code) return say("space-message", "Cole o código do convite primeiro.");
    const ref = doc(db, "spaces", code);
    const snap = await getDoc(ref);
    if (!snap.exists()) return say("space-message", "Esse convite não foi encontrado.");
    const members = snap.data().members || [];
    if (members.includes(currentUser.uid)) {
      await setDoc(doc(db, "users", currentUser.uid), { spaceId: code }, { merge: true });
    } else {
      if (members.length >= 2) return say("space-message", "Este cantinho já tem duas pessoas.");
      await updateDoc(ref, { members: [...members, currentUser.uid] });
      await setDoc(doc(db, "users", currentUser.uid), { spaceId: code }, { merge: true });
    }
    await loadUserSpace();
    say("space-message", "Vocês estão no mesmo cantinho. ♡");
  } catch (e) {
    say("space-message", "Não foi possível entrar. Confira o código e as regras do Firestore.");
    console.error(e);
  }
});
$("copy-code-btn").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(activeSpaceId);
    say("space-message", "Convite copiado! ♡");
  } catch {
    say("space-message", `Copie o código: ${activeSpaceId}`);
  }
});

$("letter-form").addEventListener("submit", async event => {
  event.preventDefault();
  if (!activeSpaceId) {
    say("letter-message", "Primeiro criem ou entrem no cantinho de vocês.");
    goTo("space");
    return;
  }
  const title = $("letter-title").value.trim();
  const body = $("letter-body").value.trim();
  if (!title || !body) return;
  const submit = $("letter-form").querySelector("button[type=submit]");
  submit.disabled = true;
  submit.textContent = "Enviando com carinho...";
  try {
    await addDoc(collection(db, "spaces", activeSpaceId, "letters"), {
      title, body, senderUid: currentUser.uid, senderEmail: currentUser.email,
      senderName: displayName(currentUser.email), createdAt: serverTimestamp()
    });
    $("letter-form").reset();
    say("letter-message", "Sua cartinha foi entregue e guardada. ♡");
  } catch (e) {
    say("letter-message", "Não foi possível enviar. Confira as regras do Firestore.");
    console.error(e);
  } finally {
    submit.disabled = false;
    submit.innerHTML = 'Enviar cartinha <span>♡</span>';
  }
});

onAuthStateChanged(auth, async user => {
  currentUser = user;
  setSignedIn(!!user);
  if (user) {
    try {
      await loadUserSpace();
      goTo("home");
    } catch (e) {
      say("space-message", "Não foi possível carregar o cantinho. Confira as regras do Firestore.");
      console.error(e);
    }
  } else {
    if (stopLetters) { stopLetters(); stopLetters = null; }
    activeSpaceId = null;
    $("incoming-toast").hidden = true;
  }
});
