---
title: 【webpack】DLL plugin原理分析
date: 2021-09-12 12:34:22
tags: webpack
categories: webpack源码分析
---

## DLL plugin 打包步骤

.dll 为后缀的文件称为动态链接库，在一个动态链接库中可以包含给其他模块调用的函数和数据
把基础模块独立打包出来放到单独的动态链接库里
当需要导入的模块在动态链接库的时候，模块不能再次打包，而且从动态链接库里面获取

DllPlugin 插件：用于打包一个个动态链接库
DllReferencePlugin:在配置文件中引入 DllPlugin 插件打包好的动态链接库

1、定义配置文件和命令

```javascript
  "build:dll": "webpack --config build/webpack.dll.config.js --mode=development"
```

webpack.dll.config.js 配置处理

```javascript
/*
 * @description:
 * @author: steve.deng
 * @Date: 2020-09-25 12:53:31
 * @LastEditors: steve.deng
 * @LastEditTime: 2020-09-25 13:24:27
 */
const path = require("path");
// const DllPlugin = require("webpack/lib/DllPlugin");
const webpack = require("webpack");
const ParallelUglifyPlugin = require("webpack-parallel-uglify-plugin");
module.exports = {
  entry: {
    vendor: [
      "vue/dist/vue.esm.js",
      "element-ui/lib/element-ui.common.js",
      "wangeditor",
      "mathjs",
      "echarts",
      "html2canvas",
      "vue-router",
      "vuex",
    ],
  },
  output: {
    path: path.resolve(__dirname, "../static/js"),
    filename: "[name].dll.js", //vendor.dll.js
    library: "_dll_[name]_library", //库的名字叫 _dll_[name]_library 决定了 vendor.dll.js里面库的名字
    // vendor.dll.js中暴露出的全局变量名。
    // 主要是给DllPlugin中的name使用，
    // 故这里需要和webpack.DllPlugin中的`name: '[name]_library',`保持一致。
  },
  plugins: [
    new webpack.DllPlugin({
      // context: path.join(__dirname, '../'),
      name: "_dll_[name]_library", // 决定了.manifest里面的name名字 和 上面library对应
      path: path.join(__dirname, "../static/js", "[name]-manifest.json"),
    }),
    // new ParallelUglifyPlugin({
    //   cacheDir: '.cache/',
    //   uglifyJS: {
    //     output: {
    //       comments: false
    //     },
    //     compress: {
    //       warnings: false
    //     }
    //   }
    // })
  ],
};
```

// 一般放在生产配置就好了 开发环境建议不要用 比如 vue 库的一些错误提示会打包成时被省略了 ，会开发环境不友好 ，
webpack.prod.conf.js

```javascript
plugins: [
  // 引用插件
  new webpack.DllReferencePlugin({
    // 这里的上下文要与dllplugin保持一致
    // context: path.join(__dirname, '../'),
    manifest: require("../static/js/vendor-manifest.json"),
  }),
];
```

html 引入打包好的包

```javascript
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no">
    <link rel="shortcut icon" href="static/images/favicon.ico">
  </head>
  <body>
    <div id="app"></div>
    <!-- built files will be auto injected -->
    <script>

    </script>
    <script type="text/javascript" src="/static/js/vendor.dll.js"></script>
  </body>
</html>
```

原理

xx.manifest.json
name 指的是对应的 dll 库名字
描述了哪些模块被打进来 dll 了， 用模块名当 id 标识出来 大概是一个模块清单
![在这里插入图片描述](https://img-blog.csdnimg.cn/2020092517143758.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3FxMzk4NTc3MzUx,size_16,color_FFFFFF,t_70#pic_center)
xxx.dll.js 就是模块的源码了
xxx.dll.js 是各个模块的源码集合 通过 key（模块 id）--> value 查询出来
![在这里插入图片描述](https://img-blog.csdnimg.cn/20200925173212315.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3FxMzk4NTc3MzUx,size_16,color_FFFFFF,t_70#pic_center)
上面文件 其实就是一个 全局变量 var \_dll_react = xxxx；
![](https://img-blog.csdnimg.cn/20200925173311351.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3FxMzk4NTc3MzUx,size_16,color_FFFFFF,t_70#pic_center)
那么 webpack 如何查找打包好的模块呢？而不需要重复打包

1、比如 index.js 引入了 react

```javascript
import React from "react";
//./node_modules/_react@16.13.1@react/index.js

console.log(React);
```

2、他会去 mainfest.json 找模块 id 其实就是 react 关键字拼接版本号 + index.js 组成 id 去寻找模块
即 './node_modules/'+'_react@16.13.1@react'+ '/index.js' 组成的 id

3、找到有模块的话，就不再去打包了
打包出来的 bundle.js 直接会引入上面打包好的 dll 库，dll 库会暴露一个全局变量\_dll_react

- bundle.js 里面 会有一个定义好的 key "dll-reference \_dll_react" 对应 打包出来的全局变量，对应是全部的打包出来的第三方模块

```javascript
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "./node_modules/_react@16.13.1@react/index.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);

console.log(react__WEBPACK_IMPORTED_MODULE_0___default.a);

/***/ }),

/***/ "dll-reference _dll_react":
/*!*****************************!*\
  !*** external "_dll_react" ***!
  \*****************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = _dll_react;

/***/ })

/******/ });
```

- index.js 实际引入了 react
  bundle.js 里面就有
  "./src/index.js": **webpack_require**(/_! react _/ "./node_modules/_react@16.13.1@react/index.js");

```javascript

/***/ "./src/index.js":
/*!**********************!*\
  !*** ./src/index.js ***!
  \**********************/
/*! no exports provided */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "./node_modules/_react@16.13.1@react/index.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);

console.log(react__WEBPACK_IMPORTED_MODULE_0___default.a);

/***/ }),
```

- 而 **webpack_require**(/_! react _/ "./node_modules/_react@16.13.1@react/index.js"); 其实就是指向刚才的全局变量

"./node_modules/_react@16.13.1@react/index.js"就是"dll-reference \_dll_react"里面的某个 key 读取
所以可以通过(**webpack_require**(/_! dll-reference \_dll_react _/ "dll-reference \_dll_react"))("./node_modules/_react@16.13.1@react/index.js")就能读取了 react 代码了

```javascript

/***/ "./node_modules/_react@16.13.1@react/index.js":
/*!********************************************************************************************!*\
  !*** delegated ./node_modules/_react@16.13.1@react/index.js from dll-reference _dll_react ***!
  \********************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(/*! dll-reference _dll_react */ "dll-reference _dll_react"))("./node_modules/_react@16.13.1@react/index.js");

/***/ }),
```

大致就是这个流程了
