const fs = require('fs');
const path = require('path');

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.name === 'Package.swift') {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('swift-tools-version: 6.2')) {
        content = content.replace(/swift-tools-version:\s*6\.2/g, 'swift-tools-version: 6.0');
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`[fix-swift] Patched tools version: ${fullPath}`);
      }
    } else if (entry.name.endsWith('.swift')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;

      // "weak let" is Swift 6.2-only; replace with nonisolated(unsafe) weak var
      // to satisfy both mutability and Sendable requirements on Swift 6.0/6.1
      if (/\bweak\s+let\b/.test(content)) {
        content = content.replace(/(\s*)((?:private|internal|public|fileprivate)\s+)?weak\s+let\b/g,
          (_, indent, access) => `${indent}nonisolated(unsafe) ${access || ''}weak var`);
        changed = true;
      }

      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`[fix-swift] Patched weak let -> nonisolated(unsafe) weak var: ${fullPath}`);
      }
    }
  }
}

walk(path.join(__dirname, '..', 'node_modules'));
console.log('[fix-swift] Done.');

// Fix Windows MAX_PATH (> 260 chars) in react-native-worklets CMake
const workletsCmake = path.join(__dirname, '..', 'node_modules', 'react-native-worklets', 'android', 'CMakeLists.txt');
const workletsCommon = path.join(__dirname, '..', 'node_modules', 'react-native-worklets', 'Common');
const workletsAndroidCommon = path.join(__dirname, '..', 'node_modules', 'react-native-worklets', 'android', 'Common');

if (fs.existsSync(workletsCmake)) {
  let cmakeContent = fs.readFileSync(workletsCmake, 'utf8');
  if (cmakeContent.includes('${CMAKE_SOURCE_DIR}/../Common/cpp')) {
    cmakeContent = cmakeContent.replace(
      'set(COMMON_CPP_DIR "${CMAKE_SOURCE_DIR}/../Common/cpp")',
      'set(COMMON_CPP_DIR "${CMAKE_CURRENT_SOURCE_DIR}/Common/cpp")'
    );
    fs.writeFileSync(workletsCmake, cmakeContent, 'utf8');
    console.log('[fix-worklets] Patched CMakeLists.txt for Windows short paths.');
  }

  if (fs.existsSync(workletsCommon) && !fs.existsSync(workletsAndroidCommon)) {
    try {
      fs.symlinkSync(workletsCommon, workletsAndroidCommon, 'junction');
      console.log('[fix-worklets] Created Common junction for CMake.');
    } catch {
      // ignore
    }
  }
}

// Fix Windows MAX_PATH in react-native-reanimated CMake
const reanimatedCmake = path.join(__dirname, '..', 'node_modules', 'react-native-reanimated', 'android', 'CMakeLists.txt');
const reanimatedCommon = path.join(__dirname, '..', 'node_modules', 'react-native-reanimated', 'Common');
const reanimatedAndroidCommon = path.join(__dirname, '..', 'node_modules', 'react-native-reanimated', 'android', 'Common');

if (fs.existsSync(reanimatedCmake)) {
  let cmakeContent = fs.readFileSync(reanimatedCmake, 'utf8');
  if (cmakeContent.includes('${CMAKE_SOURCE_DIR}/../Common/cpp')) {
    cmakeContent = cmakeContent.replace(
      'set(COMMON_CPP_DIR "${CMAKE_SOURCE_DIR}/../Common/cpp")',
      'set(COMMON_CPP_DIR "${CMAKE_CURRENT_SOURCE_DIR}/Common/cpp")'
    ).replace(
      'set(NATIVEVIEW_DIR "${CMAKE_SOURCE_DIR}/../Common/NativeView")',
      'set(NATIVEVIEW_DIR "${CMAKE_CURRENT_SOURCE_DIR}/Common/NativeView")'
    );
    fs.writeFileSync(reanimatedCmake, cmakeContent, 'utf8');
    console.log('[fix-reanimated] Patched CMakeLists.txt for Windows short paths.');
  }

  if (fs.existsSync(reanimatedCommon) && !fs.existsSync(reanimatedAndroidCommon)) {
    try {
      fs.symlinkSync(reanimatedCommon, reanimatedAndroidCommon, 'junction');
      console.log('[fix-reanimated] Created Common junction for CMake.');
    } catch {
      // ignore
    }
  }
}

