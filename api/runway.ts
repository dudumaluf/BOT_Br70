// api/runway.ts

// This is the Vercel Edge Function signature.
// It ensures this function runs in a fast, lightweight environment.
export const config = {
  runtime: 'edge',
};

/**
 * This function acts as a secure backend proxy for all requests to the RunwayML API.
 * It handles starting, checking, and deleting tasks.
 * By routing requests through this serverless function, we bypass browser CORS restrictions
 * and keep the RunwayML API key from being exposed to the client.
 */
export default async function handler(request: Request) {
  // Set CORS headers to allow requests from our web app.
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // Or you can specify your Vercel app's domain for stricter security
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // The browser sends an OPTIONS request first to check CORS compatibility (a "preflight" request).
  // We need to respond with a 204 status to let it proceed.
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Retrieve the API key securely from server-side environment variables.
  const runwayApiKey = process.env.RUNWAY_API_KEY;
  if (!runwayApiKey) {
    return new Response(JSON.stringify({ error: 'Runway API key not configured on the server.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const commonHeaders = {
    'Authorization': `Bearer ${runwayApiKey}`,
    'X-Runway-Version': '2024-11-06',
    'Content-Type': 'application/json',
  };

  try {
    // Handle POST requests to START a new generation task.
    if (request.method === 'POST') {
      const body = await request.json();
      const runwayResponse = await fetch('https://api.dev.runwayml.com/v1/character_performance', {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify(body),
      });
      const data = await runwayResponse.json();
      return new Response(JSON.stringify(data), {
        status: runwayResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);
    const taskId = url.searchParams.get('taskId');

    // For GET and DELETE, a taskId is required.
    if (!taskId) {
      return new Response(JSON.stringify({ error: 'taskId query parameter is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle GET requests to check a task's STATUS.
    if (request.method === 'GET') {
      const runwayResponse = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
        headers: commonHeaders,
      });
      const data = await runwayResponse.json();
      return new Response(JSON.stringify(data), {
        status: runwayResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Handle DELETE requests to CANCEL/DELETE a task.
    if (request.method === 'DELETE') {
       const runwayResponse = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
        method: 'DELETE',
        headers: commonHeaders,
      });
       // A successful DELETE returns a 204 No Content response.
       return new Response(null, {
        status: runwayResponse.status,
        headers: corsHeaders,
      });
    }

    // If any other HTTP method is used, return an error.
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
