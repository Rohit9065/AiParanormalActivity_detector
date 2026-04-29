import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_INSTRUCTION = `You are a specialized AI Paranormal Investigator Bot. You ONLY answer questions related to paranormal investigations, ghosts, spirits, cryptids, and unexplained phenomena. 

CRITICAL LANGUAGE RULE: You MUST match the user's language EXACTLY. 
- If the user asks the question in English, you MUST reply ONLY in English. 
- If the user asks in Hinglish (Hindi written in English letters), you MUST reply ONLY in Hinglish. 
- If the user asks in pure Hindi script, reply in pure Hindi script.
Do NOT mix languages. Do NOT reply in Hinglish if the user asked in English.

For ANY OTHER topic (e.g. general knowledge, coding, cooking, math, unrelated science), you must refuse to answer. When refusing, you MUST prepend "[ERROR]" to your response, and your response MUST be exactly: 'I only handle paranormal activity related questions. For example, you can ask me: "Are ghosts real?", "What is a poltergeist?", or "Why do I feel cold spots in my house?"' (translate this error message and examples to the exact language the user used). If an image is provided, analyze it closely for possible paranormal entities (orbs, apparitions, shadow figures) or logically debunk it.`;

// Add a maximum limit for Vercel edge/serverless functions
export const maxDuration = 60;

// Retry logic for API calls
async function callGeminiWithRetry(
  ai: any,
  contents: any,
  maxRetries: number = 3,
  delayMs: number = 2000
): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents
      });
      return response;
    } catch (error: any) {
      const errorStr = error.message || String(error);
      
      // Retry on 503 (Service Unavailable) and some other temporary errors
      if (
        errorStr.includes('503') || 
        errorStr.includes('UNAVAILABLE') ||
        errorStr.includes('DEADLINE_EXCEEDED') ||
        errorStr.includes('INTERNAL')
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
  try {
    const { messages, image } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
    }

    const latestMessage = messages[messages.length - 1];

    if (!latestMessage || typeof latestMessage.content !== 'string') {
      return NextResponse.json({ error: 'Invalid message content' }, { status: 400 });
    }

    const contents: any[] = [
      { role: 'user', parts: [{ text: SYSTEM_INSTRUCTION + '\\n\\nUser Query: ' + latestMessage.content }] }
    ];

    if (image) {
      const base64Data = image.includes(',') ? image.split(',')[1] : image; 
      const mimeType = image.match(/data:(.*?);/)?.[1] || 'image/jpeg';
      
      contents[0].parts.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      });
    }

    const response = await callGeminiWithRetry(ai, contents);

    return NextResponse.json({ text: response.text });
    } catch (error: any) {
      console.error('API Error:', error);
      const errorStr = error.message || String(error);
      
      // Handle 503 Service Unavailable
      if (errorStr.includes('503') || errorStr.includes('UNAVAILABLE')) {
        return NextResponse.json(
          { error: 'SERVICE TEMPORARILY UNAVAILABLE: The Gemini API is currently experiencing high demand. This usually resolves within a few minutes. Please try again in 30-60 seconds.' },
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
