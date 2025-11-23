import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
	build: {
		lib: {
			entry: resolve(__dirname, 'src/AnimatedTiles.ts'),
			name: 'AnimatedTiles',
			fileName: format => `phaser-animated-tiles-2.${format}.js`,
		},
		rollupOptions: {
			external: ['phaser'],
			output: {
				globals: {
					phaser: 'Phaser',
				},
			},
		},
	},
	plugins: [dts({ rollupTypes: true })],
});
