// Blog post https://dfkaye.com/posts/2021/08/10/alert-dialog-generator/
// Demo https://dfkaye.com/demos/alert-dialog-generator/

/*
 * A vanilla JavaScript polyfill for browser dialog methods on the window
 * object: alert(), confirm(), prompt().
 *
 * Copyright David F Kaye @dfkaye .
 * Released under the MIT license
 * Date: August 2021.
 *
 * You are free to copy and modify this file for your purposes, so long as you
 * preserve the copyright notice. Thank you!
 */

/*
 * Big caveat: this code should only be used where, for example, window.alert()
 * and friends are not defined as functions. You can use logic similar to the
 * following:
 *
 *  typeof window.prompt == "function" || (...import this file);
 *
 * Also, this file is mainly a proof of concept with a lot of commented dead
 * code to preserve my understanding as I worked out the solution.
 */

// Dialog action event handler calls this to determine whether the user intends
// to close the dialog.
function shouldClose({ type, target, code }) {
  var closer = target.getAttribute("data-close-dialog");

  // click on closer
  var closeOnClick = type == "click" && !!closer;

  // press Escape, or press Space on closer
  var closeOnEscapeOrSpace =
    /^Escape$/.test(code) || (/^Space$/.test(code) && !!closer);

  // press Enter key.
  var saveOnEnter = /^Enter$/.test(code);

  // done if one of these is true.
  var done = saveOnEnter || closeOnClick || closeOnEscapeOrSpace;

  return { done: !!done, closer, saveOnEnter, closeOnClick };
}

// Dialog action event handler calls this to determine what value to set in the
// response.
function getValue({
  input,
  prompt,
  confirm,
  closer,
  saveOnEnter,
  closeOnClick,
}) {
  // Default return value, depending on modal type, used when user presses
  // Escape key.
  var value = prompt || confirm ? null : undefined;

  // keyup event
  if (saveOnEnter) {
    value = prompt ? input.value : confirm ? true : undefined;
  }

  if (closeOnClick) {
    var yes = closer == "OK";

    if (yes) {
      value = prompt ? input.value : confirm ? true : undefined;
    } else {
      value = prompt ? null : confirm ? false : undefined;
    }
  }

  return value;
}

// Dialog action event handler calls this to remove the event handlers and the
// DOM elements.
function remove({ dialog, underlay, ok, cancel, handler }) {
  ok.removeEventListener("click", handler);
  cancel && cancel.removeEventListener("click", handler);
  document.body.removeEventListener("keyup", handler);

  dialog.parentNode.removeChild(dialog);

  while (dialog.firstChild) {
    dialog.removeChild(dialog.firstChild);
  }

  underlay.parentNode.removeChild(underlay);
}

// A coroutine generator, from http://syzygy.st/javascript-coroutines/,
// which sadly no longer exists. This version is copied from Adam Boduch,
// "JavaScript Concurrency", Packt Publishing, 2015, p. 86.
function co(G, data) {
  var g = G(data);
  g.next();
  return (data) => g.next(data);
}

// A template string helper for the dialog elements' style attributes.
function flat(s) {
  return String(s).replace(/\n/g, function () {
    return "";
  });
}

/*
  Dialog parts.

  These factories could be reduced to a single function that accepts a node
  name and set of attributes but being explicit let me get this part done more
  quickly so I could experiment with the interactive logic.
  */

function Actions() {
  var actions = document.createElement("div");

  actions.setAttribute("data-dialogue-actions", "");
  actions.setAttribute(
    "style",
    flat(`
    padding: 1em;
    text-align:right;
  `)
  );

  return actions;
}

function Button(label) {
  var button = document.createElement("button");

  button.setAttribute("value", label);
  button.setAttribute("data-close-dialog", label);
  button.setAttribute("type", "button");
  button.setAttribute(
    "style",
    flat(`
    background-color: ${label == "OK" ? "blue" : "white"};
    border: ${label == "OK" ? 0 : "1px solid black"};
    border-radius: .35rem;
    color: ${label == "OK" ? "white" : "black"};
    font-size: 16px;
    margin: 1em .5em;
    padding: .25em .5em;
  `)
  );
  button.textContent = label;

  return button;
}

function Input(value) {
  var input = document.createElement("textarea");

  input.setAttribute("id", "data-prompt-input");
  input.setAttribute(
    "style",
    flat(`
    width: 100%;
    min-height: 100px;
    resize: vertical;
    padding: 8px;
    font-family: inherit;
    font-size: inherit;
  `)
  );
  input.value = value;

  return input;
}

function Label(message) {
  var label = document.createElement("label");

  label.setAttribute("tabindex", "0");
  label.setAttribute("for", "data-prompt-input");
  label.setAttribute(
    "style",
    flat(`
    width: 100%;
  `)
  );
  label.textContent = message;

  return label;
}

function Description(id) {
  var p = document.createElement("p");

  p.setAttribute("id", id);
  p.setAttribute(
    "style",
    flat(`
    visibility: hidden;
    height: 0; 
    clip(0, 0, 0, 0);
  `)
  );
  p.textContent = "alert dialog is open";

  return p;
}

