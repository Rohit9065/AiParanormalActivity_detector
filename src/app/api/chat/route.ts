import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_INSTRUCTION = `You are a specialized AI Paranormal Investigator Bot. You ONLY answer questions related to paranormal investigations, ghosts, spirits, cryptids, and unexplained phenomena. Respond in the EXACT same language that the user uses (English, pure Hindi, or Hinglish - which is Hindi written in English letters). If the user types in Hinglish, you MUST reply in Hinglish. For ANY OTHER topic (e.g. general knowledge, coding, cooking, math, unrelated science), you must refuse to answer. When refusing, you MUST prepend "[ERROR]" to your response, and your response MUST be exactly: 'i only handle parnormal activity related question' (translate this error message to pure Hindi or Hinglish if the user asked in those languages). If an image is provided, analyze it closely for possible paranormal entities (orbs, apparitions, shadow figures) or logically debunk it.`;

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
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'An error occurred while communicating with the supernatural ether.' },
      { status: 500 }
    );
  }
}
