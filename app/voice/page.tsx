"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  getCurrentHealthData,
  getHealthDataStream,
  type HealthData
} from "@/lib/mockHealthData"

// Real sauna data types (from Harvia API)
interface SaunaData {
  temperature: number
  humidity: number
  presence: boolean
  timestamp: Date
}
import { Play, Square, Heart, Thermometer, Activity, Mic } from "lucide-react"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

export default function VoicePage() {
  const [sessionActive, setSessionActive] = useState(false)
  const [healthData, setHealthData] = useState<HealthData | null>(null)
  const [saunaData, setSaunaData] = useState<SaunaData | null>(null)
  const [sessionDuration, setSessionDuration] = useState(0)
  const [lastGuidance, setLastGuidance] = useState<string>("")
  const [isListening, setIsListening] = useState(false)
  const [conversation, setConversation] = useState<Message[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const healthStreamRef = useRef<(() => void) | null>(null)
  const saunaStreamRef = useRef<(() => void) | null>(null)
  const recognitionRef = useRef<any>(null)
  const conversationEndRef = useRef<HTMLDivElement>(null)
  const shouldListenRef = useRef<boolean>(false)
  const healthDataRef = useRef<HealthData | null>(null)
  const saunaDataRef = useRef<SaunaData | null>(null)
  const sessionDurationRef = useRef<number>(0)

  useEffect(() => {
    // Initialize with current health data (mock)
    const initialHealthData = getCurrentHealthData()
    console.log("🏥 Initializing health data:", initialHealthData)
    setHealthData(initialHealthData)
    healthDataRef.current = initialHealthData

    // Fetch initial sauna data from real API
    const fetchInitialSaunaData = async () => {
      try {
        const response = await fetch('/api/sensor/current')
        if (response.ok) {
          const data = await response.json()
          const saunaData: SaunaData = {
            temperature: data.data.temp || 0,
            humidity: data.data.hum || 0,
            presence: data.data.presence === 1,
            timestamp: new Date()
          }
          console.log("🧖 Initializing sauna data:", saunaData)
          setSaunaData(saunaData)
          saunaDataRef.current = saunaData
        }
      } catch (error) {
        console.error("Failed to fetch initial sauna data:", error)
      }
    }

    fetchInitialSaunaData()

    // Initialize speech recognition
    if (typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = "en-US"

      recognitionRef.current.onresult = async (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript.trim()

        // Only process if we're in an active session
        if (!shouldListenRef.current) return
        if (!transcript || transcript.length < 3) return // Ignore very short utterances

        console.log("Heard:", transcript)

        // Add user message to conversation
        const userMessage: Message = {
          role: "user",
          content: transcript,
          timestamp: new Date(),
        }
        setConversation((prev) => [...prev, userMessage])

        // Process the question
        await handleUserQuestion(transcript)
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error)
        // Auto-restart if it was an error during active session
        if (shouldListenRef.current && event.error !== "aborted") {
          setTimeout(() => {
            if (shouldListenRef.current && recognitionRef.current) {
              try {
                recognitionRef.current.start()
              } catch (e) {
                // Already started
              }
            }
          }, 1000)
        }
      }

      recognitionRef.current.onend = () => {
        // Auto-restart if session is still active
        if (shouldListenRef.current) {
          setTimeout(() => {
            if (shouldListenRef.current && recognitionRef.current) {
              try {
                recognitionRef.current.start()
                setIsListening(true)
              } catch (e) {
                // Already started
              }
            }
          }, 100)
        } else {
          setIsListening(false)
        }
      }

      recognitionRef.current.onstart = () => {
        setIsListening(true)
      }
    }
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (sessionActive) {
      interval = setInterval(() => {
        setSessionDuration((prev) => {
          const newDuration = prev + 1
          sessionDurationRef.current = newDuration
          return newDuration
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [sessionActive])

  useEffect(() => {
    // Scroll to bottom of conversation
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [conversation])

  const generateGuidance = (health: HealthData, sauna: SaunaData, duration: number): string => {
    // Safety thresholds
    if (health.heartRate > 120) {
      return `Your heart rate is ${health.heartRate} beats per minute, which is quite elevated. Consider taking a break and cooling down for your safety.`
    }

    if (sauna.temperature > 85) {
      return `The sauna temperature is now ${sauna.temperature.toFixed(2)} degrees Celsius. This is getting quite hot. Make sure you're staying hydrated.`
    }

    // Duration-based guidance
    if (duration === 0) {
      return `Welcome to your sauna session. The temperature is ${sauna.temperature.toFixed(2)} degrees with ${sauna.humidity.toFixed(2)} percent humidity. Your current heart rate is ${health.heartRate}. Take slow, deep breaths and relax.`
    }

    if (duration === 60) {
      return `You've been in the sauna for one minute. Your heart rate is ${health.heartRate}. Remember to focus on your breathing and stay present.`
    }

    if (duration === 180) {
      return `Three minutes in. You're doing great. Your heart rate has increased to ${health.heartRate}, which is normal. The sauna is at ${sauna.temperature.toFixed(2)} degrees.`
    }

    if (duration === 300) {
      return `Five minutes complete. Consider doing some gentle stretches if you feel comfortable. Your heart rate is ${health.heartRate}.`
    }

    if (duration === 600) {
      return `You've completed 10 minutes. This is an excellent session length for recovery. Your body temperature is ${health.bodyTemperature} degrees. You can continue or begin your cool-down when ready.`
    }

    if (duration === 900) {
      return `Fifteen minutes is a substantial session. Your heart rate is ${health.heartRate}. Consider finishing up and moving to the cool-down phase.`
    }

    return ""
  }

  const speakGuidance = async (text: string) => {
    if (!text) return

    try {
      setLastGuidance(text)
      setIsSpeaking(true)

      // Pause speech recognition while AI is speaking
      if (recognitionRef.current && shouldListenRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (e) {
          // Already stopped
        }
      }

      const response = await fetch("/api/voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        console.error("Failed to generate speech")
        setIsSpeaking(false)
        // Restart recognition
        if (recognitionRef.current && shouldListenRef.current) {
          try {
            recognitionRef.current.start()
          } catch (e) {
            // Already started
          }
        }
        return
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)

      if (audioRef.current) {
        audioRef.current.src = audioUrl

        // Resume listening when audio finishes
        audioRef.current.onended = () => {
          setIsSpeaking(false)
          if (recognitionRef.current && shouldListenRef.current) {
            setTimeout(() => {
              try {
                recognitionRef.current.start()
              } catch (e) {
                // Already started
              }
            }, 500)
          }
        }

        audioRef.current.play()
      }
    } catch (error) {
      console.error("Error speaking guidance:", error)
      setIsSpeaking(false)
      // Restart recognition on error
      if (recognitionRef.current && shouldListenRef.current) {
        try {
          recognitionRef.current.start()
        } catch (e) {
          // Already started
        }
      }
    }
  }

  const handleUserQuestion = async (question: string) => {
    console.log("🎤 Processing question:", question)

    const currentHealthData = healthDataRef.current
    const currentSaunaData = saunaDataRef.current
    const currentDuration = sessionDurationRef.current

    console.log("📊 Current data:", { currentHealthData, currentSaunaData, currentDuration })

    if (!currentHealthData || !currentSaunaData) {
      console.error("❌ No health or sauna data available")
      return
    }

    setIsProcessing(true)

    // Pause listening while processing
    if (recognitionRef.current && shouldListenRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (e) {
        // Already stopped
      }
    }

    try {
      console.log("📡 Calling API with:", { question, currentHealthData, currentSaunaData, currentDuration })

      // Get AI response
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
          healthData: currentHealthData,
          saunaData: currentSaunaData,
          sessionDuration: currentDuration,
        }),
      })

      console.log("📥 API response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ Failed to get AI response:", errorText)
        setIsProcessing(false)
        // Resume listening
        if (recognitionRef.current && shouldListenRef.current) {
          setTimeout(() => {
            try {
              recognitionRef.current.start()
            } catch (e) {
              // Already started
            }
          }, 500)
        }
        return
      }

      const data = await response.json()
      const aiResponse = data.response

      console.log("✅ Got AI response:", aiResponse)

      // Add assistant message to conversation
      const assistantMessage: Message = {
        role: "assistant",
        content: aiResponse,
        timestamp: new Date(),
      }
      setConversation((prev) => [...prev, assistantMessage])

      setIsProcessing(false)

      console.log("🔊 Speaking response...")
      // Speak the response (this will handle resuming listening)
      await speakGuidance(aiResponse)
    } catch (error) {
      console.error("❌ Error processing question:", error)
      setIsProcessing(false)
      // Resume listening on error
      if (recognitionRef.current && shouldListenRef.current) {
        setTimeout(() => {
          try {
            recognitionRef.current.start()
          } catch (e) {
            // Already started
          }
        }, 500)
      }
    }
  }

  const startSession = () => {
    setSessionActive(true)
    setSessionDuration(0)
    shouldListenRef.current = true

    // Start continuous listening
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start()
        setIsListening(true)
      } catch (e) {
        console.error("Error starting recognition:", e)
      }
    }

    // Start health data stream (mock)
    healthStreamRef.current = getHealthDataStream((data) => {
      setHealthData(data)
      healthDataRef.current = data
    }, 5000)

    // Start real sauna data stream using SSE
    const eventSource = new EventSource('/api/sensor/stream')

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        const saunaData: SaunaData = {
          temperature: data.data.temp || 0,
          humidity: data.data.hum || 0,
          presence: data.data.presence === 1,
          timestamp: new Date()
        }
        setSaunaData(saunaData)
        saunaDataRef.current = saunaData
      } catch (error) {
        console.error("Error parsing sauna data:", error)
      }
    }

    eventSource.onerror = (error) => {
      console.error("SSE error:", error)
      eventSource.close()
    }

    // Store cleanup function
    saunaStreamRef.current = () => {
      eventSource.close()
    }

    // Initial guidance
    if (healthData && saunaData) {
      speakGuidance(generateGuidance(healthData, saunaData, 0))
    }
  }

  const stopSession = () => {
    setSessionActive(false)
    setSessionDuration(0)
    shouldListenRef.current = false

    // Stop continuous listening
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
        setIsListening(false)
      } catch (e) {
        // Already stopped
      }
    }

    // Stop data streams
    if (healthStreamRef.current) {
      healthStreamRef.current()
      healthStreamRef.current = null
    }

    if (saunaStreamRef.current) {
      saunaStreamRef.current()
      saunaStreamRef.current = null
    }

    speakGuidance("Session complete. Great work! Remember to rehydrate and cool down gradually.")
  }

  useEffect(() => {
    if (sessionActive && healthData && saunaData) {
      const guidance = generateGuidance(healthData, saunaData, sessionDuration)
      if (guidance) {
        speakGuidance(guidance)
      }
    }
  }, [sessionDuration])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">
                    Platform
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Voice Session</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <audio ref={audioRef} />

          {/* Session Timer */}
          <div className="flex justify-center">
            <div className="bg-card border rounded-lg p-4 text-center">
              <div className="text-4xl font-mono font-semibold">
                {formatTime(sessionDuration)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Session Duration</p>
            </div>
          </div>

          {/* Data Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Health Data Card */}
            <div className="bg-card border rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500" />
                Health Metrics
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Heart Rate</span>
                  <span className="text-xl font-semibold">{healthData?.heartRate || "--"} bpm</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">HRV</span>
                  <span className="text-xl font-semibold">{healthData?.hrv || "--"} ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Body Temp</span>
                  <span className="text-xl font-semibold">{healthData?.bodyTemperature || "--"}°C</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Active Calories</span>
                  <span className="text-xl font-semibold">{healthData?.activeCalories || "--"}</span>
                </div>
              </div>
            </div>

            {/* Sauna Data Card */}
            <div className="bg-card border rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Thermometer className="w-5 h-5 text-orange-500" />
                Sauna Environment
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Temperature</span>
                  <span className="text-xl font-semibold">
                    {saunaData?.temperature ? saunaData.temperature.toFixed(1) : "--"}°C
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Humidity</span>
                  <span className="text-xl font-semibold">
                    {saunaData?.humidity ? saunaData.humidity.toFixed(1) : "--"}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Presence</span>
                  <span className="text-xl font-semibold">
                    {saunaData?.presence ? "Detected" : "None"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Conversation History */}
          {conversation.length > 0 && (
            <div className="bg-card border rounded-lg p-6 max-h-96 overflow-y-auto">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Conversation
              </h3>
              <div className="space-y-3">
                {conversation.map((message, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      message.role === "user"
                        ? "bg-muted ml-8"
                        : "bg-primary/5 mr-8"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="font-semibold text-xs">
                        {message.role === "user" ? "You" : "AI Coach"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                    <p className="mt-1 text-sm">
                      {message.content}
                    </p>
                  </div>
                ))}
                <div ref={conversationEndRef} />
              </div>
            </div>
          )}

          {/* Last Guidance */}
          {lastGuidance && conversation.length === 0 && (
            <div className="bg-card border rounded-lg p-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Latest Guidance
              </h3>
              <p className="text-muted-foreground">{lastGuidance}</p>
            </div>
          )}

          {/* Session Control */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-4">
              {!sessionActive ? (
                <Button
                  onClick={startSession}
                  size="lg"
                  className="px-8 py-6"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Start Session
                </Button>
              ) : (
                <Button
                  onClick={stopSession}
                  size="lg"
                  variant="outline"
                  className="px-8 py-6"
                >
                  <Square className="w-5 h-5 mr-2" />
                  Stop Session
                </Button>
              )}
            </div>

            {/* Status indicators */}
            {sessionActive && (
              <div className="flex flex-col items-center gap-2">
                {isSpeaking && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    AI is speaking...
                  </div>
                )}
                {isProcessing && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                    Thinking...
                  </div>
                )}
                {!isSpeaking && !isProcessing && isListening && (
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Mic className="w-4 h-4 text-green-500 animate-pulse" />
                    <span className="text-green-600">Listening - speak anytime</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Safety Notice */}
          <div className="bg-muted/50 border rounded-lg p-4 text-center">
            <p className="text-xs text-muted-foreground">
              Sauna temperature and humidity are real-time data from your Harvia sauna.
              Health metrics (heart rate, HRV) are pulled from apple watch data.
              Always consult with a healthcare professional before starting a sauna routine,
              especially if you have any medical conditions.
            </p>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
