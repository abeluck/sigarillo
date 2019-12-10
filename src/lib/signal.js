import SignalApi from "@throneless/libsignal-service";
import fs from "fs";
import path from "path";
import SignalProtocolStore from "./signal-protocol-store";
import logger from "../logger";

function SignalService(number, filePath, storeData) {
  this.number = number;
  this.filePath = filePath;
  this.storage = new SignalProtocolStore(storeData);
  this.protocolStore = new SignalApi.ProtocolStore(this.storage);
}

SignalService.prototype = {
  async start() {
    return this.protocolStore
      .load()
      .then(() => this.protocolStore.getPassword())
      .then(password => {
        let myPass = password;
        if (!password) {
          myPass = SignalApi.KeyHelper.generatePassword();
          this.protocolStore.setPassword(myPass);
        }

        this.accountManager = new SignalApi.AccountManager(
          this.number,
          myPass,
          this.protocolStore
        );
      });
  },
  getStoreData() {
    return this.storage.getStoreData();
  },
  async requestSMSVerification() {
    return this.accountManager.requestSMSVerification();
  },
  async requestVoiceVerification() {
    return this.accountManager.requestVoiceVerification();
  },
  async verifyNumber(code) {
    return this.accountManager.registerSingleDevice(code);
  },
  async send(recipient, message) {
    const messageSender = new SignalApi.MessageSender(this.protocolStore);
    messageSender.connect().then(() => {
      const now = Date.now();
      messageSender
        .sendMessageToNumber({
          number: recipient,
          body: message
        })
        .then(result => {
          if (!result || result.errors.length > 0) {
            logger.error(
              "Message sending failed. See debug level logs for more (sensitive) information)"
            );
            if (result) {
              logger.debug(JSON.stringify(result, null, 2));
            } else {
              logger.debug("result was null");
            }
            throw new Error("Message sending failed");
          }
        });
      return {
        recipient,
        source: this.number,
        status: "sent",
        timestamp: now
      };
    });
  },
  async receive() {
    const messageReceiver = new SignalApi.MessageReceiver(this.protocolStore);
    return new Promise((resolve, reject) => {
      const messages = [];
      messageReceiver.connect().then(() => {
        messageReceiver.addEventListener("empty", async () => {
          await messageReceiver.close();
          messageReceiver.shutdown();
          return Promise.all(messages).then(resolved => {
            resolve(resolved);
          });
        });
        messageReceiver.addEventListener("error", async () => {
          await messageReceiver.close();
          messageReceiver.shutdown();
          reject(
            new Error("signal api error encountered with receiving messages")
          );
        });

        messageReceiver.addEventListener("message", ev => {
          if (this.filePath) {
            let savePath = path.normalize(this.filePath);
            savePath = path.join(
              savePath,
              ev.data.source.toString(),
              ev.data.timestamp.toString()
            );
            messages.push(
              Promise.resolve(
                fs.promises
                  .mkdir(savePath, { recursive: true })
                  .then(() => {
                    const promises = [];
                    // eslint-disable-next-line array-callback-return
                    ev.data.message.attachments.map(attachment => {
                      promises.push(
                        messageReceiver
                          .handleAttachment(attachment)
                          .then(attachmentPointer => {
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
                  .catch(err => logger.error("Error receiving message: ", err))
              )
            );
          } else {
            ev.confirm();
            messages.push(
              Promise.resolve({
                source: ev.data.source.toString(),
                timestamp: ev.data.timestamp.toString(),
                message: ev.data.message,
                attachments: []
              })
            );
          }
        });
      });
    });
  }
};

export default SignalService;
