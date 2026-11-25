import { api } from "./api.mjs";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return api(request, env);
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || !["GET","HEAD"].includes(request.method)) return response;
    const shell = /^\/(?:racun|prijava|registracija|procjena-cijene|uvjeti-koristenja|privatnost|kolacici|dsa-prijava)\/?$/;
    return shell.test(url.pathname) ? env.ASSETS.fetch(new Request(new URL("/", url), request)) : response;
  },
};
