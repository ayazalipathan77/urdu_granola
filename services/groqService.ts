import { FullMeetingData } from "../types";

// Function to get available Groq models
export const getAvailableGroqModels = async (apiKey: string): Promise<string[]> => {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data = await response.json();
    return data.data.map((model: any) => model.id);
  } catch (error) {
    console.error('Error fetching Groq models:', error);
    return [];
  }
};

// Function to select a suitable LLM model
export const selectLLMModel = async (apiKey: string): Promise<string> => {
  const allModels = await getAvailableGroqModels(apiKey);
  // Filter out non-chat models (like whisper models)
  const chatModels = allModels.filter(model => !model.includes('whisper'));
  // Prefer Llama models, then Mixtral, fallback to any available chat model
  const preferredModels = ['llama3-8b-8192', 'llama3-70b-8192', 'mixtral-8x7b-32768', 'gemma-7b-it'];
  for (const model of preferredModels) {
    if (chatModels.includes(model)) {
      return model;
    }
  }
  // Return first available chat model if none preferred
  return chatModels[0] || 'llama3-8b-8192';
};

// Helper function for retry with exponential backoff
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt === maxRetries) break;

      // Check if it's a rate limit or network error
      const isRetryable = error instanceof Error &&
        (error.message.includes('429') || error.message.includes('network') || error.message.includes('timeout'));

      if (!isRetryable) throw error;

      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError!;
};

// Helper function to convert WebM audio to WAV
const convertWebMToWAV = async (audioBlob: Blob): Promise<Blob> => {
  if (audioBlob.type !== 'audio/webm') return audioBlob;

  const audioContext = new AudioContext();
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Encode to WAV
  const wavBuffer = audioBufferToWav(audioBuffer);
  return new Blob([wavBuffer], { type: 'audio/wav' });
};

// Helper function to encode AudioBuffer to WAV
const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
  const length = buffer.length;
  const numberOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bytesPerSample = 2;
  const blockAlign = numberOfChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign;
  const bufferSize = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, bufferSize - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Write audio data
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }
  }

  return arrayBuffer;
};

