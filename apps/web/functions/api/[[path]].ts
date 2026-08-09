export const onRequest: PagesFunction<Env> = async (context) => {
  const requestId = context.request.headers.get('X-Request-ID') || crypto.randomUUID();
  try {
    if (!context.env.API) throw new Error('API service binding is missing');
    const response = await context.env.API.fetch(context.request);
    return new Response(response.body, response);
  } catch (error) {
    console.error(JSON.stringify({
      event: 'api_service_unavailable',
      requestId,
      error: error instanceof Error ? error.message : 'Unknown service binding error',
    }));
    return Response.json({
      error: { code: 'API_UNAVAILABLE', message: 'The application service is temporarily unavailable' },
      requestId,
    }, { status: 503, headers: { 'Retry-After': '10', 'X-Request-ID': requestId } });
  }
};
