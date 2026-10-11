import base from './vite.config.js'
import path from 'path'
export default { ...base, resolve: { alias: [{ find: /^\.\/tg\.js$/, replacement: path.resolve('src/tg.mock.js') }] }, build: { ...base.build, outDir: 'dist-mock' } }
