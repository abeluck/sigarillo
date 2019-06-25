import SignalApi from "@throneless/libsignal-service";
import ByteBuffer from "bytebuffer";
import SignalProtocolStore from "./signal-protocol-store";
import LocalStorageMemory from "./local-storage-memory";
import logger from "../logger";

const PASSWORD = "changeme"; // TODO what is this for exactly?

function SignalService(number, storeData) {
  this.number = number;
  this.localStore = new LocalStorageMemory(storeData);
  this.protocolStore = new SignalProtocolStore(this.localStore);
  this.accountManager = new SignalApi.AccountManager(
    number,
    PASSWORD,
    this.protocolStore
  );
}

SignalService.prototype = {
  getStoreData() {
    return this.localStore.cache;
  },
  async requestSMSVerification(number) {
    return this.accountManager.requestSMSVerification(number);
  },
  async requestVoiceVerification(number) {
    return this.accountManager.requestVoiceVerification(number);
  },
  async verifyNumber(number, code) {
    return this.accountManager.registerSingleDevice(number, code);
  },
  async send(recipient, message) {
    const messageSender = new SignalApi.MessageSender(
      this.number,
      PASSWORD,
      this.protocolStore
    );
    const now = Date.now();
    const result = await messageSender.sendMessageToNumber(
      recipient,
      message,
      null,
      null,
      now,
      undefined,
      this.protocolStore.get("profileKey")
    );
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
    return {
      recipient,
      source: this.number,
      status: "sent",
      timestamp: now
    };
  },
  async receive() {
    const signalingKey = ByteBuffer.wrap(
      this.protocolStore.get("signaling_key"),
      "binary"
    ).toArrayBuffer();
    const messageReceiver = new SignalApi.MessageReceiver(
      this.number.concat(".1"),
      PASSWORD,
      signalingKey,
      this.protocolStore
    );
    return new Promise(resolve => {
      const messages = [];
      messageReceiver.connect();
      messageReceiver.addEventListener("empty", async () => {
        await messageReceiver.close();

        return resolve(messages);
      });
      messageReceiver.addEventListener("message", ev => {
        // logger.info("MESSAGE RECEIVED")

        // console.log(JSON.stringify(ev, null, 2))
        messages.push({
          source: ev.data.source.toString(),
          timestamp: ev.data.timestamp.toString(),
          message: ev.data.message
        });
      });
    });
  }
};

export default SignalService;
