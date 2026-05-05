import fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf8');
const match = envFile.match(/GROQ_API_KEY=(.*)/);
const apiKey = match ? match[1].trim() : null;

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
        model: 'llama-3.2-11b-vision-preview',
        messages: [{
          role: 'user', 
          content: [
            { type: "text", text: "What's in this image?" },
            { type: "image_url", image_url: { url: "https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg" } }
          ]
        }],
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
