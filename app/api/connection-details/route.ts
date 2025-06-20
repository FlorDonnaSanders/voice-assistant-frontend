import { RoomAgentDispatch, RoomConfiguration } from "@livekit/protocol";
import { AccessToken, AccessTokenOptions, VideoGrant } from "livekit-server-sdk";
import { type NextRequest, NextResponse } from "next/server";

// Import NextRequest

// NOTE: you are expected to define the following environment variables in `.env.local`:
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;
const PHONE_NUMBER = process.env.PHONE_NUMBER;

// don't cache the results
export const revalidate = 0;

export type ConnectionDetails = {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
};

export async function GET(request: NextRequest) {
  try {
    if (!LIVEKIT_URL) throw new Error("LIVEKIT_URL is not defined");
    if (!API_KEY) throw new Error("LIVEKIT_API_KEY is not defined");
    if (!API_SECRET) throw new Error("LIVEKIT_API_SECRET is not defined");

    // Read agentName and unifiedEventId from query parameters
    const agentName = request.nextUrl.searchParams.get("agentName");
    const unifiedEventId = request.nextUrl.searchParams.get("unifiedEventId");

    // Generate participant token
    const participantIdentity = `${PHONE_NUMBER}`;
    const roomName = `voice_assistant_room_${Math.floor(Math.random() * 10000)}`;
    const participantToken = await createParticipantToken(
      {
        identity: participantIdentity,
        metadata: JSON.stringify({
          ...(agentName && { agentName }),
          ...(unifiedEventId && { unified_event_id: unifiedEventId }),
        }),
      },
      roomName
    );

    const data: ConnectionDetails = {
      serverUrl: LIVEKIT_URL,
      roomName,
      participantToken,
      participantName: participantIdentity,
    };
    const headers = new Headers({ "Cache-Control": "no-store" });
    return NextResponse.json(data, { headers });
  } catch (error) {
    if (error instanceof Error) {
      console.error(error);
      return new NextResponse(error.message, { status: 500 });
    }
  }
}

function createParticipantToken(userInfo: AccessTokenOptions, roomName: string) {
  const at = new AccessToken(API_KEY!, API_SECRET!, { ...userInfo, ttl: "15m" });
  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  };
  at.addGrant(grant);

  // @ts-expect-error: resolve version mismatch between livekit/protocol versions
  at.roomConfig = new RoomConfiguration({
    agents: [
      new RoomAgentDispatch({
        agentName: "livekit",
        metadata: JSON.stringify({}),
      }),
    ],
  });

  return at.toJwt();
}
