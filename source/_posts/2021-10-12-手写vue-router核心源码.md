---
title: 手写vue-router核心源码
date: 2021-10-12 12:34:22
tags: vue-router
categories: vue-router源码分析
---

## 1、vue-router 使用规则

vue-router 使用时 要调用 Vue.use(VueRouter)
使用如下：

```javascript
router / index.js;

import VueRouter from "@/vue-router";
Vue.use(VueRouter);

const routes = [
  {
    path: "/",
    name: "Home",
    component: Home,
  },
];
const router = new VueRouter({
  mode: "history",
  base: process.env.BASE_URL,
  routes,
});

export default router;

// main.js
import router from "./router";

Vue.config.productionTip = false;

new Vue({
  router,
  render: (h) => h(App),
}).$mount("#app");
```

Vue.use 函数式怎样的？
看源码

```javascript
// Vue.use源码

// Vue源码文件路径：src/core/global-api/use.js

import { toArray } from "../util/index";

export function initUse(Vue: GlobalAPI) {
  Vue.use = function (plugin: Function | Object) {
    const installedPlugins =
      this._installedPlugins || (this._installedPlugins = []);
    if (installedPlugins.indexOf(plugin) > -1) {
      return this;
    }

    // additional parameters
    const args = toArray(arguments, 1);
    args.unshift(this);
    if (typeof plugin.install === "function") {
      plugin.install.apply(plugin, args);
    } else if (typeof plugin === "function") {
      plugin.apply(null, args);
    }
    installedPlugins.push(plugin);
    return this;
  };
}
```

> 从源码中我们可以发现 vue 首先判断这个插件是否被注册过，不允许重复注册。
> 并且接收的 plugin 参数的限制是 Function | Object 两种类型。
> 对于这两种类型有不同的处理。
> 首先将我们传入的参数整理成数组 => const args = toArray(arguments, 1)。

```javascript
// Vue源码文件路径：src/core/shared/util.js
export function toArray(list: any, start?: number): Array<any> {
  start = start || 0;
  let i = list.length - start;
  const ret: Array<any> = new Array(i);
  while (i--) {
    ret[i] = list[i + start];
  }
  return ret;
}
```

> 再将 Vue 对象添加到这个数组的起始位置 args.unshift(this),这里的 this 指向 Vue 对象
> 如果我们传入的 plugin(Vue.use 的第一个参数)的 install 是一个方法。也就是说如果我们传入一个对象，对象中包含 install 方法，那么我们就调用这个 plugin 的 install 方法并将整理好的数组当成参数传入 install 方法中。 => plugin.install.apply(plugin, args)
> 如果我们传入的 plugin 就是一个函数,那么我们就直接调用这个函数并将整理好的数组当成参数传入。 => plugin.apply(null, args)

> 以上可知 plugin.install 函数第一个参数就是 Vue 参数，后面的参数才是传入参数
> Vue.use(plugin)目的是为了执行 plugin 里面的 install 方法 并且传入 Vue 对象， 同时 vue 和 vue-router 中 vue 版本和用户使用保持了一致性

## 2、编写 vueRouter 基本结构

```javascript
const router = new VueRouter({
  mode: "history",
  base: process.env.BASE_URL,
  routes,
});
```

> 2.1 上面使用可知，VueRouter 是一个构造函数并且接受对象传参， 因此编写构造函数和 init 函数，传入的 options 就是我们 new VueRouter 参数对象， 拿到 routes 要生成一个路径和组件的映射表，为了做组件渲染用。

```javascript
// vue-router/index.js

import { install } from "./install";
import { createMatcher } from "./create-matcher";
import HashHistory from "./history/hash";
import BrowserHistory from "./history/history";

export default class VueRouter {
  constructor(options) {
    // 根据用户的配置 生成一个映射表 稍后跳转时 根据路径找到对应组件来进行渲染
    // 创建匹配器后，核心的方法就是匹配
    // match addRoutes
    this.matcher = createMatcher(options.routes || []);
    // 定义其中一个钩子函数队列， 其实有很多 先忽略其他
    this.beforeEachHooks = [];
    // 根据当前的mode 创建不同的history管理策略
    switch (options.mode) {
      case "hash": {
        this.history = new HashHistory(this);
        break;
      }
      case "history": {
        this.history = new BrowserHistory(this);
        break;
      }
    }
  }
  init(app) {
    // app根实例
    // 路由初始化
    console.log("init");
  }
}
VueRouter.install = install;
```

