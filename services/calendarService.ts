import { FullMeetingData } from "../types";

export const getMockCalendarEvents = (): Promise<FullMeetingData[]> => {
  return new Promise((resolve) => {
    // Simulate network delay
    setTimeout(() => {
      const now = new Date();
      
      const event1Date = new Date(now);
      event1Date.setHours(event1Date.getHours() + 1); // 1 hour from now

      const event2Date = new Date(now);
      event2Date.setDate(event2Date.getDate() + 1); // Tomorrow
      event2Date.setHours(10, 0, 0, 0);

      const events: FullMeetingData[] = [
        {
          id: 'cal-evt-1',
          title: 'Q3 Roadmap Review',
          createdAt: now.toISOString(),
          scheduledAt: event1Date.toISOString(),
          durationSec: 0,
          status: 'scheduled',
        },
        {
          id: 'cal-evt-2',
          title: 'Engineering Sync w/ Design',
          createdAt: now.toISOString(),
          scheduledAt: event2Date.toISOString(),
          durationSec: 0,
          status: 'scheduled',
        }
      ];
      resolve(events);
    }, 800);
  });
};