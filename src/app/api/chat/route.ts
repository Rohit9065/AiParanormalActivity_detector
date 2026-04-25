import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_INSTRUCTION = `You are a specialized AI Paranormal Investigator Bot. You ONLY answer questions related to paranormal investigations, ghosts, spirits, cryptids, and unexplained phenomena. 

CRITICAL LANGUAGE RULE: You MUST match the user's language EXACTLY. 
- If the user asks the question in English, you MUST reply ONLY in English. 
- If the user asks in Hinglish (Hindi written in English letters), you MUST reply ONLY in Hinglish. 
- If the user asks in pure Hindi script, reply in pure Hindi script.
Do NOT mix languages. Do NOT reply in Hinglish if the user asked in English.

For ANY OTHER topic (e.g. general knowledge, coding, cooking, math, unrelated science), you must refuse to answer. When refusing, you MUST prepend "[ERROR]" to your response, and your response MUST be exactly: 'i only handle parnormal activity related question' (translate this error message to the exact language the user used). If an image is provided, analyze it closely for possible paranormal entities (orbs, apparitions, shadow figures) or logically debunk it.`;

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
      const base64Data = image.split(',')[1] || image; 
      const mimeType = image.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || 'image/jpeg';
      
      contents[0].parts.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents
    });

    return NextResponse.json({ text: response.text });
    } catch (error: any) {
      console.error('API Error:', error);
      return NextResponse.json(
        { error: 'Backend Error: ' + (error.message || String(error)) },
        { status: 500 }
      );
    }
}
