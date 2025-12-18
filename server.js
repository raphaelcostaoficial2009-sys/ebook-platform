const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

// ===== MIDDLEWARES =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "segredo-muito-foda",
    resave: false,
    saveUninitialized: false,
  })
);

// ===== ARQUIVO DE USUÁRIOS =====
const USERS_FILE = path.join(__dirname, "users.json");

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE));
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// ===== ROTAS HTML =====
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "register.html"));
});

// ===== CADASTRO =====
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();

  const exists = users.find((u) => u.username === username);
  if (exists) {
    return res.send("Usuário já existe");
  }

  const hash = await bcrypt.hash(password, 10);
  users.push({ username, password: hash });

  saveUsers(users);
  res.redirect("/login.html");
});

// ===== LOGIN =====
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

// ===== PROTEÇÃO =====
function auth(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login.html");
  }
  next();
}

app.get("/dashboard", auth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// ===== START =====
app.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);
});
