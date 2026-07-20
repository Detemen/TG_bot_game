import { env } from "./env.js";
import { buildApp } from "./app.js";

async function bootstrap() {
  const app = buildApp();
  const host = env.HOST;
  const port = env.PORT;

  try {
    await app.listen({ host, port });
    app.log.info(`HTTP server listening on http://${host}:${port}`);
  } catch (error) {
    app.log.error(error, "Failed to start HTTP server");
    process.exit(1);
  }
}

bootstrap();
