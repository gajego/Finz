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

// Fix Windows MAX_PATH (> 260 chars) in react-native-worklets and react-native-reanimated CMake (Windows-only)
if (process.platform === 'win32') {
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
}

// Fix iOS TextRecognition.m to load local image URLs safely (avoiding nil UIImage on iOS)
const textRecognitionM = path.join(__dirname, '..', 'node_modules', '@react-native-ml-kit', 'text-recognition', 'ios', 'TextRecognition.m');
if (fs.existsSync(textRecognitionM)) {
  let trContent = fs.readFileSync(textRecognitionM, 'utf8');
  const robustBlock = `    UIImage *image = nil;
    NSString *cleanPath = url;
    if ([cleanPath hasPrefix:@"file://"]) {
        cleanPath = [cleanPath substringFromIndex:7];
    }
    NSString *decodedPath = [cleanPath stringByRemovingPercentEncoding];
    if (decodedPath != nil && decodedPath.length > 0) {
        cleanPath = decodedPath;
    }
    if (cleanPath != nil && [[NSFileManager defaultManager] fileExistsAtPath:cleanPath]) {
        image = [UIImage imageWithContentsOfFile:cleanPath];
    }
    if (image == nil && cleanPath != nil) {
        NSURL *_fileUrl = [NSURL fileURLWithPath:cleanPath];
        if (_fileUrl != nil) {
            NSData *fileData = [NSData dataWithContentsOfURL:_fileUrl];
            if (fileData) {
                image = [UIImage imageWithData:fileData];
            }
        }
    }
    if (image == nil && url != nil) {
        NSURL *_url = [NSURL URLWithString:url];
        if (_url) {
            NSData *imageData = [NSData dataWithContentsOfURL:_url];
            if (imageData) {
                image = [UIImage imageWithData:imageData];
            }
        }
    }
    if (image == nil) {
        return reject(@"Text Recognition", @"Failed to load image from provided URL/path", nil);
    }
    MLKVisionImage *visionImage = [[MLKVisionImage alloc] initWithImage:image];
    visionImage.orientation = image.imageOrientation;`;

  if (!trContent.includes('decodedPath != nil')) {
    const originalBlock = `    NSURL *_url = [NSURL URLWithString:url];
    NSData *imageData = [NSData dataWithContentsOfURL:_url];
    UIImage *image = [UIImage imageWithData:imageData];
    MLKVisionImage *visionImage = [[MLKVisionImage alloc] initWithImage:image];
    visionImage.orientation = image.imageOrientation;`;

    const firstPatchedBlock = `    UIImage *image = nil;
    NSString *cleanPath = url;
    if ([cleanPath hasPrefix:@"file://"]) {
        cleanPath = [cleanPath substringFromIndex:7];
    }
    cleanPath = [cleanPath stringByRemovingPercentEncoding];
    if ([[NSFileManager defaultManager] fileExistsAtPath:cleanPath]) {
        image = [UIImage imageWithContentsOfFile:cleanPath];
    }
    if (image == nil) {
        NSURL *_fileUrl = [NSURL fileURLWithPath:cleanPath];
        NSData *fileData = [NSData dataWithContentsOfURL:_fileUrl];
        if (fileData) {
            image = [UIImage imageWithData:fileData];
        }
    }
    if (image == nil) {
        NSURL *_url = [NSURL URLWithString:url];
        if (_url) {
            NSData *imageData = [NSData dataWithContentsOfURL:_url];
            if (imageData) {
                image = [UIImage imageWithData:imageData];
            }
        }
    }
    if (image == nil) {
        return reject(@"Text Recognition", @"Failed to load image from provided URL/path", nil);
    }
    MLKVisionImage *visionImage = [[MLKVisionImage alloc] initWithImage:image];
    visionImage.orientation = image.imageOrientation;`;

    if (trContent.includes(originalBlock)) {
      trContent = trContent.replace(originalBlock, robustBlock);
      fs.writeFileSync(textRecognitionM, trContent, 'utf8');
      console.log('[fix-text-recognition] Patched TextRecognition.m with robust nil-safe image loader.');
    } else if (trContent.includes(firstPatchedBlock)) {
      trContent = trContent.replace(firstPatchedBlock, robustBlock);
      fs.writeFileSync(textRecognitionM, trContent, 'utf8');
      console.log('[fix-text-recognition] Updated TextRecognition.m with robust nil-safe image loader.');
    }
  }
}

// Fix expo-notifications crash on builds where native modules are not yet compiled
function patchExpoNotificationsNative() {
  const notifBuildDir = path.join(__dirname, '..', 'node_modules', 'expo-notifications', 'build');
  if (!fs.existsSync(notifBuildDir)) return;
  const files = fs.readdirSync(notifBuildDir).filter(f => f.endsWith('.native.js'));
  for (const file of files) {
    const fullPath = path.join(notifBuildDir, file);
    let content = fs.readFileSync(fullPath, 'utf8');
    if (content.includes('requireNativeModule(')) {
      if (!content.includes('requireOptionalNativeModule')) {
        content = content.replace(
          /import\s*\{\s*requireNativeModule\s*\}\s*from\s*'expo';/,
          "import { requireNativeModule, requireOptionalNativeModule } from 'expo';"
        );
      }
      content = content.replace(
        /requireNativeModule\((['"][^'"]+['"])\)/g,
        "(typeof requireOptionalNativeModule === 'function' ? requireOptionalNativeModule($1) : (globalThis.expo?.modules?.[$1] || null)) || {}"
      );
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`[fix-expo-notifications] Patched ${file} with safe optional loader.`);
    }
  }
}
patchExpoNotificationsNative();



