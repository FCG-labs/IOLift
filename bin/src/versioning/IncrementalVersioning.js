"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BaseVersioning_1 = __importDefault(require("./BaseVersioning"));
class IncrementalVersioning extends BaseVersioning_1.default {
    constructor(releaseHistory) {
        super(releaseHistory, (v1, v2) => Number(v2) - Number(v1));
    }
}
exports.default = IncrementalVersioning;
//# sourceMappingURL=IncrementalVersioning.js.map