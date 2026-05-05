import 'dotenv/config';

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
  console.error('No GROQ_API_KEY found');
  process.exit(1);
}

console.log('Using API Key:', apiKey.substring(0, 5) + '...');

async function testGroq() {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: [{role: 'user', content: 'hello'}],
        temperature: 0.7
      })
    });
    
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testGroq();
