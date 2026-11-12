// 1) Crie um projeto no Firebase e copie a configuração do seu app Web.
// 2) Cole os valores abaixo. Não publique chaves privadas ou senhas de serviço.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc,
  query, orderBy, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBi1ooFkGRv4YQwfwmiBoNJpts2jpgL0x8",
  authDomain: "among-us-3f840.firebaseapp.com",
  projectId: "among-us-3f840",
  storageBucket: "among-us-3f840.firebasestorage.app",
  messagingSenderId: "772719111558",
  appId: "1:772719111558:web:0a633439ccef81b7bdd007"
};

const configured = !Object.values(firebaseConfig).some(v => String(v).startsWith("COLE_") || String(v).startsWith("SEU_"));
const $ = id => document.getElementById(id);
let auth, db, activeSpaceId = null, stopLetters = null, currentUser = null;

function say(id, message) { $(id).textContent = message; }
function showApp(isSignedIn) {
  $("auth-panel").hidden = isSignedIn;
  $("app-panel").hidden = !isSignedIn;
}
function showSpace(hasSpace) {
  $("no-space").hidden = hasSpace;
  $("has-space").hidden = !hasSpace;
}
function friendlyError(error) {
  const messages = {
    "auth/email-already-in-use": "Este e-mail já tem uma conta.",
    "auth/invalid-email": "Confira o formato do e-mail.",
    "auth/weak-password": "Use uma senha com pelo menos 6 caracteres.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/network-request-failed": "Falha de conexão. Tente novamente."
  };
  return messages[error.code] || "Não foi possível concluir. Confira os dados e tente novamente.";
}
function requireConfig() {
  if (!configured) throw new Error("Antes de usar, configure o Firebase no arquivo app.js. Veja o README.");
}
function makeSpaceCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, b => chars[b % chars.length]).join("");
}
async function loadUserSpace() {
  activeSpaceId = null;
  if (stopLetters) { stopLetters(); stopLetters = null; }
  showSpace(false);
  const userDoc = await getDoc(doc(db, "users", currentUser.uid));
  if (!userDoc.exists() || !userDoc.data().spaceId) return;
  activeSpaceId = userDoc.data().spaceId;
  const spaceSnap = await getDoc(doc(db, "spaces", activeSpaceId));
  if (!spaceSnap.exists()) { activeSpaceId = null; return; }
  showSpace(true);
  $("current-space-code").textContent = activeSpaceId;
  const members = spaceSnap.data().members || [];
  say("member-status", members.length >= 2 ? "♡ Vocês dois já estão neste espaço." : "Aguardando a outra pessoa entrar...");
  listenForLetters();
}
function listenForLetters() {
  if (stopLetters) stopLetters();
  const lettersQuery = query(collection(db, "spaces", activeSpaceId, "letters"), orderBy("createdAt", "desc"));
  stopLetters = onSnapshot(lettersQuery, snapshot => {
    const list = $("letters-list");
    list.replaceChildren();
    if (snapshot.empty) {
      const p = document.createElement("p");
      p.className = "muted";
      p.textContent = "Ainda não há cartas. A primeira pode ser sua. ♡";
      list.append(p);
      return;
    }
    snapshot.forEach(item => {
      const data = item.data();
      const article = document.createElement("article");
      article.className = "letter-card";
      const title = document.createElement("h3");
      title.textContent = data.title || "Sem título";
      const meta = document.createElement("p");
      meta.className = "letter-meta";
      meta.textContent = `De ${data.senderEmail || "alguém especial"} · ${data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString("pt-BR") : "agora"}`;
      const body = document.createElement("p");
      body.className = "letter-content";
      body.textContent = data.body || "";
      article.append(title, meta, body);
      list.append(article);
    });
  }, error => say("letter-message", "Não foi possível carregar as cartas. Confira as regras do Firestore."));
}

$("signup-btn").addEventListener("click", async () => {
  try {
    requireConfig();
    await createUserWithEmailAndPassword(auth, $("email").value.trim(), $("password").value);
    say("auth-message", "Conta criada! Agora crie ou entre no espaço de vocês.");
  } catch (e) { say("auth-message", e.message.startsWith("Antes") ? e.message : friendlyError(e)); }
});
$("login-btn").addEventListener("click", async () => {
  try {
    requireConfig();
    await signInWithEmailAndPassword(auth, $("email").value.trim(), $("password").value);
  } catch (e) { say("auth-message", e.message.startsWith("Antes") ? e.message : friendlyError(e)); }
});
$("logout-btn").addEventListener("click", () => signOut(auth));
$("create-space-btn").addEventListener("click", async () => {
  try {
    const code = makeSpaceCode();
    await setDoc(doc(db, "spaces", code), { owner: currentUser.uid, members: [currentUser.uid], createdAt: serverTimestamp() });
    await setDoc(doc(db, "users", currentUser.uid), { spaceId: code });
    await loadUserSpace();
    say("space-message", "Espaço criado! Compartilhe o código com a outra pessoa.");
  } catch (e) { say("space-message", "Não foi possível criar o espaço. Confira as regras do Firestore."); }
});
$("join-space-btn").addEventListener("click", async () => {
  try {
    const code = $("space-code").value.trim().toUpperCase();
    if (!code) return say("space-message", "Cole o código do convite.");
    const ref = doc(db, "spaces", code);
    const snap = await getDoc(ref);
    if (!snap.exists()) return say("space-message", "Esse código não foi encontrado.");
    const members = snap.data().members || [];
    if (members.includes(currentUser.uid)) {
      await setDoc(doc(db, "users", currentUser.uid), { spaceId: code });
    } else {
      if (members.length >= 2) return say("space-message", "Este espaço já tem duas pessoas.");
      await updateDoc(ref, { members: [...members, currentUser.uid] });
      await setDoc(doc(db, "users", currentUser.uid), { spaceId: code });
    }
    await loadUserSpace();
    say("space-message", "Vocês estão no mesmo espaço. ♡");
  } catch (e) { say("space-message", "Não foi possível entrar. Confira o código e as regras do Firestore."); }
});
$("copy-code-btn").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(activeSpaceId); say("space-message", "Código copiado!"); }
  catch { say("space-message", "Copie o código manualmente."); }
});
$("letter-form").addEventListener("submit", async event => {
  event.preventDefault();
  if (!activeSpaceId) return say("letter-message", "Primeiro crie ou entre no espaço de vocês.");
  const title = $("letter-title").value.trim();
  const body = $("letter-body").value.trim();
  if (!title || !body) return;
  try {
    await addDoc(collection(db, "spaces", activeSpaceId, "letters"), {
      title, body, senderUid: currentUser.uid, senderEmail: currentUser.email,
      createdAt: serverTimestamp()
    });
    $("letter-form").reset();
    say("letter-message", "Carta guardada no espaço de vocês. ♡");
  } catch (e) { say("letter-message", "Não foi possível guardar. Confira as regras do Firestore."); }
});
document.querySelectorAll(".tab").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b === button));
  $("letters-view").hidden = button.dataset.tab !== "letters";
  $("space-view").hidden = button.dataset.tab !== "space";
}));
if (configured) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  onAuthStateChanged(auth, async user => {
    currentUser = user;
    showApp(!!user);
    if (user) {
      try { await loadUserSpace(); }
      catch { say("space-message", "Erro ao carregar o espaço. Confira as regras do Firestore."); }
    } else {
      if (stopLetters) stopLetters();
      activeSpaceId = null;
    }
  });
} else {
  showApp(false);
  say("auth-message", "Protótipo pronto! Configure o Firebase seguindo o README para ativar contas e cartas compartilhadas.");
}
