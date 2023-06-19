---
title: html2canvas框架分析
date: 2021-12-16 14:34:22
tags: html2canvas
categories: 源码分析
---

## 1、什么是 html2canvas

html2canvas 可以直接截取特定 dom 元素内的所有内容并导出图片
官网地址：
[http://html2canvas.hertzen.com/](http://html2canvas.hertzen.com/)

## 2、使用方式

- 安装

```
npm i html2canvas  -S
```

- 引入使用

```javascript
// vue文件
   <!-- 海报html  -->
  <template>
    <div class="c-code" v-if="showOriImg">
        <div class="poster-wrap" ref="box" id="box">
            <img class="bg-poster" :src="qr_code_info.poster_url" />
            <img
                :src="qr_code_info.url"
                alt="二维码"
                class="c-code-img"
            />
            <div>第一份测试文案</div>
            <p style="font-size: 40px">test</p>
            <p>中文</p>
        </div>
    </div>
    <!-- 制作的截图图片 -->
    <div class="c-code" v-if="!showOriImg && posterImg">
        <div class="poster-wrap">
            <img
                class="bg-poster"
                style="width: 100%"
                :src="posterImg"
            />
        </div>
    </div>
</template>
<script>
import html2canvas from 'html2canvas';

methods: {
// 设置背景二维码
     setBgCode() {
          var width = document.getElementById('box').offsetWidth,
              height = document.getElementById('box').offsetHeight,
              scale = window.devicePixelRatio; //放大倍数
          console.log('setBgCode-----------');
          console.log(width);
          console.log(height);
          debugger;
          html2canvas(this.$refs.box, {
              scale,
              width: width,
              heigth: height,
              useCORS: true // 【重要】开启跨域配置
          }).then(canvas => {
              var context = canvas.getContext('2d');
              // 【重要】关闭抗锯齿
              context.mozImageSmoothingEnabled = false;
              context.webkitImageSmoothingEnabled = false;
              context.msImageSmoothingEnabled = false;
              context.imageSmoothingEnabled = false;

              const posterDataUrl = canvas.toDataURL('image/png', 1);
              this.posterImg = posterDataUrl;
              this.showOriImg = false;

          });
      }
   }
</script>
```

大致就是调用 html2canvas()函数 传入 第一个参数 dom，第二个参数是配置项， 然后会返回一个 promise ，then 里面的 value 是一个 canvas，拿到 canvas 就可以使用 toDataURL 导出一张 base64 图片地址: canvas.toDataURL('image/png', 1);

## 3、原理分析

1. 确定入口
   ![在这里插入图片描述](https://img-blog.csdnimg.cn/d0b28203cd7a421495b7d9fe0f1eccef.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5YmN56uv56iL5bqP54y_ZHpm,size_17,color_FFFFFF,t_70,g_se,x_16)
   ![在这里插入图片描述](https://img-blog.csdnimg.cn/80db10500b224d4dac64e4d97ba72fc2.png)
2. 入口方法

```javascript
const html2canvas = (
  element: HTMLElement,
  options: Partial<Options> = {}
): Promise<HTMLCanvasElement> => {
  return renderElement(element, options);
};
```

入口方法内部执行了 renderElement

```javascript
const renderElement = async (
  element: HTMLElement,
  opts: Partial<Options>
): Promise<HTMLCanvasElement> => {
  if (!element || typeof element !== "object") {
    return Promise.reject("Invalid element provided as first argument");
  }
  const ownerDocument = element.ownerDocument;

  if (!ownerDocument) {
    throw new Error(`Element is not attached to a Document`);
  }

  const defaultView = ownerDocument.defaultView;

  if (!defaultView) {
    throw new Error(`Document is not attached to a Window`);
  }

  const resourceOptions = {
    allowTaint: opts.allowTaint ?? false,
    imageTimeout: opts.imageTimeout ?? 15000,
    proxy: opts.proxy,
    useCORS: opts.useCORS ?? false,
  };

  const contextOptions = {
    logging: opts.logging ?? true,
    cache: opts.cache,
    ...resourceOptions,
  };

  const windowOptions = {
    windowWidth: opts.windowWidth ?? defaultView.innerWidth,
    windowHeight: opts.windowHeight ?? defaultView.innerHeight,
    scrollX: opts.scrollX ?? defaultView.pageXOffset,
    scrollY: opts.scrollY ?? defaultView.pageYOffset,
  };

  const windowBounds = new Bounds(
    windowOptions.scrollX,
    windowOptions.scrollY,
    windowOptions.windowWidth,
    windowOptions.windowHeight
  );

  const context = new Context(contextOptions, windowBounds);

  const foreignObjectRendering = opts.foreignObjectRendering ?? false;

  const cloneOptions: CloneConfigurations = {
    allowTaint: opts.allowTaint ?? false,
    onclone: opts.onclone,
    ignoreElements: opts.ignoreElements,
    inlineImages: foreignObjectRendering,
    copyStyles: foreignObjectRendering,
  };

  context.logger.debug(
    `Starting document clone with size ${windowBounds.width}x${
      windowBounds.height
    } scrolled to ${-windowBounds.left},${-windowBounds.top}`
  );

  const documentCloner = new DocumentCloner(context, element, cloneOptions);
  const clonedElement = documentCloner.clonedReferenceElement;
  if (!clonedElement) {
    return Promise.reject(`Unable to find element in cloned iframe`);
  }

  const container = await documentCloner.toIFrame(ownerDocument, windowBounds);

  const { width, height, left, top } =
    isBodyElement(clonedElement) || isHTMLElement(clonedElement)
      ? parseDocumentSize(clonedElement.ownerDocument)
      : parseBounds(context, clonedElement);

  const backgroundColor = parseBackgroundColor(
    context,
    clonedElement,
    opts.backgroundColor
  );

  const renderOptions: RenderConfigurations = {
    canvas: opts.canvas,
    backgroundColor,
    scale: opts.scale ?? defaultView.devicePixelRatio ?? 1,
    x: (opts.x ?? 0) + left,
    y: (opts.y ?? 0) + top,
    width: opts.width ?? Math.ceil(width),
    height: opts.height ?? Math.ceil(height),
  };

  let canvas;

  if (foreignObjectRendering) {
    context.logger.debug(`Document cloned, using foreign object rendering`);
    const renderer = new ForeignObjectRenderer(context, renderOptions);
    canvas = await renderer.render(clonedElement);
  } else {
    context.logger.debug(
      `Document cloned, element located at ${left},${top} with size ${width}x${height} using computed rendering`
    );

    context.logger.debug(`Starting DOM parsing`);
    const root = parseTree(context, clonedElement);

    if (backgroundColor === root.styles.backgroundColor) {
      root.styles.backgroundColor = COLORS.TRANSPARENT;
    }

    context.logger.debug(
      `Starting renderer for element at ${renderOptions.x},${renderOptions.y} with size ${renderOptions.width}x${renderOptions.height}`
    );

    const renderer = new CanvasRenderer(context, renderOptions);
    canvas = await renderer.render(root);
  }

  if (opts.removeContainer ?? true) {
    if (!DocumentCloner.destroy(container)) {
      context.logger.error(
        `Cannot detach cloned iframe as it is not in the DOM anymore`
      );
    }
  }

  context.logger.debug(`Finished rendering`);
  return canvas;
};
```

它主要做了以下事情：

1. 解析用户传入的 options，将其与默认的 options 合并，得到用于渲染的配置数据 renderOptions
2. 对传入的 DOM 元素进行解析，取到节点信息和样式信息，这些节点信息会和上一步的 renderOptions 配置一起传给 canvasRenderer 实例，用来绘制离屏 canvas
3. canvasRenderer 将依据浏览器渲染层叠内容的规则，将用户传入的 DOM 元素渲染到一个离屏 canvas 中，这个离屏 canvas 我们可以在 then 方法的回调中取到

上面这一步 简化为个步骤

```javascript
const renderElement = async (
  element: HTMLElement,
  opts: Partial<Options>
): Promise<HTMLCanvasElement> => {
  const renderOptions = { ...defaultOptions, ...opts }; // 合并默认配置和用户配置
  const root = parseTree(element); // 解析用户传入的DOM元素（为了不影响原始的DOM，实际上会克隆一个新的DOM元素），获取节点信息
  const renderer = new CanvasRenderer(renderOptions); // 根据渲染的配置数据生成canvasRenderer实例
  return await renderer.render(root); // canvasRenderer实例会根据解析到的节点信息，依据浏览器渲染层叠内容的规则，将DOM元素内容渲染到离屏canvas中
};
```

3. 合并配置的逻辑比较简单，我们直接略过，重点分析下解析节点信息（parseTree）和渲染离屏 canvas（renderer.render）两个逻辑。

   #### 3.1 解析节点信息 parseTree

   parseTree 的入参就是一个普通的 DOM 元素，返回值是一个 ElementContainer 对象，该对象主要包含 DOM 元素的位置信息（bounds: width|height|left|top）、样式数据、文本节点数据等（只是节点树的相关信息，不包含层叠数据，层叠数据在 parseStackingContexts 方法中取得）。解析的方法就是递归整个 DOM 树，并取得每一层节点的数据。

parseTree 大致返回
![在这里插入图片描述](https://img-blog.csdnimg.cn/1e667f7f1a734f02828595d31e0d7170.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5YmN56uv56iL5bqP54y_ZHpm,size_20,color_FFFFFF,t_70,g_se,x_16)
![在这里插入图片描述](https://img-blog.csdnimg.cn/6c95c43992f44fd789cacdc06223e349.png)

```javascript
里面包含了每一层节点的：

bounds - 位置信息（宽/高、横/纵坐标）
elements - 子元素信息
flags - 用来决定如何渲染的标志
styles - 样式描述信息
textNodes - 文本节点信息
```

本质上就是把 dom 元素变成一棵树结构 有父子关系， 然后有 bounds 信息，列出坐标位置 还有样式，有这些条件，后面就可以做渲染了

#### 3.2 生成渲染器

new CanvasRenderer(renderOptions);

```javascript
export class CanvasRenderer extends Renderer {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    private readonly _activeEffects: IElementEffect[] = [];
    private readonly fontMetrics: FontMetrics;

    constructor(context: Context, options: RenderConfigurations) {
        super(context, options);
        this.canvas = options.canvas ? options.canvas : document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
        if (!options.canvas) {
            this.canvas.width = Math.floor(options.width * options.scale);
            this.canvas.height = Math.floor(options.height * options.scale);
            this.canvas.style.width = `${options.width}px`;
            this.canvas.style.height = `${options.height}px`;
        }
        this.fontMetrics = new FontMetrics(document);
        this.ctx.scale(this.options.scale, this.options.scale);
        this.ctx.translate(-options.x, -options.y);
        this.ctx.textBaseline = 'bottom';
        this._activeEffects = [];
        this.context.logger.debug(
            `Canvas renderer initialized (${options.width}x${options.height}) with scale ${options.scale}`
        );
    }
    ....
```

这一步就是根据配置信息生成一个 render 渲染器 ， 渲染器内部生成一个 canvas 对象，也是后面 peomise 返回的 cavas 对象 ， 方便后续调用 canvas 方法

#### 3.3 渲染离屏 canvas , 调用 renderer.render

有了节点树信息，就可以用来渲染离屏 canvas 了，我们来看看渲染的逻辑。

渲染的逻辑在 CanvasRenderer 类的 render 方法中，该方法主要用来渲染层叠内容：

render 方法的核心代码如下：

```javascript
  /**
   * StackingContext {
   *   element: ElementPaint {container: ElementContainer, effects: Array(0), curves: BoundCurves}
   *   inlineLevel: []
   *   negativeZIndex: []
   *   nonInlineLevel: [ElementPaint]
   *   nonPositionedFloats: []
   *   nonPositionedInlineLevel: []
   *   positiveZIndex: [StackingContext]
   *   zeroOrAutoZIndexOrTransformedOrOpacity: [StackingContext]
   * }
   */

    async render(element: ElementContainer): Promise<HTMLCanvasElement> {
        if (this.options.backgroundColor) {
            this.ctx.fillStyle = asString(this.options.backgroundColor);
            this.ctx.fillRect(this.options.x, this.options.y, this.options.width, this.options.height);
        }

        const stack = parseStackingContexts(element);

        await this.renderStack(stack);
        this.applyEffects([]);
        return this.canvas;
    }
```

1. 这个 render 函数 传入的 element 就是 3.1 拿到的 root 元素
2. 然后根据配置信息，填充 canvas 的背景
3. 然后根据 element 生成 stack

parseStackingContexts(element) 实现如下：

```javascript
export const parseStackingContexts = (
  container: ElementContainer
): StackingContext => {
  const paintContainer = new ElementPaint(container, null);
  const root = new StackingContext(paintContainer);
  const listItems: ElementPaint[] = [];
  parseStackTree(paintContainer, root, root, listItems);
  processListItems(paintContainer.container, listItems);
  return root;
};
```

返回的 stack 就是 下面的对象 本质就是把上么的 elementContainer 根据 dom 实际情况分门别类 放进不同数组
![在这里插入图片描述](https://img-blog.csdnimg.cn/1a9016334e7b470296f08562d9c9eac2.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5YmN56uv56iL5bqP54y_ZHpm,size_20,color_FFFFFF,t_70,g_se,x_16)

> 其中的
> inlineLevel - 内联元素
> negativeZIndex - zIndex 为负的元素
> nonInlineLevel - 非内联元素
> nonPositionedFloats - 未定位的浮动元素
> nonPositionedInlineLevel - 内联的非定位元素，包含内联表和内联块
> positiveZIndex - z-index 大于等于 1 的元素
> zeroOrAutoZIndexOrTransformedOrOpacity - 所有有层叠上下文的（z-index: auto|0）、透明度小于 1 的（opacity 小于 1）或变换的（transform 不为 none）元素
> 代表的是层叠信息，渲染层叠内容时会根据这些层叠信息来决定渲染的顺序，一层一层有序进行渲染。

parseStackingContexts 解析层叠信息的方式和 parseTree 解析节点信息的方式类似，都是递归整棵树，收集树的每一层的信息，形成一颗包含层叠信息的层叠树。

而渲染层叠内容的 renderStack 方式实际上调用的是 renderStackContent 方法，该方法是整个渲染流程中最为关键的方法.

parseStackTree 就是根据整个 elements 数遍历 递归处理， 把符合的类型分门别类放在各个数组， 比如根据 inline 根据 opacity 、position 等样式决定。

```javascript
const parseStackTree = (
  parent: ElementPaint,
  stackingContext: StackingContext,
  realStackingContext: StackingContext,
  listItems: ElementPaint[]
) => {
  parent.container.elements.forEach((child) => {
    const treatAsRealStackingContext = contains(
      child.flags,
      FLAGS.CREATES_REAL_STACKING_CONTEXT
    );
    const createsStackingContext = contains(
      child.flags,
      FLAGS.CREATES_STACKING_CONTEXT
    );
    const paintContainer = new ElementPaint(child, parent);
    if (contains(child.styles.display, DISPLAY.LIST_ITEM)) {
      listItems.push(paintContainer);
    }

    const listOwnerItems = contains(child.flags, FLAGS.IS_LIST_OWNER)
      ? []
      : listItems;

    if (treatAsRealStackingContext || createsStackingContext) {
      const parentStack =
        treatAsRealStackingContext || child.styles.isPositioned()
          ? realStackingContext
          : stackingContext;

      const stack = new StackingContext(paintContainer);

      if (
        child.styles.isPositioned() ||
        child.styles.opacity < 1 ||
        child.styles.isTransformed()
      ) {
        const order = child.styles.zIndex.order;
        if (order < 0) {
          let index = 0;

          parentStack.negativeZIndex.some((current, i) => {
            if (order > current.element.container.styles.zIndex.order) {
              index = i;
              return false;
            } else if (index > 0) {
              return true;
            }

            return false;
          });
          parentStack.negativeZIndex.splice(index, 0, stack);
        } else if (order > 0) {
          let index = 0;
          parentStack.positiveZIndex.some((current, i) => {
            if (order >= current.element.container.styles.zIndex.order) {
              index = i + 1;
              return false;
            } else if (index > 0) {
              return true;
            }

            return false;
          });
          parentStack.positiveZIndex.splice(index, 0, stack);
        } else {
          parentStack.zeroOrAutoZIndexOrTransformedOrOpacity.push(stack);
        }
      } else {
        if (child.styles.isFloating()) {
          parentStack.nonPositionedFloats.push(stack);
        } else {
          parentStack.nonPositionedInlineLevel.push(stack);
        }
      }

      parseStackTree(
        paintContainer,
        stack,
        treatAsRealStackingContext ? stack : realStackingContext,
        listOwnerItems
      );
    } else {
      if (child.styles.isInlineLevel()) {
        stackingContext.inlineLevel.push(paintContainer);
      } else {
        stackingContext.nonInlineLevel.push(paintContainer);
      }

      parseStackTree(
        paintContainer,
        stackingContext,
        realStackingContext,
        listOwnerItems
      );
    }

    if (contains(child.flags, FLAGS.IS_LIST_OWNER)) {
      processListItems(child, listOwnerItems);
    }
  });
};
```

parent.container.elements 就是一开始 3.1 获取 dom 树
![在这里插入图片描述](https://img-blog.csdnimg.cn/949b94b9597245529d4876e41098812c.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5YmN56uv56iL5bqP54y_ZHpm,size_20,color_FFFFFF,t_70,g_se,x_16)
stackingContext 就是整个对象 然后里面包含各种类别的情况， 把 element 单独塞进去 最后再分别渲染出来。
![在这里插入图片描述](https://img-blog.csdnimg.cn/1698e7615307482ebd994961de84a2c5.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5YmN56uv56iL5bqP54y_ZHpm,size_14,color_FFFFFF,t_70,g_se,x_16)
![在这里插入图片描述](https://img-blog.csdnimg.cn/3ed119c2d81d44f180e9aa5e43993f29.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5YmN56uv56iL5bqP54y_ZHpm,size_8,color_FFFFFF,t_70,g_se,x_16)

4. 渲染 stack  
   调用 this.renderStack(stack);

```javascript
 async renderStack(stack: StackingContext): Promise<void> {
        const styles = stack.element.container.styles;
        if (styles.isVisible()) {
            await this.renderStackContent(stack);
        }
    }

async renderStackContent(stack: StackingContext): Promise<void> {
        if (contains(stack.element.container.flags, FLAGS.DEBUG_RENDER)) {
            debugger;
        }
        // https://www.w3.org/TR/css-position-3/#painting-order
        // 1. the background and borders of the element forming the stacking context.
        await this.renderNodeBackgroundAndBorders(stack.element);
        // 2. the child stacking contexts with negative stack levels (most negative first).
        for (const child of stack.negativeZIndex) {
            await this.renderStack(child);
        }
        // 3. For all its in-flow, non-positioned, block-level descendants in tree order:
        await this.renderNodeContent(stack.element);

        for (const child of stack.nonInlineLevel) {
            await this.renderNode(child);
        }
        // 4. All non-positioned floating descendants, in tree order. For each one of these,
        // treat the element as if it created a new stacking context, but any positioned descendants and descendants
        // which actually create a new stacking context should be considered part of the parent stacking context,
        // not this new one.
        for (const child of stack.nonPositionedFloats) {
            await this.renderStack(child);
        }
        // 5. the in-flow, inline-level, non-positioned descendants, including inline tables and inline blocks.
        for (const child of stack.nonPositionedInlineLevel) {
            await this.renderStack(child);
        }
        for (const child of stack.inlineLevel) {
            await this.renderNode(child);
        }
        // 6. All positioned, opacity or transform descendants, in tree order that fall into the following categories:
        //  All positioned descendants with 'z-index: auto' or 'z-index: 0', in tree order.
        //  For those with 'z-index: auto', treat the element as if it created a new stacking context,
        //  but any positioned descendants and descendants which actually create a new stacking context should be
        //  considered part of the parent stacking context, not this new one. For those with 'z-index: 0',
        //  treat the stacking context generated atomically.
        //
        //  All opacity descendants with opacity less than 1
        //
        //  All transform descendants with transform other than none
        for (const child of stack.zeroOrAutoZIndexOrTransformedOrOpacity) {
            await this.renderStack(child);
        }
        // 7. Stacking contexts formed by positioned descendants with z-indices greater than or equal to 1 in z-index
        // order (smallest first) then tree order.
        for (const child of stack.positiveZIndex) {
            await this.renderStack(child);
        }
    }
```

↑ renderstackContent 就是按类别渲染
![在这里插入图片描述](https://img-blog.csdnimg.cn/360fadcd63c34094ac52b8ec41d534a1.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5YmN56uv56iL5bqP54y_ZHpm,size_16,color_FFFFFF,t_70,g_se,x_16)
按照上面这种顺序渲染

核心渲染方法：

```javascript
async renderNodeContent(paint: ElementPaint): Promise<void> {
        this.applyEffects(paint.getEffects(EffectTarget.CONTENT));
        const container = paint.container;
        const curves = paint.curves;
        const styles = container.styles;
        for (const child of container.textNodes) {
            await this.renderTextNode(child, styles);
        }

        if (container instanceof ImageElementContainer) {
            try {
                const image = await this.context.cache.match(container.src);
                this.renderReplacedElement(container, curves, image);
            } catch (e) {
                this.context.logger.error(`Error loading image ${container.src}`);
            }
        }

        if (container instanceof CanvasElementContainer) {
            this.renderReplacedElement(container, curves, container.canvas);
        }

        if (container instanceof SVGElementContainer) {
            try {
                const image = await this.context.cache.match(container.svg);
                this.renderReplacedElement(container, curves, image);
            } catch (e) {
                this.context.logger.error(`Error loading svg ${container.svg.substring(0, 255)}`);
            }
        }

        if (container instanceof IFrameElementContainer && container.tree) {
            const iframeRenderer = new CanvasRenderer(this.context, {
                scale: this.options.scale,
                backgroundColor: container.backgroundColor,
                x: 0,
                y: 0,
                width: container.width,
                height: container.height
            });

            const canvas = await iframeRenderer.render(container.tree);
            if (container.width && container.height) {
                this.ctx.drawImage(
                    canvas,
                    0,
                    0,
                    container.width,
                    container.height,
                    container.bounds.left,
                    container.bounds.top,
                    container.bounds.width,
                    container.bounds.height
                );
            }
        }

        if (container instanceof InputElementContainer) {
            const size = Math.min(container.bounds.width, container.bounds.height);

            if (container.type === CHECKBOX) {
                if (container.checked) {
                    this.ctx.save();
                    this.path([
                        new Vector(container.bounds.left + size * 0.39363, container.bounds.top + size * 0.79),
                        new Vector(container.bounds.left + size * 0.16, container.bounds.top + size * 0.5549),
                        new Vector(container.bounds.left + size * 0.27347, container.bounds.top + size * 0.44071),
                        new Vector(container.bounds.left + size * 0.39694, container.bounds.top + size * 0.5649),
                        new Vector(container.bounds.left + size * 0.72983, container.bounds.top + size * 0.23),
                        new Vector(container.bounds.left + size * 0.84, container.bounds.top + size * 0.34085),
                        new Vector(container.bounds.left + size * 0.39363, container.bounds.top + size * 0.79)
                    ]);

                    this.ctx.fillStyle = asString(INPUT_COLOR);
                    this.ctx.fill();
                    this.ctx.restore();
                }
            } else if (container.type === RADIO) {
                if (container.checked) {
                    this.ctx.save();
                    this.ctx.beginPath();
                    this.ctx.arc(
                        container.bounds.left + size / 2,
                        container.bounds.top + size / 2,
                        size / 4,
                        0,
                        Math.PI * 2,
                        true
                    );
                    this.ctx.fillStyle = asString(INPUT_COLOR);
                    this.ctx.fill();
                    this.ctx.restore();
                }
            }
        }

        if (isTextInputElement(container) && container.value.length) {
            const [fontFamily, fontSize] = this.createFontStyle(styles);
            const {baseline} = this.fontMetrics.getMetrics(fontFamily, fontSize);

            this.ctx.font = fontFamily;
            this.ctx.fillStyle = asString(styles.color);

            this.ctx.textBaseline = 'alphabetic';
            this.ctx.textAlign = canvasTextAlign(container.styles.textAlign);

            const bounds = contentBox(container);

            let x = 0;

            switch (container.styles.textAlign) {
                case TEXT_ALIGN.CENTER:
                    x += bounds.width / 2;
                    break;
                case TEXT_ALIGN.RIGHT:
                    x += bounds.width;
                    break;
            }

            const textBounds = bounds.add(x, 0, 0, -bounds.height / 2 + 1);

            this.ctx.save();
            this.path([
                new Vector(bounds.left, bounds.top),
                new Vector(bounds.left + bounds.width, bounds.top),
                new Vector(bounds.left + bounds.width, bounds.top + bounds.height),
                new Vector(bounds.left, bounds.top + bounds.height)
            ]);

            this.ctx.clip();
            this.renderTextWithLetterSpacing(
                new TextBounds(container.value, textBounds),
                styles.letterSpacing,
                baseline
            );
            this.ctx.restore();
            this.ctx.textBaseline = 'alphabetic';
            this.ctx.textAlign = 'left';
        }

        if (contains(container.styles.display, DISPLAY.LIST_ITEM)) {
            if (container.styles.listStyleImage !== null) {
                const img = container.styles.listStyleImage;
                if (img.type === CSSImageType.URL) {
                    let image;
                    const url = (img as CSSURLImage).url;
                    try {
                        image = await this.context.cache.match(url);
                        this.ctx.drawImage(image, container.bounds.left - (image.width + 10), container.bounds.top);
                    } catch (e) {
                        this.context.logger.error(`Error loading list-style-image ${url}`);
                    }
                }
            } else if (paint.listValue && container.styles.listStyleType !== LIST_STYLE_TYPE.NONE) {
                const [fontFamily] = this.createFontStyle(styles);

                this.ctx.font = fontFamily;
                this.ctx.fillStyle = asString(styles.color);

                this.ctx.textBaseline = 'middle';
                this.ctx.textAlign = 'right';
                const bounds = new Bounds(
                    container.bounds.left,
                    container.bounds.top + getAbsoluteValue(container.styles.paddingTop, container.bounds.width),
                    container.bounds.width,
                    computeLineHeight(styles.lineHeight, styles.fontSize.number) / 2 + 1
                );

                this.renderTextWithLetterSpacing(
                    new TextBounds(paint.listValue, bounds),
                    styles.letterSpacing,
                    computeLineHeight(styles.lineHeight, styles.fontSize.number) / 2 + 2
                );
                this.ctx.textBaseline = 'bottom';
                this.ctx.textAlign = 'left';
            }
        }
    }
```

本质上 渲染的时候就会根据实际样式情况
图片就 this.ctx.drawImage
文案就 this.ctx.fillText
等等操作 就能渲染好 canvas 了。

最后返回这个渲染好的 canvas 就可以了。

## 4、总结

这个图是借鉴别人的 很清晰列出从入口到最终渲染的方法：
![在这里插入图片描述](https://img-blog.csdnimg.cn/a7ab47f0795d4d379a6b7eface7d5ce3.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5YmN56uv56iL5bqP54y_ZHpm,size_20,color_FFFFFF,t_70,g_se,x_16)

核心关键
1、是先解析 dom 元素，抽取关键信息，如样式，位置信息等，形成父子关系的树
2、遍历第一步的树，形成一个 stack 里面分别装着 7 种情况的 dom 树
3、生成一个 render 渲染器， 根据 stack 7 种情况，用 canvas 去渲染这 7 种情况
4、返回这个离屏 canvas 即可。
