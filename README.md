# Sigarillo

> A (micro) web-application to make web-based [Signal][0] bots easy to write.

Built on the library [libsignal-service-javascript][2] by [Josh King][3] and of
course the great efforts of the fine folks at Open Whisper Systems.

**Implemented features:**

* Register a number with Signal
* Verify a number with the SMS code
* Persistence of account data and keys
* Exposes HTTP endpoints for:
  * sending messages
  * receiving messages

**WARNING: This application has not been audited. It should not be regarded as
secure, use at your own risk.**

**This is a third-party effort, and is NOT a part of the official [Signal][0]
project or any other project of [Open Whisper Systems][1].**

### What? Why?

When you need to communicate over Signal from a different service, for example,
[a help desk](http://zammad.org/) or other web-app, you don't want to have to
port the signal-protocol to your stack (unless you *do* want that, in which case
Sigarillo isn't for you).

You might be willing to make certain security tradeoffs, for example,
terminating the end-to-end encryption of the Signal protocol at Sigarillo
rather than at your application.

You also understand that you should secure Sigarillo with an HTTPS reverse
proxy, or even better, deploy Sigarillo on the same box as your consuming service
and don't expose it to the wild at all!

If this all sounds acceptable to you, then you might like Sigarillo.

Sigarillo stores keys and Signal account data in a postgres database. It does
not come with HTTPS out of the box. Your Sigarillo API tokens essentially give
full access to your Signal account (to the extent that Sigarillo has
implemented Signal features). Use with caution. Use with caution.

## Usage

### Prerequisites

For local development 
* node.js
* yarn
* postgresql

### Run the thing

```bash
# edit env file
$ cp env-sample .env
$ vim .env
```

Note: By default the Signal staging server will be used, unless the `NODE_ENV`
variable is set to `production`.

```bash

# install deps
$ yarn

# setup db schema
$ yarn run db:migrate

# populate with default data 
$ yarn run db:load

# start the server
$ yarn run debug

# login at http://localhost:3000 with user admin@demo.com:admin
```

## HTTP API 

1. Use the `Accept: application/json` header
2. `TOKEN` should be treated like a password.

### Get bot info

A simple method for testing your bot's auth token. Requires no parameters. Returns basic information about the bot.

**request**
```
GET /bot/<TOKEN>/
```

***response***

```json
{
    "id": "129f1757-e706-452e-aa1c-4994a95e1092",
    "number": "+15555555552",
    "user_id": "845ae4d0-f2c3-5342-91a2-5b45cb8db57c",
    "token": "8129c0b4-0b96-4486-84fc-c3dd7b03f846",
    "is_verified": true,
    "created_at": "2018-11-02T11:36:24.273Z",
    "updated_at": "2018-11-02T11:36:24.273Z"
}

```

### Sending

**request**
```
POST /bot/<TOKEN>/send

{
  "recipient": "+15555555552",
  "messsage": "Hello World!"
}
```

**response**
```json
{
  "result": {
    "recipient": "+15555555551",
    "source": "+15555555552",
    "status": "sent",
    "timestamp": "1543420505142"
  }
}
```

### Receive

**request**
```
GET /bot/<TOKEN>/receive
```

**response**
```json
{
  "messages": [
    {
      "source": "+15555555551",
      "timestamp": "1541265073894",
      "message": {
        "body": "Hello World!",
        "profileKey": "XXTXQ=="
      }
    }
  ],
  "bot": {
    "id": "129f1757-e706-452e-aa1c-4994a95e1092",
    "number": "+15555555552",
    "user_id": "845ae4d0-f2c3-5342-91a2-5b45cb8db57c",
    "token": "8129c0b4-0b96-4486-84fc-c3dd7b03f846",
    "is_verified": true,
    "created_at": "2018-11-02T11:36:24.273Z",
    "updated_at": "2018-11-02T11:36:24.273Z"
  }
}
```



## Todo

* [x] ~~Find a better name for the project~~ (signal-bots is now Sigarillo)
* [ ] Add tests
* [ ] Voice verification
* [ ] Attachments
* [ ] Robust error handling
* [ ] Examples of usage (webhook, simple bot, etc)
* [ ] Clean up UI

## License

[![License GNU AGPL v3.0](https://img.shields.io/badge/License-AGPL%203.0-lightgrey.svg)](https://github.com/abeluck/sigarillo/blob/master/LICENSE.md)

Sigarillo is a free software project licensed under the GNU Affero General Public License v3.0 (GNU AGPLv3) by [Guardian Project](https://guardianproject.info).

[0]: https://signal.org
[1]:  https://whispersystems.org
[2]: https://github.com/throneless-tech/libsignal-service-javascript
[3]: https://github.com/jheretic
