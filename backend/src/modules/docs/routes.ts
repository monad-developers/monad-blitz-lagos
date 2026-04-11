import { Hono } from "hono";
import { createOpenApiDocument } from "./openapi";

function renderSwaggerHtml(specUrl: string) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PayPilot Backend Docs</title>
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css"
    />
    <style>
      body {
        margin: 0;
        background: #faf8f2;
      }

      .topbar {
        display: none;
      }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: ${JSON.stringify(specUrl)},
        dom_id: "#swagger-ui",
        deepLinking: true,
        docExpansion: "list",
        persistAuthorization: true,
      });
    </script>
  </body>
</html>`;
}

export const docsRoutes = new Hono()
  .get("/", (c) => {
    const requestUrl = new URL(c.req.url);
    const docsPath = requestUrl.pathname.endsWith("/")
      ? requestUrl.pathname
      : `${requestUrl.pathname}/`;
    const specUrl = new URL("openapi.json", `${requestUrl.origin}${docsPath}`).toString();

    return c.html(renderSwaggerHtml(specUrl));
  })
  .get("/openapi.json", (c) => {
    const serverOrigin = new URL(c.req.url).origin;
    return c.json(createOpenApiDocument(serverOrigin));
  });
