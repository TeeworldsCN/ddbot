import { Application } from 'jsr:@oak/oak/application';
import { Router } from 'jsr:@oak/oak/router';
import { qq } from './routes/qq.ts';
import { wechat } from './routes/wechat.ts';
import { local } from './routes/local.ts';

const router = new Router();

if (Deno.env.get('LOCAL')) {
  local(router);
}

qq(router);
wechat(router);

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

const port = parseInt(Deno.env.get('PORT') || '0');
await app.listen({ port });
