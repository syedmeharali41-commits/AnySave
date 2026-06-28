// AnySave Advanced — Secure Loader
// Tries to load the compiled V8 bytecode (main.jsc) first.
// Falls back to plain main.js if bytecode is missing (e.g. in development).

const path = require('path');

function loadApp() {
  try {
    require('bytenode');
    require('./main.jsc');
  } catch (e) {
    // Fallback: load uncompiled source (dev mode or missing .jsc)
    require('./main.js');
  }
}

loadApp();