> 2.2 并且要符合 Vue.use(VueRouter)， 故 VueRouter 要增加 install 的函数， 稍后再讲解 createMatcher、HashHistory、BrowserHistory。

> 2.3 定义 install 函数
> 我需要将当前的根实例的提供的 router 属性 共享给所有子组件 Vue.prototype 不好 会影响了全局的 Vue 实例 改用 mixin

```javascript
/*
 * @description:
 * @author: steve.deng
 * @Date: 2020-12-22 07:19:31
 * @LastEditors: steve.deng
 * @LastEditTime: 2020-12-23 15:19:15
 */
// install.js
export let _Vue;

// 直接使用传入的vue  不需要引入了 版本也保持一直
export function install(Vue, options) {
  _Vue = Vue;

  //我需要将当前的根实例的提供的router属性 共享给所有子组件 Vue.prototype不好 会影响了全局的Vue实例 改用mixin

  // 所有子组件初始化的时候 都会去调用
  Vue.mixin({
    beforeCreate() {
      // 获取到每个人的实例 给实例添加属性
      console.log(this.$options);
      // 共用顶层this
      if (this.$options.router) {
        this._routerRoot = this; // 把根实例挂载到_routerRoot上
        this._router = this.$options.router;
        this._router.init(this);

        console.log("this._route", this._route);
        // this._router 路由实例
      } else {
        // this._routerRoot 指向当前根组件实例
        this._routerRoot = this.$parent && this.$parent._routerRoot;
      }
      // 根 -》 父亲- > 儿子 -》 孙子
    },
  });
}
```

> 2.4 this.\_routerRoot 指向顶层 vue 实例 即 main.js 上面的实例

```javascript
new Vue({
  router,
  render: (h) => h(App),
}).$mount("#app");
```

```javascript
 2.5 this.$options就会有router选项
 顶层实例调用this._router.init(this);
 其他实例则向父级获取_routerRoot 即 this._routerRoot = this.$parent._routerRoot；
```

以上大致完成了 vue-router 的整体结构可供 Vue.use(VueRouter) 和 new vueRouter()

## 3.核心代码

3.1 第二步 VueRouter 的构造函数解释

> this.matcher = createMatcher(options.routes || []);
> 新建一个 create-matcher.js

```javascript
// create-matcher.js
import { createRouteMap } from "./create-route-map";
import { createRoute } from "./history/base";
export function createMatcher(routes) {
  // {/:home, /about: about}
  let { pathMap } = createRouteMap(routes); // 根据用户的配置创建一个映射表
  // 动态添加路由权限
  function addRoutes(routes) {
    createRouteMap(routes, pathMap);
  }
  function match(path) {
    let record = pathMap[path];
    console.log(record);

    return createRoute(record, {
      // {path: / , matched: [{},{}]}
      path,
    });
  }
  return {
    addRoutes,
    match,
  };
}
```

```javascript
// create-route-map.js
import router from "../router";
export function createRouteMap(routes, oldPathMap) {
  // 一个参数时 初始化  2个参数就是动态添加路由
  let pathMap = oldPathMap || {};
  // routes
  routes.forEach((route) => {
    addRouteRecord(route, pathMap, null);
  });

  return {
    pathMap,
  };
}

function addRouteRecord(route, pathMap, parent) {
  // 要判断有parent拼接parent路径
  let path = parent ? parent.path + "/" + route.path : route.path;
  let record = {
    parent, // 指代父亲记录
    path: path,
    component: route.component,
    name: route.props,
    params: route.params || {},
    meta: route.meta,
  };

  if (!pathMap[path]) {
    pathMap[path] = record;
  }

  if (route.children) {
    // 没有孩子就停止遍历
    route.children.forEach((childRoute) => {
      addRouteRecord(childRoute, pathMap, record);
    });
  }
}
```

