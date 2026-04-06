import { describe, expect, it, vi } from "vitest";

import { createDeferredCommit } from "./deferredCommit";

describe("createDeferredCommit", () => {
  it("coalesces rapid updates and only commits the latest value when flushed by timer", async () => {
    vi.useFakeTimers();
    const commits: string[] = [];
    const deferred = createDeferredCommit<string>({
      delayMs: 120,
      commit: async (value) => {
        commits.push(value);
      }
    });

    deferred.schedule("first");
    deferred.schedule("second");
    deferred.schedule("final");

    expect(commits).toEqual([]);

    await vi.advanceTimersByTimeAsync(119);
    expect(commits).toEqual([]);

    await vi.advanceTimersByTimeAsync(1);
    expect(commits).toEqual(["final"]);

    vi.useRealTimers();
  });

  it("flushes immediately with the latest value and cancels the pending timer", async () => {
    vi.useFakeTimers();
    const commits: string[] = [];
    const deferred = createDeferredCommit<string>({
      delayMs: 120,
      commit: async (value) => {
        commits.push(value);
      }
    });

    deferred.schedule("older");
    deferred.schedule("latest");
    await deferred.flush();

    expect(commits).toEqual(["latest"]);

    await vi.advanceTimersByTimeAsync(200);
    expect(commits).toEqual(["latest"]);

    vi.useRealTimers();
  });
});
