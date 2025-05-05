"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const semver_1 = __importDefault(require("semver"));
const BaseVersioning_1 = __importDefault(require("./BaseVersioning"));
class SemverVersioning extends BaseVersioning_1.default {
    constructor(releaseHistory) {
        super(releaseHistory, (v1, v2) => (semver_1.default.gt(v1, v2) ? -1 : 1));
    }
}
exports.default = SemverVersioning;
//# sourceMappingURL=SemverVersioning.js.map