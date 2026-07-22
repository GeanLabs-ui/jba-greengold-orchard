export const onRequest: PagesFunction<Env> = async (context) => {
  const response = await context.env.API.fetch(context.request);
  return new Response(response.body, response);
};
