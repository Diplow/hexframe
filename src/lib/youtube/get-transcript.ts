// Load environment variables from .env file
import "dotenv/config";
import { promises as fs } from "fs";
import * as path from "path";

// Fonction pour charger un prompt depuis un fichier
async function loadPrompt(filename: string): Promise<string> {
  const promptPath = path.join(
    process.cwd(),
    "src",
    "lib",
    "youtube",
    "prompts",
    filename,
  );
  try {
    return await fs.readFile(promptPath, "utf-8");
  } catch (error) {
    console.error(`Error loading prompt file ${filename}:`, error);
    throw error;
  }
}

async function getTranscript(videoId: string): Promise<string> {
  // Try to read from local file first
  try {
    // Use dynamic imports for compatibility with ESM
    const fs = await import("fs/promises");
    const path = await import("path");
    const fsSync = await import("fs");

    const transcriptDir = path.join(
      process.cwd(),
      "src",
      "lib",
      "youtube",
      "transcripts",
      "OsonsComprendre",
    );
    const transcriptPath = path.join(transcriptDir, `${videoId}.txt`);

    // Check if the transcript file exists
    if (fsSync.existsSync(transcriptPath)) {
      return await fs.readFile(transcriptPath, "utf-8");
    }

    // If not, fetch from YouTube API
    const youtubeApiKey = process.env.YOUTUBE_API_KEY;
    if (!youtubeApiKey) {
      throw new Error("YOUTUBE_API_KEY environment variable is not set. YouTube transcript functionality is disabled.");
    }
    
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/captions?videoId=${videoId}&part=snippet&key=${youtubeApiKey}`,
    );

    if (!response.ok) {
      console.error(response);
    }

    const data = await response.json() as { items?: Array<{ id: string }> };

    if (!data.items || data.items.length === 0) {
      throw new Error(`No captions found for video ${videoId}`);
    }

    // Get the caption track ID
    const captionId = data.items[0]?.id;
    
    if (!captionId) {
      throw new Error(`No caption ID found for video ${videoId}`);
    }

    // Fetch the actual transcript
    const transcriptResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/captions/${captionId}?tfmt=srt&key=${process.env.YOUTUBE_API_KEY}`,
    );

    if (!transcriptResponse.ok) {
      if (
        transcriptResponse.status === 401 ||
        transcriptResponse.status === 403
      ) {
        throw new Error(
          `YouTube API authorization failed (status ${transcriptResponse.status}). Please check your API key.`,
        );
      }
      throw new Error(
        `Failed to fetch transcript with status ${transcriptResponse.status}`,
      );
    }

    const transcriptText = await transcriptResponse.text();

    // Process the SRT format to extract just the text
    const cleanedTranscript = transcriptText
      .replace(
        /\d+\r?\n\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}\r?\n/g,
        "",
      )
      .replace(/\r?\n\r?\n/g, " ")
      .trim();

    // Ensure the transcripts directory exists
    try {
      await fs.access(transcriptDir);
    } catch {
      await fs.mkdir(transcriptDir, { recursive: true });
    }

    // Save the transcript locally for future use
    await fs.writeFile(transcriptPath, cleanedTranscript, "utf-8");

    return cleanedTranscript;
  } catch (error) {
    console.error("Error fetching transcript:", error);
    throw error;
  }
}

async function structureTranscript(transcript: string): Promise<ContentMap> {
  try {
    const { Mistral } = await import("@mistralai/mistralai");

    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new Error("MISTRAL_API_KEY environment variable is not set");
    }


    // Chargement du prompt unifié
    const unifiedPrompt = await loadPrompt("poc.md");

    const client = new Mistral({ apiKey });

    // Un seul appel API avec le prompt unifié
    const response = await client.chat.complete({
      model: "mistral-large-latest",
      messages: [
        {
          role: "user",
          content: unifiedPrompt.replace("${transcript}", transcript),
        },
      ],
      responseFormat: { type: "json_object" },
      temperature: 0.1,
    });

    if (!response?.choices?.[0]?.message?.content) {
      throw new Error("Réponse invalide de l'API Mistral: Contenu manquant");
    }

    const content = JSON.parse(response.choices[0].message.content as string) as ContentMap;


    return content;
  } catch (error) {
    console.error("Error structuring transcript:", error);
    throw error;
  }
}

async function analyzeVideo(videoId: string) {
  const transcript = await getTranscript(videoId);
  const contentMap = await structureTranscript(transcript);
  return contentMap;
}

const enum Feeling {
  NEGATIVE = 0,
  NEUTRAL = 1,
  POSITIVE = 2,
}

type Source = {
  timecode: string;
  quote: string;
};

type Example = {
  title: string;
  content: string;
  source: Source;
};

type Author = {
  name: string;
  content: string;
};

type Ref = {
  title: string;
  content: string;
  feeling: Feeling;
  source: Source;
  author: Author;
};

type Idea = {
  title: string;
  abstract: string;
  feeling: Feeling;
  examples: Example[];
};

type ContentMap = {
  title: string;
  abstract: string;
  ideas: Idea[];
  refs: Ref[];
};

// Export functions for use in other modules
export { getTranscript, structureTranscript, analyzeVideo };

// Command-line interface
// if (
//   import.meta.url === import.meta.resolve("./get-transcript.ts") ||
//   import.meta.url.endsWith("/get-transcript.js")
// ) {
//   const args = process.argv.slice(2);
//   const command = args[0] || "";
//   const videoId = args[1];

//   if (!videoId) {
//     console.error("Error: Video ID is required");
//     console.log("Usage: pnpm youtube:transcript <videoId>");
//     console.log("       pnpm youtube:analyze <videoId>");
//     process.exit(1);
//   }

//   async function main() {
//     try {
//       switch (command) {
//         case "transcript":
//           const transcript = await getTranscript(videoId as string);
//           console.log(transcript.substring(0, 200) + "...");
//           console.log(
//             `\nFull transcript saved to src/lib/youtube/transcripts/${videoId}.txt`,
//           );
//           break;

//         case "analyze":
//           console.log(`Analyzing video ${videoId}...`);
//           const analysis = await analyzeVideo(videoId as string);
//           console.log(JSON.stringify(analysis, null, 2));

//           // Save analysis to a file
//           const fs = await import("fs/promises");
//           const path = await import("path");
//           const analysisDir = path.join(
//             process.cwd(),
//             "src",
//             "lib",
//             "youtube",
//             "analysis",
//           );

//           try {
//             await fs.access(analysisDir);
//           } catch {
//             await fs.mkdir(analysisDir, { recursive: true });
//           }

//           const analysisPath = path.join(analysisDir, `${videoId}.json`);
//           await fs.writeFile(
//             analysisPath,
//             JSON.stringify(analysis, null, 2),
//             "utf-8",
//           );
//           console.log(
//             `Analysis saved to src/lib/youtube/analysis/${videoId}.json`,
//           );
//           break;

//         default:
//           console.error(`Unknown command: ${command}`);
//           console.log("Available commands: transcript, analyze");
//           process.exit(1);
//       }
//     } catch (error: any) {
//       console.error("Error:", error.message || String(error));
//       process.exit(1);
//     }
//   }

//   main();
// }
