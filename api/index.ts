import { createApp } from "../src/bootstrap.js";
import { createApiHandler } from "../src/api/handler.js";

const app = createApp();
const handle = createApiHandler(app);

export const config = { maxDuration: 30 };

export default {
  fetch(request: Request): Promise<Response> {
    return handle(request);
  }
};
