import { getHarviaClient } from "@/lib/harvia-client";

/**
 * GET /api/sensor/stream
 * Server-Sent Events (SSE) endpoint for real-time sensor data
 * Sends updates every 5 seconds
 */
export async function GET() {
  const encoder = new TextEncoder();

  // Create a TransformStream to handle SSE
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Poll interval in milliseconds (5 seconds)
  const pollInterval = parseInt(process.env.POLL_INTERVAL || "5", 10) * 1000;

  // Function to send SSE message
  const sendMessage = async (data: unknown) => {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    await writer.write(encoder.encode(message));
  };

  // Start polling loop
  (async () => {
    const client = getHarviaClient();

    try {
      while (true) {
        try {
          const data = await client.getLatestData();
          await sendMessage(data);
        } catch (error) {
          // If it's a write error, the client disconnected
          if (error instanceof TypeError && error.message.includes("WritableStream")) {
            console.log("Client disconnected from SSE stream");
            break;
          }
          console.error("Error fetching sensor data in stream:", error);
          try {
            await sendMessage({
              error: "Failed to fetch sensor data",
              message: error instanceof Error ? error.message : "Unknown error",
            });
          } catch {
            // Client disconnected, exit loop
            break;
          }
        }

        // Wait for next poll interval
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }
    } catch (error) {
      // Stream closed by client, this is normal
      console.log("SSE stream ended");
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
