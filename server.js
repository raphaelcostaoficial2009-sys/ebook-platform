// ==================================================
// IMPORTS
// ==================================================
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");

// ==================================================
// APP CONFIG
// ==================================================
const app = express();
const PORT = process.env.PORT || 10000;

// ==================================================
// MIDDLEWARES
// ==================================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Arquivos estáticos
app.use(express.static(path.join(__dirname, "public")));

// Sessão
app.use(
  session({
    secret: process.env.SESSION_SECRET || "segredo-muito-foda",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // Render usa HTTP
  })
);

// ==================================================
// ARQUIVO DE USUÁRIOS
// ==================================================
const USERS_FILE = path.join(__dirname, "users.json");

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, "[]");
    return [];
  }

  const data = fs.readFileSync(USERS_FILE, "utf-8").trim();
  if (!data) return [];

  try {
    return JSON.parse(data);
  } catch (err) {
    console.error("users.json corrompido, resetando...");
    fs.writeFileSync(USERS_FILE, "[]");
    return [];
  }
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// ==================================================
// MIDDLEWARE DE AUTENTICAÇÃO
// ==================================================
function auth(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login.html");
  }
  next();
}

// ==================================================
// ROTAS HTML
// ==================================================
app.get("/", (req, res) => {
  res.redirect("/login.html");
});

app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "register.html"));
});

app.get("/dashboard", auth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// ==================================================
// AUTH
// ==================================================

// Cadastro
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();

  if (users.find((u) => u.username === username)) {
    return res.send("Usuário já existe");
  }

  const hash = await bcrypt.hash(password, 10);
  users.push({ username, password: hash });

  saveUsers(users);
  res.redirect("/login.html");
});

// Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();

  const user = users.find((u) => u.username === username);
  if (!user) return res.send("Usuário não encontrado");

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.send("Senha errada");

  req.session.user = username;
  res.redirect("/dashboard.html");
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login.html");
  });
});

// ==================================================
// START SERVER
// ==================================================
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