> create-route-map 函数最终返回一个 pathMap = {'/': record1, 'about': record2}的对象映射表，此时已经知道路径和组件的关系了，如下图：
> ![在这里插入图片描述](https://img-blog.csdnimg.cn/20201224153640521.png)
> createMatcher

3.2 浏览器 url 监听变化

#### 2 种模式

- history: 基于 window.history.pushsState({}, null, location)，监听 history 前进后退 window.addEventListener('popstate', fun)
- hash: 基于 window.location.hash 做修改 url ，监听: window.addEventListener('hashchange', fun)

> 基于以上原生浏览器 api，就可以做处理了。

3.2.1 新建 history 文件夹，并且里面新建 base.js、hash.js、history.js

```javascript
/*
 * @description: base.js
 * @author: steve.deng
 * @Date: 2020-12-22 17:48:02
 * @LastEditors: steve.deng
 * @LastEditTime: 2020-12-23 18:11:14
 */
export function createRoute(record, location) {
  let res = [];
  // /about  /about/a
  if (record) {
    while (record) {
      res.unshift(record);
      record = record.parent;
    }
  }
  return {
    ...location,
    matched: res,
  };
}

function runQueue(queue, iterator, cb) {
  function next(index) {
    if (index >= queue.length) {
      return cb(); // 一个都没有 或者钩子执行完毕 调用cb完成渲染
    } else {
      let hook = queue[index];
      iterator(hook, () => {
        next(++index);
      });
    }
  }
  next(0);
}
export default class History {
  constructor(router) {
    this.router = router;
    // 最终核心 是将current属性变成响应式 后续根据current更新视图

    // /about/a   =>  /about /about/a
    this.current = createRoute(null, {
      // this.current = {path: '/', matched: []}
      path: "/",
    });
  }
  // 跳转处理  路径变化 组件渲染 数据变化 更新视图
  transitionTo(location, onComplete) {
    // 默认先执行一次

    // 根据跳转的路径 获取匹配记录
    let route = this.router.match(location); // route = {path: '/about/a', matched: [{},{}]}
    let queue = [].concat(this.router.beforeEachHooks);
    const iterator = (hook, cb) => {
      hook(route, this.current, cb);
    };

    runQueue(queue, iterator, () => {
      console.log("queue", queue);
      this.current = route; // current变量引用地址变了
      this.cb && this.cb(route); // 路由变了 触发更新
      // 监听hash变化
      onComplete && onComplete(); // onComplete调用后 hash值变化 再次调用transitionTo
    });
  }
  listen(cb) {
    this.cb = cb;
  }
}
```

```javascript
import History from "./base";

/*
 * @description: hash.js
 * @author: steve.deng
 * @Date: 2020-12-22 17:47:33
 * @LastEditors: steve.deng
 * @LastEditTime: 2020-12-23 16:41:26
 */

function ensureSlash() {
  if (window.location.hash) {
    return;
  }
  window.location.hash = "/";
}
function getHash() {
  return window.location.hash.slice(1);
}
export default class HashHistory extends History {
  constructor(router) {
    super(router);
    console.log("hash mode");
    // 默认hash模式 需要加 #/
    ensureSlash();
  }
  setupListener() {
    // 监听 hash性能不如popstate好用 popstate 也可以监听浏览器历史记录的变化 源码有写
    window.addEventListener("hashchange", () => {
      // 根据当前hash值 去匹配对应的组件
      // todo...
      this.transitionTo(getHash());
    });
  }
  getCurrentLocation() {
    return getHash();
  }
  //
  push(location) {
    window.location.hash = location;
    // this.transitionTo(location); // 可以去匹配视图
  }
  // hash模式的核心功能是 监听hash值的变化 window.addEventListener('hashchange')
}
```

```javascript
/*
 * @description:history.js
 * @author: steve.deng
 * @Date: 2020-12-22 17:47:40
 * @LastEditors: steve.deng
 * @LastEditTime: 2020-12-23 17:18:58
 */
import History from "./base";

export default class BrowserHistory extends History {
  constructor(router) {
    super(router);
  }
  getCurrentLocation() {
    return window.location.pathname;
  }
  setupListener() {
    // 监听popstate 历史管理而已
    window.addEventListener("popstate", () => {
      // 监听路径变化（浏览器的前进后退可以监听） 进行跳转
      this.transitionTo(this.getCurrentLocation());
    });
  }
  push(location) {
    // 跳转时采用的是H5 api   这里的切换不会调用监听popstate
    // window.history.pushState(location);
    this.transitionTo(location, () => {
      // 手动url修改
      window.history.pushState({}, null, location);
    });
  }
}
```

> 2 种模式共同方法写在 base 里面， 这样比较优雅，复用性高

3.2.2 VueRouter 构造函数创建了一个 history 实例

```javascript
// 根据当前的mode 创建不同的history管理策略
switch (options.mode) {
  case "hash": {
    this.history = new HashHistory(this);
    break;
  }
  case "history": {
    this.history = new BrowserHistory(this);
    break;
  }
}
```

> - new HashHistory(this) 传入 router 给 HashHistory 构造函数 调用父类构造函数 super(router); base.js 构造函数里面就有了 router
> - ensureSlash(): 如果没 hash,添加默认的 hash：#/
> - base.js 构造函数默认 this.current = {path: '/', matched: []}

3.2.3 install 的 init 方法

> 创建 new Vue 时 就调用 install.js 的 this.\_router.init(this) ，因为 Vue.mixin 了

        beforeCreate()方法, 就会调用init了

vue-router/index.js 完整代码

```javascript
/*
 * @description:
 * @author: steve.deng
 * @Date: 2020-12-22 07:03:02
 * @LastEditors: steve.deng
 * @LastEditTime: 2020-12-23 17:13:00
 */
import { install } from "./install";
import { createMatcher } from "./create-matcher";
import HashHistory from "./history/hash";
import BrowserHistory from "./history/history";
// 路由核心原理 根据路径 返回对应组件
export default class VueRouter {
  constructor(options) {
    // 根据用户的配置 生成一个映射表 稍后跳转时 根据路径找到对应组件来进行渲染

    // 创建匹配器后，核心的方法就是匹配
    // match addRoutes
    this.matcher = createMatcher(options.routes || []);
    this.beforeEachHooks = [];
    // 根据当前的mode 创建不同的history管理策略
    switch (options.mode) {
      case "hash": {
        this.history = new HashHistory(this);
        break;
      }
      case "history": {
        this.history = new BrowserHistory(this);
        break;
      }
    }
  }
  match(location) {
    return this.matcher.match(location);
  }
  push(location) {
    this.history.push(location);
  }
  init(app) {
    // app根实例
    // 路由初始化
    console.log("init");
    // 初始化后 需要先根据路径做一次匹配 后根据hash值的变化再次匹配
    const history = this.history;

    const setupHashListener = () => {
      history.setupListener(); // 监听hash变化
    };
    history.transitionTo(history.getCurrentLocation(), setupHashListener); // 跳转到哪里
    history.listen((route) => {
      app._route = route;
    });
  }
  beforeEach(fn) {
    console.log(fn);
    this.beforeEachHooks.push(fn);
  }
}

VueRouter.install = install;
```

- history.transitionTo 方法在 base.js 展开如下

```javascript
 // 跳转处理  路径变化 组件渲染 数据变化 更新视图
    transitionTo(location, onComplete) {
        // 默认先执行一次

        // 根据跳转的路径 获取匹配记录
        let route = this.router.match(location); // route = {path: '/about/a', matched: [{},{}]}
        console.log('this.router.match', route);
        let queue = [].concat(this.router.beforeEachHooks);
        const iterator = (hook, cb) => {
            hook(route, this.current, cb);
        };

        runQueue(queue, iterator, () => {
            console.log('queue', queue);
            this.current = route; // current变量引用地址变了
            this.cb && this.cb(route); // 路由变了 触发更新
            // 监听hash变化
            onComplete && onComplete(); // onComplete调用后 hash值变化 再次调用transitionTo
        });
    }
```

- transitionTo 传入 location 和 回调, 其中 this.router.match 函数 是 this.matcher.match(location);
- route = {path: '/about/a', matched: [{},{}]}
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/20201224172749381.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3FxMzk4NTc3MzUx,size_16,color_FFFFFF,t_70)
- runQueue 是为了跑钩子后再执行回调，先忽略钩子函数执行，直接执行以下

