/* eslint-disable camelcase */
import {
  getString,
  isNumberSane,
  jsonThing,
  unencodeNumber
} from "@throneless/libsignal-service/src/helpers";
import libsignal from "@throneless/libsignal-protocol";
import ByteBuffer from "bytebuffer";

const TIMESTAMP_THRESHOLD = 5 * 1000; // 5 seconds

const VerifiedStatus = {
  DEFAULT: 0,
  VERIFIED: 1,
  UNVERIFIED: 2
};

function validateVerifiedStatus(status) {
  if (
    status === VerifiedStatus.DEFAULT ||
    status === VerifiedStatus.VERIFIED ||
    status === VerifiedStatus.UNVERIFIED
  ) {
    return true;
  }
  return false;
}

const StaticByteBufferProto = new ByteBuffer().__proto__;
const StaticArrayBufferProto = new ArrayBuffer().__proto__;
const StaticUint8ArrayProto = new Uint8Array().__proto__;

function isStringable(thing) {
  return (
    thing === Object(thing) &&
    (thing.__proto__ == StaticArrayBufferProto ||
      thing.__proto__ == StaticUint8ArrayProto ||
      thing.__proto__ == StaticByteBufferProto)
  );
}

function convertToArrayBuffer(thing) {
  if (thing === undefined) {
    return undefined;
  }
  if (thing === Object(thing)) {
    if (thing.__proto__ == StaticArrayBufferProto) {
      return thing;
    }
    // TODO: Several more cases here...
  }

  if (thing instanceof Array) {
    // Assuming Uint16Array from curve25519
    var res = new ArrayBuffer(thing.length * 2);
    var uint = new Uint16Array(res);
    for (var i = 0; i < thing.length; i++) {
      uint[i] = thing[i];
    }
    return res;
  }

  let str;
  if (isStringable(thing)) {
    str = stringObject(thing);
  } else if (typeof thing === "string") {
    str = thing;
  } else {
    throw new Error(
      `Tried to convert a non-stringable thing of type ${typeof thing} to an array buffer`
    );
  }
  var res = new ArrayBuffer(str.length);
  var uint = new Uint8Array(res);
  for (var i = 0; i < str.length; i++) {
    uint[i] = str.charCodeAt(i);
  }
  return res;
}

function equalArrayBuffers(ab1, ab2) {
  if (!(ab1 instanceof ArrayBuffer && ab2 instanceof ArrayBuffer)) {
    return false;
  }
  if (ab1.byteLength !== ab2.byteLength) {
    return false;
  }
  let result = 0;
  const ta1 = new Uint8Array(ab1);
  const ta2 = new Uint8Array(ab2);
  for (let i = 0; i < ab1.byteLength; ++i) {
    result |= ta1[i] ^ ta2[i];
  }
  return result === 0;
}

function IdentityRecord(
  id,
  publicKey,
  firstUse,
  timestamp,
  verified,
  nonblockingApproval
) {
  this.id = id;
  this.publicKey = publicKey;
  this.firstUse = firstUse;
  this.timestamp = timestamp;
  this.verified = verified;
  this.nonblockingApproval;
}

IdentityRecord.prototype = {
  constructor: IdentityRecord
};

function Session(id, record, deviceId, number) {
  this.id = id;
  this.record = record;
  this.deviceId = deviceId;
  this.number = number;
}

Session.prototype = {
  constructor: Session
};

function SignalProtocolStore(store) {
  this.store = store;
}

