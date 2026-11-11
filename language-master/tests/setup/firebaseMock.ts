// JL-33: UI tests never initialise the real Firebase SDK or reach the network.
// Anything that needs Firestore behaviour mocks the specific service in the test file.
import { vi } from "vitest";

vi.mock("../../src/lib/firebase", () => {
  const auth = {
    currentUser: null,
    onAuthStateChanged: (cb: (user: null) => void) => {
      cb(null);
      return () => undefined;
    },
  };
  const db = { __mock: true };
  return { auth, db, default: { name: "mock-app" } };
});

vi.mock("firebase/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("firebase/auth")>();
  return {
    ...actual,
    getAuth: () => ({ currentUser: null }),
    onAuthStateChanged: (_auth: unknown, cb: (user: null) => void) => {
      cb(null);
      return () => undefined;
    },
  };
});
