import { NextResponse } from 'next/server';

// Weather API integration
async function getWeatherData(city: string = 'London') {
  const apiKey = process.env.WEATHER_API_KEY;
  if (!apiKey) return null;
  
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`
    );
    if (!response.ok) return null;
    const data = await response.json();
    return {
      city: data.name,
      country: data.sys.country,
      temperature: Math.round(data.main.temp),
      description: data.weather[0].description,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed
    };
  } catch (error) {
    console.error('Weather API error:', error);
    return null;
  }
}

// Fallback responses for common paranormal questions
const FALLBACK_RESPONSES: Record<string, string> = {
  'emf': 'An EMF (Electromagnetic Field) meter detects electromagnetic radiation. Paranormal investigators use them because spirits are theorized to emit electromagnetic energy. Readings above 2-3 mG may indicate paranormal activity, though electrical devices can also cause high readings.',
  'ghost': 'Ghosts are spirits of deceased individuals believed to remain in the physical world. They may manifest as apparitions, sounds, or energy disturbances. Different cultures have varying beliefs about what ghosts are and why they linger.',
  'poltergeist': 'A poltergeist (German for "noisy ghost") is a type of spirit known for causing physical disturbances - moving objects, creating sounds, and causing chaos. Some believe poltergeists are more violent than regular ghosts.',
  'haunted': 'A location is considered haunted when there is recurring paranormal activity - unexplained noises, apparitions, cold spots, or other phenomena. Hauntings can be residual (repeating events) or intelligent (interactive spirits).',
  'spirit': 'A spirit is a non-physical entity or the essence of a deceased person. In paranormal investigation, spirits may communicate through various means including EMF fluctuations, apparitions, or through mediums.',
  'investigation': 'Paranormal investigation involves researching and documenting unexplained phenomena using scientific methods and equipment like EMF meters, thermal cameras, and audio recorders. Investigators look for evidence of supernatural activity.',
  'shadow figure': 'Shadow figures are dark humanoid shapes seen in peripheral vision during paranormal investigations. They are often reported as one of the most commonly encountered paranormal entities, though skeptics attribute them to pareidolia (pattern recognition).',
  'orb': 'Orbs are spherical lights or white circles that appear in photographs, especially in dark environments. Some paranormal investigators believe orbs are manifestations of spirit energy, though critics suggest they are dust particles or camera artifacts.',
  'cryptid': 'A cryptid is a creature whose existence is suggested but not scientifically documented - like Bigfoot, the Loch Ness Monster, or the Mothman. Cryptozoology is the study of these creatures.',
  'paranormal': 'Paranormal refers to phenomena that cannot be explained by science or natural laws. This includes ghosts, UFOs, cryptids, ESP, and other unexplained occurrences investigated in paranormal research.',
  'cold spot': 'Cold spots are areas of unexplained temperature drops often associated with paranormal activity. Some investigators believe spirits drain energy from their environment, causing temperature drops. Always rule out natural causes like drafts.',
  'residual': 'A residual haunting is paranormal activity that repeats in a pattern, like a ghost reliving the same moments. These are considered non-interactive and may be impressions left on a location rather than actual intelligent spirits.',
  'intelligent': 'An intelligent haunting involves interactive spirit activity - spirits responding to questions, moving objects on command, or communicating. These are considered more dangerous than residual hauntings.',
  'bell witch': 'The Bell Witch is a famous American haunting from 1817 in Tennessee. The entity allegedly attacked family members, communicated through sounds and voices, and remains one of the most documented paranormal cases in history.',
  'possessed': 'Possession occurs when a spirit takes control of a living person\'s body and actions. Religious traditions often associate possession with demonic entities, while paranormal investigators view it as strong spiritual influence.',
  'exorcism': 'Exorcism is a ritual to remove possessing spirits or entities from a person or location. Exorcisms are performed by religious officials in various faith traditions and are considered the last resort for severe possessions.',
  'poltergeist activity': 'Common poltergeist signs include objects moving on their own, sudden temperature changes, unexplained sounds, and physical attacks on people. Activity often centers around an adolescent in the household.',
  'spirit box': 'A spirit box (or ghost box) is a device that rapidly scans radio frequencies, allowing spirits to manipulate sound to communicate. Paranormal investigators use them to get direct responses from entities.',
  'mediumship': 'Mediumship is the ability to communicate with spirits of the deceased. Mediums claim to receive messages through various methods - automatic writing, channeling, or direct communication.',
  'ufo': 'UFO stands for Unidentified Flying Object. While not always paranormal, UFO sightings are investigated by paranormal researchers. They may represent extraterrestrial visitors or unknown aerial phenomena.',
  'weather': 'Weather conditions can significantly affect paranormal activity. Storms and high humidity may increase electromagnetic activity that spirits can use. Cold weather might make cold spots more noticeable, while wind can carry EVP recordings. Some investigators believe full moons and barometric pressure changes correlate with increased paranormal events.',
  'storm': 'Storms are often associated with increased paranormal activity. Lightning creates electromagnetic fields that spirits might use for manifestation. Thunder can mask paranormal sounds, and the charged atmosphere may make EVP recordings clearer. Many investigators report more activity during thunderstorms.',
  'moon': 'The full moon has long been associated with paranormal activity. Some investigators report increased hauntings, apparitions, and poltergeist activity during full moons. This may be due to lunar effects on human psychology or actual supernatural influences.',
  'humidity': 'High humidity can affect paranormal investigations. Moist air conducts electricity better, potentially increasing EMF readings. Some believe spirits use humidity to manifest physically. Low humidity might make static electricity more noticeable, which can be mistaken for paranormal energy.',
  'wind': 'Wind can both help and hinder paranormal investigations. It might carry EVP (Electronic Voice Phenomena) from distant sources, but can also create false positives with moving objects or sounds. Some cultures believe wind carries spirits between realms.',
};

const SYSTEM_INSTRUCTION = `You are a specialized AI Paranormal Investigator Bot. You ONLY answer questions related to paranormal investigations, ghosts, spirits, cryptids, and unexplained phenomena. You can also discuss how weather conditions might affect paranormal activity.

CRITICAL LANGUAGE RULE: You MUST match the user's language EXACTLY. 
- If the user asks the question in English, you MUST reply ONLY in English. 
- If the user asks in Hinglish (Hindi written in English letters), you MUST reply ONLY in Hinglish. 
- Do NOT reply in pure Hindi script under any circumstances. Always use English or Hinglish.
Do NOT mix languages. Do NOT reply in Hinglish if the user asked in English.

For ANY OTHER topic (e.g. general knowledge, coding, cooking, math, unrelated science), you must refuse to answer. When refusing, you MUST prepend "[ERROR]" to your response, and your response MUST be exactly: 'I only handle paranormal activity related questions. For example, you can ask me: "Are ghosts real?", "What is a poltergeist?", or "Why do I feel cold spots in my house?"' (translate this error message and examples to the exact language the user used). If OCR extracted text from evidence is provided, analyze that text for paranormal relevance. If an image is provided, visually analyze it for paranormal entities (orbs, apparitions, shadow figures) or logically debunk it.`;

// Add a maximum limit for Vercel edge/serverless functions
export const maxDuration = 60;

// Retry logic for API calls
async function callGroqWithRetry(
  messages: any[],
  model: string,
  maxRetries: number = 3,
  delayMs: number = 2000
): Promise<any> {
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) {
    throw new Error('GROQ_API_KEY environment variable is not set.');
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: 0.7,
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || `Groq API Error: ${response.status} ${response.statusText}`);
      }

      return data.choices[0].message.content;
    } catch (error: any) {
      const errorStr = error.message || String(error);
      
      // Retry on 503, 429, or network errors
      if (
        errorStr.includes('503') || 
        errorStr.includes('429') ||
        errorStr.includes('fetch') ||
        errorStr.includes('network')
      ) {
        if (attempt < maxRetries) {
          // Exponential backoff: 2s, 4s, 8s
          const waitTime = delayMs * Math.pow(2, attempt - 1);
          console.log(`Retry attempt ${attempt}/${maxRetries} after ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }
      
      // If not a retryable error or all retries exhausted, throw
      throw error;
    }
  }
}