function Underlay() {
  var underlay = document.createElement("div");

  underlay.setAttribute("role", "presentation");
  underlay.setAttribute(
    "style",
    flat(`
    background: #ccc;
    height: 100%;
    opacity: .5;
    position: fixed;
    width: 100%;
    z-index: 10;
  `)
  );

  return underlay;
}

/*
 * This factory creates the dialog and attaches it to the DOM.
 *
 * Since the dialog is "modal" we use the name Modal for the dialog factory.
 *
 * You can follow the numbered comments for the construction sequence logic.
 */
function Modal({ type, message, defaultValue }) {
  // 1. declare our return value first.

  var response = { done: false };

  // 2. Create our dialog element and populate it with various parts.

  // We'll use these flags for conditional layout logic.
  var prompt = /^prompt$/.test(type);
  var confirm = /^confirm$/.test(type);

  var dialog = document.createElement("dialog");

  dialog.setAttribute("role", "alertdialog");
  dialog.setAttribute("open", true);
  dialog.setAttribute("aria-describedby", "data-dialog-description");
  dialog.setAttribute(
    "style",
    `
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 0.25em;
    padding: 1em;
    position: fixed;
    /* pseudo-responsive settings *\/
    left: 10%;
    top: 10%;
    width: 80%;
    z-index: 100;
  `.replace(/\n/g, function () {
      return "";
    })
  );

  /* Dialog child parts. */

  var description = Description("data-dialog-description");

  var label = Label(message);

  var input = prompt ? Input(defaultValue) : "";

  var ok = Button("OK");

  var cancel = confirm || prompt ? Button("Cancel") : "";

  var actions = Actions();

  /* Assemble parts. */

  dialog.appendChild(description);

  dialog.appendChild(label);
  input && dialog.appendChild(input);

  actions.appendChild(ok);
  cancel && actions.appendChild(cancel);

  dialog.appendChild(actions);

  /* Add things to the DOM */

  var underlay = Underlay();

  document.body.insertBefore(underlay, document.body.firstChild);
  document.body.insertBefore(dialog, document.body.firstChild);

  /* Set focus now that elements are in the DOM. */

  if (input) {
    input.select();
    input.focus();
  } else {
    dialog.focus();
  }

  // 3. Define response promise handler.

  /*
  First approach that worked watches the response object change using a
  timeout that runs inside the Promise initializer. When response object is
  completed, timeout calls the resolve() method, which in turn resolves the
  awaited promise.

  Drawback: Continuous polling is inefficient, and can waste battery,
  especially on long-running, long-open modals.

  Benefit: Fairly simple semantics.
  */

  // function init(resolve, reject) {
  // setTimeout(function check(response) {
  //   if (!Object(response).done) {
  //     setTimeout(check, 500, response);
  //   } else {
  //     resolve(response);
  //   }
  // }, 500, response);
  // }

  /*
    Second approach modifies the first, changing the logic in the promise
    initializer from polling timeouts to attaching the promise resolver
    function directly to the response object, and using a generator function,
    send(), which is called when a dialog response value is ready. When send()
    receives a completed response object, it calls the resolve() method on the
    response, which in turn resolves the awaited promise.

    Drawback: More indirection and other cleverness.

    Benefit: Energy efficient, especially on long-running, long-open modals.
    */

  function init(resolve, reject) {
    response.resolve = resolve;
  }

  var send = co(function* G(response, data) {
    console.log(response);
    while (true) {
      data = yield;
      Object.assign(response, data);
      if (Object(response).done) {
        return response.resolve(response);
      }
    }
  }, response);

  // 4. Define event handler to get value and update response promise.

  // setTimeout(() => {
  /* Simulate event listener setting values... */

  // First approach: modify response data, let polling function watch for it.
  // Object.assign(response, {
  //   done: true,
  //   value: "Yes"
  // });

  // Second approach: call send directly.
  // send({ done: true, value: "Yes" });
  // }, 2000);

  function handler(e) {
    var config = shouldClose(e);

    if (!config.done) {
      return;
    }

    Object.assign(config, { input, prompt, confirm });

    send({ done: true, value: getValue(config) });

    remove({ dialog, underlay, ok, cancel, handler });
  }

  ok.addEventListener("click", handler);
  cancel && cancel.addEventListener("click", handler);
  document.body.addEventListener("keyup", handler);

  // 5. return response promise

  return { response, wait: new Promise(init) };
}

// API for alert, confirm, and prompt functions.

async function alert(message = "") {
  var { wait, response } = Modal({ type: "alert", message });

  await wait;

  return response.value;
}

async function confirm(question = "") {
  var { wait, response } = Modal({ type: "confirm", message: question });

  await wait;

  return response.value;
}

async function prompt(title, defaultValue = "") {
  var { wait, response } = Modal({
    type: "prompt",
    message: title,
    defaultValue,
  });

  await wait;

  return response.value;
}

// Next step is for demo purposes only!
//
// Reassign the window methods.
//
// The async/await syntax means that all openers must use
// `await window.prompt("title", "text")` in order to capture return values.

window.alert = async function (message) {
  var response = await alert(message);

  return response;
};

window.confirm = async function (question) {
  var response = await confirm(question);

  return response;
};

window.prompt = async function (title, message) {
  var response = await prompt(title, message);

  return response;
};
