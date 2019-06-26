import R from "ramda";

function LocalStorageMemory(state) {
  this.cache = state;
  this.length = Object.keys(state).length;
}

/**
 * number of stored items.
 */
LocalStorageMemory.prototype.length = 0;

LocalStorageMemory.prototype = {
  /**
   * returns item for passed key, or null
   *
   * @para {String} key
   *       name of item to be returned
   * @returns {String|null}
   */
  getItem(key) {
    return this.cache[key] || null;
  },

  /**
   * sets item for key to passed value, as String
   *
   * @para {String} key
   *       name of item to be set
   * @para {String} value
   *       value, will always be turned into a String
   * @returns {undefined}
   */
  setItem(key, value) {
    if (typeof value === "undefined") {
      this.removeItem(key);
    } else {
      if (!R.has(key, this.cache)) {
        this.length += 1;
      }

      this.cache[key] = `${value}`;
    }
  },

  /**
   * removes item for passed key
   *
   * @para {String} key
   *       name of item to be removed
   * @returns {undefined}
   */
  removeItem(key) {
    if (R.has(key, this.cache)) {
      delete this.cache[key];
      this.length -= 1;
    }
  },

  /**
   * returns name of key at passed index
   *
   * @para {Number} index
   *       Position for key to be returned (starts at 0)
   * @returns {String|null}
   */
  key(index) {
    return Object.keys(this.cache)[index] || null;
  },

  /**
   * removes all stored items and sets length to 0
   *
   * @returns {undefined}
   */
  clear() {
    this.cache = {};
    this.length = 0;
  }
};
export default LocalStorageMemory;