// Fix Windows MAX_PATH in react-native-reanimated Common/NativeView/CMakeLists.txt
const nativeViewDir = path.join(__dirname, '..', 'node_modules', 'react-native-reanimated', 'Common', 'NativeView');
const nativeViewCmake = path.join(nativeViewDir, 'CMakeLists.txt');
const codegenJniDir = path.join(__dirname, '..', 'node_modules', 'react-native-reanimated', 'android', 'build', 'generated', 'source', 'codegen', 'jni');
const nativeViewCodegenJunction = path.join(nativeViewDir, 'codegen');

if (fs.existsSync(nativeViewDir)) {
  if (fs.existsSync(codegenJniDir) && !fs.existsSync(nativeViewCodegenJunction)) {
    try {
      fs.symlinkSync(codegenJniDir, nativeViewCodegenJunction, 'junction');
      console.log('[fix-reanimated] Created NativeView/codegen junction.');
    } catch (e) {
      console.warn('[fix-reanimated] Failed to create codegen junction:', e.message);
    }
  }

  if (fs.existsSync(nativeViewCmake)) {
    let nvContent = fs.readFileSync(nativeViewCmake, 'utf8');
    if (!nvContent.includes('RELATIVE ${CMAKE_CURRENT_SOURCE_DIR}')) {
      const patchedNv = `cmake_minimum_required(VERSION 3.13)
set(CMAKE_VERBOSE_MAKEFILE on)

set(CODEGEN_JNI_DIR \${CMAKE_CURRENT_SOURCE_DIR}/codegen)
set(CODEGEN_COMPONENTS_DIR \${CODEGEN_JNI_DIR}/react/renderer/components/rnreanimated)
file(
  GLOB CODEGEN_ORIGINAL_SRCS CONFIGURE_DEPENDS
  RELATIVE \${CMAKE_CURRENT_SOURCE_DIR}
  codegen/*.cpp
  codegen/react/renderer/components/rnreanimated/*.cpp
)

set(CODEGEN_OVERWRITTEN_JNI_DIR .)
set(CODEGEN_OVERWRITTEN_COMPONENTS_DIR \${CODEGEN_OVERWRITTEN_JNI_DIR}/react/renderer/components/rnreanimated)
file(
  GLOB CODEGEN_OVERWRITTEN_SRCS CONFIGURE_DEPENDS
  RELATIVE \${CMAKE_CURRENT_SOURCE_DIR}
  *.cpp
  react/renderer/components/rnreanimated/*.cpp
)

add_library(
  react_codegen_rnreanimated
  OBJECT
  \${CODEGEN_OVERWRITTEN_SRCS}
  \${CODEGEN_ORIGINAL_SRCS}
)

target_compile_reactnative_options(react_codegen_rnreanimated PRIVATE)

target_include_directories(
  react_codegen_rnreanimated
  PUBLIC
  \${CMAKE_CURRENT_SOURCE_DIR}
  \${CMAKE_CURRENT_SOURCE_DIR}/react/renderer/components/rnreanimated
  \${CODEGEN_JNI_DIR}
  \${CODEGEN_COMPONENTS_DIR}
)

target_link_libraries(
  react_codegen_rnreanimated
  fbjni
  jsi
  reactnative
)

target_compile_options(
  react_codegen_rnreanimated
  PRIVATE
  -DLOG_TAG=\\"ReactNative\\"
  -fexceptions
  -frtti
  -std=c++20
  -Wall
)
`;
      fs.writeFileSync(nativeViewCmake, patchedNv, 'utf8');
      console.log('[fix-reanimated] Patched Common/NativeView/CMakeLists.txt for Windows short paths.');
    }
  }
}

