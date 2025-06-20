const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const fs = require("fs");
const TelegramBot = require("node-telegram-bot-api");
const { getAiResponse } = require("./ai.js");
const userData = require("./user-data.js");

require("dotenv").config();
const { TOKEN_BOT } = process.env;
const MAX_FREE_INTERACTIONS = 4;
const STRIPE_PRIVATE_LINK = "https://bit.ly/your-girlfriend";
const ADMIN_CHAT_ID = parseInt(process.env.ADMIN_CHAT_ID);

const path = require("path");

// Lista de arquivos das fotos'
const LOCAL_IMAGES = [
  path.join(__dirname, "images", "biquini-azul.webp"),
  path.join(__dirname, "images", "biquini.webp"),
  path.join(__dirname, "images", "jeans.webp"),
  path.join(__dirname, "images", "mini-shorts.webp"),
  path.join(__dirname, "images", "naked.webp"),
  path.join(__dirname, "images", "naked2.webp"),
];

const bot = new TelegramBot(TOKEN_BOT, { polling: true });

// Inicializa os dados do usuário ao iniciar o bot
async function startBot() {
  await userData.initDb();
  console.log("Bot conectado ao Telegram e banco de dados inicializado.");
}
startBot();

// Escutando comando /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  let userState = await userData.getUserState(chatId);

  if (!userState) {
    await userData.updateUserState(chatId, {
      interactions: 0,
      isSubscribed: false,
    });
  }
  const biquiniImagePath = path.join(__dirname, "images", "biquini.webp");

  try {
    await bot.sendPhoto(chatId, fs.createReadStream(biquiniImagePath), {
      caption:
        "Hello, honey! I'm your girlfriend. What do you want to talk about? To see more photos, just ask... 😈",
    });
  } catch (error) {
    console.error("Erro ao enviar foto no /start:", error);
    bot.sendMessage(
      chatId,
      "Hello baby! I am your girlfriend. What do you want talk about? To see more photos, just ask... 😈"
    );
  }
});

// Ativar um usuário, somente se for o administrador.
bot.onText(/\/activate (\d+)/, async (msg, match) => {
  const adminChatId = msg.chat.id;
  const targetChatId = parseInt(match[1]); // O ID do usuário a ser ativado

  if (adminChatId !== ADMIN_CHAT_ID) {
    bot.sendMessage(
      adminChatId,
      "Você não tem permissão para usar este comando."
    );
    return;
  }

  let userState = await userData.getUserState(targetChatId);

  if (userState) {
    userState.isSubscribed = true;
    userState.interactions = 0; // Zera as interações gratuitas após a assinatura
    await userData.updateUserState(targetChatId, userState); // Salva o novo estado
    bot.sendMessage(
      adminChatId,
      `Usuário ${targetChatId} ativado como assinante.`
    );
    bot.sendMessage(
      targetChatId,
      `Congratulations, my love! Your subscription has been activated! 🎉 Now we can chat without limits. I’m so happy! ❤️`
    );
  } else {
    // Se o usuário não foi encontrado, cria ele já como assinante
    await userData.updateUserState(targetChatId, {
      interactions: 0,
      isSubscribed: true,
    });
    bot.sendMessage(
      adminChatId,
      `Usuário ${targetChatId} não encontrado nos registros, mas foi criado e ativado como assinante.`
    );
    bot.sendMessage(
      targetChatId,
      `Congratulations, my love! Your subscription has been activated! 🎉 Now we can chat without limits. I’m so happy! ❤️`
    );
  }
});

// Desativar um usuário, somente se for o administrador.
bot.onText(/\/deactivate (\d+)/, async (msg, match) => {
  const adminChatId = msg.chat.id;
  const targetChatId = parseInt(match[1]);

  if (adminChatId !== ADMIN_CHAT_ID) {
    bot.sendMessage(
      adminChatId,
      "Você não tem permissão para usar este comando."
    );
    return;
  }

  let userState = await userData.getUserState(targetChatId);

  if (userState && userState.isSubscribed) {
    userState.isSubscribed = false;
    await userData.updateUserState(targetChatId, userState);

    bot.sendMessage(
      adminChatId,
      `Usuário ${targetChatId} desativado (não é mais assinante).`
    );
    bot.sendMessage(
      targetChatId,
      `Oh, my love... It is with a heavy heart that I inform you that your subscription has been deactivated. 🥺 Our unlimited chats have come to an end. If you want to have all my affection again, you can subscribe again! ❤️‍🩹`
    );
  } else if (userState && !userState.isSubscribed) {
    bot.sendMessage(
      adminChatId,
      `Usuário ${targetChatId} já não era um assinante ativo.`
    );
  } else {
    bot.sendMessage(
      adminChatId,
      `Usuário ${targetChatId} não encontrado nos registros.`
    );
  }
});

