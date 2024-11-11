import { crypto } from 'jsr:@std/crypto';
import { Status } from 'jsr:@oak/commons@1/status';
import { Router } from 'jsr:@oak/oak/router';
import * as OTPAuth from 'https://deno.land/x/otpauth@v9.3.4/dist/otpauth.esm.js';
import { Authenticate, PERMISSIONS } from '../utility/permissions.ts';

// A really simple user management API. Mostly used for moderators.
const kv = await Deno.openKv();
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export interface User {
  username: string;
  pass: string;
  secret: string;
  permissions: PERMISSIONS[];
}

export interface Token {
  username: string;
  permissions: PERMISSIONS[];
}

export const user = (router: Router) => {
  // Register a new user
  router.post('/register', async ({ request, response }) => {
    const body = (await request.body.json()) as { code?: string; username?: string; pass?: string };
    if (!body.code || !body.username || !body.pass) {
      response.status = Status.BadRequest;
      return;
    }

    // TODO: potential race condition, since we rarely issue codes so it's probably fine
    const code = await kv.get(['code', body.code]);
    if (!code.value) {
      response.status = Status.Forbidden;
      return;
    }

    const username = body.username;
    const secret = textDecoder.decode(crypto.getRandomValues(new Uint8Array(16)));
    const pass = textDecoder.decode(
      await crypto.subtle.digest('SHA-256', textEncoder.encode(secret + body.pass))
    );

    const result = await kv
      .atomic()
      .check({ key: ['user', username], versionstamp: null })
      .set(['user', username], {
        username: body.username,
        pass,
        secret,
        permissions: code.value,
      } as User)
      .delete(['code', body.code])
      .commit();

    if (!result.ok) {
      response.status = Status.Conflict;
      response.body = 'ERR_USERNAME_TAKEN';
      return;
    }

    response.body = {
      username,
      secret,
    };
  });

  // Login with otp + password or an already logged in session to refresh the token
  router.post('/login', async ({ request, response }) => {
    const body = (await request.body.json()) as {
      username?: string;
      pass?: string;
      totp?: string;
      token?: string;
    };

    if (!body.username) {
      response.status = Status.BadRequest;
      return;
    }

    const user = await kv.get<User>(['user', body.username]);
    if (!user.value) {
      response.status = Status.Unauthorized;
      return;
    }

    let authenticated = false;

    if (body.pass && body.totp) {
      // Login using password and totp
      const pass = textDecoder.decode(
        await crypto.subtle.digest('SHA-256', textEncoder.encode(user.value.secret + body.pass))
      );
      if (pass != user.value.pass) {
        response.status = Status.Unauthorized;
        return;
      }

      const totp = new OTPAuth.TOTP({ secret: user.value.secret });
      if (!totp.validate({ token: body.totp, window: 2 })) {
        response.status = Status.Unauthorized;
        return;
      }

      authenticated = true;
    }

    if (body.token) {
      // Login using token
      const token = await kv.get<Token>(['token', body.token]);
      if (!token.value) {
        response.status = Status.Unauthorized;
        return;
      }

      if (token.value.username != body.username) {
        response.status = Status.Unauthorized;
        return;
      }

      authenticated = true;
    }

    if (authenticated) {
      const token = textDecoder.decode(crypto.getRandomValues(new Uint8Array(16)));
      await kv.set(
        ['token', token],
        {
          username: body.username,
          permissions: user.value.permissions,
        } as Token,
        { expireIn: 3 * 24 * 60 * 60 * 1000 }
      );

      response.body = {
        token,
      };
    } else {
      response.status = Status.Unauthorized;
      return;
    }
  });

  // Generate invite code for new user registration
  router.get('/invite', async ({ request, response }) => {
    const user = Authenticate(request, 'ADMIN');
    if (!user) {
      response.status = Status.Unauthorized;
      return;
    }

    const body = (await request.body.json()) as { permissions: PERMISSIONS[] };
    if (!body.permissions.length) {
      response.status = Status.BadRequest;
      return;
    }

    const code = crypto.randomUUID();
    await kv.set(['invite', code], {
      permissions: body.permissions,
    });

    response.body = {
      code,
    };
  });
};
