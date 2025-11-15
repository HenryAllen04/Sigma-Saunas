import { NextRequest, NextResponse } from "next/server"

// Simple rule-based responses using ElevenLabs for voice
export async function POST(request: NextRequest) {
  try {
    const { question, healthData, saunaData, sessionDuration } = await request.json()

    if (!question) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 })
    }

    // Generate smart response based on question and metrics
    let response = ""
    const lowerQuestion = question.toLowerCase()

    // Heart rate questions
    if (lowerQuestion.includes("heart rate") || lowerQuestion.includes("heart")) {
      if (healthData.heartRate > 120) {
        response = `Your heart rate is ${healthData.heartRate} beats per minute, which is elevated. Consider taking a short break and cooling down. Stay hydrated.`
      } else if (healthData.heartRate > 100) {
        response = `Your heart rate is ${healthData.heartRate}, which is moderately elevated but normal for sauna use. You're doing fine, just maintain steady breathing.`
      } else {
        response = `Your heart rate is ${healthData.heartRate} beats per minute, which is in a good range. You're comfortable and safe to continue.`
      }
    }
    // Temperature/heat questions
    else if (lowerQuestion.includes("temperature") || lowerQuestion.includes("hot") || lowerQuestion.includes("heat")) {
      if (saunaData.temperature > 85) {
        response = `The sauna is at ${saunaData.temperature.toFixed(1)} degrees Celsius, which is quite hot. Make sure you're comfortable and don't hesitate to step out if needed.`
      } else {
        response = `The sauna is at ${saunaData.temperature.toFixed(1)} degrees with ${saunaData.humidity}% humidity. This is a comfortable temperature for most people.`
      }
    }
    // Duration/time questions
    else if (lowerQuestion.includes("how long") || lowerQuestion.includes("duration") || lowerQuestion.includes("time")) {
      const mins = Math.floor(sessionDuration / 60)
      const optimal = sessionDuration < 600 ? "You can continue" : "You've had a good session"
      response = `You've been in for ${mins} minutes. ${optimal}. Listen to your body and exit when you feel ready.`
    }
    // Safety/danger questions
    else if (lowerQuestion.includes("die") || lowerQuestion.includes("death") || lowerQuestion.includes("danger")) {
      if (healthData.heartRate > 120 || saunaData.temperature > 90) {
        response = `Your heart rate is ${healthData.heartRate} and temperature is ${saunaData.temperature.toFixed(1)} degrees, which is elevated. You should exit the sauna now and cool down. You're not in immediate danger but it's important to listen to your body.`
      } else {
        response = `You're completely safe. Your heart rate is ${healthData.heartRate} and the sauna is ${saunaData.temperature.toFixed(1)} degrees. These are normal levels. You're doing fine.`
      }
    }
    // Safety questions
    else if (lowerQuestion.includes("safe") || lowerQuestion.includes("okay") || lowerQuestion.includes("good") || lowerQuestion.includes("alright") || lowerQuestion.includes("fine")) {
      if (healthData.heartRate > 120 || saunaData.temperature > 90) {
        response = `Your metrics show some elevation. Heart rate is ${healthData.heartRate} and temperature is ${saunaData.temperature.toFixed(1)} degrees. Consider taking a break soon.`
      } else {
        response = `You're doing great! Your heart rate is ${healthData.heartRate} and the sauna is at ${saunaData.temperature.toFixed(1)} degrees. All metrics look good.`
      }
    }
    // Continue questions
    else if (lowerQuestion.includes("continue") || lowerQuestion.includes("stay") || lowerQuestion.includes("keep going")) {
      if (sessionDuration > 900) {
        response = `You've been in for ${Math.floor(sessionDuration / 60)} minutes, which is excellent. Consider wrapping up and cooling down gradually.`
      } else {
        response = `Your metrics look good. You can continue for a bit longer if you feel comfortable. Aim for 10 to 15 minutes total.`
      }
    }
    // Greetings/casual
    else if (lowerQuestion.includes("hello") || lowerQuestion.includes("hi ") || lowerQuestion.includes("hey")) {
      response = `Hello! I'm here to help guide your sauna session. Your heart rate is ${healthData.heartRate} and you're ${Math.floor(sessionDuration / 60)} minutes in. How are you feeling?`
    }
    // Care/help
    else if (lowerQuestion.includes("care") || lowerQuestion.includes("help")) {
      response = `I'm here to monitor your session and keep you safe. Your heart rate is ${healthData.heartRate}, sauna is ${saunaData.temperature.toFixed(1)} degrees. You can ask me about your metrics, duration, or if it's safe to continue.`
    }
    // General/default
    else {
      response = `Your current stats: heart rate is ${healthData.heartRate}, sauna temperature is ${saunaData.temperature.toFixed(1)} degrees. You're ${Math.floor(sessionDuration / 60)} minutes in. Feel free to ask about your safety, metrics, or how long to stay.`
    }

    return NextResponse.json({ response })
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    )
  }
}
