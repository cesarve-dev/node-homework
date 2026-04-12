# Node.js Fundamentals

## What is Node.js?

Node.js runs in the terminal and it is in charge to run javascript code outside of the browser.

## How does Node.js differ from running JavaScript in the browser?

Node.js allows to run javascript in the terminal. It also have access to file system, operating system, npm packages, and more.

## What is the V8 engine, and how does Node use it?

V8 is the running engine of Chrome. Node use it to run javascript code in the terminal.

## What are some key use cases for Node.js?

Some use cases for Node.js are: real-time application, internet of things (IoT), command line tools, etc.

## Explain the difference between CommonJS and ES Modules. Give a code example of each.

The difference between CommonJS and ES Module is their syntax.

**CommonJS (default in Node.js):**

```js
const someModule = require("path of someModule");

module.exports = { someFunction };
```

**ES Modules (supported in modern Node.js):**

```js
import { useState } from "react";

export default someFunction;
```
