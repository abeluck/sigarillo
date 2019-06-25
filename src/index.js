/* eslint-disable no-global-assign */
// noinspection ES6ConvertRequireIntoImport
require = require("esm")(module);
// noinspection ES6ConvertRequireIntoImport
const server = require("./server").default;

server();
module.exports = server;
