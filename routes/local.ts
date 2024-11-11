import { Router } from 'jsr:@oak/oak/router';
import { mainHandler } from '../handlers/main.ts';

export const local = (router: Router) => {
  router.post('/local', async ({ request, response }) => {
    const message = await request.body.text();
    await mainHandler(
      {
        text: (msg: string) => {
          response.body = msg;
        },
        link: (title: string, desc: string, url: string) => {
          response.body = `[${title} - ${desc}](${url})`;
        },
      },
      message,
      'DIRECT'
    );
  });
};