export const processAudioWithGroq = async (
  apiKey: string,
  audioBlob: Blob,
  meetingId: string,
  language: string = 'en'
): Promise<Partial<FullMeetingData>> => {

  try {
    // Convert audio format if needed
    const convertedAudioBlob = await convertWebMToWAV(audioBlob);

    // Get audio duration for chunking check
    const getAudioDuration = async (blob: Blob): Promise<number> => {
      return new Promise((resolve) => {
        const audio = new Audio(URL.createObjectURL(blob));
        audio.addEventListener('loadedmetadata', () => {
          resolve(audio.duration);
        });
      });
    };

    const duration = await getAudioDuration(convertedAudioBlob);

    // TODO: Implement audio chunking for long meetings (>15 min)
    // For now, process as single file; chunking would require slicing AudioBuffer
    if (duration > 900) { // 15 minutes
      console.warn('Audio duration exceeds 15 minutes. Chunking not yet implemented.');
    }

    // Step 1: Transcribe audio using Groq Whisper
    const formData = new FormData();
    formData.append('file', new File([convertedAudioBlob], `audio.${convertedAudioBlob.type.split('/')[1]}`, { type: convertedAudioBlob.type }));
    formData.append('model', 'whisper-large-v3');
    formData.append('response_format', 'verbose_json');
    formData.append('language', language);
    formData.append('timestamp_granularities[]', 'segment');

    const transcriptionResponse = await retryWithBackoff(async () => {
      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Whisper API error body:', errorBody);
        throw new Error(`Groq Whisper API error: ${response.status} - ${errorBody}`);
      }

      return response;
    });

    const transcriptionData = await transcriptionResponse.json();
    const transcription = transcriptionData.text;
    const segments = transcriptionData.segments || [];

    // Step 2: Process transcript with Groq LLM
    const selectedModel = await selectLLMModel(apiKey);

    const systemInstruction = `You are an expert meeting secretary and transcriber specializing in ${language === 'ur' ? 'URDU' : 'ENGLISH'} meetings.

Your task is to analyze the provided meeting transcript and generate structured, professional meeting notes.

IMPORTANT GUIDELINES:
- SUMMARY: Write a concise paragraph that captures the overall purpose, main topics discussed, and outcomes of the meeting. Do not include speaker names or specific quotes.
- ACTION ITEMS: List only specific, actionable tasks that were assigned or agreed upon. Each item should be a clear task without speaker names or transcript references.
- DECISIONS: List only the key decisions that were made during the meeting. Each decision should be a clear statement of what was decided, without speaker names.
- KEY POINTS: List the most important points, insights, or information shared during the meeting. Avoid including speaker names or direct quotes unless essential.
- TRANSCRIPT SEGMENTS: Break down the transcript into logical speaker segments. Identify speakers by context (e.g., "Speaker 1", "John", "Manager") and provide their spoken text.

Ensure each section contains ONLY relevant content for that section. Do not mix speaker dialogue into action items, decisions, or key points.`;

    const userContent = `Please analyze this meeting transcript and generate structured notes:

Transcript: ${transcription}

Format your response with these exact section headers:

SUMMARY:
[Write a concise paragraph summary of the entire meeting]

ACTION ITEMS:
- [Action item 1]
- [Action item 2]

DECISIONS:
- [Decision 1]
- [Decision 2]

KEY POINTS:
- [Key point 1]
- [Key point 2]

TRANSCRIPT SEGMENTS:
- Speaker 1: [text]
- Speaker 2: [text]`;

    const completionResponse = await retryWithBackoff(async () => {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            {
              role: "system",
              content: systemInstruction
            },
            {
              role: "user",
              content: userContent
            }
          ],
          temperature: 0.1
        })
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('LLM API error body:', errorBody);
        throw new Error(`Groq API error: ${response.status} - ${errorBody}`);
      }

      return response;
    });

    const completionData = await completionResponse.json();
    const responseText = completionData.choices[0]?.message?.content || completionData.choices[0]?.text;

    if (!responseText) throw new Error("No data returned from Groq");

    // Parse the structured response using regex for flexibility
    const summaryMatch = responseText.match(/SUMMARY:\s*(.*?)(?=\n\n[A-Z]+:|$)/s);
    const summary = summaryMatch ? summaryMatch[1].trim() : '';

    const actionItemsMatch = responseText.match(/ACTION ITEMS:\s*(.*?)(?=\n\n[A-Z]+:|$)/s);
    const actionItems = actionItemsMatch ? actionItemsMatch[1].split('\n').filter((line: string) => line.trim().startsWith('-') || line.trim().match(/^\d+\./)).map((line: string) => line.replace(/^[-•*]\s*/, '').trim()) : [];

    const decisionsMatch = responseText.match(/DECISIONS:\s*(.*?)(?=\n\n[A-Z]+:|$)/s);
    const decisions = decisionsMatch ? decisionsMatch[1].split('\n').filter((line: string) => line.trim().startsWith('-') || line.trim().match(/^\d+\./)).map((line: string) => line.replace(/^[-•*]\s*/, '').trim()) : [];

    const keyPointsMatch = responseText.match(/KEY POINTS:\s*(.*?)(?=\n\n[A-Z]+:|$)/s);
    const keyPoints = keyPointsMatch ? keyPointsMatch[1].split('\n').filter((line: string) => line.trim().startsWith('-') || line.trim().match(/^\d+\./)).map((line: string) => line.replace(/^[-•*]\s*/, '').trim()) : [];

    const transcriptSegmentsMatch = responseText.match(/TRANSCRIPT SEGMENTS:\s*(.*?)(?=\n\n[A-Z]+:|$)/s);
    let transcriptSegments: Array<{ speaker: string, text: string, start: number, end: number }> = [];
    if (transcriptSegmentsMatch) {
      const segmentsText = transcriptSegmentsMatch[1];
      const segmentLines = segmentsText.split('\n').filter((line: string) => line.trim().startsWith('-') || line.trim().match(/^\d+\./));
      transcriptSegments = segmentLines.map((line: string, index: number) => {
        const cleaned = line.replace(/^[-•*]\s*/, '').trim();
        const colonIndex = cleaned.indexOf(':');
        const speaker = colonIndex > 0 ? cleaned.substring(0, colonIndex).trim() : `Speaker ${index + 1}`;
        const text = colonIndex > 0 ? cleaned.substring(colonIndex + 1).trim() : cleaned;
        // Use actual timestamps from Whisper segments if available
        const whisperSegment = segments[index];
        return {
          speaker,
          text,
          start: whisperSegment ? whisperSegment.start : index * 10,
          end: whisperSegment ? whisperSegment.end : (index + 1) * 10
        };
      });
    }

    return {
      transcript: transcriptSegments,
      notes: {
        summary,
        actionItems,
        decisions,
        keyPoints,
        language
      },
      status: 'completed'
    };

  } catch (error) {
    console.error("Groq processing error:", error);
    // Log more details for debugging
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return { status: 'failed', notes: undefined, transcript: undefined };
  }
};