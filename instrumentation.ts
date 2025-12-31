let cleanupInterval: NodeJS.Timeout | null = null;

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const {
      initializeUploadSessionsFromDisk,
      cleanupExpiredSessions,
    } = await import("@/app/_server/actions/upload");

    await initializeUploadSessionsFromDisk();

    cleanupInterval = setInterval(async () => {
      console.log("[Scheduler] Running upload cleanup...");
      await cleanupExpiredSessions();
    }, 6 * 60 * 60 * 1000);

    process.on("SIGTERM", () => {
      if (cleanupInterval) {
        clearInterval(cleanupInterval);
      }
    });

    console.log(
      "[Server Init] Upload sessions initialized with cleanup scheduler"
    );
  }
}
