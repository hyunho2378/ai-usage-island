const claude = require('./claude.cjs');
const chatgpt = require('./chatgpt.cjs');
const gemini = require('./gemini.cjs');
const common = require('./common.cjs');

const providers = { claude, chatgpt, gemini };
const ORDER = ['claude', 'chatgpt', 'gemini'];

module.exports = { providers, ORDER, statusOf: common.statusOf };
