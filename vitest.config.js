import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    fakeTimers: {
      toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'],
    },
  },
});
