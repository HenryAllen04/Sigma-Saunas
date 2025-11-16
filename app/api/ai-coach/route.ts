import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: NextRequest) {
  try {
    const { message, sessionData, sensorData, userContext } = await request.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY not configured");
      return NextResponse.json(
        { error: "Gemini API key not configured. Please add GEMINI_API_KEY to your .env.local file" },
        { status: 500 }
      );
    }

    // Get the Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    // Build context for the AI
    const systemContext = `You are an expert AI Sauna Coach and wellness advisor specializing in sauna health, safety, and optimization. You help users get the most out of their sauna sessions while prioritizing safety.

Your expertise includes:
- Sauna safety protocols and best practices
- Heat stress management and recovery
- Cardiovascular health during sauna use
- Optimal session duration and temperature
- Pre and post-sauna routines
- Hydration strategies
- Benefits of different sauna types (traditional, infrared, etc.)
- Integration with fitness and recovery routines
- Recognition of warning signs and when to exit

Key safety principles:
- Never recommend unsafe practices
- Always emphasize hydration
- Recommend gradual progression for beginners
- Advise caution with alcohol or medications
- Suggest consulting doctors for medical conditions
- Emphasize listening to one's body

Provide personalized, actionable advice based on the user's session data and questions.`;

    // Format session data if available
    let contextPrompt = systemContext + "\n\n";
    
    if (sessionData && sessionData.length > 0) {
      contextPrompt += "User's Recent Sauna Sessions:\n";
      sessionData.forEach((session: any, index: number) => {
        const stats = typeof session.stats === 'string' ? JSON.parse(session.stats) : session.stats;
        contextPrompt += `Session ${index + 1} (${new Date(session.timestamp).toLocaleDateString()}):\n`;
        contextPrompt += `  - Duration: ${formatDuration(session.durationMs)}\n`;
        if (stats.temp) {
          contextPrompt += `  - Max Temperature: ${stats.temp.max?.toFixed(1)}°C\n`;
          contextPrompt += `  - Avg Temperature: ${stats.temp.avg?.toFixed(1)}°C\n`;
        }
        if (stats.hum) {
          contextPrompt += `  - Max Humidity: ${stats.hum.max?.toFixed(1)}%\n`;
          contextPrompt += `  - Avg Humidity: ${stats.hum.avg?.toFixed(1)}%\n`;
        }
      });
      contextPrompt += "\n";
    }

    if (sensorData) {
      contextPrompt += "Current Sauna Conditions:\n";
      if (sensorData.temperature) contextPrompt += `  - Temperature: ${sensorData.temperature}°C\n`;
      if (sensorData.humidity) contextPrompt += `  - Humidity: ${sensorData.humidity}%\n`;
      contextPrompt += "\n";
    }

    if (userContext) {
      contextPrompt += `Additional Context: ${userContext}\n\n`;
    }

    contextPrompt += `User Question: ${message}\n\nProvide a helpful, concise, and personalized response:`;

    // Generate response using Gemini
    const result = await model.generateContent(contextPrompt);
    const response = result.response;
    const text = response.text();

    return NextResponse.json({ 
      response: text,
      model: "gemini-2.0-flash-exp"
    });

  } catch (error) {
    console.error("AI Coach API error:", error);

    // Check for specific Gemini API errors
    let errorMessage = "Failed to generate AI response";
    const errorDetails = error instanceof Error ? error.message : String(error);

    if (errorDetails.includes("API_KEY") || errorDetails.includes("401")) {
      errorMessage = "Invalid Gemini API key. Please check your .env.local file";
    } else if (errorDetails.includes("quota") || errorDetails.includes("429")) {
      errorMessage = "API quota exceeded. Please check your Gemini API usage";
    } else if (errorDetails.includes("SAFETY")) {
      errorMessage = "Content was blocked by safety filters. Please rephrase your question";
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// Helper function to format duration
function formatDuration(durationMs?: number): string {
  if (!durationMs) return "--";
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

