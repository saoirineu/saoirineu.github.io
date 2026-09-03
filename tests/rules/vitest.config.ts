import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['*.test.ts'],
    // Rules tests share one emulator; running files in parallel would let one
    // file's clearFirestore() wipe another file's seed mid-test.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000
  }
});
