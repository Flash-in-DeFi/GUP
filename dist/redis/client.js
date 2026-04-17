"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("../config/env");
exports.redis = new ioredis_1.default(env_1.config.redisUrl, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
});
exports.redis.on('error', (err) => {
    console.error('Redis connection error:', err);
});
//# sourceMappingURL=client.js.map