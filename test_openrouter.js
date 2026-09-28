// test-openrouter.js
require('dotenv').config({ path: '.env.local' });

async function probar() {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
      messages: [
        { role: 'user', content: 'Responde solo con la palabra: funciona' }
      ]
    })
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('❌ Error:', res.status, data);
    return;
  }

  console.log('✅ Respuesta del modelo:', data.choices[0].message.content);
}

probar();