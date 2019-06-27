/*
MIT License

Copyright (c) 2015-2019 Uphold Inc.

https://github.com/uphold/koa-requestid

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import uuid from "uuid/v4";

const requestIdMiddleware = ({
  expose = "Request-Id",
  header = "Request-Id",
  query = "requestId"
} = {}) => {
  const options = { expose, header, query };

  const keys = Object.keys(options);
  const values = Object.values(options);
  for (let i = 0; i < keys.length; i += 1) {
    if (typeof values[i] !== "boolean" && typeof values[i] !== "string") {
      throw new Error(`Option \`${keys[i]}\` requires a boolean or a string`);
    }
  }

  return async function requestId(ctx, next) {
    let id;

    if (query) {
      id = ctx.query[query];
    }

    if (!id && header) {
      id = ctx.get(header);
    }

    if (!id) {
      id = uuid();
    }

    if (expose) {
      ctx.set(expose, id);
    }

    ctx.state.id = id;

    await next();
  };
};

export default requestIdMiddleware;