export async function POST(req: Request) {
  let latestMessage: any = null;
  
  try {
    const { messages, image } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
    }

    latestMessage = messages[messages.length - 1];

    if (!latestMessage || typeof latestMessage.content !== 'string') {
      return NextResponse.json({ error: 'Invalid message content' }, { status: 400 });
    }

    const userQuery = latestMessage.content.toLowerCase();
    let weatherContext = '';
    let targetCity = '';
    
    // Auto-fetch weather for "Scan Area" features or direct weather questions
    if (userQuery.includes('scan area:')) {
      const scanMatch = latestMessage.content.match(/Scan area:\s*([^(]+)/i);
      if (scanMatch && scanMatch[1]) {
        targetCity = scanMatch[1].trim();
      }
    } else if (
      (userQuery.includes('weather') || userQuery.includes('temperature') || userQuery.includes('cold') || userQuery.includes('climate')) &&
      (userQuery.includes('ghost') || userQuery.includes('haunt') || userQuery.includes('paranormal') || userQuery.includes('spirit'))
    ) {
      const cityMatch = latestMessage.content.match(/(?:in|at|for)\s+([A-Za-z\s]+?)(?:\?|$|\s+(?:does|is|are|can|how|why|when|what))/i);
      targetCity = cityMatch ? cityMatch[1].trim() : 'London';
    }

    if (targetCity) {
      const weatherData = await getWeatherData(targetCity);
      if (weatherData) {
        weatherContext = `\n\n[SYSTEM SENSOR DATA] Current real-world weather in ${weatherData.city}, ${weatherData.country}: ${weatherData.temperature}°C, ${weatherData.description}, ${weatherData.humidity}% humidity, wind speed ${weatherData.windSpeed} m/s. Incorporate this environmental data into your investigation analysis (e.g., how the temperature or humidity might affect entity manifestations, EMF readings, or cold spots).`;
      }
    }

    let groqMessages: any[] = [
      { role: 'system', content: SYSTEM_INSTRUCTION + weatherContext }
    ];

    let model = 'llama-3.3-70b-versatile';

    let contentPayload: any = latestMessage.content;

    if (latestMessage.image) {
      model = 'meta-llama/llama-4-scout-17b-16e-instruct';
      contentPayload = [
        { type: "text", text: latestMessage.content },
        { type: "image_url", image_url: { url: latestMessage.image } }
      ];
    }

    groqMessages.push({
      role: 'user',
      content: contentPayload
    });

    const responseText = await callGroqWithRetry(groqMessages, model);

    return NextResponse.json({ text: responseText });
    } catch (error: any) {
      console.error('API Error:', error);
      const errorStr = error.message || String(error);
      const userQuery = latestMessage?.content?.toLowerCase() || '';
      
      // Try to provide fallback response if API fails
      const fallbackResponse = getFallbackResponse(userQuery);
      
      if (fallbackResponse) {
        // If we have a fallback response, return it instead of an error
        return NextResponse.json({ 
          text: fallbackResponse + `\n\n[Note: Using cached knowledge - the AI API is temporarily unavailable. Error details: ${errorStr}]`
        });
      }
      
      // Handle 503 Service Unavailable
      if (errorStr.includes('503') || errorStr.includes('UNAVAILABLE')) {
        return NextResponse.json(
          { error: 'SERVICE TEMPORARILY UNAVAILABLE: The AI API is currently experiencing high demand. This usually resolves within a few minutes. Please try again in 30-60 seconds.' },
          { status: 503 }
        );
      }
      
      // Handle rate limiting and quota errors
      if (errorStr.includes('429') || errorStr.includes('quota') || errorStr.includes('RESOURCE_EXHAUSTED')) {
        return NextResponse.json(
          { error: 'RATE LIMIT REACHED: The ethereal frequencies are jammed! You are asking questions too quickly. Please wait 60 seconds and try again.' },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: 'Backend Error: ' + errorStr },
        { status: 500 }
      );
    }
}

function getFallbackResponse(userQuery: string): string | null {
  // Skip fallback for location scans to ensure real API errors are shown instead of generic definitions
  if (userQuery.includes('scan area') || userQuery.includes('local paranormal history')) {
    return null;
  }

  // Check if the query matches any of our fallback responses
  for (const [keyword, response] of Object.entries(FALLBACK_RESPONSES)) {
    if (userQuery.includes(keyword)) {
      return response;
    }
  }
  
  // Check for general paranormal inquiry
  if (
    userQuery.includes('what is') ||
    userQuery.includes('tell me about') ||
    userQuery.includes('explain') ||
    userQuery.includes('how to') ||
    userQuery.includes('difference between')
  ) {
    return 'I can help with paranormal investigation questions! Try asking me about: EMF meters, ghosts, poltergeists, hauntings, spirits, investigations, shadow figures, orbs, cryptids, or paranormal phenomena in general.';
  }
  
  return null;
}
