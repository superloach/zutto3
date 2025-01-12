//go:build js && wasm

package main

import (
	"errors"
	"fmt"
	"syscall/js"
)

var (
	visNetwork    = js.Global().Get("vis").Get("Network")
	ErrNotNetwork = errors.New("value is not a vis.Network")
)

type Network struct {
	v js.Value
}

func AsNetwork(v js.Value) (Network, error) {
	if !v.InstanceOf(visNetwork) {
		return Network{}, ErrNotNetwork
	}
	return Network{v: v}, nil
}

func NewNetwork(
	container js.Value, data js.Value, options ...func(opts js.Value),
) (
	_ Network, err error,
) {
	defer func() {
		if r, _ := recover().(error); r != nil {
			err = fmt.Errorf("panic: %w", r)
		}
	}()

	opts := js.Global().Get("Object").New()
	for _, opt := range options {
		opt(opts)
	}

	return AsNetwork(visNetwork.New(container, data, opts))
}

func main() {
	// container := js.Global().Get("document").Call("getElementById", "container")
	// data := js.Global().Get("Object").New()
	// _, err := NewNetwork(container, data,
	// 	func(opts js.Value) {
	// 		manipulation := js.Global().Get("Object").New()

	// 		manipulation.Set("enabled", true)
	// 		manipulation.Set("addNode", js.FuncOf(func(this js.Value, args []js.Value) any {
	// 			data := args[0]
	// 			callback := args[1]

	// 			label := js.Global().Call("prompt", "Enter node label:", "")
	// 			if label.IsNull() {
	// 				callback.Call("cancel")
	// 				return nil
	// 			}

	// 			data.Set("label", label)
	// 			callback.Call("addNode", data)
	// 			return nil
	// 		}))

	// 		manipulation.Set("editNode", js.FuncOf(func(this js.Value, args []js.Value) any {
	// 			data := args[0]
	// 			callback := args[1]

	// 			label := js.Global().Call("prompt", "Edit node label:", data.Get("label"))
	// 			if label.IsNull() {
	// 				callback.Call("cancel")
	// 				return nil
	// 			}

	// 			data.Set("label", label)
	// 			callback.Call("editNode", data)
	// 			return nil
	// 		}))

	// 		manipulation.Set("deleteNode", js.FuncOf(func(this js.Value, args []js.Value) any {
	// 			data := args[0]
	// 			callback := args[1]

	// 			if js.Global().Call("confirm", "Delete node?").Bool() {
	// 				callback.Call("deleteNode", data)
	// 			} else {
	// 				callback.Call("cancel")
	// 			}
	// 			return nil
	// 		}))

	// 		manipulation.Set("addEdge", js.FuncOf(func(this js.Value, args []js.Value) any {
	// 			data := args[0]
	// 			callback := args[1]

	// 			label := js.Global().Call("prompt", "Enter edge label:", "")
	// 			if label.IsNull() {
	// 				callback.Call("cancel")
	// 				return nil
	// 			}

	// 			data.Set("label", label)
	// 			callback.Call("addEdge", data)
	// 			return nil
	// 		}))

	// 		manipulation.Set("editEdge", js.FuncOf(func(this js.Value, args []js.Value) any {
	// 			data := args[0]
	// 			callback := args[1]

	// 			label := js.Global().Call("prompt", "Edit edge label:", data.Get("label"))
	// 			if label.IsNull() {
	// 				callback.Call("cancel")
	// 				return nil
	// 			}

	// 			data.Set("label", label)
	// 			callback.Call("editEdge", data)
	// 			return nil
	// 		}))

	// 		manipulation.Set("deleteEdge", js.FuncOf(func(this js.Value, args []js.Value) any {
	// 			data := args[0]
	// 			callback := args[1]

	// 			if js.Global().Call("confirm", "Delete edge?").Bool() {
	// 				callback.Call("deleteEdge", data)
	// 			} else {
	// 				callback.Call("cancel")
	// 			}
	// 			return nil
	// 		}))

	// 		opts.Set("manipulation", manipulation)
	// 	},
	// )

	// if err != nil {
	// 	panic(err)
	// }
}
