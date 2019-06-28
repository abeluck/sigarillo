/*
MIT License

Copyright (c) 2019 bruceman
https://github.com/bruceman/koa-views-handlebars

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
import views from "koa-views";
import walkSync from "walk-sync";
import path from "path";

// helper file extension
const HELPER_EXT = ".js";

// get all partails/helpers in one folder
function getObjectsInDir(rootPath, targetDir, ext) {
  let target = targetDir;
  if (!path.isAbsolute(target)) {
    target = path.resolve(rootPath, target);
  }

  const filePaths = walkSync(target, {
    directories: false,
    includeBasePath: false
  });
  const objects = {};

  filePaths.forEach(filePath => {
    if (path.extname(filePath) === ext) {
      const absolutePath = path.resolve(target, filePath);
      // helpers key: base file name
      if (ext === HELPER_EXT) {
        // eslint-disable-next-line import/no-dynamic-require,global-require
        objects[path.basename(filePath, HELPER_EXT)] = require(absolutePath);
      } else {
        // partials key: related file path without file extension
        objects[
          filePath.substr(0, filePath.length - ext.length)
        ] = absolutePath;
      }
    }
  });

  return objects;
}
// get all partails/helpers in target folders
function getObjectsInDirs(rootPath, targetDirs, ext) {
  if (!targetDirs) {
    return null;
  }

  if (typeof targetDirs === "string") {
    return getObjectsInDir(rootPath, targetDirs, ext);
  }
  // array
  const objects = {};
  targetDirs.forEach(targetDir => {
    // merge objects into one
    Object.assign(objects, getObjectsInDir(rootPath, targetDir, ext));
  });
  return objects;
}

function getViewOptions(viewRootPath, options) {
  const opts = Object.assign({}, options);
  const extension = opts.extension || "hbs";
  const partialExt = `.${extension}`;

  return {
    extension,
    map: {
      [extension]: "handlebars"
    },
    options: {
      helpers: getObjectsInDirs(viewRootPath, opts.helperDirs, HELPER_EXT),
      partials: getObjectsInDirs(viewRootPath, opts.partialDirs, partialExt)
    }
  };
}

/**
 * init koa-views instance
 */
function hbsInit(viewRootPath, options) {
  // set default root path to current folder
  let viewRoot = viewRootPath;
  if (!viewRoot) {
    viewRoot = __dirname;
  }

  const viewOptions = getViewOptions(viewRoot, options);

  return views(viewRoot, viewOptions);
}

export default hbsInit;
