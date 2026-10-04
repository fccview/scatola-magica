export const register = async () => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { startScheduler } = await import("./instrumentation-node");
  await startScheduler();
};
