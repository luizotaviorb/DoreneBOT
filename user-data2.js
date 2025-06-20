const { Pool } = require("pg");
require("dotenv").config();

const DATABASE_URL = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function initDb() {
  try {
    await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                chatId TEXT PRIMARY KEY,
                interactions INTEGER DEFAULT 0,
                isSubscribed BOOLEAN DEFAULT FALSE
            );
        `);
    console.log(
      "Tabela de usuários verificada/criada no PostgreSQL (Supabase)."
    );
  } catch (error) {
    console.error(
      "Erro ao conectar ou criar tabela no PostgreSQL (Supabase):",
      error
    );
    process.exit(1);
  }
}

async function getUserState(chatId) {
  try {
    const result = await pool.query("SELECT * FROM users WHERE chatId = $1", [
      chatId,
    ]);
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    return null;
  } catch (error) {
    console.error(
      "Erro ao obter estado do usuário do PostgreSQL (Supabase):",
      error
    );
    throw error;
  }
}

async function updateUserState(chatId, newState) {
  try {
    const query = `
            INSERT INTO users (chatId, interactions, isSubscribed)
            VALUES ($1, $2, $3)
            ON CONFLICT (chatId) DO UPDATE SET
                interactions = $2,
                isSubscribed = $3;
        `;
    const values = [
      chatId,
      newState.interactions || 0,
      newState.isSubscribed || false,
    ];
    await pool.query(query, values);
  } catch (error) {
    console.error(
      "Erro ao atualizar/inserir estado do usuário no PostgreSQL (Supabase):",
      error
    );
    throw error;
  }
}

module.exports = {
  initDb,
  getUserState,
  updateUserState,
};
