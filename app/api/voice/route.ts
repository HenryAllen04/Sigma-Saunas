import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js"
import { NextRequest, NextResponse } from "next/server"

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 })
    }

    const audio = await elevenlabs.textToSpeech.convert("6XVxc5pFxXre3breYJhP", {
      text,
      modelId: "eleven_multilingual_v2",
    })

    // Convert ReadableStream to Buffer
    const reader = audio.getReader()
    const chunks: Uint8Array[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }

    const audioBuffer = Buffer.concat(chunks)

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
      },
    })
  } catch (error) {
    console.error("ElevenLabs API error:", error)
    return NextResponse.json(
      { error: "Failed to generate speech" },
      { status: 500 }
    )
  }
}
