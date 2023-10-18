import typescript from 'rollup-plugin-typescript2';
import pluginJson from '@rollup/plugin-json';

export default [
    {
        input: './src/index.ts',
        output: {
            file: './dist/index.esm.js',
            format: 'esm',
        },
        plugins: [pluginJson(), typescript()],
    },
    {
        input: './src/index.ts',
        output: {
            file: './dist/index.js',
            format: 'cjs',
        },
        plugins: [pluginJson(), typescript()],
    },
];
