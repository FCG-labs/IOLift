"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCodePush = exports.CodePushProvider = void 0;
const react_1 = __importStar(require("react"));
const IOLift_1 = __importDefault(require("~/IOLift"));
const CodePushContext = (0, react_1.createContext)(undefined);
const CodePushProvider = ({ children }) => {
    const [isUpdateAvailable, setIsUpdateAvailable] = (0, react_1.useState)(false);
    const [updateInfo, setUpdateInfo] = (0, react_1.useState)(null);
    const checkUpdate = () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const remotePackage = yield IOLift_1.default.checkForUpdate();
            if (remotePackage && remotePackage.isMandatory !== undefined) {
                setIsUpdateAvailable(true);
                setUpdateInfo(remotePackage);
            }
            else {
                setIsUpdateAvailable(false);
                setUpdateInfo(null);
            }
        }
        catch (e) {
            setIsUpdateAvailable(false);
            setUpdateInfo(null);
        }
    });
    const applyUpdate = () => __awaiter(void 0, void 0, void 0, function* () {
        yield IOLift_1.default.sync({
            installMode: IOLift_1.default.InstallMode.IMMEDIATE,
        });
    });
    return (react_1.default.createElement(CodePushContext.Provider, { value: {
            isUpdateAvailable,
            updateInfo,
            checkUpdate,
            applyUpdate,
        } }, children));
};
exports.CodePushProvider = CodePushProvider;
const useCodePush = () => (0, react_1.useContext)(CodePushContext);
exports.useCodePush = useCodePush;
//# sourceMappingURL=CodePushContext.js.map