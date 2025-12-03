import { GoogleGenAI, Type } from "@google/genai";
import { FullMeetingData } from "../types";

// Helper to convert Blob to Base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const processAudioWithGemini = async (
  apiKey: string,
  audioBlob: Blob,
  meetingId: string
): Promise<Partial<FullMeetingData>> => {
  
  const ai = new GoogleGenAI({ apiKey });

  // System instruction to act as the English meeting secretary
  const systemInstruction = `
    You are an expert meeting secretary and transcriber. 
    Your task is to listen to the provided audio meeting recording (which may be in Urdu, English, or mixed) 
    and output a structured JSON containing a transcript and organized notes IN ENGLISH.
    
    The 'transcript' field should be the text of the meeting. If the audio is in Urdu, translate the transcript to English.
    The 'summary' should be a concise paragraph in English.
    'actionItems', 'decisions', and 'keyPoints' should be arrays of strings in English.
  `;

  // Define Schema for structured output
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      transcript: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            speaker: { type: Type.STRING, description: "Speaker label (e.g., Speaker 1)" },
            text: { type: Type.STRING, description: "The spoken text in English" },
            start: { type: Type.NUMBER, description: "Approximate start time in seconds (0 if unknown)" },
          },
          required: ["speaker", "text"]
        }
      },
      notes: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          actionItems: { type: Type.ARRAY, items: { type: Type.STRING } },
          decisions: { type: Type.ARRAY, items: { type: Type.STRING } },
          keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["summary", "actionItems", "decisions", "keyPoints"]
      }
    },
    required: ["transcript", "notes"]
  };

  try {
    const base64Audio = await blobToBase64(audioBlob);

    // Using gemini-2.5-flash as it's multimodal, fast, and cost-effective (free tier compliant)
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: audioBlob.type || "audio/webm",
              data: base64Audio
            }
          },
          {
            text: "Please transcribe this audio and generate meeting notes in English based on the schema."
          }
        ]
      },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No data returned from Gemini");

    const parsedData = JSON.parse(jsonText);

    return {
      transcript: parsedData.transcript,
      notes: parsedData.notes,
      status: 'completed'
    };

  } catch (error) {
    console.error("Gemini processing error:", error);
    return { status: 'failed' };
  }
};