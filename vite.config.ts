import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  // Relative asset paths, so the build works from a GitHub Pages subpath
  // (https://user.github.io/no-globe-kit/) without hardcoding the repo name.
  base: './',
  plugins: [
    // Lets us `import frag from './shaders/globe.frag'`, with #include support.
    glsl(),
  ],
});
