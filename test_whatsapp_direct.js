// Test WhatsApp API directly

async function testWhatsApp() {
  const token = 'EACEUw1YCh7cBPOQ4V8POKzwEanaXDj9qhHkgaa2FP7tenCeoVM9Q188WDek2ZCZAkZAZCd7Rwrhib3wZB9V4K8w62Sl3b3cxpNHewkGnqkeAZB4IZAPVtLmpaDQMlx3bLW874CJTiyIvyRvuoNBkaURQ8rmqVeh6OQDHZAGTQTGrrRWs2mjCcjztyZBNyHYZC8';
  const phoneNumberId = '636589589532430';
  const recipientPhone = '+918318868521';

  // Test with simple template without parameters
  const message = {
    messaging_product: 'whatsapp',
    to: recipientPhone,
    type: 'template',
    template: {
      name: 'welcome',
      language: {
        code: 'en',
      },
    },
  };

  console.log('Testing WhatsApp API with simple template...');
  console.log('Message payload:', JSON.stringify(message, null, 2));

  try {
    const response = await fetch(`https://graph.facebook.com/v17.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    console.log('Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.text();
      console.log('Error details:', errorData);
    } else {
      const result = await response.json();
      console.log('Success result:', result);
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
}

testWhatsApp();