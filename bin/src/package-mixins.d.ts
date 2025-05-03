declare const _default: (NativeCodePush: any) => {
    local: {
        install(installMode: any, minimumBackgroundDuration: number, updateInstalledCallback: any): Promise<void>;
        isPending: boolean;
    };
    remote: () => {
        download(downloadProgressCallback: any): Promise<any>;
        isPending: boolean;
    };
};
export default _default;
