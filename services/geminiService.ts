import { GoogleGenAI } from "@google/genai";
import { LyricLine, LyricsData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to convert file to base64
const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:audio/mp3;base64,")
      const base64Content = base64String.split(',')[1];
      
      // robust mime type detection
      let mimeType = file.type;
      if (!mimeType) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'mp3') mimeType = 'audio/mp3';
        else if (ext === 'wav') mimeType = 'audio/wav';
        else if (ext === 'ogg') mimeType = 'audio/ogg';
        else if (ext === 'm4a') mimeType = 'audio/m4a';
        else if (ext === 'aac') mimeType = 'audio/aac';
        else if (ext === 'flac') mimeType = 'audio/flac';
        else mimeType = 'audio/mp3'; // Fallback
      }

      resolve({
        inlineData: {
          mimeType: mimeType,
          data: base64Content
        }
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const generateLyrics = async (audioFile: File, language: string): Promise<LyricsData> => {
  try {
    const audioPart = await fileToGenerativePart(audioFile);

    const isAutoDetect = language === 'Auto-Detect';

    const prompt = `
      Analyze the audio file and transcribe the lyrics.
      Target Language: ${isAutoDetect ? 'Detect automatically' : language}
      
      Strict Output Format:
      Line 1: Language: [Detected Language Name]
      Line 2 onwards: [mm:ss.xx] Lyric text
      
      Requirements:
      1. The first line MUST start with "Language:" followed by the language name.
      2. The following lines MUST be the lyrics in LRC format: [mm:ss.xx] content.
      3. Synchronize timestamps accurately to the audio.
      4. If the song is instrumental, return "[00:00.00] (Instrumental)".
      5. DO NOT include any other text, introductory phrases, or markdown code blocks (no \`\`\`).
    `;

    // gemini-3-flash-preview is faster and optimized for multimodal tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          audioPart,
          { text: prompt }
        ]
      }
    });

    const text = response.text || '';
    return parseLyrics(text, language);

  } catch (error: any) {
    console.error("Gemini Lyrics Error:", error);
    // Pass through specific error messages if possible
    if (error.toString().includes('413')) {
        throw new Error("File is too large for the API. Please try a smaller file (under 20MB is recommended).");
    }
    throw error;
  }
};

export const identifySongMetadata = async (filename: string): Promise<{ artist: string; title: string; thumbnailUrl: string }> => {
  try {
    const prompt = `
      Identify the song and artist from the filename: "${filename}".
      Search for the official album art or a high-quality thumbnail for this song.
      
      Return a JSON object with the following keys:
      - artist: The name of the artist.
      - title: The correct title of the song.
      - thumbnailUrl: A direct URL to the album art image.
      
      If you cannot find a specific image, leave thumbnailUrl empty.
      
      IMPORTANT: Return ONLY the raw JSON string. Do not wrap it in markdown code blocks.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    let text = response.text || '{}';
    
    // Clean up potential markdown code blocks
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const data = JSON.parse(text);
    
    // Fallback if search grounding provides image in metadata but not in JSON
    let thumbnailUrl = data.thumbnailUrl;
    
    if (!thumbnailUrl && response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        // Try to find an image in grounding chunks if the model didn't put it in JSON
        // This is a heuristic as chunks usually contain web pages, but sometimes images.
        // For now, we rely on the model's ability to extract the URL into the JSON.
    }

    return {
      artist: data.artist || "Unknown Artist",
      title: data.title || filename,
      thumbnailUrl: thumbnailUrl || ""
    };

  } catch (error) {
    console.error("Gemini Metadata Error:", error);
    return {
      artist: "Unknown Artist",
      title: filename,
      thumbnailUrl: ""
    };
  }
};

const parseLyrics = (rawText: string, requestedLanguage: string): LyricsData => {
  const lines: LyricLine[] = [];
  let rawLines = rawText.split('\n');
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;

  // Clean up potential markdown code blocks if the model ignored instructions
  rawLines = rawLines.filter(line => !line.startsWith('```'));

  // Detect language from first line
  let detectedLanguage = requestedLanguage;
  
  if (rawLines.length > 0) {
    const firstLine = rawLines[0].trim();
    if (firstLine.toLowerCase().startsWith('language:')) {
      detectedLanguage = firstLine.substring(9).trim();
      // Remove the language line from processing
      rawLines = rawLines.slice(1);
    }
  }

  // Fallback for Auto-Detect if model didn't return language line
  if (detectedLanguage === 'Auto-Detect') {
     detectedLanguage = 'Detected';
  }

  let hasTimestamps = false;

  for (const line of rawLines) {
    const match = line.match(timeRegex);
    if (match) {
      hasTimestamps = true;
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = parseInt(match[3].padEnd(3, '0'), 10); // Ensure 3 digits
      const content = match[4].trim();

      const totalSeconds = minutes * 60 + seconds + milliseconds / 1000;
      
      if (content) {
        lines.push({
          time: totalSeconds,
          text: content
        });
      }
    } else if (line.trim().length > 0 && !line.toLowerCase().startsWith('language:')) {
      // Fallback for lines without timestamps if mixed, 
      // or if the model failed timestamps completely, we capture text.
      // We assign a dummy time or -1 to indicate no sync.
      lines.push({
        time: -1, 
        text: line.trim()
      });
    }
  }

  // If we didn't find good timestamps, treat it as plain text
  if (!hasTimestamps) {
    return {
      language: detectedLanguage,
      lines: [],
      plainText: rawLines.join('\n')
    };
  }

  return {
    language: detectedLanguage,
    lines,
  };
};