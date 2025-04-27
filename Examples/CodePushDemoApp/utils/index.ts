import {Platform} from "react-native";

export function getPlatform() {
  switch (Platform.OS) {
    case "ios":
      return "ios";
    case "android":
      return "android";
    default:
      throw new Error("Unsupported platform");
  }
}

export function trackError(error: unknown) {
  console.error(error); // fake implementation
}

export function findKeyByValue(
  object: Record<string, unknown>,
  value: unknown,
) {
  return Object.keys(object).find(key => object[key] === value);
}