```javascript
() => {
  console.log("queue", queue);
  this.current = route; // current变量引用地址变了
  this.cb && this.cb(route); // 路由变了 触发更新
  // 监听hash变化
  onComplete && onComplete(); // onComplete调用后 hash值变化 再次调用transitionTo
};
```

- this.current = route; 是把当前匹配 route 传给 current

- 然后执行回调 onComplete（） 即执行

```javascript
const setupHashListener = () => {
  history.setupListener(); // 监听hash变化
};
```

- 此时 this.cb 还没有值 暂时不执行
  接着执行 history.listen ， 如下, 为了给 app.route 赋值用

```javascript
  listen(cb) {
        this.cb = cb;
    }

  history.listen(route => {
            app._route = route;
        });
```

- init 完成后 执行 defineReactive 为了给\_route 设置响应式数据

```javascript
// 响应式数据 global api定义了这个方法
Vue.util.defineReactive(this, "_route", this._router.history.current);
```

- 完整的 install.js

```javascript
import RouterLink from "./components/router-link";
import RouterView from "./components/router-view";
export let _Vue;

// 直接使用传入的vue  不需要引入了 版本也保持一直
export function install(Vue, options) {
  _Vue = Vue;

  //我需要将当前的根实例的提供的router属性 共享给所有子组件 Vue.prototype不好 会影响了全局的Vue实例 改用mixin

  // 所有子组件初始化的时候 都会去调用Vue.extend Vue.options
  Vue.mixin({
    beforeCreate() {
      // 获取到每个人的实例 给实例添加属性
      console.log(this.$options);
      // 共用顶层this
      if (this.$options.router) {
        this._routerRoot = this; // 把根实例挂载到_routerRoot上
        this._router = this.$options.router;
        this._router.init(this);
        // 响应式数据 global api定义了这个方法
        Vue.util.defineReactive(this, "_route", this._router.history.current);

        console.log("this._route", this._route);
        // this._router 路由实例
      } else {
        // this._routerRoot 指向当前根组件实例
        this._routerRoot = this.$parent && this.$parent._routerRoot;
      }
      // 根 -》 父亲- > 儿子 -》 孙子
    },
  });

  // 代理
  Object.defineProperty(Vue.prototype, "$route", {
    get() {
      return this._routerRoot._route; // current对象 里面放的属性 path matched   _route放属性
    },
  });

  Object.defineProperty(Vue.prototype, "$router", {
    get() {
      // router.history.push();
      return this._routerRoot._router; // addRoute match  router放方法
    },
  });
  Vue.component("router-link", RouterLink);
  Vue.component("router-view", RouterView);
}
```

