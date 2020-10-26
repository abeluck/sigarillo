import fsPromises from "fs/promises";
import path from "path";
import SignalApi from "@throneless/libsignal-service";
import { ServerError } from "../errors";
import SignalProtocolStore from "./signal-protocol-store";
import log from "../logger";

export default class SignalService {
  constructor(db, filePath, botData, storeData) {
    this.db = db;
    this.filePath = filePath;
    this.bot = botData;
    this.storage = new SignalProtocolStore(storeData);
    this.protocolStore = new SignalApi.ProtocolStore(this.storage);
    this.messages = [];
  }

  async start() {
    try {
      await this.protocolStore.load();
      let password = this.protocolStore.getPassword();
      if (!password) {
        password = SignalApi.KeyHelper.generatePassword();
        this.protocolStore.setPassword(password);
      }

      this.accountManager = new SignalApi.AccountManager(
        this.number,
        password,
        this.protocolStore
      );
      return;
    } catch (err) {
      log.error("Failed to initialize AccountManager");
      throw err;
    }
  }

  getStoreData() {
    return this.storage.getStoreData();
  }

  async requestSMSVerification() {
    return this.accountManager.requestSMSVerification();
  }

  async requestVoiceVerification() {
    return this.accountManager.requestVoiceVerification();
  }

  async verifyNumber(code) {
    return this.accountManager.registerSingleDevice(code);
  }

  async senderConnect() {
    log.debug("Connecting outgoing message service");
    try {
      this.messageSender = new SignalApi.MessageSender(this.protocolStore);
      await this.messageSender.connect();
    } catch (err) {
      log.error("Failed to connect outgoing message service");
      throw err;
    }
  }

  async send(recipient, message) {
    if (!this.messageSender) {
      await this.senderConnect();
    }
    const now = Date.now();
    const result = await this.messageSender.sendMessageToNumber({
      number: recipient,
      body: message
    });
    if (!result || result.errors.length > 0) {
      log.error(
        "Message sending failed. See debug level logs for more (sensitive) information)"
      );
      if (result) {
        log.debug(JSON.stringify(result, null, 2));
      } else {
        log.debug("result was null");
      }
      throw new Error("Message sending failed");
    }
    return {
      recipient,
      source: this.number,
      status: "sent",
      timestamp: now
    };
  }

  async receiverConnect() {
    log.debug("Connecting incoming message service");
    const messageReceiver = new SignalApi.MessageReceiver(this.protocolStore);
    await messageReceiver.connect();
    messageReceiver.addEventListener("error", async () => {
      await messageReceiver.close();
      messageReceiver.shutdown();
      log.error("Signal error encountered while receiving messages");
      throw new ServerError();
    });

    messageReceiver.addEventListener("message", ev => {
      if (this.filePath) {
        let savePath = path.normalize(this.filePath);
        savePath = path.join(
          savePath,
          ev.data.source.toString(),
          ev.data.timestamp.toString()
        );
        this.messages.push(
          Promise.resolve(
            fsPromises
              .mkdir(savePath, { recursive: true })
              .then(() => {
                const promises = [];
                // eslint-disable-next-line array-callback-return
                ev.data.message.attachments.map(attachment => {
                  promises.push(
                    // eslint-disable-next-line promise/no-nesting
                    messageReceiver
                      .handleAttachment(attachment)
                      .then(attachmentPointer => {
                        // eslint-disable-next-line promise/no-nesting
                        return SignalApi.AttachmentHelper.saveFile(
                          attachmentPointer,
                          savePath
                        ).then(filePath => {
                          return {
                            file_name: path.basename(filePath),
                            mime_type: attachmentPointer.contentType
                          };
                        });
                      })
                  );
                });
                return promises;
              })
              .then(promises => {
                // eslint-disable-next-line promise/no-nesting
                return Promise.all(promises).then(files => {
                  ev.confirm();
                  const { message } = ev.data;
                  // koajs can't parse AttachmentPointers for JSON output
                  message.attachments = "";
                  return {
                    source: ev.data.source.toString(),
                    timestamp: ev.data.timestamp.toString(),
                    message,
                    attachments: files
                  };
                });
              })
              .catch(err => log.error("Error receiving message: ", err))
          )
        );
      } else {
        ev.confirm();
        this.messages.push(
          Promise.resolve({
            source: ev.data.source.toString(),
            timestamp: ev.data.timestamp.toString(),
            message: ev.data.message,
            attachments: []
          })
        );
      }
    });
  }

  async receive() {
    if (!this.messageReceiver) {
      await this.receiverConnect();
    }
    if (this.messages.length > 0) {
      const received = this.messages.splice(0, this.messages.length - 1);
      return Promise.all(received);
    }
    log.debug("No messages");
    return [];
  }

  async stop() {
    // stop receiver
    await this.messageReceiver.close();
    this.messageReceiver.shutdown();
    // stop sender
    await this.messageSender.close();
    this.messageSender.shutdown();
  }
}
