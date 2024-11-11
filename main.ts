import { Application } from 'jsr:@oak/oak/application';
import { Router } from 'jsr:@oak/oak/router';
import { qq } from './routes/qq.ts';
import { wechat } from './routes/wechat.ts';
import { local } from './routes/local.ts';
import { user } from './routes/user.ts';

const router = new Router();

// System API
user(router);

// Bot Webhooks
if (Deno.env.get('LOCAL')) {
  local(router);
}

qq(router);
wechat(router);

const app = new Application();
const cors = Deno.env.get('CORS');
if (cors) {
  app.use((ctx, next) => {
    ctx.response.headers.set('Access-Control-Allow-Origin', cors);
    ctx.response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    return next();
  });
}
app.use(router.routes());
app.use(router.allowedMethods());

const port = parseInt(Deno.env.get('PORT') || '0');
await app.listen({ port });
