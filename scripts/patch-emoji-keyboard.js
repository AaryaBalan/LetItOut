const fs = require('fs');
const path = require('path');

// 1. Patch react-native index.js to provide a safe InteractionManager fallback instead of throwing an invariant
const rnIndexPath = path.join(__dirname, '../node_modules/react-native/index.js');
if (fs.existsSync(rnIndexPath)) {
  let rnContent = fs.readFileSync(rnIndexPath, 'utf8');
  if (rnContent.includes("'InteractionManager has been removed from react-native core.'") || rnContent.includes("InteractionManager has been removed from react-native core")) {
    const targetGetter = `Object.defineProperty(module.exports, 'InteractionManager', {
    configurable: true,
    get() {
      invariant(
        false,
        'InteractionManager has been removed from react-native core. ' +
          'Please refactor long tasks into smaller ones, and use ' +
          "'requestIdleCallback' instead.",
      );
    },
  });`;

    const replacementGetter = `Object.defineProperty(module.exports, 'InteractionManager', {
    configurable: true,
    get() {
      return {
        runAfterInteractions(task) {
          const handle = setTimeout(() => {
            try { task && task(); } catch (e) {}
          }, 0);
          return {
            then: (resolve) => Promise.resolve().then(task).then(resolve),
            done: (...args) => {},
            cancel: () => clearTimeout(handle),
          };
        },
        createInteractionHandle: () => 0,
        clearInteractionHandle: () => {},
        setDeadline: () => {},
      };
    },
  });`;

    if (rnContent.includes(targetGetter)) {
      rnContent = rnContent.replace(targetGetter, replacementGetter);
      fs.writeFileSync(rnIndexPath, rnContent, 'utf8');
      console.log('[patch-emoji-keyboard] Successfully patched react-native/index.js');
    }
  }
}

// 2. Patch rn-emoji-keyboard files directly so they do not import or access InteractionManager
const files = [
  'node_modules/rn-emoji-keyboard/lib/module/components/EmojiCategory.js',
  'node_modules/rn-emoji-keyboard/lib/commonjs/components/EmojiCategory.js',
  'node_modules/rn-emoji-keyboard/src/components/EmojiCategory.tsx'
];

for (const relPath of files) {
  const filePath = path.join(__dirname, '..', relPath);
  if (!fs.existsSync(filePath)) continue;
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Replace imports
  if (content.includes("import { InteractionManager } from 'react-native'")) {
    content = content.replace(
      "import { InteractionManager } from 'react-native'",
      "const InteractionManager = { runAfterInteractions: (cb) => setTimeout(cb, 0) }"
    );
    modified = true;
  }
  if (content.includes("import { InteractionManager } from 'react-native';")) {
    content = content.replace(
      "import { InteractionManager } from 'react-native';",
      "const InteractionManager = { runAfterInteractions: (cb) => setTimeout(cb, 0) };"
    );
    modified = true;
  }

  // Replace calls
  if (content.includes('(InteractionManager?.runAfterInteractions || setTimeout)(')) {
    content = content.replace(/\(InteractionManager\?\.runAfterInteractions \|\| setTimeout\)\(/g, 'setTimeout(');
    modified = true;
  }
  if (content.includes('InteractionManager.runAfterInteractions(')) {
    content = content.replace(/InteractionManager\.runAfterInteractions\(/g, 'setTimeout(');
    modified = true;
  }
  if (content.includes('(_reactNative.InteractionManager?.runAfterInteractions || setTimeout)(')) {
    content = content.replace(/\(_reactNative\.InteractionManager\?\.runAfterInteractions \|\| setTimeout\)\(/g, 'setTimeout(');
    modified = true;
  }
  if (content.includes('_reactNative.InteractionManager.runAfterInteractions(')) {
    content = content.replace(/_reactNative\.InteractionManager\.runAfterInteractions\(/g, 'setTimeout(');
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[patch-emoji-keyboard] Patched ${relPath}`);
  }
}