SignalProtocolStore.prototype = {
  Direction: {
    SENDING: 1,
    RECEIVING: 2
  },

  // create a random group id that we haven't seen before.
  generateNewGroupId() {
    const groupId = getString(libsignal.crypto.getRandomBytes(16));
    return this.getGroup(groupId).then(function(group) {
      if (group === undefined) {
        return groupId;
      }
      console.warn("group id collision"); // probably a bad sign.
      return this.generateNewGroupId();
    });
  },
  getIdentityKeyPair() {
    const identityKey = this.get("identityKey");
    if (!(identityKey.pubKey instanceof ArrayBuffer)) {
      identityKey.pubKey = convertToArrayBuffer(identityKey.pubKey);
    }
    if (!(identityKey.privKey instanceof ArrayBuffer)) {
      identityKey.privKey = convertToArrayBuffer(identityKey.privKey);
    }
    return Promise.resolve(identityKey);
  },
  getLocalRegistrationId() {
    return Promise.resolve(this.get("registrationId"));
  },
  put(key, value) {
    if (value === undefined) throw new Error("Tried to store undefined");
    this.store.setItem(`${key}`, jsonThing(value));
  },

  get(key, defaultValue) {
    const value = this.store.getItem(`${key}`);
    if (value === null) return defaultValue;
    return JSON.parse(value);
  },

  remove(key) {
    this.store.removeItem(`${key}`);
  },
  clear() {
    this.store = {};
  },
  isTrustedIdentity(identifier, identityKey, direction) {
    if (identifier === null || identifier === undefined) {
      throw new Error("tried to check identity key for undefined/null key");
    }
    if (!(identityKey instanceof ArrayBuffer)) {
      throw new Error("Expected identityKey to be an ArrayBuffer");
    }
    const trusted = this.get(`identityKey${identifier}`);
    if (trusted === undefined) {
      return Promise.resolve(true);
    }
    return Promise.resolve(
      getString(identityKey) === getString(trusted.publicKey)
    );
  },
  loadIdentityKey(identifier) {
    if (identifier === null || identifier === undefined)
      throw new Error("Tried to get identity key for undefined/null key");
    const identityRecord = this.get(`identityKey${identifier}`, null);
    if (identityRecord !== null) {
      return Promise.resolve(identityRecord.publicKey);
    }
    return Promise.resolve(null);
  },
  saveIdentity(identifier, identityKey, nonblockingApproval) {
    if (identifier === null || identifier === undefined)
      throw new Error("Tried to put identity key for undefined/null key");
    if (!(identityKey instanceof ArrayBuffer)) {
      identityKey = convertToArrayBuffer(identityKey);
    }
    if (typeof nonblockingApproval !== "boolean") {
      nonblockingApproval = false;
    }
    const number = unencodeNumber(identifier)[0];
    const identityRecord = new IdentityRecord({ id: number });

    const existing = this.get(`identityKey${identifier}`, null);
    if (existing === null) {
      console.debug("Saving new identity...");
      identityRecord.publicKey = identityKey;
      identityRecord.firstUse = true;
      identityRecord.timestamp = Date.now();
      identityRecord.verified = VerifiedStatus.DEFAULT;
      identityRecord.nonblockingApproval = nonblockingApproval;
      this.put(`identityKey${identifier}`, identityRecord);
      return Promise.resolve(false);
    }
    if (!equalArrayBuffers(existing.publicKey, identityKey)) {
      console.debug("Replacing existing identity...");
      let verifiedStatus;
      if (
        existing.verifiedStatus === VerifiedStatus.VERIFIED ||
        existing.verifiedStatus === VerifiedStatus.UNVERIFIED
      ) {
        verifiedStatus = VerifiedStatus.UNVERIFIED;
      } else {
        verifiedStatus = VerifiedStatus.DEFAULT;
      }
      identityRecord.publicKey = identityKey;
      identityRecord.firstUse = false;
      identityRecord.timestamp = Date.now();
      identityRecord.verified = verifiedStatus;
      identityRecord.nonblockingApproval = nonblockingApproval;
      this.put(`identityKey${identifier}`, identityRecord);
      this.archiveSiblingSessions(identifier);
      return Promise.resolve(true);
    }
    if (existing !== null && this.isNonBlockingApprovalRequired(existing)) {
      console.debug("Setting approval status...");
      existing.nonblockingApproval = true;
      this.put(`identityKey${identifier}`, existing);
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  },
  isNonBlockingApprovalRequired(identityRecord) {
    return (
      !(
        identityRecord.firstUse === null ||
        identityRecord.firstUse === undefined
      ) &&
      Date.now() - identityRecord.timestamp < TIMESTAMP_THRESHOLD &&
      identityRecord.nonblockingApproval
    );
  },
  saveIdentityWithAttributes(identifier, attributes) {
    if (identifier === null || identifier === undefined) {
      throw new Error("Tried to put identity key for undefined/null key");
    }
    const number = unencodeNumber(identifier)[0];
    const identityRecord = new IdentityRecord({ id: number });
    Object.assign(identityRecord, attributes);
    this.put(`identityKey${identifier}`, identityRecord);
    return Promise.resolve();
  },
  /* Returns a prekeypair object or undefined */
  loadPreKey(keyId) {
    let res = this.get(`25519KeypreKey${keyId}`);
    if (res !== undefined) {
      if (!(res.pubKey instanceof ArrayBuffer)) {
        res.pubKey = convertToArrayBuffer(res.pubKey);
      }
      if (!(res.privKey instanceof ArrayBuffer)) {
        res.privKey = convertToArrayBuffer(res.privKey);
      }
      res = { pubKey: res.pubKey, privKey: res.privKey };
    }
    return Promise.resolve(res);
  },
  storePreKey(keyId, keyPair) {
    return Promise.resolve(this.put(`25519KeypreKey${keyId}`, keyPair));
  },
  removePreKey(keyId) {
    return Promise.resolve(this.remove(`25519KeypreKey${keyId}`));
  },
  clearPreKeyStore() {
    for (const id of Object.keys(this.store.cache)) {
      if (id.startsWith("25519KeypreKey")) {
        this.remove(id);
      }
    }
    return Promise.resolve();
  },

  /* Returns a signed keypair object or undefined */
  loadSignedPreKey(keyId) {
    let res = this.get(`25519KeysignedKey${keyId}`);
    if (res !== undefined) {
      if (!(res.pubKey instanceof ArrayBuffer)) {
        res.pubKey = convertToArrayBuffer(res.pubKey);
      }
      if (!(res.privKey instanceof ArrayBuffer)) {
        res.privKey = convertToArrayBuffer(res.privKey);
      }
      res = { pubKey: res.pubKey, privKey: res.privKey };
    }
    return Promise.resolve(res);
  },
  loadSignedPreKeys() {
    const signedPreKeys = [];
    for (const id of Object.keys(this.store.cache)) {
      if (id.startsWith("25519KeysignedKey")) {
        const prekey = this.get(id);
        if (!(prekey.pubKey instanceof ArrayBuffer)) {
          prekey.pubKey = convertToArrayBuffer(prekey.pubKey);
        }
        if (!(prekey.privKey instanceof ArrayBuffer)) {
          prekey.privKey = convertToArrayBuffer(prekey.privKey);
        }
        // signedPreKeys.push({
        //  pubkey:       prekey.pubkey,
        //  privkey:      prekey.privkey,
        //  created_at:   prekey.created_at,
        //  keyId:        prekey.id,
        //  confirmed:    prekey.confirmed
        // });
        signedPreKeys.push(prekey);
      }
    }
    return Promise.resolve(signedPreKeys);
  },
  storeSignedPreKey(keyId, keyPair) {
    return Promise.resolve(this.put(`25519KeysignedKey${keyId}`, keyPair));
  },
  removeSignedPreKey(keyId) {
    return Promise.resolve(this.remove(`25519KeysignedKey${keyId}`));
  },
  clearSignedPreKeysStore() {
    for (const id of Object.keys(this.store.cache)) {
      if (id.startsWith("25519KeysignedKey")) {
        this.remove(id);
      }
    }
    return Promise.resolve();
  },
  getDeviceIds(number) {
    if (number === null || number === undefined) {
      throw new Error("Tried to get device ids for undefined/null number");
    }
    const collection = [];
    for (const id of Object.keys(this.store.cache)) {
      if (id.startsWith(`session${number}`)) {
        collection.push(this.get(id).deviceId);
      }
    }
    return Promise.resolve(collection);
  },
  loadSession(identifier) {
    console.debug(`Trying to get session for identifier: ${identifier}`);
    const session = this.get(`session${identifier}`, { record: undefined });
    return Promise.resolve(session.record);
  },
  storeSession(identifier, record) {
    const number = unencodeNumber(identifier)[0];
    const deviceId = parseInt(unencodeNumber(identifier)[1]);
    const session = new Session(identifier, record, deviceId, number);
    return Promise.resolve(this.put(`session${identifier}`, session));
  },
  removeSession(identifier) {
    return Promise.resolve(this.remove(`session${identifier}`));
  },
  removeAllSessions(identifier) {
    console.debug(`Removing sessions starting with ${identifier}`);
    for (const id of Object.keys(this.store.cache)) {
      if (id.startsWith(`session${identifier}`)) {
        this.remove(id);
      }
    }
    return Promise.resolve();
  },
  archiveSiblingSessions(identifier) {
    console.debug(`archiveSiblingSessions identifier: ${identifier}`);
    const address = libsignal.SignalProtocolAddress.fromString(identifier);
    const ourDeviceId = address.getDeviceId();
    return this.getDeviceIds(address.getName()).then(deviceIds =>
      Promise.all(
        deviceIds.map(function(deviceId) {
          if (deviceId !== ourDeviceId) {
            const sibling = new libsignal.SignalProtocolAddress(
              address.getName(),
              deviceId
            );
            console.debug("closing session for", sibling.toString());
            const sessionCipher = new libsignal.SessionCipher(this, sibling);
            return sessionCipher.closeOpenSessionForDevice();
          }
        })
      )
    );
  },
  clearSessionStore() {
    return Promise.resolve(this.removeAllSessions(""));
  },

  // Groups
  getGroup(groupId) {
    if (groupId === null || groupId === undefined) {
      throw new Error("Tried to get group for undefined/null id");
    }
    return Promise.resolve(this.get(`group${groupId}`));
  },
  putGroup(groupId, group) {
    if (groupId === null || groupId === undefined) {
      throw new Error("Tried to put group key for undefined/null id");
    }
    if (group === null || group === undefined) {
      throw new Error("Tried to put undefined/null group object");
    }
    return Promise.resolve(this.put(`group${groupId}`, group));
  },
  removeGroup(groupId) {
    if (groupId === null || groupId === undefined) {
      throw new Error("Tried to remove group key for undefined/null id");
    }
    return Promise.resolve(this.remove(`group${groupId}`));
  },

  // Not yet processed messages - for resiliency
  getAllUnprocessed() {
    const collection = [];
    for (const id of Object.keys(this.store.cache)) {
      if (id.startsWith("unprocessed")) {
        collection.push(this.get(id));
      }
    }
    return Promise.resolve(collection);
  },
  countUnprocessed() {
    const collection = [];
    for (const id of Object.keys(this.store.cache)) {
      if (id.startsWith("unprocessed")) {
        collection.push(this.get(id));
      }
    }
    return Promise.resolve(collection.length);
  },
  removeAllUnprocessed() {
    const collection = [];
    for (const id of Object.keys(this.store.cache)) {
      if (id.startsWith("unprocessed")) {
        this.remove(id);
      }
    }
    return Promise.resolve();
  },
  getUnprocessed(id) {
    const collection = [];
    for (const id of Object.keys(this.store.cache)) {
      if (id.startsWith(`unprocessed${id}`)) {
        collection.push(this.get(id));
      }
    }
    return Promise.resolve(collection);
  },
  addUnprocessed(data) {
    return Promise.resolve(this.put(`unprocessed${data.id}`, data));
  },
  updateUnprocessed(id, updates) {
    const unprocessed = this.get(`unprocessed${id}`, { id });
    Object.assign(unprocessed, updates);
    return Promise.resolve(this.put(`unprocessed${id}`, unprocessed));
  },
  removeUnprocessed(id) {
    return Promise.resolve(this.remove(`unprocessed${id}`));
  },
  // USER STORAGE
  userSetNumberAndDeviceId(number, deviceId, deviceName) {
    this.put("number_id", `${number}.${deviceId}`);
    if (deviceName) {
      this.put("device_name", deviceName);
    }
  },
  userGetNumber() {
    const number_id = this.get("number_id");
    if (number_id === undefined) return undefined;
    return unencodeNumber(number_id)[0];
  },

  userGetDeviceId() {
    const number_id = this.get("number_id");
    if (number_id === undefined) return undefined;
    return unencodeNumber(number_id)[1];
  },

  userGetDeviceName() {
    return this.get("device_name");
  },
  // GROUP STORAGE
  groupsCreateNewGroup(numbers, groupId) {
    var groupId = groupId;
    return new Promise(function(resolve) {
      if (groupId !== undefined) {
        resolve(
          this.getGroup(groupId).then(group => {
            if (group !== undefined) {
              throw new Error("Tried to recreate group");
            }
          })
        );
      } else {
        resolve(
          generateNewGroupId().then(newGroupId => {
            groupId = newGroupId;
          })
        );
      }
    }).then(function() {
      const me = this.userGetNumber();
      let haveMe = false;
      const finalNumbers = [];
      for (i of numbers) {
        const number = numbers[i];
        if (!isNumberSane(number)) throw new Error("Invalid number in group");
        if (number == me) haveMe = true;
        if (finalNumbers.indexOf(number) < 0) finalNumbers.push(number);
      }

      if (!haveMe) finalNumbers.push(me);

      const groupObject = { numbers: finalNumbers, numberRegistrationIds: {} };
      for (i of finalNumbers)
        groupObject.numberRegistrationIds[finalNumbers[i]] = {};

      this.putGroup(groupId, groupObject).then(() => ({
        id: groupId,
        numbers: finalNumbers
      }));
    });
  },

  groupsGetNumbers(groupId) {
    this.getGroup(groupId).then(group => {
      if (group === undefined) return undefined;

      return group.numbers;
    });
  },

  groupsRemoveNumber(groupId, number) {
    this.getGroup(groupId).then(function(group) {
      if (group === undefined) return undefined;

      const me = this.userGetNumber();
      if (number == me) {
        throw new Error(
          "Cannot remove ourselves from a group, leave the group instead"
        );
      }

      const i = group.numbers.indexOf(number);
      if (i > -1) {
        group.numbers.splice(i, 1);
        delete group.numberRegistrationIds[number];
        this.putGroup(groupId, group).then(() => group.numbers);
      }

      return group.numbers;
    });
  },

  groupsAddNumbers(groupId, numbers) {
    this.getGroup(groupId).then(function(group) {
      if (group === undefined) return undefined;

      for (i of numbers) {
        const number = numbers[i];
        if (!isNumberSane(number))
          throw new Error("Invalid number in set to add to group");
        if (group.numbers.indexOf(number) < 0) {
          group.numbers.push(number);
          group.numberRegistrationIds[number] = {};
        }
      }

      this.putGroup(groupId, group).then(() => group.numbers);
    });
  },

  groupsDeleteGroup(groupId) {
    return this.removeGroup(groupId);
  },

  groupsGetGroup(groupId) {
    this.getGroup(groupId).then(group => {
      if (group === undefined) return undefined;

      return { id: groupId, numbers: group.numbers };
    });
  },

  groupsUpdateNumbers(groupId, numbers) {
    this.getGroup(groupId).then(function(group) {
      if (group === undefined)
        throw new Error("Tried to update numbers for unknown group");

      if (numbers.filter(isNumberSane).length < numbers.length)
        throw new Error("Invalid number in new group members");

      const added = numbers.filter(number => group.numbers.indexOf(number) < 0);

      return this.groupsAddNumbers(groupId, added);
    });
  }
};

export default SignalProtocolStore;
