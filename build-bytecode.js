const { app } = require('electron');
const bytenode = require('bytenode');
const path = require('path');
const v8 = require('v8');

v8.setFlagsFromString('--no-flush-bytecode');

// This script must be run via: electron ./build-bytecode.js
// It compiles main.js using Electron's own V8 engine so the .jsc is compatible.

const inputFile  = path.join(__dirname, 'main.js');
const outputFile = path.join(__dirname, 'main.jsc');

app.whenReady().then(() => {
  try {
    bytenode.compileFile({ filename: inputFile, output: outputFile });
    console.log('✅ main.js compiled to main.jsc successfully.');
  } catch (e) {
    console.error('❌ Bytenode compilation failed:', e.message);
    process.exit(1);
  }
  app.quit();
});
