// ==================================================
// IMPORTS
// ==================================================
const express = require("express");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcrypt");
const multer = require("multer");
const fs = require("fs");

// ==================================================
// APP CONFIG
// ==================================================
const app = express();
const PORT = process.env.PORT || 3000;

// ==================================================
// ADMIN CONFIG
// ==================================================
const ADMIN_EMAIL = "claudiopereira4578@gmail.com";

// ==================================================
// PATHS / FILES
// ==================================================
const USERS_FILE = path.join(__dirname, "users.json");
const EBOOKS_FILE = path.join(__dirname, "ebooks.json");
const UPLOADS_DIR = path.join(__dirname, "uploads");
const PUBLIC_DIR = path.join(__dirname, "public");

// ==================================================
// GARANTIR ARQUIVOS E PASTAS
// ==================================================
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "[]");
if (!fs.existsSync(EBOOKS_FILE)) fs.writeFileSync(EBOOKS_FILE, "[]");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

// ==================================================
// MIDDLEWARES GERAIS
// ==================================================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: "segredo-super-simples",
  resave: false,
  saveUninitialized: false
}));

app.use(express.static(PUBLIC_DIR));

// ==================================================
// HELPERS — USUÁRIOS
// ==================================================
const getUsers = () =>
  JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));

const saveUsers = (users) =>
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

// ==================================================
// HELPERS — EBOOKS
// ==================================================
const getEbooks = () =>
  JSON.parse(fs.readFileSync(EBOOKS_FILE, "utf8"));

const saveEbooks = (ebooks) =>
  fs.writeFileSync(EBOOKS_FILE, JSON.stringify(ebooks, null, 2));

// ==================================================
// AUTH MIDDLEWARES
// ==================================================
function auth(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login.html");
  }
  next();
}

function adminOnly(req, res, next) {
  if (req.session.user !== ADMIN_EMAIL) {
    return res.status(403).send("Acesso negado");
  }
  next();
}

// ==================================================
// UPLOAD CONFIG (MULTER)
// ==================================================
const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const safeName =
      Date.now() + "-" + file.originalname.replace(/\s/g, "_");
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Somente PDF"));
    }
    cb(null, true);
  }
});

// ==================================================
// ROTAS PÚBLICAS
// ==================================================
app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.get("/ebooks", (req, res) => {
  res.json(getEbooks());
});

app.get("/download/:file", (req, res) => {
  const filePath = path.join(UPLOADS_DIR, req.params.file);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("Arquivo não encontrado");
  }

  res.download(filePath);
});

// ==================================================
// AUTH — REGISTRO
// ==================================================
app.post("/register", async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.send("Preencha todos os campos");

  const users = getUsers();
  if (users.find(u => u.email === email)) {
    return res.send("Usuário já existe");
  }

  const senhaHash = await bcrypt.hash(senha, 10);

  users.push({ email, senha: senhaHash });
  saveUsers(users);

  res.redirect("/login.html");
});

// ==================================================
// AUTH — LOGIN
// ==================================================
app.post("/login", async (req, res) => {
  const { email, senha } = req.body;
  const users = getUsers();

  const user = users.find(u => u.email === email);
  if (!user) return res.send("Usuário não encontrado");

  const senhaOk = await bcrypt.compare(senha, user.senha);
  if (!senhaOk) return res.send("Senha incorreta");

  req.session.user = email;
  res.redirect("/dashboard.html");
});

// ==================================================
// DASHBOARD
// ==================================================
app.get("/dashboard.html", auth, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "dashboard.html"));
});

// ==================================================
// ADMIN
// ==================================================
app.get("/admin.html", auth, adminOnly, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "admin.html"));
});

app.post("/admin/delete/:file", auth, adminOnly, (req, res) => {
  const file = req.params.file;

  let ebooks = getEbooks();
  const ebook = ebooks.find(e => e.arquivo === file);

  if (!ebook) return res.send("E-book não encontrado");

  const filePath = path.join(UPLOADS_DIR, file);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  ebooks = ebooks.filter(e => e.arquivo !== file);
  saveEbooks(ebooks);

  res.redirect("/admin.html");
});

// ==================================================
// UPLOAD DE EBOOK
// ==================================================
app.post("/upload", auth, upload.single("pdf"), (req, res) => {
  const { titulo } = req.body;
  if (!req.file || !titulo) return res.send("Erro no upload");

  const ebooks = getEbooks();

  ebooks.push({
    titulo,
    arquivo: req.file.filename,
    autor: req.session.user,
    data: new Date().toISOString()
  });

  saveEbooks(ebooks);
  res.send("E-book enviado com sucesso!");
});

// ==================================================
// LOGOUT
// ==================================================
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login.html");
  });
});

// ==================================================
// START SERVER
// ==================================================
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
