/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useState} from "react";
import {
  Appearance,
  Button,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from "react-native";
import CodePush, {
  ReleaseHistoryInterface,
  UpdateCheckRequest,
} from "@fcg-labs/iolift";
import axios from "axios";
import {findKeyByValue, getPlatform, trackError} from "./utils";

import {Colors, Header} from "react-native/Libraries/NewAppScreen";

Appearance.setColorScheme("light");

function App(): React.JSX.Element {
  const [syncResult, setSyncResult] = useState("");
  const [progress, setProgress] = useState(0);
  const [runningMetadata, setRunningMetadata] = useState("");
  const [pendingMetadata, setPendingMetadata] = useState("");
  const [latestMetadata, setLatestMetadata] = useState("");

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: Colors.white}}>
      <StatusBar barStyle={"dark-content"} />
      <SmallHeader />
      <ScrollView contentContainerStyle={{padding: 16}}>
        <View style={{gap: 8}}>
          <Button
            title={"Check for updates"}
            onPress={() => {
              CodePush.sync(
                {
                  updateDialog: true,
                },
                status => {
                  const statusKey = findKeyByValue(CodePush.SyncStatus, status);
                  setSyncResult(statusKey ?? "");
                },
                ({receivedBytes, totalBytes}) => {
                  setProgress(Math.round((receivedBytes / totalBytes) * 100));
                },
              );
            }}
          />
          <Text>{`Check result: ${syncResult}`}</Text>
          <Text>{`Download progress: ${
            progress > 0 ? progress + "%" : ""
          }`}</Text>
        </View>

        <View style={{gap: 8, marginTop: 16}}>
          <Button
            title={"Clear updates"}
            onPress={() => {
              CodePush.clearUpdates();
              setSyncResult("");
              setProgress(0);
            }}
          />
          <Button
            title={"Restart app"}
            onPress={() => {
              CodePush.restartApp();
            }}
          />

          <Button
            title={"Get update metadata"}
            onPress={async () => {
              const [running, pending, latest] = await Promise.all([
                CodePush.getUpdateMetadata(CodePush.UpdateState.RUNNING),
                CodePush.getUpdateMetadata(CodePush.UpdateState.PENDING),
                CodePush.getUpdateMetadata(CodePush.UpdateState.LATEST),
              ]);
              setRunningMetadata(JSON.stringify(running, null, 2));
              setPendingMetadata(JSON.stringify(pending, null, 2));
              setLatestMetadata(JSON.stringify(latest, null, 2));
            }}
          />
          <Text>Running:</Text>
          <GetMetadataResult value={`${runningMetadata}`} />
          <Text>Pending:</Text>
          <GetMetadataResult value={`${pendingMetadata}`} />
          <Text>Latest:</Text>
          <GetMetadataResult value={`${latestMetadata}`} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SmallHeader() {
  return (
    <View style={{height: 80, justifyContent: "flex-end", overflow: "hidden"}}>
      <Header />
    </View>
  );
}

function GetMetadataResult({value}: {value: string}) {
  return (
    <TextInput
      value={value}
      style={{borderWidth: 1, padding: 4, maxHeight: 200, color: Colors.black}}
      editable={false}
      multiline
    />
  );
}

const CODEPUSH_HOST = "https://your.cdn.provider.com";

async function releaseHistoryFetcher(
  updateRequest: UpdateCheckRequest,
): Promise<ReleaseHistoryInterface> {
  const identifier = "staging";
  const jsonFileName = `${updateRequest.app_version}.json`;
  try {
    // ❗️ URL of release history JSON file uploaded using `npx code-push` command. (code-push.config.ts)
    const releaseHistoryUrl = `${CODEPUSH_HOST}/histories/${getPlatform()}/${identifier}/${jsonFileName}`;

    const {data: releaseHistory} = await axios.get<ReleaseHistoryInterface>(
      releaseHistoryUrl,
      {
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
      },
    );

    console.log("releaseHistory response", releaseHistory);
    return releaseHistory;
  } catch (error: unknown) {
    trackError(error);
    throw error;
  }
}

export default CodePush({
  checkFrequency: CodePush.CheckFrequency.MANUAL,
  releaseHistoryFetcher: releaseHistoryFetcher,
})(App);