// Resetar interações de um usuário, somente se for o administrador.
bot.onText(/\/reset (\d+)/, async (msg, match) => {
  const adminChatId = msg.chat.id;
  const targetChatId = parseInt(match[1]); // O ID do usuário a ser resetado

  // Verifica se quem está usando o comando é o administrador
  if (adminChatId !== ADMIN_CHAT_ID) {
    bot.sendMessage(
      adminChatId,
      "Você não tem permissão para usar este comando."
    );
    return;
  }

  let userState = await userData.getUserState(targetChatId);

  if (userState) {
    userState.isSubscribed = false;
    userState.interactions = 0;
    await userData.updateUserState(targetChatId, userState); // Salva o estado resetado

    bot.sendMessage(
      adminChatId,
      `Usuário ${targetChatId} resetado (não assinante, 0 interações).`
    );
    bot.sendMessage(
      targetChatId,
      `Hello, my love! It looks like something was reset... 😉 Your free interactions have been restored. How about we start over?`
    );
  } else {
    // Se o usuário não existe, informa ao admin
    bot.sendMessage(
      adminChatId,
      `Usuário ${targetChatId} não encontrado para resetar.`
    );
  }
});

// Solicitar confirmação de pagamento, enviado pelo usuário.
bot.onText(/\/confirm/, async (msg) => {
  const chatId = msg.chat.id;
  const userName =
    msg.from.username ||
    msg.from.first_name + (msg.from.last_name ? " " + msg.from.last_name : "");

  bot.sendMessage(
    chatId,
    `Okay, my love! I received your confirmation request. Please wait a moment while I check everything with love, my baby. ❤️`
  );

  bot.sendMessage(
    ADMIN_CHAT_ID,
    `🔔 **CONFIRMAÇÃO PENDENTE:**\n\nO usuário **${userName}** (ID: \`${chatId}\`) enviou o comando /confirm.\n\nPor favor, verifique o pagamento e ative-o usando: \`/activate ${chatId}\``,
    { parse_mode: "Markdown" } // Usar Markdown para formatação (negrito, código)
  );
});

bot.onText(/\/sentphoto/, async (msg) => {
  const chatId = msg.chat.id;
  let userState = await userData.getUserState(chatId);

  // Verifica se o usuário é assinante
  if (!userState || !userState.isSubscribed) {
    await bot.sendMessage(
      chatId,
      `Oh, my love! To have access to my most intimate photos, you need to be a subscriber. ✨ How about taking that step? 😉`
    );
    await bot.sendMessage(
      chatId,
      `If you want to get closer... and really feel what it's like to have me all to yourself 💋\nJust complete this little step first, love... 😍❤️:\n\n💌 Here's your private link: \n👉 ${STRIPE_PRIVATE_LINK} \n\n After this send me /confirm baby!! ❤️`
    );
    return;
  }

  if (LOCAL_IMAGES.length > 0) {
    const randomIndex = Math.floor(Math.random() * LOCAL_IMAGES.length);
    const imagePath = LOCAL_IMAGES[randomIndex];

    try {
      await bot.sendPhoto(chatId, fs.createReadStream(imagePath), {
        caption: "Here's something special just for you, my dear! 😘",
      });
    } catch (error) {
      console.error("Erro ao enviar foto local:", error);
      bot.sendMessage(
        chatId,
        "Oh my love, I couldn't send you the picture right now. Try again later! 😔"
      );
    }
  } else {
    bot.sendMessage(
      chatId,
      "Oops! Looks like I don't have any pictures to show you right now, my dear. 😥"
    );
  }
});

// Escutando mensagens
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  if (text && text.startsWith("/")) {
    return;
  }

  let userState = await userData.getUserState(chatId);
  if (!userState) {
    // Se o usuário não existe no JSON (nova conversa/bot reiniciado antes do /start)
    await userData.updateUserState(chatId, {
      interactions: 0,
      isSubscribed: false,
    });
    userState = await userData.getUserState(chatId); // Recarrega userState após a criação para ter a referência correta
  }

  if (userState.isSubscribed) {
    userState.interactions++;
    await userData.updateUserState(chatId, {
      interactions: userState.interactions,
    });
    try {
      const aiResponse = await getAiResponse(text);
      bot.sendMessage(chatId, aiResponse);
    } catch (error) {
      console.error("Error getting AI response:", error);
      bot.sendMessage(
        chatId,
        "Oops, I had a little trouble understanding that. Could you try again?"
      );
    }
  } else {
    if (userState.interactions < MAX_FREE_INTERACTIONS) {
      userState.interactions++;
      console.log(
        `User ${chatId} interaction count: ${userState.interactions}`
      );
      await userData.updateUserState(chatId, {
        interactions: userState.interactions,
      });

      try {
        const aiResponse = await getAiResponse(text);
        bot.sendMessage(chatId, aiResponse);
      } catch (error) {
        console.error("Error getting AI response:", error);
        bot.sendMessage(
          chatId,
          "Oops, I had a little trouble understanding that. Could you try again?"
        );
      }
    } else {
      await bot.sendMessage(
        chatId,
        `If you want to get closer... and really feel what it's like to have me all to yourself 💋\nJust complete this little step first, love... 😍❤️:\n\n💌 Here's your private link: \n👉 ${STRIPE_PRIVATE_LINK} \n\n After this send me /confirm baby!! ❤️`
      );

      await bot.sendMessage(
        chatId,
        `I'll be waiting for you here, with just a smile and dying to be entirely yours 😍 Make me happy my love. 💝`
      );
      return;
    }
  }
});

app.get("/", (req, res) => {
  res.send("Bot is alive and running!");
});

app.listen(port, () => {});