> 定义 Vue.prototype 的$route和$router 为了给全局实例使用
> 同时定义 router-link、router-view 组件 提供给全局用

## 4. 定义 router-link、router-view 组件

- router-link 本质是一个 a 标签

```javascript
<template>
    <div id="app">
        <div id="nav">
            <router-link to="/">Home</router-link> |
            <router-link to="/about">About</router-link>
        </div>
        <p @click="set">点击</p>
        {{ a }}
        <router-view />
    </div>
</template>
```

- rout-link 组件

```javascript
export default {
  name: "router-link",
  props: {
    to: {
      type: String,
      required: true,
    },
    tag: {
      type: String,
      default: "a",
    },
  },
  render(h) {
    let tag = this.tag;
    return (
      <tag
        onClick={() => {
          this.$router.push(this.to);
        }}
      >
        {this.$slots.default}
      </tag>
    );
    //_c
    // return h(this.tag, {}, this.$slots.default + 'ok');
  },
};
```

- 核心关键是 router-view 组件, 渲染 route 匹配的组件

```javascript
export default {
  functional: true, // 函数式组件，节省性能 缺陷没有实例     class组件 Vue.extend
  name: "router-view",
  render(h, { data, parent }) {
    let route = parent.$route; // 会做依赖收集
    console.log("route.matched");
    console.log(route.matched);
    data.routerView = true; // 渲染router-view时标记他为一个router-view

    let records = route.matched;
    let depth = 0;
    while (parent) {
      //_vnode
      // 有父亲节点就 depth++  防止永远渲染0层
      if (parent.$vnode && parent.$vnode.data.routerView) {
        console.log(parent);
        depth++;
      }
      // 循环终止条件
      parent = parent.$parent;
    }
    let record = records[depth];
    if (!record) {
      return h();
    }
    return h(record.component, data);
  },
};
```

