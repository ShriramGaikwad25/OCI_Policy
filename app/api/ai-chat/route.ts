import { NextRequest, NextResponse } from "next/server";
import { getUserFacingChatError, sendChatMessage, SuppressedChatError } from "@/lib/ai-chat-api";
import { getJwtTokenFromRequest } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const jwtToken = getJwtTokenFromRequest(request);
    if (!jwtToken && !process.env.POLICY_OPTIMIZATION_API_KEY?.trim()) {
      return NextResponse.json(
        { message: "Sign in required to use the AI assistant." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as {
      message?: string;
      conversation_id?: string;
    };

    const message = body.message?.trim() ?? "";
    if (!message) {
      return NextResponse.json({ message: "Message is required." }, { status: 400 });
    }

    const result = await sendChatMessage(message, body.conversation_id, jwtToken);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SuppressedChatError) {
      console.error("[ai-chat] suppressed LLM error");
      return NextResponse.json({ suppressed: true }, { status: 503 });
    }
    const rawMessage = error instanceof Error ? error.message : "Failed to send chat message";
    const userMessage = getUserFacingChatError(rawMessage);
    const status =
      error instanceof Error && "status" in error && typeof error.status === "number"
        ? error.status
        : 500;
    console.error("[ai-chat]", rawMessage);
    if (!userMessage) {
      return NextResponse.json({ suppressed: true }, { status: 503 });
    }
    return NextResponse.json({ message: userMessage }, { status });
  }
}
