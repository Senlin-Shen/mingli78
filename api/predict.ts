
// This file is no longer used as the application now utilizes the Google GenAI SDK 
// directly in the frontend components for better streaming and performance.
export default async function handler() {
  return new Response('Migrated to Client-side SDK', { status: 410 });
}