- 函数式组件无状态，只有 render 函数的参数
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/20201225111250583.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3FxMzk4NTc3MzUx,size_16,color_FFFFFF,t_70)
  ![![在这里插入图片描述](https://img-blog.csdnimg.cn/20201225111822400.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3FxMzk4NTc3MzUx,size_16,color_FFFFFF,t_70](https://img-blog.csdnimg.cn/20201225111856882.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3FxMzk4NTc3MzUx,size_16,color_FFFFFF,t_70)

1. parent.$route 可以获得父亲组件的$route $route 其实就是共享的了 因为自己没有 this 状态 故从父亲组件获取就行了，
2. 标记下 data.routerView = true; 说明这个时候准备渲染了一次 routerview
3. records 是当前页面匹配后的组件列表， 一般都是先渲染一级路由 再渲染二级路由，所以要做顺序渲染
4. 用 dept = 0 做顺序渲染标记位
5. 比如是第二个 router-view 组件 就通过 parent.$vnode.data.routerView 判断自己父级渲染过了 dept 就加 1
6. 最后 h(record.component, data) 就是渲染组件了 显示渲染 records[0] 再渲染 records[1]
7. 因为这个数据是响应式

```javascript
// 响应式数据 global api定义了这个方法
Vue.util.defineReactive(this, "_route", this._router.history.current);
Object.defineProperty(Vue.prototype, "$route", {
  get() {
    return this._routerRoot._route; // current对象 里面放的属性 path matched   _route放属性
  },
});
```

所以\_route 变化， 就会触发上面的 render 函数重新渲染， 视图就发生变化了。

## 5.钩子函数

- 其实就是订阅发布模式

```javascript
 beforeEach(fn) {
        console.log(fn);
        this.beforeEachHooks.push(fn);
    }
// 把函数添加进订阅表里 this.beforeEachHooks
router.beforeEach((to, from, next) => {
    // 类似express koa中间件
    setTimeout(() => {
        console.log(1);
        next();
    }, 1000);
});
```

- transitionTo 就是跳转路径的方法 先 runQueue 执行完 iterator 里面的 hook 再 callback 设置 this.current = route 视图再变化。

```javascript
    // 跳转处理  路径变化 组件渲染 数据变化 更新视图
    transitionTo(location, onComplete) {
        // 默认先执行一次

        // 根据跳转的路径 获取匹配记录
        let route = this.router.match(location); // route = {path: '/about/a', matched: [{},{}]}
        console.log('this.router.match', route);
        let queue = [].concat(this.router.beforeEachHooks);
        const iterator = (hook, cb) => {
            hook(route, this.current, cb);
        };
        runQueue(queue, iterator, () => {
            console.log('queue', queue);
            this.current = route; // current变量引用地址变了
            this.cb && this.cb(route); // 路由变了 触发更新
            // 监听hash变化
            onComplete && onComplete(); // onComplete调用后 hash值变化 再次调用transitionTo
        });
    }
```

## 6.小结

1.vue-router 本质就是 location.hash = xxx 和 window.history.pushState({}, null, location) 去做 url 修改， 2.然后通过 window.addEventListener('hashchange' ） 、 window.addEventListener('popstate'）做逆向监听 3.用户配置的 route 表， 就是路径和组件的映射关系， url 发生后就触发 hash 或者 pathname 匹配过程, 匹配的组件渲染出来，router-view 负责渲染， 如果只是一级路由就只渲染一次里面组件， 有子路由就依次渲染。

### 设计优点总结：

- history 和 hash 模式都用了继承 base 的方法，子类做重载，更好的区分逻辑，同时也更好复用代码。
- 借用 Vue.mixin 去嵌入 beforeCreate 生命周期，使每个实例都拥有 this.\_routerRoot ，所有实例都能获得
  route、router
- createMatcher 创建适配器 matcher，里面有 addRoutes，match 方法，路由匹配和添加就交给 matcher 处理。
- router-view 组件做到无须传参，完全依靠 parent.$route 参数拿到 route 对象做组件寻址和渲染处理，付子组件也能渲染，解决了组件和 router-view 之间关系
