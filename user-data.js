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
                isSubscribed BOOLEAN DEFAULT FALSE,
                username TEXT DEFAULT NULL
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
      const row = result.rows[0];
      return {
        chatId: row.chatid,
        interactions: row.interactions,
        isSubscribed: !!row.issubscribed,
        username: row.username !== null ? String(row.username) : null,
      };
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
    const currentUserResult = await pool.query(
      "SELECT * FROM users WHERE chatId = $1",
      [chatId]
    );
    let currentUserState =
      currentUserResult.rows.length > 0 ? currentUserResult.rows[0] : null;

    // Converte de volta para nomes de campo JS se o getCurrentUserState retornou nomes de coluna do DB
    if (currentUserState) {
      currentUserState = {
        chatId: currentUserState.chatid,
        interactions: currentUserState.interactions,
        isSubscribed: !!currentUserState.issubscribed,
        username:
          currentUserState.username !== null
            ? String(currentUserState.username)
            : null,
      };
    }

    // 2. SE O USUÁRIO NÃO EXISTE, FAZ UM INSERT COM O NOVO ESTADO
    if (!currentUserState) {
      const interactions = newState.interactions || 0;
      const isSubscribed = newState.isSubscribed || false;
      const username = newState.username || null;

      const insertQuery = `
                INSERT INTO users (chatId, interactions, isSubscribed, username)
                VALUES ($1, $2, $3, $4);
            `;
      const insertValues = [chatId, interactions, isSubscribed, username];
      await pool.query(insertQuery, insertValues);
      console.log(
        `Estado do usuário ${chatId} INSERIDO no PostgreSQL (Supabase).`
      );
      return;
    }

    // 3. SE O USUÁRIO JÁ EXISTE, MESCLA OS NOVOS DADOS COM OS ATUAIS
    const updatedState = {
      chatId: chatId,
      interactions:
        newState.interactions !== undefined
          ? newState.interactions
          : currentUserState.interactions,
      isSubscribed:
        newState.isSubscribed !== undefined
          ? newState.isSubscribed
          : currentUserState.isSubscribed,
      username:
        newState.username !== undefined
          ? newState.username
          : currentUserState.username,
    };

    const query = `
            UPDATE users
            SET interactions = $2, isSubscribed = $3, username = $4
            WHERE chatId = $1;
        `;
    const values = [
      updatedState.chatId,
      updatedState.interactions,
      updatedState.isSubscribed,
      updatedState.username,
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
