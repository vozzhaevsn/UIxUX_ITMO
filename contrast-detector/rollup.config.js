import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default {
    input: 'core/contrast-core.js',
    output: {
        file: 'dist/contrast-bundle.js',
        format: 'es',
        sourcemap: true
    },
    plugins: [
        resolve(),
        terser()
    ]
};