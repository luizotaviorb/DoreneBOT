const fs = require("fs").promises;
const path = require("path");

const USER_DATA_FILE = path.join(__dirname, "user-data.json");
let userStatesCache = {};

async function loadUsers() {
  try {
    const data = await fs.readFile(USER_DATA_FILE, "utf8");
    userStatesCache = JSON.parse(data);
    console.log("Dados de usuários carregados do arquivo JSON.");
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log("Arquivo de dados de usuários não encontrado, criando novo.");
      userStatesCache = {};
      await saveUsers();
    } else {
      console.error("Erro ao carregar dados de usuários:", error);
      userStatesCache = {};
    }
  }
}

async function saveUsers() {
  try {
    const data = JSON.stringify(userStatesCache, null, 2);
    await fs.writeFile(USER_DATA_FILE, data, "utf8");
  } catch (error) {
    console.error("Erro ao salvar dados de usuários:", error);
  }
}

function getUserState(chatId) {
  return userStatesCache[chatId] ? { ...userStatesCache[chatId] } : null;
}

async function updateUserState(chatId, newState) {
  userStatesCache[chatId] = { ...userStatesCache[chatId], ...newState };
  await saveUsers();
}

module.exports = {
  loadUsers,
  saveUsers,
  getUserState,
  updateUserState,
};
