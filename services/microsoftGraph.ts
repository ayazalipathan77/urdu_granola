import { PublicClientApplication, EventType } from "@azure/msal-browser";
import { FullMeetingData } from "../types";

let msalInstance: PublicClientApplication | null = null;

const initializeMsal = async (clientId: string) => {
  if (msalInstance) return msalInstance;

  msalInstance = new PublicClientApplication({
    auth: {
      clientId: clientId,
      authority: "https://login.microsoftonline.com/common",
      redirectUri: window.location.origin, // e.g., http://localhost:5173
    },
    cache: {
      cacheLocation: "sessionStorage",
      storeAuthStateInCookie: false,
    },
  });

  await msalInstance.initialize();
  return msalInstance;
};

export const fetchOutlookEvents = async (clientId: string): Promise<FullMeetingData[]> => {
  if (!clientId) throw new Error("Client ID required");

  const msal = await initializeMsal(clientId);

  const loginRequest = {
    scopes: ["Calendars.Read", "User.Read"],
  };

  let tokenResponse;
  
  try {
    // Try to acquire token silently first
    const accounts = msal.getAllAccounts();
    if (accounts.length > 0) {
      tokenResponse = await msal.acquireTokenSilent({
        ...loginRequest,
        account: accounts[0],
      });
    } else {
      // Otherwise popup
      tokenResponse = await msal.loginPopup(loginRequest);
    }
  } catch (err) {
    // Fallback to popup if silent fails
    tokenResponse = await msal.loginPopup(loginRequest);
  }

  if (!tokenResponse || !tokenResponse.accessToken) {
    throw new Error("Failed to acquire access token");
  }

  // Fetch Events from Graph API
  const startDateTime = new Date().toISOString();
  const endDateTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // Next 7 days

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${startDateTime}&endDateTime=${endDateTime}&$select=subject,start,end,location`,
    {
      headers: {
        Authorization: `Bearer ${tokenResponse.accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch calendar events");
  }

  const data = await response.json();
  
  // Map Graph API events to our App's Meeting format
  return data.value.map((event: any) => ({
    id: event.id,
    title: event.subject,
    createdAt: new Date().toISOString(),
    scheduledAt: event.start.dateTime, // Graph returns { dateTime: "...", timeZone: "..." }
    durationSec: 0,
    status: 'scheduled',
  }));
};