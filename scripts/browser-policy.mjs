// Preserve Chromium GPU safeguards and sandbox. Playwright 1.64 otherwise adds
// --enable-unsafe-swiftshader by default; do not opt in to unsafe software WebGL.
export const safeLaunch = {
  chromiumSandbox: true,
  args: ["--enable-automation"],
  ignoreDefaultArgs: [
    // Restore browser feature defaults, including HTTPS/storage/redirect protections.
    "--disable-features=AvoidUnnecessaryBeforeUnloadCheckSync,DestroyProfileOnBrowserClose,DialMediaRouteProvider,GlobalMediaControls,HttpsUpgrades,LensOverlay,MediaRouter,PaintHolding,ThirdPartyStoragePartitioning,BlockOriginHeaderModificationOnRedirect,AvoidCorsURLLoaderRestartOnRedirect,Translate,AutoDeElevate,OptimizationHints,NetworkTimeServiceQuerying,AimEnabled,msForceBrowserSignIn,msEdgeUpdateLaunchServicesPreferredVersion",
    "--enable-unsafe-swiftshader",
    "--disable-ipc-flooding-protection",
    "--unsafely-disable-devtools-self-xss-warnings",
    "--disable-client-side-phishing-detection",
  ],
};
