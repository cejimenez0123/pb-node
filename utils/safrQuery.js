async function safeQuery(fn, retries = 2) {
  try {
    return await fn();
  } catch (err) {
    if (retries > 0) {
      console.log("Retrying DB query...");
      return safeQuery(fn, retries - 1);
    }
    throw err;
  }
}
export default safeQuery