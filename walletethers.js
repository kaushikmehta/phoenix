  /* ./ethers-app/node_modules/ethers/dist/ethers.js */

   (function(f) {
     if (typeof exports === "object" && typeof module !== "undefined") {
         module.exports = f()
     } else if (typeof define === "function" && define.amd) {
         define([], f)
     } else {
         var g;
         if (typeof window !== "undefined") {
             g = window
         } else if (typeof global !== "undefined") {
             g = global
         } else if (typeof self !== "undefined") {
             g = self
         } else {
             g = this
         }
         g.ethers = f()
     }
 })(function() {
     var define, module, exports;
     return function() {
         function e(t, n, r) {
             function s(o, u) {
                 if (!n[o]) {
                     if (!t[o]) {
                         var a = typeof require == "function" && require;
                         if (!u && a) return a(o, !0);
                         if (i) return i(o, !0);
                         var f = new Error("Cannot find module '" + o + "'");
                         throw f.code = "MODULE_NOT_FOUND", f
                     }
                     var l = n[o] = {
                         exports: {}
                     };
                     t[o][0].call(l.exports, function(e) {
                         var n = t[o][1][e];
                         return s(n ? n : e)
                     }, l, l.exports, e, t, n, r)
                 }
                 return n[o].exports
             }
             var i = typeof require == "function" && require;
             for (var o = 0; o < r.length; o++) s(r[o]);
             return s
         }
         return e
     }()({
         1: [function(require, module, exports) {
             "use strict";
             var Interface = require("./interface.js");
             var utils = function() {
                 return {
                     defineProperty: require("../utils/properties.js").defineProperty,
                     getAddress: require("../utils/address.js").getAddress,
                     bigNumberify: require("../utils/bignumber.js").bigNumberify,
                     hexlify: require("../utils/convert.js").hexlify
                 }
             }();
             var allowedTransactionKeys = {
                 data: true,
                 from: true,
                 gasLimit: true,
                 gasPrice: true,
                 nonce: true,
                 to: true,
                 value: true
             };

             function copyObject(object) {
                 var result = {};
                 for (var key in object) {
                     result[key] = object[key]
                 }
                 return result
             }

             function Contract(addressOrName, contractInterface, signerOrProvider) {
                 if (!(this instanceof Contract)) {
                     throw new Error("missing new")
                 }
                 if (!(contractInterface instanceof Interface)) {
                     contractInterface = new Interface(contractInterface)
                 }
                 if (!signerOrProvider) {
                     throw new Error("missing signer or provider")
                 }
                 var signer = signerOrProvider;
                 var provider = null;
                 if (signerOrProvider.provider) {
                     provider = signerOrProvider.provider
                 } else {
                     provider = signerOrProvider;
                     signer = null
                 }
                 utils.defineProperty(this, "address", addressOrName);
                 utils.defineProperty(this, "interface", contractInterface);
                 utils.defineProperty(this, "signer", signer);
                 utils.defineProperty(this, "provider", provider);
                 var addressPromise = provider.resolveName(addressOrName);

                 function runMethod(method, estimateOnly) {
                     return function() {
                         var transaction = {};
                         var params = Array.prototype.slice.call(arguments);
                         if (params.length == method.inputs.types.length + 1) {
                             transaction = params.pop();
                             if (typeof transaction !== "object") {
                                 throw new Error("invalid transaction overrides")
                             }
                             transaction = copyObject(transaction);
                             for (var key in transaction) {
                                 if (!allowedTransactionKeys[key]) {
                                     throw new Error("unknown transaction override " + key)
                                 }
                             }
                         }["data", "to"].forEach(function(key) {
                             if (transaction[key] != null) {
                                 throw new Error("cannot override " + key)
                             }
                         });
                         var call = method.apply(contractInterface, params);
                         transaction.to = addressOrName;
                         transaction.data = call.data;
                         switch (call.type) {
                             case "call":
                                 if (estimateOnly) {
                                     return Promise.resolve(new utils.bigNumberify(0))
                                 }["gasLimit", "gasPrice", "value"].forEach(function(key) {
                                     if (transaction[key] != null) {
                                         throw new Error("call cannot override " + key)
                                     }
                                 });
                                 var fromPromise = null;
                                 if (transaction.from == null && signer && signer.getAddress) {
                                     fromPromise = signer.getAddress();
                                     if (!(fromPromise instanceof Promise)) {
                                         fromPromise = Promise.resolve(fromPromise)
                                     }
                                 } else {
                                     fromPromise = Promise.resolve(null)
                                 }
                                 return fromPromise.then(function(address) {
                                     if (address) {
                                         transaction.from = utils.getAddress(address)
                                     }
                                     return provider.call(transaction)
                                 }).then(function(value) {
                                     var result = call.parse(value);
                                     if (method.outputs.types.length === 1) {
                                         result = result[0]
                                     }
                                     return result
                                 });
                             case "transaction":
                                 if (!signer) {
                                     return Promise.reject(new Error("missing signer"))
                                 }
                                 if (transaction.from != null) {
                                     throw new Error("transaction cannot override from")
                                 }
                                 if (estimateOnly) {
                                     if (signer && signer.estimateGas) {
                                         return signer.estimateGas(transaction)
                                     }
                                     return provider.estimateGas(transaction)
                                 }
                                 if (signer.sendTransaction) {
                                     return signer.sendTransaction(transaction)
                                 }
                                 if (!signer.sign) {
                                     return Promise.reject(new Error("custom signer does not support signing"))
                                 }
                                 if (transaction.gasLimit == null) {
                                     transaction.gasLimit = signer.defaultGasLimit || 2e6
                                 }
                                 var noncePromise = null;
                                 if (transaction.nonce) {
                                     noncePromise = Promise.resolve(transaction.nonce)
                                 } else if (signer.getTransactionCount) {
                                     noncePromise = signer.getTransactionCount();
                                     if (!(noncePromise instanceof Promise)) {
                                         noncePromise = Promise.resolve(noncePromise)
                                     }
                                 } else {
                                     var addressPromise = signer.getAddress();
                                     if (!(addressPromise instanceof Promise)) {
                                         addressPromise = Promise.resolve(addressPromise)
                                     }
                                     noncePromise = addressPromise.then(function(address) {
                                         return provider.getTransactionCount(address, "pending")
                                     })
                                 }
                                 var gasPricePromise = null;
                                 if (transaction.gasPrice) {
                                     gasPricePromise = Promise.resolve(transaction.gasPrice)
                                 } else {
                                     gasPricePromise = provider.getGasPrice()
                                 }
                                 return Promise.all([noncePromise, gasPricePromise]).then(function(results) {
                                     transaction.nonce = results[0];
                                     transaction.gasPrice = results[1];
                                     return signer.sign(transaction)
                                 }).then(function(signedTransaction) {
                                     return provider.sendTransaction(signedTransaction)
                                 })
                         }
                     }
                 }
                 var estimate = {};
                 utils.defineProperty(this, "estimate", estimate);
                 var functions = {};
                 utils.defineProperty(this, "functions", functions);
                 var events = {};
                 utils.defineProperty(this, "events", events);
                 Object.keys(contractInterface.functions).forEach(function(methodName) {
                     var method = contractInterface.functions[methodName];
                     var run = runMethod(method, false);
                     if (this[methodName] == null) {
                         utils.defineProperty(this, methodName, run)
                     } else {
                         console.log("WARNING: Multiple definitions for " + method)
                     }
                     if (functions[method] == null) {
                         utils.defineProperty(functions, methodName, run);
                         utils.defineProperty(estimate, methodName, runMethod(method, true))
                     }
                 }, this);
                 Object.keys(contractInterface.events).forEach(function(eventName) {
                     var eventInfo = contractInterface.events[eventName];
                     var eventCallback = null;

                     function handleEvent(log) {
                         addressPromise.then(function(address) {
                             if (address != log.address) {
                                 return
                             }
                             try {
                                 var result = eventInfo.parse(log.topics, log.data);
                                 log.args = result;
                                 log.event = eventName;
                                 log.parse = eventInfo.parse;
                                 log.removeListener = function() {
                                     provider.removeListener(eventInfo.topics, handleEvent)
                                 };
                                 log.getBlock = function() {
                                     return provider.getBlock(log.blockHash)
                                 };
                                 log.getTransaction = function() {
                                     return provider.getTransaction(log.transactionHash)
                                 };
                                 log.getTransactionReceipt = function() {
                                     return provider.getTransactionReceipt(log.transactionHash)
                                 };
                                 log.eventSignature = eventInfo.signature;
                                 eventCallback.apply(log, Array.prototype.slice.call(result))
                             } catch (error) {
                                 console.log(error)
                             }
                         })
                     }
                     var property = {
                         enumerable: true,
                         get: function() {
                             return eventCallback
                         },
                         set: function(value) {
                             if (!value) {
                                 value = null
                             }
                             if (!value && eventCallback) {
                                 provider.removeListener(eventInfo.topics, handleEvent)
                             } else if (value && !eventCallback) {
                                 provider.on(eventInfo.topics, handleEvent)
                             }
                             eventCallback = value
                         }
                     };
                     var propertyName = "on" + eventName.toLowerCase();
                     if (this[propertyName] == null) {
                         Object.defineProperty(this, propertyName, property)
                     }
                     Object.defineProperty(events, eventName, property)
                 }, this)
             }
             utils.defineProperty(Contract.prototype, "connect", function(signerOrProvider) {
                 return new Contract(this.address, this.interface, signerOrProvider)
             });
             utils.defineProperty(Contract, "getDeployTransaction", function(bytecode, contractInterface) {
                 if (!(contractInterface instanceof Interface)) {
                     contractInterface = new Interface(contractInterface)
                 }
                 var args = Array.prototype.slice.call(arguments);
                 args.splice(1, 1);
                 return {
                     data: contractInterface.deployFunction.apply(contractInterface, args).bytecode
                 }
             });
             module.exports = Contract
         }, {
             "../utils/address.js": 56,
             "../utils/bignumber.js": 57,
             "../utils/convert.js": 60,
             "../utils/properties.js": 67,
             "./interface.js": 3
         }],
         2: [function(require, module, exports) {
             "use strict";
             var Contract = require("./contract.js");
             var Interface = require("./interface.js");
             module.exports = {
                 Contract: Contract,
                 Interface: Interface
             }
         }, {
             "./contract.js": 1,
             "./interface.js": 3
         }],
         3: [function(require, module, exports) {
             "use strict";
             var throwError = require("../utils/throw-error");
             var utils = function() {
                 var convert = require("../utils/convert");
                 var properties = require("../utils/properties");
                 var utf8 = require("../utils/utf8");
                 return {
                     defineFrozen: properties.defineFrozen,
                     defineProperty: properties.defineProperty,
                     coder: require("../utils/abi-coder").defaultCoder,
                     arrayify: convert.arrayify,
                     concat: convert.concat,
                     isHexString: convert.isHexString,
                     toUtf8Bytes: utf8.toUtf8Bytes,
                     keccak256: require("../utils/keccak256")
                 }
             }();

             function parseParams(params) {
                 var names = [];
                 var types = [];
                 params.forEach(function(param) {
                     if (param.components != null) {
                         if (param.type.substring(0, 5) !== "tuple") {
                             throw new Error("internal error; report on GitHub")
                         }
                         var suffix = "";
                         var arrayBracket = param.type.indexOf("[");
                         if (arrayBracket >= 0) {
                             suffix = param.type.substring(arrayBracket)
                         }
                         var result = parseParams(param.components);
                         names.push({
                             name: param.name || null,
                             names: result.names
                         });
                         types.push("tuple(" + result.types.join(",") + ")" + suffix)
                     } else {
                         names.push(param.name || null);
                         types.push(param.type)
                     }
                 });
                 return {
                     names: names,
                     types: types
                 }
             }

             function populateDescription(object, items) {
                 for (var key in items) {
                     utils.defineProperty(object, key, items[key])
                 }
                 return object
             }

             function DeployDescription() {}

             function FunctionDescription() {}

             function EventDescription() {}

             function Indexed(value) {
                 utils.defineProperty(this, "indexed", true);
                 utils.defineProperty(this, "hash", value)
             }

             function Result() {}

             function Interface(abi) {
                 if (!(this instanceof Interface)) {
                     throw new Error("missing new")
                 }
                 if (typeof abi === "string") {
                     try {
                         abi = JSON.parse(abi)
                     } catch (error) {
                         throwError("invalid abi", {
                             input: abi
                         })
                     }
                 }
                 utils.defineFrozen(this, "abi", abi);
                 var methods = {},
                     events = {},
                     deploy = null;
                 utils.defineProperty(this, "functions", methods);
                 utils.defineProperty(this, "events", events);

                 function addMethod(method) {
                     switch (method.type) {
                         case "constructor":
                             var func = function() {
                                 var inputParams = parseParams(method.inputs);
                                 var func = function(bytecode) {
                                     if (!utils.isHexString(bytecode)) {
                                         throwError("invalid bytecode", {
                                             input: bytecode
                                         })
                                     }
                                     var params = Array.prototype.slice.call(arguments, 1);
                                     if (params.length < inputParams.types.length) {
                                         throwError("missing parameter")
                                     } else if (params.length > inputParams.types.length) {
                                         throwError("too many parameters")
                                     }
                                     var result = {
                                         bytecode: bytecode + utils.coder.encode(inputParams.names, inputParams.types, params).substring(2),
                                         type: "deploy"
                                     };
                                     return populateDescription(new DeployDescription, result)
                                 };
                                 utils.defineFrozen(func, "inputs", inputParams);
                                 utils.defineProperty(func, "payable", method.payable == null || !!method.payable);
                                 return func
                             }();
                             if (!deploy) {
                                 deploy = func
                             }
                             break;
                         case "function":
                             var func = function() {
                                 var inputParams = parseParams(method.inputs);
                                 var outputParams = parseParams(method.outputs);
                                 var signature = "(" + inputParams.types.join(",") + ")";
                                 signature = signature.replace(/tuple/g, "");
                                 signature = method.name + signature;
                                 var sighash = utils.keccak256(utils.toUtf8Bytes(signature)).substring(0, 10);
                                 var func = function() {
                                     var result = {
                                         name: method.name,
                                         signature: signature,
                                         sighash: sighash,
                                         type: method.constant ? "call" : "transaction"
                                     };
                                     var params = Array.prototype.slice.call(arguments, 0);
                                     if (params.length < inputParams.types.length) {
                                         throwError("missing parameter")
                                     } else if (params.length > inputParams.types.length) {
                                         throwError("too many parameters")
                                     }
                                     result.data = sighash + utils.coder.encode(inputParams.names, inputParams.types, params).substring(2);
                                     result.parse = function(data) {
                                         return utils.coder.decode(outputParams.names, outputParams.types, utils.arrayify(data))
                                     };
                                     return populateDescription(new FunctionDescription, result)
                                 };
                                 utils.defineFrozen(func, "inputs", inputParams);
                                 utils.defineFrozen(func, "outputs", outputParams);
                                 utils.defineProperty(func, "payable", method.payable == null || !!method.payable);
                                 utils.defineProperty(func, "signature", signature);
                                 utils.defineProperty(func, "sighash", sighash);
                                 return func
                             }();
                             if (method.name && methods[method.name] == null) {
                                 utils.defineProperty(methods, method.name, func)
                             }
                             if (methods[func.signature] == null) {
                                 utils.defineProperty(methods, func.signature, func)
                             }
                             break;
                         case "event":
                             var func = function() {
                                 var inputParams = parseParams(method.inputs);
                                 var signature = "(" + inputParams.types.join(",") + ")";
                                 signature = signature.replace(/tuple/g, "");
                                 signature = method.name + signature;
                                 var result = {
                                     anonymous: !!method.anonymous,
                                     name: method.name,
                                     signature: signature,
                                     type: "event"
                                 };
                                 result.parse = function(topics, data) {
                                     if (data == null) {
                                         data = topics;
                                         topics = null
                                     }
                                     if (topics != null && !method.anonymous) {
                                         topics = topics.slice(1)
                                     }
                                     var inputNamesIndexed = [],
                                         inputNamesNonIndexed = [];
                                     var inputTypesIndexed = [],
                                         inputTypesNonIndexed = [];
                                     var inputDynamic = [];
                                     method.inputs.forEach(function(input, index) {
                                         var type = inputParams.types[index];
                                         var name = inputParams.names[index];
                                         if (input.indexed) {
                                             if (type === "string" || type === "bytes" || type.indexOf("[") >= 0 || type.substring(0, 5) === "tuple") {
                                                 inputTypesIndexed.push("bytes32");
                                                 inputDynamic.push(true)
                                             } else {
                                                 inputTypesIndexed.push(type);
                                                 inputDynamic.push(false)
                                             }
                                             inputNamesIndexed.push(name)
                                         } else {
                                             inputNamesNonIndexed.push(name);
                                             inputTypesNonIndexed.push(type);
                                             inputDynamic.push(false)
                                         }
                                     });
                                     if (topics != null) {
                                         var resultIndexed = utils.coder.decode(inputNamesIndexed, inputTypesIndexed, utils.concat(topics))
                                     }
                                     var resultNonIndexed = utils.coder.decode(inputNamesNonIndexed, inputTypesNonIndexed, utils.arrayify(data));
                                     var result = new Result;
                                     var nonIndexedIndex = 0,
                                         indexedIndex = 0;
                                     method.inputs.forEach(function(input, index) {
                                         if (input.indexed) {
                                             if (topics == null) {
                                                 result[index] = new Indexed(null)
                                             } else if (inputDynamic[index]) {
                                                 result[index] = new Indexed(resultIndexed[indexedIndex++])
                                             } else {
                                                 result[index] = resultIndexed[indexedIndex++]
                                             }
                                         } else {
                                             result[index] = resultNonIndexed[nonIndexedIndex++]
                                         }
                                         if (input.name) {
                                             result[input.name] = result[index]
                                         }
                                     });
                                     result.length = method.inputs.length;
                                     return result
                                 };
                                 var func = populateDescription(new EventDescription, result);
                                 utils.defineFrozen(func, "topics", [utils.keccak256(utils.toUtf8Bytes(signature))]);
                                 utils.defineFrozen(func, "inputs", inputParams);
                                 return func
                             }();
                             if (method.name && events[method.name] == null) {
                                 utils.defineProperty(events, method.name, func)
                             }
                             if (methods[func.signature] == null) {
                                 utils.defineProperty(methods, func.signature, func)
                             }
                             break;
                         case "fallback":
                             break;
                         default:
                             console.log("WARNING: unsupported ABI type - " + method.type);
                             break
                     }
                 }
                 this.abi.forEach(addMethod, this);
                 if (!deploy) {
                     addMethod({
                         type: "constructor",
                         inputs: []
                     })
                 }
                 utils.defineProperty(this, "deployFunction", deploy)
             }
             module.exports = Interface
         }, {
             "../utils/abi-coder": 55,
             "../utils/convert": 60,
             "../utils/keccak256": 64,
             "../utils/properties": 67,
             "../utils/throw-error": 71,
             "../utils/utf8": 73
         }],
         4: [function(require, module, exports) {
             "use strict";
             var version = require("./package.json").version;
             var contracts = require("./contracts");
             var providers = require("./providers");
             var utils = require("./utils");
             var wallet = require("./wallet");
             module.exports = {
                 Wallet: wallet.Wallet,
                 HDNode: wallet.HDNode,
                 SigningKey: wallet.SigningKey,
                 Contract: contracts.Contract,
                 Interface: contracts.Interface,
                 networks: providers.networks,
                 providers: providers,
                 utils: utils,
                 version: version
             }
         }, {
             "./contracts": 2,
             "./package.json": 45,
             "./providers": 49,
             "./utils": 63,
             "./wallet": 75
         }],
         5: [function(require, module, exports) {
             "use strict";
             (function(root) {
                 function checkInt(value) {
                     return parseInt(value) === value
                 }

                 function checkInts(arrayish) {
                     if (!checkInt(arrayish.length)) {
                         return false
                     }
                     for (var i = 0; i < arrayish.length; i++) {
                         if (!checkInt(arrayish[i]) || arrayish[i] < 0 || arrayish[i] > 255) {
                             return false
                         }
                     }
                     return true
                 }

                 function coerceArray(arg, copy) {
                     if (arg.buffer && ArrayBuffer.isView(arg) && arg.name === "Uint8Array") {
                         if (copy) {
                             if (arg.slice) {
                                 arg = arg.slice()
                             } else {
                                 arg = Array.prototype.slice.call(arg)
                             }
                         }
                         return arg
                     }
                     if (Array.isArray(arg)) {
                         if (!checkInts(arg)) {
                             throw new Error("Array contains invalid value: " + arg)
                         }
                         return new Uint8Array(arg)
                     }
                     if (checkInt(arg.length) && checkInts(arg)) {
                         return new Uint8Array(arg)
                     }
                     throw new Error("unsupported array-like object")
                 }

                 function createArray(length) {
                     return new Uint8Array(length)
                 }

                 function copyArray(sourceArray, targetArray, targetStart, sourceStart, sourceEnd) {
                     if (sourceStart != null || sourceEnd != null) {
                         if (sourceArray.slice) {
                             sourceArray = sourceArray.slice(sourceStart, sourceEnd)
                         } else {
                             sourceArray = Array.prototype.slice.call(sourceArray, sourceStart, sourceEnd)
                         }
                     }
                     targetArray.set(sourceArray, targetStart)
                 }
                 var convertUtf8 = function() {
                     function toBytes(text) {
                         var result = [],
                             i = 0;
                         text = encodeURI(text);
                         while (i < text.length) {
                             var c = text.charCodeAt(i++);
                             if (c === 37) {
                                 result.push(parseInt(text.substr(i, 2), 16));
                                 i += 2
                             } else {
                                 result.push(c)
                             }
                         }
                         return coerceArray(result)
                     }

                     function fromBytes(bytes) {
                         var result = [],
                             i = 0;
                         while (i < bytes.length) {
                             var c = bytes[i];
                             if (c < 128) {
                                 result.push(String.fromCharCode(c));
                                 i++
                             } else if (c > 191 && c < 224) {
                                 result.push(String.fromCharCode((c & 31) << 6 | bytes[i + 1] & 63));
                                 i += 2
                             } else {
                                 result.push(String.fromCharCode((c & 15) << 12 | (bytes[i + 1] & 63) << 6 | bytes[i + 2] & 63));
                                 i += 3
                             }
                         }
                         return result.join("")
                     }
                     return {
                         toBytes: toBytes,
                         fromBytes: fromBytes
                     }
                 }();
                 var convertHex = function() {
                     function toBytes(text) {
                         var result = [];
                         for (var i = 0; i < text.length; i += 2) {
                             result.push(parseInt(text.substr(i, 2), 16))
                         }
                         return result
                     }
                     var Hex = "0123456789abcdef";

                     function fromBytes(bytes) {
                         var result = [];
                         for (var i = 0; i < bytes.length; i++) {
                             var v = bytes[i];
                             result.push(Hex[(v & 240) >> 4] + Hex[v & 15])
                         }
                         return result.join("")
                     }
                     return {
                         toBytes: toBytes,
                         fromBytes: fromBytes
                     }
                 }();
                 var numberOfRounds = {
                     16: 10,
                     24: 12,
                     32: 14
                 };
                 var rcon = [1, 2, 4, 8, 16, 32, 64, 128, 27, 54, 108, 216, 171, 77, 154, 47, 94, 188, 99, 198, 151, 53, 106, 212, 179, 125, 250, 239, 197, 145];
                 var S = [99, 124, 119, 123, 242, 107, 111, 197, 48, 1, 103, 43, 254, 215, 171, 118, 202, 130, 201, 125, 250, 89, 71, 240, 173, 212, 162, 175, 156, 164, 114, 192, 183, 253, 147, 38, 54, 63, 247, 204, 52, 165, 229, 241, 113, 216, 49, 21, 4, 199, 35, 195, 24, 150, 5, 154, 7, 18, 128, 226, 235, 39, 178, 117, 9, 131, 44, 26, 27, 110, 90, 160, 82, 59, 214, 179, 41, 227, 47, 132, 83, 209, 0, 237, 32, 252, 177, 91, 106, 203, 190, 57, 74, 76, 88, 207, 208, 239, 170, 251, 67, 77, 51, 133, 69, 249, 2, 127, 80, 60, 159, 168, 81, 163, 64, 143, 146, 157, 56, 245, 188, 182, 218, 33, 16, 255, 243, 210, 205, 12, 19, 236, 95, 151, 68, 23, 196, 167, 126, 61, 100, 93, 25, 115, 96, 129, 79, 220, 34, 42, 144, 136, 70, 238, 184, 20, 222, 94, 11, 219, 224, 50, 58, 10, 73, 6, 36, 92, 194, 211, 172, 98, 145, 149, 228, 121, 231, 200, 55, 109, 141, 213, 78, 169, 108, 86, 244, 234, 101, 122, 174, 8, 186, 120, 37, 46, 28, 166, 180, 198, 232, 221, 116, 31, 75, 189, 139, 138, 112, 62, 181, 102, 72, 3, 246, 14, 97, 53, 87, 185, 134, 193, 29, 158, 225, 248, 152, 17, 105, 217, 142, 148, 155, 30, 135, 233, 206, 85, 40, 223, 140, 161, 137, 13, 191, 230, 66, 104, 65, 153, 45, 15, 176, 84, 187, 22];
                 var Si = [82, 9, 106, 213, 48, 54, 165, 56, 191, 64, 163, 158, 129, 243, 215, 251, 124, 227, 57, 130, 155, 47, 255, 135, 52, 142, 67, 68, 196, 222, 233, 203, 84, 123, 148, 50, 166, 194, 35, 61, 238, 76, 149, 11, 66, 250, 195, 78, 8, 46, 161, 102, 40, 217, 36, 178, 118, 91, 162, 73, 109, 139, 209, 37, 114, 248, 246, 100, 134, 104, 152, 22, 212, 164, 92, 204, 93, 101, 182, 146, 108, 112, 72, 80, 253, 237, 185, 218, 94, 21, 70, 87, 167, 141, 157, 132, 144, 216, 171, 0, 140, 188, 211, 10, 247, 228, 88, 5, 184, 179, 69, 6, 208, 44, 30, 143, 202, 63, 15, 2, 193, 175, 189, 3, 1, 19, 138, 107, 58, 145, 17, 65, 79, 103, 220, 234, 151, 242, 207, 206, 240, 180, 230, 115, 150, 172, 116, 34, 231, 173, 53, 133, 226, 249, 55, 232, 28, 117, 223, 110, 71, 241, 26, 113, 29, 41, 197, 137, 111, 183, 98, 14, 170, 24, 190, 27, 252, 86, 62, 75, 198, 210, 121, 32, 154, 219, 192, 254, 120, 205, 90, 244, 31, 221, 168, 51, 136, 7, 199, 49, 177, 18, 16, 89, 39, 128, 236, 95, 96, 81, 127, 169, 25, 181, 74, 13, 45, 229, 122, 159, 147, 201, 156, 239, 160, 224, 59, 77, 174, 42, 245, 176, 200, 235, 187, 60, 131, 83, 153, 97, 23, 43, 4, 126, 186, 119, 214, 38, 225, 105, 20, 99, 85, 33, 12, 125];
                 var T1 = [3328402341, 4168907908, 4000806809, 4135287693, 4294111757, 3597364157, 3731845041, 2445657428, 1613770832, 33620227, 3462883241, 1445669757, 3892248089, 3050821474, 1303096294, 3967186586, 2412431941, 528646813, 2311702848, 4202528135, 4026202645, 2992200171, 2387036105, 4226871307, 1101901292, 3017069671, 1604494077, 1169141738, 597466303, 1403299063, 3832705686, 2613100635, 1974974402, 3791519004, 1033081774, 1277568618, 1815492186, 2118074177, 4126668546, 2211236943, 1748251740, 1369810420, 3521504564, 4193382664, 3799085459, 2883115123, 1647391059, 706024767, 134480908, 2512897874, 1176707941, 2646852446, 806885416, 932615841, 168101135, 798661301, 235341577, 605164086, 461406363, 3756188221, 3454790438, 1311188841, 2142417613, 3933566367, 302582043, 495158174, 1479289972, 874125870, 907746093, 3698224818, 3025820398, 1537253627, 2756858614, 1983593293, 3084310113, 2108928974, 1378429307, 3722699582, 1580150641, 327451799, 2790478837, 3117535592, 0, 3253595436, 1075847264, 3825007647, 2041688520, 3059440621, 3563743934, 2378943302, 1740553945, 1916352843, 2487896798, 2555137236, 2958579944, 2244988746, 3151024235, 3320835882, 1336584933, 3992714006, 2252555205, 2588757463, 1714631509, 293963156, 2319795663, 3925473552, 67240454, 4269768577, 2689618160, 2017213508, 631218106, 1269344483, 2723238387, 1571005438, 2151694528, 93294474, 1066570413, 563977660, 1882732616, 4059428100, 1673313503, 2008463041, 2950355573, 1109467491, 537923632, 3858759450, 4260623118, 3218264685, 2177748300, 403442708, 638784309, 3287084079, 3193921505, 899127202, 2286175436, 773265209, 2479146071, 1437050866, 4236148354, 2050833735, 3362022572, 3126681063, 840505643, 3866325909, 3227541664, 427917720, 2655997905, 2749160575, 1143087718, 1412049534, 999329963, 193497219, 2353415882, 3354324521, 1807268051, 672404540, 2816401017, 3160301282, 369822493, 2916866934, 3688947771, 1681011286, 1949973070, 336202270, 2454276571, 201721354, 1210328172, 3093060836, 2680341085, 3184776046, 1135389935, 3294782118, 965841320, 831886756, 3554993207, 4068047243, 3588745010, 2345191491, 1849112409, 3664604599, 26054028, 2983581028, 2622377682, 1235855840, 3630984372, 2891339514, 4092916743, 3488279077, 3395642799, 4101667470, 1202630377, 268961816, 1874508501, 4034427016, 1243948399, 1546530418, 941366308, 1470539505, 1941222599, 2546386513, 3421038627, 2715671932, 3899946140, 1042226977, 2521517021, 1639824860, 227249030, 260737669, 3765465232, 2084453954, 1907733956, 3429263018, 2420656344, 100860677, 4160157185, 470683154, 3261161891, 1781871967, 2924959737, 1773779408, 394692241, 2579611992, 974986535, 664706745, 3655459128, 3958962195, 731420851, 571543859, 3530123707, 2849626480, 126783113, 865375399, 765172662, 1008606754, 361203602, 3387549984, 2278477385, 2857719295, 1344809080, 2782912378, 59542671, 1503764984, 160008576, 437062935, 1707065306, 3622233649, 2218934982, 3496503480, 2185314755, 697932208, 1512910199, 504303377, 2075177163, 2824099068, 1841019862, 739644986];
                 var T2 = [2781242211, 2230877308, 2582542199, 2381740923, 234877682, 3184946027, 2984144751, 1418839493, 1348481072, 50462977, 2848876391, 2102799147, 434634494, 1656084439, 3863849899, 2599188086, 1167051466, 2636087938, 1082771913, 2281340285, 368048890, 3954334041, 3381544775, 201060592, 3963727277, 1739838676, 4250903202, 3930435503, 3206782108, 4149453988, 2531553906, 1536934080, 3262494647, 484572669, 2923271059, 1783375398, 1517041206, 1098792767, 49674231, 1334037708, 1550332980, 4098991525, 886171109, 150598129, 2481090929, 1940642008, 1398944049, 1059722517, 201851908, 1385547719, 1699095331, 1587397571, 674240536, 2704774806, 252314885, 3039795866, 151914247, 908333586, 2602270848, 1038082786, 651029483, 1766729511, 3447698098, 2682942837, 454166793, 2652734339, 1951935532, 775166490, 758520603, 3000790638, 4004797018, 4217086112, 4137964114, 1299594043, 1639438038, 3464344499, 2068982057, 1054729187, 1901997871, 2534638724, 4121318227, 1757008337, 0, 750906861, 1614815264, 535035132, 3363418545, 3988151131, 3201591914, 1183697867, 3647454910, 1265776953, 3734260298, 3566750796, 3903871064, 1250283471, 1807470800, 717615087, 3847203498, 384695291, 3313910595, 3617213773, 1432761139, 2484176261, 3481945413, 283769337, 100925954, 2180939647, 4037038160, 1148730428, 3123027871, 3813386408, 4087501137, 4267549603, 3229630528, 2315620239, 2906624658, 3156319645, 1215313976, 82966005, 3747855548, 3245848246, 1974459098, 1665278241, 807407632, 451280895, 251524083, 1841287890, 1283575245, 337120268, 891687699, 801369324, 3787349855, 2721421207, 3431482436, 959321879, 1469301956, 4065699751, 2197585534, 1199193405, 2898814052, 3887750493, 724703513, 2514908019, 2696962144, 2551808385, 3516813135, 2141445340, 1715741218, 2119445034, 2872807568, 2198571144, 3398190662, 700968686, 3547052216, 1009259540, 2041044702, 3803995742, 487983883, 1991105499, 1004265696, 1449407026, 1316239930, 504629770, 3683797321, 168560134, 1816667172, 3837287516, 1570751170, 1857934291, 4014189740, 2797888098, 2822345105, 2754712981, 936633572, 2347923833, 852879335, 1133234376, 1500395319, 3084545389, 2348912013, 1689376213, 3533459022, 3762923945, 3034082412, 4205598294, 133428468, 634383082, 2949277029, 2398386810, 3913789102, 403703816, 3580869306, 2297460856, 1867130149, 1918643758, 607656988, 4049053350, 3346248884, 1368901318, 600565992, 2090982877, 2632479860, 557719327, 3717614411, 3697393085, 2249034635, 2232388234, 2430627952, 1115438654, 3295786421, 2865522278, 3633334344, 84280067, 33027830, 303828494, 2747425121, 1600795957, 4188952407, 3496589753, 2434238086, 1486471617, 658119965, 3106381470, 953803233, 334231800, 3005978776, 857870609, 3151128937, 1890179545, 2298973838, 2805175444, 3056442267, 574365214, 2450884487, 550103529, 1233637070, 4289353045, 2018519080, 2057691103, 2399374476, 4166623649, 2148108681, 387583245, 3664101311, 836232934, 3330556482, 3100665960, 3280093505, 2955516313, 2002398509, 287182607, 3413881008, 4238890068, 3597515707, 975967766];
                 var T3 = [1671808611, 2089089148, 2006576759, 2072901243, 4061003762, 1807603307, 1873927791, 3310653893, 810573872, 16974337, 1739181671, 729634347, 4263110654, 3613570519, 2883997099, 1989864566, 3393556426, 2191335298, 3376449993, 2106063485, 4195741690, 1508618841, 1204391495, 4027317232, 2917941677, 3563566036, 2734514082, 2951366063, 2629772188, 2767672228, 1922491506, 3227229120, 3082974647, 4246528509, 2477669779, 644500518, 911895606, 1061256767, 4144166391, 3427763148, 878471220, 2784252325, 3845444069, 4043897329, 1905517169, 3631459288, 827548209, 356461077, 67897348, 3344078279, 593839651, 3277757891, 405286936, 2527147926, 84871685, 2595565466, 118033927, 305538066, 2157648768, 3795705826, 3945188843, 661212711, 2999812018, 1973414517, 152769033, 2208177539, 745822252, 439235610, 455947803, 1857215598, 1525593178, 2700827552, 1391895634, 994932283, 3596728278, 3016654259, 695947817, 3812548067, 795958831, 2224493444, 1408607827, 3513301457, 0, 3979133421, 543178784, 4229948412, 2982705585, 1542305371, 1790891114, 3410398667, 3201918910, 961245753, 1256100938, 1289001036, 1491644504, 3477767631, 3496721360, 4012557807, 2867154858, 4212583931, 1137018435, 1305975373, 861234739, 2241073541, 1171229253, 4178635257, 33948674, 2139225727, 1357946960, 1011120188, 2679776671, 2833468328, 1374921297, 2751356323, 1086357568, 2408187279, 2460827538, 2646352285, 944271416, 4110742005, 3168756668, 3066132406, 3665145818, 560153121, 271589392, 4279952895, 4077846003, 3530407890, 3444343245, 202643468, 322250259, 3962553324, 1608629855, 2543990167, 1154254916, 389623319, 3294073796, 2817676711, 2122513534, 1028094525, 1689045092, 1575467613, 422261273, 1939203699, 1621147744, 2174228865, 1339137615, 3699352540, 577127458, 712922154, 2427141008, 2290289544, 1187679302, 3995715566, 3100863416, 339486740, 3732514782, 1591917662, 186455563, 3681988059, 3762019296, 844522546, 978220090, 169743370, 1239126601, 101321734, 611076132, 1558493276, 3260915650, 3547250131, 2901361580, 1655096418, 2443721105, 2510565781, 3828863972, 2039214713, 3878868455, 3359869896, 928607799, 1840765549, 2374762893, 3580146133, 1322425422, 2850048425, 1823791212, 1459268694, 4094161908, 3928346602, 1706019429, 2056189050, 2934523822, 135794696, 3134549946, 2022240376, 628050469, 779246638, 472135708, 2800834470, 3032970164, 3327236038, 3894660072, 3715932637, 1956440180, 522272287, 1272813131, 3185336765, 2340818315, 2323976074, 1888542832, 1044544574, 3049550261, 1722469478, 1222152264, 50660867, 4127324150, 236067854, 1638122081, 895445557, 1475980887, 3117443513, 2257655686, 3243809217, 489110045, 2662934430, 3778599393, 4162055160, 2561878936, 288563729, 1773916777, 3648039385, 2391345038, 2493985684, 2612407707, 505560094, 2274497927, 3911240169, 3460925390, 1442818645, 678973480, 3749357023, 2358182796, 2717407649, 2306869641, 219617805, 3218761151, 3862026214, 1120306242, 1756942440, 1103331905, 2578459033, 762796589, 252780047, 2966125488, 1425844308, 3151392187, 372911126];
                 var T4 = [1667474886, 2088535288, 2004326894, 2071694838, 4075949567, 1802223062, 1869591006, 3318043793, 808472672, 16843522, 1734846926, 724270422, 4278065639, 3621216949, 2880169549, 1987484396, 3402253711, 2189597983, 3385409673, 2105378810, 4210693615, 1499065266, 1195886990, 4042263547, 2913856577, 3570689971, 2728590687, 2947541573, 2627518243, 2762274643, 1920112356, 3233831835, 3082273397, 4261223649, 2475929149, 640051788, 909531756, 1061110142, 4160160501, 3435941763, 875846760, 2779116625, 3857003729, 4059105529, 1903268834, 3638064043, 825316194, 353713962, 67374088, 3351728789, 589522246, 3284360861, 404236336, 2526454071, 84217610, 2593830191, 117901582, 303183396, 2155911963, 3806477791, 3958056653, 656894286, 2998062463, 1970642922, 151591698, 2206440989, 741110872, 437923380, 454765878, 1852748508, 1515908788, 2694904667, 1381168804, 993742198, 3604373943, 3014905469, 690584402, 3823320797, 791638366, 2223281939, 1398011302, 3520161977, 0, 3991743681, 538992704, 4244381667, 2981218425, 1532751286, 1785380564, 3419096717, 3200178535, 960056178, 1246420628, 1280103576, 1482221744, 3486468741, 3503319995, 4025428677, 2863326543, 4227536621, 1128514950, 1296947098, 859002214, 2240123921, 1162203018, 4193849577, 33687044, 2139062782, 1347481760, 1010582648, 2678045221, 2829640523, 1364325282, 2745433693, 1077985408, 2408548869, 2459086143, 2644360225, 943212656, 4126475505, 3166494563, 3065430391, 3671750063, 555836226, 269496352, 4294908645, 4092792573, 3537006015, 3452783745, 202118168, 320025894, 3974901699, 1600119230, 2543297077, 1145359496, 387397934, 3301201811, 2812801621, 2122220284, 1027426170, 1684319432, 1566435258, 421079858, 1936954854, 1616945344, 2172753945, 1330631070, 3705438115, 572679748, 707427924, 2425400123, 2290647819, 1179044492, 4008585671, 3099120491, 336870440, 3739122087, 1583276732, 185277718, 3688593069, 3772791771, 842159716, 976899700, 168435220, 1229577106, 101059084, 606366792, 1549591736, 3267517855, 3553849021, 2897014595, 1650632388, 2442242105, 2509612081, 3840161747, 2038008818, 3890688725, 3368567691, 926374254, 1835907034, 2374863873, 3587531953, 1313788572, 2846482505, 1819063512, 1448540844, 4109633523, 3941213647, 1701162954, 2054852340, 2930698567, 134748176, 3132806511, 2021165296, 623210314, 774795868, 471606328, 2795958615, 3031746419, 3334885783, 3907527627, 3722280097, 1953799400, 522133822, 1263263126, 3183336545, 2341176845, 2324333839, 1886425312, 1044267644, 3048588401, 1718004428, 1212733584, 50529542, 4143317495, 235803164, 1633788866, 892690282, 1465383342, 3115962473, 2256965911, 3250673817, 488449850, 2661202215, 3789633753, 4177007595, 2560144171, 286339874, 1768537042, 3654906025, 2391705863, 2492770099, 2610673197, 505291324, 2273808917, 3924369609, 3469625735, 1431699370, 673740880, 3755965093, 2358021891, 2711746649, 2307489801, 218961690, 3217021541, 3873845719, 1111672452, 1751693520, 1094828930, 2576986153, 757954394, 252645662, 2964376443, 1414855848, 3149649517, 370555436];
                 var T5 = [1374988112, 2118214995, 437757123, 975658646, 1001089995, 530400753, 2902087851, 1273168787, 540080725, 2910219766, 2295101073, 4110568485, 1340463100, 3307916247, 641025152, 3043140495, 3736164937, 632953703, 1172967064, 1576976609, 3274667266, 2169303058, 2370213795, 1809054150, 59727847, 361929877, 3211623147, 2505202138, 3569255213, 1484005843, 1239443753, 2395588676, 1975683434, 4102977912, 2572697195, 666464733, 3202437046, 4035489047, 3374361702, 2110667444, 1675577880, 3843699074, 2538681184, 1649639237, 2976151520, 3144396420, 4269907996, 4178062228, 1883793496, 2403728665, 2497604743, 1383856311, 2876494627, 1917518562, 3810496343, 1716890410, 3001755655, 800440835, 2261089178, 3543599269, 807962610, 599762354, 33778362, 3977675356, 2328828971, 2809771154, 4077384432, 1315562145, 1708848333, 101039829, 3509871135, 3299278474, 875451293, 2733856160, 92987698, 2767645557, 193195065, 1080094634, 1584504582, 3178106961, 1042385657, 2531067453, 3711829422, 1306967366, 2438237621, 1908694277, 67556463, 1615861247, 429456164, 3602770327, 2302690252, 1742315127, 2968011453, 126454664, 3877198648, 2043211483, 2709260871, 2084704233, 4169408201, 0, 159417987, 841739592, 504459436, 1817866830, 4245618683, 260388950, 1034867998, 908933415, 168810852, 1750902305, 2606453969, 607530554, 202008497, 2472011535, 3035535058, 463180190, 2160117071, 1641816226, 1517767529, 470948374, 3801332234, 3231722213, 1008918595, 303765277, 235474187, 4069246893, 766945465, 337553864, 1475418501, 2943682380, 4003061179, 2743034109, 4144047775, 1551037884, 1147550661, 1543208500, 2336434550, 3408119516, 3069049960, 3102011747, 3610369226, 1113818384, 328671808, 2227573024, 2236228733, 3535486456, 2935566865, 3341394285, 496906059, 3702665459, 226906860, 2009195472, 733156972, 2842737049, 294930682, 1206477858, 2835123396, 2700099354, 1451044056, 573804783, 2269728455, 3644379585, 2362090238, 2564033334, 2801107407, 2776292904, 3669462566, 1068351396, 742039012, 1350078989, 1784663195, 1417561698, 4136440770, 2430122216, 775550814, 2193862645, 2673705150, 1775276924, 1876241833, 3475313331, 3366754619, 270040487, 3902563182, 3678124923, 3441850377, 1851332852, 3969562369, 2203032232, 3868552805, 2868897406, 566021896, 4011190502, 3135740889, 1248802510, 3936291284, 699432150, 832877231, 708780849, 3332740144, 899835584, 1951317047, 4236429990, 3767586992, 866637845, 4043610186, 1106041591, 2144161806, 395441711, 1984812685, 1139781709, 3433712980, 3835036895, 2664543715, 1282050075, 3240894392, 1181045119, 2640243204, 25965917, 4203181171, 4211818798, 3009879386, 2463879762, 3910161971, 1842759443, 2597806476, 933301370, 1509430414, 3943906441, 3467192302, 3076639029, 3776767469, 2051518780, 2631065433, 1441952575, 404016761, 1942435775, 1408749034, 1610459739, 3745345300, 2017778566, 3400528769, 3110650942, 941896748, 3265478751, 371049330, 3168937228, 675039627, 4279080257, 967311729, 135050206, 3635733660, 1683407248, 2076935265, 3576870512, 1215061108, 3501741890];
                 var T6 = [1347548327, 1400783205, 3273267108, 2520393566, 3409685355, 4045380933, 2880240216, 2471224067, 1428173050, 4138563181, 2441661558, 636813900, 4233094615, 3620022987, 2149987652, 2411029155, 1239331162, 1730525723, 2554718734, 3781033664, 46346101, 310463728, 2743944855, 3328955385, 3875770207, 2501218972, 3955191162, 3667219033, 768917123, 3545789473, 692707433, 1150208456, 1786102409, 2029293177, 1805211710, 3710368113, 3065962831, 401639597, 1724457132, 3028143674, 409198410, 2196052529, 1620529459, 1164071807, 3769721975, 2226875310, 486441376, 2499348523, 1483753576, 428819965, 2274680428, 3075636216, 598438867, 3799141122, 1474502543, 711349675, 129166120, 53458370, 2592523643, 2782082824, 4063242375, 2988687269, 3120694122, 1559041666, 730517276, 2460449204, 4042459122, 2706270690, 3446004468, 3573941694, 533804130, 2328143614, 2637442643, 2695033685, 839224033, 1973745387, 957055980, 2856345839, 106852767, 1371368976, 4181598602, 1033297158, 2933734917, 1179510461, 3046200461, 91341917, 1862534868, 4284502037, 605657339, 2547432937, 3431546947, 2003294622, 3182487618, 2282195339, 954669403, 3682191598, 1201765386, 3917234703, 3388507166, 0, 2198438022, 1211247597, 2887651696, 1315723890, 4227665663, 1443857720, 507358933, 657861945, 1678381017, 560487590, 3516619604, 975451694, 2970356327, 261314535, 3535072918, 2652609425, 1333838021, 2724322336, 1767536459, 370938394, 182621114, 3854606378, 1128014560, 487725847, 185469197, 2918353863, 3106780840, 3356761769, 2237133081, 1286567175, 3152976349, 4255350624, 2683765030, 3160175349, 3309594171, 878443390, 1988838185, 3704300486, 1756818940, 1673061617, 3403100636, 272786309, 1075025698, 545572369, 2105887268, 4174560061, 296679730, 1841768865, 1260232239, 4091327024, 3960309330, 3497509347, 1814803222, 2578018489, 4195456072, 575138148, 3299409036, 446754879, 3629546796, 4011996048, 3347532110, 3252238545, 4270639778, 915985419, 3483825537, 681933534, 651868046, 2755636671, 3828103837, 223377554, 2607439820, 1649704518, 3270937875, 3901806776, 1580087799, 4118987695, 3198115200, 2087309459, 2842678573, 3016697106, 1003007129, 2802849917, 1860738147, 2077965243, 164439672, 4100872472, 32283319, 2827177882, 1709610350, 2125135846, 136428751, 3874428392, 3652904859, 3460984630, 3572145929, 3593056380, 2939266226, 824852259, 818324884, 3224740454, 930369212, 2801566410, 2967507152, 355706840, 1257309336, 4148292826, 243256656, 790073846, 2373340630, 1296297904, 1422699085, 3756299780, 3818836405, 457992840, 3099667487, 2135319889, 77422314, 1560382517, 1945798516, 788204353, 1521706781, 1385356242, 870912086, 325965383, 2358957921, 2050466060, 2388260884, 2313884476, 4006521127, 901210569, 3990953189, 1014646705, 1503449823, 1062597235, 2031621326, 3212035895, 3931371469, 1533017514, 350174575, 2256028891, 2177544179, 1052338372, 741876788, 1606591296, 1914052035, 213705253, 2334669897, 1107234197, 1899603969, 3725069491, 2631447780, 2422494913, 1635502980, 1893020342, 1950903388, 1120974935];
                 var T7 = [2807058932, 1699970625, 2764249623, 1586903591, 1808481195, 1173430173, 1487645946, 59984867, 4199882800, 1844882806, 1989249228, 1277555970, 3623636965, 3419915562, 1149249077, 2744104290, 1514790577, 459744698, 244860394, 3235995134, 1963115311, 4027744588, 2544078150, 4190530515, 1608975247, 2627016082, 2062270317, 1507497298, 2200818878, 567498868, 1764313568, 3359936201, 2305455554, 2037970062, 1047239e3, 1910319033, 1337376481, 2904027272, 2892417312, 984907214, 1243112415, 830661914, 861968209, 2135253587, 2011214180, 2927934315, 2686254721, 731183368, 1750626376, 4246310725, 1820824798, 4172763771, 3542330227, 48394827, 2404901663, 2871682645, 671593195, 3254988725, 2073724613, 145085239, 2280796200, 2779915199, 1790575107, 2187128086, 472615631, 3029510009, 4075877127, 3802222185, 4107101658, 3201631749, 1646252340, 4270507174, 1402811438, 1436590835, 3778151818, 3950355702, 3963161475, 4020912224, 2667994737, 273792366, 2331590177, 104699613, 95345982, 3175501286, 2377486676, 1560637892, 3564045318, 369057872, 4213447064, 3919042237, 1137477952, 2658625497, 1119727848, 2340947849, 1530455833, 4007360968, 172466556, 266959938, 516552836, 0, 2256734592, 3980931627, 1890328081, 1917742170, 4294704398, 945164165, 3575528878, 958871085, 3647212047, 2787207260, 1423022939, 775562294, 1739656202, 3876557655, 2530391278, 2443058075, 3310321856, 547512796, 1265195639, 437656594, 3121275539, 719700128, 3762502690, 387781147, 218828297, 3350065803, 2830708150, 2848461854, 428169201, 122466165, 3720081049, 1627235199, 648017665, 4122762354, 1002783846, 2117360635, 695634755, 3336358691, 4234721005, 4049844452, 3704280881, 2232435299, 574624663, 287343814, 612205898, 1039717051, 840019705, 2708326185, 793451934, 821288114, 1391201670, 3822090177, 376187827, 3113855344, 1224348052, 1679968233, 2361698556, 1058709744, 752375421, 2431590963, 1321699145, 3519142200, 2734591178, 188127444, 2177869557, 3727205754, 2384911031, 3215212461, 2648976442, 2450346104, 3432737375, 1180849278, 331544205, 3102249176, 4150144569, 2952102595, 2159976285, 2474404304, 766078933, 313773861, 2570832044, 2108100632, 1668212892, 3145456443, 2013908262, 418672217, 3070356634, 2594734927, 1852171925, 3867060991, 3473416636, 3907448597, 2614737639, 919489135, 164948639, 2094410160, 2997825956, 590424639, 2486224549, 1723872674, 3157750862, 3399941250, 3501252752, 3625268135, 2555048196, 3673637356, 1343127501, 4130281361, 3599595085, 2957853679, 1297403050, 81781910, 3051593425, 2283490410, 532201772, 1367295589, 3926170974, 895287692, 1953757831, 1093597963, 492483431, 3528626907, 1446242576, 1192455638, 1636604631, 209336225, 344873464, 1015671571, 669961897, 3375740769, 3857572124, 2973530695, 3747192018, 1933530610, 3464042516, 935293895, 3454686199, 2858115069, 1863638845, 3683022916, 4085369519, 3292445032, 875313188, 1080017571, 3279033885, 621591778, 1233856572, 2504130317, 24197544, 3017672716, 3835484340, 3247465558, 2220981195, 3060847922, 1551124588, 1463996600];
                 var T8 = [4104605777, 1097159550, 396673818, 660510266, 2875968315, 2638606623, 4200115116, 3808662347, 821712160, 1986918061, 3430322568, 38544885, 3856137295, 718002117, 893681702, 1654886325, 2975484382, 3122358053, 3926825029, 4274053469, 796197571, 1290801793, 1184342925, 3556361835, 2405426947, 2459735317, 1836772287, 1381620373, 3196267988, 1948373848, 3764988233, 3385345166, 3263785589, 2390325492, 1480485785, 3111247143, 3780097726, 2293045232, 548169417, 3459953789, 3746175075, 439452389, 1362321559, 1400849762, 1685577905, 1806599355, 2174754046, 137073913, 1214797936, 1174215055, 3731654548, 2079897426, 1943217067, 1258480242, 529487843, 1437280870, 3945269170, 3049390895, 3313212038, 923313619, 679998e3, 3215307299, 57326082, 377642221, 3474729866, 2041877159, 133361907, 1776460110, 3673476453, 96392454, 878845905, 2801699524, 777231668, 4082475170, 2330014213, 4142626212, 2213296395, 1626319424, 1906247262, 1846563261, 562755902, 3708173718, 1040559837, 3871163981, 1418573201, 3294430577, 114585348, 1343618912, 2566595609, 3186202582, 1078185097, 3651041127, 3896688048, 2307622919, 425408743, 3371096953, 2081048481, 1108339068, 2216610296, 0, 2156299017, 736970802, 292596766, 1517440620, 251657213, 2235061775, 2933202493, 758720310, 265905162, 1554391400, 1532285339, 908999204, 174567692, 1474760595, 4002861748, 2610011675, 3234156416, 3693126241, 2001430874, 303699484, 2478443234, 2687165888, 585122620, 454499602, 151849742, 2345119218, 3064510765, 514443284, 4044981591, 1963412655, 2581445614, 2137062819, 19308535, 1928707164, 1715193156, 4219352155, 1126790795, 600235211, 3992742070, 3841024952, 836553431, 1669664834, 2535604243, 3323011204, 1243905413, 3141400786, 4180808110, 698445255, 2653899549, 2989552604, 2253581325, 3252932727, 3004591147, 1891211689, 2487810577, 3915653703, 4237083816, 4030667424, 2100090966, 865136418, 1229899655, 953270745, 3399679628, 3557504664, 4118925222, 2061379749, 3079546586, 2915017791, 983426092, 2022837584, 1607244650, 2118541908, 2366882550, 3635996816, 972512814, 3283088770, 1568718495, 3499326569, 3576539503, 621982671, 2895723464, 410887952, 2623762152, 1002142683, 645401037, 1494807662, 2595684844, 1335535747, 2507040230, 4293295786, 3167684641, 367585007, 3885750714, 1865862730, 2668221674, 2960971305, 2763173681, 1059270954, 2777952454, 2724642869, 1320957812, 2194319100, 2429595872, 2815956275, 77089521, 3973773121, 3444575871, 2448830231, 1305906550, 4021308739, 2857194700, 2516901860, 3518358430, 1787304780, 740276417, 1699839814, 1592394909, 2352307457, 2272556026, 188821243, 1729977011, 3687994002, 274084841, 3594982253, 3613494426, 2701949495, 4162096729, 322734571, 2837966542, 1640576439, 484830689, 1202797690, 3537852828, 4067639125, 349075736, 3342319475, 4157467219, 4255800159, 1030690015, 1155237496, 2951971274, 1757691577, 607398968, 2738905026, 499347990, 3794078908, 1011452712, 227885567, 2818666809, 213114376, 3034881240, 1455525988, 3414450555, 850817237, 1817998408, 3092726480];
                 var U1 = [0, 235474187, 470948374, 303765277, 941896748, 908933415, 607530554, 708780849, 1883793496, 2118214995, 1817866830, 1649639237, 1215061108, 1181045119, 1417561698, 1517767529, 3767586992, 4003061179, 4236429990, 4069246893, 3635733660, 3602770327, 3299278474, 3400528769, 2430122216, 2664543715, 2362090238, 2193862645, 2835123396, 2801107407, 3035535058, 3135740889, 3678124923, 3576870512, 3341394285, 3374361702, 3810496343, 3977675356, 4279080257, 4043610186, 2876494627, 2776292904, 3076639029, 3110650942, 2472011535, 2640243204, 2403728665, 2169303058, 1001089995, 899835584, 666464733, 699432150, 59727847, 226906860, 530400753, 294930682, 1273168787, 1172967064, 1475418501, 1509430414, 1942435775, 2110667444, 1876241833, 1641816226, 2910219766, 2743034109, 2976151520, 3211623147, 2505202138, 2606453969, 2302690252, 2269728455, 3711829422, 3543599269, 3240894392, 3475313331, 3843699074, 3943906441, 4178062228, 4144047775, 1306967366, 1139781709, 1374988112, 1610459739, 1975683434, 2076935265, 1775276924, 1742315127, 1034867998, 866637845, 566021896, 800440835, 92987698, 193195065, 429456164, 395441711, 1984812685, 2017778566, 1784663195, 1683407248, 1315562145, 1080094634, 1383856311, 1551037884, 101039829, 135050206, 437757123, 337553864, 1042385657, 807962610, 573804783, 742039012, 2531067453, 2564033334, 2328828971, 2227573024, 2935566865, 2700099354, 3001755655, 3168937228, 3868552805, 3902563182, 4203181171, 4102977912, 3736164937, 3501741890, 3265478751, 3433712980, 1106041591, 1340463100, 1576976609, 1408749034, 2043211483, 2009195472, 1708848333, 1809054150, 832877231, 1068351396, 766945465, 599762354, 159417987, 126454664, 361929877, 463180190, 2709260871, 2943682380, 3178106961, 3009879386, 2572697195, 2538681184, 2236228733, 2336434550, 3509871135, 3745345300, 3441850377, 3274667266, 3910161971, 3877198648, 4110568485, 4211818798, 2597806476, 2497604743, 2261089178, 2295101073, 2733856160, 2902087851, 3202437046, 2968011453, 3936291284, 3835036895, 4136440770, 4169408201, 3535486456, 3702665459, 3467192302, 3231722213, 2051518780, 1951317047, 1716890410, 1750902305, 1113818384, 1282050075, 1584504582, 1350078989, 168810852, 67556463, 371049330, 404016761, 841739592, 1008918595, 775550814, 540080725, 3969562369, 3801332234, 4035489047, 4269907996, 3569255213, 3669462566, 3366754619, 3332740144, 2631065433, 2463879762, 2160117071, 2395588676, 2767645557, 2868897406, 3102011747, 3069049960, 202008497, 33778362, 270040487, 504459436, 875451293, 975658646, 675039627, 641025152, 2084704233, 1917518562, 1615861247, 1851332852, 1147550661, 1248802510, 1484005843, 1451044056, 933301370, 967311729, 733156972, 632953703, 260388950, 25965917, 328671808, 496906059, 1206477858, 1239443753, 1543208500, 1441952575, 2144161806, 1908694277, 1675577880, 1842759443, 3610369226, 3644379585, 3408119516, 3307916247, 4011190502, 3776767469, 4077384432, 4245618683, 2809771154, 2842737049, 3144396420, 3043140495, 2673705150, 2438237621, 2203032232, 2370213795];
                 var U2 = [0, 185469197, 370938394, 487725847, 741876788, 657861945, 975451694, 824852259, 1483753576, 1400783205, 1315723890, 1164071807, 1950903388, 2135319889, 1649704518, 1767536459, 2967507152, 3152976349, 2801566410, 2918353863, 2631447780, 2547432937, 2328143614, 2177544179, 3901806776, 3818836405, 4270639778, 4118987695, 3299409036, 3483825537, 3535072918, 3652904859, 2077965243, 1893020342, 1841768865, 1724457132, 1474502543, 1559041666, 1107234197, 1257309336, 598438867, 681933534, 901210569, 1052338372, 261314535, 77422314, 428819965, 310463728, 3409685355, 3224740454, 3710368113, 3593056380, 3875770207, 3960309330, 4045380933, 4195456072, 2471224067, 2554718734, 2237133081, 2388260884, 3212035895, 3028143674, 2842678573, 2724322336, 4138563181, 4255350624, 3769721975, 3955191162, 3667219033, 3516619604, 3431546947, 3347532110, 2933734917, 2782082824, 3099667487, 3016697106, 2196052529, 2313884476, 2499348523, 2683765030, 1179510461, 1296297904, 1347548327, 1533017514, 1786102409, 1635502980, 2087309459, 2003294622, 507358933, 355706840, 136428751, 53458370, 839224033, 957055980, 605657339, 790073846, 2373340630, 2256028891, 2607439820, 2422494913, 2706270690, 2856345839, 3075636216, 3160175349, 3573941694, 3725069491, 3273267108, 3356761769, 4181598602, 4063242375, 4011996048, 3828103837, 1033297158, 915985419, 730517276, 545572369, 296679730, 446754879, 129166120, 213705253, 1709610350, 1860738147, 1945798516, 2029293177, 1239331162, 1120974935, 1606591296, 1422699085, 4148292826, 4233094615, 3781033664, 3931371469, 3682191598, 3497509347, 3446004468, 3328955385, 2939266226, 2755636671, 3106780840, 2988687269, 2198438022, 2282195339, 2501218972, 2652609425, 1201765386, 1286567175, 1371368976, 1521706781, 1805211710, 1620529459, 2105887268, 1988838185, 533804130, 350174575, 164439672, 46346101, 870912086, 954669403, 636813900, 788204353, 2358957921, 2274680428, 2592523643, 2441661558, 2695033685, 2880240216, 3065962831, 3182487618, 3572145929, 3756299780, 3270937875, 3388507166, 4174560061, 4091327024, 4006521127, 3854606378, 1014646705, 930369212, 711349675, 560487590, 272786309, 457992840, 106852767, 223377554, 1678381017, 1862534868, 1914052035, 2031621326, 1211247597, 1128014560, 1580087799, 1428173050, 32283319, 182621114, 401639597, 486441376, 768917123, 651868046, 1003007129, 818324884, 1503449823, 1385356242, 1333838021, 1150208456, 1973745387, 2125135846, 1673061617, 1756818940, 2970356327, 3120694122, 2802849917, 2887651696, 2637442643, 2520393566, 2334669897, 2149987652, 3917234703, 3799141122, 4284502037, 4100872472, 3309594171, 3460984630, 3545789473, 3629546796, 2050466060, 1899603969, 1814803222, 1730525723, 1443857720, 1560382517, 1075025698, 1260232239, 575138148, 692707433, 878443390, 1062597235, 243256656, 91341917, 409198410, 325965383, 3403100636, 3252238545, 3704300486, 3620022987, 3874428392, 3990953189, 4042459122, 4227665663, 2460449204, 2578018489, 2226875310, 2411029155, 3198115200, 3046200461, 2827177882, 2743944855];
                 var U3 = [0, 218828297, 437656594, 387781147, 875313188, 958871085, 775562294, 590424639, 1750626376, 1699970625, 1917742170, 2135253587, 1551124588, 1367295589, 1180849278, 1265195639, 3501252752, 3720081049, 3399941250, 3350065803, 3835484340, 3919042237, 4270507174, 4085369519, 3102249176, 3051593425, 2734591178, 2952102595, 2361698556, 2177869557, 2530391278, 2614737639, 3145456443, 3060847922, 2708326185, 2892417312, 2404901663, 2187128086, 2504130317, 2555048196, 3542330227, 3727205754, 3375740769, 3292445032, 3876557655, 3926170974, 4246310725, 4027744588, 1808481195, 1723872674, 1910319033, 2094410160, 1608975247, 1391201670, 1173430173, 1224348052, 59984867, 244860394, 428169201, 344873464, 935293895, 984907214, 766078933, 547512796, 1844882806, 1627235199, 2011214180, 2062270317, 1507497298, 1423022939, 1137477952, 1321699145, 95345982, 145085239, 532201772, 313773861, 830661914, 1015671571, 731183368, 648017665, 3175501286, 2957853679, 2807058932, 2858115069, 2305455554, 2220981195, 2474404304, 2658625497, 3575528878, 3625268135, 3473416636, 3254988725, 3778151818, 3963161475, 4213447064, 4130281361, 3599595085, 3683022916, 3432737375, 3247465558, 3802222185, 4020912224, 4172763771, 4122762354, 3201631749, 3017672716, 2764249623, 2848461854, 2331590177, 2280796200, 2431590963, 2648976442, 104699613, 188127444, 472615631, 287343814, 840019705, 1058709744, 671593195, 621591778, 1852171925, 1668212892, 1953757831, 2037970062, 1514790577, 1463996600, 1080017571, 1297403050, 3673637356, 3623636965, 3235995134, 3454686199, 4007360968, 3822090177, 4107101658, 4190530515, 2997825956, 3215212461, 2830708150, 2779915199, 2256734592, 2340947849, 2627016082, 2443058075, 172466556, 122466165, 273792366, 492483431, 1047239e3, 861968209, 612205898, 695634755, 1646252340, 1863638845, 2013908262, 1963115311, 1446242576, 1530455833, 1277555970, 1093597963, 1636604631, 1820824798, 2073724613, 1989249228, 1436590835, 1487645946, 1337376481, 1119727848, 164948639, 81781910, 331544205, 516552836, 1039717051, 821288114, 669961897, 719700128, 2973530695, 3157750862, 2871682645, 2787207260, 2232435299, 2283490410, 2667994737, 2450346104, 3647212047, 3564045318, 3279033885, 3464042516, 3980931627, 3762502690, 4150144569, 4199882800, 3070356634, 3121275539, 2904027272, 2686254721, 2200818878, 2384911031, 2570832044, 2486224549, 3747192018, 3528626907, 3310321856, 3359936201, 3950355702, 3867060991, 4049844452, 4234721005, 1739656202, 1790575107, 2108100632, 1890328081, 1402811438, 1586903591, 1233856572, 1149249077, 266959938, 48394827, 369057872, 418672217, 1002783846, 919489135, 567498868, 752375421, 209336225, 24197544, 376187827, 459744698, 945164165, 895287692, 574624663, 793451934, 1679968233, 1764313568, 2117360635, 1933530610, 1343127501, 1560637892, 1243112415, 1192455638, 3704280881, 3519142200, 3336358691, 3419915562, 3907448597, 3857572124, 4075877127, 4294704398, 3029510009, 3113855344, 2927934315, 2744104290, 2159976285, 2377486676, 2594734927, 2544078150];
                 var U4 = [0, 151849742, 303699484, 454499602, 607398968, 758720310, 908999204, 1059270954, 1214797936, 1097159550, 1517440620, 1400849762, 1817998408, 1699839814, 2118541908, 2001430874, 2429595872, 2581445614, 2194319100, 2345119218, 3034881240, 3186202582, 2801699524, 2951971274, 3635996816, 3518358430, 3399679628, 3283088770, 4237083816, 4118925222, 4002861748, 3885750714, 1002142683, 850817237, 698445255, 548169417, 529487843, 377642221, 227885567, 77089521, 1943217067, 2061379749, 1640576439, 1757691577, 1474760595, 1592394909, 1174215055, 1290801793, 2875968315, 2724642869, 3111247143, 2960971305, 2405426947, 2253581325, 2638606623, 2487810577, 3808662347, 3926825029, 4044981591, 4162096729, 3342319475, 3459953789, 3576539503, 3693126241, 1986918061, 2137062819, 1685577905, 1836772287, 1381620373, 1532285339, 1078185097, 1229899655, 1040559837, 923313619, 740276417, 621982671, 439452389, 322734571, 137073913, 19308535, 3871163981, 4021308739, 4104605777, 4255800159, 3263785589, 3414450555, 3499326569, 3651041127, 2933202493, 2815956275, 3167684641, 3049390895, 2330014213, 2213296395, 2566595609, 2448830231, 1305906550, 1155237496, 1607244650, 1455525988, 1776460110, 1626319424, 2079897426, 1928707164, 96392454, 213114376, 396673818, 514443284, 562755902, 679998e3, 865136418, 983426092, 3708173718, 3557504664, 3474729866, 3323011204, 4180808110, 4030667424, 3945269170, 3794078908, 2507040230, 2623762152, 2272556026, 2390325492, 2975484382, 3092726480, 2738905026, 2857194700, 3973773121, 3856137295, 4274053469, 4157467219, 3371096953, 3252932727, 3673476453, 3556361835, 2763173681, 2915017791, 3064510765, 3215307299, 2156299017, 2307622919, 2459735317, 2610011675, 2081048481, 1963412655, 1846563261, 1729977011, 1480485785, 1362321559, 1243905413, 1126790795, 878845905, 1030690015, 645401037, 796197571, 274084841, 425408743, 38544885, 188821243, 3613494426, 3731654548, 3313212038, 3430322568, 4082475170, 4200115116, 3780097726, 3896688048, 2668221674, 2516901860, 2366882550, 2216610296, 3141400786, 2989552604, 2837966542, 2687165888, 1202797690, 1320957812, 1437280870, 1554391400, 1669664834, 1787304780, 1906247262, 2022837584, 265905162, 114585348, 499347990, 349075736, 736970802, 585122620, 972512814, 821712160, 2595684844, 2478443234, 2293045232, 2174754046, 3196267988, 3079546586, 2895723464, 2777952454, 3537852828, 3687994002, 3234156416, 3385345166, 4142626212, 4293295786, 3841024952, 3992742070, 174567692, 57326082, 410887952, 292596766, 777231668, 660510266, 1011452712, 893681702, 1108339068, 1258480242, 1343618912, 1494807662, 1715193156, 1865862730, 1948373848, 2100090966, 2701949495, 2818666809, 3004591147, 3122358053, 2235061775, 2352307457, 2535604243, 2653899549, 3915653703, 3764988233, 4219352155, 4067639125, 3444575871, 3294430577, 3746175075, 3594982253, 836553431, 953270745, 600235211, 718002117, 367585007, 484830689, 133361907, 251657213, 2041877159, 1891211689, 1806599355, 1654886325, 1568718495, 1418573201, 1335535747, 1184342925];

                 function convertToInt32(bytes) {
                     var result = [];
                     for (var i = 0; i < bytes.length; i += 4) {
                         result.push(bytes[i] << 24 | bytes[i + 1] << 16 | bytes[i + 2] << 8 | bytes[i + 3])
                     }
                     return result
                 }
                 var AES = function(key) {
                     if (!(this instanceof AES)) {
                         throw Error("AES must be instanitated with `new`")
                     }
                     Object.defineProperty(this, "key", {
                         value: coerceArray(key, true)
                     });
                     this._prepare()
                 };
                 AES.prototype._prepare = function() {
                     var rounds = numberOfRounds[this.key.length];
                     if (rounds == null) {
                         throw new Error("invalid key size (must be 16, 24 or 32 bytes)")
                     }
                     this._Ke = [];
                     this._Kd = [];
                     for (var i = 0; i <= rounds; i++) {
                         this._Ke.push([0, 0, 0, 0]);
                         this._Kd.push([0, 0, 0, 0])
                     }
                     var roundKeyCount = (rounds + 1) * 4;
                     var KC = this.key.length / 4;
                     var tk = convertToInt32(this.key);
                     var index;
                     for (var i = 0; i < KC; i++) {
                         index = i >> 2;
                         this._Ke[index][i % 4] = tk[i];
                         this._Kd[rounds - index][i % 4] = tk[i]
                     }
                     var rconpointer = 0;
                     var t = KC,
                         tt;
                     while (t < roundKeyCount) {
                         tt = tk[KC - 1];
                         tk[0] ^= S[tt >> 16 & 255] << 24 ^ S[tt >> 8 & 255] << 16 ^ S[tt & 255] << 8 ^ S[tt >> 24 & 255] ^ rcon[rconpointer] << 24;
                         rconpointer += 1;
                         if (KC != 8) {
                             for (var i = 1; i < KC; i++) {
                                 tk[i] ^= tk[i - 1]
                             }
                         } else {
                             for (var i = 1; i < KC / 2; i++) {
                                 tk[i] ^= tk[i - 1]
                             }
                             tt = tk[KC / 2 - 1];
                             tk[KC / 2] ^= S[tt & 255] ^ S[tt >> 8 & 255] << 8 ^ S[tt >> 16 & 255] << 16 ^ S[tt >> 24 & 255] << 24;
                             for (var i = KC / 2 + 1; i < KC; i++) {
                                 tk[i] ^= tk[i - 1]
                             }
                         }
                         var i = 0,
                             r, c;
                         while (i < KC && t < roundKeyCount) {
                             r = t >> 2;
                             c = t % 4;
                             this._Ke[r][c] = tk[i];
                             this._Kd[rounds - r][c] = tk[i++];
                             t++
                         }
                     }
                     for (var r = 1; r < rounds; r++) {
                         for (var c = 0; c < 4; c++) {
                             tt = this._Kd[r][c];
                             this._Kd[r][c] = U1[tt >> 24 & 255] ^ U2[tt >> 16 & 255] ^ U3[tt >> 8 & 255] ^ U4[tt & 255]
                         }
                     }
                 };
                 AES.prototype.encrypt = function(plaintext) {
                     if (plaintext.length != 16) {
                         throw new Error("invalid plaintext size (must be 16 bytes)")
                     }
                     var rounds = this._Ke.length - 1;
                     var a = [0, 0, 0, 0];
                     var t = convertToInt32(plaintext);
                     for (var i = 0; i < 4; i++) {
                         t[i] ^= this._Ke[0][i]
                     }
                     for (var r = 1; r < rounds; r++) {
                         for (var i = 0; i < 4; i++) {
                             a[i] = T1[t[i] >> 24 & 255] ^ T2[t[(i + 1) % 4] >> 16 & 255] ^ T3[t[(i + 2) % 4] >> 8 & 255] ^ T4[t[(i + 3) % 4] & 255] ^ this._Ke[r][i]
                         }
                         t = a.slice()
                     }
                     var result = createArray(16),
                         tt;
                     for (var i = 0; i < 4; i++) {
                         tt = this._Ke[rounds][i];
                         result[4 * i] = (S[t[i] >> 24 & 255] ^ tt >> 24) & 255;
                         result[4 * i + 1] = (S[t[(i + 1) % 4] >> 16 & 255] ^ tt >> 16) & 255;
                         result[4 * i + 2] = (S[t[(i + 2) % 4] >> 8 & 255] ^ tt >> 8) & 255;
                         result[4 * i + 3] = (S[t[(i + 3) % 4] & 255] ^ tt) & 255
                     }
                     return result
                 };
                 AES.prototype.decrypt = function(ciphertext) {
                     if (ciphertext.length != 16) {
                         throw new Error("invalid ciphertext size (must be 16 bytes)")
                     }
                     var rounds = this._Kd.length - 1;
                     var a = [0, 0, 0, 0];
                     var t = convertToInt32(ciphertext);
                     for (var i = 0; i < 4; i++) {
                         t[i] ^= this._Kd[0][i]
                     }
                     for (var r = 1; r < rounds; r++) {
                         for (var i = 0; i < 4; i++) {
                             a[i] = T5[t[i] >> 24 & 255] ^ T6[t[(i + 3) % 4] >> 16 & 255] ^ T7[t[(i + 2) % 4] >> 8 & 255] ^ T8[t[(i + 1) % 4] & 255] ^ this._Kd[r][i]
                         }
                         t = a.slice()
                     }
                     var result = createArray(16),
                         tt;
                     for (var i = 0; i < 4; i++) {
                         tt = this._Kd[rounds][i];
                         result[4 * i] = (Si[t[i] >> 24 & 255] ^ tt >> 24) & 255;
                         result[4 * i + 1] = (Si[t[(i + 3) % 4] >> 16 & 255] ^ tt >> 16) & 255;
                         result[4 * i + 2] = (Si[t[(i + 2) % 4] >> 8 & 255] ^ tt >> 8) & 255;
                         result[4 * i + 3] = (Si[t[(i + 1) % 4] & 255] ^ tt) & 255
                     }
                     return result
                 };
                 var ModeOfOperationECB = function(key) {
                     if (!(this instanceof ModeOfOperationECB)) {
                         throw Error("AES must be instanitated with `new`")
                     }
                     this.description = "Electronic Code Block";
                     this.name = "ecb";
                     this._aes = new AES(key)
                 };
                 ModeOfOperationECB.prototype.encrypt = function(plaintext) {
                     plaintext = coerceArray(plaintext);
                     if (plaintext.length % 16 !== 0) {
                         throw new Error("invalid plaintext size (must be multiple of 16 bytes)")
                     }
                     var ciphertext = createArray(plaintext.length);
                     var block = createArray(16);
                     for (var i = 0; i < plaintext.length; i += 16) {
                         copyArray(plaintext, block, 0, i, i + 16);
                         block = this._aes.encrypt(block);
                         copyArray(block, ciphertext, i)
                     }
                     return ciphertext
                 };
                 ModeOfOperationECB.prototype.decrypt = function(ciphertext) {
                     ciphertext = coerceArray(ciphertext);
                     if (ciphertext.length % 16 !== 0) {
                         throw new Error("invalid ciphertext size (must be multiple of 16 bytes)")
                     }
                     var plaintext = createArray(ciphertext.length);
                     var block = createArray(16);
                     for (var i = 0; i < ciphertext.length; i += 16) {
                         copyArray(ciphertext, block, 0, i, i + 16);
                         block = this._aes.decrypt(block);
                         copyArray(block, plaintext, i)
                     }
                     return plaintext
                 };
                 var ModeOfOperationCBC = function(key, iv) {
                     if (!(this instanceof ModeOfOperationCBC)) {
                         throw Error("AES must be instanitated with `new`")
                     }
                     this.description = "Cipher Block Chaining";
                     this.name = "cbc";
                     if (!iv) {
                         iv = createArray(16)
                     } else if (iv.length != 16) {
                         throw new Error("invalid initialation vector size (must be 16 bytes)")
                     }
                     this._lastCipherblock = coerceArray(iv, true);
                     this._aes = new AES(key)
                 };
                 ModeOfOperationCBC.prototype.encrypt = function(plaintext) {
                     plaintext = coerceArray(plaintext);
                     if (plaintext.length % 16 !== 0) {
                         throw new Error("invalid plaintext size (must be multiple of 16 bytes)")
                     }
                     var ciphertext = createArray(plaintext.length);
                     var block = createArray(16);
                     for (var i = 0; i < plaintext.length; i += 16) {
                         copyArray(plaintext, block, 0, i, i + 16);
                         for (var j = 0; j < 16; j++) {
                             block[j] ^= this._lastCipherblock[j]
                         }
                         this._lastCipherblock = this._aes.encrypt(block);
                         copyArray(this._lastCipherblock, ciphertext, i)
                     }
                     return ciphertext
                 };
                 ModeOfOperationCBC.prototype.decrypt = function(ciphertext) {
                     ciphertext = coerceArray(ciphertext);
                     if (ciphertext.length % 16 !== 0) {
                         throw new Error("invalid ciphertext size (must be multiple of 16 bytes)")
                     }
                     var plaintext = createArray(ciphertext.length);
                     var block = createArray(16);
                     for (var i = 0; i < ciphertext.length; i += 16) {
                         copyArray(ciphertext, block, 0, i, i + 16);
                         block = this._aes.decrypt(block);
                         for (var j = 0; j < 16; j++) {
                             plaintext[i + j] = block[j] ^ this._lastCipherblock[j]
                         }
                         copyArray(ciphertext, this._lastCipherblock, 0, i, i + 16)
                     }
                     return plaintext
                 };
                 var ModeOfOperationCFB = function(key, iv, segmentSize) {
                     if (!(this instanceof ModeOfOperationCFB)) {
                         throw Error("AES must be instanitated with `new`")
                     }
                     this.description = "Cipher Feedback";
                     this.name = "cfb";
                     if (!iv) {
                         iv = createArray(16)
                     } else if (iv.length != 16) {
                         throw new Error("invalid initialation vector size (must be 16 size)")
                     }
                     if (!segmentSize) {
                         segmentSize = 1
                     }
                     this.segmentSize = segmentSize;
                     this._shiftRegister = coerceArray(iv, true);
                     this._aes = new AES(key)
                 };
                 ModeOfOperationCFB.prototype.encrypt = function(plaintext) {
                     if (plaintext.length % this.segmentSize != 0) {
                         throw new Error("invalid plaintext size (must be segmentSize bytes)")
                     }
                     var encrypted = coerceArray(plaintext, true);
                     var xorSegment;
                     for (var i = 0; i < encrypted.length; i += this.segmentSize) {
                         xorSegment = this._aes.encrypt(this._shiftRegister);
                         for (var j = 0; j < this.segmentSize; j++) {
                             encrypted[i + j] ^= xorSegment[j]
                         }
                         copyArray(this._shiftRegister, this._shiftRegister, 0, this.segmentSize);
                         copyArray(encrypted, this._shiftRegister, 16 - this.segmentSize, i, i + this.segmentSize)
                     }
                     return encrypted
                 };
                 ModeOfOperationCFB.prototype.decrypt = function(ciphertext) {
                     if (ciphertext.length % this.segmentSize != 0) {
                         throw new Error("invalid ciphertext size (must be segmentSize bytes)")
                     }
                     var plaintext = coerceArray(ciphertext, true);
                     var xorSegment;
                     for (var i = 0; i < plaintext.length; i += this.segmentSize) {
                         xorSegment = this._aes.encrypt(this._shiftRegister);
                         for (var j = 0; j < this.segmentSize; j++) {
                             plaintext[i + j] ^= xorSegment[j]
                         }
                         copyArray(this._shiftRegister, this._shiftRegister, 0, this.segmentSize);
                         copyArray(ciphertext, this._shiftRegister, 16 - this.segmentSize, i, i + this.segmentSize)
                     }
                     return plaintext
                 };
                 var ModeOfOperationOFB = function(key, iv) {
                     if (!(this instanceof ModeOfOperationOFB)) {
                         throw Error("AES must be instanitated with `new`")
                     }
                     this.description = "Output Feedback";
                     this.name = "ofb";
                     if (!iv) {
                         iv = createArray(16)
                     } else if (iv.length != 16) {
                         throw new Error("invalid initialation vector size (must be 16 bytes)")
                     }
                     this._lastPrecipher = coerceArray(iv, true);
                     this._lastPrecipherIndex = 16;
                     this._aes = new AES(key)
                 };
                 ModeOfOperationOFB.prototype.encrypt = function(plaintext) {
                     var encrypted = coerceArray(plaintext, true);
                     for (var i = 0; i < encrypted.length; i++) {
                         if (this._lastPrecipherIndex === 16) {
                             this._lastPrecipher = this._aes.encrypt(this._lastPrecipher);
                             this._lastPrecipherIndex = 0
                         }
                         encrypted[i] ^= this._lastPrecipher[this._lastPrecipherIndex++]
                     }
                     return encrypted
                 };
                 ModeOfOperationOFB.prototype.decrypt = ModeOfOperationOFB.prototype.encrypt;
                 var Counter = function(initialValue) {
                     if (!(this instanceof Counter)) {
                         throw Error("Counter must be instanitated with `new`")
                     }
                     if (initialValue !== 0 && !initialValue) {
                         initialValue = 1
                     }
                     if (typeof initialValue === "number") {
                         this._counter = createArray(16);
                         this.setValue(initialValue)
                     } else {
                         this.setBytes(initialValue)
                     }
                 };
                 Counter.prototype.setValue = function(value) {
                     if (typeof value !== "number" || parseInt(value) != value) {
                         throw new Error("invalid counter value (must be an integer)")
                     }
                     for (var index = 15; index >= 0; --index) {
                         this._counter[index] = value % 256;
                         value = value >> 8
                     }
                 };
                 Counter.prototype.setBytes = function(bytes) {
                     bytes = coerceArray(bytes, true);
                     if (bytes.length != 16) {
                         throw new Error("invalid counter bytes size (must be 16 bytes)")
                     }
                     this._counter = bytes
                 };
                 Counter.prototype.increment = function() {
                     for (var i = 15; i >= 0; i--) {
                         if (this._counter[i] === 255) {
                             this._counter[i] = 0
                         } else {
                             this._counter[i]++;
                             break
                         }
                     }
                 };
                 var ModeOfOperationCTR = function(key, counter) {
                     if (!(this instanceof ModeOfOperationCTR)) {
                         throw Error("AES must be instanitated with `new`")
                     }
                     this.description = "Counter";
                     this.name = "ctr";
                     if (!(counter instanceof Counter)) {
                         counter = new Counter(counter)
                     }
                     this._counter = counter;
                     this._remainingCounter = null;
                     this._remainingCounterIndex = 16;
                     this._aes = new AES(key)
                 };
                 ModeOfOperationCTR.prototype.encrypt = function(plaintext) {
                     var encrypted = coerceArray(plaintext, true);
                     for (var i = 0; i < encrypted.length; i++) {
                         if (this._remainingCounterIndex === 16) {
                             this._remainingCounter = this._aes.encrypt(this._counter._counter);
                             this._remainingCounterIndex = 0;
                             this._counter.increment()
                         }
                         encrypted[i] ^= this._remainingCounter[this._remainingCounterIndex++]
                     }
                     return encrypted
                 };
                 ModeOfOperationCTR.prototype.decrypt = ModeOfOperationCTR.prototype.encrypt;

                 function pkcs7pad(data) {
                     data = coerceArray(data, true);
                     var padder = 16 - data.length % 16;
                     var result = createArray(data.length + padder);
                     copyArray(data, result);
                     for (var i = data.length; i < result.length; i++) {
                         result[i] = padder
                     }
                     return result
                 }

                 function pkcs7strip(data) {
                     data = coerceArray(data, true);
                     if (data.length < 16) {
                         throw new Error("PKCS#7 invalid length")
                     }
                     var padder = data[data.length - 1];
                     if (padder > 16) {
                         throw new Error("PKCS#7 padding byte out of range")
                     }
                     var length = data.length - padder;
                     for (var i = 0; i < padder; i++) {
                         if (data[length + i] !== padder) {
                             throw new Error("PKCS#7 invalid padding byte")
                         }
                     }
                     var result = createArray(length);
                     copyArray(data, result, 0, 0, length);
                     return result
                 }
                 var aesjs = {
                     AES: AES,
                     Counter: Counter,
                     ModeOfOperation: {
                         ecb: ModeOfOperationECB,
                         cbc: ModeOfOperationCBC,
                         cfb: ModeOfOperationCFB,
                         ofb: ModeOfOperationOFB,
                         ctr: ModeOfOperationCTR
                     },
                     utils: {
                         hex: convertHex,
                         utf8: convertUtf8
                     },
                     padding: {
                         pkcs7: {
                             pad: pkcs7pad,
                             strip: pkcs7strip
                         }
                     },
                     _arrayTest: {
                         coerceArray: coerceArray,
                         createArray: createArray,
                         copyArray: copyArray
                     }
                 };
                 if (typeof exports !== "undefined") {
                     module.exports = aesjs
                 } else if (typeof define === "function" && define.amd) {
                     define(aesjs)
                 } else {
                     if (root.aesjs) {
                         aesjs._aesjs = root.aesjs
                     }
                     root.aesjs = aesjs
                 }
             })(this)
         }, {}],
         6: [function(require, module, exports) {
             (function(module, exports) {
                 "use strict";

                 function assert(val, msg) {
                     if (!val) throw new Error(msg || "Assertion failed")
                 }

                 function inherits(ctor, superCtor) {
                     ctor.super_ = superCtor;
                     var TempCtor = function() {};
                     TempCtor.prototype = superCtor.prototype;
                     ctor.prototype = new TempCtor;
                     ctor.prototype.constructor = ctor
                 }

                 function BN(number, base, endian) {
                     if (BN.isBN(number)) {
                         return number
                     }
                     this.negative = 0;
                     this.words = null;
                     this.length = 0;
                     this.red = null;
                     if (number !== null) {
                         if (base === "le" || base === "be") {
                             endian = base;
                             base = 10
                         }
                         this._init(number || 0, base || 10, endian || "be")
                     }
                 }
                 if (typeof module === "object") {
                     module.exports = BN
                 } else {
                     exports.BN = BN
                 }
                 BN.BN = BN;
                 BN.wordSize = 26;
                 var Buffer;
                 try {
                     Buffer = require("buffer").Buffer
                 } catch (e) {}
                 BN.isBN = function isBN(num) {
                     if (num instanceof BN) {
                         return true
                     }
                     return num !== null && typeof num === "object" && num.constructor.wordSize === BN.wordSize && Array.isArray(num.words)
                 };
                 BN.max = function max(left, right) {
                     if (left.cmp(right) > 0) return left;
                     return right
                 };
                 BN.min = function min(left, right) {
                     if (left.cmp(right) < 0) return left;
                     return right
                 };
                 BN.prototype._init = function init(number, base, endian) {
                     if (typeof number === "number") {
                         return this._initNumber(number, base, endian)
                     }
                     if (typeof number === "object") {
                         return this._initArray(number, base, endian)
                     }
                     if (base === "hex") {
                         base = 16
                     }
                     assert(base === (base | 0) && base >= 2 && base <= 36);
                     number = number.toString().replace(/\s+/g, "");
                     var start = 0;
                     if (number[0] === "-") {
                         start++
                     }
                     if (base === 16) {
                         this._parseHex(number, start)
                     } else {
                         this._parseBase(number, base, start)
                     }
                     if (number[0] === "-") {
                         this.negative = 1
                     }
                     this.strip();
                     if (endian !== "le") return;
                     this._initArray(this.toArray(), base, endian)
                 };
                 BN.prototype._initNumber = function _initNumber(number, base, endian) {
                     if (number < 0) {
                         this.negative = 1;
                         number = -number
                     }
                     if (number < 67108864) {
                         this.words = [number & 67108863];
                         this.length = 1
                     } else if (number < 4503599627370496) {
                         this.words = [number & 67108863, number / 67108864 & 67108863];
                         this.length = 2
                     } else {
                         assert(number < 9007199254740992);
                         this.words = [number & 67108863, number / 67108864 & 67108863, 1];
                         this.length = 3
                     }
                     if (endian !== "le") return;
                     this._initArray(this.toArray(), base, endian)
                 };
                 BN.prototype._initArray = function _initArray(number, base, endian) {
                     assert(typeof number.length === "number");
                     if (number.length <= 0) {
                         this.words = [0];
                         this.length = 1;
                         return this
                     }
                     this.length = Math.ceil(number.length / 3);
                     this.words = new Array(this.length);
                     for (var i = 0; i < this.length; i++) {
                         this.words[i] = 0
                     }
                     var j, w;
                     var off = 0;
                     if (endian === "be") {
                         for (i = number.length - 1, j = 0; i >= 0; i -= 3) {
                             w = number[i] | number[i - 1] << 8 | number[i - 2] << 16;
                             this.words[j] |= w << off & 67108863;
                             this.words[j + 1] = w >>> 26 - off & 67108863;
                             off += 24;
                             if (off >= 26) {
                                 off -= 26;
                                 j++
                             }
                         }
                     } else if (endian === "le") {
                         for (i = 0, j = 0; i < number.length; i += 3) {
                             w = number[i] | number[i + 1] << 8 | number[i + 2] << 16;
                             this.words[j] |= w << off & 67108863;
                             this.words[j + 1] = w >>> 26 - off & 67108863;
                             off += 24;
                             if (off >= 26) {
                                 off -= 26;
                                 j++
                             }
                         }
                     }
                     return this.strip()
                 };

                 function parseHex(str, start, end) {
                     var r = 0;
                     var len = Math.min(str.length, end);
                     for (var i = start; i < len; i++) {
                         var c = str.charCodeAt(i) - 48;
                         r <<= 4;
                         if (c >= 49 && c <= 54) {
                             r |= c - 49 + 10
                         } else if (c >= 17 && c <= 22) {
                             r |= c - 17 + 10
                         } else {
                             r |= c & 15
                         }
                     }
                     return r
                 }
                 BN.prototype._parseHex = function _parseHex(number, start) {
                     this.length = Math.ceil((number.length - start) / 6);
                     this.words = new Array(this.length);
                     for (var i = 0; i < this.length; i++) {
                         this.words[i] = 0
                     }
                     var j, w;
                     var off = 0;
                     for (i = number.length - 6, j = 0; i >= start; i -= 6) {
                         w = parseHex(number, i, i + 6);
                         this.words[j] |= w << off & 67108863;
                         this.words[j + 1] |= w >>> 26 - off & 4194303;
                         off += 24;
                         if (off >= 26) {
                             off -= 26;
                             j++
                         }
                     }
                     if (i + 6 !== start) {
                         w = parseHex(number, start, i + 6);
                         this.words[j] |= w << off & 67108863;
                         this.words[j + 1] |= w >>> 26 - off & 4194303
                     }
                     this.strip()
                 };

                 function parseBase(str, start, end, mul) {
                     var r = 0;
                     var len = Math.min(str.length, end);
                     for (var i = start; i < len; i++) {
                         var c = str.charCodeAt(i) - 48;
                         r *= mul;
                         if (c >= 49) {
                             r += c - 49 + 10
                         } else if (c >= 17) {
                             r += c - 17 + 10
                         } else {
                             r += c
                         }
                     }
                     return r
                 }
                 BN.prototype._parseBase = function _parseBase(number, base, start) {
                     this.words = [0];
                     this.length = 1;
                     for (var limbLen = 0, limbPow = 1; limbPow <= 67108863; limbPow *= base) {
                         limbLen++
                     }
                     limbLen--;
                     limbPow = limbPow / base | 0;
                     var total = number.length - start;
                     var mod = total % limbLen;
                     var end = Math.min(total, total - mod) + start;
                     var word = 0;
                     for (var i = start; i < end; i += limbLen) {
                         word = parseBase(number, i, i + limbLen, base);
                         this.imuln(limbPow);
                         if (this.words[0] + word < 67108864) {
                             this.words[0] += word
                         } else {
                             this._iaddn(word)
                         }
                     }
                     if (mod !== 0) {
                         var pow = 1;
                         word = parseBase(number, i, number.length, base);
                         for (i = 0; i < mod; i++) {
                             pow *= base
                         }
                         this.imuln(pow);
                         if (this.words[0] + word < 67108864) {
                             this.words[0] += word
                         } else {
                             this._iaddn(word)
                         }
                     }
                 };
                 BN.prototype.copy = function copy(dest) {
                     dest.words = new Array(this.length);
                     for (var i = 0; i < this.length; i++) {
                         dest.words[i] = this.words[i]
                     }
                     dest.length = this.length;
                     dest.negative = this.negative;
                     dest.red = this.red
                 };
                 BN.prototype.clone = function clone() {
                     var r = new BN(null);
                     this.copy(r);
                     return r
                 };
                 BN.prototype._expand = function _expand(size) {
                     while (this.length < size) {
                         this.words[this.length++] = 0
                     }
                     return this
                 };
                 BN.prototype.strip = function strip() {
                     while (this.length > 1 && this.words[this.length - 1] === 0) {
                         this.length--
                     }
                     return this._normSign()
                 };
                 BN.prototype._normSign = function _normSign() {
                     if (this.length === 1 && this.words[0] === 0) {
                         this.negative = 0
                     }
                     return this
                 };
                 BN.prototype.inspect = function inspect() {
                     return (this.red ? "<BN-R: " : "<BN: ") + this.toString(16) + ">"
                 };
                 var zeros = ["", "0", "00", "000", "0000", "00000", "000000", "0000000", "00000000", "000000000", "0000000000", "00000000000", "000000000000", "0000000000000", "00000000000000", "000000000000000", "0000000000000000", "00000000000000000", "000000000000000000", "0000000000000000000", "00000000000000000000", "000000000000000000000", "0000000000000000000000", "00000000000000000000000", "000000000000000000000000", "0000000000000000000000000"];
                 var groupSizes = [0, 0, 25, 16, 12, 11, 10, 9, 8, 8, 7, 7, 7, 7, 6, 6, 6, 6, 6, 6, 6, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5];
                 var groupBases = [0, 0, 33554432, 43046721, 16777216, 48828125, 60466176, 40353607, 16777216, 43046721, 1e7, 19487171, 35831808, 62748517, 7529536, 11390625, 16777216, 24137569, 34012224, 47045881, 64e6, 4084101, 5153632, 6436343, 7962624, 9765625, 11881376, 14348907, 17210368, 20511149, 243e5, 28629151, 33554432, 39135393, 45435424, 52521875, 60466176];
                 BN.prototype.toString = function toString(base, padding) {
                     base = base || 10;
                     padding = padding | 0 || 1;
                     var out;
                     if (base === 16 || base === "hex") {
                         out = "";
                         var off = 0;
                         var carry = 0;
                         for (var i = 0; i < this.length; i++) {
                             var w = this.words[i];
                             var word = ((w << off | carry) & 16777215).toString(16);
                             carry = w >>> 24 - off & 16777215;
                             if (carry !== 0 || i !== this.length - 1) {
                                 out = zeros[6 - word.length] + word + out
                             } else {
                                 out = word + out
                             }
                             off += 2;
                             if (off >= 26) {
                                 off -= 26;
                                 i--
                             }
                         }
                         if (carry !== 0) {
                             out = carry.toString(16) + out
                         }
                         while (out.length % padding !== 0) {
                             out = "0" + out
                         }
                         if (this.negative !== 0) {
                             out = "-" + out
                         }
                         return out
                     }
                     if (base === (base | 0) && base >= 2 && base <= 36) {
                         var groupSize = groupSizes[base];
                         var groupBase = groupBases[base];
                         out = "";
                         var c = this.clone();
                         c.negative = 0;
                         while (!c.isZero()) {
                             var r = c.modn(groupBase).toString(base);
                             c = c.idivn(groupBase);
                             if (!c.isZero()) {
                                 out = zeros[groupSize - r.length] + r + out
                             } else {
                                 out = r + out
                             }
                         }
                         if (this.isZero()) {
                             out = "0" + out
                         }
                         while (out.length % padding !== 0) {
                             out = "0" + out
                         }
                         if (this.negative !== 0) {
                             out = "-" + out
                         }
                         return out
                     }
                     assert(false, "Base should be between 2 and 36")
                 };
                 BN.prototype.toNumber = function toNumber() {
                     var ret = this.words[0];
                     if (this.length === 2) {
                         ret += this.words[1] * 67108864
                     } else if (this.length === 3 && this.words[2] === 1) {
                         ret += 4503599627370496 + this.words[1] * 67108864
                     } else if (this.length > 2) {
                         assert(false, "Number can only safely store up to 53 bits")
                     }
                     return this.negative !== 0 ? -ret : ret
                 };
                 BN.prototype.toJSON = function toJSON() {
                     return this.toString(16)
                 };
                 BN.prototype.toBuffer = function toBuffer(endian, length) {
                     assert(typeof Buffer !== "undefined");
                     return this.toArrayLike(Buffer, endian, length)
                 };
                 BN.prototype.toArray = function toArray(endian, length) {
                     return this.toArrayLike(Array, endian, length)
                 };
                 BN.prototype.toArrayLike = function toArrayLike(ArrayType, endian, length) {
                     var byteLength = this.byteLength();
                     var reqLength = length || Math.max(1, byteLength);
                     assert(byteLength <= reqLength, "byte array longer than desired length");
                     assert(reqLength > 0, "Requested array length <= 0");
                     this.strip();
                     var littleEndian = endian === "le";
                     var res = new ArrayType(reqLength);
                     var b, i;
                     var q = this.clone();
                     if (!littleEndian) {
                         for (i = 0; i < reqLength - byteLength; i++) {
                             res[i] = 0
                         }
                         for (i = 0; !q.isZero(); i++) {
                             b = q.andln(255);
                             q.iushrn(8);
                             res[reqLength - i - 1] = b
                         }
                     } else {
                         for (i = 0; !q.isZero(); i++) {
                             b = q.andln(255);
                             q.iushrn(8);
                             res[i] = b
                         }
                         for (; i < reqLength; i++) {
                             res[i] = 0
                         }
                     }
                     return res
                 };
                 if (Math.clz32) {
                     BN.prototype._countBits = function _countBits(w) {
                         return 32 - Math.clz32(w)
                     }
                 } else {
                     BN.prototype._countBits = function _countBits(w) {
                         var t = w;
                         var r = 0;
                         if (t >= 4096) {
                             r += 13;
                             t >>>= 13
                         }
                         if (t >= 64) {
                             r += 7;
                             t >>>= 7
                         }
                         if (t >= 8) {
                             r += 4;
                             t >>>= 4
                         }
                         if (t >= 2) {
                             r += 2;
                             t >>>= 2
                         }
                         return r + t
                     }
                 }
                 BN.prototype._zeroBits = function _zeroBits(w) {
                     if (w === 0) return 26;
                     var t = w;
                     var r = 0;
                     if ((t & 8191) === 0) {
                         r += 13;
                         t >>>= 13
                     }
                     if ((t & 127) === 0) {
                         r += 7;
                         t >>>= 7
                     }
                     if ((t & 15) === 0) {
                         r += 4;
                         t >>>= 4
                     }
                     if ((t & 3) === 0) {
                         r += 2;
                         t >>>= 2
                     }
                     if ((t & 1) === 0) {
                         r++
                     }
                     return r
                 };
                 BN.prototype.bitLength = function bitLength() {
                     var w = this.words[this.length - 1];
                     var hi = this._countBits(w);
                     return (this.length - 1) * 26 + hi
                 };

                 function toBitArray(num) {
                     var w = new Array(num.bitLength());
                     for (var bit = 0; bit < w.length; bit++) {
                         var off = bit / 26 | 0;
                         var wbit = bit % 26;
                         w[bit] = (num.words[off] & 1 << wbit) >>> wbit
                     }
                     return w
                 }
                 BN.prototype.zeroBits = function zeroBits() {
                     if (this.isZero()) return 0;
                     var r = 0;
                     for (var i = 0; i < this.length; i++) {
                         var b = this._zeroBits(this.words[i]);
                         r += b;
                         if (b !== 26) break
                     }
                     return r
                 };
                 BN.prototype.byteLength = function byteLength() {
                     return Math.ceil(this.bitLength() / 8)
                 };
                 BN.prototype.toTwos = function toTwos(width) {
                     if (this.negative !== 0) {
                         return this.abs().inotn(width).iaddn(1)
                     }
                     return this.clone()
                 };
                 BN.prototype.fromTwos = function fromTwos(width) {
                     if (this.testn(width - 1)) {
                         return this.notn(width).iaddn(1).ineg()
                     }
                     return this.clone()
                 };
                 BN.prototype.isNeg = function isNeg() {
                     return this.negative !== 0
                 };
                 BN.prototype.neg = function neg() {
                     return this.clone().ineg()
                 };
                 BN.prototype.ineg = function ineg() {
                     if (!this.isZero()) {
                         this.negative ^= 1
                     }
                     return this
                 };
                 BN.prototype.iuor = function iuor(num) {
                     while (this.length < num.length) {
                         this.words[this.length++] = 0
                     }
                     for (var i = 0; i < num.length; i++) {
                         this.words[i] = this.words[i] | num.words[i]
                     }
                     return this.strip()
                 };
                 BN.prototype.ior = function ior(num) {
                     assert((this.negative | num.negative) === 0);
                     return this.iuor(num)
                 };
                 BN.prototype.or = function or(num) {
                     if (this.length > num.length) return this.clone().ior(num);
                     return num.clone().ior(this)
                 };
                 BN.prototype.uor = function uor(num) {
                     if (this.length > num.length) return this.clone().iuor(num);
                     return num.clone().iuor(this)
                 };
                 BN.prototype.iuand = function iuand(num) {
                     var b;
                     if (this.length > num.length) {
                         b = num
                     } else {
                         b = this
                     }
                     for (var i = 0; i < b.length; i++) {
                         this.words[i] = this.words[i] & num.words[i]
                     }
                     this.length = b.length;
                     return this.strip()
                 };
                 BN.prototype.iand = function iand(num) {
                     assert((this.negative | num.negative) === 0);
                     return this.iuand(num)
                 };
                 BN.prototype.and = function and(num) {
                     if (this.length > num.length) return this.clone().iand(num);
                     return num.clone().iand(this)
                 };
                 BN.prototype.uand = function uand(num) {
                     if (this.length > num.length) return this.clone().iuand(num);
                     return num.clone().iuand(this)
                 };
                 BN.prototype.iuxor = function iuxor(num) {
                     var a;
                     var b;
                     if (this.length > num.length) {
                         a = this;
                         b = num
                     } else {
                         a = num;
                         b = this
                     }
                     for (var i = 0; i < b.length; i++) {
                         this.words[i] = a.words[i] ^ b.words[i]
                     }
                     if (this !== a) {
                         for (; i < a.length; i++) {
                             this.words[i] = a.words[i]
                         }
                     }
                     this.length = a.length;
                     return this.strip()
                 };
                 BN.prototype.ixor = function ixor(num) {
                     assert((this.negative | num.negative) === 0);
                     return this.iuxor(num)
                 };
                 BN.prototype.xor = function xor(num) {
                     if (this.length > num.length) return this.clone().ixor(num);
                     return num.clone().ixor(this)
                 };
                 BN.prototype.uxor = function uxor(num) {
                     if (this.length > num.length) return this.clone().iuxor(num);
                     return num.clone().iuxor(this)
                 };
                 BN.prototype.inotn = function inotn(width) {
                     assert(typeof width === "number" && width >= 0);
                     var bytesNeeded = Math.ceil(width / 26) | 0;
                     var bitsLeft = width % 26;
                     this._expand(bytesNeeded);
                     if (bitsLeft > 0) {
                         bytesNeeded--
                     }
                     for (var i = 0; i < bytesNeeded; i++) {
                         this.words[i] = ~this.words[i] & 67108863
                     }
                     if (bitsLeft > 0) {
                         this.words[i] = ~this.words[i] & 67108863 >> 26 - bitsLeft
                     }
                     return this.strip()
                 };
                 BN.prototype.notn = function notn(width) {
                     return this.clone().inotn(width)
                 };
                 BN.prototype.setn = function setn(bit, val) {
                     assert(typeof bit === "number" && bit >= 0);
                     var off = bit / 26 | 0;
                     var wbit = bit % 26;
                     this._expand(off + 1);
                     if (val) {
                         this.words[off] = this.words[off] | 1 << wbit
                     } else {
                         this.words[off] = this.words[off] & ~(1 << wbit)
                     }
                     return this.strip()
                 };
                 BN.prototype.iadd = function iadd(num) {
                     var r;
                     if (this.negative !== 0 && num.negative === 0) {
                         this.negative = 0;
                         r = this.isub(num);
                         this.negative ^= 1;
                         return this._normSign()
                     } else if (this.negative === 0 && num.negative !== 0) {
                         num.negative = 0;
                         r = this.isub(num);
                         num.negative = 1;
                         return r._normSign()
                     }
                     var a, b;
                     if (this.length > num.length) {
                         a = this;
                         b = num
                     } else {
                         a = num;
                         b = this
                     }
                     var carry = 0;
                     for (var i = 0; i < b.length; i++) {
                         r = (a.words[i] | 0) + (b.words[i] | 0) + carry;
                         this.words[i] = r & 67108863;
                         carry = r >>> 26
                     }
                     for (; carry !== 0 && i < a.length; i++) {
                         r = (a.words[i] | 0) + carry;
                         this.words[i] = r & 67108863;
                         carry = r >>> 26
                     }
                     this.length = a.length;
                     if (carry !== 0) {
                         this.words[this.length] = carry;
                         this.length++
                     } else if (a !== this) {
                         for (; i < a.length; i++) {
                             this.words[i] = a.words[i]
                         }
                     }
                     return this
                 };
                 BN.prototype.add = function add(num) {
                     var res;
                     if (num.negative !== 0 && this.negative === 0) {
                         num.negative = 0;
                         res = this.sub(num);
                         num.negative ^= 1;
                         return res
                     } else if (num.negative === 0 && this.negative !== 0) {
                         this.negative = 0;
                         res = num.sub(this);
                         this.negative = 1;
                         return res
                     }
                     if (this.length > num.length) return this.clone().iadd(num);
                     return num.clone().iadd(this)
                 };
                 BN.prototype.isub = function isub(num) {
                     if (num.negative !== 0) {
                         num.negative = 0;
                         var r = this.iadd(num);
                         num.negative = 1;
                         return r._normSign()
                     } else if (this.negative !== 0) {
                         this.negative = 0;
                         this.iadd(num);
                         this.negative = 1;
                         return this._normSign()
                     }
                     var cmp = this.cmp(num);
                     if (cmp === 0) {
                         this.negative = 0;
                         this.length = 1;
                         this.words[0] = 0;
                         return this
                     }
                     var a, b;
                     if (cmp > 0) {
                         a = this;
                         b = num
                     } else {
                         a = num;
                         b = this
                     }
                     var carry = 0;
                     for (var i = 0; i < b.length; i++) {
                         r = (a.words[i] | 0) - (b.words[i] | 0) + carry;
                         carry = r >> 26;
                         this.words[i] = r & 67108863
                     }
                     for (; carry !== 0 && i < a.length; i++) {
                         r = (a.words[i] | 0) + carry;
                         carry = r >> 26;
                         this.words[i] = r & 67108863
                     }
                     if (carry === 0 && i < a.length && a !== this) {
                         for (; i < a.length; i++) {
                             this.words[i] = a.words[i]
                         }
                     }
                     this.length = Math.max(this.length, i);
                     if (a !== this) {
                         this.negative = 1
                     }
                     return this.strip()
                 };
                 BN.prototype.sub = function sub(num) {
                     return this.clone().isub(num)
                 };

                 function smallMulTo(self, num, out) {
                     out.negative = num.negative ^ self.negative;
                     var len = self.length + num.length | 0;
                     out.length = len;
                     len = len - 1 | 0;
                     var a = self.words[0] | 0;
                     var b = num.words[0] | 0;
                     var r = a * b;
                     var lo = r & 67108863;
                     var carry = r / 67108864 | 0;
                     out.words[0] = lo;
                     for (var k = 1; k < len; k++) {
                         var ncarry = carry >>> 26;
                         var rword = carry & 67108863;
                         var maxJ = Math.min(k, num.length - 1);
                         for (var j = Math.max(0, k - self.length + 1); j <= maxJ; j++) {
                             var i = k - j | 0;
                             a = self.words[i] | 0;
                             b = num.words[j] | 0;
                             r = a * b + rword;
                             ncarry += r / 67108864 | 0;
                             rword = r & 67108863
                         }
                         out.words[k] = rword | 0;
                         carry = ncarry | 0
                     }
                     if (carry !== 0) {
                         out.words[k] = carry | 0
                     } else {
                         out.length--
                     }
                     return out.strip()
                 }
                 var comb10MulTo = function comb10MulTo(self, num, out) {
                     var a = self.words;
                     var b = num.words;
                     var o = out.words;
                     var c = 0;
                     var lo;
                     var mid;
                     var hi;
                     var a0 = a[0] | 0;
                     var al0 = a0 & 8191;
                     var ah0 = a0 >>> 13;
                     var a1 = a[1] | 0;
                     var al1 = a1 & 8191;
                     var ah1 = a1 >>> 13;
                     var a2 = a[2] | 0;
                     var al2 = a2 & 8191;
                     var ah2 = a2 >>> 13;
                     var a3 = a[3] | 0;
                     var al3 = a3 & 8191;
                     var ah3 = a3 >>> 13;
                     var a4 = a[4] | 0;
                     var al4 = a4 & 8191;
                     var ah4 = a4 >>> 13;
                     var a5 = a[5] | 0;
                     var al5 = a5 & 8191;
                     var ah5 = a5 >>> 13;
                     var a6 = a[6] | 0;
                     var al6 = a6 & 8191;
                     var ah6 = a6 >>> 13;
                     var a7 = a[7] | 0;
                     var al7 = a7 & 8191;
                     var ah7 = a7 >>> 13;
                     var a8 = a[8] | 0;
                     var al8 = a8 & 8191;
                     var ah8 = a8 >>> 13;
                     var a9 = a[9] | 0;
                     var al9 = a9 & 8191;
                     var ah9 = a9 >>> 13;
                     var b0 = b[0] | 0;
                     var bl0 = b0 & 8191;
                     var bh0 = b0 >>> 13;
                     var b1 = b[1] | 0;
                     var bl1 = b1 & 8191;
                     var bh1 = b1 >>> 13;
                     var b2 = b[2] | 0;
                     var bl2 = b2 & 8191;
                     var bh2 = b2 >>> 13;
                     var b3 = b[3] | 0;
                     var bl3 = b3 & 8191;
                     var bh3 = b3 >>> 13;
                     var b4 = b[4] | 0;
                     var bl4 = b4 & 8191;
                     var bh4 = b4 >>> 13;
                     var b5 = b[5] | 0;
                     var bl5 = b5 & 8191;
                     var bh5 = b5 >>> 13;
                     var b6 = b[6] | 0;
                     var bl6 = b6 & 8191;
                     var bh6 = b6 >>> 13;
                     var b7 = b[7] | 0;
                     var bl7 = b7 & 8191;
                     var bh7 = b7 >>> 13;
                     var b8 = b[8] | 0;
                     var bl8 = b8 & 8191;
                     var bh8 = b8 >>> 13;
                     var b9 = b[9] | 0;
                     var bl9 = b9 & 8191;
                     var bh9 = b9 >>> 13;
                     out.negative = self.negative ^ num.negative;
                     out.length = 19;
                     lo = Math.imul(al0, bl0);
                     mid = Math.imul(al0, bh0);
                     mid = mid + Math.imul(ah0, bl0) | 0;
                     hi = Math.imul(ah0, bh0);
                     var w0 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
                     c = (hi + (mid >>> 13) | 0) + (w0 >>> 26) | 0;
                     w0 &= 67108863;
                     lo = Math.imul(al1, bl0);
                     mid = Math.imul(al1, bh0);
                     mid = mid + Math.imul(ah1, bl0) | 0;
                     hi = Math.imul(ah1, bh0);
                     lo = lo + Math.imul(al0, bl1) | 0;
                     mid = mid + Math.imul(al0, bh1) | 0;
                     mid = mid + Math.imul(ah0, bl1) | 0;
                     hi = hi + Math.imul(ah0, bh1) | 0;
                     var w1 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
                     c = (hi + (mid >>> 13) | 0) + (w1 >>> 26) | 0;
                     w1 &= 67108863;
                     lo = Math.imul(al2, bl0);
                     mid = Math.imul(al2, bh0);
                     mid = mid + Math.imul(ah2, bl0) | 0;
                     hi = Math.imul(ah2, bh0);
                     lo = lo + Math.imul(al1, bl1) | 0;
                     mid = mid + Math.imul(al1, bh1) | 0;
                     mid = mid + Math.imul(ah1, bl1) | 0;
                     hi = hi + Math.imul(ah1, bh1) | 0;
                     lo = lo + Math.imul(al0, bl2) | 0;
                     mid = mid + Math.imul(al0, bh2) | 0;
                     mid = mid + Math.imul(ah0, bl2) | 0;
                     hi = hi + Math.imul(ah0, bh2) | 0;
                     var w2 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
                     c = (hi + (mid >>> 13) | 0) + (w2 >>> 26) | 0;
                     w2 &= 67108863;
                     lo = Math.imul(al3, bl0);
                     mid = Math.imul(al3, bh0);
                     mid = mid + Math.imul(ah3, bl0) | 0;
                     hi = Math.imul(ah3, bh0);
                     lo = lo + Math.imul(al2, bl1) | 0;
                     mid = mid + Math.imul(al2, bh1) | 0;
                     mid = mid + Math.imul(ah2, bl1) | 0;
                     hi = hi + Math.imul(ah2, bh1) | 0;
                     lo = lo + Math.imul(al1, bl2) | 0;
                     mid = mid + Math.imul(al1, bh2) | 0;
                     mid = mid + Math.imul(ah1, bl2) | 0;
                     hi = hi + Math.imul(ah1, bh2) | 0;
                     lo = lo + Math.imul(al0, bl3) | 0;
                     mid = mid + Math.imul(al0, bh3) | 0;
                     mid = mid + Math.imul(ah0, bl3) | 0;
                     hi = hi + Math.imul(ah0, bh3) | 0;
                     var w3 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
                     c = (hi + (mid >>> 13) | 0) + (w3 >>> 26) | 0;
                     w3 &= 67108863;
                     lo = Math.imul(al4, bl0);
                     mid = Math.imul(al4, bh0);
                     mid = mid + Math.imul(ah4, bl0) | 0;
                     hi = Math.imul(ah4, bh0);
                     lo = lo + Math.imul(al3, bl1) | 0;
                     mid = mid + Math.imul(al3, bh1) | 0;
                     mid = mid + Math.imul(ah3, bl1) | 0;
                     hi = hi + Math.imul(ah3, bh1) | 0;
                     lo = lo + Math.imul(al2, bl2) | 0;
                     mid = mid + Math.imul(al2, bh2) | 0;
                     mid = mid + Math.imul(ah2, bl2) | 0;
                     hi = hi + Math.imul(ah2, bh2) | 0;
                     lo = lo + Math.imul(al1, bl3) | 0;
                     mid = mid + Math.imul(al1, bh3) | 0;
                     mid = mid + Math.imul(ah1, bl3) | 0;
                     hi = hi + Math.imul(ah1, bh3) | 0;
                     lo = lo + Math.imul(al0, bl4) | 0;
                     mid = mid + Math.imul(al0, bh4) | 0;
                     mid = mid + Math.imul(ah0, bl4) | 0;
                     hi = hi + Math.imul(ah0, bh4) | 0;
                     var w4 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
                     c = (hi + (mid >>> 13) | 0) + (w4 >>> 26) | 0;
                     w4 &= 67108863;
                     lo = Math.imul(al5, bl0);
                     mid = Math.imul(al5, bh0);
                     mid = mid + Math.imul(ah5, bl0) | 0;
                     hi = Math.imul(ah5, bh0);
                     lo = lo + Math.imul(al4, bl1) | 0;
                     mid = mid + Math.imul(al4, bh1) | 0;
                     mid = mid + Math.imul(ah4, bl1) | 0;
                     hi = hi + Math.imul(ah4, bh1) | 0;
                     lo = lo + Math.imul(al3, bl2) | 0;
                     mid = mid + Math.imul(al3, bh2) | 0;
                     mid = mid + Math.imul(ah3, bl2) | 0;
                     hi = hi + Math.imul(ah3, bh2) | 0;
                     lo = lo + Math.imul(al2, bl3) | 0;
                     mid = mid + Math.imul(al2, bh3) | 0;
                     mid = mid + Math.imul(ah2, bl3) | 0;
                     hi = hi + Math.imul(ah2, bh3) | 0;
                     lo = lo + Math.imul(al1, bl4) | 0;
                     mid = mid + Math.imul(al1, bh4) | 0;
                     mid = mid + Math.imul(ah1, bl4) | 0;
                     hi = hi + Math.imul(ah1, bh4) | 0;
                     lo = lo + Math.imul(al0, bl5) | 0;
                     mid = mid + Math.imul(al0, bh5) | 0;
                     mid = mid + Math.imul(ah0, bl5) | 0;
                     hi = hi + Math.imul(ah0, bh5) | 0;
                     var w5 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
                     c = (hi + (mid >>> 13) | 0) + (w5 >>> 26) | 0;
                     w5 &= 67108863;
                     lo = Math.imul(al6, bl0);
                     mid = Math.imul(al6, bh0);
                     mid = mid + Math.imul(ah6, bl0) | 0;
                     hi = Math.imul(ah6, bh0);
                     lo = lo + Math.imul(al5, bl1) | 0;
                     mid = mid + Math.imul(al5, bh1) | 0;
                     mid = mid + Math.imul(ah5, bl1) | 0;
                     hi = hi + Math.imul(ah5, bh1) | 0;
                     lo = lo + Math.imul(al4, bl2) | 0;
                     mid = mid + Math.imul(al4, bh2) | 0;
                     mid = mid + Math.imul(ah4, bl2) | 0;
                     hi = hi + Math.imul(ah4, bh2) | 0;
                     lo = lo + Math.imul(al3, bl3) | 0;
                     mid = mid + Math.imul(al3, bh3) | 0;
                     mid = mid + Math.imul(ah3, bl3) | 0;
                     hi = hi + Math.imul(ah3, bh3) | 0;
                     lo = lo + Math.imul(al2, bl4) | 0;
                     mid = mid + Math.imul(al2, bh4) | 0;
                     mid = mid + Math.imul(ah2, bl4) | 0;
                     hi = hi + Math.imul(ah2, bh4) | 0;
                     lo = lo + Math.imul(al1, bl5) | 0;
                     mid = mid + Math.imul(al1, bh5) | 0;
                     mid = mid + Math.imul(ah1, bl5) | 0;
                     hi = hi + Math.imul(ah1, bh5) | 0;
                     lo = lo + Math.imul(al0, bl6) | 0;
                     mid = mid + Math.imul(al0, bh6) | 0;
                     mid = mid + Math.imul(ah0, bl6) | 0;
                     hi = hi + Math.imul(ah0, bh6) | 0;
                     var w6 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
                     c = (hi + (mid >>> 13) | 0) + (w6 >>> 26) | 0;
                     w6 &= 67108863;
                     lo = Math.imul(al7, bl0);
                     mid = Math.imul(al7, bh0);
                     mid = mid + Math.imul(ah7, bl0) | 0;
                     hi = Math.imul(ah7, bh0);
                     lo = lo + Math.imul(al6, bl1) | 0;
                     mid = mid + Math.imul(al6, bh1) | 0;
                     mid = mid + Math.imul(ah6, bl1) | 0;
                     hi = hi + Math.imul(ah6, bh1) | 0;
                     lo = lo + Math.imul(al5, bl2) | 0;
                     mid = mid + Math.imul(al5, bh2) | 0;
                     mid = mid + Math.imul(ah5, bl2) | 0;
                     hi = hi + Math.imul(ah5, bh2) | 0;
                     lo = lo + Math.imul(al4, bl3) | 0;
                     mid = mid + Math.imul(al4, bh3) | 0;
                     mid = mid + Math.imul(ah4, bl3) | 0;
                     hi = hi + Math.imul(ah4, bh3) | 0;
                     lo = lo + Math.imul(al3, bl4) | 0;
                     mid = mid + Math.imul(al3, bh4) | 0;
                     mid = mid + Math.imul(ah3, bl4) | 0;
                     hi = hi + Math.imul(ah3, bh4) | 0;
                     lo = lo + Math.imul(al2, bl5) | 0;
                     mid = mid + Math.imul(al2, bh5) | 0;
                     mid = mid + Math.imul(ah2, bl5) | 0;
                     hi = hi + Math.imul(ah2, bh5) | 0;
                     lo = lo + Math.imul(al1, bl6) | 0;
                     mid = mid + Math.imul(al1, bh6) | 0;
                     mid = mid + Math.imul(ah1, bl6) | 0;
                     hi = hi + Math.imul(ah1, bh6) | 0;
                     lo = lo + Math.imul(al0, bl7) | 0;
                     mid = mid + Math.imul(al0, bh7) | 0;
                     mid = mid + Math.imul(ah0, bl7) | 0;
                     hi = hi + Math.imul(ah0, bh7) | 0;
                     var w7 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
                     c = (hi + (mid >>> 13) | 0) + (w7 >>> 26) | 0;
                     w7 &= 67108863;
                     lo = Math.imul(al8, bl0);
                     mid = Math.imul(al8, bh0);
                     mid = mid + Math.imul(ah8, bl0) | 0;
                     hi = Math.imul(ah8, bh0);
                     lo = lo + Math.imul(al7, bl1) | 0;
                     mid = mid + Math.imul(al7, bh1) | 0;
                     mid = mid + Math.imul(ah7, bl1) | 0;
                     hi = hi + Math.imul(ah7, bh1) | 0;
                     lo = lo + Math.imul(al6, bl2) | 0;
                     mid = mid + Math.imul(al6, bh2) | 0;
                     mid = mid + Math.imul(ah6, bl2) | 0;
                     hi = hi + Math.imul(ah6, bh2) | 0;
                     lo = lo + Math.imul(al5, bl3) | 0;
                     mid = mid + Math.imul(al5, bh3) | 0;
                     mid = mid + Math.imul(ah5, bl3) | 0;
                     hi = hi + Math.imul(ah5, bh3) | 0;
                     lo = lo + Math.imul(al4, bl4) | 0;
                     mid = mid + Math.imul(al4, bh4) | 0;
                     mid = mid + Math.imul(ah4, bl4) | 0;
                     hi = hi + Math.imul(ah4, bh4) | 0;
                     lo = lo + Math.imul(al3, bl5) | 0;
                     mid = mid + Math.imul(al3, bh5) | 0;
                     mid = mid + Math.imul(ah3, bl5) | 0;
                     hi = hi + Math.imul(ah3, bh5) | 0;
                     lo = lo + Math.imul(al2, bl6) | 0;
                     mid = mid + Math.imul(al2, bh6) | 0;
                     mid = mid + Math.imul(ah2, bl6) | 0;
                     hi = hi + Math.imul(ah2, bh6) | 0;
                     lo = lo + Math.imul(al1, bl7) | 0;
                     mid = mid + Math.imul(al1, bh7) | 0;
                     mid = mid + Math.imul(ah1, bl7) | 0;
                     hi = hi + Math.imul(ah1, bh7) | 0;
                     lo = lo + Math.imul(al0, bl8) | 0;
                     mid = mid + Math.imul(al0, bh8) | 0;
                     mid = mid + Math.imul(ah0, bl8) | 0;
                     hi = hi + Math.imul(ah0, bh8) | 0;
                     var w8 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
                     c = (hi + (mid >>> 13) | 0) + (w8 >>> 26) | 0;
                     w8 &= 67108863;
                     lo = Math.imul(al9, bl0);
                     mid = Math.imul(al9, bh0);
                     mid = mid + Math.imul(ah9, bl0) | 0;
                     hi = Math.imul(ah9, bh0);
                     lo = lo + Math.imul(al8, bl1) | 0;
                     mid = mid + Math.imul(al8, bh1) | 0;
                     mid = mid + Math.imul(ah8, bl1) | 0;
                     hi = hi + Math.imul(ah8, bh1) | 0;
                     lo = lo + Math.imul(al7, bl2) | 0;
                     mid = mid + Math.imul(al7, bh2) | 0;
                     mid = mid + Math.imul(ah7, bl2) | 0;
                     hi = hi + Math.imul(ah7, bh2) | 0;
                     lo = lo + Math.imul(al6, bl3) | 0;
                     mid = mid + Math.imul(al6, bh3) | 0;
                     mid = mid + Math.imul(ah6, bl3) | 0;
                     hi = hi + Math.imul(ah6, bh3) | 0;
                     lo = lo + Math.imul(al5, bl4) | 0;
                     mid = mid + Math.imul(al5, bh4) | 0;
                     mid = mid + Math.imul(ah5, bl4) | 0;
                     hi = hi + Math.imul(ah5, bh4) | 0;
                     lo = lo + Math.imul(al4, bl5) | 0;
                     mid = mid + Math.imul(al4, bh5) | 0;
                     mid = mid + Math.imul(ah4, bl5) | 0;
                     hi = hi + Math.imul(ah4, bh5) | 0;
                     lo = lo + Math.imul(al3, bl6) | 0;
                     mid = mid + Math.imul(al3, bh6) | 0;
                     mid = mid + Math.imul(ah3, bl6) | 0;
                     hi = hi + Math.imul(ah3, bh6) | 0;
                     lo = lo + Math.imul(al2, bl7) | 0;
                     mid = mid + Math.imul(al2, bh7) | 0;
                     mid = mid + Math.imul(ah2, bl7) | 0;
                     hi = hi + Math.imul(ah2, bh7) | 0;
                     lo = lo + Math.imul(al1, bl8) | 0;
                     mid = mid + Math.imul(al1, bh8) | 0;
                     mid = mid + Math.imul(ah1, bl8) | 0;
                     hi = hi + Math.imul(ah1, bh8) | 0;
                     lo = lo + Math.imul(al0, bl9) | 0;
                     mid = mid + Math.imul(al0, bh9) | 0;
                     mid = mid + Math.imul(ah0, bl9) | 0;
                     hi = hi + Math.imul(ah0, bh9) | 0;
                     var w9 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
                     c = (hi + (mid >>> 13) | 0) + (w9 >>> 26) | 0;
                     w9 &= 67108863;
                     lo = Math.imul(al9, bl1);
                     mid = Math.imul(al9, bh1);
                     mid = mid + Math.imul(ah9, bl1) | 0;
                     hi = Math.imul(ah9, bh1);
                     lo = lo + Math.imul(al8, bl2) | 0;
                     mid = mid + Math.imul(al8, bh2) | 0;
                     mid = mid + Math.imul(ah8, bl2) | 0;
                     hi = hi + Math.imul(ah8, bh2) | 0;
                     lo = lo + Math.imul(al7, bl3) | 0;
                     mid = mid + Math.imul(al7, bh3) | 0;
                     mid = mid + Math.imul(ah7, bl3) | 0;
                     hi = hi + Math.imul(ah7, bh3) | 0;
                     lo = lo + Math.imul(al6, bl4) | 0;
                     mid = mid + Math.imul(al6, bh4) | 0;
                     mid = mid + Math.imul(ah6, bl4) | 0;
                     hi = hi + Math.imul(ah6, bh4) | 0;
                     lo = lo + Math.imul(al5, bl5) | 0;
                     mid = mid + Math.imul(al5, bh5) | 0;
                     mid = mid + Math.imul(ah5, bl5) | 0;
                     hi = hi + Math.imul(ah5, bh5) | 0;
                     lo = lo + Math.imul(al4, bl6) | 0;
                     mid = mid + Math.imul(al4, bh6) | 0;
                     mid = mid + Math.imul(ah4, bl6) | 0;
                     hi = hi + Math.imul(ah4, bh6) | 0;
                     lo = lo + Math.imul(al3, bl7) | 0;
                     mid = mid + Math.imul(al3, bh7) | 0;
                     mid = mid + Math.imul(ah3, bl7) | 0;
                     hi = hi + Math.imul(ah3, bh7) | 0;
                     lo = lo + Math.imul(al2, bl8) | 0;
                     mid = mid + Math.imul(al2, bh8) | 0;
                     mid = mid + Math.imul(ah2, bl8) | 0;
                     hi = hi + Math.imul(ah2, bh8) | 0;
                     lo = lo + Math.imul(al1, bl9) | 0;
                     mid = mid + Math.imul(al1, bh9) | 0;
                     mid = mid + Math.imul(ah1, bl9) | 0;
                     hi = hi + Math.imul(ah1, bh9) | 0;
                     var w10 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
                     c = (hi + (mid >>> 13) | 0) + (w10 >>> 26) | 0;
                     w10 &= 67108863;
                     lo = Math.imul(al9, bl2);
                     mid = Math.imul(al9, bh2);
                     mid = mid + Math.imul(ah9, bl2) | 0;
                     hi = Math.imul(ah9, bh2);
                     lo = lo + Math.imul(al8, bl3) | 0;
                     mid = mid + Math.imul(al8, bh3) | 0;
                     mid = mid + Math.imul(ah8, bl3) | 0;
                     hi = hi + Math.imul(ah8, bh3) | 0;
                     lo = lo + Math.imul(al7, bl4) | 0;
                     mid = mid + Math.imul(al7, bh4) | 0;
                     mid = mid + Math.imul(ah7, bl4) | 0;
                     hi = hi + Math.imul(ah7, bh4) | 0;
                     lo = lo + Math.imul(al6, bl5) | 0;
                     mid = mid + Math.imul(al6, bh5) | 0;
                     mid = mid + Math.imul(ah6, bl5) | 0;
                     hi = hi + Math.imul(ah6, bh5) | 0;
                     lo = lo + Math.imul(al5, bl6) | 0;
                     mid = mid + Math.imul(al5, bh6) | 0;
                     mid = mid + Math.imul(ah5, bl6) | 0;
                     hi = hi + Math.imul(ah5, bh6) | 0;
                     lo = lo + Math.imul(al4, bl7) | 0;
                     mid = mid + Math.imul(al4, bh7) | 0;
                     mid = mid + Math.imul(ah4, bl7) | 0;
                     hi = hi + Math.imul(ah4, bh7) | 0;
                     lo = lo + Math.imul(al3, bl8) | 0;
                     mid = mid + Math.imul(al3, bh8) | 0;
                     mid = mid + Math.imul(ah3, bl8) | 0;
                     hi = hi + Math.imul(ah3, bh8) | 0;
                     lo = lo + Math.imul(al2, bl9) | 0;
                     mid = mid + Math.imul(al2, bh9) | 0;
                     mid = mid + Math.imul(ah2, bl9) | 0;
                     hi = hi + Math.imul(ah2, bh9) | 0;
                     var w11 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
                     c = (hi + (mid >>> 13) | 0) + (w11 >>> 26) | 0;
                     w11 &= 67108863;
                     lo = Math.imul(al9, bl3);
                     mid = Math.imul(al9, bh3);
                     mid = mid + Math.imul(ah9, bl3) | 0;
                     hi = Math.imul(ah9, bh3);
                     lo = lo + Math.imul(al8, bl4) | 0;
                     mid = mid + Math.imul(al8, bh4) | 0;
                     mid = mid + Math.imul(ah8, bl4) | 0;
                     hi = hi + Math.imul(ah8, bh4) | 0;
                     lo = lo + Math.imul(al7, bl5) | 0;
                     mid = mid + Math.imul(al7, bh5) | 0;
                     mid = mid + Math.imul(ah7, bl5) | 0;
                     hi = hi + Math.imul(ah7, bh5) | 0;
                     lo = lo + Math.imul(al6, bl6) | 0;
                     mid = mid + Math.imul(al6, bh6) | 0;
                     mid = mid + Math.imul(ah6, bl6) | 0;
                     hi = hi + Math.imul(ah6, bh6) | 0;
                     lo = lo + Math.imul(al5, bl7) | 0;
                     mid = mid + Math.imul(al5, bh7) | 0;
                     mid = mid + Math.imul(ah5, bl7) | 0;
                     hi = hi + Math.imul(ah5, bh7) | 0;
                     lo = lo + Math.imul(al4, bl8) | 0;
                     mid = mid + Math.imul(al4, bh8) | 0;
                     mid = mid + Math.imul(ah4, bl8) | 0;
                     hi = hi + Math.imul(ah4, bh8) | 0;
                     lo = lo + Math.imul(al3, bl9) | 0;
                     mid = mid + Math.imul(al3, bh9) | 0;
                     mid = mid + Math.imul(ah3, bl9) | 0;
                     hi = hi + Math.imul(ah3, bh9) | 0;
                     var w12 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
                     c = (hi + (mid >>> 13) | 0) + (w12 >>> 26) | 0;
                     w12 &= 67108863;
                     lo = Math.imul(al9, bl4);
                     mid = Math.imul(al9, bh4);
                     mid = mid + Math.imul(ah9, bl4) | 0;
                     hi = Math.imul(ah9, bh4);
                     lo = lo + Math.imul(al8, bl5) | 0;
                     mid = mid + Math.imul(al8, bh5) | 0;
                     mid = mid + Math.imul(ah8, bl5) | 0;
                     hi = hi + Math.imul(ah8, bh5) | 0;
                     lo = lo + Math.imul(al7, bl6) | 0;
                     mid = mid + Math.imul(al7, bh6) | 0;
                     mid = mid + Math.imul(ah7, bl6) | 0;
                     hi = hi + Math.imul(ah7, bh6) | 0;
                     lo = lo + Math.imul(al6, bl7) | 0;
                     mid = mid + Math.imul(al6, bh7) | 0;
                     mid = mid + Math.imul(ah6, bl7) | 0;
                     hi = hi + Math.imul(ah6, bh7) | 0;
                     lo = lo + Math.imul(al5, bl8) | 0;
                     mid = mid + Math.imul(al5, bh8) | 0;
                     mid = mid + Math.imul(ah5, bl8) | 0;
                     hi = hi + Math.imul(ah5, bh8) | 0;
                     lo = lo + Math.imul(al4, bl9) | 0;
                     mid = mid + Math.imul(al4, bh9) | 0;
                     mid = mid + Math.imul(ah4, bl9) | 0;
                     hi = hi + Math.imul(ah4, bh9) | 0;
                     var w13 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
                     c = (hi + (mid >>> 13) | 0) + (w13 >>> 26) | 0;
                     w13 &= 67108863;
                     lo = Math.imul(al9, bl5);
                     mid = Math.imul(al9, bh5);
                     mid = mid + Math.imul(ah9, bl5) | 0;
                     hi = Math.imul(ah9, bh5);
                     lo = lo + Math.imul(al8, bl6) | 0;
                     mid = mid + Math.imul(al8, bh6) | 0;
                     mid = mid + Math.imul(ah8, bl6) | 0;
                     hi = hi + Math.imul(ah8, bh6) | 0;
                     lo = lo + Math.imul(al7, bl7) | 0;
                     mid = mid + Math.imul(al7, bh7) | 0;
                     mid = mid + Math.imul(ah7, bl7) | 0;
                     hi = hi + Math.imul(ah7, bh7) | 0;
                     lo = lo + Math.imul(al6, bl8) | 0;
                     mid = mid + Math.imul(al6, bh8) | 0;
                     mid = mid + Math.imul(ah6, bl8) | 0;
                     hi = hi + Math.imul(ah6, bh8) | 0;
                     lo = lo + Math.imul(al5, bl9) | 0;
                     mid = mid + Math.imul(al5, bh9) | 0;
                     mid = mid + Math.imul(ah5, bl9) | 0;
                     hi = hi + Math.imul(ah5, bh9) | 0;
                     var w14 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
                     c = (hi + (mid >>> 13) | 0) + (w14 >>> 26) | 0;
                     w14 &= 67108863;
                     lo = Math.imul(al9, bl6);
                     mid = Math.imul(al9, bh6);
                     mid = mid + Math.imul(ah9, bl6) | 0;
                     hi = Math.imul(ah9, bh6);
                     lo = lo + Math.imul(al8, bl7) | 0;
                     mid = mid + Math.imul(al8, bh7) | 0;
                     mid = mid + Math.imul(ah8, bl7) | 0;
                     hi = hi + Math.imul(ah8, bh7) | 0;
                     lo = lo + Math.imul(al7, bl8) | 0;
                     mid = mid + Math.imul(al7, bh8) | 0;
                     mid = mid + Math.imul(ah7, bl8) | 0;
                     hi = hi + Math.imul(ah7, bh8) | 0;
                     lo = lo + Math.imul(al6, bl9) | 0;
                     mid = mid + Math.imul(al6, bh9) | 0;
                     mid = mid + Math.imul(ah6, bl9) | 0;
                     hi = hi + Math.imul(ah6, bh9) | 0;
                     var w15 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
                     c = (hi + (mid >>> 13) | 0) + (w15 >>> 26) | 0;
                     w15 &= 67108863;
                     lo = Math.imul(al9, bl7);
                     mid = Math.imul(al9, bh7);
                     mid = mid + Math.imul(ah9, bl7) | 0;
                     hi = Math.imul(ah9, bh7);
                     lo = lo + Math.imul(al8, bl8) | 0;
                     mid = mid + Math.imul(al8, bh8) | 0;
                     mid = mid + Math.imul(ah8, bl8) | 0;
                     hi = hi + Math.imul(ah8, bh8) | 0;
                     lo = lo + Math.imul(al7, bl9) | 0;
                     mid = mid + Math.imul(al7, bh9) | 0;
                     mid = mid + Math.imul(ah7, bl9) | 0;
                     hi = hi + Math.imul(ah7, bh9) | 0;
                     var w16 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
                     c = (hi + (mid >>> 13) | 0) + (w16 >>> 26) | 0;
                     w16 &= 67108863;
                     lo = Math.imul(al9, bl8);
                     mid = Math.imul(al9, bh8);
                     mid = mid + Math.imul(ah9, bl8) | 0;
                     hi = Math.imul(ah9, bh8);
                     lo = lo + Math.imul(al8, bl9) | 0;
                     mid = mid + Math.imul(al8, bh9) | 0;
                     mid = mid + Math.imul(ah8, bl9) | 0;
                     hi = hi + Math.imul(ah8, bh9) | 0;
                     var w17 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
                     c = (hi + (mid >>> 13) | 0) + (w17 >>> 26) | 0;
                     w17 &= 67108863;
                     lo = Math.imul(al9, bl9);
                     mid = Math.imul(al9, bh9);
                     mid = mid + Math.imul(ah9, bl9) | 0;
                     hi = Math.imul(ah9, bh9);
                     var w18 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
                     c = (hi + (mid >>> 13) | 0) + (w18 >>> 26) | 0;
                     w18 &= 67108863;
                     o[0] = w0;
                     o[1] = w1;
                     o[2] = w2;
                     o[3] = w3;
                     o[4] = w4;
                     o[5] = w5;
                     o[6] = w6;
                     o[7] = w7;
                     o[8] = w8;
                     o[9] = w9;
                     o[10] = w10;
                     o[11] = w11;
                     o[12] = w12;
                     o[13] = w13;
                     o[14] = w14;
                     o[15] = w15;
                     o[16] = w16;
                     o[17] = w17;
                     o[18] = w18;
                     if (c !== 0) {
                         o[19] = c;
                         out.length++
                     }
                     return out
                 };
                 if (!Math.imul) {
                     comb10MulTo = smallMulTo
                 }

                 function bigMulTo(self, num, out) {
                     out.negative = num.negative ^ self.negative;
                     out.length = self.length + num.length;
                     var carry = 0;
                     var hncarry = 0;
                     for (var k = 0; k < out.length - 1; k++) {
                         var ncarry = hncarry;
                         hncarry = 0;
                         var rword = carry & 67108863;
                         var maxJ = Math.min(k, num.length - 1);
                         for (var j = Math.max(0, k - self.length + 1); j <= maxJ; j++) {
                             var i = k - j;
                             var a = self.words[i] | 0;
                             var b = num.words[j] | 0;
                             var r = a * b;
                             var lo = r & 67108863;
                             ncarry = ncarry + (r / 67108864 | 0) | 0;
                             lo = lo + rword | 0;
                             rword = lo & 67108863;
                             ncarry = ncarry + (lo >>> 26) | 0;
                             hncarry += ncarry >>> 26;
                             ncarry &= 67108863
                         }
                         out.words[k] = rword;
                         carry = ncarry;
                         ncarry = hncarry
                     }
                     if (carry !== 0) {
                         out.words[k] = carry
                     } else {
                         out.length--
                     }
                     return out.strip()
                 }

                 function jumboMulTo(self, num, out) {
                     var fftm = new FFTM;
                     return fftm.mulp(self, num, out)
                 }
                 BN.prototype.mulTo = function mulTo(num, out) {
                     var res;
                     var len = this.length + num.length;
                     if (this.length === 10 && num.length === 10) {
                         res = comb10MulTo(this, num, out)
                     } else if (len < 63) {
                         res = smallMulTo(this, num, out)
                     } else if (len < 1024) {
                         res = bigMulTo(this, num, out)
                     } else {
                         res = jumboMulTo(this, num, out)
                     }
                     return res
                 };

                 function FFTM(x, y) {
                     this.x = x;
                     this.y = y
                 }
                 FFTM.prototype.makeRBT = function makeRBT(N) {
                     var t = new Array(N);
                     var l = BN.prototype._countBits(N) - 1;
                     for (var i = 0; i < N; i++) {
                         t[i] = this.revBin(i, l, N)
                     }
                     return t
                 };
                 FFTM.prototype.revBin = function revBin(x, l, N) {
                     if (x === 0 || x === N - 1) return x;
                     var rb = 0;
                     for (var i = 0; i < l; i++) {
                         rb |= (x & 1) << l - i - 1;
                         x >>= 1
                     }
                     return rb
                 };
                 FFTM.prototype.permute = function permute(rbt, rws, iws, rtws, itws, N) {
                     for (var i = 0; i < N; i++) {
                         rtws[i] = rws[rbt[i]];
                         itws[i] = iws[rbt[i]]
                     }
                 };
                 FFTM.prototype.transform = function transform(rws, iws, rtws, itws, N, rbt) {
                     this.permute(rbt, rws, iws, rtws, itws, N);
                     for (var s = 1; s < N; s <<= 1) {
                         var l = s << 1;
                         var rtwdf = Math.cos(2 * Math.PI / l);
                         var itwdf = Math.sin(2 * Math.PI / l);
                         for (var p = 0; p < N; p += l) {
                             var rtwdf_ = rtwdf;
                             var itwdf_ = itwdf;
                             for (var j = 0; j < s; j++) {
                                 var re = rtws[p + j];
                                 var ie = itws[p + j];
                                 var ro = rtws[p + j + s];
                                 var io = itws[p + j + s];
                                 var rx = rtwdf_ * ro - itwdf_ * io;
                                 io = rtwdf_ * io + itwdf_ * ro;
                                 ro = rx;
                                 rtws[p + j] = re + ro;
                                 itws[p + j] = ie + io;
                                 rtws[p + j + s] = re - ro;
                                 itws[p + j + s] = ie - io;
                                 if (j !== l) {
                                     rx = rtwdf * rtwdf_ - itwdf * itwdf_;
                                     itwdf_ = rtwdf * itwdf_ + itwdf * rtwdf_;
                                     rtwdf_ = rx
                                 }
                             }
                         }
                     }
                 };
                 FFTM.prototype.guessLen13b = function guessLen13b(n, m) {
                     var N = Math.max(m, n) | 1;
                     var odd = N & 1;
                     var i = 0;
                     for (N = N / 2 | 0; N; N = N >>> 1) {
                         i++
                     }
                     return 1 << i + 1 + odd
                 };
                 FFTM.prototype.conjugate = function conjugate(rws, iws, N) {
                     if (N <= 1) return;
                     for (var i = 0; i < N / 2; i++) {
                         var t = rws[i];
                         rws[i] = rws[N - i - 1];
                         rws[N - i - 1] = t;
                         t = iws[i];
                         iws[i] = -iws[N - i - 1];
                         iws[N - i - 1] = -t
                     }
                 };
                 FFTM.prototype.normalize13b = function normalize13b(ws, N) {
                     var carry = 0;
                     for (var i = 0; i < N / 2; i++) {
                         var w = Math.round(ws[2 * i + 1] / N) * 8192 + Math.round(ws[2 * i] / N) + carry;
                         ws[i] = w & 67108863;
                         if (w < 67108864) {
                             carry = 0
                         } else {
                             carry = w / 67108864 | 0
                         }
                     }
                     return ws
                 };
                 FFTM.prototype.convert13b = function convert13b(ws, len, rws, N) {
                     var carry = 0;
                     for (var i = 0; i < len; i++) {
                         carry = carry + (ws[i] | 0);
                         rws[2 * i] = carry & 8191;
                         carry = carry >>> 13;
                         rws[2 * i + 1] = carry & 8191;
                         carry = carry >>> 13
                     }
                     for (i = 2 * len; i < N; ++i) {
                         rws[i] = 0
                     }
                     assert(carry === 0);
                     assert((carry & ~8191) === 0)
                 };
                 FFTM.prototype.stub = function stub(N) {
                     var ph = new Array(N);
                     for (var i = 0; i < N; i++) {
                         ph[i] = 0
                     }
                     return ph
                 };
                 FFTM.prototype.mulp = function mulp(x, y, out) {
                     var N = 2 * this.guessLen13b(x.length, y.length);
                     var rbt = this.makeRBT(N);
                     var _ = this.stub(N);
                     var rws = new Array(N);
                     var rwst = new Array(N);
                     var iwst = new Array(N);
                     var nrws = new Array(N);
                     var nrwst = new Array(N);
                     var niwst = new Array(N);
                     var rmws = out.words;
                     rmws.length = N;
                     this.convert13b(x.words, x.length, rws, N);
                     this.convert13b(y.words, y.length, nrws, N);
                     this.transform(rws, _, rwst, iwst, N, rbt);
                     this.transform(nrws, _, nrwst, niwst, N, rbt);
                     for (var i = 0; i < N; i++) {
                         var rx = rwst[i] * nrwst[i] - iwst[i] * niwst[i];
                         iwst[i] = rwst[i] * niwst[i] + iwst[i] * nrwst[i];
                         rwst[i] = rx
                     }
                     this.conjugate(rwst, iwst, N);
                     this.transform(rwst, iwst, rmws, _, N, rbt);
                     this.conjugate(rmws, _, N);
                     this.normalize13b(rmws, N);
                     out.negative = x.negative ^ y.negative;
                     out.length = x.length + y.length;
                     return out.strip()
                 };
                 BN.prototype.mul = function mul(num) {
                     var out = new BN(null);
                     out.words = new Array(this.length + num.length);
                     return this.mulTo(num, out)
                 };
                 BN.prototype.mulf = function mulf(num) {
                     var out = new BN(null);
                     out.words = new Array(this.length + num.length);
                     return jumboMulTo(this, num, out)
                 };
                 BN.prototype.imul = function imul(num) {
                     return this.clone().mulTo(num, this)
                 };
                 BN.prototype.imuln = function imuln(num) {
                     assert(typeof num === "number");
                     assert(num < 67108864);
                     var carry = 0;
                     for (var i = 0; i < this.length; i++) {
                         var w = (this.words[i] | 0) * num;
                         var lo = (w & 67108863) + (carry & 67108863);
                         carry >>= 26;
                         carry += w / 67108864 | 0;
                         carry += lo >>> 26;
                         this.words[i] = lo & 67108863
                     }
                     if (carry !== 0) {
                         this.words[i] = carry;
                         this.length++
                     }
                     return this
                 };
                 BN.prototype.muln = function muln(num) {
                     return this.clone().imuln(num)
                 };
                 BN.prototype.sqr = function sqr() {
                     return this.mul(this)
                 };
                 BN.prototype.isqr = function isqr() {
                     return this.imul(this.clone())
                 };
                 BN.prototype.pow = function pow(num) {
                     var w = toBitArray(num);
                     if (w.length === 0) return new BN(1);
                     var res = this;
                     for (var i = 0; i < w.length; i++, res = res.sqr()) {
                         if (w[i] !== 0) break
                     }
                     if (++i < w.length) {
                         for (var q = res.sqr(); i < w.length; i++, q = q.sqr()) {
                             if (w[i] === 0) continue;
                             res = res.mul(q)
                         }
                     }
                     return res
                 };
                 BN.prototype.iushln = function iushln(bits) {
                     assert(typeof bits === "number" && bits >= 0);
                     var r = bits % 26;
                     var s = (bits - r) / 26;
                     var carryMask = 67108863 >>> 26 - r << 26 - r;
                     var i;
                     if (r !== 0) {
                         var carry = 0;
                         for (i = 0; i < this.length; i++) {
                             var newCarry = this.words[i] & carryMask;
                             var c = (this.words[i] | 0) - newCarry << r;
                             this.words[i] = c | carry;
                             carry = newCarry >>> 26 - r
                         }
                         if (carry) {
                             this.words[i] = carry;
                             this.length++
                         }
                     }
                     if (s !== 0) {
                         for (i = this.length - 1; i >= 0; i--) {
                             this.words[i + s] = this.words[i]
                         }
                         for (i = 0; i < s; i++) {
                             this.words[i] = 0
                         }
                         this.length += s
                     }
                     return this.strip()
                 };
                 BN.prototype.ishln = function ishln(bits) {
                     assert(this.negative === 0);
                     return this.iushln(bits)
                 };
                 BN.prototype.iushrn = function iushrn(bits, hint, extended) {
                     assert(typeof bits === "number" && bits >= 0);
                     var h;
                     if (hint) {
                         h = (hint - hint % 26) / 26
                     } else {
                         h = 0
                     }
                     var r = bits % 26;
                     var s = Math.min((bits - r) / 26, this.length);
                     var mask = 67108863 ^ 67108863 >>> r << r;
                     var maskedWords = extended;
                     h -= s;
                     h = Math.max(0, h);
                     if (maskedWords) {
                         for (var i = 0; i < s; i++) {
                             maskedWords.words[i] = this.words[i]
                         }
                         maskedWords.length = s
                     }
                     if (s === 0) {} else if (this.length > s) {
                         this.length -= s;
                         for (i = 0; i < this.length; i++) {
                             this.words[i] = this.words[i + s]
                         }
                     } else {
                         this.words[0] = 0;
                         this.length = 1
                     }
                     var carry = 0;
                     for (i = this.length - 1; i >= 0 && (carry !== 0 || i >= h); i--) {
                         var word = this.words[i] | 0;
                         this.words[i] = carry << 26 - r | word >>> r;
                         carry = word & mask
                     }
                     if (maskedWords && carry !== 0) {
                         maskedWords.words[maskedWords.length++] = carry
                     }
                     if (this.length === 0) {
                         this.words[0] = 0;
                         this.length = 1
                     }
                     return this.strip()
                 };
                 BN.prototype.ishrn = function ishrn(bits, hint, extended) {
                     assert(this.negative === 0);
                     return this.iushrn(bits, hint, extended)
                 };
                 BN.prototype.shln = function shln(bits) {
                     return this.clone().ishln(bits)
                 };
                 BN.prototype.ushln = function ushln(bits) {
                     return this.clone().iushln(bits)
                 };
                 BN.prototype.shrn = function shrn(bits) {
                     return this.clone().ishrn(bits)
                 };
                 BN.prototype.ushrn = function ushrn(bits) {
                     return this.clone().iushrn(bits)
                 };
                 BN.prototype.testn = function testn(bit) {
                     assert(typeof bit === "number" && bit >= 0);
                     var r = bit % 26;
                     var s = (bit - r) / 26;
                     var q = 1 << r;
                     if (this.length <= s) return false;
                     var w = this.words[s];
                     return !!(w & q)
                 };
                 BN.prototype.imaskn = function imaskn(bits) {
                     assert(typeof bits === "number" && bits >= 0);
                     var r = bits % 26;
                     var s = (bits - r) / 26;
                     assert(this.negative === 0, "imaskn works only with positive numbers");
                     if (this.length <= s) {
                         return this
                     }
                     if (r !== 0) {
                         s++
                     }
                     this.length = Math.min(s, this.length);
                     if (r !== 0) {
                         var mask = 67108863 ^ 67108863 >>> r << r;
                         this.words[this.length - 1] &= mask
                     }
                     return this.strip()
                 };
                 BN.prototype.maskn = function maskn(bits) {
                     return this.clone().imaskn(bits)
                 };
                 BN.prototype.iaddn = function iaddn(num) {
                     assert(typeof num === "number");
                     assert(num < 67108864);
                     if (num < 0) return this.isubn(-num);
                     if (this.negative !== 0) {
                         if (this.length === 1 && (this.words[0] | 0) < num) {
                             this.words[0] = num - (this.words[0] | 0);
                             this.negative = 0;
                             return this
                         }
                         this.negative = 0;
                         this.isubn(num);
                         this.negative = 1;
                         return this
                     }
                     return this._iaddn(num)
                 };
                 BN.prototype._iaddn = function _iaddn(num) {
                     this.words[0] += num;
                     for (var i = 0; i < this.length && this.words[i] >= 67108864; i++) {
                         this.words[i] -= 67108864;
                         if (i === this.length - 1) {
                             this.words[i + 1] = 1
                         } else {
                             this.words[i + 1]++
                         }
                     }
                     this.length = Math.max(this.length, i + 1);
                     return this
                 };
                 BN.prototype.isubn = function isubn(num) {
                     assert(typeof num === "number");
                     assert(num < 67108864);
                     if (num < 0) return this.iaddn(-num);
                     if (this.negative !== 0) {
                         this.negative = 0;
                         this.iaddn(num);
                         this.negative = 1;
                         return this
                     }
                     this.words[0] -= num;
                     if (this.length === 1 && this.words[0] < 0) {
                         this.words[0] = -this.words[0];
                         this.negative = 1
                     } else {
                         for (var i = 0; i < this.length && this.words[i] < 0; i++) {
                             this.words[i] += 67108864;
                             this.words[i + 1] -= 1
                         }
                     }
                     return this.strip()
                 };
                 BN.prototype.addn = function addn(num) {
                     return this.clone().iaddn(num)
                 };
                 BN.prototype.subn = function subn(num) {
                     return this.clone().isubn(num)
                 };
                 BN.prototype.iabs = function iabs() {
                     this.negative = 0;
                     return this
                 };
                 BN.prototype.abs = function abs() {
                     return this.clone().iabs()
                 };
                 BN.prototype._ishlnsubmul = function _ishlnsubmul(num, mul, shift) {
                     var len = num.length + shift;
                     var i;
                     this._expand(len);
                     var w;
                     var carry = 0;
                     for (i = 0; i < num.length; i++) {
                         w = (this.words[i + shift] | 0) + carry;
                         var right = (num.words[i] | 0) * mul;
                         w -= right & 67108863;
                         carry = (w >> 26) - (right / 67108864 | 0);
                         this.words[i + shift] = w & 67108863
                     }
                     for (; i < this.length - shift; i++) {
                         w = (this.words[i + shift] | 0) + carry;
                         carry = w >> 26;
                         this.words[i + shift] = w & 67108863
                     }
                     if (carry === 0) return this.strip();
                     assert(carry === -1);
                     carry = 0;
                     for (i = 0; i < this.length; i++) {
                         w = -(this.words[i] | 0) + carry;
                         carry = w >> 26;
                         this.words[i] = w & 67108863
                     }
                     this.negative = 1;
                     return this.strip()
                 };
                 BN.prototype._wordDiv = function _wordDiv(num, mode) {
                     var shift = this.length - num.length;
                     var a = this.clone();
                     var b = num;
                     var bhi = b.words[b.length - 1] | 0;
                     var bhiBits = this._countBits(bhi);
                     shift = 26 - bhiBits;
                     if (shift !== 0) {
                         b = b.ushln(shift);
                         a.iushln(shift);
                         bhi = b.words[b.length - 1] | 0
                     }
                     var m = a.length - b.length;
                     var q;
                     if (mode !== "mod") {
                         q = new BN(null);
                         q.length = m + 1;
                         q.words = new Array(q.length);
                         for (var i = 0; i < q.length; i++) {
                             q.words[i] = 0
                         }
                     }
                     var diff = a.clone()._ishlnsubmul(b, 1, m);
                     if (diff.negative === 0) {
                         a = diff;
                         if (q) {
                             q.words[m] = 1
                         }
                     }
                     for (var j = m - 1; j >= 0; j--) {
                         var qj = (a.words[b.length + j] | 0) * 67108864 + (a.words[b.length + j - 1] | 0);
                         qj = Math.min(qj / bhi | 0, 67108863);
                         a._ishlnsubmul(b, qj, j);
                         while (a.negative !== 0) {
                             qj--;
                             a.negative = 0;
                             a._ishlnsubmul(b, 1, j);
                             if (!a.isZero()) {
                                 a.negative ^= 1
                             }
                         }
                         if (q) {
                             q.words[j] = qj
                         }
                     }
                     if (q) {
                         q.strip()
                     }
                     a.strip();
                     if (mode !== "div" && shift !== 0) {
                         a.iushrn(shift)
                     }
                     return {
                         div: q || null,
                         mod: a
                     }
                 };
                 BN.prototype.divmod = function divmod(num, mode, positive) {
                     assert(!num.isZero());
                     if (this.isZero()) {
                         return {
                             div: new BN(0),
                             mod: new BN(0)
                         }
                     }
                     var div, mod, res;
                     if (this.negative !== 0 && num.negative === 0) {
                         res = this.neg().divmod(num, mode);
                         if (mode !== "mod") {
                             div = res.div.neg()
                         }
                         if (mode !== "div") {
                             mod = res.mod.neg();
                             if (positive && mod.negative !== 0) {
                                 mod.iadd(num)
                             }
                         }
                         return {
                             div: div,
                             mod: mod
                         }
                     }
                     if (this.negative === 0 && num.negative !== 0) {
                         res = this.divmod(num.neg(), mode);
                         if (mode !== "mod") {
                             div = res.div.neg()
                         }
                         return {
                             div: div,
                             mod: res.mod
                         }
                     }
                     if ((this.negative & num.negative) !== 0) {
                         res = this.neg().divmod(num.neg(), mode);
                         if (mode !== "div") {
                             mod = res.mod.neg();
                             if (positive && mod.negative !== 0) {
                                 mod.isub(num)
                             }
                         }
                         return {
                             div: res.div,
                             mod: mod
                         }
                     }
                     if (num.length > this.length || this.cmp(num) < 0) {
                         return {
                             div: new BN(0),
                             mod: this
                         }
                     }
                     if (num.length === 1) {
                         if (mode === "div") {
                             return {
                                 div: this.divn(num.words[0]),
                                 mod: null
                             }
                         }
                         if (mode === "mod") {
                             return {
                                 div: null,
                                 mod: new BN(this.modn(num.words[0]))
                             }
                         }
                         return {
                             div: this.divn(num.words[0]),
                             mod: new BN(this.modn(num.words[0]))
                         }
                     }
                     return this._wordDiv(num, mode)
                 };
                 BN.prototype.div = function div(num) {
                     return this.divmod(num, "div", false).div
                 };
                 BN.prototype.mod = function mod(num) {
                     return this.divmod(num, "mod", false).mod
                 };
                 BN.prototype.umod = function umod(num) {
                     return this.divmod(num, "mod", true).mod
                 };
                 BN.prototype.divRound = function divRound(num) {
                     var dm = this.divmod(num);
                     if (dm.mod.isZero()) return dm.div;
                     var mod = dm.div.negative !== 0 ? dm.mod.isub(num) : dm.mod;
                     var half = num.ushrn(1);
                     var r2 = num.andln(1);
                     var cmp = mod.cmp(half);
                     if (cmp < 0 || r2 === 1 && cmp === 0) return dm.div;
                     return dm.div.negative !== 0 ? dm.div.isubn(1) : dm.div.iaddn(1)
                 };
                 BN.prototype.modn = function modn(num) {
                     assert(num <= 67108863);
                     var p = (1 << 26) % num;
                     var acc = 0;
                     for (var i = this.length - 1; i >= 0; i--) {
                         acc = (p * acc + (this.words[i] | 0)) % num
                     }
                     return acc
                 };
                 BN.prototype.idivn = function idivn(num) {
                     assert(num <= 67108863);
                     var carry = 0;
                     for (var i = this.length - 1; i >= 0; i--) {
                         var w = (this.words[i] | 0) + carry * 67108864;
                         this.words[i] = w / num | 0;
                         carry = w % num
                     }
                     return this.strip()
                 };
                 BN.prototype.divn = function divn(num) {
                     return this.clone().idivn(num)
                 };
                 BN.prototype.egcd = function egcd(p) {
                     assert(p.negative === 0);
                     assert(!p.isZero());
                     var x = this;
                     var y = p.clone();
                     if (x.negative !== 0) {
                         x = x.umod(p)
                     } else {
                         x = x.clone()
                     }
                     var A = new BN(1);
                     var B = new BN(0);
                     var C = new BN(0);
                     var D = new BN(1);
                     var g = 0;
                     while (x.isEven() && y.isEven()) {
                         x.iushrn(1);
                         y.iushrn(1);
                         ++g
                     }
                     var yp = y.clone();
                     var xp = x.clone();
                     while (!x.isZero()) {
                         for (var i = 0, im = 1;
                             (x.words[0] & im) === 0 && i < 26; ++i, im <<= 1);
                         if (i > 0) {
                             x.iushrn(i);
                             while (i-- > 0) {
                                 if (A.isOdd() || B.isOdd()) {
                                     A.iadd(yp);
                                     B.isub(xp)
                                 }
                                 A.iushrn(1);
                                 B.iushrn(1)
                             }
                         }
                         for (var j = 0, jm = 1;
                             (y.words[0] & jm) === 0 && j < 26; ++j, jm <<= 1);
                         if (j > 0) {
                             y.iushrn(j);
                             while (j-- > 0) {
                                 if (C.isOdd() || D.isOdd()) {
                                     C.iadd(yp);
                                     D.isub(xp)
                                 }
                                 C.iushrn(1);
                                 D.iushrn(1)
                             }
                         }
                         if (x.cmp(y) >= 0) {
                             x.isub(y);
                             A.isub(C);
                             B.isub(D)
                         } else {
                             y.isub(x);
                             C.isub(A);
                             D.isub(B)
                         }
                     }
                     return {
                         a: C,
                         b: D,
                         gcd: y.iushln(g)
                     }
                 };
                 BN.prototype._invmp = function _invmp(p) {
                     assert(p.negative === 0);
                     assert(!p.isZero());
                     var a = this;
                     var b = p.clone();
                     if (a.negative !== 0) {
                         a = a.umod(p)
                     } else {
                         a = a.clone()
                     }
                     var x1 = new BN(1);
                     var x2 = new BN(0);
                     var delta = b.clone();
                     while (a.cmpn(1) > 0 && b.cmpn(1) > 0) {
                         for (var i = 0, im = 1;
                             (a.words[0] & im) === 0 && i < 26; ++i, im <<= 1);
                         if (i > 0) {
                             a.iushrn(i);
                             while (i-- > 0) {
                                 if (x1.isOdd()) {
                                     x1.iadd(delta)
                                 }
                                 x1.iushrn(1)
                             }
                         }
                         for (var j = 0, jm = 1;
                             (b.words[0] & jm) === 0 && j < 26; ++j, jm <<= 1);
                         if (j > 0) {
                             b.iushrn(j);
                             while (j-- > 0) {
                                 if (x2.isOdd()) {
                                     x2.iadd(delta)
                                 }
                                 x2.iushrn(1)
                             }
                         }
                         if (a.cmp(b) >= 0) {
                             a.isub(b);
                             x1.isub(x2)
                         } else {
                             b.isub(a);
                             x2.isub(x1)
                         }
                     }
                     var res;
                     if (a.cmpn(1) === 0) {
                         res = x1
                     } else {
                         res = x2
                     }
                     if (res.cmpn(0) < 0) {
                         res.iadd(p)
                     }
                     return res
                 };
                 BN.prototype.gcd = function gcd(num) {
                     if (this.isZero()) return num.abs();
                     if (num.isZero()) return this.abs();
                     var a = this.clone();
                     var b = num.clone();
                     a.negative = 0;
                     b.negative = 0;
                     for (var shift = 0; a.isEven() && b.isEven(); shift++) {
                         a.iushrn(1);
                         b.iushrn(1)
                     }
                     do {
                         while (a.isEven()) {
                             a.iushrn(1)
                         }
                         while (b.isEven()) {
                             b.iushrn(1)
                         }
                         var r = a.cmp(b);
                         if (r < 0) {
                             var t = a;
                             a = b;
                             b = t
                         } else if (r === 0 || b.cmpn(1) === 0) {
                             break
                         }
                         a.isub(b)
                     } while (true);
                     return b.iushln(shift)
                 };
                 BN.prototype.invm = function invm(num) {
                     return this.egcd(num).a.umod(num)
                 };
                 BN.prototype.isEven = function isEven() {
                     return (this.words[0] & 1) === 0
                 };
                 BN.prototype.isOdd = function isOdd() {
                     return (this.words[0] & 1) === 1
                 };
                 BN.prototype.andln = function andln(num) {
                     return this.words[0] & num
                 };
                 BN.prototype.bincn = function bincn(bit) {
                     assert(typeof bit === "number");
                     var r = bit % 26;
                     var s = (bit - r) / 26;
                     var q = 1 << r;
                     if (this.length <= s) {
                         this._expand(s + 1);
                         this.words[s] |= q;
                         return this
                     }
                     var carry = q;
                     for (var i = s; carry !== 0 && i < this.length; i++) {
                         var w = this.words[i] | 0;
                         w += carry;
                         carry = w >>> 26;
                         w &= 67108863;
                         this.words[i] = w
                     }
                     if (carry !== 0) {
                         this.words[i] = carry;
                         this.length++
                     }
                     return this
                 };
                 BN.prototype.isZero = function isZero() {
                     return this.length === 1 && this.words[0] === 0
                 };
                 BN.prototype.cmpn = function cmpn(num) {
                     var negative = num < 0;
                     if (this.negative !== 0 && !negative) return -1;
                     if (this.negative === 0 && negative) return 1;
                     this.strip();
                     var res;
                     if (this.length > 1) {
                         res = 1
                     } else {
                         if (negative) {
                             num = -num
                         }
                         assert(num <= 67108863, "Number is too big");
                         var w = this.words[0] | 0;
                         res = w === num ? 0 : w < num ? -1 : 1
                     }
                     if (this.negative !== 0) return -res | 0;
                     return res
                 };
                 BN.prototype.cmp = function cmp(num) {
                     if (this.negative !== 0 && num.negative === 0) return -1;
                     if (this.negative === 0 && num.negative !== 0) return 1;
                     var res = this.ucmp(num);
                     if (this.negative !== 0) return -res | 0;
                     return res
                 };
                 BN.prototype.ucmp = function ucmp(num) {
                     if (this.length > num.length) return 1;
                     if (this.length < num.length) return -1;
                     var res = 0;
                     for (var i = this.length - 1; i >= 0; i--) {
                         var a = this.words[i] | 0;
                         var b = num.words[i] | 0;
                         if (a === b) continue;
                         if (a < b) {
                             res = -1
                         } else if (a > b) {
                             res = 1
                         }
                         break
                     }
                     return res
                 };
                 BN.prototype.gtn = function gtn(num) {
                     return this.cmpn(num) === 1
                 };
                 BN.prototype.gt = function gt(num) {
                     return this.cmp(num) === 1
                 };
                 BN.prototype.gten = function gten(num) {
                     return this.cmpn(num) >= 0
                 };
                 BN.prototype.gte = function gte(num) {
                     return this.cmp(num) >= 0
                 };
                 BN.prototype.ltn = function ltn(num) {
                     return this.cmpn(num) === -1
                 };
                 BN.prototype.lt = function lt(num) {
                     return this.cmp(num) === -1
                 };
                 BN.prototype.lten = function lten(num) {
                     return this.cmpn(num) <= 0
                 };
                 BN.prototype.lte = function lte(num) {
                     return this.cmp(num) <= 0
                 };
                 BN.prototype.eqn = function eqn(num) {
                     return this.cmpn(num) === 0
                 };
                 BN.prototype.eq = function eq(num) {
                     return this.cmp(num) === 0
                 };
                 BN.red = function red(num) {
                     return new Red(num)
                 };
                 BN.prototype.toRed = function toRed(ctx) {
                     assert(!this.red, "Already a number in reduction context");
                     assert(this.negative === 0, "red works only with positives");
                     return ctx.convertTo(this)._forceRed(ctx)
                 };
                 BN.prototype.fromRed = function fromRed() {
                     assert(this.red, "fromRed works only with numbers in reduction context");
                     return this.red.convertFrom(this)
                 };
                 BN.prototype._forceRed = function _forceRed(ctx) {
                     this.red = ctx;
                     return this
                 };
                 BN.prototype.forceRed = function forceRed(ctx) {
                     assert(!this.red, "Already a number in reduction context");
                     return this._forceRed(ctx)
                 };
                 BN.prototype.redAdd = function redAdd(num) {
                     assert(this.red, "redAdd works only with red numbers");
                     return this.red.add(this, num)
                 };
                 BN.prototype.redIAdd = function redIAdd(num) {
                     assert(this.red, "redIAdd works only with red numbers");
                     return this.red.iadd(this, num)
                 };
                 BN.prototype.redSub = function redSub(num) {
                     assert(this.red, "redSub works only with red numbers");
                     return this.red.sub(this, num)
                 };
                 BN.prototype.redISub = function redISub(num) {
                     assert(this.red, "redISub works only with red numbers");
                     return this.red.isub(this, num)
                 };
                 BN.prototype.redShl = function redShl(num) {
                     assert(this.red, "redShl works only with red numbers");
                     return this.red.shl(this, num)
                 };
                 BN.prototype.redMul = function redMul(num) {
                     assert(this.red, "redMul works only with red numbers");
                     this.red._verify2(this, num);
                     return this.red.mul(this, num)
                 };
                 BN.prototype.redIMul = function redIMul(num) {
                     assert(this.red, "redMul works only with red numbers");
                     this.red._verify2(this, num);
                     return this.red.imul(this, num)
                 };
                 BN.prototype.redSqr = function redSqr() {
                     assert(this.red, "redSqr works only with red numbers");
                     this.red._verify1(this);
                     return this.red.sqr(this)
                 };
                 BN.prototype.redISqr = function redISqr() {
                     assert(this.red, "redISqr works only with red numbers");
                     this.red._verify1(this);
                     return this.red.isqr(this)
                 };
                 BN.prototype.redSqrt = function redSqrt() {
                     assert(this.red, "redSqrt works only with red numbers");
                     this.red._verify1(this);
                     return this.red.sqrt(this)
                 };
                 BN.prototype.redInvm = function redInvm() {
                     assert(this.red, "redInvm works only with red numbers");
                     this.red._verify1(this);
                     return this.red.invm(this)
                 };
                 BN.prototype.redNeg = function redNeg() {
                     assert(this.red, "redNeg works only with red numbers");
                     this.red._verify1(this);
                     return this.red.neg(this)
                 };
                 BN.prototype.redPow = function redPow(num) {
                     assert(this.red && !num.red, "redPow(normalNum)");
                     this.red._verify1(this);
                     return this.red.pow(this, num)
                 };
                 var primes = {
                     k256: null,
                     p224: null,
                     p192: null,
                     p25519: null
                 };

                 function MPrime(name, p) {
                     this.name = name;
                     this.p = new BN(p, 16);
                     this.n = this.p.bitLength();
                     this.k = new BN(1).iushln(this.n).isub(this.p);
                     this.tmp = this._tmp()
                 }
                 MPrime.prototype._tmp = function _tmp() {
                     var tmp = new BN(null);
                     tmp.words = new Array(Math.ceil(this.n / 13));
                     return tmp
                 };
                 MPrime.prototype.ireduce = function ireduce(num) {
                     var r = num;
                     var rlen;
                     do {
                         this.split(r, this.tmp);
                         r = this.imulK(r);
                         r = r.iadd(this.tmp);
                         rlen = r.bitLength()
                     } while (rlen > this.n);
                     var cmp = rlen < this.n ? -1 : r.ucmp(this.p);
                     if (cmp === 0) {
                         r.words[0] = 0;
                         r.length = 1
                     } else if (cmp > 0) {
                         r.isub(this.p)
                     } else {
                         r.strip()
                     }
                     return r
                 };
                 MPrime.prototype.split = function split(input, out) {
                     input.iushrn(this.n, 0, out)
                 };
                 MPrime.prototype.imulK = function imulK(num) {
                     return num.imul(this.k)
                 };

                 function K256() {
                     MPrime.call(this, "k256", "ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f")
                 }
                 inherits(K256, MPrime);
                 K256.prototype.split = function split(input, output) {
                     var mask = 4194303;
                     var outLen = Math.min(input.length, 9);
                     for (var i = 0; i < outLen; i++) {
                         output.words[i] = input.words[i]
                     }
                     output.length = outLen;
                     if (input.length <= 9) {
                         input.words[0] = 0;
                         input.length = 1;
                         return
                     }
                     var prev = input.words[9];
                     output.words[output.length++] = prev & mask;
                     for (i = 10; i < input.length; i++) {
                         var next = input.words[i] | 0;
                         input.words[i - 10] = (next & mask) << 4 | prev >>> 22;
                         prev = next
                     }
                     prev >>>= 22;
                     input.words[i - 10] = prev;
                     if (prev === 0 && input.length > 10) {
                         input.length -= 10
                     } else {
                         input.length -= 9
                     }
                 };
                 K256.prototype.imulK = function imulK(num) {
                     num.words[num.length] = 0;
                     num.words[num.length + 1] = 0;
                     num.length += 2;
                     var lo = 0;
                     for (var i = 0; i < num.length; i++) {
                         var w = num.words[i] | 0;
                         lo += w * 977;
                         num.words[i] = lo & 67108863;
                         lo = w * 64 + (lo / 67108864 | 0)
                     }
                     if (num.words[num.length - 1] === 0) {
                         num.length--;
                         if (num.words[num.length - 1] === 0) {
                             num.length--
                         }
                     }
                     return num
                 };

                 function P224() {
                     MPrime.call(this, "p224", "ffffffff ffffffff ffffffff ffffffff 00000000 00000000 00000001")
                 }
                 inherits(P224, MPrime);

                 function P192() {
                     MPrime.call(this, "p192", "ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff")
                 }
                 inherits(P192, MPrime);

                 function P25519() {
                     MPrime.call(this, "25519", "7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed")
                 }
                 inherits(P25519, MPrime);
                 P25519.prototype.imulK = function imulK(num) {
                     var carry = 0;
                     for (var i = 0; i < num.length; i++) {
                         var hi = (num.words[i] | 0) * 19 + carry;
                         var lo = hi & 67108863;
                         hi >>>= 26;
                         num.words[i] = lo;
                         carry = hi
                     }
                     if (carry !== 0) {
                         num.words[num.length++] = carry
                     }
                     return num
                 };
                 BN._prime = function prime(name) {
                     if (primes[name]) return primes[name];
                     var prime;
                     if (name === "k256") {
                         prime = new K256
                     } else if (name === "p224") {
                         prime = new P224
                     } else if (name === "p192") {
                         prime = new P192
                     } else if (name === "p25519") {
                         prime = new P25519
                     } else {
                         throw new Error("Unknown prime " + name)
                     }
                     primes[name] = prime;
                     return prime
                 };

                 function Red(m) {
                     if (typeof m === "string") {
                         var prime = BN._prime(m);
                         this.m = prime.p;
                         this.prime = prime
                     } else {
                         assert(m.gtn(1), "modulus must be greater than 1");
                         this.m = m;
                         this.prime = null
                     }
                 }
                 Red.prototype._verify1 = function _verify1(a) {
                     assert(a.negative === 0, "red works only with positives");
                     assert(a.red, "red works only with red numbers")
                 };
                 Red.prototype._verify2 = function _verify2(a, b) {
                     assert((a.negative | b.negative) === 0, "red works only with positives");
                     assert(a.red && a.red === b.red, "red works only with red numbers")
                 };
                 Red.prototype.imod = function imod(a) {
                     if (this.prime) return this.prime.ireduce(a)._forceRed(this);
                     return a.umod(this.m)._forceRed(this)
                 };
                 Red.prototype.neg = function neg(a) {
                     if (a.isZero()) {
                         return a.clone()
                     }
                     return this.m.sub(a)._forceRed(this)
                 };
                 Red.prototype.add = function add(a, b) {
                     this._verify2(a, b);
                     var res = a.add(b);
                     if (res.cmp(this.m) >= 0) {
                         res.isub(this.m)
                     }
                     return res._forceRed(this)
                 };
                 Red.prototype.iadd = function iadd(a, b) {
                     this._verify2(a, b);
                     var res = a.iadd(b);
                     if (res.cmp(this.m) >= 0) {
                         res.isub(this.m)
                     }
                     return res
                 };
                 Red.prototype.sub = function sub(a, b) {
                     this._verify2(a, b);
                     var res = a.sub(b);
                     if (res.cmpn(0) < 0) {
                         res.iadd(this.m)
                     }
                     return res._forceRed(this)
                 };
                 Red.prototype.isub = function isub(a, b) {
                     this._verify2(a, b);
                     var res = a.isub(b);
                     if (res.cmpn(0) < 0) {
                         res.iadd(this.m)
                     }
                     return res
                 };
                 Red.prototype.shl = function shl(a, num) {
                     this._verify1(a);
                     return this.imod(a.ushln(num))
                 };
                 Red.prototype.imul = function imul(a, b) {
                     this._verify2(a, b);
                     return this.imod(a.imul(b))
                 };
                 Red.prototype.mul = function mul(a, b) {
                     this._verify2(a, b);
                     return this.imod(a.mul(b))
                 };
                 Red.prototype.isqr = function isqr(a) {
                     return this.imul(a, a.clone())
                 };
                 Red.prototype.sqr = function sqr(a) {
                     return this.mul(a, a)
                 };
                 Red.prototype.sqrt = function sqrt(a) {
                     if (a.isZero()) return a.clone();
                     var mod3 = this.m.andln(3);
                     assert(mod3 % 2 === 1);
                     if (mod3 === 3) {
                         var pow = this.m.add(new BN(1)).iushrn(2);
                         return this.pow(a, pow)
                     }
                     var q = this.m.subn(1);
                     var s = 0;
                     while (!q.isZero() && q.andln(1) === 0) {
                         s++;
                         q.iushrn(1)
                     }
                     assert(!q.isZero());
                     var one = new BN(1).toRed(this);
                     var nOne = one.redNeg();
                     var lpow = this.m.subn(1).iushrn(1);
                     var z = this.m.bitLength();
                     z = new BN(2 * z * z).toRed(this);
                     while (this.pow(z, lpow).cmp(nOne) !== 0) {
                         z.redIAdd(nOne)
                     }
                     var c = this.pow(z, q);
                     var r = this.pow(a, q.addn(1).iushrn(1));
                     var t = this.pow(a, q);
                     var m = s;
                     while (t.cmp(one) !== 0) {
                         var tmp = t;
                         for (var i = 0; tmp.cmp(one) !== 0; i++) {
                             tmp = tmp.redSqr()
                         }
                         assert(i < m);
                         var b = this.pow(c, new BN(1).iushln(m - i - 1));
                         r = r.redMul(b);
                         c = b.redSqr();
                         t = t.redMul(c);
                         m = i
                     }
                     return r
                 };
                 Red.prototype.invm = function invm(a) {
                     var inv = a._invmp(this.m);
                     if (inv.negative !== 0) {
                         inv.negative = 0;
                         return this.imod(inv).redNeg()
                     } else {
                         return this.imod(inv)
                     }
                 };
                 Red.prototype.pow = function pow(a, num) {
                     if (num.isZero()) return new BN(1).toRed(this);
                     if (num.cmpn(1) === 0) return a.clone();
                     var windowSize = 4;
                     var wnd = new Array(1 << windowSize);
                     wnd[0] = new BN(1).toRed(this);
                     wnd[1] = a;
                     for (var i = 2; i < wnd.length; i++) {
                         wnd[i] = this.mul(wnd[i - 1], a)
                     }
                     var res = wnd[0];
                     var current = 0;
                     var currentLen = 0;
                     var start = num.bitLength() % 26;
                     if (start === 0) {
                         start = 26
                     }
                     for (i = num.length - 1; i >= 0; i--) {
                         var word = num.words[i];
                         for (var j = start - 1; j >= 0; j--) {
                             var bit = word >> j & 1;
                             if (res !== wnd[0]) {
                                 res = this.sqr(res)
                             }
                             if (bit === 0 && current === 0) {
                                 currentLen = 0;
                                 continue
                             }
                             current <<= 1;
                             current |= bit;
                             currentLen++;
                             if (currentLen !== windowSize && (i !== 0 || j !== 0)) continue;
                             res = this.mul(res, wnd[current]);
                             currentLen = 0;
                             current = 0
                         }
                         start = 26
                     }
                     return res
                 };
                 Red.prototype.convertTo = function convertTo(num) {
                     var r = num.umod(this.m);
                     return r === num ? r.clone() : r
                 };
                 Red.prototype.convertFrom = function convertFrom(num) {
                     var res = num.clone();
                     res.red = null;
                     return res
                 };
                 BN.mont = function mont(num) {
                     return new Mont(num)
                 };

                 function Mont(m) {
                     Red.call(this, m);
                     this.shift = this.m.bitLength();
                     if (this.shift % 26 !== 0) {
                         this.shift += 26 - this.shift % 26
                     }
                     this.r = new BN(1).iushln(this.shift);
                     this.r2 = this.imod(this.r.sqr());
                     this.rinv = this.r._invmp(this.m);
                     this.minv = this.rinv.mul(this.r).isubn(1).div(this.m);
                     this.minv = this.minv.umod(this.r);
                     this.minv = this.r.sub(this.minv)
                 }
                 inherits(Mont, Red);
                 Mont.prototype.convertTo = function convertTo(num) {
                     return this.imod(num.ushln(this.shift))
                 };
                 Mont.prototype.convertFrom = function convertFrom(num) {
                     var r = this.imod(num.mul(this.rinv));
                     r.red = null;
                     return r
                 };
                 Mont.prototype.imul = function imul(a, b) {
                     if (a.isZero() || b.isZero()) {
                         a.words[0] = 0;
                         a.length = 1;
                         return a
                     }
                     var t = a.imul(b);
                     var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
                     var u = t.isub(c).iushrn(this.shift);
                     var res = u;
                     if (u.cmp(this.m) >= 0) {
                         res = u.isub(this.m)
                     } else if (u.cmpn(0) < 0) {
                         res = u.iadd(this.m)
                     }
                     return res._forceRed(this)
                 };
                 Mont.prototype.mul = function mul(a, b) {
                     if (a.isZero() || b.isZero()) return new BN(0)._forceRed(this);
                     var t = a.mul(b);
                     var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
                     var u = t.isub(c).iushrn(this.shift);
                     var res = u;
                     if (u.cmp(this.m) >= 0) {
                         res = u.isub(this.m)
                     } else if (u.cmpn(0) < 0) {
                         res = u.iadd(this.m)
                     }
                     return res._forceRed(this)
                 };
                 Mont.prototype.invm = function invm(a) {
                     var res = this.imod(a._invmp(this.m).mul(this.r2));
                     return res._forceRed(this)
                 }
             })(typeof module === "undefined" || module, this)
         }, {
             buffer: 8
         }],
         7: [function(require, module, exports) {
             var randomBytes = require("../../utils").randomBytes;
             module.exports = function(length) {
                 return randomBytes(length)
             }
         }, {
             "../../utils": 63
         }],
         8: [function(require, module, exports) {}, {}],
         9: [function(require, module, exports) {
             "use strict";
             var elliptic = exports;
             elliptic.version = require("../package.json").version;
             elliptic.utils = require("./elliptic/utils");
             elliptic.rand = require("brorand");
             elliptic.hmacDRBG = require("./elliptic/hmac-drbg");
             elliptic.curve = require("./elliptic/curve");
             elliptic.curves = require("./elliptic/curves");
             elliptic.ec = require("./elliptic/ec");
             elliptic.eddsa = require("./elliptic/eddsa")
         }, {
             "../package.json": 23,
             "./elliptic/curve": 12,
             "./elliptic/curves": 15,
             "./elliptic/ec": 16,
             "./elliptic/eddsa": 19,
             "./elliptic/hmac-drbg": 20,
             "./elliptic/utils": 22,
             brorand: 7
         }],
         10: [function(require, module, exports) {
             "use strict";
             var BN = require("bn.js");
             var elliptic = require("../../elliptic");
             var utils = elliptic.utils;
             var getNAF = utils.getNAF;
             var getJSF = utils.getJSF;
             var assert = utils.assert;

             function BaseCurve(type, conf) {
                 this.type = type;
                 this.p = new BN(conf.p, 16);
                 this.red = conf.prime ? BN.red(conf.prime) : BN.mont(this.p);
                 this.zero = new BN(0).toRed(this.red);
                 this.one = new BN(1).toRed(this.red);
                 this.two = new BN(2).toRed(this.red);
                 this.n = conf.n && new BN(conf.n, 16);
                 this.g = conf.g && this.pointFromJSON(conf.g, conf.gRed);
                 this._wnafT1 = new Array(4);
                 this._wnafT2 = new Array(4);
                 this._wnafT3 = new Array(4);
                 this._wnafT4 = new Array(4);
                 var adjustCount = this.n && this.p.div(this.n);
                 if (!adjustCount || adjustCount.cmpn(100) > 0) {
                     this.redN = null
                 } else {
                     this._maxwellTrick = true;
                     this.redN = this.n.toRed(this.red)
                 }
             }
             module.exports = BaseCurve;
             BaseCurve.prototype.point = function point() {
                 throw new Error("Not implemented")
             };
             BaseCurve.prototype.validate = function validate() {
                 throw new Error("Not implemented")
             };
             BaseCurve.prototype._fixedNafMul = function _fixedNafMul(p, k) {
                 assert(p.precomputed);
                 var doubles = p._getDoubles();
                 var naf = getNAF(k, 1);
                 var I = (1 << doubles.step + 1) - (doubles.step % 2 === 0 ? 2 : 1);
                 I /= 3;
                 var repr = [];
                 for (var j = 0; j < naf.length; j += doubles.step) {
                     var nafW = 0;
                     for (var k = j + doubles.step - 1; k >= j; k--) nafW = (nafW << 1) + naf[k];
                     repr.push(nafW)
                 }
                 var a = this.jpoint(null, null, null);
                 var b = this.jpoint(null, null, null);
                 for (var i = I; i > 0; i--) {
                     for (var j = 0; j < repr.length; j++) {
                         var nafW = repr[j];
                         if (nafW === i) b = b.mixedAdd(doubles.points[j]);
                         else if (nafW === -i) b = b.mixedAdd(doubles.points[j].neg())
                     }
                     a = a.add(b)
                 }
                 return a.toP()
             };
             BaseCurve.prototype._wnafMul = function _wnafMul(p, k) {
                 var w = 4;
                 var nafPoints = p._getNAFPoints(w);
                 w = nafPoints.wnd;
                 var wnd = nafPoints.points;
                 var naf = getNAF(k, w);
                 var acc = this.jpoint(null, null, null);
                 for (var i = naf.length - 1; i >= 0; i--) {
                     for (var k = 0; i >= 0 && naf[i] === 0; i--) k++;
                     if (i >= 0) k++;
                     acc = acc.dblp(k);
                     if (i < 0) break;
                     var z = naf[i];
                     assert(z !== 0);
                     if (p.type === "affine") {
                         if (z > 0) acc = acc.mixedAdd(wnd[z - 1 >> 1]);
                         else acc = acc.mixedAdd(wnd[-z - 1 >> 1].neg())
                     } else {
                         if (z > 0) acc = acc.add(wnd[z - 1 >> 1]);
                         else acc = acc.add(wnd[-z - 1 >> 1].neg())
                     }
                 }
                 return p.type === "affine" ? acc.toP() : acc
             };
             BaseCurve.prototype._wnafMulAdd = function _wnafMulAdd(defW, points, coeffs, len, jacobianResult) {
                 var wndWidth = this._wnafT1;
                 var wnd = this._wnafT2;
                 var naf = this._wnafT3;
                 var max = 0;
                 for (var i = 0; i < len; i++) {
                     var p = points[i];
                     var nafPoints = p._getNAFPoints(defW);
                     wndWidth[i] = nafPoints.wnd;
                     wnd[i] = nafPoints.points
                 }
                 for (var i = len - 1; i >= 1; i -= 2) {
                     var a = i - 1;
                     var b = i;
                     if (wndWidth[a] !== 1 || wndWidth[b] !== 1) {
                         naf[a] = getNAF(coeffs[a], wndWidth[a]);
                         naf[b] = getNAF(coeffs[b], wndWidth[b]);
                         max = Math.max(naf[a].length, max);
                         max = Math.max(naf[b].length, max);
                         continue
                     }
                     var comb = [points[a], null, null, points[b]];
                     if (points[a].y.cmp(points[b].y) === 0) {
                         comb[1] = points[a].add(points[b]);
                         comb[2] = points[a].toJ().mixedAdd(points[b].neg())
                     } else if (points[a].y.cmp(points[b].y.redNeg()) === 0) {
                         comb[1] = points[a].toJ().mixedAdd(points[b]);
                         comb[2] = points[a].add(points[b].neg())
                     } else {
                         comb[1] = points[a].toJ().mixedAdd(points[b]);
                         comb[2] = points[a].toJ().mixedAdd(points[b].neg())
                     }
                     var index = [-3, -1, -5, -7, 0, 7, 5, 1, 3];
                     var jsf = getJSF(coeffs[a], coeffs[b]);
                     max = Math.max(jsf[0].length, max);
                     naf[a] = new Array(max);
                     naf[b] = new Array(max);
                     for (var j = 0; j < max; j++) {
                         var ja = jsf[0][j] | 0;
                         var jb = jsf[1][j] | 0;
                         naf[a][j] = index[(ja + 1) * 3 + (jb + 1)];
                         naf[b][j] = 0;
                         wnd[a] = comb
                     }
                 }
                 var acc = this.jpoint(null, null, null);
                 var tmp = this._wnafT4;
                 for (var i = max; i >= 0; i--) {
                     var k = 0;
                     while (i >= 0) {
                         var zero = true;
                         for (var j = 0; j < len; j++) {
                             tmp[j] = naf[j][i] | 0;
                             if (tmp[j] !== 0) zero = false
                         }
                         if (!zero) break;
                         k++;
                         i--
                     }
                     if (i >= 0) k++;
                     acc = acc.dblp(k);
                     if (i < 0) break;
                     for (var j = 0; j < len; j++) {
                         var z = tmp[j];
                         var p;
                         if (z === 0) continue;
                         else if (z > 0) p = wnd[j][z - 1 >> 1];
                         else if (z < 0) p = wnd[j][-z - 1 >> 1].neg();
                         if (p.type === "affine") acc = acc.mixedAdd(p);
                         else acc = acc.add(p)
                     }
                 }
                 for (var i = 0; i < len; i++) wnd[i] = null;
                 if (jacobianResult) return acc;
                 else return acc.toP()
             };

             function BasePoint(curve, type) {
                 this.curve = curve;
                 this.type = type;
                 this.precomputed = null
             }
             BaseCurve.BasePoint = BasePoint;
             BasePoint.prototype.eq = function eq() {
                 throw new Error("Not implemented")
             };
             BasePoint.prototype.validate = function validate() {
                 return this.curve.validate(this)
             };
             BaseCurve.prototype.decodePoint = function decodePoint(bytes, enc) {
                 bytes = utils.toArray(bytes, enc);
                 var len = this.p.byteLength();
                 if ((bytes[0] === 4 || bytes[0] === 6 || bytes[0] === 7) && bytes.length - 1 === 2 * len) {
                     if (bytes[0] === 6) assert(bytes[bytes.length - 1] % 2 === 0);
                     else if (bytes[0] === 7) assert(bytes[bytes.length - 1] % 2 === 1);
                     var res = this.point(bytes.slice(1, 1 + len), bytes.slice(1 + len, 1 + 2 * len));
                     return res
                 } else if ((bytes[0] === 2 || bytes[0] === 3) && bytes.length - 1 === len) {
                     return this.pointFromX(bytes.slice(1, 1 + len), bytes[0] === 3)
                 }
                 throw new Error("Unknown point format")
             };
             BasePoint.prototype.encodeCompressed = function encodeCompressed(enc) {
                 return this.encode(enc, true)
             };
             BasePoint.prototype._encode = function _encode(compact) {
                 var len = this.curve.p.byteLength();
                 var x = this.getX().toArray("be", len);
                 if (compact) return [this.getY().isEven() ? 2 : 3].concat(x);
                 return [4].concat(x, this.getY().toArray("be", len))
             };
             BasePoint.prototype.encode = function encode(enc, compact) {
                 return utils.encode(this._encode(compact), enc)
             };
             BasePoint.prototype.precompute = function precompute(power) {
                 if (this.precomputed) return this;
                 var precomputed = {
                     doubles: null,
                     naf: null,
                     beta: null
                 };
                 precomputed.naf = this._getNAFPoints(8);
                 precomputed.doubles = this._getDoubles(4, power);
                 precomputed.beta = this._getBeta();
                 this.precomputed = precomputed;
                 return this
             };
             BasePoint.prototype._hasDoubles = function _hasDoubles(k) {
                 if (!this.precomputed) return false;
                 var doubles = this.precomputed.doubles;
                 if (!doubles) return false;
                 return doubles.points.length >= Math.ceil((k.bitLength() + 1) / doubles.step)
             };
             BasePoint.prototype._getDoubles = function _getDoubles(step, power) {
                 if (this.precomputed && this.precomputed.doubles) return this.precomputed.doubles;
                 var doubles = [this];
                 var acc = this;
                 for (var i = 0; i < power; i += step) {
                     for (var j = 0; j < step; j++) acc = acc.dbl();
                     doubles.push(acc)
                 }
                 return {
                     step: step,
                     points: doubles
                 }
             };
             BasePoint.prototype._getNAFPoints = function _getNAFPoints(wnd) {
                 if (this.precomputed && this.precomputed.naf) return this.precomputed.naf;
                 var res = [this];
                 var max = (1 << wnd) - 1;
                 var dbl = max === 1 ? null : this.dbl();
                 for (var i = 1; i < max; i++) res[i] = res[i - 1].add(dbl);
                 return {
                     wnd: wnd,
                     points: res
                 }
             };
             BasePoint.prototype._getBeta = function _getBeta() {
                 return null
             };
             BasePoint.prototype.dblp = function dblp(k) {
                 var r = this;
                 for (var i = 0; i < k; i++) r = r.dbl();
                 return r
             }
         }, {
             "../../elliptic": 9,
             "bn.js": 6
         }],
         11: [function(require, module, exports) {
             module.exports = {}
         }, {}],
         12: [function(require, module, exports) {
             "use strict";
             var curve = exports;
             curve.base = require("./base");
             curve.short = require("./short");
             curve.mont = require("./mont");
             curve.edwards = require("./edwards")
         }, {
             "./base": 10,
             "./edwards": 11,
             "./mont": 13,
             "./short": 14
         }],
         13: [function(require, module, exports) {
             arguments[4][11][0].apply(exports, arguments)
         }, {
             dup: 11
         }],
         14: [function(require, module, exports) {
             "use strict";
             var curve = require("../curve");
             var elliptic = require("../../elliptic");
             var BN = require("bn.js");
             var inherits = require("inherits");
             var Base = curve.base;
             var assert = elliptic.utils.assert;

             function ShortCurve(conf) {
                 Base.call(this, "short", conf);
                 this.a = new BN(conf.a, 16).toRed(this.red);
                 this.b = new BN(conf.b, 16).toRed(this.red);
                 this.tinv = this.two.redInvm();
                 this.zeroA = this.a.fromRed().cmpn(0) === 0;
                 this.threeA = this.a.fromRed().sub(this.p).cmpn(-3) === 0;
                 this.endo = this._getEndomorphism(conf);
                 this._endoWnafT1 = new Array(4);
                 this._endoWnafT2 = new Array(4)
             }
             inherits(ShortCurve, Base);
             module.exports = ShortCurve;
             ShortCurve.prototype._getEndomorphism = function _getEndomorphism(conf) {
                 if (!this.zeroA || !this.g || !this.n || this.p.modn(3) !== 1) return;
                 var beta;
                 var lambda;
                 if (conf.beta) {
                     beta = new BN(conf.beta, 16).toRed(this.red)
                 } else {
                     var betas = this._getEndoRoots(this.p);
                     beta = betas[0].cmp(betas[1]) < 0 ? betas[0] : betas[1];
                     beta = beta.toRed(this.red)
                 }
                 if (conf.lambda) {
                     lambda = new BN(conf.lambda, 16)
                 } else {
                     var lambdas = this._getEndoRoots(this.n);
                     if (this.g.mul(lambdas[0]).x.cmp(this.g.x.redMul(beta)) === 0) {
                         lambda = lambdas[0]
                     } else {
                         lambda = lambdas[1];
                         assert(this.g.mul(lambda).x.cmp(this.g.x.redMul(beta)) === 0)
                     }
                 }
                 var basis;
                 if (conf.basis) {
                     basis = conf.basis.map(function(vec) {
                         return {
                             a: new BN(vec.a, 16),
                             b: new BN(vec.b, 16)
                         }
                     })
                 } else {
                     basis = this._getEndoBasis(lambda)
                 }
                 return {
                     beta: beta,
                     lambda: lambda,
                     basis: basis
                 }
             };
             ShortCurve.prototype._getEndoRoots = function _getEndoRoots(num) {
                 var red = num === this.p ? this.red : BN.mont(num);
                 var tinv = new BN(2).toRed(red).redInvm();
                 var ntinv = tinv.redNeg();
                 var s = new BN(3).toRed(red).redNeg().redSqrt().redMul(tinv);
                 var l1 = ntinv.redAdd(s).fromRed();
                 var l2 = ntinv.redSub(s).fromRed();
                 return [l1, l2]
             };
             ShortCurve.prototype._getEndoBasis = function _getEndoBasis(lambda) {
                 var aprxSqrt = this.n.ushrn(Math.floor(this.n.bitLength() / 2));
                 var u = lambda;
                 var v = this.n.clone();
                 var x1 = new BN(1);
                 var y1 = new BN(0);
                 var x2 = new BN(0);
                 var y2 = new BN(1);
                 var a0;
                 var b0;
                 var a1;
                 var b1;
                 var a2;
                 var b2;
                 var prevR;
                 var i = 0;
                 var r;
                 var x;
                 while (u.cmpn(0) !== 0) {
                     var q = v.div(u);
                     r = v.sub(q.mul(u));
                     x = x2.sub(q.mul(x1));
                     var y = y2.sub(q.mul(y1));
                     if (!a1 && r.cmp(aprxSqrt) < 0) {
                         a0 = prevR.neg();
                         b0 = x1;
                         a1 = r.neg();
                         b1 = x
                     } else if (a1 && ++i === 2) {
                         break
                     }
                     prevR = r;
                     v = u;
                     u = r;
                     x2 = x1;
                     x1 = x;
                     y2 = y1;
                     y1 = y
                 }
                 a2 = r.neg();
                 b2 = x;
                 var len1 = a1.sqr().add(b1.sqr());
                 var len2 = a2.sqr().add(b2.sqr());
                 if (len2.cmp(len1) >= 0) {
                     a2 = a0;
                     b2 = b0
                 }
                 if (a1.negative) {
                     a1 = a1.neg();
                     b1 = b1.neg()
                 }
                 if (a2.negative) {
                     a2 = a2.neg();
                     b2 = b2.neg()
                 }
                 return [{
                     a: a1,
                     b: b1
                 }, {
                     a: a2,
                     b: b2
                 }]
             };
             ShortCurve.prototype._endoSplit = function _endoSplit(k) {
                 var basis = this.endo.basis;
                 var v1 = basis[0];
                 var v2 = basis[1];
                 var c1 = v2.b.mul(k).divRound(this.n);
                 var c2 = v1.b.neg().mul(k).divRound(this.n);
                 var p1 = c1.mul(v1.a);
                 var p2 = c2.mul(v2.a);
                 var q1 = c1.mul(v1.b);
                 var q2 = c2.mul(v2.b);
                 var k1 = k.sub(p1).sub(p2);
                 var k2 = q1.add(q2).neg();
                 return {
                     k1: k1,
                     k2: k2
                 }
             };
             ShortCurve.prototype.pointFromX = function pointFromX(x, odd) {
                 x = new BN(x, 16);
                 if (!x.red) x = x.toRed(this.red);
                 var y2 = x.redSqr().redMul(x).redIAdd(x.redMul(this.a)).redIAdd(this.b);
                 var y = y2.redSqrt();
                 if (y.redSqr().redSub(y2).cmp(this.zero) !== 0) throw new Error("invalid point");
                 var isOdd = y.fromRed().isOdd();
                 if (odd && !isOdd || !odd && isOdd) y = y.redNeg();
                 return this.point(x, y)
             };
             ShortCurve.prototype.validate = function validate(point) {
                 if (point.inf) return true;
                 var x = point.x;
                 var y = point.y;
                 var ax = this.a.redMul(x);
                 var rhs = x.redSqr().redMul(x).redIAdd(ax).redIAdd(this.b);
                 return y.redSqr().redISub(rhs).cmpn(0) === 0
             };
             ShortCurve.prototype._endoWnafMulAdd = function _endoWnafMulAdd(points, coeffs, jacobianResult) {
                 var npoints = this._endoWnafT1;
                 var ncoeffs = this._endoWnafT2;
                 for (var i = 0; i < points.length; i++) {
                     var split = this._endoSplit(coeffs[i]);
                     var p = points[i];
                     var beta = p._getBeta();
                     if (split.k1.negative) {
                         split.k1.ineg();
                         p = p.neg(true)
                     }
                     if (split.k2.negative) {
                         split.k2.ineg();
                         beta = beta.neg(true)
                     }
                     npoints[i * 2] = p;
                     npoints[i * 2 + 1] = beta;
                     ncoeffs[i * 2] = split.k1;
                     ncoeffs[i * 2 + 1] = split.k2
                 }
                 var res = this._wnafMulAdd(1, npoints, ncoeffs, i * 2, jacobianResult);
                 for (var j = 0; j < i * 2; j++) {
                     npoints[j] = null;
                     ncoeffs[j] = null
                 }
                 return res
             };

             function Point(curve, x, y, isRed) {
                 Base.BasePoint.call(this, curve, "affine");
                 if (x === null && y === null) {
                     this.x = null;
                     this.y = null;
                     this.inf = true
                 } else {
                     this.x = new BN(x, 16);
                     this.y = new BN(y, 16);
                     if (isRed) {
                         this.x.forceRed(this.curve.red);
                         this.y.forceRed(this.curve.red)
                     }
                     if (!this.x.red) this.x = this.x.toRed(this.curve.red);
                     if (!this.y.red) this.y = this.y.toRed(this.curve.red);
                     this.inf = false
                 }
             }
             inherits(Point, Base.BasePoint);
             ShortCurve.prototype.point = function point(x, y, isRed) {
                 return new Point(this, x, y, isRed)
             };
             ShortCurve.prototype.pointFromJSON = function pointFromJSON(obj, red) {
                 return Point.fromJSON(this, obj, red)
             };
             Point.prototype._getBeta = function _getBeta() {
                 if (!this.curve.endo) return;
                 var pre = this.precomputed;
                 if (pre && pre.beta) return pre.beta;
                 var beta = this.curve.point(this.x.redMul(this.curve.endo.beta), this.y);
                 if (pre) {
                     var curve = this.curve;
                     var endoMul = function(p) {
                         return curve.point(p.x.redMul(curve.endo.beta), p.y)
                     };
                     pre.beta = beta;
                     beta.precomputed = {
                         beta: null,
                         naf: pre.naf && {
                             wnd: pre.naf.wnd,
                             points: pre.naf.points.map(endoMul)
                         },
                         doubles: pre.doubles && {
                             step: pre.doubles.step,
                             points: pre.doubles.points.map(endoMul)
                         }
                     }
                 }
                 return beta
             };
             Point.prototype.toJSON = function toJSON() {
                 if (!this.precomputed) return [this.x, this.y];
                 return [this.x, this.y, this.precomputed && {
                     doubles: this.precomputed.doubles && {
                         step: this.precomputed.doubles.step,
                         points: this.precomputed.doubles.points.slice(1)
                     },
                     naf: this.precomputed.naf && {
                         wnd: this.precomputed.naf.wnd,
                         points: this.precomputed.naf.points.slice(1)
                     }
                 }]
             };
             Point.fromJSON = function fromJSON(curve, obj, red) {
                 if (typeof obj === "string") obj = JSON.parse(obj);
                 var res = curve.point(obj[0], obj[1], red);
                 if (!obj[2]) return res;

                 function obj2point(obj) {
                     return curve.point(obj[0], obj[1], red)
                 }
                 var pre = obj[2];
                 res.precomputed = {
                     beta: null,
                     doubles: pre.doubles && {
                         step: pre.doubles.step,
                         points: [res].concat(pre.doubles.points.map(obj2point))
                     },
                     naf: pre.naf && {
                         wnd: pre.naf.wnd,
                         points: [res].concat(pre.naf.points.map(obj2point))
                     }
                 };
                 return res
             };
             Point.prototype.inspect = function inspect() {
                 if (this.isInfinity()) return "<EC Point Infinity>";
                 return "<EC Point x: " + this.x.fromRed().toString(16, 2) + " y: " + this.y.fromRed().toString(16, 2) + ">"
             };
             Point.prototype.isInfinity = function isInfinity() {
                 return this.inf
             };
             Point.prototype.add = function add(p) {
                 if (this.inf) return p;
                 if (p.inf) return this;
                 if (this.eq(p)) return this.dbl();
                 if (this.neg().eq(p)) return this.curve.point(null, null);
                 if (this.x.cmp(p.x) === 0) return this.curve.point(null, null);
                 var c = this.y.redSub(p.y);
                 if (c.cmpn(0) !== 0) c = c.redMul(this.x.redSub(p.x).redInvm());
                 var nx = c.redSqr().redISub(this.x).redISub(p.x);
                 var ny = c.redMul(this.x.redSub(nx)).redISub(this.y);
                 return this.curve.point(nx, ny)
             };
             Point.prototype.dbl = function dbl() {
                 if (this.inf) return this;
                 var ys1 = this.y.redAdd(this.y);
                 if (ys1.cmpn(0) === 0) return this.curve.point(null, null);
                 var a = this.curve.a;
                 var x2 = this.x.redSqr();
                 var dyinv = ys1.redInvm();
                 var c = x2.redAdd(x2).redIAdd(x2).redIAdd(a).redMul(dyinv);
                 var nx = c.redSqr().redISub(this.x.redAdd(this.x));
                 var ny = c.redMul(this.x.redSub(nx)).redISub(this.y);
                 return this.curve.point(nx, ny)
             };
             Point.prototype.getX = function getX() {
                 return this.x.fromRed()
             };
             Point.prototype.getY = function getY() {
                 return this.y.fromRed()
             };
             Point.prototype.mul = function mul(k) {
                 k = new BN(k, 16);
                 if (this._hasDoubles(k)) return this.curve._fixedNafMul(this, k);
                 else if (this.curve.endo) return this.curve._endoWnafMulAdd([this], [k]);
                 else return this.curve._wnafMul(this, k)
             };
             Point.prototype.mulAdd = function mulAdd(k1, p2, k2) {
                 var points = [this, p2];
                 var coeffs = [k1, k2];
                 if (this.curve.endo) return this.curve._endoWnafMulAdd(points, coeffs);
                 else return this.curve._wnafMulAdd(1, points, coeffs, 2)
             };
             Point.prototype.jmulAdd = function jmulAdd(k1, p2, k2) {
                 var points = [this, p2];
                 var coeffs = [k1, k2];
                 if (this.curve.endo) return this.curve._endoWnafMulAdd(points, coeffs, true);
                 else return this.curve._wnafMulAdd(1, points, coeffs, 2, true)
             };
             Point.prototype.eq = function eq(p) {
                 return this === p || this.inf === p.inf && (this.inf || this.x.cmp(p.x) === 0 && this.y.cmp(p.y) === 0)
             };
             Point.prototype.neg = function neg(_precompute) {
                 if (this.inf) return this;
                 var res = this.curve.point(this.x, this.y.redNeg());
                 if (_precompute && this.precomputed) {
                     var pre = this.precomputed;
                     var negate = function(p) {
                         return p.neg()
                     };
                     res.precomputed = {
                         naf: pre.naf && {
                             wnd: pre.naf.wnd,
                             points: pre.naf.points.map(negate)
                         },
                         doubles: pre.doubles && {
                             step: pre.doubles.step,
                             points: pre.doubles.points.map(negate)
                         }
                     }
                 }
                 return res
             };
             Point.prototype.toJ = function toJ() {
                 if (this.inf) return this.curve.jpoint(null, null, null);
                 var res = this.curve.jpoint(this.x, this.y, this.curve.one);
                 return res
             };

             function JPoint(curve, x, y, z) {
                 Base.BasePoint.call(this, curve, "jacobian");
                 if (x === null && y === null && z === null) {
                     this.x = this.curve.one;
                     this.y = this.curve.one;
                     this.z = new BN(0)
                 } else {
                     this.x = new BN(x, 16);
                     this.y = new BN(y, 16);
                     this.z = new BN(z, 16)
                 }
                 if (!this.x.red) this.x = this.x.toRed(this.curve.red);
                 if (!this.y.red) this.y = this.y.toRed(this.curve.red);
                 if (!this.z.red) this.z = this.z.toRed(this.curve.red);
                 this.zOne = this.z === this.curve.one
             }
             inherits(JPoint, Base.BasePoint);
             ShortCurve.prototype.jpoint = function jpoint(x, y, z) {
                 return new JPoint(this, x, y, z)
             };
             JPoint.prototype.toP = function toP() {
                 if (this.isInfinity()) return this.curve.point(null, null);
                 var zinv = this.z.redInvm();
                 var zinv2 = zinv.redSqr();
                 var ax = this.x.redMul(zinv2);
                 var ay = this.y.redMul(zinv2).redMul(zinv);
                 return this.curve.point(ax, ay)
             };
             JPoint.prototype.neg = function neg() {
                 return this.curve.jpoint(this.x, this.y.redNeg(), this.z)
             };
             JPoint.prototype.add = function add(p) {
                 if (this.isInfinity()) return p;
                 if (p.isInfinity()) return this;
                 var pz2 = p.z.redSqr();
                 var z2 = this.z.redSqr();
                 var u1 = this.x.redMul(pz2);
                 var u2 = p.x.redMul(z2);
                 var s1 = this.y.redMul(pz2.redMul(p.z));
                 var s2 = p.y.redMul(z2.redMul(this.z));
                 var h = u1.redSub(u2);
                 var r = s1.redSub(s2);
                 if (h.cmpn(0) === 0) {
                     if (r.cmpn(0) !== 0) return this.curve.jpoint(null, null, null);
                     else return this.dbl()
                 }
                 var h2 = h.redSqr();
                 var h3 = h2.redMul(h);
                 var v = u1.redMul(h2);
                 var nx = r.redSqr().redIAdd(h3).redISub(v).redISub(v);
                 var ny = r.redMul(v.redISub(nx)).redISub(s1.redMul(h3));
                 var nz = this.z.redMul(p.z).redMul(h);
                 return this.curve.jpoint(nx, ny, nz)
             };
             JPoint.prototype.mixedAdd = function mixedAdd(p) {
                 if (this.isInfinity()) return p.toJ();
                 if (p.isInfinity()) return this;
                 var z2 = this.z.redSqr();
                 var u1 = this.x;
                 var u2 = p.x.redMul(z2);
                 var s1 = this.y;
                 var s2 = p.y.redMul(z2).redMul(this.z);
                 var h = u1.redSub(u2);
                 var r = s1.redSub(s2);
                 if (h.cmpn(0) === 0) {
                     if (r.cmpn(0) !== 0) return this.curve.jpoint(null, null, null);
                     else return this.dbl()
                 }
                 var h2 = h.redSqr();
                 var h3 = h2.redMul(h);
                 var v = u1.redMul(h2);
                 var nx = r.redSqr().redIAdd(h3).redISub(v).redISub(v);
                 var ny = r.redMul(v.redISub(nx)).redISub(s1.redMul(h3));
                 var nz = this.z.redMul(h);
                 return this.curve.jpoint(nx, ny, nz)
             };
             JPoint.prototype.dblp = function dblp(pow) {
                 if (pow === 0) return this;
                 if (this.isInfinity()) return this;
                 if (!pow) return this.dbl();
                 if (this.curve.zeroA || this.curve.threeA) {
                     var r = this;
                     for (var i = 0; i < pow; i++) r = r.dbl();
                     return r
                 }
                 var a = this.curve.a;
                 var tinv = this.curve.tinv;
                 var jx = this.x;
                 var jy = this.y;
                 var jz = this.z;
                 var jz4 = jz.redSqr().redSqr();
                 var jyd = jy.redAdd(jy);
                 for (var i = 0; i < pow; i++) {
                     var jx2 = jx.redSqr();
                     var jyd2 = jyd.redSqr();
                     var jyd4 = jyd2.redSqr();
                     var c = jx2.redAdd(jx2).redIAdd(jx2).redIAdd(a.redMul(jz4));
                     var t1 = jx.redMul(jyd2);
                     var nx = c.redSqr().redISub(t1.redAdd(t1));
                     var t2 = t1.redISub(nx);
                     var dny = c.redMul(t2);
                     dny = dny.redIAdd(dny).redISub(jyd4);
                     var nz = jyd.redMul(jz);
                     if (i + 1 < pow) jz4 = jz4.redMul(jyd4);
                     jx = nx;
                     jz = nz;
                     jyd = dny
                 }
                 return this.curve.jpoint(jx, jyd.redMul(tinv), jz)
             };
             JPoint.prototype.dbl = function dbl() {
                 if (this.isInfinity()) return this;
                 if (this.curve.zeroA) return this._zeroDbl();
                 else if (this.curve.threeA) return this._threeDbl();
                 else return this._dbl()
             };
             JPoint.prototype._zeroDbl = function _zeroDbl() {
                 var nx;
                 var ny;
                 var nz;
                 if (this.zOne) {
                     var xx = this.x.redSqr();
                     var yy = this.y.redSqr();
                     var yyyy = yy.redSqr();
                     var s = this.x.redAdd(yy).redSqr().redISub(xx).redISub(yyyy);
                     s = s.redIAdd(s);
                     var m = xx.redAdd(xx).redIAdd(xx);
                     var t = m.redSqr().redISub(s).redISub(s);
                     var yyyy8 = yyyy.redIAdd(yyyy);
                     yyyy8 = yyyy8.redIAdd(yyyy8);
                     yyyy8 = yyyy8.redIAdd(yyyy8);
                     nx = t;
                     ny = m.redMul(s.redISub(t)).redISub(yyyy8);
                     nz = this.y.redAdd(this.y)
                 } else {
                     var a = this.x.redSqr();
                     var b = this.y.redSqr();
                     var c = b.redSqr();
                     var d = this.x.redAdd(b).redSqr().redISub(a).redISub(c);
                     d = d.redIAdd(d);
                     var e = a.redAdd(a).redIAdd(a);
                     var f = e.redSqr();
                     var c8 = c.redIAdd(c);
                     c8 = c8.redIAdd(c8);
                     c8 = c8.redIAdd(c8);
                     nx = f.redISub(d).redISub(d);
                     ny = e.redMul(d.redISub(nx)).redISub(c8);
                     nz = this.y.redMul(this.z);
                     nz = nz.redIAdd(nz)
                 }
                 return this.curve.jpoint(nx, ny, nz)
             };
             JPoint.prototype._threeDbl = function _threeDbl() {
                 var nx;
                 var ny;
                 var nz;
                 if (this.zOne) {
                     var xx = this.x.redSqr();
                     var yy = this.y.redSqr();
                     var yyyy = yy.redSqr();
                     var s = this.x.redAdd(yy).redSqr().redISub(xx).redISub(yyyy);
                     s = s.redIAdd(s);
                     var m = xx.redAdd(xx).redIAdd(xx).redIAdd(this.curve.a);
                     var t = m.redSqr().redISub(s).redISub(s);
                     nx = t;
                     var yyyy8 = yyyy.redIAdd(yyyy);
                     yyyy8 = yyyy8.redIAdd(yyyy8);
                     yyyy8 = yyyy8.redIAdd(yyyy8);
                     ny = m.redMul(s.redISub(t)).redISub(yyyy8);
                     nz = this.y.redAdd(this.y)
                 } else {
                     var delta = this.z.redSqr();
                     var gamma = this.y.redSqr();
                     var beta = this.x.redMul(gamma);
                     var alpha = this.x.redSub(delta).redMul(this.x.redAdd(delta));
                     alpha = alpha.redAdd(alpha).redIAdd(alpha);
                     var beta4 = beta.redIAdd(beta);
                     beta4 = beta4.redIAdd(beta4);
                     var beta8 = beta4.redAdd(beta4);
                     nx = alpha.redSqr().redISub(beta8);
                     nz = this.y.redAdd(this.z).redSqr().redISub(gamma).redISub(delta);
                     var ggamma8 = gamma.redSqr();
                     ggamma8 = ggamma8.redIAdd(ggamma8);
                     ggamma8 = ggamma8.redIAdd(ggamma8);
                     ggamma8 = ggamma8.redIAdd(ggamma8);
                     ny = alpha.redMul(beta4.redISub(nx)).redISub(ggamma8)
                 }
                 return this.curve.jpoint(nx, ny, nz)
             };
             JPoint.prototype._dbl = function _dbl() {
                 var a = this.curve.a;
                 var jx = this.x;
                 var jy = this.y;
                 var jz = this.z;
                 var jz4 = jz.redSqr().redSqr();
                 var jx2 = jx.redSqr();
                 var jy2 = jy.redSqr();
                 var c = jx2.redAdd(jx2).redIAdd(jx2).redIAdd(a.redMul(jz4));
                 var jxd4 = jx.redAdd(jx);
                 jxd4 = jxd4.redIAdd(jxd4);
                 var t1 = jxd4.redMul(jy2);
                 var nx = c.redSqr().redISub(t1.redAdd(t1));
                 var t2 = t1.redISub(nx);
                 var jyd8 = jy2.redSqr();
                 jyd8 = jyd8.redIAdd(jyd8);
                 jyd8 = jyd8.redIAdd(jyd8);
                 jyd8 = jyd8.redIAdd(jyd8);
                 var ny = c.redMul(t2).redISub(jyd8);
                 var nz = jy.redAdd(jy).redMul(jz);
                 return this.curve.jpoint(nx, ny, nz)
             };
             JPoint.prototype.trpl = function trpl() {
                 if (!this.curve.zeroA) return this.dbl().add(this);
                 var xx = this.x.redSqr();
                 var yy = this.y.redSqr();
                 var zz = this.z.redSqr();
                 var yyyy = yy.redSqr();
                 var m = xx.redAdd(xx).redIAdd(xx);
                 var mm = m.redSqr();
                 var e = this.x.redAdd(yy).redSqr().redISub(xx).redISub(yyyy);
                 e = e.redIAdd(e);
                 e = e.redAdd(e).redIAdd(e);
                 e = e.redISub(mm);
                 var ee = e.redSqr();
                 var t = yyyy.redIAdd(yyyy);
                 t = t.redIAdd(t);
                 t = t.redIAdd(t);
                 t = t.redIAdd(t);
                 var u = m.redIAdd(e).redSqr().redISub(mm).redISub(ee).redISub(t);
                 var yyu4 = yy.redMul(u);
                 yyu4 = yyu4.redIAdd(yyu4);
                 yyu4 = yyu4.redIAdd(yyu4);
                 var nx = this.x.redMul(ee).redISub(yyu4);
                 nx = nx.redIAdd(nx);
                 nx = nx.redIAdd(nx);
                 var ny = this.y.redMul(u.redMul(t.redISub(u)).redISub(e.redMul(ee)));
                 ny = ny.redIAdd(ny);
                 ny = ny.redIAdd(ny);
                 ny = ny.redIAdd(ny);
                 var nz = this.z.redAdd(e).redSqr().redISub(zz).redISub(ee);
                 return this.curve.jpoint(nx, ny, nz)
             };
             JPoint.prototype.mul = function mul(k, kbase) {
                 k = new BN(k, kbase);
                 return this.curve._wnafMul(this, k)
             };
             JPoint.prototype.eq = function eq(p) {
                 if (p.type === "affine") return this.eq(p.toJ());
                 if (this === p) return true;
                 var z2 = this.z.redSqr();
                 var pz2 = p.z.redSqr();
                 if (this.x.redMul(pz2).redISub(p.x.redMul(z2)).cmpn(0) !== 0) return false;
                 var z3 = z2.redMul(this.z);
                 var pz3 = pz2.redMul(p.z);
                 return this.y.redMul(pz3).redISub(p.y.redMul(z3)).cmpn(0) === 0
             };
             JPoint.prototype.eqXToP = function eqXToP(x) {
                 var zs = this.z.redSqr();
                 var rx = x.toRed(this.curve.red).redMul(zs);
                 if (this.x.cmp(rx) === 0) return true;
                 var xc = x.clone();
                 var t = this.curve.redN.redMul(zs);
                 for (;;) {
                     xc.iadd(this.curve.n);
                     if (xc.cmp(this.curve.p) >= 0) return false;
                     rx.redIAdd(t);
                     if (this.x.cmp(rx) === 0) return true
                 }
                 return false
             };
             JPoint.prototype.inspect = function inspect() {
                 if (this.isInfinity()) return "<EC JPoint Infinity>";
                 return "<EC JPoint x: " + this.x.toString(16, 2) + " y: " + this.y.toString(16, 2) + " z: " + this.z.toString(16, 2) + ">"
             };
             JPoint.prototype.isInfinity = function isInfinity() {
                 return this.z.cmpn(0) === 0
             }
         }, {
             "../../elliptic": 9,
             "../curve": 12,
             "bn.js": 6,
             inherits: 37
         }],
         15: [function(require, module, exports) {
             "use strict";
             var curves = exports;
             var hash = require("hash.js");
             var elliptic = require("../elliptic");
             var assert = elliptic.utils.assert;

             function PresetCurve(options) {
                 if (options.type === "short") this.curve = new elliptic.curve.short(options);
                 else if (options.type === "edwards") this.curve = new elliptic.curve.edwards(options);
                 else this.curve = new elliptic.curve.mont(options);
                 this.g = this.curve.g;
                 this.n = this.curve.n;
                 this.hash = options.hash;
                 assert(this.g.validate(), "Invalid curve");
                 assert(this.g.mul(this.n).isInfinity(), "Invalid curve, G*N != O")
             }
             curves.PresetCurve = PresetCurve;

             function defineCurve(name, options) {
                 Object.defineProperty(curves, name, {
                     configurable: true,
                     enumerable: true,
                     get: function() {
                         var curve = new PresetCurve(options);
                         Object.defineProperty(curves, name, {
                             configurable: true,
                             enumerable: true,
                             value: curve
                         });
                         return curve
                     }
                 })
             }
             defineCurve("p192", {
                 type: "short",
                 prime: "p192",
                 p: "ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff",
                 a: "ffffffff ffffffff ffffffff fffffffe ffffffff fffffffc",
                 b: "64210519 e59c80e7 0fa7e9ab 72243049 feb8deec c146b9b1",
                 n: "ffffffff ffffffff ffffffff 99def836 146bc9b1 b4d22831",
                 hash: hash.sha256,
                 gRed: false,
                 g: ["188da80e b03090f6 7cbf20eb 43a18800 f4ff0afd 82ff1012", "07192b95 ffc8da78 631011ed 6b24cdd5 73f977a1 1e794811"]
             });
             defineCurve("p224", {
                 type: "short",
                 prime: "p224",
                 p: "ffffffff ffffffff ffffffff ffffffff 00000000 00000000 00000001",
                 a: "ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff fffffffe",
                 b: "b4050a85 0c04b3ab f5413256 5044b0b7 d7bfd8ba 270b3943 2355ffb4",
                 n: "ffffffff ffffffff ffffffff ffff16a2 e0b8f03e 13dd2945 5c5c2a3d",
                 hash: hash.sha256,
                 gRed: false,
                 g: ["b70e0cbd 6bb4bf7f 321390b9 4a03c1d3 56c21122 343280d6 115c1d21", "bd376388 b5f723fb 4c22dfe6 cd4375a0 5a074764 44d58199 85007e34"]
             });
             defineCurve("p256", {
                 type: "short",
                 prime: null,
                 p: "ffffffff 00000001 00000000 00000000 00000000 ffffffff ffffffff ffffffff",
                 a: "ffffffff 00000001 00000000 00000000 00000000 ffffffff ffffffff fffffffc",
                 b: "5ac635d8 aa3a93e7 b3ebbd55 769886bc 651d06b0 cc53b0f6 3bce3c3e 27d2604b",
                 n: "ffffffff 00000000 ffffffff ffffffff bce6faad a7179e84 f3b9cac2 fc632551",
                 hash: hash.sha256,
                 gRed: false,
                 g: ["6b17d1f2 e12c4247 f8bce6e5 63a440f2 77037d81 2deb33a0 f4a13945 d898c296", "4fe342e2 fe1a7f9b 8ee7eb4a 7c0f9e16 2bce3357 6b315ece cbb64068 37bf51f5"]
             });
             defineCurve("p384", {
                 type: "short",
                 prime: null,
                 p: "ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff " + "fffffffe ffffffff 00000000 00000000 ffffffff",
                 a: "ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff " + "fffffffe ffffffff 00000000 00000000 fffffffc",
                 b: "b3312fa7 e23ee7e4 988e056b e3f82d19 181d9c6e fe814112 0314088f " + "5013875a c656398d 8a2ed19d 2a85c8ed d3ec2aef",
                 n: "ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff c7634d81 " + "f4372ddf 581a0db2 48b0a77a ecec196a ccc52973",
                 hash: hash.sha384,
                 gRed: false,
                 g: ["aa87ca22 be8b0537 8eb1c71e f320ad74 6e1d3b62 8ba79b98 59f741e0 82542a38 " + "5502f25d bf55296c 3a545e38 72760ab7", "3617de4a 96262c6f 5d9e98bf 9292dc29 f8f41dbd 289a147c e9da3113 b5f0b8c0 " + "0a60b1ce 1d7e819d 7a431d7c 90ea0e5f"]
             });
             defineCurve("p521", {
                 type: "short",
                 prime: null,
                 p: "000001ff ffffffff ffffffff ffffffff ffffffff ffffffff " + "ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff " + "ffffffff ffffffff ffffffff ffffffff ffffffff",
                 a: "000001ff ffffffff ffffffff ffffffff ffffffff ffffffff " + "ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff " + "ffffffff ffffffff ffffffff ffffffff fffffffc",
                 b: "00000051 953eb961 8e1c9a1f 929a21a0 b68540ee a2da725b " + "99b315f3 b8b48991 8ef109e1 56193951 ec7e937b 1652c0bd " + "3bb1bf07 3573df88 3d2c34f1 ef451fd4 6b503f00",
                 n: "000001ff ffffffff ffffffff ffffffff ffffffff ffffffff " + "ffffffff ffffffff fffffffa 51868783 bf2f966b 7fcc0148 " + "f709a5d0 3bb5c9b8 899c47ae bb6fb71e 91386409",
                 hash: hash.sha512,
                 gRed: false,
                 g: ["000000c6 858e06b7 0404e9cd 9e3ecb66 2395b442 9c648139 " + "053fb521 f828af60 6b4d3dba a14b5e77 efe75928 fe1dc127 " + "a2ffa8de 3348b3c1 856a429b f97e7e31 c2e5bd66", "00000118 39296a78 9a3bc004 5c8a5fb4 2c7d1bd9 98f54449 " + "579b4468 17afbd17 273e662c 97ee7299 5ef42640 c550b901 " + "3fad0761 353c7086 a272c240 88be9476 9fd16650"]
             });
             defineCurve("curve25519", {
                 type: "mont",
                 prime: "p25519",
                 p: "7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed",
                 a: "76d06",
                 b: "1",
                 n: "1000000000000000 0000000000000000 14def9dea2f79cd6 5812631a5cf5d3ed",
                 hash: hash.sha256,
                 gRed: false,
                 g: ["9"]
             });
             defineCurve("ed25519", {
                 type: "edwards",
                 prime: "p25519",
                 p: "7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed",
                 a: "-1",
                 c: "1",
                 d: "52036cee2b6ffe73 8cc740797779e898 00700a4d4141d8ab 75eb4dca135978a3",
                 n: "1000000000000000 0000000000000000 14def9dea2f79cd6 5812631a5cf5d3ed",
                 hash: hash.sha256,
                 gRed: false,
                 g: ["216936d3cd6e53fec0a4e231fdd6dc5c692cc7609525a7b2c9562d608f25d51a", "6666666666666666666666666666666666666666666666666666666666666658"]
             });
             var pre;
             try {
                 pre = require("./precomputed/secp256k1")
             } catch (e) {
                 pre = undefined
             }
             defineCurve("secp256k1", {
                 type: "short",
                 prime: "k256",
                 p: "ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f",
                 a: "0",
                 b: "7",
                 n: "ffffffff ffffffff ffffffff fffffffe baaedce6 af48a03b bfd25e8c d0364141",
                 h: "1",
                 hash: hash.sha256,
                 beta: "7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee",
                 lambda: "5363ad4cc05c30e0a5261c028812645a122e22ea20816678df02967c1b23bd72",
                 basis: [{
                     a: "3086d221a7d46bcde86c90e49284eb15",
                     b: "-e4437ed6010e88286f547fa90abfe4c3"
                 }, {
                     a: "114ca50f7a8e2f3f657c1108d9d44cfd8",
                     b: "3086d221a7d46bcde86c90e49284eb15"
                 }],
                 gRed: false,
                 g: ["79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798", "483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8", pre]
             })
         }, {
             "../elliptic": 9,
             "./precomputed/secp256k1": 21,
             "hash.js": 24
         }],
         16: [function(require, module, exports) {
             "use strict";
             var BN = require("bn.js");
             var elliptic = require("../../elliptic");
             var utils = elliptic.utils;
             var assert = utils.assert;
             var KeyPair = require("./key");
             var Signature = require("./signature");

             function EC(options) {
                 if (!(this instanceof EC)) return new EC(options);
                 if (typeof options === "string") {
                     assert(elliptic.curves.hasOwnProperty(options), "Unknown curve " + options);
                     options = elliptic.curves[options]
                 }
                 if (options instanceof elliptic.curves.PresetCurve) options = {
                     curve: options
                 };
                 this.curve = options.curve.curve;
                 this.n = this.curve.n;
                 this.nh = this.n.ushrn(1);
                 this.g = this.curve.g;
                 this.g = options.curve.g;
                 this.g.precompute(options.curve.n.bitLength() + 1);
                 this.hash = options.hash || options.curve.hash
             }
             module.exports = EC;
             EC.prototype.keyPair = function keyPair(options) {
                 return new KeyPair(this, options)
             };
             EC.prototype.keyFromPrivate = function keyFromPrivate(priv, enc) {
                 return KeyPair.fromPrivate(this, priv, enc)
             };
             EC.prototype.keyFromPublic = function keyFromPublic(pub, enc) {
                 return KeyPair.fromPublic(this, pub, enc)
             };
             EC.prototype.genKeyPair = function genKeyPair(options) {
                 if (!options) options = {};
                 var drbg = new elliptic.hmacDRBG({
                     hash: this.hash,
                     pers: options.pers,
                     entropy: options.entropy || elliptic.rand(this.hash.hmacStrength),
                     nonce: this.n.toArray()
                 });
                 var bytes = this.n.byteLength();
                 var ns2 = this.n.sub(new BN(2));
                 do {
                     var priv = new BN(drbg.generate(bytes));
                     if (priv.cmp(ns2) > 0) continue;
                     priv.iaddn(1);
                     return this.keyFromPrivate(priv)
                 } while (true)
             };
             EC.prototype._truncateToN = function truncateToN(msg, truncOnly) {
                 var delta = msg.byteLength() * 8 - this.n.bitLength();
                 if (delta > 0) msg = msg.ushrn(delta);
                 if (!truncOnly && msg.cmp(this.n) >= 0) return msg.sub(this.n);
                 else return msg
             };
             EC.prototype.sign = function sign(msg, key, enc, options) {
                 if (typeof enc === "object") {
                     options = enc;
                     enc = null
                 }
                 if (!options) options = {};
                 key = this.keyFromPrivate(key, enc);
                 msg = this._truncateToN(new BN(msg, 16));
                 var bytes = this.n.byteLength();
                 var bkey = key.getPrivate().toArray("be", bytes);
                 var nonce = msg.toArray("be", bytes);
                 var drbg = new elliptic.hmacDRBG({
                     hash: this.hash,
                     entropy: bkey,
                     nonce: nonce,
                     pers: options.pers,
                     persEnc: options.persEnc
                 });
                 var ns1 = this.n.sub(new BN(1));
                 for (var iter = 0; true; iter++) {
                     var k = options.k ? options.k(iter) : new BN(drbg.generate(this.n.byteLength()));
                     k = this._truncateToN(k, true);
                     if (k.cmpn(1) <= 0 || k.cmp(ns1) >= 0) continue;
                     var kp = this.g.mul(k);
                     if (kp.isInfinity()) continue;
                     var kpX = kp.getX();
                     var r = kpX.umod(this.n);
                     if (r.cmpn(0) === 0) continue;
                     var s = k.invm(this.n).mul(r.mul(key.getPrivate()).iadd(msg));
                     s = s.umod(this.n);
                     if (s.cmpn(0) === 0) continue;
                     var recoveryParam = (kp.getY().isOdd() ? 1 : 0) | (kpX.cmp(r) !== 0 ? 2 : 0);
                     if (options.canonical && s.cmp(this.nh) > 0) {
                         s = this.n.sub(s);
                         recoveryParam ^= 1
                     }
                     return new Signature({
                         r: r,
                         s: s,
                         recoveryParam: recoveryParam
                     })
                 }
             };
             EC.prototype.verify = function verify(msg, signature, key, enc) {
                 msg = this._truncateToN(new BN(msg, 16));
                 key = this.keyFromPublic(key, enc);
                 signature = new Signature(signature, "hex");
                 var r = signature.r;
                 var s = signature.s;
                 if (r.cmpn(1) < 0 || r.cmp(this.n) >= 0) return false;
                 if (s.cmpn(1) < 0 || s.cmp(this.n) >= 0) return false;
                 var sinv = s.invm(this.n);
                 var u1 = sinv.mul(msg).umod(this.n);
                 var u2 = sinv.mul(r).umod(this.n);
                 if (!this.curve._maxwellTrick) {
                     var p = this.g.mulAdd(u1, key.getPublic(), u2);
                     if (p.isInfinity()) return false;
                     return p.getX().umod(this.n).cmp(r) === 0
                 }
                 var p = this.g.jmulAdd(u1, key.getPublic(), u2);
                 if (p.isInfinity()) return false;
                 return p.eqXToP(r)
             };
             EC.prototype.recoverPubKey = function(msg, signature, j, enc) {
                 assert((3 & j) === j, "The recovery param is more than two bits");
                 signature = new Signature(signature, enc);
                 var n = this.n;
                 var e = new BN(msg);
                 var r = signature.r;
                 var s = signature.s;
                 var isYOdd = j & 1;
                 var isSecondKey = j >> 1;
                 if (r.cmp(this.curve.p.umod(this.curve.n)) >= 0 && isSecondKey) throw new Error("Unable to find sencond key candinate");
                 if (isSecondKey) r = this.curve.pointFromX(r.add(this.curve.n), isYOdd);
                 else r = this.curve.pointFromX(r, isYOdd);
                 var rInv = signature.r.invm(n);
                 var s1 = n.sub(e).mul(rInv).umod(n);
                 var s2 = s.mul(rInv).umod(n);
                 return this.g.mulAdd(s1, r, s2)
             };
             EC.prototype.getKeyRecoveryParam = function(e, signature, Q, enc) {
                 signature = new Signature(signature, enc);
                 if (signature.recoveryParam !== null) return signature.recoveryParam;
                 for (var i = 0; i < 4; i++) {
                     var Qprime;
                     try {
                         Qprime = this.recoverPubKey(e, signature, i)
                     } catch (e) {
                         continue
                     }
                     if (Qprime.eq(Q)) return i
                 }
                 throw new Error("Unable to find valid recovery factor")
             }
         }, {
             "../../elliptic": 9,
             "./key": 17,
             "./signature": 18,
             "bn.js": 6
         }],
         17: [function(require, module, exports) {
             "use strict";
             var BN = require("bn.js");
             var elliptic = require("../../elliptic");
             var utils = elliptic.utils;
             var assert = utils.assert;

             function KeyPair(ec, options) {
                 this.ec = ec;
                 this.priv = null;
                 this.pub = null;
                 if (options.priv) this._importPrivate(options.priv, options.privEnc);
                 if (options.pub) this._importPublic(options.pub, options.pubEnc)
             }
             module.exports = KeyPair;
             KeyPair.fromPublic = function fromPublic(ec, pub, enc) {
                 if (pub instanceof KeyPair) return pub;
                 return new KeyPair(ec, {
                     pub: pub,
                     pubEnc: enc
                 })
             };
             KeyPair.fromPrivate = function fromPrivate(ec, priv, enc) {
                 if (priv instanceof KeyPair) return priv;
                 return new KeyPair(ec, {
                     priv: priv,
                     privEnc: enc
                 })
             };
             KeyPair.prototype.validate = function validate() {
                 var pub = this.getPublic();
                 if (pub.isInfinity()) return {
                     result: false,
                     reason: "Invalid public key"
                 };
                 if (!pub.validate()) return {
                     result: false,
                     reason: "Public key is not a point"
                 };
                 if (!pub.mul(this.ec.curve.n).isInfinity()) return {
                     result: false,
                     reason: "Public key * N != O"
                 };
                 return {
                     result: true,
                     reason: null
                 }
             };
             KeyPair.prototype.getPublic = function getPublic(compact, enc) {
                 if (typeof compact === "string") {
                     enc = compact;
                     compact = null
                 }
                 if (!this.pub) this.pub = this.ec.g.mul(this.priv);
                 if (!enc) return this.pub;
                 return this.pub.encode(enc, compact)
             };
             KeyPair.prototype.getPrivate = function getPrivate(enc) {
                 if (enc === "hex") return this.priv.toString(16, 2);
                 else return this.priv
             };
             KeyPair.prototype._importPrivate = function _importPrivate(key, enc) {
                 this.priv = new BN(key, enc || 16);
                 this.priv = this.priv.umod(this.ec.curve.n)
             };
             KeyPair.prototype._importPublic = function _importPublic(key, enc) {
                 if (key.x || key.y) {
                     if (this.ec.curve.type === "mont") {
                         assert(key.x, "Need x coordinate")
                     } else if (this.ec.curve.type === "short" || this.ec.curve.type === "edwards") {
                         assert(key.x && key.y, "Need both x and y coordinate")
                     }
                     this.pub = this.ec.curve.point(key.x, key.y);
                     return
                 }
                 this.pub = this.ec.curve.decodePoint(key, enc)
             };
             KeyPair.prototype.derive = function derive(pub) {
                 return pub.mul(this.priv).getX()
             };
             KeyPair.prototype.sign = function sign(msg, enc, options) {
                 return this.ec.sign(msg, this, enc, options)
             };
             KeyPair.prototype.verify = function verify(msg, signature) {
                 return this.ec.verify(msg, signature, this)
             };
             KeyPair.prototype.inspect = function inspect() {
                 return "<Key priv: " + (this.priv && this.priv.toString(16, 2)) + " pub: " + (this.pub && this.pub.inspect()) + " >"
             }
         }, {
             "../../elliptic": 9,
             "bn.js": 6
         }],
         18: [function(require, module, exports) {
             "use strict";
             var BN = require("bn.js");
             var elliptic = require("../../elliptic");
             var utils = elliptic.utils;
             var assert = utils.assert;

             function Signature(options, enc) {
                 if (options instanceof Signature) return options;
                 if (this._importDER(options, enc)) return;
                 assert(options.r && options.s, "Signature without r or s");
                 this.r = new BN(options.r, 16);
                 this.s = new BN(options.s, 16);
                 if (options.recoveryParam === undefined) this.recoveryParam = null;
                 else this.recoveryParam = options.recoveryParam
             }
             module.exports = Signature;

             function Position() {
                 this.place = 0
             }

             function getLength(buf, p) {
                 var initial = buf[p.place++];
                 if (!(initial & 128)) {
                     return initial
                 }
                 var octetLen = initial & 15;
                 var val = 0;
                 for (var i = 0, off = p.place; i < octetLen; i++, off++) {
                     val <<= 8;
                     val |= buf[off]
                 }
                 p.place = off;
                 return val
             }

             function rmPadding(buf) {
                 var i = 0;
                 var len = buf.length - 1;
                 while (!buf[i] && !(buf[i + 1] & 128) && i < len) {
                     i++
                 }
                 if (i === 0) {
                     return buf
                 }
                 return buf.slice(i)
             }
             Signature.prototype._importDER = function _importDER(data, enc) {
                 data = utils.toArray(data, enc);
                 var p = new Position;
                 if (data[p.place++] !== 48) {
                     return false
                 }
                 var len = getLength(data, p);
                 if (len + p.place !== data.length) {
                     return false
                 }
                 if (data[p.place++] !== 2) {
                     return false
                 }
                 var rlen = getLength(data, p);
                 var r = data.slice(p.place, rlen + p.place);
                 p.place += rlen;
                 if (data[p.place++] !== 2) {
                     return false
                 }
                 var slen = getLength(data, p);
                 if (data.length !== slen + p.place) {
                     return false
                 }
                 var s = data.slice(p.place, slen + p.place);
                 if (r[0] === 0 && r[1] & 128) {
                     r = r.slice(1)
                 }
                 if (s[0] === 0 && s[1] & 128) {
                     s = s.slice(1)
                 }
                 this.r = new BN(r);
                 this.s = new BN(s);
                 this.recoveryParam = null;
                 return true
             };

             function constructLength(arr, len) {
                 if (len < 128) {
                     arr.push(len);
                     return
                 }
                 var octets = 1 + (Math.log(len) / Math.LN2 >>> 3);
                 arr.push(octets | 128);
                 while (--octets) {
                     arr.push(len >>> (octets << 3) & 255)
                 }
                 arr.push(len)
             }
             Signature.prototype.toDER = function toDER(enc) {
                 var r = this.r.toArray();
                 var s = this.s.toArray();
                 if (r[0] & 128) r = [0].concat(r);
                 if (s[0] & 128) s = [0].concat(s);
                 r = rmPadding(r);
                 s = rmPadding(s);
                 while (!s[0] && !(s[1] & 128)) {
                     s = s.slice(1)
                 }
                 var arr = [2];
                 constructLength(arr, r.length);
                 arr = arr.concat(r);
                 arr.push(2);
                 constructLength(arr, s.length);
                 var backHalf = arr.concat(s);
                 var res = [48];
                 constructLength(res, backHalf.length);
                 res = res.concat(backHalf);
                 return utils.encode(res, enc)
             }
         }, {
             "../../elliptic": 9,
             "bn.js": 6
         }],
         19: [function(require, module, exports) {
             arguments[4][11][0].apply(exports, arguments)
         }, {
             dup: 11
         }],
         20: [function(require, module, exports) {
             "use strict";
             var hash = require("hash.js");
             var elliptic = require("../elliptic");
             var utils = elliptic.utils;
             var assert = utils.assert;

             function HmacDRBG(options) {
                 if (!(this instanceof HmacDRBG)) return new HmacDRBG(options);
                 this.hash = options.hash;
                 this.predResist = !!options.predResist;
                 this.outLen = this.hash.outSize;
                 this.minEntropy = options.minEntropy || this.hash.hmacStrength;
                 this.reseed = null;
                 this.reseedInterval = null;
                 this.K = null;
                 this.V = null;
                 var entropy = utils.toArray(options.entropy, options.entropyEnc);
                 var nonce = utils.toArray(options.nonce, options.nonceEnc);
                 var pers = utils.toArray(options.pers, options.persEnc);
                 assert(entropy.length >= this.minEntropy / 8, "Not enough entropy. Minimum is: " + this.minEntropy + " bits");
                 this._init(entropy, nonce, pers)
             }
             module.exports = HmacDRBG;
             HmacDRBG.prototype._init = function init(entropy, nonce, pers) {
                 var seed = entropy.concat(nonce).concat(pers);
                 this.K = new Array(this.outLen / 8);
                 this.V = new Array(this.outLen / 8);
                 for (var i = 0; i < this.V.length; i++) {
                     this.K[i] = 0;
                     this.V[i] = 1
                 }
                 this._update(seed);
                 this.reseed = 1;
                 this.reseedInterval = 281474976710656
             };
             HmacDRBG.prototype._hmac = function hmac() {
                 return new hash.hmac(this.hash, this.K)
             };
             HmacDRBG.prototype._update = function update(seed) {
                 var kmac = this._hmac().update(this.V).update([0]);
                 if (seed) kmac = kmac.update(seed);
                 this.K = kmac.digest();
                 this.V = this._hmac().update(this.V).digest();
                 if (!seed) return;
                 this.K = this._hmac().update(this.V).update([1]).update(seed).digest();
                 this.V = this._hmac().update(this.V).digest()
             };
             HmacDRBG.prototype.reseed = function reseed(entropy, entropyEnc, add, addEnc) {
                 if (typeof entropyEnc !== "string") {
                     addEnc = add;
                     add = entropyEnc;
                     entropyEnc = null
                 }
                 entropy = utils.toBuffer(entropy, entropyEnc);
                 add = utils.toBuffer(add, addEnc);
                 assert(entropy.length >= this.minEntropy / 8, "Not enough entropy. Minimum is: " + this.minEntropy + " bits");
                 this._update(entropy.concat(add || []));
                 this.reseed = 1
             };
             HmacDRBG.prototype.generate = function generate(len, enc, add, addEnc) {
                 if (this.reseed > this.reseedInterval) throw new Error("Reseed is required");
                 if (typeof enc !== "string") {
                     addEnc = add;
                     add = enc;
                     enc = null
                 }
                 if (add) {
                     add = utils.toArray(add, addEnc);
                     this._update(add)
                 }
                 var temp = [];
                 while (temp.length < len) {
                     this.V = this._hmac().update(this.V).digest();
                     temp = temp.concat(this.V)
                 }
                 var res = temp.slice(0, len);
                 this._update(add);
                 this.reseed++;
                 return utils.encode(res, enc)
             }
         }, {
             "../elliptic": 9,
             "hash.js": 24
         }],
         21: [function(require, module, exports) {
             module.exports = undefined
         }, {}],
         22: [function(require, module, exports) {
             "use strict";
             var utils = exports;
             var BN = require("bn.js");
             utils.assert = function assert(val, msg) {
                 if (!val) throw new Error(msg || "Assertion failed")
             };

             function toArray(msg, enc) {
                 if (Array.isArray(msg)) return msg.slice();
                 if (!msg) return [];
                 var res = [];
                 if (typeof msg !== "string") {
                     for (var i = 0; i < msg.length; i++) res[i] = msg[i] | 0;
                     return res
                 }
                 if (!enc) {
                     for (var i = 0; i < msg.length; i++) {
                         var c = msg.charCodeAt(i);
                         var hi = c >> 8;
                         var lo = c & 255;
                         if (hi) res.push(hi, lo);
                         else res.push(lo)
                     }
                 } else if (enc === "hex") {
                     msg = msg.replace(/[^a-z0-9]+/gi, "");
                     if (msg.length % 2 !== 0) msg = "0" + msg;
                     for (var i = 0; i < msg.length; i += 2) res.push(parseInt(msg[i] + msg[i + 1], 16))
                 }
                 return res
             }
             utils.toArray = toArray;

             function zero2(word) {
                 if (word.length === 1) return "0" + word;
                 else return word
             }
             utils.zero2 = zero2;

             function toHex(msg) {
                 var res = "";
                 for (var i = 0; i < msg.length; i++) res += zero2(msg[i].toString(16));
                 return res
             }
             utils.toHex = toHex;
             utils.encode = function encode(arr, enc) {
                 if (enc === "hex") return toHex(arr);
                 else return arr
             };

             function getNAF(num, w) {
                 var naf = [];
                 var ws = 1 << w + 1;
                 var k = num.clone();
                 while (k.cmpn(1) >= 0) {
                     var z;
                     if (k.isOdd()) {
                         var mod = k.andln(ws - 1);
                         if (mod > (ws >> 1) - 1) z = (ws >> 1) - mod;
                         else z = mod;
                         k.isubn(z)
                     } else {
                         z = 0
                     }
                     naf.push(z);
                     var shift = k.cmpn(0) !== 0 && k.andln(ws - 1) === 0 ? w + 1 : 1;
                     for (var i = 1; i < shift; i++) naf.push(0);
                     k.iushrn(shift)
                 }
                 return naf
             }
             utils.getNAF = getNAF;

             function getJSF(k1, k2) {
                 var jsf = [
                     [],
                     []
                 ];
                 k1 = k1.clone();
                 k2 = k2.clone();
                 var d1 = 0;
                 var d2 = 0;
                 while (k1.cmpn(-d1) > 0 || k2.cmpn(-d2) > 0) {
                     var m14 = k1.andln(3) + d1 & 3;
                     var m24 = k2.andln(3) + d2 & 3;
                     if (m14 === 3) m14 = -1;
                     if (m24 === 3) m24 = -1;
                     var u1;
                     if ((m14 & 1) === 0) {
                         u1 = 0
                     } else {
                         var m8 = k1.andln(7) + d1 & 7;
                         if ((m8 === 3 || m8 === 5) && m24 === 2) u1 = -m14;
                         else u1 = m14
                     }
                     jsf[0].push(u1);
                     var u2;
                     if ((m24 & 1) === 0) {
                         u2 = 0
                     } else {
                         var m8 = k2.andln(7) + d2 & 7;
                         if ((m8 === 3 || m8 === 5) && m14 === 2) u2 = -m24;
                         else u2 = m24
                     }
                     jsf[1].push(u2);
                     if (2 * d1 === u1 + 1) d1 = 1 - d1;
                     if (2 * d2 === u2 + 1) d2 = 1 - d2;
                     k1.iushrn(1);
                     k2.iushrn(1)
                 }
                 return jsf
             }
             utils.getJSF = getJSF;

             function cachedProperty(obj, name, computer) {
                 var key = "_" + name;
                 obj.prototype[name] = function cachedProperty() {
                     return this[key] !== undefined ? this[key] : this[key] = computer.call(this)
                 }
             }
             utils.cachedProperty = cachedProperty;

             function parseBytes(bytes) {
                 return typeof bytes === "string" ? utils.toArray(bytes, "hex") : bytes
             }
             utils.parseBytes = parseBytes;

             function intFromLE(bytes) {
                 return new BN(bytes, "hex", "le")
             }
             utils.intFromLE = intFromLE
         }, {
             "bn.js": 6
         }],
         23: [function(require, module, exports) {
             module.exports = {
                 version: "6.3.3"
             }
         }, {}],
         24: [function(require, module, exports) {
             var hash = exports;
             hash.utils = require("./hash/utils");
             hash.common = require("./hash/common");
             hash.sha = require("./hash/sha");
             hash.ripemd = require("./hash/ripemd");
             hash.hmac = require("./hash/hmac");
             hash.sha1 = hash.sha.sha1;
             hash.sha256 = hash.sha.sha256;
             hash.sha224 = hash.sha.sha224;
             hash.sha384 = hash.sha.sha384;
             hash.sha512 = hash.sha.sha512;
             hash.ripemd160 = hash.ripemd.ripemd160
         }, {
             "./hash/common": 25,
             "./hash/hmac": 26,
             "./hash/ripemd": 27,
             "./hash/sha": 28,
             "./hash/utils": 35
         }],
         25: [function(require, module, exports) {
             "use strict";
             var utils = require("./utils");
             var assert = require("minimalistic-assert");

             function BlockHash() {
                 this.pending = null;
                 this.pendingTotal = 0;
                 this.blockSize = this.constructor.blockSize;
                 this.outSize = this.constructor.outSize;
                 this.hmacStrength = this.constructor.hmacStrength;
                 this.padLength = this.constructor.padLength / 8;
                 this.endian = "big";
                 this._delta8 = this.blockSize / 8;
                 this._delta32 = this.blockSize / 32
             }
             exports.BlockHash = BlockHash;
             BlockHash.prototype.update = function update(msg, enc) {
                 msg = utils.toArray(msg, enc);
                 if (!this.pending) this.pending = msg;
                 else this.pending = this.pending.concat(msg);
                 this.pendingTotal += msg.length;
                 if (this.pending.length >= this._delta8) {
                     msg = this.pending;
                     var r = msg.length % this._delta8;
                     this.pending = msg.slice(msg.length - r, msg.length);
                     if (this.pending.length === 0) this.pending = null;
                     msg = utils.join32(msg, 0, msg.length - r, this.endian);
                     for (var i = 0; i < msg.length; i += this._delta32) this._update(msg, i, i + this._delta32)
                 }
                 return this
             };
             BlockHash.prototype.digest = function digest(enc) {
                 this.update(this._pad());
                 assert(this.pending === null);
                 return this._digest(enc)
             };
             BlockHash.prototype._pad = function pad() {
                 var len = this.pendingTotal;
                 var bytes = this._delta8;
                 var k = bytes - (len + this.padLength) % bytes;
                 var res = new Array(k + this.padLength);
                 res[0] = 128;
                 for (var i = 1; i < k; i++) res[i] = 0;
                 len <<= 3;
                 if (this.endian === "big") {
                     for (var t = 8; t < this.padLength; t++) res[i++] = 0;
                     res[i++] = 0;
                     res[i++] = 0;
                     res[i++] = 0;
                     res[i++] = 0;
                     res[i++] = len >>> 24 & 255;
                     res[i++] = len >>> 16 & 255;
                     res[i++] = len >>> 8 & 255;
                     res[i++] = len & 255
                 } else {
                     res[i++] = len & 255;
                     res[i++] = len >>> 8 & 255;
                     res[i++] = len >>> 16 & 255;
                     res[i++] = len >>> 24 & 255;
                     res[i++] = 0;
                     res[i++] = 0;
                     res[i++] = 0;
                     res[i++] = 0;
                     for (t = 8; t < this.padLength; t++) res[i++] = 0
                 }
                 return res
             }
         }, {
             "./utils": 35,
             "minimalistic-assert": 39
         }],
         26: [function(require, module, exports) {
             "use strict";
             var utils = require("./utils");
             var assert = require("minimalistic-assert");

             function Hmac(hash, key, enc) {
                 if (!(this instanceof Hmac)) return new Hmac(hash, key, enc);
                 this.Hash = hash;
                 this.blockSize = hash.blockSize / 8;
                 this.outSize = hash.outSize / 8;
                 this.inner = null;
                 this.outer = null;
                 this._init(utils.toArray(key, enc))
             }
             module.exports = Hmac;
             Hmac.prototype._init = function init(key) {
                 if (key.length > this.blockSize) key = (new this.Hash).update(key).digest();
                 assert(key.length <= this.blockSize);
                 for (var i = key.length; i < this.blockSize; i++) key.push(0);
                 for (i = 0; i < key.length; i++) key[i] ^= 54;
                 this.inner = (new this.Hash).update(key);
                 for (i = 0; i < key.length; i++) key[i] ^= 106;
                 this.outer = (new this.Hash).update(key)
             };
             Hmac.prototype.update = function update(msg, enc) {
                 this.inner.update(msg, enc);
                 return this
             };
             Hmac.prototype.digest = function digest(enc) {
                 this.outer.update(this.inner.digest());
                 return this.outer.digest(enc)
             }
         }, {
             "./utils": 35,
             "minimalistic-assert": 39
         }],
         27: [function(require, module, exports) {
             module.exports = {
                 ripemd160: null
             }
         }, {}],
         28: [function(require, module, exports) {
             "use strict";
             exports.sha1 = require("./sha/1");
             exports.sha224 = require("./sha/224");
             exports.sha256 = require("./sha/256");
             exports.sha384 = require("./sha/384");
             exports.sha512 = require("./sha/512")
         }, {
             "./sha/1": 29,
             "./sha/224": 30,
             "./sha/256": 31,
             "./sha/384": 32,
             "./sha/512": 33
         }],
         29: [function(require, module, exports) {
             arguments[4][11][0].apply(exports, arguments)
         }, {
             dup: 11
         }],
         30: [function(require, module, exports) {
             arguments[4][11][0].apply(exports, arguments)
         }, {
             dup: 11
         }],
         31: [function(require, module, exports) {
             "use strict";
             var utils = require("../utils");
             var common = require("../common");
             var shaCommon = require("./common");
             var assert = require("minimalistic-assert");
             var sum32 = utils.sum32;
             var sum32_4 = utils.sum32_4;
             var sum32_5 = utils.sum32_5;
             var ch32 = shaCommon.ch32;
             var maj32 = shaCommon.maj32;
             var s0_256 = shaCommon.s0_256;
             var s1_256 = shaCommon.s1_256;
             var g0_256 = shaCommon.g0_256;
             var g1_256 = shaCommon.g1_256;
             var BlockHash = common.BlockHash;
             var sha256_K = [1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986, 2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711, 113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037, 2730485921, 2820302411, 3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344, 430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779, 1955562222, 2024104815, 2227730452, 2361852424, 2428436474, 2756734187, 3204031479, 3329325298];

             function SHA256() {
                 if (!(this instanceof SHA256)) return new SHA256;
                 BlockHash.call(this);
                 this.h = [1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225];
                 this.k = sha256_K;
                 this.W = new Array(64)
             }
             utils.inherits(SHA256, BlockHash);
             module.exports = SHA256;
             SHA256.blockSize = 512;
             SHA256.outSize = 256;
             SHA256.hmacStrength = 192;
             SHA256.padLength = 64;
             SHA256.prototype._update = function _update(msg, start) {
                 var W = this.W;
                 for (var i = 0; i < 16; i++) W[i] = msg[start + i];
                 for (; i < W.length; i++) W[i] = sum32_4(g1_256(W[i - 2]), W[i - 7], g0_256(W[i - 15]), W[i - 16]);
                 var a = this.h[0];
                 var b = this.h[1];
                 var c = this.h[2];
                 var d = this.h[3];
                 var e = this.h[4];
                 var f = this.h[5];
                 var g = this.h[6];
                 var h = this.h[7];
                 assert(this.k.length === W.length);
                 for (i = 0; i < W.length; i++) {
                     var T1 = sum32_5(h, s1_256(e), ch32(e, f, g), this.k[i], W[i]);
                     var T2 = sum32(s0_256(a), maj32(a, b, c));
                     h = g;
                     g = f;
                     f = e;
                     e = sum32(d, T1);
                     d = c;
                     c = b;
                     b = a;
                     a = sum32(T1, T2)
                 }
                 this.h[0] = sum32(this.h[0], a);
                 this.h[1] = sum32(this.h[1], b);
                 this.h[2] = sum32(this.h[2], c);
                 this.h[3] = sum32(this.h[3], d);
                 this.h[4] = sum32(this.h[4], e);
                 this.h[5] = sum32(this.h[5], f);
                 this.h[6] = sum32(this.h[6], g);
                 this.h[7] = sum32(this.h[7], h)
             };
             SHA256.prototype._digest = function digest(enc) {
                 if (enc === "hex") return utils.toHex32(this.h, "big");
                 else return utils.split32(this.h, "big")
             }
         }, {
             "../common": 25,
             "../utils": 35,
             "./common": 34,
             "minimalistic-assert": 39
         }],
         32: [function(require, module, exports) {
             arguments[4][11][0].apply(exports, arguments)
         }, {
             dup: 11
         }],
         33: [function(require, module, exports) {
             "use strict";
             var utils = require("../utils");
             var common = require("../common");
             var assert = require("minimalistic-assert");
             var rotr64_hi = utils.rotr64_hi;
             var rotr64_lo = utils.rotr64_lo;
             var shr64_hi = utils.shr64_hi;
             var shr64_lo = utils.shr64_lo;
             var sum64 = utils.sum64;
             var sum64_hi = utils.sum64_hi;
             var sum64_lo = utils.sum64_lo;
             var sum64_4_hi = utils.sum64_4_hi;
             var sum64_4_lo = utils.sum64_4_lo;
             var sum64_5_hi = utils.sum64_5_hi;
             var sum64_5_lo = utils.sum64_5_lo;
             var BlockHash = common.BlockHash;
             var sha512_K = [1116352408, 3609767458, 1899447441, 602891725, 3049323471, 3964484399, 3921009573, 2173295548, 961987163, 4081628472, 1508970993, 3053834265, 2453635748, 2937671579, 2870763221, 3664609560, 3624381080, 2734883394, 310598401, 1164996542, 607225278, 1323610764, 1426881987, 3590304994, 1925078388, 4068182383, 2162078206, 991336113, 2614888103, 633803317, 3248222580, 3479774868, 3835390401, 2666613458, 4022224774, 944711139, 264347078, 2341262773, 604807628, 2007800933, 770255983, 1495990901, 1249150122, 1856431235, 1555081692, 3175218132, 1996064986, 2198950837, 2554220882, 3999719339, 2821834349, 766784016, 2952996808, 2566594879, 3210313671, 3203337956, 3336571891, 1034457026, 3584528711, 2466948901, 113926993, 3758326383, 338241895, 168717936, 666307205, 1188179964, 773529912, 1546045734, 1294757372, 1522805485, 1396182291, 2643833823, 1695183700, 2343527390, 1986661051, 1014477480, 2177026350, 1206759142, 2456956037, 344077627, 2730485921, 1290863460, 2820302411, 3158454273, 3259730800, 3505952657, 3345764771, 106217008, 3516065817, 3606008344, 3600352804, 1432725776, 4094571909, 1467031594, 275423344, 851169720, 430227734, 3100823752, 506948616, 1363258195, 659060556, 3750685593, 883997877, 3785050280, 958139571, 3318307427, 1322822218, 3812723403, 1537002063, 2003034995, 1747873779, 3602036899, 1955562222, 1575990012, 2024104815, 1125592928, 2227730452, 2716904306, 2361852424, 442776044, 2428436474, 593698344, 2756734187, 3733110249, 3204031479, 2999351573, 3329325298, 3815920427, 3391569614, 3928383900, 3515267271, 566280711, 3940187606, 3454069534, 4118630271, 4000239992, 116418474, 1914138554, 174292421, 2731055270, 289380356, 3203993006, 460393269, 320620315, 685471733, 587496836, 852142971, 1086792851, 1017036298, 365543100, 1126000580, 2618297676, 1288033470, 3409855158, 1501505948, 4234509866, 1607167915, 987167468, 1816402316, 1246189591];

             function SHA512() {
                 if (!(this instanceof SHA512)) return new SHA512;
                 BlockHash.call(this);
                 this.h = [1779033703, 4089235720, 3144134277, 2227873595, 1013904242, 4271175723, 2773480762, 1595750129, 1359893119, 2917565137, 2600822924, 725511199, 528734635, 4215389547, 1541459225, 327033209];
                 this.k = sha512_K;
                 this.W = new Array(160)
             }
             utils.inherits(SHA512, BlockHash);
             module.exports = SHA512;
             SHA512.blockSize = 1024;
             SHA512.outSize = 512;
             SHA512.hmacStrength = 192;
             SHA512.padLength = 128;
             SHA512.prototype._prepareBlock = function _prepareBlock(msg, start) {
                 var W = this.W;
                 for (var i = 0; i < 32; i++) W[i] = msg[start + i];
                 for (; i < W.length; i += 2) {
                     var c0_hi = g1_512_hi(W[i - 4], W[i - 3]);
                     var c0_lo = g1_512_lo(W[i - 4], W[i - 3]);
                     var c1_hi = W[i - 14];
                     var c1_lo = W[i - 13];
                     var c2_hi = g0_512_hi(W[i - 30], W[i - 29]);
                     var c2_lo = g0_512_lo(W[i - 30], W[i - 29]);
                     var c3_hi = W[i - 32];
                     var c3_lo = W[i - 31];
                     W[i] = sum64_4_hi(c0_hi, c0_lo, c1_hi, c1_lo, c2_hi, c2_lo, c3_hi, c3_lo);
                     W[i + 1] = sum64_4_lo(c0_hi, c0_lo, c1_hi, c1_lo, c2_hi, c2_lo, c3_hi, c3_lo)
                 }
             };
             SHA512.prototype._update = function _update(msg, start) {
                 this._prepareBlock(msg, start);
                 var W = this.W;
                 var ah = this.h[0];
                 var al = this.h[1];
                 var bh = this.h[2];
                 var bl = this.h[3];
                 var ch = this.h[4];
                 var cl = this.h[5];
                 var dh = this.h[6];
                 var dl = this.h[7];
                 var eh = this.h[8];
                 var el = this.h[9];
                 var fh = this.h[10];
                 var fl = this.h[11];
                 var gh = this.h[12];
                 var gl = this.h[13];
                 var hh = this.h[14];
                 var hl = this.h[15];
                 assert(this.k.length === W.length);
                 for (var i = 0; i < W.length; i += 2) {
                     var c0_hi = hh;
                     var c0_lo = hl;
                     var c1_hi = s1_512_hi(eh, el);
                     var c1_lo = s1_512_lo(eh, el);
                     var c2_hi = ch64_hi(eh, el, fh, fl, gh, gl);
                     var c2_lo = ch64_lo(eh, el, fh, fl, gh, gl);
                     var c3_hi = this.k[i];
                     var c3_lo = this.k[i + 1];
                     var c4_hi = W[i];
                     var c4_lo = W[i + 1];
                     var T1_hi = sum64_5_hi(c0_hi, c0_lo, c1_hi, c1_lo, c2_hi, c2_lo, c3_hi, c3_lo, c4_hi, c4_lo);
                     var T1_lo = sum64_5_lo(c0_hi, c0_lo, c1_hi, c1_lo, c2_hi, c2_lo, c3_hi, c3_lo, c4_hi, c4_lo);
                     c0_hi = s0_512_hi(ah, al);
                     c0_lo = s0_512_lo(ah, al);
                     c1_hi = maj64_hi(ah, al, bh, bl, ch, cl);
                     c1_lo = maj64_lo(ah, al, bh, bl, ch, cl);
                     var T2_hi = sum64_hi(c0_hi, c0_lo, c1_hi, c1_lo);
                     var T2_lo = sum64_lo(c0_hi, c0_lo, c1_hi, c1_lo);
                     hh = gh;
                     hl = gl;
                     gh = fh;
                     gl = fl;
                     fh = eh;
                     fl = el;
                     eh = sum64_hi(dh, dl, T1_hi, T1_lo);
                     el = sum64_lo(dl, dl, T1_hi, T1_lo);
                     dh = ch;
                     dl = cl;
                     ch = bh;
                     cl = bl;
                     bh = ah;
                     bl = al;
                     ah = sum64_hi(T1_hi, T1_lo, T2_hi, T2_lo);
                     al = sum64_lo(T1_hi, T1_lo, T2_hi, T2_lo)
                 }
                 sum64(this.h, 0, ah, al);
                 sum64(this.h, 2, bh, bl);
                 sum64(this.h, 4, ch, cl);
                 sum64(this.h, 6, dh, dl);
                 sum64(this.h, 8, eh, el);
                 sum64(this.h, 10, fh, fl);
                 sum64(this.h, 12, gh, gl);
                 sum64(this.h, 14, hh, hl)
             };
             SHA512.prototype._digest = function digest(enc) {
                 if (enc === "hex") return utils.toHex32(this.h, "big");
                 else return utils.split32(this.h, "big")
             };

             function ch64_hi(xh, xl, yh, yl, zh) {
                 var r = xh & yh ^ ~xh & zh;
                 if (r < 0) r += 4294967296;
                 return r
             }

             function ch64_lo(xh, xl, yh, yl, zh, zl) {
                 var r = xl & yl ^ ~xl & zl;
                 if (r < 0) r += 4294967296;
                 return r
             }

             function maj64_hi(xh, xl, yh, yl, zh) {
                 var r = xh & yh ^ xh & zh ^ yh & zh;
                 if (r < 0) r += 4294967296;
                 return r
             }

             function maj64_lo(xh, xl, yh, yl, zh, zl) {
                 var r = xl & yl ^ xl & zl ^ yl & zl;
                 if (r < 0) r += 4294967296;
                 return r
             }

             function s0_512_hi(xh, xl) {
                 var c0_hi = rotr64_hi(xh, xl, 28);
                 var c1_hi = rotr64_hi(xl, xh, 2);
                 var c2_hi = rotr64_hi(xl, xh, 7);
                 var r = c0_hi ^ c1_hi ^ c2_hi;
                 if (r < 0) r += 4294967296;
                 return r
             }

             function s0_512_lo(xh, xl) {
                 var c0_lo = rotr64_lo(xh, xl, 28);
                 var c1_lo = rotr64_lo(xl, xh, 2);
                 var c2_lo = rotr64_lo(xl, xh, 7);
                 var r = c0_lo ^ c1_lo ^ c2_lo;
                 if (r < 0) r += 4294967296;
                 return r
             }

             function s1_512_hi(xh, xl) {
                 var c0_hi = rotr64_hi(xh, xl, 14);
                 var c1_hi = rotr64_hi(xh, xl, 18);
                 var c2_hi = rotr64_hi(xl, xh, 9);
                 var r = c0_hi ^ c1_hi ^ c2_hi;
                 if (r < 0) r += 4294967296;
                 return r
             }

             function s1_512_lo(xh, xl) {
                 var c0_lo = rotr64_lo(xh, xl, 14);
                 var c1_lo = rotr64_lo(xh, xl, 18);
                 var c2_lo = rotr64_lo(xl, xh, 9);
                 var r = c0_lo ^ c1_lo ^ c2_lo;
                 if (r < 0) r += 4294967296;
                 return r
             }

             function g0_512_hi(xh, xl) {
                 var c0_hi = rotr64_hi(xh, xl, 1);
                 var c1_hi = rotr64_hi(xh, xl, 8);
                 var c2_hi = shr64_hi(xh, xl, 7);
                 var r = c0_hi ^ c1_hi ^ c2_hi;
                 if (r < 0) r += 4294967296;
                 return r
             }

             function g0_512_lo(xh, xl) {
                 var c0_lo = rotr64_lo(xh, xl, 1);
                 var c1_lo = rotr64_lo(xh, xl, 8);
                 var c2_lo = shr64_lo(xh, xl, 7);
                 var r = c0_lo ^ c1_lo ^ c2_lo;
                 if (r < 0) r += 4294967296;
                 return r
             }

             function g1_512_hi(xh, xl) {
                 var c0_hi = rotr64_hi(xh, xl, 19);
                 var c1_hi = rotr64_hi(xl, xh, 29);
                 var c2_hi = shr64_hi(xh, xl, 6);
                 var r = c0_hi ^ c1_hi ^ c2_hi;
                 if (r < 0) r += 4294967296;
                 return r
             }

             function g1_512_lo(xh, xl) {
                 var c0_lo = rotr64_lo(xh, xl, 19);
                 var c1_lo = rotr64_lo(xl, xh, 29);
                 var c2_lo = shr64_lo(xh, xl, 6);
                 var r = c0_lo ^ c1_lo ^ c2_lo;
                 if (r < 0) r += 4294967296;
                 return r
             }
         }, {
             "../common": 25,
             "../utils": 35,
             "minimalistic-assert": 39
         }],
         34: [function(require, module, exports) {
             "use strict";
             var utils = require("../utils");
             var rotr32 = utils.rotr32;

             function ft_1(s, x, y, z) {
                 if (s === 0) return ch32(x, y, z);
                 if (s === 1 || s === 3) return p32(x, y, z);
                 if (s === 2) return maj32(x, y, z)
             }
             exports.ft_1 = ft_1;

             function ch32(x, y, z) {
                 return x & y ^ ~x & z
             }
             exports.ch32 = ch32;

             function maj32(x, y, z) {
                 return x & y ^ x & z ^ y & z
             }
             exports.maj32 = maj32;

             function p32(x, y, z) {
                 return x ^ y ^ z
             }
             exports.p32 = p32;

             function s0_256(x) {
                 return rotr32(x, 2) ^ rotr32(x, 13) ^ rotr32(x, 22)
             }
             exports.s0_256 = s0_256;

             function s1_256(x) {
                 return rotr32(x, 6) ^ rotr32(x, 11) ^ rotr32(x, 25)
             }
             exports.s1_256 = s1_256;

             function g0_256(x) {
                 return rotr32(x, 7) ^ rotr32(x, 18) ^ x >>> 3
             }
             exports.g0_256 = g0_256;

             function g1_256(x) {
                 return rotr32(x, 17) ^ rotr32(x, 19) ^ x >>> 10
             }
             exports.g1_256 = g1_256
         }, {
             "../utils": 35
         }],
         35: [function(require, module, exports) {
             "use strict";
             var assert = require("minimalistic-assert");
             var inherits = require("inherits");
             exports.inherits = inherits;

             function toArray(msg, enc) {
                 if (Array.isArray(msg)) return msg.slice();
                 if (!msg) return [];
                 var res = [];
                 if (typeof msg === "string") {
                     if (!enc) {
                         for (var i = 0; i < msg.length; i++) {
                             var c = msg.charCodeAt(i);
                             var hi = c >> 8;
                             var lo = c & 255;
                             if (hi) res.push(hi, lo);
                             else res.push(lo)
                         }
                     } else if (enc === "hex") {
                         msg = msg.replace(/[^a-z0-9]+/gi, "");
                         if (msg.length % 2 !== 0) msg = "0" + msg;
                         for (i = 0; i < msg.length; i += 2) res.push(parseInt(msg[i] + msg[i + 1], 16))
                     }
                 } else {
                     for (i = 0; i < msg.length; i++) res[i] = msg[i] | 0
                 }
                 return res
             }
             exports.toArray = toArray;

             function toHex(msg) {
                 var res = "";
                 for (var i = 0; i < msg.length; i++) res += zero2(msg[i].toString(16));
                 return res
             }
             exports.toHex = toHex;

             function htonl(w) {
                 var res = w >>> 24 | w >>> 8 & 65280 | w << 8 & 16711680 | (w & 255) << 24;
                 return res >>> 0
             }
             exports.htonl = htonl;

             function toHex32(msg, endian) {
                 var res = "";
                 for (var i = 0; i < msg.length; i++) {
                     var w = msg[i];
                     if (endian === "little") w = htonl(w);
                     res += zero8(w.toString(16))
                 }
                 return res
             }
             exports.toHex32 = toHex32;

             function zero2(word) {
                 if (word.length === 1) return "0" + word;
                 else return word
             }
             exports.zero2 = zero2;

             function zero8(word) {
                 if (word.length === 7) return "0" + word;
                 else if (word.length === 6) return "00" + word;
                 else if (word.length === 5) return "000" + word;
                 else if (word.length === 4) return "0000" + word;
                 else if (word.length === 3) return "00000" + word;
                 else if (word.length === 2) return "000000" + word;
                 else if (word.length === 1) return "0000000" + word;
                 else return word
             }
             exports.zero8 = zero8;

             function join32(msg, start, end, endian) {
                 var len = end - start;
                 assert(len % 4 === 0);
                 var res = new Array(len / 4);
                 for (var i = 0, k = start; i < res.length; i++, k += 4) {
                     var w;
                     if (endian === "big") w = msg[k] << 24 | msg[k + 1] << 16 | msg[k + 2] << 8 | msg[k + 3];
                     else w = msg[k + 3] << 24 | msg[k + 2] << 16 | msg[k + 1] << 8 | msg[k];
                     res[i] = w >>> 0
                 }
                 return res
             }
             exports.join32 = join32;

             function split32(msg, endian) {
                 var res = new Array(msg.length * 4);
                 for (var i = 0, k = 0; i < msg.length; i++, k += 4) {
                     var m = msg[i];
                     if (endian === "big") {
                         res[k] = m >>> 24;
                         res[k + 1] = m >>> 16 & 255;
                         res[k + 2] = m >>> 8 & 255;
                         res[k + 3] = m & 255
                     } else {
                         res[k + 3] = m >>> 24;
                         res[k + 2] = m >>> 16 & 255;
                         res[k + 1] = m >>> 8 & 255;
                         res[k] = m & 255
                     }
                 }
                 return res
             }
             exports.split32 = split32;

             function rotr32(w, b) {
                 return w >>> b | w << 32 - b
             }
             exports.rotr32 = rotr32;

             function rotl32(w, b) {
                 return w << b | w >>> 32 - b
             }
             exports.rotl32 = rotl32;

             function sum32(a, b) {
                 return a + b >>> 0
             }
             exports.sum32 = sum32;

             function sum32_3(a, b, c) {
                 return a + b + c >>> 0
             }
             exports.sum32_3 = sum32_3;

             function sum32_4(a, b, c, d) {
                 return a + b + c + d >>> 0
             }
             exports.sum32_4 = sum32_4;

             function sum32_5(a, b, c, d, e) {
                 return a + b + c + d + e >>> 0
             }
             exports.sum32_5 = sum32_5;

             function sum64(buf, pos, ah, al) {
                 var bh = buf[pos];
                 var bl = buf[pos + 1];
                 var lo = al + bl >>> 0;
                 var hi = (lo < al ? 1 : 0) + ah + bh;
                 buf[pos] = hi >>> 0;
                 buf[pos + 1] = lo
             }
             exports.sum64 = sum64;

             function sum64_hi(ah, al, bh, bl) {
                 var lo = al + bl >>> 0;
                 var hi = (lo < al ? 1 : 0) + ah + bh;
                 return hi >>> 0
             }
             exports.sum64_hi = sum64_hi;

             function sum64_lo(ah, al, bh, bl) {
                 var lo = al + bl;
                 return lo >>> 0
             }
             exports.sum64_lo = sum64_lo;

             function sum64_4_hi(ah, al, bh, bl, ch, cl, dh, dl) {
                 var carry = 0;
                 var lo = al;
                 lo = lo + bl >>> 0;
                 carry += lo < al ? 1 : 0;
                 lo = lo + cl >>> 0;
                 carry += lo < cl ? 1 : 0;
                 lo = lo + dl >>> 0;
                 carry += lo < dl ? 1 : 0;
                 var hi = ah + bh + ch + dh + carry;
                 return hi >>> 0
             }
             exports.sum64_4_hi = sum64_4_hi;

             function sum64_4_lo(ah, al, bh, bl, ch, cl, dh, dl) {
                 var lo = al + bl + cl + dl;
                 return lo >>> 0
             }
             exports.sum64_4_lo = sum64_4_lo;

             function sum64_5_hi(ah, al, bh, bl, ch, cl, dh, dl, eh, el) {
                 var carry = 0;
                 var lo = al;
                 lo = lo + bl >>> 0;
                 carry += lo < al ? 1 : 0;
                 lo = lo + cl >>> 0;
                 carry += lo < cl ? 1 : 0;
                 lo = lo + dl >>> 0;
                 carry += lo < dl ? 1 : 0;
                 lo = lo + el >>> 0;
                 carry += lo < el ? 1 : 0;
                 var hi = ah + bh + ch + dh + eh + carry;
                 return hi >>> 0
             }
             exports.sum64_5_hi = sum64_5_hi;

             function sum64_5_lo(ah, al, bh, bl, ch, cl, dh, dl, eh, el) {
                 var lo = al + bl + cl + dl + el;
                 return lo >>> 0
             }
             exports.sum64_5_lo = sum64_5_lo;

             function rotr64_hi(ah, al, num) {
                 var r = al << 32 - num | ah >>> num;
                 return r >>> 0
             }
             exports.rotr64_hi = rotr64_hi;

             function rotr64_lo(ah, al, num) {
                 var r = ah << 32 - num | al >>> num;
                 return r >>> 0
             }
             exports.rotr64_lo = rotr64_lo;

             function shr64_hi(ah, al, num) {
                 return ah >>> num
             }
             exports.shr64_hi = shr64_hi;

             function shr64_lo(ah, al, num) {
                 var r = ah << 32 - num | al >>> num;
                 return r >>> 0
             }
             exports.shr64_lo = shr64_lo
         }, {
             inherits: 36,
             "minimalistic-assert": 39
         }],
         36: [function(require, module, exports) {
             if (typeof Object.create === "function") {
                 module.exports = function inherits(ctor, superCtor) {
                     ctor.super_ = superCtor;
                     ctor.prototype = Object.create(superCtor.prototype, {
                         constructor: {
                             value: ctor,
                             enumerable: false,
                             writable: true,
                             configurable: true
                         }
                     })
                 }
             } else {
                 module.exports = function inherits(ctor, superCtor) {
                     ctor.super_ = superCtor;
                     var TempCtor = function() {};
                     TempCtor.prototype = superCtor.prototype;
                     ctor.prototype = new TempCtor;
                     ctor.prototype.constructor = ctor
                 }
             }
         }, {}],
         37: [function(require, module, exports) {
             arguments[4][36][0].apply(exports, arguments)
         }, {
             dup: 36
         }],
         38: [function(require, module, exports) {
             (function(process, global) {
                 (function() {
                     "use strict";
                     var root = typeof window === "object" ? window : {};
                     var NODE_JS = !root.JS_SHA3_NO_NODE_JS && typeof process === "object" && process.versions && process.versions.node;
                     if (NODE_JS) {
                         root = global
                     }
                     var COMMON_JS = !root.JS_SHA3_NO_COMMON_JS && typeof module === "object" && module.exports;
                     var HEX_CHARS = "0123456789abcdef".split("");
                     var SHAKE_PADDING = [31, 7936, 2031616, 520093696];
                     var KECCAK_PADDING = [1, 256, 65536, 16777216];
                     var PADDING = [6, 1536, 393216, 100663296];
                     var SHIFT = [0, 8, 16, 24];
                     var RC = [1, 0, 32898, 0, 32906, 2147483648, 2147516416, 2147483648, 32907, 0, 2147483649, 0, 2147516545, 2147483648, 32777, 2147483648, 138, 0, 136, 0, 2147516425, 0, 2147483658, 0, 2147516555, 0, 139, 2147483648, 32905, 2147483648, 32771, 2147483648, 32770, 2147483648, 128, 2147483648, 32778, 0, 2147483658, 2147483648, 2147516545, 2147483648, 32896, 2147483648, 2147483649, 0, 2147516424, 2147483648];
                     var BITS = [224, 256, 384, 512];
                     var SHAKE_BITS = [128, 256];
                     var OUTPUT_TYPES = ["hex", "buffer", "arrayBuffer", "array"];
                     var createOutputMethod = function(bits, padding, outputType) {
                         return function(message) {
                             return new Keccak(bits, padding, bits).update(message)[outputType]()
                         }
                     };
                     var createShakeOutputMethod = function(bits, padding, outputType) {
                         return function(message, outputBits) {
                             return new Keccak(bits, padding, outputBits).update(message)[outputType]()
                         }
                     };
                     var createMethod = function(bits, padding) {
                         var method = createOutputMethod(bits, padding, "hex");
                         method.create = function() {
                             return new Keccak(bits, padding, bits)
                         };
                         method.update = function(message) {
                             return method.create().update(message)
                         };
                         for (var i = 0; i < OUTPUT_TYPES.length; ++i) {
                             var type = OUTPUT_TYPES[i];
                             method[type] = createOutputMethod(bits, padding, type)
                         }
                         return method
                     };
                     var createShakeMethod = function(bits, padding) {
                         var method = createShakeOutputMethod(bits, padding, "hex");
                         method.create = function(outputBits) {
                             return new Keccak(bits, padding, outputBits)
                         };
                         method.update = function(message, outputBits) {
                             return method.create(outputBits).update(message)
                         };
                         for (var i = 0; i < OUTPUT_TYPES.length; ++i) {
                             var type = OUTPUT_TYPES[i];
                             method[type] = createShakeOutputMethod(bits, padding, type)
                         }
                         return method
                     };
                     var algorithms = [{
                         name: "keccak",
                         padding: KECCAK_PADDING,
                         bits: BITS,
                         createMethod: createMethod
                     }, {
                         name: "sha3",
                         padding: PADDING,
                         bits: BITS,
                         createMethod: createMethod
                     }, {
                         name: "shake",
                         padding: SHAKE_PADDING,
                         bits: SHAKE_BITS,
                         createMethod: createShakeMethod
                     }];
                     var methods = {},
                         methodNames = [];
                     for (var i = 0; i < algorithms.length; ++i) {
                         var algorithm = algorithms[i];
                         var bits = algorithm.bits;
                         for (var j = 0; j < bits.length; ++j) {
                             var methodName = algorithm.name + "_" + bits[j];
                             methodNames.push(methodName);
                             methods[methodName] = algorithm.createMethod(bits[j], algorithm.padding)
                         }
                     }

                     function Keccak(bits, padding, outputBits) {
                         this.blocks = [];
                         this.s = [];
                         this.padding = padding;
                         this.outputBits = outputBits;
                         this.reset = true;
                         this.block = 0;
                         this.start = 0;
                         this.blockCount = 1600 - (bits << 1) >> 5;
                         this.byteCount = this.blockCount << 2;
                         this.outputBlocks = outputBits >> 5;
                         this.extraBytes = (outputBits & 31) >> 3;
                         for (var i = 0; i < 50; ++i) {
                             this.s[i] = 0
                         }
                     }
                     Keccak.prototype.update = function(message) {
                         var notString = typeof message !== "string";
                         if (notString && message.constructor === ArrayBuffer) {
                             message = new Uint8Array(message)
                         }
                         var length = message.length,
                             blocks = this.blocks,
                             byteCount = this.byteCount,
                             blockCount = this.blockCount,
                             index = 0,
                             s = this.s,
                             i, code;
                         while (index < length) {
                             if (this.reset) {
                                 this.reset = false;
                                 blocks[0] = this.block;
                                 for (i = 1; i < blockCount + 1; ++i) {
                                     blocks[i] = 0
                                 }
                             }
                             if (notString) {
                                 for (i = this.start; index < length && i < byteCount; ++index) {
                                     blocks[i >> 2] |= message[index] << SHIFT[i++ & 3]
                                 }
                             } else {
                                 for (i = this.start; index < length && i < byteCount; ++index) {
                                     code = message.charCodeAt(index);
                                     if (code < 128) {
                                         blocks[i >> 2] |= code << SHIFT[i++ & 3]
                                     } else if (code < 2048) {
                                         blocks[i >> 2] |= (192 | code >> 6) << SHIFT[i++ & 3];
                                         blocks[i >> 2] |= (128 | code & 63) << SHIFT[i++ & 3]
                                     } else if (code < 55296 || code >= 57344) {
                                         blocks[i >> 2] |= (224 | code >> 12) << SHIFT[i++ & 3];
                                         blocks[i >> 2] |= (128 | code >> 6 & 63) << SHIFT[i++ & 3];
                                         blocks[i >> 2] |= (128 | code & 63) << SHIFT[i++ & 3]
                                     } else {
                                         code = 65536 + ((code & 1023) << 10 | message.charCodeAt(++index) & 1023);
                                         blocks[i >> 2] |= (240 | code >> 18) << SHIFT[i++ & 3];
                                         blocks[i >> 2] |= (128 | code >> 12 & 63) << SHIFT[i++ & 3];
                                         blocks[i >> 2] |= (128 | code >> 6 & 63) << SHIFT[i++ & 3];
                                         blocks[i >> 2] |= (128 | code & 63) << SHIFT[i++ & 3]
                                     }
                                 }
                             }
                             this.lastByteIndex = i;
                             if (i >= byteCount) {
                                 this.start = i - byteCount;
                                 this.block = blocks[blockCount];
                                 for (i = 0; i < blockCount; ++i) {
                                     s[i] ^= blocks[i]
                                 }
                                 f(s);
                                 this.reset = true
                             } else {
                                 this.start = i
                             }
                         }
                         return this
                     };
                     Keccak.prototype.finalize = function() {
                         var blocks = this.blocks,
                             i = this.lastByteIndex,
                             blockCount = this.blockCount,
                             s = this.s;
                         blocks[i >> 2] |= this.padding[i & 3];
                         if (this.lastByteIndex === this.byteCount) {
                             blocks[0] = blocks[blockCount];
                             for (i = 1; i < blockCount + 1; ++i) {
                                 blocks[i] = 0
                             }
                         }
                         blocks[blockCount - 1] |= 2147483648;
                         for (i = 0; i < blockCount; ++i) {
                             s[i] ^= blocks[i]
                         }
                         f(s)
                     };
                     Keccak.prototype.toString = Keccak.prototype.hex = function() {
                         this.finalize();
                         var blockCount = this.blockCount,
                             s = this.s,
                             outputBlocks = this.outputBlocks,
                             extraBytes = this.extraBytes,
                             i = 0,
                             j = 0;
                         var hex = "",
                             block;
                         while (j < outputBlocks) {
                             for (i = 0; i < blockCount && j < outputBlocks; ++i, ++j) {
                                 block = s[i];
                                 hex += HEX_CHARS[block >> 4 & 15] + HEX_CHARS[block & 15] + HEX_CHARS[block >> 12 & 15] + HEX_CHARS[block >> 8 & 15] + HEX_CHARS[block >> 20 & 15] + HEX_CHARS[block >> 16 & 15] + HEX_CHARS[block >> 28 & 15] + HEX_CHARS[block >> 24 & 15]
                             }
                             if (j % blockCount === 0) {
                                 f(s);
                                 i = 0
                             }
                         }
                         if (extraBytes) {
                             block = s[i];
                             if (extraBytes > 0) {
                                 hex += HEX_CHARS[block >> 4 & 15] + HEX_CHARS[block & 15]
                             }
                             if (extraBytes > 1) {
                                 hex += HEX_CHARS[block >> 12 & 15] + HEX_CHARS[block >> 8 & 15]
                             }
                             if (extraBytes > 2) {
                                 hex += HEX_CHARS[block >> 20 & 15] + HEX_CHARS[block >> 16 & 15]
                             }
                         }
                         return hex
                     };
                     Keccak.prototype.arrayBuffer = function() {
                         this.finalize();
                         var blockCount = this.blockCount,
                             s = this.s,
                             outputBlocks = this.outputBlocks,
                             extraBytes = this.extraBytes,
                             i = 0,
                             j = 0;
                         var bytes = this.outputBits >> 3;
                         var buffer;
                         if (extraBytes) {
                             buffer = new ArrayBuffer(outputBlocks + 1 << 2)
                         } else {
                             buffer = new ArrayBuffer(bytes)
                         }
                         var array = new Uint32Array(buffer);
                         while (j < outputBlocks) {
                             for (i = 0; i < blockCount && j < outputBlocks; ++i, ++j) {
                                 array[j] = s[i]
                             }
                             if (j % blockCount === 0) {
                                 f(s)
                             }
                         }
                         if (extraBytes) {
                             array[i] = s[i];
                             buffer = buffer.slice(0, bytes)
                         }
                         return buffer
                     };
                     Keccak.prototype.buffer = Keccak.prototype.arrayBuffer;
                     Keccak.prototype.digest = Keccak.prototype.array = function() {
                         this.finalize();
                         var blockCount = this.blockCount,
                             s = this.s,
                             outputBlocks = this.outputBlocks,
                             extraBytes = this.extraBytes,
                             i = 0,
                             j = 0;
                         var array = [],
                             offset, block;
                         while (j < outputBlocks) {
                             for (i = 0; i < blockCount && j < outputBlocks; ++i, ++j) {
                                 offset = j << 2;
                                 block = s[i];
                                 array[offset] = block & 255;
                                 array[offset + 1] = block >> 8 & 255;
                                 array[offset + 2] = block >> 16 & 255;
                                 array[offset + 3] = block >> 24 & 255
                             }
                             if (j % blockCount === 0) {
                                 f(s)
                             }
                         }
                         if (extraBytes) {
                             offset = j << 2;
                             block = s[i];
                             if (extraBytes > 0) {
                                 array[offset] = block & 255
                             }
                             if (extraBytes > 1) {
                                 array[offset + 1] = block >> 8 & 255
                             }
                             if (extraBytes > 2) {
                                 array[offset + 2] = block >> 16 & 255
                             }
                         }
                         return array
                     };
                     var f = function(s) {
                         var h, l, n, c0, c1, c2, c3, c4, c5, c6, c7, c8, c9, b0, b1, b2, b3, b4, b5, b6, b7, b8, b9, b10, b11, b12, b13, b14, b15, b16, b17, b18, b19, b20, b21, b22, b23, b24, b25, b26, b27, b28, b29, b30, b31, b32, b33, b34, b35, b36, b37, b38, b39, b40, b41, b42, b43, b44, b45, b46, b47, b48, b49;
                         for (n = 0; n < 48; n += 2) {
                             c0 = s[0] ^ s[10] ^ s[20] ^ s[30] ^ s[40];
                             c1 = s[1] ^ s[11] ^ s[21] ^ s[31] ^ s[41];
                             c2 = s[2] ^ s[12] ^ s[22] ^ s[32] ^ s[42];
                             c3 = s[3] ^ s[13] ^ s[23] ^ s[33] ^ s[43];
                             c4 = s[4] ^ s[14] ^ s[24] ^ s[34] ^ s[44];
                             c5 = s[5] ^ s[15] ^ s[25] ^ s[35] ^ s[45];
                             c6 = s[6] ^ s[16] ^ s[26] ^ s[36] ^ s[46];
                             c7 = s[7] ^ s[17] ^ s[27] ^ s[37] ^ s[47];
                             c8 = s[8] ^ s[18] ^ s[28] ^ s[38] ^ s[48];
                             c9 = s[9] ^ s[19] ^ s[29] ^ s[39] ^ s[49];
                             h = c8 ^ (c2 << 1 | c3 >>> 31);
                             l = c9 ^ (c3 << 1 | c2 >>> 31);
                             s[0] ^= h;
                             s[1] ^= l;
                             s[10] ^= h;
                             s[11] ^= l;
                             s[20] ^= h;
                             s[21] ^= l;
                             s[30] ^= h;
                             s[31] ^= l;
                             s[40] ^= h;
                             s[41] ^= l;
                             h = c0 ^ (c4 << 1 | c5 >>> 31);
                             l = c1 ^ (c5 << 1 | c4 >>> 31);
                             s[2] ^= h;
                             s[3] ^= l;
                             s[12] ^= h;
                             s[13] ^= l;
                             s[22] ^= h;
                             s[23] ^= l;
                             s[32] ^= h;
                             s[33] ^= l;
                             s[42] ^= h;
                             s[43] ^= l;
                             h = c2 ^ (c6 << 1 | c7 >>> 31);
                             l = c3 ^ (c7 << 1 | c6 >>> 31);
                             s[4] ^= h;
                             s[5] ^= l;
                             s[14] ^= h;
                             s[15] ^= l;
                             s[24] ^= h;
                             s[25] ^= l;
                             s[34] ^= h;
                             s[35] ^= l;
                             s[44] ^= h;
                             s[45] ^= l;
                             h = c4 ^ (c8 << 1 | c9 >>> 31);
                             l = c5 ^ (c9 << 1 | c8 >>> 31);
                             s[6] ^= h;
                             s[7] ^= l;
                             s[16] ^= h;
                             s[17] ^= l;
                             s[26] ^= h;
                             s[27] ^= l;
                             s[36] ^= h;
                             s[37] ^= l;
                             s[46] ^= h;
                             s[47] ^= l;
                             h = c6 ^ (c0 << 1 | c1 >>> 31);
                             l = c7 ^ (c1 << 1 | c0 >>> 31);
                             s[8] ^= h;
                             s[9] ^= l;
                             s[18] ^= h;
                             s[19] ^= l;
                             s[28] ^= h;
                             s[29] ^= l;
                             s[38] ^= h;
                             s[39] ^= l;
                             s[48] ^= h;
                             s[49] ^= l;
                             b0 = s[0];
                             b1 = s[1];
                             b32 = s[11] << 4 | s[10] >>> 28;
                             b33 = s[10] << 4 | s[11] >>> 28;
                             b14 = s[20] << 3 | s[21] >>> 29;
                             b15 = s[21] << 3 | s[20] >>> 29;
                             b46 = s[31] << 9 | s[30] >>> 23;
                             b47 = s[30] << 9 | s[31] >>> 23;
                             b28 = s[40] << 18 | s[41] >>> 14;
                             b29 = s[41] << 18 | s[40] >>> 14;
                             b20 = s[2] << 1 | s[3] >>> 31;
                             b21 = s[3] << 1 | s[2] >>> 31;
                             b2 = s[13] << 12 | s[12] >>> 20;
                             b3 = s[12] << 12 | s[13] >>> 20;
                             b34 = s[22] << 10 | s[23] >>> 22;
                             b35 = s[23] << 10 | s[22] >>> 22;
                             b16 = s[33] << 13 | s[32] >>> 19;
                             b17 = s[32] << 13 | s[33] >>> 19;
                             b48 = s[42] << 2 | s[43] >>> 30;
                             b49 = s[43] << 2 | s[42] >>> 30;
                             b40 = s[5] << 30 | s[4] >>> 2;
                             b41 = s[4] << 30 | s[5] >>> 2;
                             b22 = s[14] << 6 | s[15] >>> 26;
                             b23 = s[15] << 6 | s[14] >>> 26;
                             b4 = s[25] << 11 | s[24] >>> 21;
                             b5 = s[24] << 11 | s[25] >>> 21;
                             b36 = s[34] << 15 | s[35] >>> 17;
                             b37 = s[35] << 15 | s[34] >>> 17;
                             b18 = s[45] << 29 | s[44] >>> 3;
                             b19 = s[44] << 29 | s[45] >>> 3;
                             b10 = s[6] << 28 | s[7] >>> 4;
                             b11 = s[7] << 28 | s[6] >>> 4;
                             b42 = s[17] << 23 | s[16] >>> 9;
                             b43 = s[16] << 23 | s[17] >>> 9;
                             b24 = s[26] << 25 | s[27] >>> 7;
                             b25 = s[27] << 25 | s[26] >>> 7;
                             b6 = s[36] << 21 | s[37] >>> 11;
                             b7 = s[37] << 21 | s[36] >>> 11;
                             b38 = s[47] << 24 | s[46] >>> 8;
                             b39 = s[46] << 24 | s[47] >>> 8;
                             b30 = s[8] << 27 | s[9] >>> 5;
                             b31 = s[9] << 27 | s[8] >>> 5;
                             b12 = s[18] << 20 | s[19] >>> 12;
                             b13 = s[19] << 20 | s[18] >>> 12;
                             b44 = s[29] << 7 | s[28] >>> 25;
                             b45 = s[28] << 7 | s[29] >>> 25;
                             b26 = s[38] << 8 | s[39] >>> 24;
                             b27 = s[39] << 8 | s[38] >>> 24;
                             b8 = s[48] << 14 | s[49] >>> 18;
                             b9 = s[49] << 14 | s[48] >>> 18;
                             s[0] = b0 ^ ~b2 & b4;
                             s[1] = b1 ^ ~b3 & b5;
                             s[10] = b10 ^ ~b12 & b14;
                             s[11] = b11 ^ ~b13 & b15;
                             s[20] = b20 ^ ~b22 & b24;
                             s[21] = b21 ^ ~b23 & b25;
                             s[30] = b30 ^ ~b32 & b34;
                             s[31] = b31 ^ ~b33 & b35;
                             s[40] = b40 ^ ~b42 & b44;
                             s[41] = b41 ^ ~b43 & b45;
                             s[2] = b2 ^ ~b4 & b6;
                             s[3] = b3 ^ ~b5 & b7;
                             s[12] = b12 ^ ~b14 & b16;
                             s[13] = b13 ^ ~b15 & b17;
                             s[22] = b22 ^ ~b24 & b26;
                             s[23] = b23 ^ ~b25 & b27;
                             s[32] = b32 ^ ~b34 & b36;
                             s[33] = b33 ^ ~b35 & b37;
                             s[42] = b42 ^ ~b44 & b46;
                             s[43] = b43 ^ ~b45 & b47;
                             s[4] = b4 ^ ~b6 & b8;
                             s[5] = b5 ^ ~b7 & b9;
                             s[14] = b14 ^ ~b16 & b18;
                             s[15] = b15 ^ ~b17 & b19;
                             s[24] = b24 ^ ~b26 & b28;
                             s[25] = b25 ^ ~b27 & b29;
                             s[34] = b34 ^ ~b36 & b38;
                             s[35] = b35 ^ ~b37 & b39;
                             s[44] = b44 ^ ~b46 & b48;
                             s[45] = b45 ^ ~b47 & b49;
                             s[6] = b6 ^ ~b8 & b0;
                             s[7] = b7 ^ ~b9 & b1;
                             s[16] = b16 ^ ~b18 & b10;
                             s[17] = b17 ^ ~b19 & b11;
                             s[26] = b26 ^ ~b28 & b20;
                             s[27] = b27 ^ ~b29 & b21;
                             s[36] = b36 ^ ~b38 & b30;
                             s[37] = b37 ^ ~b39 & b31;
                             s[46] = b46 ^ ~b48 & b40;
                             s[47] = b47 ^ ~b49 & b41;
                             s[8] = b8 ^ ~b0 & b2;
                             s[9] = b9 ^ ~b1 & b3;
                             s[18] = b18 ^ ~b10 & b12;
                             s[19] = b19 ^ ~b11 & b13;
                             s[28] = b28 ^ ~b20 & b22;
                             s[29] = b29 ^ ~b21 & b23;
                             s[38] = b38 ^ ~b30 & b32;
                             s[39] = b39 ^ ~b31 & b33;
                             s[48] = b48 ^ ~b40 & b42;
                             s[49] = b49 ^ ~b41 & b43;
                             s[0] ^= RC[n];
                             s[1] ^= RC[n + 1]
                         }
                     };
                     if (COMMON_JS) {
                         module.exports = methods
                     } else {
                         for (var i = 0; i < methodNames.length; ++i) {
                             root[methodNames[i]] = methods[methodNames[i]]
                         }
                     }
                 })()
             }).call(this, require("_process"), typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
         }, {
             _process: 40
         }],
         39: [function(require, module, exports) {
             module.exports = assert;

             function assert(val, msg) {
                 if (!val) throw new Error(msg || "Assertion failed")
             }
             assert.equal = function assertEqual(l, r, msg) {
                 if (l != r) throw new Error(msg || "Assertion failed: " + l + " != " + r)
             }
         }, {}],
         40: [function(require, module, exports) {
             arguments[4][21][0].apply(exports, arguments)
         }, {
             dup: 21
         }],
         41: [function(require, module, exports) {
             "use strict";
             (function(root) {
                 var MAX_VALUE = 2147483647;

                 function SHA256(m) {
                     var K = [1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986, 2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711, 113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037, 2730485921, 2820302411, 3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344, 430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779, 1955562222, 2024104815, 2227730452, 2361852424, 2428436474, 2756734187, 3204031479, 3329325298];
                     var h0 = 1779033703,
                         h1 = 3144134277,
                         h2 = 1013904242,
                         h3 = 2773480762;
                     var h4 = 1359893119,
                         h5 = 2600822924,
                         h6 = 528734635,
                         h7 = 1541459225;
                     var w = new Array(64);

                     function blocks(p) {
                         var off = 0,
                             len = p.length;
                         while (len >= 64) {
                             var a = h0,
                                 b = h1,
                                 c = h2,
                                 d = h3,
                                 e = h4,
                                 f = h5,
                                 g = h6,
                                 h = h7,
                                 u, i, j, t1, t2;
                             for (i = 0; i < 16; i++) {
                                 j = off + i * 4;
                                 w[i] = (p[j] & 255) << 24 | (p[j + 1] & 255) << 16 | (p[j + 2] & 255) << 8 | p[j + 3] & 255
                             }
                             for (i = 16; i < 64; i++) {
                                 u = w[i - 2];
                                 t1 = (u >>> 17 | u << 32 - 17) ^ (u >>> 19 | u << 32 - 19) ^ u >>> 10;
                                 u = w[i - 15];
                                 t2 = (u >>> 7 | u << 32 - 7) ^ (u >>> 18 | u << 32 - 18) ^ u >>> 3;
                                 w[i] = (t1 + w[i - 7] | 0) + (t2 + w[i - 16] | 0) | 0
                             }
                             for (i = 0; i < 64; i++) {
                                 t1 = (((e >>> 6 | e << 32 - 6) ^ (e >>> 11 | e << 32 - 11) ^ (e >>> 25 | e << 32 - 25)) + (e & f ^ ~e & g) | 0) + (h + (K[i] + w[i] | 0) | 0) | 0;
                                 t2 = ((a >>> 2 | a << 32 - 2) ^ (a >>> 13 | a << 32 - 13) ^ (a >>> 22 | a << 32 - 22)) + (a & b ^ a & c ^ b & c) | 0;
                                 h = g;
                                 g = f;
                                 f = e;
                                 e = d + t1 | 0;
                                 d = c;
                                 c = b;
                                 b = a;
                                 a = t1 + t2 | 0
                             }
                             h0 = h0 + a | 0;
                             h1 = h1 + b | 0;
                             h2 = h2 + c | 0;
                             h3 = h3 + d | 0;
                             h4 = h4 + e | 0;
                             h5 = h5 + f | 0;
                             h6 = h6 + g | 0;
                             h7 = h7 + h | 0;
                             off += 64;
                             len -= 64
                         }
                     }
                     blocks(m);
                     var i, bytesLeft = m.length % 64,
                         bitLenHi = m.length / 536870912 | 0,
                         bitLenLo = m.length << 3,
                         numZeros = bytesLeft < 56 ? 56 : 120,
                         p = m.slice(m.length - bytesLeft, m.length);
                     p.push(128);
                     for (i = bytesLeft + 1; i < numZeros; i++) {
                         p.push(0)
                     }
                     p.push(bitLenHi >>> 24 & 255);
                     p.push(bitLenHi >>> 16 & 255);
                     p.push(bitLenHi >>> 8 & 255);
                     p.push(bitLenHi >>> 0 & 255);
                     p.push(bitLenLo >>> 24 & 255);
                     p.push(bitLenLo >>> 16 & 255);
                     p.push(bitLenLo >>> 8 & 255);
                     p.push(bitLenLo >>> 0 & 255);
                     blocks(p);
                     return [h0 >>> 24 & 255, h0 >>> 16 & 255, h0 >>> 8 & 255, h0 >>> 0 & 255, h1 >>> 24 & 255, h1 >>> 16 & 255, h1 >>> 8 & 255, h1 >>> 0 & 255, h2 >>> 24 & 255, h2 >>> 16 & 255, h2 >>> 8 & 255, h2 >>> 0 & 255, h3 >>> 24 & 255, h3 >>> 16 & 255, h3 >>> 8 & 255, h3 >>> 0 & 255, h4 >>> 24 & 255, h4 >>> 16 & 255, h4 >>> 8 & 255, h4 >>> 0 & 255, h5 >>> 24 & 255, h5 >>> 16 & 255, h5 >>> 8 & 255, h5 >>> 0 & 255, h6 >>> 24 & 255, h6 >>> 16 & 255, h6 >>> 8 & 255, h6 >>> 0 & 255, h7 >>> 24 & 255, h7 >>> 16 & 255, h7 >>> 8 & 255, h7 >>> 0 & 255]
                 }

                 function PBKDF2_HMAC_SHA256_OneIter(password, salt, dkLen) {
                     password = password.length <= 64 ? password : SHA256(password);
                     var i;
                     var innerLen = 64 + salt.length + 4;
                     var inner = new Array(innerLen);
                     var outerKey = new Array(64);
                     var dk = [];
                     for (i = 0; i < 64; i++) inner[i] = 54;
                     for (i = 0; i < password.length; i++) inner[i] ^= password[i];
                     for (i = 0; i < salt.length; i++) inner[64 + i] = salt[i];
                     for (i = innerLen - 4; i < innerLen; i++) inner[i] = 0;
                     for (i = 0; i < 64; i++) outerKey[i] = 92;
                     for (i = 0; i < password.length; i++) outerKey[i] ^= password[i];

                     function incrementCounter() {
                         for (var i = innerLen - 1; i >= innerLen - 4; i--) {
                             inner[i]++;
                             if (inner[i] <= 255) return;
                             inner[i] = 0
                         }
                     }
                     while (dkLen >= 32) {
                         incrementCounter();
                         dk = dk.concat(SHA256(outerKey.concat(SHA256(inner))));
                         dkLen -= 32
                     }
                     if (dkLen > 0) {
                         incrementCounter();
                         dk = dk.concat(SHA256(outerKey.concat(SHA256(inner))).slice(0, dkLen))
                     }
                     return dk
                 }

                 function blockmix_salsa8(BY, Yi, r, x, _X) {
                     var i;
                     arraycopy(BY, (2 * r - 1) * 16, _X, 0, 16);
                     for (i = 0; i < 2 * r; i++) {
                         blockxor(BY, i * 16, _X, 16);
                         salsa20_8(_X, x);
                         arraycopy(_X, 0, BY, Yi + i * 16, 16)
                     }
                     for (i = 0; i < r; i++) {
                         arraycopy(BY, Yi + i * 2 * 16, BY, i * 16, 16)
                     }
                     for (i = 0; i < r; i++) {
                         arraycopy(BY, Yi + (i * 2 + 1) * 16, BY, (i + r) * 16, 16)
                     }
                 }

                 function R(a, b) {
                     return a << b | a >>> 32 - b
                 }

                 function salsa20_8(B, x) {
                     arraycopy(B, 0, x, 0, 16);
                     for (var i = 8; i > 0; i -= 2) {
                         x[4] ^= R(x[0] + x[12], 7);
                         x[8] ^= R(x[4] + x[0], 9);
                         x[12] ^= R(x[8] + x[4], 13);
                         x[0] ^= R(x[12] + x[8], 18);
                         x[9] ^= R(x[5] + x[1], 7);
                         x[13] ^= R(x[9] + x[5], 9);
                         x[1] ^= R(x[13] + x[9], 13);
                         x[5] ^= R(x[1] + x[13], 18);
                         x[14] ^= R(x[10] + x[6], 7);
                         x[2] ^= R(x[14] + x[10], 9);
                         x[6] ^= R(x[2] + x[14], 13);
                         x[10] ^= R(x[6] + x[2], 18);
                         x[3] ^= R(x[15] + x[11], 7);
                         x[7] ^= R(x[3] + x[15], 9);
                         x[11] ^= R(x[7] + x[3], 13);
                         x[15] ^= R(x[11] + x[7], 18);
                         x[1] ^= R(x[0] + x[3], 7);
                         x[2] ^= R(x[1] + x[0], 9);
                         x[3] ^= R(x[2] + x[1], 13);
                         x[0] ^= R(x[3] + x[2], 18);
                         x[6] ^= R(x[5] + x[4], 7);
                         x[7] ^= R(x[6] + x[5], 9);
                         x[4] ^= R(x[7] + x[6], 13);
                         x[5] ^= R(x[4] + x[7], 18);
                         x[11] ^= R(x[10] + x[9], 7);
                         x[8] ^= R(x[11] + x[10], 9);
                         x[9] ^= R(x[8] + x[11], 13);
                         x[10] ^= R(x[9] + x[8], 18);
                         x[12] ^= R(x[15] + x[14], 7);
                         x[13] ^= R(x[12] + x[15], 9);
                         x[14] ^= R(x[13] + x[12], 13);
                         x[15] ^= R(x[14] + x[13], 18)
                     }
                     for (i = 0; i < 16; ++i) {
                         B[i] += x[i]
                     }
                 }

                 function blockxor(S, Si, D, len) {
                     for (var i = 0; i < len; i++) {
                         D[i] ^= S[Si + i]
                     }
                 }

                 function arraycopy(src, srcPos, dest, destPos, length) {
                     while (length--) {
                         dest[destPos++] = src[srcPos++]
                     }
                 }

                 function checkBufferish(o) {
                     if (!o || typeof o.length !== "number") {
                         return false
                     }
                     for (var i = 0; i < o.length; i++) {
                         if (typeof o[i] !== "number") {
                             return false
                         }
                         var v = parseInt(o[i]);
                         if (v != o[i] || v < 0 || v >= 256) {
                             return false
                         }
                     }
                     return true
                 }

                 function ensureInteger(value, name) {
                     var intValue = parseInt(value);
                     if (value != intValue) {
                         throw new Error("invalid " + name)
                     }
                     return intValue
                 }

                 function scrypt(password, salt, N, r, p, dkLen, callback) {
                     if (!callback) {
                         throw new Error("missing callback")
                     }
                     N = ensureInteger(N, "N");
                     r = ensureInteger(r, "r");
                     p = ensureInteger(p, "p");
                     dkLen = ensureInteger(dkLen, "dkLen");
                     if (N === 0 || (N & N - 1) !== 0) {
                         throw new Error("N must be power of 2")
                     }
                     if (N > MAX_VALUE / 128 / r) {
                         throw new Error("N too large")
                     }
                     if (r > MAX_VALUE / 128 / p) {
                         throw new Error("r too large")
                     }
                     if (!checkBufferish(password)) {
                         throw new Error("password must be an array or buffer")
                     }
                     if (!checkBufferish(salt)) {
                         throw new Error("salt must be an array or buffer")
                     }
                     var b = PBKDF2_HMAC_SHA256_OneIter(password, salt, p * 128 * r);
                     var B = new Uint32Array(p * 32 * r);
                     for (var i = 0; i < B.length; i++) {
                         var j = i * 4;
                         B[i] = (b[j + 3] & 255) << 24 | (b[j + 2] & 255) << 16 | (b[j + 1] & 255) << 8 | (b[j + 0] & 255) << 0
                     }
                     var XY = new Uint32Array(64 * r);
                     var V = new Uint32Array(32 * r * N);
                     var Yi = 32 * r;
                     var x = new Uint32Array(16);
                     var _X = new Uint32Array(16);
                     var totalOps = p * N * 2;
                     var currentOp = 0;
                     var lastPercent10 = null;
                     var stop = false;
                     var state = 0;
                     var i0 = 0,
                         i1;
                     var Bi;
                     var limit = parseInt(1e3 / r);
                     var nextTick = typeof setImmediate !== "undefined" ? setImmediate : setTimeout;
                     var incrementalSMix = function() {
                         if (stop) {
                             return callback(new Error("cancelled"), currentOp / totalOps)
                         }
                         switch (state) {
                             case 0:
                                 Bi = i0 * 32 * r;
                                 arraycopy(B, Bi, XY, 0, Yi);
                                 state = 1;
                                 i1 = 0;
                             case 1:
                                 var steps = N - i1;
                                 if (steps > limit) {
                                     steps = limit
                                 }
                                 for (var i = 0; i < steps; i++) {
                                     arraycopy(XY, 0, V, (i1 + i) * Yi, Yi);
                                     blockmix_salsa8(XY, Yi, r, x, _X)
                                 }
                                 i1 += steps;
                                 currentOp += steps;
                                 var percent10 = parseInt(1e3 * currentOp / totalOps);
                                 if (percent10 !== lastPercent10) {
                                     stop = callback(null, currentOp / totalOps);
                                     if (stop) {
                                         break
                                     }
                                     lastPercent10 = percent10
                                 }
                                 if (i1 < N) {
                                     break
                                 }
                                 i1 = 0;
                                 state = 2;
                             case 2:
                                 var steps = N - i1;
                                 if (steps > limit) {
                                     steps = limit
                                 }
                                 for (var i = 0; i < steps; i++) {
                                     var offset = (2 * r - 1) * 16;
                                     var j = XY[offset] & N - 1;
                                     blockxor(V, j * Yi, XY, Yi);
                                     blockmix_salsa8(XY, Yi, r, x, _X)
                                 }
                                 i1 += steps;
                                 currentOp += steps;
                                 var percent10 = parseInt(1e3 * currentOp / totalOps);
                                 if (percent10 !== lastPercent10) {
                                     stop = callback(null, currentOp / totalOps);
                                     if (stop) {
                                         break
                                     }
                                     lastPercent10 = percent10
                                 }
                                 if (i1 < N) {
                                     break
                                 }
                                 arraycopy(XY, 0, B, Bi, Yi);
                                 i0++;
                                 if (i0 < p) {
                                     state = 0;
                                     break
                                 }
                                 b = [];
                                 for (var i = 0; i < B.length; i++) {
                                     b.push(B[i] >> 0 & 255);
                                     b.push(B[i] >> 8 & 255);
                                     b.push(B[i] >> 16 & 255);
                                     b.push(B[i] >> 24 & 255)
                                 }
                                 var derivedKey = PBKDF2_HMAC_SHA256_OneIter(password, b, dkLen);
                                 return callback(null, 1, derivedKey)
                         }
                         nextTick(incrementalSMix)
                     };
                     incrementalSMix()
                 }
                 if (typeof exports !== "undefined") {
                     module.exports = scrypt
                 } else if (typeof define === "function" && define.amd) {
                     define(scrypt)
                 } else if (root) {
                     if (root.scrypt) {
                         root._scrypt = root.scrypt
                     }
                     root.scrypt = scrypt
                 }
             })(this)
         }, {}],
         42: [function(require, module, exports) {
             (function(process, global) {
                 (function(global, undefined) {
                     "use strict";
                     if (global.setImmediate) {
                         return
                     }
                     var nextHandle = 1;
                     var tasksByHandle = {};
                     var currentlyRunningATask = false;
                     var doc = global.document;
                     var setImmediate;

                     function addFromSetImmediateArguments(args) {
                         tasksByHandle[nextHandle] = partiallyApplied.apply(undefined, args);
                         return nextHandle++
                     }

                     function partiallyApplied(handler) {
                         var args = [].slice.call(arguments, 1);
                         return function() {
                             if (typeof handler === "function") {
                                 handler.apply(undefined, args)
                             } else {
                                 new Function("" + handler)()
                             }
                         }
                     }

                     function runIfPresent(handle) {
                         if (currentlyRunningATask) {
                             setTimeout(partiallyApplied(runIfPresent, handle), 0)
                         } else {
                             var task = tasksByHandle[handle];
                             if (task) {
                                 currentlyRunningATask = true;
                                 try {
                                     task()
                                 } finally {
                                     clearImmediate(handle);
                                     currentlyRunningATask = false
                                 }
                             }
                         }
                     }

                     function clearImmediate(handle) {
                         delete tasksByHandle[handle]
                     }

                     function installNextTickImplementation() {
                         setImmediate = function() {
                             var handle = addFromSetImmediateArguments(arguments);
                             process.nextTick(partiallyApplied(runIfPresent, handle));
                             return handle
                         }
                     }

                     function canUsePostMessage() {
                         if (global.postMessage && !global.importScripts) {
                             var postMessageIsAsynchronous = true;
                             var oldOnMessage = global.onmessage;
                             global.onmessage = function() {
                                 postMessageIsAsynchronous = false
                             };
                             global.postMessage("", "*");
                             global.onmessage = oldOnMessage;
                             return postMessageIsAsynchronous
                         }
                     }

                     function installPostMessageImplementation() {
                         var messagePrefix = "setImmediate$" + Math.random() + "$";
                         var onGlobalMessage = function(event) {
                             if (event.source === global && typeof event.data === "string" && event.data.indexOf(messagePrefix) === 0) {
                                 runIfPresent(+event.data.slice(messagePrefix.length))
                             }
                         };
                         if (global.addEventListener) {
                             global.addEventListener("message", onGlobalMessage, false)
                         } else {
                             global.attachEvent("onmessage", onGlobalMessage)
                         }
                         setImmediate = function() {
                             var handle = addFromSetImmediateArguments(arguments);
                             global.postMessage(messagePrefix + handle, "*");
                             return handle
                         }
                     }

                     function installMessageChannelImplementation() {
                         var channel = new MessageChannel;
                         channel.port1.onmessage = function(event) {
                             var handle = event.data;
                             runIfPresent(handle)
                         };
                         setImmediate = function() {
                             var handle = addFromSetImmediateArguments(arguments);
                             channel.port2.postMessage(handle);
                             return handle
                         }
                     }

                     function installReadyStateChangeImplementation() {
                         var html = doc.documentElement;
                         setImmediate = function() {
                             var handle = addFromSetImmediateArguments(arguments);
                             var script = doc.createElement("script");
                             script.onreadystatechange = function() {
                                 runIfPresent(handle);
                                 script.onreadystatechange = null;
                                 html.removeChild(script);
                                 script = null
                             };
                             html.appendChild(script);
                             return handle
                         }
                     }

                     function installSetTimeoutImplementation() {
                         setImmediate = function() {
                             var handle = addFromSetImmediateArguments(arguments);
                             setTimeout(partiallyApplied(runIfPresent, handle), 0);
                             return handle
                         }
                     }
                     var attachTo = Object.getPrototypeOf && Object.getPrototypeOf(global);
                     attachTo = attachTo && attachTo.setTimeout ? attachTo : global;
                     if ({}.toString.call(global.process) === "[object process]") {
                         installNextTickImplementation()
                     } else if (canUsePostMessage()) {
                         installPostMessageImplementation()
                     } else if (global.MessageChannel) {
                         installMessageChannelImplementation()
                     } else if (doc && "onreadystatechange" in doc.createElement("script")) {
                         installReadyStateChangeImplementation()
                     } else {
                         installSetTimeoutImplementation()
                     }
                     attachTo.setImmediate = setImmediate;
                     attachTo.clearImmediate = clearImmediate
                 })(typeof self === "undefined" ? typeof global === "undefined" ? this : global : self)
             }).call(this, require("_process"), typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
         }, {
             _process: 40
         }],
         43: [function(require, module, exports) {
             (function(global) {
                 var rng;
                 if (global.crypto && crypto.getRandomValues) {
                     var _rnds8 = new Uint8Array(16);
                     rng = function whatwgRNG() {
                         crypto.getRandomValues(_rnds8);
                         return _rnds8
                     }
                 }
                 if (!rng) {
                     var _rnds = new Array(16);
                     rng = function() {
                         for (var i = 0, r; i < 16; i++) {
                             if ((i & 3) === 0) r = Math.random() * 4294967296;
                             _rnds[i] = r >>> ((i & 3) << 3) & 255
                         }
                         return _rnds
                     }
                 }
                 module.exports = rng
             }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
         }, {}],
         44: [function(require, module, exports) {
             var _rng = require("./rng");
             var _byteToHex = [];
             var _hexToByte = {};
             for (var i = 0; i < 256; i++) {
                 _byteToHex[i] = (i + 256).toString(16).substr(1);
                 _hexToByte[_byteToHex[i]] = i
             }

             function parse(s, buf, offset) {
                 var i = buf && offset || 0,
                     ii = 0;
                 buf = buf || [];
                 s.toLowerCase().replace(/[0-9a-f]{2}/g, function(oct) {
                     if (ii < 16) {
                         buf[i + ii++] = _hexToByte[oct]
                     }
                 });
                 while (ii < 16) {
                     buf[i + ii++] = 0
                 }
                 return buf
             }

             function unparse(buf, offset) {
                 var i = offset || 0,
                     bth = _byteToHex;
                 return bth[buf[i++]] + bth[buf[i++]] + bth[buf[i++]] + bth[buf[i++]] + "-" + bth[buf[i++]] + bth[buf[i++]] + "-" + bth[buf[i++]] + bth[buf[i++]] + "-" + bth[buf[i++]] + bth[buf[i++]] + "-" + bth[buf[i++]] + bth[buf[i++]] + bth[buf[i++]] + bth[buf[i++]] + bth[buf[i++]] + bth[buf[i++]]
             }
             var _seedBytes = _rng();
             var _nodeId = [_seedBytes[0] | 1, _seedBytes[1], _seedBytes[2], _seedBytes[3], _seedBytes[4], _seedBytes[5]];
             var _clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 16383;
             var _lastMSecs = 0,
                 _lastNSecs = 0;

             function v1(options, buf, offset) {
                 var i = buf && offset || 0;
                 var b = buf || [];
                 options = options || {};
                 var clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq;
                 var msecs = options.msecs !== undefined ? options.msecs : (new Date).getTime();
                 var nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1;
                 var dt = msecs - _lastMSecs + (nsecs - _lastNSecs) / 1e4;
                 if (dt < 0 && options.clockseq === undefined) {
                     clockseq = clockseq + 1 & 16383
                 }
                 if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
                     nsecs = 0
                 }
                 if (nsecs >= 1e4) {
                     throw new Error("uuid.v1(): Can't create more than 10M uuids/sec")
                 }
                 _lastMSecs = msecs;
                 _lastNSecs = nsecs;
                 _clockseq = clockseq;
                 msecs += 122192928e5;
                 var tl = ((msecs & 268435455) * 1e4 + nsecs) % 4294967296;
                 b[i++] = tl >>> 24 & 255;
                 b[i++] = tl >>> 16 & 255;
                 b[i++] = tl >>> 8 & 255;
                 b[i++] = tl & 255;
                 var tmh = msecs / 4294967296 * 1e4 & 268435455;
                 b[i++] = tmh >>> 8 & 255;
                 b[i++] = tmh & 255;
                 b[i++] = tmh >>> 24 & 15 | 16;
                 b[i++] = tmh >>> 16 & 255;
                 b[i++] = clockseq >>> 8 | 128;
                 b[i++] = clockseq & 255;
                 var node = options.node || _nodeId;
                 for (var n = 0; n < 6; n++) {
                     b[i + n] = node[n]
                 }
                 return buf ? buf : unparse(b)
             }

             function v4(options, buf, offset) {
                 var i = buf && offset || 0;
                 if (typeof options == "string") {
                     buf = options == "binary" ? new Array(16) : null;
                     options = null
                 }
                 options = options || {};
                 var rnds = options.random || (options.rng || _rng)();
                 rnds[6] = rnds[6] & 15 | 64;
                 rnds[8] = rnds[8] & 63 | 128;
                 if (buf) {
                     for (var ii = 0; ii < 16; ii++) {
                         buf[i + ii] = rnds[ii]
                     }
                 }
                 return buf || unparse(rnds)
             }
             var uuid = v4;
             uuid.v1 = v1;
             uuid.v4 = v4;
             uuid.parse = parse;
             uuid.unparse = unparse;
             module.exports = uuid
         }, {
             "./rng": 43
         }],
         45: [function(require, module, exports) {
             module.exports = {
                 version: "3.0.6"
             }
         }, {}],
         46: [function(require, module, exports) {
             "use strict";
             try {
                 module.exports.XMLHttpRequest = XMLHttpRequest
             } catch (error) {
                 console.log("Warning: XMLHttpRequest is not defined");
                 module.exports.XMLHttpRequest = null
             }
         }, {}],
         47: [function(require, module, exports) {
             "use strict";
             var Provider = require("./provider.js");
             var utils = function() {
                 var convert = require("../utils/convert.js");
                 return {
                     defineProperty: require("../utils/properties.js").defineProperty,
                     hexlify: convert.hexlify,
                     hexStripZeros: convert.hexStripZeros
                 }
             }();

             function getTransactionString(transaction) {
                 var result = [];
                 for (var key in transaction) {
                     if (transaction[key] == null) {
                         continue
                     }
                     var value = utils.hexlify(transaction[key]);
                     if ({
                             gasLimit: true,
                             gasPrice: true,
                             nonce: true,
                             value: true
                         }[key]) {
                         value = utils.hexStripZeros(value)
                     }
                     result.push(key + "=" + value)
                 }
                 return result.join("&")
             }

             function EtherscanProvider(network, apiKey) {
                 Provider.call(this, network);
                 var baseUrl = null;
                 switch (this.name) {
                     case "homestead":
                         baseUrl = "https://api.etherscan.io";
                         break;
                     case "ropsten":
                         baseUrl = "https://ropsten.etherscan.io";
                         break;
                     case "rinkeby":
                         baseUrl = "https://rinkeby.etherscan.io";
                         break;
                     case "kovan":
                         baseUrl = "https://kovan.etherscan.io";
                         break;
                     default:
                         throw new Error("unsupported network")
                 }
                 utils.defineProperty(this, "baseUrl", baseUrl);
                 utils.defineProperty(this, "apiKey", apiKey || null)
             }
             Provider.inherits(EtherscanProvider);
             utils.defineProperty(EtherscanProvider.prototype, "_call", function() {});
             utils.defineProperty(EtherscanProvider.prototype, "_callProxy", function() {});

             function getResult(result) {
                 if (result.status == 0 && result.message === "No records found") {
                     return result.result
                 }
                 if (result.status != 1 || result.message != "OK") {
                     var error = new Error("invalid response");
                     error.result = JSON.stringify(result);
                     throw error
                 }
                 return result.result
             }

             function getJsonResult(result) {
                 if (result.jsonrpc != "2.0") {
                     var error = new Error("invalid response");
                     error.result = JSON.stringify(result);
                     throw error
                 }
                 if (result.error) {
                     var error = new Error(result.error.message || "unknown error");
                     if (result.error.code) {
                         error.code = result.error.code
                     }
                     if (result.error.data) {
                         error.data = result.error.data
                     }
                     throw error
                 }
                 return result.result
             }

             function checkLogTag(blockTag) {
                 if (blockTag === "pending") {
                     throw new Error("pending not supported")
                 }
                 if (blockTag === "latest") {
                     return blockTag
                 }
                 return parseInt(blockTag.substring(2), 16)
             }
             utils.defineProperty(EtherscanProvider.prototype, "perform", function(method, params) {
                 if (!params) {
                     params = {}
                 }
                 var url = this.baseUrl;
                 var apiKey = "";
                 if (this.apiKey) {
                     apiKey += "&apikey=" + this.apiKey
                 }
                 switch (method) {
                     case "getBlockNumber":
                         url += "/api?module=proxy&action=eth_blockNumber" + apiKey;
                         return Provider.fetchJSON(url, null, getJsonResult);
                     case "getGasPrice":
                         url += "/api?module=proxy&action=eth_gasPrice" + apiKey;
                         return Provider.fetchJSON(url, null, getJsonResult);
                     case "getBalance":
                         url += "/api?module=account&action=balance&address=" + params.address;
                         url += "&tag=" + params.blockTag + apiKey;
                         return Provider.fetchJSON(url, null, getResult);
                     case "getTransactionCount":
                         url += "/api?module=proxy&action=eth_getTransactionCount&address=" + params.address;
                         url += "&tag=" + params.blockTag + apiKey;
                         return Provider.fetchJSON(url, null, getJsonResult);
                     case "getCode":
                         url += "/api?module=proxy&action=eth_getCode&address=" + params.address;
                         url += "&tag=" + params.blockTag + apiKey;
                         return Provider.fetchJSON(url, null, getJsonResult);
                     case "getStorageAt":
                         url += "/api?module=proxy&action=eth_getStorageAt&address=" + params.address;
                         url += "&position=" + params.position;
                         url += "&tag=" + params.blockTag + apiKey;
                         return Provider.fetchJSON(url, null, getJsonResult);
                     case "sendTransaction":
                         url += "/api?module=proxy&action=eth_sendRawTransaction&hex=" + params.signedTransaction;
                         url += apiKey;
                         return Provider.fetchJSON(url, null, getJsonResult);
                     case "getBlock":
                         if (params.blockTag) {
                             url += "/api?module=proxy&action=eth_getBlockByNumber&tag=" + params.blockTag;
                             url += "&boolean=false";
                             url += apiKey;
                             return Provider.fetchJSON(url, null, getJsonResult)
                         }
                         throw new Error("getBlock by blockHash not implmeneted");
                     case "getTransaction":
                         url += "/api?module=proxy&action=eth_getTransactionByHash&txhash=" + params.transactionHash;
                         url += apiKey;
                         return Provider.fetchJSON(url, null, getJsonResult);
                     case "getTransactionReceipt":
                         url += "/api?module=proxy&action=eth_getTransactionReceipt&txhash=" + params.transactionHash;
                         url += apiKey;
                         return Provider.fetchJSON(url, null, getJsonResult);
                     case "call":
                         var transaction = getTransactionString(params.transaction);
                         if (transaction) {
                             transaction = "&" + transaction
                         }
                         url += "/api?module=proxy&action=eth_call" + transaction;
                         url += apiKey;
                         return Provider.fetchJSON(url, null, getJsonResult);
                     case "estimateGas":
                         var transaction = getTransactionString(params.transaction);
                         if (transaction) {
                             transaction = "&" + transaction
                         }
                         url += "/api?module=proxy&action=eth_estimateGas&" + transaction;
                         url += apiKey;
                         return Provider.fetchJSON(url, null, getJsonResult);
                     case "getLogs":
                         url += "/api?module=logs&action=getLogs";
                         try {
                             if (params.filter.fromBlock) {
                                 url += "&fromBlock=" + checkLogTag(params.filter.fromBlock)
                             }
                             if (params.filter.toBlock) {
                                 url += "&toBlock=" + checkLogTag(params.filter.toBlock)
                             }
                             if (params.filter.address) {
                                 url += "&address=" + params.filter.address
                             }
                             if (params.filter.topics && params.filter.topics.length > 0) {
                                 if (params.filter.topics.length > 1) {
                                     throw new Error("unsupported topic format")
                                 }
                                 var topic0 = params.filter.topics[0];
                                 if (typeof topic0 !== "string" || topic0.length !== 66) {
                                     throw new Error("unsupported topic0 format")
                                 }
                                 url += "&topic0=" + topic0
                             }
                         } catch (error) {
                             return Promise.reject(error)
                         }
                         url += apiKey;
                         return Provider.fetchJSON(url, null, getResult);
                     case "getEtherPrice":
                         if (this.name !== "homestead") {
                             return Promise.resolve(0)
                         }
                         url += "/api?module=stats&action=ethprice";
                         url += apiKey;
                         return Provider.fetchJSON(url, null, getResult).then(function(result) {
                             return parseFloat(result.ethusd)
                         });
                     default:
                         break
                 }
                 return Promise.reject(new Error("not implemented - " + method))
             });
             utils.defineProperty(EtherscanProvider.prototype, "getHistory", function(addressOrName, startBlock, endBlock) {
                 var url = this.baseUrl;
                 var apiKey = "";
                 if (this.apiKey) {
                     apiKey += "&apikey=" + this.apiKey
                 }
                 if (startBlock == null) {
                     startBlock = 0
                 }
                 if (endBlock == null) {
                     endBlock = 99999999
                 }
                 return this.resolveName(addressOrName).then(function(address) {
                     url += "/api?module=account&action=txlist&address=" + address;
                     url += "&startblock=" + startBlock;
                     url += "&endblock=" + endBlock;
                     url += "&sort=asc";
                     return Provider.fetchJSON(url, null, getResult).then(function(result) {
                         var output = [];
                         result.forEach(function(tx) {
                             ["contractAddress", "to"].forEach(function(key) {
                                 if (tx[key] == "") {
                                     delete tx[key]
                                 }
                             });
                             if (tx.creates == null && tx.contractAddress != null) {
                                 tx.creates = tx.contractAddress
                             }
                             output.push(Provider._formatters.checkTransactionResponse(tx))
                         });
                         return output
                     })
                 })
             });
             module.exports = EtherscanProvider
         }, {
             "../utils/convert.js": 60,
             "../utils/properties.js": 67,
             "./provider.js": 53
         }],
         48: [function(require, module, exports) {
             "use strict";
             var inherits = require("inherits");
             var Provider = require("./provider.js");
             var utils = function() {
                 return {
                     defineProperty: require("../utils/properties.js").defineProperty
                 }
             }();

             function FallbackProvider(providers) {
                 if (providers.length === 0) {
                     throw new Error("no providers")
                 }
                 var network = {};
                 ["chainId", "ensAddress", "name", "testnet"].forEach(function(key) {
                     for (var i = 1; i < providers.length; i++) {
                         if (providers[0][key] !== providers[i][key]) {
                             throw new Error("incompatible providers - " + key + " mismatch")
                         }
                     }
                     network[key] = providers[0][key]
                 });
                 if (!(this instanceof FallbackProvider)) {
                     throw new Error("missing new")
                 }
                 Provider.call(this, network);
                 providers = providers.slice(0);
                 Object.defineProperty(this, "providers", {
                     get: function() {
                         return providers.slice(0)
                     }
                 })
             }
             inherits(FallbackProvider, Provider);
             utils.defineProperty(FallbackProvider.prototype, "perform", function(method, params) {
                 var providers = this.providers;
                 return new Promise(function(resolve, reject) {
                     var firstError = null;

                     function next() {
                         if (!providers.length) {
                             reject(firstError);
                             return
                         }
                         var provider = providers.shift();
                         provider.perform(method, params).then(function(result) {
                             resolve(result)
                         }, function(error) {
                             if (!firstError) {
                                 firstError = error
                             }
                             next()
                         })
                     }
                     next()
                 })
             });
             module.exports = FallbackProvider
         }, {
             "../utils/properties.js": 67,
             "./provider.js": 53,
             inherits: 37
         }],
         49: [function(require, module, exports) {
             "use strict";
             var Provider = require("./provider.js");
             var EtherscanProvider = require("./etherscan-provider.js");
             var FallbackProvider = require("./fallback-provider.js");
             var InfuraProvider = require("./infura-provider.js");
             var JsonRpcProvider = require("./json-rpc-provider.js");
             var Web3Provider = require("./web3-provider.js");

             function getDefaultProvider(network) {
                 return new FallbackProvider([new InfuraProvider(network), new EtherscanProvider(network)])
             }
             module.exports = {
                 EtherscanProvider: EtherscanProvider,
                 FallbackProvider: FallbackProvider,
                 InfuraProvider: InfuraProvider,
                 JsonRpcProvider: JsonRpcProvider,
                 Web3Provider: Web3Provider,
                 isProvider: Provider.isProvider,
                 networks: Provider.networks,
                 getDefaultProvider: getDefaultProvider,
                 Provider: Provider
             }
         }, {
             "./etherscan-provider.js": 47,
             "./fallback-provider.js": 48,
             "./infura-provider.js": 50,
             "./json-rpc-provider.js": 51,
             "./provider.js": 53,
             "./web3-provider.js": 54
         }],
         50: [function(require, module, exports) {
             "use strict";
             var Provider = require("./provider");
             var JsonRpcProvider = require("./json-rpc-provider");
             var utils = function() {
                 return {
                     defineProperty: require("../utils/properties.js").defineProperty
                 }
             }();

             function InfuraProvider(network, apiAccessToken) {
                 if (!(this instanceof InfuraProvider)) {
                     throw new Error("missing new")
                 }
                 network = Provider.getNetwork(network);
                 var host = null;
                 switch (network.name) {
                     case "homestead":
                         host = "mainnet.infura.io";
                         break;
                     case "ropsten":
                         host = "ropsten.infura.io";
                         break;
                     case "rinkeby":
                         host = "rinkeby.infura.io";
                         break;
                     case "kovan":
                         host = "kovan.infura.io";
                         break;
                     default:
                         throw new Error("unsupported network")
                 }
                 var url = "https://" + host + "/" + (apiAccessToken || "");
                 JsonRpcProvider.call(this, url, network);
                 utils.defineProperty(this, "apiAccessToken", apiAccessToken || null)
             }
             JsonRpcProvider.inherits(InfuraProvider);
             utils.defineProperty(InfuraProvider.prototype, "_startPending", function() {
                 console.log("WARNING: INFURA does not support pending filters")
             });
             utils.defineProperty(InfuraProvider.prototype, "_stopPending", function() {});
             module.exports = InfuraProvider
         }, {
             "../utils/properties.js": 67,
             "./json-rpc-provider": 51,
             "./provider": 53
         }],
         51: [function(require, module, exports) {
             "use strict";
             var Provider = require("./provider.js");
             var utils = function() {
                 var convert = require("../utils/convert");
                 return {
                     defineProperty: require("../utils/properties").defineProperty,
                     hexlify: convert.hexlify,
                     isHexString: convert.isHexString,
                     hexStripZeros: convert.hexStripZeros
                 }
             }();

             function timer(timeout) {
                 return new Promise(function(resolve) {
                     setTimeout(function() {
                         resolve()
                     }, timeout)
                 })
             }

             function getResult(payload) {
                 if (payload.error) {
                     var error = new Error(payload.error.message);
                     error.code = payload.error.code;
                     error.data = payload.error.data;
                     throw error
                 }
                 return payload.result
             }

             function getTransaction(transaction) {
                 var result = {};
                 for (var key in transaction) {
                     result[key] = utils.hexlify(transaction[key])
                 }["gasLimit", "gasPrice", "nonce", "value"].forEach(function(key) {
                     if (!result[key]) {
                         return
                     }
                     result[key] = utils.hexStripZeros(result[key])
                 });
                 if (result.gasLimit != null && result.gas == null) {
                     result.gas = result.gasLimit;
                     delete result.gasLimit
                 }
                 return result
             }

             function JsonRpcProvider(url, network) {
                 if (!(this instanceof JsonRpcProvider)) {
                     throw new Error("missing new")
                 }
                 if (arguments.length == 1) {
                     if (typeof url === "string") {
                         try {
                             network = Provider.getNetwork(url);
                             url = null
                         } catch (error) {}
                     } else {
                         network = url;
                         url = null
                     }
                 }
                 Provider.call(this, network);
                 if (!url) {
                     url = "http://localhost:8545"
                 }
                 utils.defineProperty(this, "url", url)
             }
             Provider.inherits(JsonRpcProvider);
             utils.defineProperty(JsonRpcProvider.prototype, "send", function(method, params) {
                 var request = {
                     method: method,
                     params: params,
                     id: 42,
                     jsonrpc: "2.0"
                 };
                 return Provider.fetchJSON(this.url, JSON.stringify(request), getResult)
             });
             utils.defineProperty(JsonRpcProvider.prototype, "perform", function(method, params) {
                 switch (method) {
                     case "getBlockNumber":
                         return this.send("eth_blockNumber", []);
                     case "getGasPrice":
                         return this.send("eth_gasPrice", []);
                     case "getBalance":
                         return this.send("eth_getBalance", [params.address, params.blockTag]);
                     case "getTransactionCount":
                         return this.send("eth_getTransactionCount", [params.address, params.blockTag]);
                     case "getCode":
                         return this.send("eth_getCode", [params.address, params.blockTag]);
                     case "getStorageAt":
                         return this.send("eth_getStorageAt", [params.address, params.position, params.blockTag]);
                     case "sendTransaction":
                         return this.send("eth_sendRawTransaction", [params.signedTransaction]);
                     case "getBlock":
                         if (params.blockTag) {
                             return this.send("eth_getBlockByNumber", [params.blockTag, false])
                         } else if (params.blockHash) {
                             return this.send("eth_getBlockByHash", [params.blockHash, false])
                         }
                         return Promise.reject(new Error("invalid block tag or block hash"));
                     case "getTransaction":
                         return this.send("eth_getTransactionByHash", [params.transactionHash]);
                     case "getTransactionReceipt":
                         return this.send("eth_getTransactionReceipt", [params.transactionHash]);
                     case "call":
                         return this.send("eth_call", [getTransaction(params.transaction), "latest"]);
                     case "estimateGas":
                         return this.send("eth_estimateGas", [getTransaction(params.transaction)]);
                     case "getLogs":
                         return this.send("eth_getLogs", [params.filter]);
                     default:
                         break
                 }
                 return Promise.reject(new Error("not implemented - " + method))
             });
             utils.defineProperty(JsonRpcProvider.prototype, "_startPending", function() {
                 if (this._pendingFilter != null) {
                     return
                 }
                 var self = this;
                 var pendingFilter = this.send("eth_newPendingTransactionFilter", []);
                 this._pendingFilter = pendingFilter;
                 pendingFilter.then(function(filterId) {
                     function poll() {
                         self.send("eth_getFilterChanges", [filterId]).then(function(hashes) {
                             if (self._pendingFilter != pendingFilter) {
                                 return
                             }
                             var seq = Promise.resolve();
                             hashes.forEach(function(hash) {
                                 seq = seq.then(function() {
                                     return self.getTransaction(hash).then(function(tx) {
                                         self.emit("pending", tx)
                                     })
                                 })
                             });
                             return seq.then(function() {
                                 return timer(1e3)
                             })
                         }).then(function() {
                             if (self._pendingFilter != pendingFilter) {
                                 self.send("eth_uninstallFilter", [filterIf]);
                                 return
                             }
                             setTimeout(function() {
                                 poll()
                             }, 0)
                         })
                     }
                     poll();
                     return filterId
                 })
             });
             utils.defineProperty(JsonRpcProvider.prototype, "_stopPending", function() {
                 this._pendingFilter = null
             });
             utils.defineProperty(JsonRpcProvider, "_hexlifyTransaction", function(transaction) {
                 return getTransaction(transaction)
             });
             module.exports = JsonRpcProvider
         }, {
             "../utils/convert": 60,
             "../utils/properties": 67,
             "./provider.js": 53
         }],
         52: [function(require, module, exports) {
             module.exports = {
                 unspecified: {
                     chainId: 0,
                     name: "unspecified"
                 },
                 homestead: {
                     chainId: 1,
                     ensAddress: "0x314159265dd8dbb310642f98f50c066173c1259b",
                     name: "homestead"
                 },
                 mainnet: {
                     chainId: 1,
                     ensAddress: "0x314159265dd8dbb310642f98f50c066173c1259b",
                     name: "homestead"
                 },
                 morden: {
                     chainId: 2,
                     name: "morden"
                 },
                 ropsten: {
                     chainId: 3,
                     ensAddress: "0x112234455c3a32fd11230c42e7bccd4a84e02010",
                     name: "ropsten"
                 },
                 testnet: {
                     chainId: 3,
                     ensAddress: "0x112234455c3a32fd11230c42e7bccd4a84e02010",
                     name: "ropsten"
                 },
                 rinkeby: {
                     chainId: 4,
                     name: "rinkeby"
                 },
                 kovan: {
                     chainId: 42,
                     name: "kovan"
                 },
                 classic: {
                     chainId: 61,
                     name: "classic"
                 }
             }
         }, {}],
         53: [function(require, module, exports) {
             "use strict";
             var inherits = require("inherits");
             var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
             var networks = require("./networks.json");
             var utils = function() {
                 var convert = require("../utils/convert");
                 return {
                     defineProperty: require("../utils/properties").defineProperty,
                     getAddress: require("../utils/address").getAddress,
                     getContractAddress: require("../utils/contract-address").getContractAddress,
                     bigNumberify: require("../utils/bignumber").bigNumberify,
                     arrayify: convert.arrayify,
                     hexlify: convert.hexlify,
                     isHexString: convert.isHexString,
                     concat: convert.concat,
                     hexStripZeros: convert.hexStripZeros,
                     stripZeros: convert.stripZeros,
                     namehash: require("../utils/namehash"),
                     toUtf8String: require("../utils/utf8").toUtf8String,
                     RLP: require("../utils/rlp")
                 }
             }();

             function copyObject(obj) {
                 var result = {};
                 for (var key in obj) {
                     result[key] = obj[key]
                 }
                 return result
             }

             function check(format, object) {
                 var result = {};
                 for (var key in format) {
                     try {
                         var value = format[key](object[key]);
                         if (value !== undefined) {
                             result[key] = value
                         }
                     } catch (error) {
                         error.checkKey = key;
                         error.checkValue = object[key];
                         throw error
                     }
                 }
                 return result
             }

             function allowNull(check, nullValue) {
                 return function(value) {
                     if (value == null) {
                         return nullValue
                     }
                     return check(value)
                 }
             }

             function allowFalsish(check, replaceValue) {
                 return function(value) {
                     if (!value) {
                         return replaceValue
                     }
                     return check(value)
                 }
             }

             function arrayOf(check) {
                 return function(array) {
                     if (!Array.isArray(array)) {
                         throw new Error("not an array")
                     }
                     var result = [];
                     array.forEach(function(value) {
                         result.push(check(value))
                     });
                     return result
                 }
             }

             function checkHash(hash) {
                 if (!utils.isHexString(hash) || hash.length !== 66) {
                     throw new Error("invalid hash - " + hash)
                 }
                 return hash
             }

             function checkNumber(number) {
                 return utils.bigNumberify(number).toNumber()
             }

             function checkBoolean(value) {
                 if (typeof value === "boolean") {
                     return value
                 }
                 if (typeof value === "string") {
                     if (value === "true") {
                         return true
                     }
                     if (value === "false") {
                         return false
                     }
                 }
                 throw new Error("invaid boolean - " + value)
             }

             function checkUint256(uint256) {
                 if (!utils.isHexString(uint256)) {
                     throw new Error("invalid uint256")
                 }
                 while (uint256.length < 66) {
                     uint256 = "0x0" + uint256.substring(2)
                 }
                 return uint256
             }

             function checkString(string) {
                 if (typeof string !== "string") {
                     throw new Error("invalid string")
                 }
                 return string
             }

             function checkBlockTag(blockTag) {
                 if (blockTag == null) {
                     return "latest"
                 }
                 if (blockTag === "earliest") {
                     return "0x0"
                 }
                 if (blockTag === "latest" || blockTag === "pending") {
                     return blockTag
                 }
                 if (typeof blockTag === "number") {
                     return utils.hexStripZeros(utils.hexlify(blockTag))
                 }
                 if (utils.isHexString(blockTag)) {
                     return utils.hexStripZeros(blockTag)
                 }
                 throw new Error("invalid blockTag")
             }
             var formatBlock = {
                 hash: checkHash,
                 parentHash: checkHash,
                 number: checkNumber,
                 timestamp: checkNumber,
                 nonce: allowNull(utils.hexlify),
                 difficulty: allowNull(checkNumber),
                 gasLimit: utils.bigNumberify,
                 gasUsed: utils.bigNumberify,
                 miner: utils.getAddress,
                 extraData: utils.hexlify,
                 transactions: allowNull(arrayOf(checkHash))
             };

             function checkBlock(block) {
                 if (block.author != null && block.miner == null) {
                     block.miner = block.author
                 }
                 return check(formatBlock, block)
             }
             var formatTransaction = {
                 hash: checkHash,
                 blockHash: allowNull(checkHash, null),
                 blockNumber: allowNull(checkNumber, null),
                 transactionIndex: allowNull(checkNumber, null),
                 from: utils.getAddress,
                 gasPrice: utils.bigNumberify,
                 gasLimit: utils.bigNumberify,
                 to: allowNull(utils.getAddress, null),
                 value: utils.bigNumberify,
                 nonce: checkNumber,
                 data: utils.hexlify,
                 r: allowNull(checkUint256),
                 s: allowNull(checkUint256),
                 v: allowNull(checkNumber),
                 creates: allowNull(utils.getAddress, null),
                 raw: allowNull(utils.hexlify)
             };

             function checkTransaction(transaction) {
                 if (transaction.gas != null && transaction.gasLimit == null) {
                     transaction.gasLimit = transaction.gas
                 }
                 if (transaction.to && utils.bigNumberify(transaction.to).isZero()) {
                     transaction.to = "0x0000000000000000000000000000000000000000"
                 }
                 if (transaction.input != null && transaction.data == null) {
                     transaction.data = transaction.input
                 }
                 if (transaction.to == null && transaction.creates == null) {
                     transaction.creates = utils.getContractAddress(transaction)
                 }
                 if (!transaction.raw) {
                     if (transaction.v && transaction.r && transaction.s) {
                         var raw = [utils.stripZeros(utils.hexlify(transaction.nonce)), utils.stripZeros(utils.hexlify(transaction.gasPrice)), utils.stripZeros(utils.hexlify(transaction.gasLimit)), transaction.to || "0x", utils.stripZeros(utils.hexlify(transaction.value || "0x")), utils.hexlify(transaction.data || "0x"), utils.stripZeros(utils.hexlify(transaction.v || "0x")), utils.stripZeros(utils.hexlify(transaction.r)), utils.stripZeros(utils.hexlify(transaction.s))];
                         transaction.raw = utils.RLP.encode(raw)
                     }
                 }
                 var result = check(formatTransaction, transaction);
                 var networkId = transaction.networkId;
                 if (utils.isHexString(networkId)) {
                     networkId = utils.bigNumberify(networkId).toNumber()
                 }
                 if (typeof networkId !== "number" && result.v != null) {
                     networkId = (result.v - 35) / 2;
                     if (networkId < 0) {
                         networkId = 0
                     }
                     networkId = parseInt(networkId)
                 }
                 if (typeof networkId !== "number") {
                     networkId = 0
                 }
                 result.networkId = networkId;
                 if (result.blockHash && result.blockHash.replace(/0/g, "") === "x") {
                     result.blockHash = null
                 }
                 return result
             }
             var formatTransactionRequest = {
                 from: allowNull(utils.getAddress),
                 nonce: allowNull(checkNumber),
                 gasLimit: allowNull(utils.bigNumberify),
                 gasPrice: allowNull(utils.bigNumberify),
                 to: allowNull(utils.getAddress),
                 value: allowNull(utils.bigNumberify),
                 data: allowNull(utils.hexlify)
             };

             function checkTransactionRequest(transaction) {
                 return check(formatTransactionRequest, transaction)
             }
             var formatTransactionReceiptLog = {
                 transactionLogIndex: allowNull(checkNumber),
                 transactionIndex: checkNumber,
                 blockNumber: checkNumber,
                 transactionHash: checkHash,
                 address: utils.getAddress,
                 topics: arrayOf(checkHash),
                 data: utils.hexlify,
                 logIndex: checkNumber,
                 blockHash: checkHash
             };

             function checkTransactionReceiptLog(log) {
                 return check(formatTransactionReceiptLog, log)
             }
             var formatTransactionReceipt = {
                 contractAddress: allowNull(utils.getAddress, null),
                 transactionIndex: checkNumber,
                 root: allowNull(checkHash),
                 gasUsed: utils.bigNumberify,
                 logsBloom: utils.hexlify,
                 blockHash: checkHash,
                 transactionHash: checkHash,
                 logs: arrayOf(checkTransactionReceiptLog),
                 blockNumber: checkNumber,
                 cumulativeGasUsed: utils.bigNumberify,
                 status: allowNull(checkNumber)
             };

             function checkTransactionReceipt(transactionReceipt) {
                 var status = transactionReceipt.status;
                 var root = transactionReceipt.root;
                 var result = check(formatTransactionReceipt, transactionReceipt);
                 result.logs.forEach(function(entry, index) {
                     if (entry.transactionLogIndex == null) {
                         entry.transactionLogIndex = index
                     }
                 });
                 if (transactionReceipt.status != null) {
                     result.byzantium = true
                 }
                 return result
             }

             function checkTopics(topics) {
                 if (Array.isArray(topics)) {
                     topics.forEach(function(topic) {
                         checkTopics(topic)
                     })
                 } else if (topics != null) {
                     checkHash(topics)
                 }
                 return topics
             }
             var formatFilter = {
                 fromBlock: allowNull(checkBlockTag, undefined),
                 toBlock: allowNull(checkBlockTag, undefined),
                 address: allowNull(utils.getAddress, undefined),
                 topics: allowNull(checkTopics, undefined)
             };

             function checkFilter(filter) {
                 return check(formatFilter, filter)
             }
             var formatLog = {
                 blockNumber: allowNull(checkNumber),
                 blockHash: allowNull(checkHash),
                 transactionIndex: checkNumber,
                 removed: allowNull(checkBoolean),
                 address: utils.getAddress,
                 data: allowFalsish(utils.hexlify, "0x"),
                 topics: arrayOf(checkHash),
                 transactionHash: checkHash,
                 logIndex: checkNumber
             };

             function checkLog(log) {
                 return check(formatLog, log)
             }

             function Provider(network) {
                 if (!(this instanceof Provider)) {
                     throw new Error("missing new")
                 }
                 network = Provider.getNetwork(network);
                 var ensAddress = null;
                 if (network.ensAddress) {
                     ensAddress = utils.getAddress(network.ensAddress)
                 }
                 utils.defineProperty(this, "chainId", network.chainId);
                 utils.defineProperty(this, "ensAddress", ensAddress);
                 utils.defineProperty(this, "name", network.name);
                 var events = {};
                 utils.defineProperty(this, "_events", events);
                 utils.defineProperty(this, "_emitted", {
                     block: -1
                 });
                 var self = this;
                 var lastBlockNumber = null;
                 var balances = {};

                 function doPoll() {
                     self.getBlockNumber().then(function(blockNumber) {
                         if (blockNumber === lastBlockNumber) {
                             return
                         }
                         if (lastBlockNumber === null) {
                             lastBlockNumber = blockNumber - 1
                         }
                         for (var i = lastBlockNumber + 1; i <= blockNumber; i++) {
                             if (self._emitted.block < i) {
                                 self._emitted.block = i;
                                 Object.keys(self._emitted).forEach(function(key) {
                                     if (key === "block") {
                                         return
                                     }
                                     if (self._emitted[key] > i + 12) {
                                         delete self._emitted[key]
                                     }
                                 })
                             }
                             self.emit("block", i)
                         }
                         var newBalances = {};
                         Object.keys(events).forEach(function(eventName) {
                             var event = parseEventString(eventName);
                             if (event.type === "transaction") {
                                 self.getTransaction(event.hash).then(function(transaction) {
                                     if (!transaction || transaction.blockNumber == null) {
                                         return
                                     }
                                     self._emitted["t:" + transaction.hash.toLowerCase()] = transaction.blockNumber;
                                     self.emit(event.hash, transaction)
                                 })
                             } else if (event.type === "address") {
                                 if (balances[event.address]) {
                                     newBalances[event.address] = balances[event.address]
                                 }
                                 self.getBalance(event.address, "latest").then(function(balance) {
                                     var lastBalance = balances[event.address];
                                     if (lastBalance && balance.eq(lastBalance)) {
                                         return
                                     }
                                     balances[event.address] = balance;
                                     self.emit(event.address, balance)
                                 })
                             } else if (event.type === "topic") {
                                 self.getLogs({
                                     fromBlock: lastBlockNumber + 1,
                                     toBlock: blockNumber,
                                     topics: event.topic
                                 }).then(function(logs) {
                                     if (logs.length === 0) {
                                         return
                                     }
                                     logs.forEach(function(log) {
                                         self._emitted["b:" + log.blockHash.toLowerCase()] = log.blockNumber;
                                         self._emitted["t:" + log.transactionHash.toLowerCase()] = log.blockNumber;
                                         self.emit(event.topic, log)
                                     })
                                 })
                             }
                         });
                         lastBlockNumber = blockNumber;
                         balances = newBalances
                     });
                     self.doPoll()
                 }
                 utils.defineProperty(this, "resetEventsBlock", function(blockNumber) {
                     lastBlockNumber = blockNumber;
                     self.doPoll()
                 });
                 var pollingInterval = 4e3;
                 var poller = null;
                 Object.defineProperty(this, "polling", {
                     get: function() {
                         return poller != null
                     },
                     set: function(value) {
                         setTimeout(function() {
                             if (value && !poller) {
                                 poller = setInterval(doPoll, pollingInterval)
                             } else if (!value && poller) {
                                 clearInterval(poller);
                                 poller = null
                             }
                         }, 0)
                     }
                 });
                 Object.defineProperty(this, "pollingInterval", {
                     get: function() {
                         return pollingInterval
                     },
                     set: function(value) {
                         if (typeof value !== "number" || value <= 0 || parseInt(value) != value) {
                             throw new Error("invalid polling interval")
                         }
                         pollingInterval = value;
                         if (poller) {
                             clearInterval(poller);
                             poller = setInterval(doPoll, pollingInterval)
                         }
                     }
                 })
             }

             function inheritable(parent) {
                 return function(child) {
                     inherits(child, parent);
                     utils.defineProperty(child, "inherits", inheritable(child))
                 }
             }
             utils.defineProperty(Provider, "inherits", inheritable(Provider));
             utils.defineProperty(Provider, "getNetwork", function(network) {
                 if (typeof network === "string") {
                     network = networks[network];
                     if (!network) {
                         throw new Error("unknown network")
                     }
                 } else if (network == null) {
                     network = networks["homestead"]
                 }
                 if (typeof network.chainId !== "number") {
                     throw new Error("invalid chainId")
                 }
                 return network
             });
             utils.defineProperty(Provider, "networks", networks);
             utils.defineProperty(Provider, "fetchJSON", function(url, json, processFunc) {
                 return new Promise(function(resolve, reject) {
                     var request = new XMLHttpRequest;
                     if (json) {
                         request.open("POST", url, true);
                         request.setRequestHeader("Content-Type", "application/json")
                     } else {
                         request.open("GET", url, true)
                     }
                     request.onreadystatechange = function() {
                         if (request.readyState !== 4) {
                             return
                         }
                         try {
                             var result = JSON.parse(request.responseText)
                         } catch (error) {
                             var jsonError = new Error("invalid json response");
                             jsonError.orginialError = error;
                             jsonError.responseText = request.responseText;
                             reject(jsonError);
                             return
                         }
                         if (processFunc) {
                             try {
                                 result = processFunc(result)
                             } catch (error) {
                                 error.url = url;
                                 error.body = json;
                                 error.responseText = request.responseText;
                                 reject(error);
                                 return
                             }
                         }
                         if (request.status != 200) {
                             var error = new Error("invalid response - " + request.status);
                             error.statusCode = request.statusCode;
                             reject(error);
                             return
                         }
                         resolve(result)
                     };
                     request.onerror = function(error) {
                         reject(error)
                     };
                     try {
                         if (json) {
                             request.send(json)
                         } else {
                             request.send()
                         }
                     } catch (error) {
                         var connectionError = new Error("connection error");
                         connectionError.error = error;
                         reject(connectionError)
                     }
                 })
             });
             utils.defineProperty(Provider.prototype, "waitForTransaction", function(transactionHash, timeout) {
                 var self = this;
                 return new Promise(function(resolve, reject) {
                     var timer = null;

                     function complete(transaction) {
                         if (timer) {
                             clearTimeout(timer)
                         }
                         resolve(transaction)
                     }
                     self.once(transactionHash, complete);
                     if (typeof timeout === "number" && timeout > 0) {
                         timer = setTimeout(function() {
                             self.removeListener(transactionHash, complete);
                             reject(new Error("timeout"))
                         }, timeout)
                     }
                 })
             });
             utils.defineProperty(Provider.prototype, "getBlockNumber", function() {
                 try {
                     return this.perform("getBlockNumber").then(function(result) {
                         var value = parseInt(result);
                         if (value != result) {
                             throw new Error("invalid response - getBlockNumber")
                         }
                         return value
                     })
                 } catch (error) {
                     return Promise.reject(error)
                 }
             });
             utils.defineProperty(Provider.prototype, "getGasPrice", function() {
                 try {
                     return this.perform("getGasPrice").then(function(result) {
                         return utils.bigNumberify(result)
                     })
                 } catch (error) {
                     return Promise.reject(error)
                 }
             });
             utils.defineProperty(Provider.prototype, "getBalance", function(addressOrName, blockTag) {
                 var self = this;
                 return this.resolveName(addressOrName).then(function(address) {
                     var params = {
                         address: address,
                         blockTag: checkBlockTag(blockTag)
                     };
                     return self.perform("getBalance", params).then(function(result) {
                         return utils.bigNumberify(result)
                     })
                 })
             });
             utils.defineProperty(Provider.prototype, "getTransactionCount", function(addressOrName, blockTag) {
                 var self = this;
                 return this.resolveName(addressOrName).then(function(address) {
                     var params = {
                         address: address,
                         blockTag: checkBlockTag(blockTag)
                     };
                     return self.perform("getTransactionCount", params).then(function(result) {
                         var value = parseInt(result);
                         if (value != result) {
                             throw new Error("invalid response - getTransactionCount")
                         }
                         return value
                     })
                 })
             });
             utils.defineProperty(Provider.prototype, "getCode", function(addressOrName, blockTag) {
                 var self = this;
                 return this.resolveName(addressOrName).then(function(address) {
                     var params = {
                         address: address,
                         blockTag: checkBlockTag(blockTag)
                     };
                     return self.perform("getCode", params).then(function(result) {
                         return utils.hexlify(result)
                     })
                 })
             });
             utils.defineProperty(Provider.prototype, "getStorageAt", function(addressOrName, position, blockTag) {
                 var self = this;
                 return this.resolveName(addressOrName).then(function(address) {
                     var params = {
                         address: address,
                         blockTag: checkBlockTag(blockTag),
                         position: utils.hexStripZeros(utils.hexlify(position))
                     };
                     return self.perform("getStorageAt", params).then(function(result) {
                         return utils.hexlify(result)
                     })
                 })
             });
             utils.defineProperty(Provider.prototype, "sendTransaction", function(signedTransaction) {
                 try {
                     var params = {
                         signedTransaction: utils.hexlify(signedTransaction)
                     };
                     return this.perform("sendTransaction", params).then(function(result) {
                         result = utils.hexlify(result);
                         if (result.length !== 66) {
                             throw new Error("invalid response - sendTransaction")
                         }
                         return result
                     })
                 } catch (error) {
                     return Promise.reject(error)
                 }
             });
             utils.defineProperty(Provider.prototype, "call", function(transaction) {
                 var self = this;
                 return this._resolveNames(transaction, ["to", "from"]).then(function(transaction) {
                     var params = {
                         transaction: checkTransactionRequest(transaction)
                     };
                     return self.perform("call", params).then(function(result) {
                         return utils.hexlify(result)
                     })
                 })
             });
             utils.defineProperty(Provider.prototype, "estimateGas", function(transaction) {
                 var self = this;
                 return this._resolveNames(transaction, ["to", "from"]).then(function(transaction) {
                     var params = {
                         transaction: checkTransactionRequest(transaction)
                     };
                     return self.perform("estimateGas", params).then(function(result) {
                         return utils.bigNumberify(result)
                     })
                 })
             });

             function stallPromise(allowNullFunc, executeFunc) {
                 return new Promise(function(resolve, reject) {
                     var attempt = 0;

                     function check() {
                         executeFunc().then(function(result) {
                             if (result || allowNullFunc()) {
                                 resolve(result)
                             } else {
                                 attempt++;
                                 var timeout = 500 + 250 * parseInt(Math.random() * (1 << attempt));
                                 if (timeout > 1e4) {
                                     timeout = 1e4
                                 }
                                 setTimeout(check, timeout)
                             }
                         }, function(error) {
                             reject(error)
                         })
                     }
                     check()
                 })
             }
             utils.defineProperty(Provider.prototype, "getBlock", function(blockHashOrBlockTag) {
                 var self = this;
                 try {
                     var blockHash = utils.hexlify(blockHashOrBlockTag);
                     if (blockHash.length === 66) {
                         return stallPromise(function() {
                             return self._emitted["b:" + blockHash.toLowerCase()] == null
                         }, function() {
                             return self.perform("getBlock", {
                                 blockHash: blockHash
                             }).then(function(block) {
                                 if (block == null) {
                                     return null
                                 }
                                 return checkBlock(block)
                             })
                         })
                     }
                 } catch (error) {}
                 try {
                     var blockTag = checkBlockTag(blockHashOrBlockTag);
                     return stallPromise(function() {
                         if (utils.isHexString(blockTag)) {
                             var blockNumber = parseInt(blockTag.substring(2), 16);
                             return blockNumber > self._emitted.block
                         }
                         return true
                     }, function() {
                         return self.perform("getBlock", {
                             blockTag: blockTag
                         }).then(function(block) {
                             if (block == null) {
                                 return null
                             }
                             return checkBlock(block)
                         })
                     })
                 } catch (error) {}
                 return Promise.reject(new Error("invalid block hash or block tag"))
             });
             utils.defineProperty(Provider.prototype, "getTransaction", function(transactionHash) {
                 var self = this;
                 try {
                     var params = {
                         transactionHash: checkHash(transactionHash)
                     };
                     return stallPromise(function() {
                         return self._emitted["t:" + transactionHash.toLowerCase()] == null
                     }, function() {
                         return self.perform("getTransaction", params).then(function(result) {
                             if (result != null) {
                                 result = checkTransaction(result)
                             }
                             return result
                         })
                     })
                 } catch (error) {
                     return Promise.reject(error)
                 }
             });
             utils.defineProperty(Provider.prototype, "getTransactionReceipt", function(transactionHash) {
                 var self = this;
                 try {
                     var params = {
                         transactionHash: checkHash(transactionHash)
                     };
                     return stallPromise(function() {
                         return self._emitted["t:" + transactionHash.toLowerCase()] == null
                     }, function() {
                         return self.perform("getTransactionReceipt", params).then(function(result) {
                             if (result != null) {
                                 result = checkTransactionReceipt(result)
                             }
                             return result
                         })
                     })
                 } catch (error) {
                     return Promise.reject(error)
                 }
             });
             utils.defineProperty(Provider.prototype, "getLogs", function(filter) {
                 var self = this;
                 return this._resolveNames(filter, ["address"]).then(function(filter) {
                     var params = {
                         filter: checkFilter(filter)
                     };
                     return self.perform("getLogs", params).then(function(result) {
                         return arrayOf(checkLog)(result)
                     })
                 })
             });
             utils.defineProperty(Provider.prototype, "getEtherPrice", function() {
                 try {
                     return this.perform("getEtherPrice", {}).then(function(result) {
                         return result
                     })
                 } catch (error) {
                     return Promise.reject(error)
                 }
             });
             utils.defineProperty(Provider.prototype, "_resolveNames", function(object, keys) {
                 var promises = [];
                 var result = copyObject(object);
                 keys.forEach(function(key) {
                     if (result[key] === undefined) {
                         return
                     }
                     promises.push(this.resolveName(result[key]).then(function(address) {
                         result[key] = address
                     }))
                 }, this);
                 return Promise.all(promises).then(function() {
                     return result
                 })
             });
             utils.defineProperty(Provider.prototype, "_getResolver", function(name) {
                 var nodeHash = utils.namehash(name);
                 var data = "0x0178b8bf" + nodeHash.substring(2);
                 var transaction = {
                     to: this.ensAddress,
                     data: data
                 };
                 return this.call(transaction).then(function(data) {
                     if (data.length != 66) {
                         return null
                     }
                     return utils.getAddress("0x" + data.substring(26))
                 })
             });
             utils.defineProperty(Provider.prototype, "resolveName", function(name) {
                 try {
                     return Promise.resolve(utils.getAddress(name))
                 } catch (error) {}
                 if (!this.ensAddress) {
                     throw new Error("network does not have ENS deployed")
                 }
                 var self = this;
                 var nodeHash = utils.namehash(name);
                 return this._getResolver(name).then(function(resolverAddress) {
                     var data = "0x3b3b57de" + nodeHash.substring(2);
                     var transaction = {
                         to: resolverAddress,
                         data: data
                     };
                     return self.call(transaction)
                 }).then(function(data) {
                     if (data.length != 66) {
                         return null
                     }
                     var address = utils.getAddress("0x" + data.substring(26));
                     if (address === "0x0000000000000000000000000000000000000000") {
                         return null
                     }
                     return address
                 })
             });
             utils.defineProperty(Provider.prototype, "lookupAddress", function(address) {
                 if (!this.ensAddress) {
                     throw new Error("network does not have ENS deployed")
                 }
                 address = utils.getAddress(address);
                 var name = address.substring(2) + ".addr.reverse";
                 var nodehash = utils.namehash(name);
                 var self = this;
                 return this._getResolver(name).then(function(resolverAddress) {
                     if (!resolverAddress) {
                         return null
                     }
                     var data = "0x691f3431" + nodehash.substring(2);
                     var transaction = {
                         to: resolverAddress,
                         data: data
                     };
                     return self.call(transaction)
                 }).then(function(data) {
                     data = data.substring(2);
                     if (data.length < 64) {
                         return null
                     }
                     data = data.substring(64);
                     if (data.length < 64) {
                         return null
                     }
                     var length = utils.bigNumberify("0x" + data.substring(0, 64)).toNumber();
                     data = data.substring(64);
                     if (2 * length > data.length) {
                         return null
                     }
                     var name = utils.toUtf8String("0x" + data.substring(0, 2 * length));
                     return self.resolveName(name).then(function(addr) {
                         if (addr != address) {
                             return null
                         }
                         return name
                     })
                 })
             });
             utils.defineProperty(Provider.prototype, "doPoll", function() {});
             utils.defineProperty(Provider.prototype, "perform", function(method, params) {
                 return Promise.reject(new Error("not implemented - " + method))
             });

             function recurse(object, convertFunc) {
                 if (Array.isArray(object)) {
                     var result = [];
                     object.forEach(function(object) {
                         result.push(recurse(object, convertFunc))
                     });
                     return result
                 }
                 return convertFunc(object)
             }

             function getEventString(object) {
                 try {
                     return "address:" + utils.getAddress(object)
                 } catch (error) {}
                 if (object === "block") {
                     return "block"
                 } else if (object === "pending") {
                     return "pending"
                 } else if (utils.isHexString(object)) {
                     if (object.length === 66) {
                         return "tx:" + object
                     }
                 } else if (Array.isArray(object)) {
                     object = recurse(object, function(object) {
                         if (object == null) {
                             object = "0x"
                         }
                         return object
                     });
                     try {
                         return "topic:" + utils.RLP.encode(object)
                     } catch (error) {
                         console.log(error)
                     }
                 }
                 throw new Error("invalid event - " + object)
             }

             function parseEventString(string) {
                 if (string.substring(0, 3) === "tx:") {
                     return {
                         type: "transaction",
                         hash: string.substring(3)
                     }
                 } else if (string === "block") {
                     return {
                         type: "block"
                     }
                 } else if (string === "pending") {
                     return {
                         type: "pending"
                     }
                 } else if (string.substring(0, 8) === "address:") {
                     return {
                         type: "address",
                         address: string.substring(8)
                     }
                 } else if (string.substring(0, 6) === "topic:") {
                     try {
                         var object = utils.RLP.decode(string.substring(6));
                         object = recurse(object, function(object) {
                             if (object === "0x") {
                                 object = null
                             }
                             return object
                         });
                         return {
                             type: "topic",
                             topic: object
                         }
                     } catch (error) {
                         console.log(error)
                     }
                 }
                 throw new Error("invalid event string")
             }
             utils.defineProperty(Provider.prototype, "_startPending", function() {
                 console.log("WARNING: this provider does not support pending events")
             });
             utils.defineProperty(Provider.prototype, "_stopPending", function() {});
             utils.defineProperty(Provider.prototype, "on", function(eventName, listener) {
                 var key = getEventString(eventName);
                 if (!this._events[key]) {
                     this._events[key] = []
                 }
                 this._events[key].push({
                     eventName: eventName,
                     listener: listener,
                     type: "on"
                 });
                 if (key === "pending") {
                     this._startPending()
                 }
                 this.polling = true
             });
             utils.defineProperty(Provider.prototype, "once", function(eventName, listener) {
                 var key = getEventString(eventName);
                 if (!this._events[key]) {
                     this._events[key] = []
                 }
                 this._events[key].push({
                     eventName: eventName,
                     listener: listener,
                     type: "once"
                 });
                 if (key === "pending") {
                     this._startPending()
                 }
                 this.polling = true
             });
             utils.defineProperty(Provider.prototype, "emit", function(eventName) {
                 var key = getEventString(eventName);
                 var args = Array.prototype.slice.call(arguments, 1);
                 var listeners = this._events[key];
                 if (!listeners) {
                     return
                 }
                 for (var i = 0; i < listeners.length; i++) {
                     var listener = listeners[i];
                     if (listener.type === "once") {
                         listeners.splice(i, 1);
                         i--
                     }
                     try {
                         listener.listener.apply(this, args)
                     } catch (error) {
                         console.log("Event Listener Error: " + error.message)
                     }
                 }
                 if (listeners.length === 0) {
                     delete this._events[key];
                     if (key === "pending") {
                         this._stopPending()
                     }
                 }
                 if (this.listenerCount() === 0) {
                     this.polling = false
                 }
             });
             utils.defineProperty(Provider.prototype, "listenerCount", function(eventName) {
                 if (!eventName) {
                     var result = 0;
                     for (var key in this._events) {
                         result += this._events[key].length
                     }
                     return result
                 }
                 var listeners = this._events[getEventString(eventName)];
                 if (!listeners) {
                     return 0
                 }
                 return listeners.length
             });
             utils.defineProperty(Provider.prototype, "listeners", function(eventName) {
                 var listeners = this._events[getEventString(eventName)];
                 if (!listeners) {
                     return 0
                 }
                 var result = [];
                 for (var i = 0; i < listeners.length; i++) {
                     result.push(listeners[i].listener)
                 }
                 return result
             });
             utils.defineProperty(Provider.prototype, "removeAllListeners", function(eventName) {
                 delete this._events[getEventString(eventName)];
                 if (this.listenerCount() === 0) {
                     this.polling = false
                 }
             });
             utils.defineProperty(Provider.prototype, "removeListener", function(eventName, listener) {
                 var eventNameString = getEventString(eventName);
                 var listeners = this._events[eventNameString];
                 if (!listeners) {
                     return 0
                 }
                 for (var i = 0; i < listeners.length; i++) {
                     if (listeners[i].listener === listener) {
                         listeners.splice(i, 1);
                         break
                     }
                 }
                 if (listeners.length === 0) {
                     this.removeAllListeners(eventName)
                 }
             });
             utils.defineProperty(Provider, "_formatters", {
                 checkTransactionResponse: checkTransaction
             });
             module.exports = Provider
         }, {
             "../utils/address": 56,
             "../utils/bignumber": 57,
             "../utils/contract-address": 59,
             "../utils/convert": 60,
             "../utils/namehash": 65,
             "../utils/properties": 67,
             "../utils/rlp": 68,
             "../utils/utf8": 73,
             "./networks.json": 52,
             inherits: 37,
             xmlhttprequest: 46
         }],
         54: [function(require, module, exports) {
             "use strict";
             var Provider = require("./provider");
             var JsonRpcProvider = require("./json-rpc-provider");
             var utils = function() {
                 return {
                     defineProperty: require("../utils/properties").defineProperty,
                     getAddress: require("../utils/address").getAddress,
                     toUtf8Bytes: require("../utils/utf8").toUtf8Bytes,
                     hexlify: require("../utils/convert").hexlify
                 }
             }();

             function Web3Signer(provider, address) {
                 if (!(this instanceof Web3Signer)) {
                     throw new Error("missing new")
                 }
                 utils.defineProperty(this, "provider", provider);
                 if (address) {
                     utils.defineProperty(this, "address", address);
                     utils.defineProperty(this, "_syncAddress", true)
                 } else {
                     Object.defineProperty(this, "address", {
                         enumerable: true,
                         get: function() {
                             throw new Error("unsupported sync operation; use getAddress")
                         }
                     });
                     utils.defineProperty(this, "_syncAddress", false)
                 }
             }
             utils.defineProperty(Web3Signer.prototype, "getAddress", function() {
                 if (this._syncAddress) {
                     return Promise.resolve(this.address)
                 }
                 return this.provider.send("eth_accounts", []).then(function(accounts) {
                     if (accounts.length === 0) {
                         throw new Error("no account")
                     }
                     return utils.getAddress(accounts[0])
                 })
             });
             utils.defineProperty(Web3Signer.prototype, "getBalance", function(blockTag) {
                 var provider = this.provider;
                 return this.getAddress().then(function(address) {
                     return provider.getBalance(address, blockTag)
                 })
             });
             utils.defineProperty(Web3Signer.prototype, "getTransactionCount", function(blockTag) {
                 var provider = this.provider;
                 return this.getAddress().then(function(address) {
                     return provider.getTransactionCount(address, blockTag)
                 })
             });
             utils.defineProperty(Web3Signer.prototype, "sendTransaction", function(transaction) {
                 var provider = this.provider;
                 transaction = JsonRpcProvider._hexlifyTransaction(transaction);
                 return this.getAddress().then(function(address) {
                     transaction.from = address.toLowerCase();
                     return provider.send("eth_sendTransaction", [transaction]).then(function(hash) {
                         return new Promise(function(resolve, reject) {
                             function check() {
                                 provider.getTransaction(hash).then(function(transaction) {
                                     if (!transaction) {
                                         setTimeout(check, 1e3);
                                         return
                                     }
                                     resolve(transaction)
                                 })
                             }
                             check()
                         })
                     })
                 })
             });
             utils.defineProperty(Web3Signer.prototype, "signMessage", function(message) {
                 var provider = this.provider;
                 var data = typeof message === "string" ? utils.toUtf8Bytes(message) : message;
                 return this.getAddress().then(function(address) {
                     var method = "eth_sign";
                     var params = [address.toLowerCase(), utils.hexlify(data)];
                     if (provider._web3Provider.isMetaMask) {
                         method = "personal_sign";
                         params = [utils.hexlify(data), address.toLowerCase()]
                     }
                     return provider.send(method, params)
                 })
             });
             utils.defineProperty(Web3Signer.prototype, "unlock", function(password) {
                 var provider = this.provider;
                 return this.getAddress().then(function(address) {
                     return provider.send("personal_unlockAccount", [address.toLowerCase(), password, null])
                 })
             });

             function Web3Provider(web3Provider, network) {
                 if (!(this instanceof Web3Provider)) {
                     throw new Error("missing new")
                 }
                 var url = web3Provider.host || web3Provider.path || "unknown";
                 JsonRpcProvider.call(this, url, network);
                 utils.defineProperty(this, "_web3Provider", web3Provider)
             }
             JsonRpcProvider.inherits(Web3Provider);
             utils.defineProperty(Web3Provider.prototype, "getSigner", function(address) {
                 return new Web3Signer(this, address)
             });
             utils.defineProperty(Web3Provider.prototype, "listAccounts", function() {
                 return this.send("eth_accounts", []).then(function(accounts) {
                     accounts.forEach(function(address, index) {
                         accounts[index] = utils.getAddress(address)
                     });
                     return accounts
                 })
             });
             utils.defineProperty(Web3Provider.prototype, "send", function(method, params) {
                 var provider = this._web3Provider;
                 return new Promise(function(resolve, reject) {
                     var request = {
                         method: method,
                         params: params,
                         id: 42,
                         jsonrpc: "2.0"
                     };
                     provider.sendAsync(request, function(error, result) {
                         if (error) {
                             reject(error);
                             return
                         }
                         if (result.error) {
                             var error = new Error(result.error.message);
                             error.code = result.error.code;
                             error.data = result.error.data;
                             reject(error);
                             return
                         }
                         resolve(result.result)
                     })
                 })
             });
             module.exports = Web3Provider
         }, {
             "../utils/address": 56,
             "../utils/convert": 60,
             "../utils/properties": 67,
             "../utils/utf8": 73,
             "./json-rpc-provider": 51,
             "./provider": 53
         }],
         55: [function(require, module, exports) {
             "use strict";
             var throwError = require("../utils/throw-error");
             var utils = function() {
                 var convert = require("../utils/convert.js");
                 var utf8 = require("../utils/utf8.js");
                 return {
                     defineProperty: require("../utils/properties.js").defineProperty,
                     arrayify: convert.arrayify,
                     padZeros: convert.padZeros,
                     bigNumberify: require("../utils/bignumber.js").bigNumberify,
                     getAddress: require("../utils/address").getAddress,
                     concat: convert.concat,
                     toUtf8Bytes: utf8.toUtf8Bytes,
                     toUtf8String: utf8.toUtf8String,
                     hexlify: convert.hexlify
                 }
             }();
             var paramTypeBytes = new RegExp(/^bytes([0-9]*)$/);
             var paramTypeNumber = new RegExp(/^(u?int)([0-9]*)$/);
             var paramTypeArray = new RegExp(/^(.*)\[([0-9]*)\]$/);
             var defaultCoerceFunc = function(type, value) {
                 var match = type.match(paramTypeNumber);
                 if (match && parseInt(match[2]) <= 48) {
                     return value.toNumber()
                 }
                 return value
             };
             var coderNull = function(coerceFunc) {
                 return {
                     name: "null",
                     type: "",
                     encode: function(value) {
                         return utils.arrayify([])
                     },
                     decode: function(data, offset) {
                         if (offset > data.length) {
                             throw new Error("invalid null")
                         }
                         return {
                             consumed: 0,
                             value: coerceFunc("null", undefined)
                         }
                     },
                     dynamic: false
                 }
             };
             var coderNumber = function(coerceFunc, size, signed, localName) {
                 var name = (signed ? "int" : "uint") + size * 8;
                 return {
                     localName: localName,
                     name: name,
                     type: name,
                     encode: function(value) {
                         value = utils.bigNumberify(value).toTwos(size * 8).maskn(size * 8);
                         if (signed) {
                             value = value.fromTwos(size * 8).toTwos(256)
                         }
                         return utils.padZeros(utils.arrayify(value), 32)
                     },
                     decode: function(data, offset) {
                         var junkLength = 32 - size;
                         var value = utils.bigNumberify(data.slice(offset + junkLength, offset + 32));
                         if (signed) {
                             value = value.fromTwos(size * 8)
                         } else {
                             value = value.maskn(size * 8)
                         }
                         return {
                             consumed: 32,
                             value: coerceFunc(name, value)
                         }
                     }
                 }
             };
             var uint256Coder = coderNumber(function(type, value) {
                 return value
             }, 32, false);
             var coderBoolean = function(coerceFunc, localName) {
                 return {
                     localName: localName,
                     name: "boolean",
                     type: "boolean",
                     encode: function(value) {
                         return uint256Coder.encode(value ? 1 : 0)
                     },
                     decode: function(data, offset) {
                         var result = uint256Coder.decode(data, offset);
                         return {
                             consumed: result.consumed,
                             value: coerceFunc("boolean", !result.value.isZero())
                         }
                     }
                 }
             };
             var coderFixedBytes = function(coerceFunc, length, localName) {
                 var name = "bytes" + length;
                 return {
                     localName: localName,
                     name: name,
                     type: name,
                     encode: function(value) {
                         value = utils.arrayify(value);
                         if (length === 32) {
                             return value
                         }
                         var result = new Uint8Array(32);
                         result.set(value);
                         return result
                     },
                     decode: function(data, offset) {
                         if (data.length < offset + 32) {
                             throwError("invalid bytes" + length)
                         }
                         return {
                             consumed: 32,
                             value: coerceFunc(name, utils.hexlify(data.slice(offset, offset + length)))
                         }
                     }
                 }
             };
             var coderAddress = function(coerceFunc, localName) {
                 return {
                     localName: localName,
                     name: "address",
                     type: "address",
                     encode: function(value) {
                         value = utils.arrayify(utils.getAddress(value));
                         var result = new Uint8Array(32);
                         result.set(value, 12);
                         return result
                     },
                     decode: function(data, offset) {
                         if (data.length < offset + 32) {
                             throwError("invalid address")
                         }
                         return {
                             consumed: 32,
                             value: coerceFunc("address", utils.getAddress(utils.hexlify(data.slice(offset + 12, offset + 32))))
                         }
                     }
                 }
             };

             function _encodeDynamicBytes(value) {
                 var dataLength = parseInt(32 * Math.ceil(value.length / 32));
                 var padding = new Uint8Array(dataLength - value.length);
                 return utils.concat([uint256Coder.encode(value.length), value, padding])
             }

             function _decodeDynamicBytes(data, offset) {
                 if (data.length < offset + 32) {
                     throwError("invalid bytes")
                 }
                 var length = uint256Coder.decode(data, offset).value;
                 length = length.toNumber();
                 if (data.length < offset + 32 + length) {
                     throwError("invalid bytes")
                 }
                 return {
                     consumed: parseInt(32 + 32 * Math.ceil(length / 32)),
                     value: data.slice(offset + 32, offset + 32 + length)
                 }
             }
             var coderDynamicBytes = function(coerceFunc, localName) {
                 return {
                     localName: localName,
                     name: "bytes",
                     type: "bytes",
                     encode: function(value) {
                         return _encodeDynamicBytes(utils.arrayify(value))
                     },
                     decode: function(data, offset) {
                         var result = _decodeDynamicBytes(data, offset);
                         result.value = coerceFunc("bytes", utils.hexlify(result.value));
                         return result
                     },
                     dynamic: true
                 }
             };
             var coderString = function(coerceFunc, localName) {
                 return {
                     localName: localName,
                     name: "string",
                     type: "string",
                     encode: function(value) {
                         return _encodeDynamicBytes(utils.toUtf8Bytes(value))
                     },
                     decode: function(data, offset) {
                         var result = _decodeDynamicBytes(data, offset);
                         result.value = coerceFunc("string", utils.toUtf8String(result.value));
                         return result
                     },
                     dynamic: true
                 }
             };

             function alignSize(size) {
                 return parseInt(32 * Math.ceil(size / 32))
             }

             function pack(coders, values) {
                 if (Array.isArray(values)) {
                     if (coders.length !== values.length) {
                         throwError("types/values mismatch", {
                             type: type,
                             values: values
                         })
                     }
                 } else if (values && typeof values === "object") {
                     var arrayValues = [];
                     coders.forEach(function(coder) {
                         arrayValues.push(values[coder.localName])
                     });
                     values = arrayValues
                 } else {
                     throwError("invalid value", {
                         type: "tuple",
                         values: values
                     })
                 }
                 var parts = [];
                 coders.forEach(function(coder, index) {
                     parts.push({
                         dynamic: coder.dynamic,
                         value: coder.encode(values[index])
                     })
                 });
                 var staticSize = 0,
                     dynamicSize = 0;
                 parts.forEach(function(part, index) {
                     if (part.dynamic) {
                         staticSize += 32;
                         dynamicSize += alignSize(part.value.length)
                     } else {
                         staticSize += alignSize(part.value.length)
                     }
                 });
                 var offset = 0,
                     dynamicOffset = staticSize;
                 var data = new Uint8Array(staticSize + dynamicSize);
                 parts.forEach(function(part, index) {
                     if (part.dynamic) {
                         data.set(uint256Coder.encode(dynamicOffset), offset);
                         offset += 32;
                         data.set(part.value, dynamicOffset);
                         dynamicOffset += alignSize(part.value.length)
                     } else {
                         data.set(part.value, offset);
                         offset += alignSize(part.value.length)
                     }
                 });
                 return data
             }

             function unpack(coders, data, offset) {
                 var baseOffset = offset;
                 var consumed = 0;
                 var value = [];
                 coders.forEach(function(coder) {
                     if (coder.dynamic) {
                         var dynamicOffset = uint256Coder.decode(data, offset);
                         var result = coder.decode(data, baseOffset + dynamicOffset.value.toNumber());
                         result.consumed = dynamicOffset.consumed
                     } else {
                         var result = coder.decode(data, offset)
                     }
                     if (result.value != undefined) {
                         value.push(result.value)
                     }
                     offset += result.consumed;
                     consumed += result.consumed
                 });
                 coders.forEach(function(coder, index) {
                     var name = coder.localName;
                     if (!name) {
                         return
                     }
                     if (typeof name === "object") {
                         name = name.name
                     }
                     if (!name) {
                         return
                     }
                     if (name === "length") {
                         name = "_length"
                     }
                     if (value[name] != null) {
                         return
                     }
                     value[name] = value[index]
                 });
                 return {
                     value: value,
                     consumed: consumed
                 };
                 return result
             }

             function coderArray(coerceFunc, coder, length, localName) {
                 var type = coder.type + "[" + (length >= 0 ? length : "") + "]";
                 return {
                     coder: coder,
                     localName: localName,
                     length: length,
                     name: "array",
                     type: type,
                     encode: function(value) {
                         if (!Array.isArray(value)) {
                             throwError("invalid array")
                         }
                         var count = length;
                         var result = new Uint8Array(0);
                         if (count === -1) {
                             count = value.length;
                             result = uint256Coder.encode(count)
                         }
                         if (count !== value.length) {
                             throwError("size mismatch")
                         }
                         var coders = [];
                         value.forEach(function(value) {
                             coders.push(coder)
                         });
                         return utils.concat([result, pack(coders, value)])
                     },
                     decode: function(data, offset) {
                         var consumed = 0;
                         var count = length;
                         if (count === -1) {
                             var decodedLength = uint256Coder.decode(data, offset);
                             count = decodedLength.value.toNumber();
                             consumed += decodedLength.consumed;
                             offset += decodedLength.consumed
                         }
                         var coders = [];
                         for (var i = 0; i < count; i++) {
                             coders.push(coder)
                         }
                         var result = unpack(coders, data, offset);
                         result.consumed += consumed;
                         result.value = coerceFunc(type, result.value);
                         return result
                     },
                     dynamic: length === -1 || coder.dynamic
                 }
             }

             function coderTuple(coerceFunc, coders, localName) {
                 var dynamic = false;
                 var types = [];
                 coders.forEach(function(coder) {
                     if (coder.dynamic) {
                         dynamic = true
                     }
                     types.push(coder.type)
                 });
                 var type = "tuple(" + types.join(",") + ")";
                 return {
                     coders: coders,
                     localName: localName,
                     name: "tuple",
                     type: type,
                     encode: function(value) {
                         return pack(coders, value)
                     },
                     decode: function(data, offset) {
                         var result = unpack(coders, data, offset);
                         result.value = coerceFunc(type, result.value);
                         return result
                     },
                     dynamic: dynamic
                 }
             }

             function splitNesting(value) {
                 var result = [];
                 var accum = "";
                 var depth = 0;
                 for (var offset = 0; offset < value.length; offset++) {
                     var c = value[offset];
                     if (c === "," && depth === 0) {
                         result.push(accum);
                         accum = ""
                     } else {
                         accum += c;
                         if (c === "(") {
                             depth++
                         } else if (c === ")") {
                             depth--;
                             if (depth === -1) {
                                 throw new Error("unbalanced parenthsis")
                             }
                         }
                     }
                 }
                 result.push(accum);
                 return result
             }
             var paramTypeSimple = {
                 address: coderAddress,
                 bool: coderBoolean,
                 string: coderString,
                 bytes: coderDynamicBytes
             };

             function getParamCoder(coerceFunc, type, localName) {
                 var coder = paramTypeSimple[type];
                 if (coder) {
                     return coder(coerceFunc, localName)
                 }
                 var match = type.match(paramTypeNumber);
                 if (match) {
                     var size = parseInt(match[2] || 256);
                     if (size === 0 || size > 256 || size % 8 !== 0) {
                         throwError("invalid type", {
                             type: type
                         })
                     }
                     return coderNumber(coerceFunc, size / 8, match[1] === "int", localName)
                 }
                 var match = type.match(paramTypeBytes);
                 if (match) {
                     var size = parseInt(match[1]);
                     if (size === 0 || size > 32) {
                         throwError("invalid type " + type)
                     }
                     return coderFixedBytes(coerceFunc, size, localName)
                 }
                 var match = type.match(paramTypeArray);
                 if (match) {
                     var size = parseInt(match[2] || -1);
                     return coderArray(coerceFunc, getParamCoder(coerceFunc, match[1], localName), size, localName)
                 }
                 if (type.substring(0, 6) === "tuple(" && type.substring(type.length - 1) === ")") {
                     var coders = [];
                     var names = [];
                     if (localName && typeof localName === "object") {
                         if (Array.isArray(localName.names)) {
                             names = localName.names
                         }
                         if (typeof localName.name === "string") {
                             localName = localName.name
                         }
                     }
                     splitNesting(type.substring(6, type.length - 1)).forEach(function(type, index) {
                         coders.push(getParamCoder(coerceFunc, type, names[index]))
                     });
                     return coderTuple(coerceFunc, coders, localName)
                 }
                 if (type === "") {
                     return coderNull(coerceFunc)
                 }
                 throwError("invalid type", {
                     type: type
                 })
             }

             function Coder(coerceFunc) {
                 if (!(this instanceof Coder)) {
                     throw new Error("missing new")
                 }
                 if (!coerceFunc) {
                     coerceFunc = defaultCoerceFunc
                 }
                 utils.defineProperty(this, "coerceFunc", coerceFunc)
             }
             utils.defineProperty(Coder.prototype, "encode", function(names, types, values) {
                 if (arguments.length < 3) {
                     values = types;
                     types = names;
                     names = null
                 }
                 if (types.length !== values.length) {
                     throwError("types/values mismatch", {
                         types: types,
                         values: values
                     })
                 }
                 var coders = [];
                 types.forEach(function(type, index) {
                     coders.push(getParamCoder(this.coerceFunc, type, names ? names[index] : undefined))
                 }, this);
                 return utils.hexlify(coderTuple(this.coerceFunc, coders).encode(values))
             });
             utils.defineProperty(Coder.prototype, "decode", function(names, types, data) {
                 if (arguments.length < 3) {
                     data = types;
                     types = names;
                     names = null
                 }
                 data = utils.arrayify(data);
                 var coders = [];
                 types.forEach(function(type, index) {
                     coders.push(getParamCoder(this.coerceFunc, type, names ? names[index] : undefined))
                 }, this);
                 return coderTuple(this.coerceFunc, coders).decode(data, 0).value
             });
             utils.defineProperty(Coder, "defaultCoder", new Coder);
             module.exports = Coder
         }, {
             "../utils/address": 56,
             "../utils/bignumber.js": 57,
             "../utils/convert.js": 60,
             "../utils/properties.js": 67,
             "../utils/throw-error": 71,
             "../utils/utf8.js": 73
         }],
         56: [function(require, module, exports) {
             var BN = require("bn.js");
             var convert = require("./convert");
             var throwError = require("./throw-error");
             var keccak256 = require("./keccak256");

             function getChecksumAddress(address) {
                 if (typeof address !== "string" || !address.match(/^0x[0-9A-Fa-f]{40}$/)) {
                     throwError("invalid address", {
                         input: address
                     })
                 }
                 address = address.toLowerCase();
                 var hashed = address.substring(2).split("");
                 for (var i = 0; i < hashed.length; i++) {
                     hashed[i] = hashed[i].charCodeAt(0)
                 }
                 hashed = convert.arrayify(keccak256(hashed));
                 address = address.substring(2).split("");
                 for (var i = 0; i < 40; i += 2) {
                     if (hashed[i >> 1] >> 4 >= 8) {
                         address[i] = address[i].toUpperCase()
                     }
                     if ((hashed[i >> 1] & 15) >= 8) {
                         address[i + 1] = address[i + 1].toUpperCase()
                     }
                 }
                 return "0x" + address.join("")
             }
             var MAX_SAFE_INTEGER = 9007199254740991;

             function log10(x) {
                 if (Math.log10) {
                     return Math.log10(x)
                 }
                 return Math.log(x) / Math.LN10
             }
             var ibanChecksum = function() {
                 var ibanLookup = {};
                 for (var i = 0; i < 10; i++) {
                     ibanLookup[String(i)] = String(i)
                 }
                 for (var i = 0; i < 26; i++) {
                     ibanLookup[String.fromCharCode(65 + i)] = String(10 + i)
                 }
                 var safeDigits = Math.floor(log10(MAX_SAFE_INTEGER));
                 return function(address) {
                     address = address.toUpperCase();
                     address = address.substring(4) + address.substring(0, 2) + "00";
                     var expanded = address.split("");
                     for (var i = 0; i < expanded.length; i++) {
                         expanded[i] = ibanLookup[expanded[i]]
                     }
                     expanded = expanded.join("");
                     while (expanded.length >= safeDigits) {
                         var block = expanded.substring(0, safeDigits);
                         expanded = parseInt(block, 10) % 97 + expanded.substring(block.length)
                     }
                     var checksum = String(98 - parseInt(expanded, 10) % 97);
                     while (checksum.length < 2) {
                         checksum = "0" + checksum
                     }
                     return checksum
                 }
             }();

             function getAddress(address, icapFormat) {
                 var result = null;
                 if (typeof address !== "string") {
                     throwError("invalid address", {
                         input: address
                     })
                 }
                 if (address.match(/^(0x)?[0-9a-fA-F]{40}$/)) {
                     if (address.substring(0, 2) !== "0x") {
                         address = "0x" + address
                     }
                     result = getChecksumAddress(address);
                     if (address.match(/([A-F].*[a-f])|([a-f].*[A-F])/) && result !== address) {
                         throwError("invalid address checksum", {
                             input: address,
                             expected: result
                         })
                     }
                 } else if (address.match(/^XE[0-9]{2}[0-9A-Za-z]{30,31}$/)) {
                     if (address.substring(2, 4) !== ibanChecksum(address)) {
                         throwError("invalid address icap checksum", {
                             input: address
                         })
                     }
                     result = new BN(address.substring(4), 36).toString(16);
                     while (result.length < 40) {
                         result = "0" + result
                     }
                     result = getChecksumAddress("0x" + result)
                 } else {
                     throwError("invalid address", {
                         input: address
                     })
                 }
                 if (icapFormat) {
                     var base36 = new BN(result.substring(2), 16).toString(36).toUpperCase();
                     while (base36.length < 30) {
                         base36 = "0" + base36
                     }
                     return "XE" + ibanChecksum("XE00" + base36) + base36
                 }
                 return result
             }
             module.exports = {
                 getAddress: getAddress
             }
         }, {
             "./convert": 60,
             "./keccak256": 64,
             "./throw-error": 71,
             "bn.js": 6
         }],
         57: [function(require, module, exports) {
             var BN = require("bn.js");
             var defineProperty = require("./properties").defineProperty;
             var convert = require("./convert");
             var throwError = require("./throw-error");

             function BigNumber(value) {
                 if (!(this instanceof BigNumber)) {
                     throw new Error("missing new")
                 }
                 if (convert.isHexString(value)) {
                     if (value == "0x") {
                         value = "0x0"
                     }
                     value = new BN(value.substring(2), 16)
                 } else if (typeof value === "string" && value[0] === "-" && convert.isHexString(value.substring(1))) {
                     value = new BN(value.substring(3), 16).mul(BigNumber.constantNegativeOne._bn)
                 } else if (typeof value === "string" && value.match(/^-?[0-9]*$/)) {
                     if (value == "") {
                         value = "0"
                     }
                     value = new BN(value)
                 } else if (typeof value === "number" && parseInt(value) == value) {
                     value = new BN(value)
                 } else if (BN.isBN(value)) {} else if (isBigNumber(value)) {
                     value = value._bn
                 } else if (convert.isArrayish(value)) {
                     value = new BN(convert.hexlify(value).substring(2), 16)
                 } else {
                     throwError("invalid BigNumber value", {
                         input: value
                     })
                 }
                 defineProperty(this, "_bn", value)
             }
             defineProperty(BigNumber, "constantNegativeOne", bigNumberify(-1));
             defineProperty(BigNumber, "constantZero", bigNumberify(0));
             defineProperty(BigNumber, "constantOne", bigNumberify(1));
             defineProperty(BigNumber, "constantTwo", bigNumberify(2));
             defineProperty(BigNumber, "constantWeiPerEther", bigNumberify(new BN("1000000000000000000")));
             defineProperty(BigNumber.prototype, "fromTwos", function(value) {
                 return new BigNumber(this._bn.fromTwos(value))
             });
             defineProperty(BigNumber.prototype, "toTwos", function(value) {
                 return new BigNumber(this._bn.toTwos(value))
             });
             defineProperty(BigNumber.prototype, "add", function(other) {
                 return new BigNumber(this._bn.add(bigNumberify(other)._bn))
             });
             defineProperty(BigNumber.prototype, "sub", function(other) {
                 return new BigNumber(this._bn.sub(bigNumberify(other)._bn))
             });
             defineProperty(BigNumber.prototype, "div", function(other) {
                 return new BigNumber(this._bn.div(bigNumberify(other)._bn))
             });
             defineProperty(BigNumber.prototype, "mul", function(other) {
                 return new BigNumber(this._bn.mul(bigNumberify(other)._bn))
             });
             defineProperty(BigNumber.prototype, "mod", function(other) {
                 return new BigNumber(this._bn.mod(bigNumberify(other)._bn))
             });
             defineProperty(BigNumber.prototype, "pow", function(other) {
                 return new BigNumber(this._bn.pow(bigNumberify(other)._bn))
             });
             defineProperty(BigNumber.prototype, "maskn", function(value) {
                 return new BigNumber(this._bn.maskn(value))
             });
             defineProperty(BigNumber.prototype, "eq", function(other) {
                 return this._bn.eq(bigNumberify(other)._bn)
             });
             defineProperty(BigNumber.prototype, "lt", function(other) {
                 return this._bn.lt(bigNumberify(other)._bn)
             });
             defineProperty(BigNumber.prototype, "lte", function(other) {
                 return this._bn.lte(bigNumberify(other)._bn)
             });
             defineProperty(BigNumber.prototype, "gt", function(other) {
                 return this._bn.gt(bigNumberify(other)._bn)
             });
             defineProperty(BigNumber.prototype, "gte", function(other) {
                 return this._bn.gte(bigNumberify(other)._bn)
             });
             defineProperty(BigNumber.prototype, "isZero", function() {
                 return this._bn.isZero()
             });
             defineProperty(BigNumber.prototype, "toNumber", function(base) {
                 return this._bn.toNumber()
             });
             defineProperty(BigNumber.prototype, "toString", function() {
                 return this._bn.toString(10)
             });
             defineProperty(BigNumber.prototype, "toHexString", function() {
                 var hex = this._bn.toString(16);
                 if (hex.length % 2) {
                     hex = "0" + hex
                 }
                 return "0x" + hex
             });

             function isBigNumber(value) {
                 return value._bn && value._bn.mod
             }

             function bigNumberify(value) {
                 if (isBigNumber(value)) {
                     return value
                 }
                 return new BigNumber(value)
             }
             module.exports = {
                 isBigNumber: isBigNumber,
                 bigNumberify: bigNumberify,
                 BigNumber: BigNumber
             }
         }, {
             "./convert": 60,
             "./properties": 67,
             "./throw-error": 71,
             "bn.js": 6
         }],
         58: [function(require, module, exports) {
             (function(global) {
                 "use strict";
                 var convert = require("./convert");
                 var defineProperty = require("./properties").defineProperty;
                 var crypto = global.crypto || global.msCrypto;
                 if (!crypto || !crypto.getRandomValues) {
                     console.log("WARNING: Missing strong random number source; using weak randomBytes");
                     crypto = {
                         getRandomValues: function(buffer) {
                             for (var round = 0; round < 20; round++) {
                                 for (var i = 0; i < buffer.length; i++) {
                                     if (round) {
                                         buffer[i] ^= parseInt(256 * Math.random())
                                     } else {
                                         buffer[i] = parseInt(256 * Math.random())
                                     }
                                 }
                             }
                             return buffer
                         },
                         _weakCrypto: true
                     }
                 }

                 function randomBytes(length) {
                     if (length <= 0 || length > 1024 || parseInt(length) != length) {
                         throw new Error("invalid length")
                     }
                     var result = new Uint8Array(length);
                     crypto.getRandomValues(result);
                     return convert.arrayify(result)
                 }
                 if (crypto._weakCrypto === true) {
                     defineProperty(randomBytes, "_weakCrypto", true)
                 }
                 module.exports = randomBytes
             }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
         }, {
             "./convert": 60,
             "./properties": 67
         }],
         59: [function(require, module, exports) {
             var getAddress = require("./address").getAddress;
             var convert = require("./convert");
             var keccak256 = require("./keccak256");
             var RLP = require("./rlp");

             function getContractAddress(transaction) {
                 if (!transaction.from) {
                     throw new Error("missing from address")
                 }
                 var nonce = transaction.nonce;
                 return getAddress("0x" + keccak256(RLP.encode([getAddress(transaction.from), convert.stripZeros(convert.hexlify(nonce, "nonce"))])).substring(26))
             }
             module.exports = {
                 getContractAddress: getContractAddress
             }
         }, {
             "./address": 56,
             "./convert": 60,
             "./keccak256": 64,
             "./rlp": 68
         }],
         60: [function(require, module, exports) {
             var defineProperty = require("./properties.js").defineProperty;
             var throwError = require("./throw-error");

             function addSlice(array) {
                 if (array.slice) {
                     return array
                 }
                 array.slice = function() {
                     var args = Array.prototype.slice.call(arguments);
                     return new Uint8Array(Array.prototype.slice.apply(array, args))
                 };
                 return array
             }

             function isArrayish(value) {
                 if (!value || parseInt(value.length) != value.length || typeof value === "string") {
                     return false
                 }
                 for (var i = 0; i < value.length; i++) {
                     var v = value[i];
                     if (v < 0 || v >= 256 || parseInt(v) != v) {
                         return false
                     }
                 }
                 return true
             }

             function arrayify(value, name) {
                 if (value && value.toHexString) {
                     value = value.toHexString()
                 }
                 if (isHexString(value)) {
                     value = value.substring(2);
                     if (value.length % 2) {
                         value = "0" + value
                     }
                     var result = [];
                     for (var i = 0; i < value.length; i += 2) {
                         result.push(parseInt(value.substr(i, 2), 16))
                     }
                     return addSlice(new Uint8Array(result))
                 }
                 if (isArrayish(value)) {
                     return addSlice(new Uint8Array(value))
                 }
                 throwError("invalid arrayify value", {
                     name: name,
                     input: value
                 })
             }

             function concat(objects) {
                 var arrays = [];
                 var length = 0;
                 for (var i = 0; i < objects.length; i++) {
                     var object = arrayify(objects[i]);
                     arrays.push(object);
                     length += object.length
                 }
                 var result = new Uint8Array(length);
                 var offset = 0;
                 for (var i = 0; i < arrays.length; i++) {
                     result.set(arrays[i], offset);
                     offset += arrays[i].length
                 }
                 return addSlice(result)
             }

             function stripZeros(value) {
                 value = arrayify(value);
                 if (value.length === 0) {
                     return value
                 }
                 var start = 0;
                 while (value[start] === 0) {
                     start++
                 }
                 if (start) {
                     value = value.slice(start)
                 }
                 return value
             }

             function padZeros(value, length) {
                 value = arrayify(value);
                 if (length < value.length) {
                     throw new Error("cannot pad")
                 }
                 var result = new Uint8Array(length);
                 result.set(value, length - value.length);
                 return addSlice(result)
             }

             function isHexString(value, length) {
                 if (typeof value !== "string" || !value.match(/^0x[0-9A-Fa-f]*$/)) {
                     return false
                 }
                 if (length && value.length !== 2 + 2 * length) {
                     return false
                 }
                 return true
             }
             var HexCharacters = "0123456789abcdef";

             function hexlify(value, name) {
                 if (value && value.toHexString) {
                     return value.toHexString()
                 }
                 if (typeof value === "number") {
                     if (value < 0) {
                         throwError("cannot hexlify negative value", {
                             name: name,
                             input: value
                         })
                     }
                     var hex = "";
                     while (value) {
                         hex = HexCharacters[value & 15] + hex;
                         value = parseInt(value / 16)
                     }
                     if (hex.length) {
                         if (hex.length % 2) {
                             hex = "0" + hex
                         }
                         return "0x" + hex
                     }
                     return "0x00"
                 }
                 if (isHexString(value)) {
                     if (value.length % 2) {
                         value = "0x0" + value.substring(2)
                     }
                     return value
                 }
                 if (isArrayish(value)) {
                     var result = [];
                     for (var i = 0; i < value.length; i++) {
                         var v = value[i];
                         result.push(HexCharacters[(v & 240) >> 4] + HexCharacters[v & 15])
                     }
                     return "0x" + result.join("")
                 }
                 throwError("invalid hexlify value", {
                     name: name,
                     input: value
                 })
             }

             function hexStripZeros(value) {
                 while (value.length > 3 && value.substring(0, 3) === "0x0") {
                     value = "0x" + value.substring(3)
                 }
                 return value
             }

             function hexZeroPad(value, length) {
                 while (value.length < 2 * length + 2) {
                     value = "0x0" + value.substring(2)
                 }
                 return value
             }
             module.exports = {
                 arrayify: arrayify,
                 isArrayish: isArrayish,
                 concat: concat,
                 padZeros: padZeros,
                 stripZeros: stripZeros,
                 hexlify: hexlify,
                 isHexString: isHexString,
                 hexStripZeros: hexStripZeros,
                 hexZeroPad: hexZeroPad
             }
         }, {
             "./properties.js": 67,
             "./throw-error": 71
         }],
         61: [function(require, module, exports) {
             "use strict";
             var hash = require("hash.js");
             var sha2 = require("./sha2.js");
             var convert = require("./convert.js");

             function createSha256Hmac(key) {
                 if (!key.buffer) {
                     key = convert.arrayify(key)
                 }
                 return new hash.hmac(sha2.createSha256, key)
             }

             function createSha512Hmac(key) {
                 if (!key.buffer) {
                     key = convert.arrayify(key)
                 }
                 return new hash.hmac(sha2.createSha512, key)
             }
             module.exports = {
                 createSha256Hmac: createSha256Hmac,
                 createSha512Hmac: createSha512Hmac
             }
         }, {
             "./convert.js": 60,
             "./sha2.js": 69,
             "hash.js": 24
         }],
         62: [function(require, module, exports) {
             "use strict";
             var keccak256 = require("./keccak256");
             var utf8 = require("./utf8");

             function id(text) {
                 return keccak256(utf8.toUtf8Bytes(text))
             }
             module.exports = id
         }, {
             "./keccak256": 64,
             "./utf8": 73
         }],
         63: [function(require, module, exports) {
             "use strict";
             var address = require("./address");
             var AbiCoder = require("./abi-coder");
             var bigNumber = require("./bignumber");
             var contractAddress = require("./contract-address");
             var convert = require("./convert");
             var id = require("./id");
             var keccak256 = require("./keccak256");
             var namehash = require("./namehash");
             var sha256 = require("./sha2").sha256;
             var solidity = require("./solidity");
             var randomBytes = require("./random-bytes");
             var properties = require("./properties");
             var RLP = require("./rlp");
             var utf8 = require("./utf8");
             var units = require("./units");
             module.exports = {
                 AbiCoder: AbiCoder,
                 RLP: RLP,
                 defineProperty: properties.defineProperty,
                 etherSymbol: "Ξ",
                 arrayify: convert.arrayify,
                 concat: convert.concat,
                 padZeros: convert.padZeros,
                 stripZeros: convert.stripZeros,
                 bigNumberify: bigNumber.bigNumberify,
                 BigNumber: bigNumber.BigNumber,
                 hexlify: convert.hexlify,
                 toUtf8Bytes: utf8.toUtf8Bytes,
                 toUtf8String: utf8.toUtf8String,
                 namehash: namehash,
                 id: id,
                 getAddress: address.getAddress,
                 getContractAddress: contractAddress.getContractAddress,
                 formatEther: units.formatEther,
                 parseEther: units.parseEther,
                 formatUnits: units.formatUnits,
                 parseUnits: units.parseUnits,
                 keccak256: keccak256,
                 sha256: sha256,
                 randomBytes: randomBytes,
                 solidityPack: solidity.pack,
                 solidityKeccak256: solidity.keccak256,
                 soliditySha256: solidity.sha256
             }
         }, {
             "./abi-coder": 55,
             "./address": 56,
             "./bignumber": 57,
             "./contract-address": 59,
             "./convert": 60,
             "./id": 62,
             "./keccak256": 64,
             "./namehash": 65,
             "./properties": 67,
             "./random-bytes": 58,
             "./rlp": 68,
             "./sha2": 69,
             "./solidity": 70,
             "./units": 72,
             "./utf8": 73
         }],
         64: [function(require, module, exports) {
             "use strict";
             var sha3 = require("js-sha3");
             var convert = require("./convert.js");

             function keccak256(data) {
                 data = convert.arrayify(data);
                 return "0x" + sha3.keccak_256(data)
             }
             module.exports = keccak256
         }, {
             "./convert.js": 60,
             "js-sha3": 38
         }],
         65: [function(require, module, exports) {
             "use strict";
             var convert = require("./convert");
             var utf8 = require("./utf8");
             var keccak256 = require("./keccak256");
             var Zeros = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
             var Partition = new RegExp("^((.*)\\.)?([^.]+)$");
             var UseSTD3ASCIIRules = new RegExp("^[a-z0-9.-]*$");

             function namehash(name, depth) {
                 name = name.toLowerCase();
                 if (!name.match(UseSTD3ASCIIRules)) {
                     throw new Error("contains invalid UseSTD3ASCIIRules characters")
                 }
                 var result = Zeros;
                 var processed = 0;
                 while (name.length && (!depth || processed < depth)) {
                     var partition = name.match(Partition);
                     var label = utf8.toUtf8Bytes(partition[3]);
                     result = keccak256(convert.concat([result, keccak256(label)]));
                     name = partition[2] || "";
                     processed++
                 }
                 return convert.hexlify(result)
             }
             module.exports = namehash
         }, {
             "./convert": 60,
             "./keccak256": 64,
             "./utf8": 73
         }],
         66: [function(require, module, exports) {
             "use strict";
             var convert = require("./convert");

             function pbkdf2(password, salt, iterations, keylen, createHmac) {
                 var hLen;
                 var l = 1;
                 var DK = new Uint8Array(keylen);
                 var block1 = new Uint8Array(salt.length + 4);
                 block1.set(salt);
                 var r;
                 var T;
                 for (var i = 1; i <= l; i++) {
                     block1[salt.length] = i >> 24 & 255;
                     block1[salt.length + 1] = i >> 16 & 255;
                     block1[salt.length + 2] = i >> 8 & 255;
                     block1[salt.length + 3] = i & 255;
                     var U = createHmac(password).update(block1).digest();
                     if (!hLen) {
                         hLen = U.length;
                         T = new Uint8Array(hLen);
                         l = Math.ceil(keylen / hLen);
                         r = keylen - (l - 1) * hLen
                     }
                     T.set(U);
                     for (var j = 1; j < iterations; j++) {
                         U = createHmac(password).update(U).digest();
                         for (var k = 0; k < hLen; k++) T[k] ^= U[k]
                     }
                     var destPos = (i - 1) * hLen;
                     var len = i === l ? r : hLen;
                     DK.set(convert.arrayify(T).slice(0, len), destPos)
                 }
                 return convert.arrayify(DK)
             }
             module.exports = pbkdf2
         }, {
             "./convert": 60
         }],
         67: [function(require, module, exports) {
             "use strict";

             function defineProperty(object, name, value) {
                 Object.defineProperty(object, name, {
                     enumerable: true,
                     value: value,
                     writable: false
                 })
             }

             function defineFrozen(object, name, value) {
                 var frozen = JSON.stringify(value);
                 Object.defineProperty(object, name, {
                     enumerable: true,
                     get: function() {
                         return JSON.parse(frozen)
                     }
                 })
             }
             module.exports = {
                 defineFrozen: defineFrozen,
                 defineProperty: defineProperty
             }
         }, {}],
         68: [function(require, module, exports) {
             var convert = require("./convert.js");

             function arrayifyInteger(value) {
                 var result = [];
                 while (value) {
                     result.unshift(value & 255);
                     value >>= 8
                 }
                 return result
             }

             function unarrayifyInteger(data, offset, length) {
                 var result = 0;
                 for (var i = 0; i < length; i++) {
                     result = result * 256 + data[offset + i]
                 }
                 return result
             }

             function _encode(object) {
                 if (Array.isArray(object)) {
                     var payload = [];
                     object.forEach(function(child) {
                         payload = payload.concat(_encode(child))
                     });
                     if (payload.length <= 55) {
                         payload.unshift(192 + payload.length);
                         return payload
                     }
                     var length = arrayifyInteger(payload.length);
                     length.unshift(247 + length.length);
                     return length.concat(payload)
                 } else {
                     object = [].slice.call(convert.arrayify(object));
                     if (object.length === 1 && object[0] <= 127) {
                         return object
                     } else if (object.length <= 55) {
                         object.unshift(128 + object.length);
                         return object
                     }
                     var length = arrayifyInteger(object.length);
                     length.unshift(183 + length.length);
                     return length.concat(object)
                 }
             }

             function encode(object) {
                 return convert.hexlify(_encode(object))
             }

             function _decodeChildren(data, offset, childOffset, length) {
                 var result = [];
                 while (childOffset < offset + 1 + length) {
                     var decoded = _decode(data, childOffset);
                     result.push(decoded.result);
                     childOffset += decoded.consumed;
                     if (childOffset > offset + 1 + length) {
                         throw new Error("invalid rlp")
                     }
                 }
                 return {
                     consumed: 1 + length,
                     result: result
                 }
             }

             function _decode(data, offset) {
                 if (data.length === 0) {
                     throw new Error("invalid rlp data")
                 }
                 if (data[offset] >= 248) {
                     var lengthLength = data[offset] - 247;
                     if (offset + 1 + lengthLength > data.length) {
                         throw new Error("too short")
                     }
                     var length = unarrayifyInteger(data, offset + 1, lengthLength);
                     if (offset + 1 + lengthLength + length > data.length) {
                         throw new Error("to short")
                     }
                     return _decodeChildren(data, offset, offset + 1 + lengthLength, lengthLength + length)
                 } else if (data[offset] >= 192) {
                     var length = data[offset] - 192;
                     if (offset + 1 + length > data.length) {
                         throw new Error("invalid rlp data")
                     }
                     return _decodeChildren(data, offset, offset + 1, length)
                 } else if (data[offset] >= 184) {
                     var lengthLength = data[offset] - 183;
                     if (offset + 1 + lengthLength > data.length) {
                         throw new Error("invalid rlp data")
                     }
                     var length = unarrayifyInteger(data, offset + 1, lengthLength);
                     if (offset + 1 + lengthLength + length > data.length) {
                         throw new Error("invalid rlp data")
                     }
                     var result = convert.hexlify(data.slice(offset + 1 + lengthLength, offset + 1 + lengthLength + length));
                     return {
                         consumed: 1 + lengthLength + length,
                         result: result
                     }
                 } else if (data[offset] >= 128) {
                     var length = data[offset] - 128;
                     if (offset + 1 + length > data.offset) {
                         throw new Error("invlaid rlp data")
                     }
                     var result = convert.hexlify(data.slice(offset + 1, offset + 1 + length));
                     return {
                         consumed: 1 + length,
                         result: result
                     }
                 }
                 return {
                     consumed: 1,
                     result: convert.hexlify(data[offset])
                 }
             }

             function decode(data) {
                 data = convert.arrayify(data);
                 var decoded = _decode(data, 0);
                 if (decoded.consumed !== data.length) {
                     throw new Error("invalid rlp data")
                 }
                 return decoded.result
             }
             module.exports = {
                 encode: encode,
                 decode: decode
             }
         }, {
             "./convert.js": 60
         }],
         69: [function(require, module, exports) {
             "use strict";
             var hash = require("hash.js");
             var convert = require("./convert.js");

             function sha256(data) {
                 data = convert.arrayify(data);
                 return "0x" + hash.sha256().update(data).digest("hex")
             }

             function sha512(data) {
                 data = convert.arrayify(data);
                 return "0x" + hash.sha512().update(data).digest("hex")
             }
             module.exports = {
                 sha256: sha256,
                 sha512: sha512,
                 createSha256: hash.sha256,
                 createSha512: hash.sha512
             }
         }, {
             "./convert.js": 60,
             "hash.js": 24
         }],
         70: [function(require, module, exports) {
             "use strict";
             var bigNumberify = require("./bignumber").bigNumberify;
             var convert = require("./convert");
             var getAddress = require("./address").getAddress;
             var utf8 = require("./utf8");
             var hashKeccak256 = require("./keccak256");
             var hashSha256 = require("./sha2").sha256;
             var regexBytes = new RegExp("^bytes([0-9]+)$");
             var regexNumber = new RegExp("^(u?int)([0-9]*)$");
             var regexArray = new RegExp("^(.*)\\[([0-9]*)\\]$");
             var Zeros = "0000000000000000000000000000000000000000000000000000000000000000";

             function _pack(type, value, isArray) {
                 switch (type) {
                     case "address":
                         if (isArray) {
                             return convert.padZeros(value, 32)
                         }
                         return convert.arrayify(value);
                     case "string":
                         return utf8.toUtf8Bytes(value);
                     case "bytes":
                         return convert.arrayify(value);
                     case "bool":
                         value = value ? "0x01" : "0x00";
                         if (isArray) {
                             return convert.padZeros(value, 32)
                         }
                         return convert.arrayify(value)
                 }
                 var match = type.match(regexNumber);
                 if (match) {
                     var signed = match[1] === "int";
                     var size = parseInt(match[2] || "256");
                     if (size % 8 != 0 || size === 0 || size > 256) {
                         throw new Error("invalid number type - " + type)
                     }
                     if (isArray) {
                         size = 256
                     }
                     value = bigNumberify(value).toTwos(size);
                     return convert.padZeros(value, size / 8)
                 }
                 match = type.match(regexBytes);
                 if (match) {
                     var size = match[1];
                     if (size != parseInt(size) || size === 0 || size > 32) {
                         throw new Error("invalid number type - " + type)
                     }
                     size = parseInt(size);
                     if (convert.arrayify(value).byteLength !== size) {
                         throw new Error("invalid value for " + type)
                     }
                     if (isArray) {
                         return (value + Zeros).substring(0, 66)
                     }
                     return value
                 }
                 match = type.match(regexArray);
                 if (match) {
                     var baseType = match[1];
                     var count = parseInt(match[2] || value.length);
                     if (count != value.length) {
                         throw new Error("invalid value for " + type)
                     }
                     var result = [];
                     value.forEach(function(value) {
                         value = _pack(baseType, value, true);
                         result.push(value)
                     });
                     return convert.concat(result)
                 }
                 throw new Error("unknown type - " + type)
             }

             function pack(types, values) {
                 if (types.length != values.length) {
                     throw new Error("type/value count mismatch")
                 }
                 var tight = [];
                 types.forEach(function(type, index) {
                     tight.push(_pack(type, values[index]))
                 });
                 return convert.hexlify(convert.concat(tight))
             }

             function keccak256(types, values) {
                 return hashKeccak256(pack(types, values))
             }

             function sha256(types, values) {
                 return hashSha256(pack(types, values))
             }
             module.exports = {
                 pack: pack,
                 keccak256: keccak256,
                 sha256: sha256
             }
         }, {
             "./address": 56,
             "./bignumber": 57,
             "./convert": 60,
             "./keccak256": 64,
             "./sha2": 69,
             "./utf8": 73
         }],
         71: [function(require, module, exports) {
             "use strict";

             function throwError(message, params) {
                 var error = new Error(message);
                 for (var key in params) {
                     error[key] = params[key]
                 }
                 throw error
             }
             module.exports = throwError
         }, {}],
         72: [function(require, module, exports) {
             var bigNumberify = require("./bignumber.js").bigNumberify;
             var throwError = require("./throw-error");
             var zero = new bigNumberify(0);
             var negative1 = new bigNumberify(-1);
             var names = ["wei", "kwei", "Mwei", "Gwei", "szabo", "finny", "ether"];
             var getUnitInfo = function() {
                 var unitInfos = {};
                 var value = "1";
                 names.forEach(function(name) {
                     var info = {
                         decimals: value.length - 1,
                         tenPower: bigNumberify(value),
                         name: name
                     };
                     unitInfos[name.toLowerCase()] = info;
                     unitInfos[String(info.decimals)] = info;
                     value += "000"
                 });
                 return function(name) {
                     return unitInfos[String(name).toLowerCase()]
                 }
             }();

             function formatUnits(value, unitType, options) {
                 if (typeof unitType === "object" && !options) {
                     options = unitType;
                     unitType = undefined
                 }
                 if (unitType == null) {
                     unitType = 18
                 }
                 var unitInfo = getUnitInfo(unitType);
                 value = bigNumberify(value);
                 if (!options) {
                     options = {}
                 }
                 var negative = value.lt(zero);
                 if (negative) {
                     value = value.mul(negative1)
                 }
                 var fraction = value.mod(unitInfo.tenPower).toString(10);
                 while (fraction.length < unitInfo.decimals) {
                     fraction = "0" + fraction
                 }
                 if (!options.pad) {
                     fraction = fraction.match(/^([0-9]*[1-9]|0)(0*)/)[1]
                 }
                 var whole = value.div(unitInfo.tenPower).toString(10);
                 if (options.commify) {
                     whole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                 }
                 var value = whole + "." + fraction;
                 if (negative) {
                     value = "-" + value
                 }
                 return value
             }

             function parseUnits(value, unitType) {
                 var unitInfo = getUnitInfo(unitType || 18);
                 if (!unitInfo) {
                     throwError("invalid unitType", {
                         unitType: unitType
                     })
                 }
                 if (typeof value !== "string" || !value.match(/^-?[0-9.,]+$/)) {
                     throwError("invalid value", {
                         input: value
                     })
                 }
                 var value = value.replace(/,/g, "");
                 var negative = value.substring(0, 1) === "-";
                 if (negative) {
                     value = value.substring(1)
                 }
                 if (value === ".") {
                     throwError("invalid value", {
                         input: value
                     })
                 }
                 var comps = value.split(".");
                 if (comps.length > 2) {
                     throwError("too many decimal points", {
                         input: value
                     })
                 }
                 var whole = comps[0],
                     fraction = comps[1];
                 if (!whole) {
                     whole = "0"
                 }
                 if (!fraction) {
                     fraction = "0"
                 }
                 if (fraction.length > unitInfo.decimals) {
                     throwError("too many decimal places", {
                         input: value,
                         decimals: fraction.length
                     })
                 }
                 while (fraction.length < unitInfo.decimals) {
                     fraction += "0"
                 }
                 whole = bigNumberify(whole);
                 fraction = bigNumberify(fraction);
                 var wei = whole.mul(unitInfo.tenPower).add(fraction);
                 if (negative) {
                     wei = wei.mul(negative1)
                 }
                 return wei
             }

             function formatEther(wei, options) {
                 return formatUnits(wei, 18, options)
             }

             function parseEther(ether) {
                 return parseUnits(ether, 18)
             }
             module.exports = {
                 formatEther: formatEther,
                 parseEther: parseEther,
                 formatUnits: formatUnits,
                 parseUnits: parseUnits
             }
         }, {
             "./bignumber.js": 57,
             "./throw-error": 71
         }],
         73: [function(require, module, exports) {
             var convert = require("./convert.js");

             function utf8ToBytes(str) {
                 var result = [];
                 var offset = 0;
                 for (var i = 0; i < str.length; i++) {
                     var c = str.charCodeAt(i);
                     if (c < 128) {
                         result[offset++] = c
                     } else if (c < 2048) {
                         result[offset++] = c >> 6 | 192;
                         result[offset++] = c & 63 | 128
                     } else if ((c & 64512) == 55296 && i + 1 < str.length && (str.charCodeAt(i + 1) & 64512) == 56320) {
                         c = 65536 + ((c & 1023) << 10) + (str.charCodeAt(++i) & 1023);
                         result[offset++] = c >> 18 | 240;
                         result[offset++] = c >> 12 & 63 | 128;
                         result[offset++] = c >> 6 & 63 | 128;
                         result[offset++] = c & 63 | 128
                     } else {
                         result[offset++] = c >> 12 | 224;
                         result[offset++] = c >> 6 & 63 | 128;
                         result[offset++] = c & 63 | 128
                     }
                 }
                 return convert.arrayify(result)
             }

             function bytesToUtf8(bytes) {
                 bytes = convert.arrayify(bytes);
                 var result = "";
                 var i = 0;
                 while (i < bytes.length) {
                     var c = bytes[i++];
                     if (c >> 7 == 0) {
                         result += String.fromCharCode(c);
                         continue
                     }
                     if (c >> 6 == 2) {
                         continue
                     }
                     var extraLength = null;
                     if (c >> 5 == 6) {
                         extraLength = 1
                     } else if (c >> 4 == 14) {
                         extraLength = 2
                     } else if (c >> 3 == 30) {
                         extraLength = 3
                     } else if (c >> 2 == 62) {
                         extraLength = 4
                     } else if (c >> 1 == 126) {
                         extraLength = 5
                     } else {
                         continue
                     }
                     if (i + extraLength > bytes.length) {
                         for (; i < bytes.length; i++) {
                             if (bytes[i] >> 6 != 2) {
                                 break
                             }
                         }
                         if (i != bytes.length) continue;
                         return result
                     }
                     var res = c & (1 << 8 - extraLength - 1) - 1;
                     var count;
                     for (count = 0; count < extraLength; count++) {
                         var nextChar = bytes[i++];
                         if (nextChar >> 6 != 2) {
                             break
                         }
                         res = res << 6 | nextChar & 63
                     }
                     if (count != extraLength) {
                         i--;
                         continue
                     }
                     if (res <= 65535) {
                         result += String.fromCharCode(res);
                         continue
                     }
                     res -= 65536;
                     result += String.fromCharCode((res >> 10 & 1023) + 55296, (res & 1023) + 56320)
                 }
                 return result
             }
             module.exports = {
                 toUtf8Bytes: utf8ToBytes,
                 toUtf8String: bytesToUtf8
             }
         }, {
             "./convert.js": 60
         }],
         74: [function(require, module, exports) {
             var secp256k1 = new(require("elliptic").ec)("secp256k1");
             var wordlist = function() {
                 var words = require("./words.json");
                 return words.replace(/([A-Z])/g, " $1").toLowerCase().substring(1).split(" ")
             }();
             var utils = function() {
                 var convert = require("../utils/convert.js");
                 var sha2 = require("../utils/sha2");
                 var hmac = require("../utils/hmac");
                 return {
                     defineProperty: require("../utils/properties.js").defineProperty,
                     arrayify: convert.arrayify,
                     bigNumberify: require("../utils/bignumber.js").bigNumberify,
                     hexlify: convert.hexlify,
                     toUtf8Bytes: require("../utils/utf8.js").toUtf8Bytes,
                     sha256: sha2.sha256,
                     createSha512Hmac: hmac.createSha512Hmac,
                     pbkdf2: require("../utils/pbkdf2.js")
                 }
             }();
             var MasterSecret = utils.toUtf8Bytes("Bitcoin seed");
             var HardenedBit = 2147483648;

             function getUpperMask(bits) {
                 return (1 << bits) - 1 << 8 - bits
             }

             function getLowerMask(bits) {
                 return (1 << bits) - 1
             }

             function HDNode(keyPair, chainCode, index, depth) {
                 if (!(this instanceof HDNode)) {
                     throw new Error("missing new")
                 }
                 utils.defineProperty(this, "_keyPair", keyPair);
                 utils.defineProperty(this, "privateKey", utils.hexlify(keyPair.priv.toArray("be", 32)));
                 utils.defineProperty(this, "publicKey", "0x" + keyPair.getPublic(true, "hex"));
                 utils.defineProperty(this, "chainCode", utils.hexlify(chainCode));
                 utils.defineProperty(this, "index", index);
                 utils.defineProperty(this, "depth", depth)
             }
             utils.defineProperty(HDNode.prototype, "_derive", function(index) {
                 if (!this.privateKey) {
                     if (index >= HardenedBit) {
                         throw new Error("cannot derive child of neutered node")
                     }
                     throw new Error("not implemented")
                 }
                 var data = new Uint8Array(37);
                 if (index & HardenedBit) {
                     data.set(utils.arrayify(this.privateKey), 1)
                 } else {
                     data.set(this._keyPair.getPublic().encode(null, true))
                 }
                 for (var i = 24; i >= 0; i -= 8) {
                     data[33 + (i >> 3)] = index >> 24 - i & 255
                 }
                 var I = utils.arrayify(utils.createSha512Hmac(this.chainCode).update(data).digest());
                 var IL = utils.bigNumberify(I.slice(0, 32));
                 var IR = I.slice(32);
                 var ki = IL.add("0x" + this._keyPair.getPrivate("hex")).mod("0x" + secp256k1.curve.n.toString(16));
                 return new HDNode(secp256k1.keyFromPrivate(utils.arrayify(ki)), I.slice(32), index, this.depth + 1)
             });
             utils.defineProperty(HDNode.prototype, "derivePath", function(path) {
                 var components = path.split("/");
                 if (components.length === 0 || components[0] === "m" && this.depth !== 0) {
                     throw new Error("invalid path")
                 }
                 if (components[0] === "m") {
                     components.shift()
                 }
                 var result = this;
                 for (var i = 0; i < components.length; i++) {
                     var component = components[i];
                     if (component.match(/^[0-9]+'$/)) {
                         var index = parseInt(component.substring(0, component.length - 1));
                         if (index >= HardenedBit) {
                             throw new Error("invalid path index - " + component)
                         }
                         result = result._derive(HardenedBit + index)
                     } else if (component.match(/^[0-9]+$/)) {
                         var index = parseInt(component);
                         if (index >= HardenedBit) {
                             throw new Error("invalid path index - " + component)
                         }
                         result = result._derive(index)
                     } else {
                         throw new Error("invlaid path component - " + component)
                     }
                 }
                 return result
             });
             utils.defineProperty(HDNode, "fromMnemonic", function(mnemonic) {
                 mnemonicToEntropy(mnemonic);
                 return HDNode.fromSeed(mnemonicToSeed(mnemonic))
             });
             utils.defineProperty(HDNode, "fromSeed", function(seed) {
                 seed = utils.arrayify(seed);
                 if (seed.length < 16 || seed.length > 64) {
                     throw new Error("invalid seed")
                 }
                 var I = utils.arrayify(utils.createSha512Hmac(MasterSecret).update(seed).digest());
                 return new HDNode(secp256k1.keyFromPrivate(I.slice(0, 32)), I.slice(32), 0, 0, 0)
             });

             function mnemonicToSeed(mnemonic, password) {
                 if (!password) {
                     password = ""
                 } else if (password.normalize) {
                     password = password.normalize("NFKD")
                 } else {
                     for (var i = 0; i < password.length; i++) {
                         var c = password.charCodeAt(i);
                         if (c < 32 || c > 127) {
                             throw new Error("passwords with non-ASCII characters not supported in this environment")
                         }
                     }
                 }
                 mnemonic = utils.toUtf8Bytes(mnemonic, "NFKD");
                 var salt = utils.toUtf8Bytes("mnemonic" + password, "NFKD");
                 return utils.hexlify(utils.pbkdf2(mnemonic, salt, 2048, 64, utils.createSha512Hmac))
             }

             function mnemonicToEntropy(mnemonic) {
                 var words = mnemonic.toLowerCase().split(" ");
                 if (words.length % 3 !== 0) {
                     throw new Error("invalid mnemonic")
                 }
                 var entropy = utils.arrayify(new Uint8Array(Math.ceil(11 * words.length / 8)));
                 var offset = 0;
                 for (var i = 0; i < words.length; i++) {
                     var index = wordlist.indexOf(words[i]);
                     if (index === -1) {
                         throw new Error("invalid mnemonic")
                     }
                     for (var bit = 0; bit < 11; bit++) {
                         if (index & 1 << 10 - bit) {
                             entropy[offset >> 3] |= 1 << 7 - offset % 8
                         }
                         offset++
                     }
                 }
                 var entropyBits = 32 * words.length / 3;
                 var checksumBits = words.length / 3;
                 var checksumMask = getUpperMask(checksumBits);
                 var checksum = utils.arrayify(utils.sha256(entropy.slice(0, entropyBits / 8)))[0];
                 checksum &= checksumMask;
                 if (checksum !== (entropy[entropy.length - 1] & checksumMask)) {
                     throw new Error("invalid checksum")
                 }
                 return utils.hexlify(entropy.slice(0, entropyBits / 8))
             }

             function entropyToMnemonic(entropy) {
                 entropy = utils.arrayify(entropy);
                 if (entropy.length % 4 !== 0 || entropy.length < 16 || entropy.length > 32) {
                     throw new Error("invalid entropy")
                 }
                 var words = [0];
                 var remainingBits = 11;
                 for (var i = 0; i < entropy.length; i++) {
                     if (remainingBits > 8) {
                         words[words.length - 1] <<= 8;
                         words[words.length - 1] |= entropy[i];
                         remainingBits -= 8
                     } else {
                         words[words.length - 1] <<= remainingBits;
                         words[words.length - 1] |= entropy[i] >> 8 - remainingBits;
                         words.push(entropy[i] & getLowerMask(8 - remainingBits));
                         remainingBits += 3
                     }
                 }
                 var checksum = utils.arrayify(utils.sha256(entropy))[0];
                 var checksumBits = entropy.length / 4;
                 checksum &= getUpperMask(checksumBits);
                 words[words.length - 1] <<= checksumBits;
                 words[words.length - 1] |= checksum >> 8 - checksumBits;
                 for (var i = 0; i < words.length; i++) {
                     words[i] = wordlist[words[i]]
                 }
                 return words.join(" ")
             }

             function isValidMnemonic(mnemonic) {
                 try {
                     mnemonicToEntropy(mnemonic);
                     return true
                 } catch (error) {}
                 return false
             }
             module.exports = {
                 fromMnemonic: HDNode.fromMnemonic,
                 fromSeed: HDNode.fromSeed,
                 mnemonicToEntropy: mnemonicToEntropy,
                 entropyToMnemonic: entropyToMnemonic,
                 mnemonicToSeed: mnemonicToSeed,
                 isValidMnemonic: isValidMnemonic
             }
         }, {
             "../utils/bignumber.js": 57,
             "../utils/convert.js": 60,
             "../utils/hmac": 61,
             "../utils/pbkdf2.js": 66,
             "../utils/properties.js": 67,
             "../utils/sha2": 69,
             "../utils/utf8.js": 73,
             "./words.json": 79,
             elliptic: 9
         }],
         75: [function(require, module, exports) {
             "use strict";
             var Wallet = require("./wallet");
             var HDNode = require("./hdnode");
             var SigningKey = require("./signing-key");
             module.exports = {
                 HDNode: HDNode,
                 Wallet: Wallet,
                 SigningKey: SigningKey
             }
         }, {
             "./hdnode": 74,
             "./signing-key": 77,
             "./wallet": 78
         }],
         76: [function(require, module, exports) {
             "use strict";
             var aes = require("aes-js");
             var scrypt = require("scrypt-js");
             var uuid = require("uuid");
             var hmac = require("../utils/hmac");
             var pbkdf2 = require("../utils/pbkdf2");
             var utils = require("../utils");
             var SigningKey = require("./signing-key");
             var HDNode = require("./hdnode");
             var defaultPath = "m/44'/60'/0'/0/0";

             function arrayify(hexString) {
                 if (typeof hexString === "string" && hexString.substring(0, 2) !== "0x") {
                     hexString = "0x" + hexString
                 }
                 return utils.arrayify(hexString)
             }

             function zpad(value, length) {
                 value = String(value);
                 while (value.length < length) {
                     value = "0" + value
                 }
                 return value
             }

             function getPassword(password) {
                 if (typeof password === "string") {
                     return utils.toUtf8Bytes(password, "NFKC")
                 }
                 return utils.arrayify(password, "password")
             }

             function searchPath(object, path) {
                 var currentChild = object;
                 var comps = path.toLowerCase().split("/");
                 for (var i = 0; i < comps.length; i++) {
                     var matchingChild = null;
                     for (var key in currentChild) {
                         if (key.toLowerCase() === comps[i]) {
                             matchingChild = currentChild[key];
                             break
                         }
                     }
                     if (matchingChild === null) {
                         return null
                     }
                     currentChild = matchingChild
                 }
                 return currentChild
             }
             var secretStorage = {};
             utils.defineProperty(secretStorage, "isCrowdsaleWallet", function(json) {
                 try {
                     var data = JSON.parse(json)
                 } catch (error) {
                     return false
                 }
                 return data.encseed && data.ethaddr
             });
             utils.defineProperty(secretStorage, "isValidWallet", function(json) {
                 try {
                     var data = JSON.parse(json)
                 } catch (error) {
                     return false
                 }
                 if (!data.version || parseInt(data.version) !== data.version || parseInt(data.version) !== 3) {
                     return false
                 }
                 return true
             });
             utils.defineProperty(secretStorage, "decryptCrowdsale", function(json, password) {
                 var data = JSON.parse(json);
                 password = getPassword(password);
                 var ethaddr = utils.getAddress(searchPath(data, "ethaddr"));
                 var encseed = arrayify(searchPath(data, "encseed"));
                 if (!encseed || encseed.length % 16 !== 0) {
                     throw new Error("invalid encseed")
                 }
                 var key = pbkdf2(password, password, 2e3, 32, hmac.createSha256Hmac).slice(0, 16);
                 var iv = encseed.slice(0, 16);
                 var encryptedSeed = encseed.slice(16);
                 var aesCbc = new aes.ModeOfOperation.cbc(key, iv);
                 var seed = utils.arrayify(aesCbc.decrypt(encryptedSeed));
                 seed = aes.padding.pkcs7.strip(seed);
                 var seedHex = "";
                 for (var i = 0; i < seed.length; i++) {
                     seedHex += String.fromCharCode(seed[i])
                 }
                 var seedHexBytes = utils.toUtf8Bytes(seedHex);
                 var signingKey = new SigningKey(utils.keccak256(seedHexBytes));
                 if (signingKey.address !== ethaddr) {
                     throw new Error("corrupt crowdsale wallet")
                 }
                 return signingKey
             });
             utils.defineProperty(secretStorage, "decrypt", function(json, password, progressCallback) {
                 var data = JSON.parse(json);
                 password = getPassword(password);
                 var decrypt = function(key, ciphertext) {
                     var cipher = searchPath(data, "crypto/cipher");
                     if (cipher === "aes-128-ctr") {
                         var iv = arrayify(searchPath(data, "crypto/cipherparams/iv"), "crypto/cipherparams/iv");
                         var counter = new aes.Counter(iv);
                         var aesCtr = new aes.ModeOfOperation.ctr(key, counter);
                         return arrayify(aesCtr.decrypt(ciphertext))
                     }
                     return null
                 };
                 var computeMAC = function(derivedHalf, ciphertext) {
                     return utils.keccak256(utils.concat([derivedHalf, ciphertext]))
                 };
                 var getSigningKey = function(key, reject) {
                     var ciphertext = arrayify(searchPath(data, "crypto/ciphertext"));
                     var computedMAC = utils.hexlify(computeMAC(key.slice(16, 32), ciphertext)).substring(2);
                     if (computedMAC !== searchPath(data, "crypto/mac").toLowerCase()) {
                         reject(new Error("invalid password"));
                         return null
                     }
                     var privateKey = decrypt(key.slice(0, 16), ciphertext);
                     var mnemonicKey = key.slice(32, 64);
                     if (!privateKey) {
                         reject(new Error("unsupported cipher"));
                         return null
                     }
                     var signingKey = new SigningKey(privateKey);
                     if (signingKey.address !== utils.getAddress(data.address)) {
                         reject(new Error("address mismatch"));
                         return null
                     }
                     if (searchPath(data, "x-ethers/version") === "0.1") {
                         var mnemonicCiphertext = arrayify(searchPath(data, "x-ethers/mnemonicCiphertext"), "x-ethers/mnemonicCiphertext");
                         var mnemonicIv = arrayify(searchPath(data, "x-ethers/mnemonicCounter"), "x-ethers/mnemonicCounter");
                         var mnemonicCounter = new aes.Counter(mnemonicIv);
                         var mnemonicAesCtr = new aes.ModeOfOperation.ctr(mnemonicKey, mnemonicCounter);
                         var path = searchPath(data, "x-ethers/path") || defaultPath;
                         var entropy = arrayify(mnemonicAesCtr.decrypt(mnemonicCiphertext));
                         var mnemonic = HDNode.entropyToMnemonic(entropy);
                         if (HDNode.fromMnemonic(mnemonic).derivePath(path).privateKey != utils.hexlify(privateKey)) {
                             reject(new Error("mnemonic mismatch"));
                             return null
                         }
                         signingKey.mnemonic = mnemonic;
                         signingKey.path = path
                     }
                     return signingKey
                 };
                 return new Promise(function(resolve, reject) {
                     var kdf = searchPath(data, "crypto/kdf");
                     if (kdf && typeof kdf === "string") {
                         if (kdf.toLowerCase() === "scrypt") {
                             var salt = arrayify(searchPath(data, "crypto/kdfparams/salt"), "crypto/kdfparams/salt");
                             var N = parseInt(searchPath(data, "crypto/kdfparams/n"));
                             var r = parseInt(searchPath(data, "crypto/kdfparams/r"));
                             var p = parseInt(searchPath(data, "crypto/kdfparams/p"));
                             if (!N || !r || !p) {
                                 reject(new Error("unsupported key-derivation function parameters"));
                                 return
                             }
                             if ((N & N - 1) !== 0) {
                                 reject(new Error("unsupported key-derivation function parameter value for N"));
                                 return
                             }
                             var dkLen = parseInt(searchPath(data, "crypto/kdfparams/dklen"));
                             if (dkLen !== 32) {
                                 reject(new Error("unsupported key-derivation derived-key length"));
                                 return
                             }
                             scrypt(password, salt, N, r, p, 64, function(error, progress, key) {
                                 if (error) {
                                     error.progress = progress;
                                     reject(error)
                                 } else if (key) {
                                     key = arrayify(key);
                                     var signingKey = getSigningKey(key, reject);
                                     if (!signingKey) {
                                         return
                                     }
                                     if (progressCallback) {
                                         progressCallback(1)
                                     }
                                     resolve(signingKey)
                                 } else if (progressCallback) {
                                     return progressCallback(progress)
                                 }
                             })
                         } else if (kdf.toLowerCase() === "pbkdf2") {
                             var salt = arrayify(searchPath(data, "crypto/kdfparams/salt"), "crypto/kdfparams/salt");
                             var prfFunc = null;
                             var prf = searchPath(data, "crypto/kdfparams/prf");
                             if (prf === "hmac-sha256") {
                                 prfFunc = hmac.createSha256Hmac
                             } else if (prf === "hmac-sha512") {
                                 prfFunc = hmac.createSha512Hmac
                             } else {
                                 reject(new Error("unsupported prf"));
                                 return
                             }
                             var c = parseInt(searchPath(data, "crypto/kdfparams/c"));
                             var dkLen = parseInt(searchPath(data, "crypto/kdfparams/dklen"));
                             if (dkLen !== 32) {
                                 reject(new Error("unsupported key-derivation derived-key length"));
                                 return
                             }
                             var key = pbkdf2(password, salt, c, dkLen, prfFunc);
                             var signingKey = getSigningKey(key, reject);
                             if (!signingKey) {
                                 return
                             }
                             resolve(signingKey)
                         } else {
                             reject(new Error("unsupported key-derivation function"))
                         }
                     } else {
                         reject(new Error("unsupported key-derivation function"))
                     }
                 })
             });
             utils.defineProperty(secretStorage, "encrypt", function(privateKey, password, options, progressCallback) {
                 if (typeof options === "function" && !progressCallback) {
                     progressCallback = options;
                     options = {}
                 }
                 if (!options) {
                     options = {}
                 }
                 if (privateKey instanceof SigningKey) {
                     privateKey = privateKey.privateKey
                 }
                 privateKey = arrayify(privateKey, "private key");
                 if (privateKey.length !== 32) {
                     throw new Error("invalid private key")
                 }
                 password = getPassword(password);
                 var entropy = options.entropy;
                 if (options.mnemonic) {
                     if (entropy) {
                         if (HDNode.entropyToMnemonic(entropy) !== options.mnemonic) {
                             throw new Error("entropy and mnemonic mismatch")
                         }
                     } else {
                         entropy = HDNode.mnemonicToEntropy(options.mnemonic)
                     }
                 }
                 if (entropy) {
                     entropy = arrayify(entropy, "entropy")
                 }
                 var path = options.path;
                 if (entropy && !path) {
                     path = defaultPath
                 }
                 var client = options.client;
                 if (!client) {
                     client = "ethers.js"
                 }
                 var salt = options.salt;
                 if (salt) {
                     salt = arrayify(salt, "salt")
                 } else {
                     salt = utils.randomBytes(32)
                 }
                 var iv = null;
                 if (options.iv) {
                     iv = arrayify(options.iv, "iv");
                     if (iv.length !== 16) {
                         throw new Error("invalid iv")
                     }
                 } else {
                     iv = utils.randomBytes(16)
                 }
                 var uuidRandom = options.uuid;
                 if (uuidRandom) {
                     uuidRandom = arrayify(uuidRandom, "uuid");
                     if (uuidRandom.length !== 16) {
                         throw new Error("invalid uuid")
                     }
                 } else {
                     uuidRandom = utils.randomBytes(16)
                 }
                 var N = 1 << 17,
                     r = 8,
                     p = 1;
                 if (options.scrypt) {
                     if (options.scrypt.N) {
                         N = options.scrypt.N
                     }
                     if (options.scrypt.r) {
                         r = options.scrypt.r
                     }
                     if (options.scrypt.p) {
                         p = options.scrypt.p
                     }
                 }
                 return new Promise(function(resolve, reject) {
                     scrypt(password, salt, N, r, p, 64, function(error, progress, key) {
                         if (error) {
                             error.progress = progress;
                             reject(error)
                         } else if (key) {
                             key = arrayify(key);
                             var derivedKey = key.slice(0, 16);
                             var macPrefix = key.slice(16, 32);
                             var mnemonicKey = key.slice(32, 64);
                             var address = new SigningKey(privateKey).address;
                             var counter = new aes.Counter(iv);
                             var aesCtr = new aes.ModeOfOperation.ctr(derivedKey, counter);
                             var ciphertext = utils.arrayify(aesCtr.encrypt(privateKey));
                             var mac = utils.keccak256(utils.concat([macPrefix, ciphertext]));
                             var data = {
                                 address: address.substring(2).toLowerCase(),
                                 id: uuid.v4({
                                     random: uuidRandom
                                 }),
                                 version: 3,
                                 Crypto: {
                                     cipher: "aes-128-ctr",
                                     cipherparams: {
                                         iv: utils.hexlify(iv).substring(2)
                                     },
                                     ciphertext: utils.hexlify(ciphertext).substring(2),
                                     kdf: "scrypt",
                                     kdfparams: {
                                         salt: utils.hexlify(salt).substring(2),
                                         n: N,
                                         dklen: 32,
                                         p: p,
                                         r: r
                                     },
                                     mac: mac.substring(2)
                                 }
                             };
                             if (entropy) {
                                 var mnemonicIv = utils.randomBytes(16);
                                 var mnemonicCounter = new aes.Counter(mnemonicIv);
                                 var mnemonicAesCtr = new aes.ModeOfOperation.ctr(mnemonicKey, mnemonicCounter);
                                 var mnemonicCiphertext = utils.arrayify(mnemonicAesCtr.encrypt(entropy));
                                 var now = new Date;
                                 var timestamp = now.getUTCFullYear() + "-" + zpad(now.getUTCMonth() + 1, 2) + "-" + zpad(now.getUTCDate(), 2) + "T" + zpad(now.getUTCHours(), 2) + "-" + zpad(now.getUTCMinutes(), 2) + "-" + zpad(now.getUTCSeconds(), 2) + ".0Z";
                                 data["x-ethers"] = {
                                     client: client,
                                     gethFilename: "UTC--" + timestamp + "--" + data.address,
                                     mnemonicCounter: utils.hexlify(mnemonicIv).substring(2),
                                     mnemonicCiphertext: utils.hexlify(mnemonicCiphertext).substring(2),
                                     version: "0.1"
                                 }
                             }
                             if (progressCallback) {
                                 progressCallback(1)
                             }
                             resolve(JSON.stringify(data))
                         } else if (progressCallback) {
                             return progressCallback(progress)
                         }
                     })
                 })
             });
             module.exports = secretStorage
         }, {
             "../utils": 63,
             "../utils/hmac": 61,
             "../utils/pbkdf2": 66,
             "./hdnode": 74,
             "./signing-key": 77,
             "aes-js": 5,
             "scrypt-js": 41,
             uuid: 44
         }],
         77: [function(require, module, exports) {
             "use strict";
             var secp256k1 = new(require("elliptic").ec)("secp256k1");
             var utils = function() {
                 var convert = require("../utils/convert");
                 return {
                     defineProperty: require("../utils/properties").defineProperty,
                     arrayify: convert.arrayify,
                     hexlify: convert.hexlify,
                     getAddress: require("../utils/address").getAddress,
                     keccak256: require("../utils/keccak256")
                 }
             }();

             function SigningKey(privateKey) {
                 if (!(this instanceof SigningKey)) {
                     throw new Error("missing new")
                 }
                 privateKey = utils.arrayify(privateKey);
                 if (privateKey.length !== 32) {
                     throw new Error("invalid private key")
                 }
                 utils.defineProperty(this, "privateKey", utils.hexlify(privateKey));
                 var keyPair = secp256k1.keyFromPrivate(privateKey);
                 utils.defineProperty(this, "publicKey", "0x" + keyPair.getPublic(true, "hex"));
                 var address = SigningKey.publicKeyToAddress("0x" + keyPair.getPublic(false, "hex"));
                 utils.defineProperty(this, "address", address);
                 utils.defineProperty(this, "signDigest", function(digest) {
                     var signature = keyPair.sign(utils.arrayify(digest), {
                         canonical: true
                     });
                     return {
                         recoveryParam: signature.recoveryParam,
                         r: "0x" + signature.r.toString(16),
                         s: "0x" + signature.s.toString(16)
                     }
                 })
             }
             utils.defineProperty(SigningKey, "recover", function(digest, r, s, recoveryParam) {
                 var signature = {
                     r: utils.arrayify(r),
                     s: utils.arrayify(s)
                 };
                 var publicKey = secp256k1.recoverPubKey(utils.arrayify(digest), signature, recoveryParam);
                 return SigningKey.publicKeyToAddress("0x" + publicKey.encode("hex", false))
             });
             utils.defineProperty(SigningKey, "getPublicKey", function(value, compressed) {
                 value = utils.arrayify(value);
                 compressed = !!compressed;
                 if (value.length === 32) {
                     var keyPair = secp256k1.keyFromPrivate(value);
                     return "0x" + keyPair.getPublic(compressed, "hex")
                 } else if (value.length === 33) {
                     var keyPair = secp256k1.keyFromPublic(value);
                     return "0x" + keyPair.getPublic(compressed, "hex")
                 } else if (value.length === 65) {
                     var keyPair = secp256k1.keyFromPublic(value);
                     return "0x" + keyPair.getPublic(compressed, "hex")
                 }
                 throw new Error("invalid value")
             });
             utils.defineProperty(SigningKey, "publicKeyToAddress", function(publicKey) {
                 publicKey = "0x" + SigningKey.getPublicKey(publicKey, false).slice(4);
                 return utils.getAddress("0x" + utils.keccak256(publicKey).substring(26))
             });
             module.exports = SigningKey
         }, {
             "../utils/address": 56,
             "../utils/convert": 60,
             "../utils/keccak256": 64,
             "../utils/properties": 67,
             elliptic: 9
         }],
         78: [function(require, module, exports) {
             "use strict";
             var scrypt = require("scrypt-js");
             var utils = function() {
                 var convert = require("../utils/convert");
                 return {
                     defineProperty: require("../utils/properties").defineProperty,
                     arrayify: convert.arrayify,
                     concat: convert.concat,
                     hexlify: convert.hexlify,
                     stripZeros: convert.stripZeros,
                     hexZeroPad: convert.hexZeroPad,
                     bigNumberify: require("../utils/bignumber").bigNumberify,
                     toUtf8Bytes: require("../utils/utf8").toUtf8Bytes,
                     getAddress: require("../utils/address").getAddress,
                     keccak256: require("../utils/keccak256"),
                     randomBytes: require("../utils").randomBytes,
                     RLP: require("../utils/rlp")
                 }
             }();
             var HDNode = require("./hdnode");
             var secretStorage = require("./secret-storage");
             var SigningKey = require("./signing-key");
             require("setimmediate");
             var defaultPath = "m/44'/60'/0'/0/0";
             var transactionFields = [{
                 name: "nonce",
                 maxLength: 32
             }, {
                 name: "gasPrice",
                 maxLength: 32
             }, {
                 name: "gasLimit",
                 maxLength: 32
             }, {
                 name: "to",
                 length: 20
             }, {
                 name: "value",
                 maxLength: 32
             }, {
                 name: "data"
             }];

             function Wallet(privateKey, provider) {
                 if (!(this instanceof Wallet)) {
                     throw new Error("missing new")
                 }
                 var signingKey = privateKey;
                 if (!(privateKey instanceof SigningKey)) {
                     signingKey = new SigningKey(privateKey)
                 }
                 utils.defineProperty(this, "privateKey", signingKey.privateKey);
                 Object.defineProperty(this, "provider", {
                     enumerable: true,
                     get: function() {
                         return provider
                     },
                     set: function(value) {
                         provider = value
                     }
                 });
                 if (provider) {
                     this.provider = provider
                 }
                 var defaultGasLimit = 15e5;
                 Object.defineProperty(this, "defaultGasLimit", {
                     enumerable: true,
                     get: function() {
                         return defaultGasLimit
                     },
                     set: function(value) {
                         if (typeof value !== "number") {
                             throw new Error("invalid defaultGasLimit")
                         }
                         defaultGasLimit = value
                     }
                 });
                 utils.defineProperty(this, "address", signingKey.address);
                 utils.defineProperty(this, "sign", function(transaction) {
                     var chainId = transaction.chainId;
                     if (!chainId && this.provider) {
                         chainId = this.provider.chainId
                     }
                     if (!chainId) {
                         chainId = 0
                     }
                     var raw = [];
                     transactionFields.forEach(function(fieldInfo) {
                         var value = transaction[fieldInfo.name] || [];
                         value = utils.arrayify(utils.hexlify(value), fieldInfo.name);
                         if (fieldInfo.length && value.length !== fieldInfo.length && value.length > 0) {
                             var error = new Error("invalid " + fieldInfo.name);
                             error.reason = "wrong length";
                             error.value = value;
                             throw error
                         }
                         if (fieldInfo.maxLength) {
                             value = utils.stripZeros(value);
                             if (value.length > fieldInfo.maxLength) {
                                 var error = new Error("invalid " + fieldInfo.name);
                                 error.reason = "too long";
                                 error.value = value;
                                 throw error
                             }
                         }
                         raw.push(utils.hexlify(value))
                     });
                     if (chainId) {
                         raw.push(utils.hexlify(chainId));
                         raw.push("0x");
                         raw.push("0x")
                     }
                     var digest = utils.keccak256(utils.RLP.encode(raw));
                     var signature = signingKey.signDigest(digest);
                     var v = 27 + signature.recoveryParam;
                     if (chainId) {
                         raw.pop();
                         raw.pop();
                         raw.pop();
                         v += chainId * 2 + 8
                     }
                     raw.push(utils.hexlify(v));
                     raw.push(signature.r);
                     raw.push(signature.s);
                     return utils.RLP.encode(raw)
                 })
             }
             utils.defineProperty(Wallet, "parseTransaction", function(rawTransaction) {
                 rawTransaction = utils.hexlify(rawTransaction, "rawTransaction");
                 var signedTransaction = utils.RLP.decode(rawTransaction);
                 if (signedTransaction.length !== 9) {
                     throw new Error("invalid transaction")
                 }
                 var raw = [];
                 var transaction = {};
                 transactionFields.forEach(function(fieldInfo, index) {
                     transaction[fieldInfo.name] = signedTransaction[index];
                     raw.push(signedTransaction[index])
                 });
                 if (transaction.to) {
                     if (transaction.to == "0x") {
                         delete transaction.to
                     } else {
                         transaction.to = utils.getAddress(transaction.to)
                     }
                 }["gasPrice", "gasLimit", "nonce", "value"].forEach(function(name) {
                     if (!transaction[name]) {
                         return
                     }
                     if (transaction[name].length === 0) {
                         transaction[name] = utils.bigNumberify(0)
                     } else {
                         transaction[name] = utils.bigNumberify(transaction[name])
                     }
                 });
                 if (transaction.nonce) {
                     transaction.nonce = transaction.nonce.toNumber()
                 } else {
                     transaction.nonce = 0
                 }
                 var v = utils.arrayify(signedTransaction[6]);
                 var r = utils.arrayify(signedTransaction[7]);
                 var s = utils.arrayify(signedTransaction[8]);
                 if (v.length === 1 && r.length >= 1 && r.length <= 32 && s.length >= 1 && s.length <= 32) {
                     transaction.v = v[0];
                     transaction.r = signedTransaction[7];
                     transaction.s = signedTransaction[8];
                     var chainId = (transaction.v - 35) / 2;
                     if (chainId < 0) {
                         chainId = 0
                     }
                     chainId = parseInt(chainId);
                     transaction.chainId = chainId;
                     var recoveryParam = transaction.v - 27;
                     if (chainId) {
                         raw.push(utils.hexlify(chainId));
                         raw.push("0x");
                         raw.push("0x");
                         recoveryParam -= chainId * 2 + 8
                     }
                     var digest = utils.keccak256(utils.RLP.encode(raw));
                     try {
                         transaction.from = SigningKey.recover(digest, r, s, recoveryParam)
                     } catch (error) {
                         console.log(error)
                     }
                 }
                 return transaction
             });
             utils.defineProperty(Wallet.prototype, "getAddress", function() {
                 return this.address
             });
             utils.defineProperty(Wallet.prototype, "getBalance", function(blockTag) {
                 if (!this.provider) {
                     throw new Error("missing provider")
                 }
                 return this.provider.getBalance(this.address, blockTag)
             });
             utils.defineProperty(Wallet.prototype, "getTransactionCount", function(blockTag) {
                 if (!this.provider) {
                     throw new Error("missing provider")
                 }
                 return this.provider.getTransactionCount(this.address, blockTag)
             });
             utils.defineProperty(Wallet.prototype, "estimateGas", function(transaction) {
                 if (!this.provider) {
                     throw new Error("missing provider")
                 }
                 var calculate = {};
                 ["from", "to", "data", "value"].forEach(function(key) {
                     if (transaction[key] == null) {
                         return
                     }
                     calculate[key] = transaction[key]
                 });
                 if (transaction.from == null) {
                     calculate.from = this.address
                 }
                 return this.provider.estimateGas(calculate)
             });
             utils.defineProperty(Wallet.prototype, "sendTransaction", function(transaction) {
                 if (!this.provider) {
                     throw new Error("missing provider")
                 }
                 var gasLimit = transaction.gasLimit;
                 if (gasLimit == null) {
                     gasLimit = this.defaultGasLimit
                 }
                 var self = this;
                 var gasPricePromise = null;
                 if (transaction.gasPrice) {
                     gasPricePromise = Promise.resolve(transaction.gasPrice)
                 } else {
                     gasPricePromise = this.provider.getGasPrice()
                 }
                 var noncePromise = null;
                 if (transaction.nonce) {
                     noncePromise = Promise.resolve(transaction.nonce)
                 } else {
                     noncePromise = this.provider.getTransactionCount(self.address, "pending")
                 }
                 var chainId = this.provider.chainId;
                 var toPromise = null;
                 if (transaction.to) {
                     toPromise = this.provider.resolveName(transaction.to)
                 } else {
                     toPromise = Promise.resolve(undefined)
                 }
                 var data = utils.hexlify(transaction.data || "0x");
                 var value = utils.hexlify(transaction.value || 0);
                 return Promise.all([gasPricePromise, noncePromise, toPromise]).then(function(results) {
                     var signedTransaction = self.sign({
                         to: results[2],
                         data: data,
                         gasLimit: gasLimit,
                         gasPrice: results[0],
                         nonce: results[1],
                         value: value,
                         chainId: chainId
                     });
                     return self.provider.sendTransaction(signedTransaction).then(function(hash) {
                         var transaction = Wallet.parseTransaction(signedTransaction);
                         transaction.hash = hash;
                         transaction.wait = function() {
                             return self.provider.waitForTransaction(hash)
                         };
                         return transaction
                     })
                 })
             });
             utils.defineProperty(Wallet.prototype, "send", function(addressOrName, amountWei, options) {
                 if (!options) {
                     options = {}
                 }
                 return this.sendTransaction({
                     to: addressOrName,
                     gasLimit: options.gasLimit,
                     gasPrice: options.gasPrice,
                     nonce: options.nonce,
                     value: amountWei
                 })
             });

             function getHash(message) {
                 var payload = utils.concat([utils.toUtf8Bytes("Ethereum Signed Message:\n"), utils.toUtf8Bytes(String(message.length)), typeof message === "string" ? utils.toUtf8Bytes(message) : message]);
                 return utils.keccak256(payload)
             }
             utils.defineProperty(Wallet.prototype, "signMessage", function(message) {
                 var signingKey = new SigningKey(this.privateKey);
                 var sig = signingKey.signDigest(getHash(message));
                 return utils.hexZeroPad(sig.r, 32) + utils.hexZeroPad(sig.s, 32).substring(2) + (sig.recoveryParam ? "1c" : "1b")
             });
             utils.defineProperty(Wallet, "verifyMessage", function(message, signature) {
                 signature = utils.hexlify(signature);
                 if (signature.length != 132) {
                     throw new Error("invalid signature")
                 }
                 var digest = getHash(message);
                 var recoveryParam = parseInt(signature.substring(130), 16);
                 if (recoveryParam >= 27) {
                     recoveryParam -= 27
                 }
                 if (recoveryParam < 0) {
                     throw new Error("invalid signature")
                 }
                 return SigningKey.recover(digest, signature.substring(0, 66), "0x" + signature.substring(66, 130), recoveryParam)
             });
             utils.defineProperty(Wallet.prototype, "encrypt", function(password, options, progressCallback) {
                 if (typeof options === "function" && !progressCallback) {
                     progressCallback = options;
                     options = {}
                 }
                 if (progressCallback && typeof progressCallback !== "function") {
                     throw new Error("invalid callback")
                 }
                 if (!options) {
                     options = {}
                 }
                 if (this.mnemonic) {
                     var safeOptions = {};
                     for (var key in options) {
                         safeOptions[key] = options[key]
                     }
                     options = safeOptions;
                     options.mnemonic = this.mnemonic;
                     options.path = this.path
                 }
                 return secretStorage.encrypt(this.privateKey, password, options, progressCallback)
             });
             utils.defineProperty(Wallet, "isEncryptedWallet", function(json) {
                 return secretStorage.isValidWallet(json) || secretStorage.isCrowdsaleWallet(json)
             });
             utils.defineProperty(Wallet, "createRandom", function(options) {
                 var entropy = utils.randomBytes(16);
                 if (!options) {
                     options = {}
                 }
                 if (options.extraEntropy) {
                     entropy = utils.keccak256(utils.concat([entropy, options.extraEntropy])).substring(0, 34)
                 }
                 var mnemonic = HDNode.entropyToMnemonic(entropy);
                 return Wallet.fromMnemonic(mnemonic, options.path)
             });
             utils.defineProperty(Wallet, "fromEncryptedWallet", function(json, password, progressCallback) {
                 if (progressCallback && typeof progressCallback !== "function") {
                     throw new Error("invalid callback")
                 }
                 return new Promise(function(resolve, reject) {
                     if (secretStorage.isCrowdsaleWallet(json)) {
                         try {
                             var privateKey = secretStorage.decryptCrowdsale(json, password);
                             resolve(new Wallet(privateKey))
                         } catch (error) {
                             reject(error)
                         }
                     } else if (secretStorage.isValidWallet(json)) {
                         secretStorage.decrypt(json, password, progressCallback).then(function(signingKey) {
                             var wallet = new Wallet(signingKey);
                             if (signingKey.mnemonic && signingKey.path) {
                                 utils.defineProperty(wallet, "mnemonic", signingKey.mnemonic);
                                 utils.defineProperty(wallet, "path", signingKey.path)
                             }
                             resolve(wallet)
                         }, function(error) {
                             reject(error)
                         })
                     } else {
                         reject("invalid wallet JSON")
                     }
                 })
             });
             utils.defineProperty(Wallet, "fromMnemonic", function(mnemonic, path) {
                 if (!path) {
                     path = defaultPath
                 }
                 var hdnode = HDNode.fromMnemonic(mnemonic).derivePath(path);
                 var wallet = new Wallet(hdnode.privateKey);
                 utils.defineProperty(wallet, "mnemonic", mnemonic);
                 utils.defineProperty(wallet, "path", path);
                 return wallet
             });
             utils.defineProperty(Wallet, "fromBrainWallet", function(username, password, progressCallback) {
                 if (progressCallback && typeof progressCallback !== "function") {
                     throw new Error("invalid callback")
                 }
                 if (typeof username === "string") {
                     username = utils.toUtf8Bytes(username, "NFKC")
                 } else {
                     username = utils.arrayify(username, "password")
                 }
                 if (typeof password === "string") {
                     password = utils.toUtf8Bytes(password, "NFKC")
                 } else {
                     password = utils.arrayify(password, "password")
                 }
                 return new Promise(function(resolve, reject) {
                     scrypt(password, username, 1 << 18, 8, 1, 32, function(error, progress, key) {
                         if (error) {
                             reject(error)
                         } else if (key) {
                             resolve(new Wallet(utils.hexlify(key)))
                         } else if (progressCallback) {
                             return progressCallback(progress)
                         }
                     })
                 })
             });
             module.exports = Wallet
         }, {
             "../utils": 63,
             "../utils/address": 56,
             "../utils/bignumber": 57,
             "../utils/convert": 60,
             "../utils/keccak256": 64,
             "../utils/properties": 67,
             "../utils/rlp": 68,
             "../utils/utf8": 73,
             "./hdnode": 74,
             "./secret-storage": 76,
             "./signing-key": 77,
             "scrypt-js": 41,
             setimmediate: 42
         }],
         79: [function(require, module, exports) {
             module.exports = "AbandonAbilityAbleAboutAboveAbsentAbsorbAbstractAbsurdAbuseAccessAccidentAccountAccuseAchieveAcidAcousticAcquireAcrossActActionActorActressActualAdaptAddAddictAddressAdjustAdmitAdultAdvanceAdviceAerobicAffairAffordAfraidAgainAgeAgentAgreeAheadAimAirAirportAisleAlarmAlbumAlcoholAlertAlienAllAlleyAllowAlmostAloneAlphaAlreadyAlsoAlterAlwaysAmateurAmazingAmongAmountAmusedAnalystAnchorAncientAngerAngleAngryAnimalAnkleAnnounceAnnualAnotherAnswerAntennaAntiqueAnxietyAnyApartApologyAppearAppleApproveAprilArchArcticAreaArenaArgueArmArmedArmorArmyAroundArrangeArrestArriveArrowArtArtefactArtistArtworkAskAspectAssaultAssetAssistAssumeAsthmaAthleteAtomAttackAttendAttitudeAttractAuctionAuditAugustAuntAuthorAutoAutumnAverageAvocadoAvoidAwakeAwareAwayAwesomeAwfulAwkwardAxisBabyBachelorBaconBadgeBagBalanceBalconyBallBambooBananaBannerBarBarelyBargainBarrelBaseBasicBasketBattleBeachBeanBeautyBecauseBecomeBeefBeforeBeginBehaveBehindBelieveBelowBeltBenchBenefitBestBetrayBetterBetweenBeyondBicycleBidBikeBindBiologyBirdBirthBitterBlackBladeBlameBlanketBlastBleakBlessBlindBloodBlossomBlouseBlueBlurBlushBoardBoatBodyBoilBombBoneBonusBookBoostBorderBoringBorrowBossBottomBounceBoxBoyBracketBrainBrandBrassBraveBreadBreezeBrickBridgeBriefBrightBringBriskBroccoliBrokenBronzeBroomBrotherBrownBrushBubbleBuddyBudgetBuffaloBuildBulbBulkBulletBundleBunkerBurdenBurgerBurstBusBusinessBusyButterBuyerBuzzCabbageCabinCableCactusCageCakeCallCalmCameraCampCanCanalCancelCandyCannonCanoeCanvasCanyonCapableCapitalCaptainCarCarbonCardCargoCarpetCarryCartCaseCashCasinoCastleCasualCatCatalogCatchCategoryCattleCaughtCauseCautionCaveCeilingCeleryCementCensusCenturyCerealCertainChairChalkChampionChangeChaosChapterChargeChaseChatCheapCheckCheeseChefCherryChestChickenChiefChildChimneyChoiceChooseChronicChuckleChunkChurnCigarCinnamonCircleCitizenCityCivilClaimClapClarifyClawClayCleanClerkCleverClickClientCliffClimbClinicClipClockClogCloseClothCloudClownClubClumpClusterClutchCoachCoastCoconutCodeCoffeeCoilCoinCollectColorColumnCombineComeComfortComicCommonCompanyConcertConductConfirmCongressConnectConsiderControlConvinceCookCoolCopperCopyCoralCoreCornCorrectCostCottonCouchCountryCoupleCourseCousinCoverCoyoteCrackCradleCraftCramCraneCrashCraterCrawlCrazyCreamCreditCreekCrewCricketCrimeCrispCriticCropCrossCrouchCrowdCrucialCruelCruiseCrumbleCrunchCrushCryCrystalCubeCultureCupCupboardCuriousCurrentCurtainCurveCushionCustomCuteCycleDadDamageDampDanceDangerDaringDashDaughterDawnDayDealDebateDebrisDecadeDecemberDecideDeclineDecorateDecreaseDeerDefenseDefineDefyDegreeDelayDeliverDemandDemiseDenialDentistDenyDepartDependDepositDepthDeputyDeriveDescribeDesertDesignDeskDespairDestroyDetailDetectDevelopDeviceDevoteDiagramDialDiamondDiaryDiceDieselDietDifferDigitalDignityDilemmaDinnerDinosaurDirectDirtDisagreeDiscoverDiseaseDishDismissDisorderDisplayDistanceDivertDivideDivorceDizzyDoctorDocumentDogDollDolphinDomainDonateDonkeyDonorDoorDoseDoubleDoveDraftDragonDramaDrasticDrawDreamDressDriftDrillDrinkDripDriveDropDrumDryDuckDumbDuneDuringDustDutchDutyDwarfDynamicEagerEagleEarlyEarnEarthEasilyEastEasyEchoEcologyEconomyEdgeEditEducateEffortEggEightEitherElbowElderElectricElegantElementElephantElevatorEliteElseEmbarkEmbodyEmbraceEmergeEmotionEmployEmpowerEmptyEnableEnactEndEndlessEndorseEnemyEnergyEnforceEngageEngineEnhanceEnjoyEnlistEnoughEnrichEnrollEnsureEnterEntireEntryEnvelopeEpisodeEqualEquipEraEraseErodeErosionErrorEruptEscapeEssayEssenceEstateEternalEthicsEvidenceEvilEvokeEvolveExactExampleExcessExchangeExciteExcludeExcuseExecuteExerciseExhaustExhibitExileExistExitExoticExpandExpectExpireExplainExposeExpressExtendExtraEyeEyebrowFabricFaceFacultyFadeFaintFaithFallFalseFameFamilyFamousFanFancyFantasyFarmFashionFatFatalFatherFatigueFaultFavoriteFeatureFebruaryFederalFeeFeedFeelFemaleFenceFestivalFetchFeverFewFiberFictionFieldFigureFileFilmFilterFinalFindFineFingerFinishFireFirmFirstFiscalFishFitFitnessFixFlagFlameFlashFlatFlavorFleeFlightFlipFloatFlockFloorFlowerFluidFlushFlyFoamFocusFogFoilFoldFollowFoodFootForceForestForgetForkFortuneForumForwardFossilFosterFoundFoxFragileFrameFrequentFreshFriendFringeFrogFrontFrostFrownFrozenFruitFuelFunFunnyFurnaceFuryFutureGadgetGainGalaxyGalleryGameGapGarageGarbageGardenGarlicGarmentGasGaspGateGatherGaugeGazeGeneralGeniusGenreGentleGenuineGestureGhostGiantGiftGiggleGingerGiraffeGirlGiveGladGlanceGlareGlassGlideGlimpseGlobeGloomGloryGloveGlowGlueGoatGoddessGoldGoodGooseGorillaGospelGossipGovernGownGrabGraceGrainGrantGrapeGrassGravityGreatGreenGridGriefGritGroceryGroupGrowGruntGuardGuessGuideGuiltGuitarGunGymHabitHairHalfHammerHamsterHandHappyHarborHardHarshHarvestHatHaveHawkHazardHeadHealthHeartHeavyHedgehogHeightHelloHelmetHelpHenHeroHiddenHighHillHintHipHireHistoryHobbyHockeyHoldHoleHolidayHollowHomeHoneyHoodHopeHornHorrorHorseHospitalHostHotelHourHoverHubHugeHumanHumbleHumorHundredHungryHuntHurdleHurryHurtHusbandHybridIceIconIdeaIdentifyIdleIgnoreIllIllegalIllnessImageImitateImmenseImmuneImpactImposeImproveImpulseInchIncludeIncomeIncreaseIndexIndicateIndoorIndustryInfantInflictInformInhaleInheritInitialInjectInjuryInmateInnerInnocentInputInquiryInsaneInsectInsideInspireInstallIntactInterestIntoInvestInviteInvolveIronIslandIsolateIssueItemIvoryJacketJaguarJarJazzJealousJeansJellyJewelJobJoinJokeJourneyJoyJudgeJuiceJumpJungleJuniorJunkJustKangarooKeenKeepKetchupKeyKickKidKidneyKindKingdomKissKitKitchenKiteKittenKiwiKneeKnifeKnockKnowLabLabelLaborLadderLadyLakeLampLanguageLaptopLargeLaterLatinLaughLaundryLavaLawLawnLawsuitLayerLazyLeaderLeafLearnLeaveLectureLeftLegLegalLegendLeisureLemonLendLengthLensLeopardLessonLetterLevelLiarLibertyLibraryLicenseLifeLiftLightLikeLimbLimitLinkLionLiquidListLittleLiveLizardLoadLoanLobsterLocalLockLogicLonelyLongLoopLotteryLoudLoungeLoveLoyalLuckyLuggageLumberLunarLunchLuxuryLyricsMachineMadMagicMagnetMaidMailMainMajorMakeMammalManManageMandateMangoMansionManualMapleMarbleMarchMarginMarineMarketMarriageMaskMassMasterMatchMaterialMathMatrixMatterMaximumMazeMeadowMeanMeasureMeatMechanicMedalMediaMelodyMeltMemberMemoryMentionMenuMercyMergeMeritMerryMeshMessageMetalMethodMiddleMidnightMilkMillionMimicMindMinimumMinorMinuteMiracleMirrorMiseryMissMistakeMixMixedMixtureMobileModelModifyMomMomentMonitorMonkeyMonsterMonthMoonMoralMoreMorningMosquitoMotherMotionMotorMountainMouseMoveMovieMuchMuffinMuleMultiplyMuscleMuseumMushroomMusicMustMutualMyselfMysteryMythNaiveNameNapkinNarrowNastyNationNatureNearNeckNeedNegativeNeglectNeitherNephewNerveNestNetNetworkNeutralNeverNewsNextNiceNightNobleNoiseNomineeNoodleNormalNorthNoseNotableNoteNothingNoticeNovelNowNuclearNumberNurseNutOakObeyObjectObligeObscureObserveObtainObviousOccurOceanOctoberOdorOffOfferOfficeOftenOilOkayOldOliveOlympicOmitOnceOneOnionOnlineOnlyOpenOperaOpinionOpposeOptionOrangeOrbitOrchardOrderOrdinaryOrganOrientOriginalOrphanOstrichOtherOutdoorOuterOutputOutsideOvalOvenOverOwnOwnerOxygenOysterOzonePactPaddlePagePairPalacePalmPandaPanelPanicPantherPaperParadeParentParkParrotPartyPassPatchPathPatientPatrolPatternPausePavePaymentPeacePeanutPearPeasantPelicanPenPenaltyPencilPeoplePepperPerfectPermitPersonPetPhonePhotoPhrasePhysicalPianoPicnicPicturePiecePigPigeonPillPilotPinkPioneerPipePistolPitchPizzaPlacePlanetPlasticPlatePlayPleasePledgePluckPlugPlungePoemPoetPointPolarPolePolicePondPonyPoolPopularPortionPositionPossiblePostPotatoPotteryPovertyPowderPowerPracticePraisePredictPreferPreparePresentPrettyPreventPricePridePrimaryPrintPriorityPrisonPrivatePrizeProblemProcessProduceProfitProgramProjectPromoteProofPropertyProsperProtectProudProvidePublicPuddingPullPulpPulsePumpkinPunchPupilPuppyPurchasePurityPurposePursePushPutPuzzlePyramidQualityQuantumQuarterQuestionQuickQuitQuizQuoteRabbitRaccoonRaceRackRadarRadioRailRainRaiseRallyRampRanchRandomRangeRapidRareRateRatherRavenRawRazorReadyRealReasonRebelRebuildRecallReceiveRecipeRecordRecycleReduceReflectReformRefuseRegionRegretRegularRejectRelaxReleaseReliefRelyRemainRememberRemindRemoveRenderRenewRentReopenRepairRepeatReplaceReportRequireRescueResembleResistResourceResponseResultRetireRetreatReturnReunionRevealReviewRewardRhythmRibRibbonRiceRichRideRidgeRifleRightRigidRingRiotRippleRiskRitualRivalRiverRoadRoastRobotRobustRocketRomanceRoofRookieRoomRoseRotateRoughRoundRouteRoyalRubberRudeRugRuleRunRunwayRuralSadSaddleSadnessSafeSailSaladSalmonSalonSaltSaluteSameSampleSandSatisfySatoshiSauceSausageSaveSayScaleScanScareScatterSceneSchemeSchoolScienceScissorsScorpionScoutScrapScreenScriptScrubSeaSearchSeasonSeatSecondSecretSectionSecuritySeedSeekSegmentSelectSellSeminarSeniorSenseSentenceSeriesServiceSessionSettleSetupSevenShadowShaftShallowShareShedShellSheriffShieldShiftShineShipShiverShockShoeShootShopShortShoulderShoveShrimpShrugShuffleShySiblingSickSideSiegeSightSignSilentSilkSillySilverSimilarSimpleSinceSingSirenSisterSituateSixSizeSkateSketchSkiSkillSkinSkirtSkullSlabSlamSleepSlenderSliceSlideSlightSlimSloganSlotSlowSlushSmallSmartSmileSmokeSmoothSnackSnakeSnapSniffSnowSoapSoccerSocialSockSodaSoftSolarSoldierSolidSolutionSolveSomeoneSongSoonSorrySortSoulSoundSoupSourceSouthSpaceSpareSpatialSpawnSpeakSpecialSpeedSpellSpendSphereSpiceSpiderSpikeSpinSpiritSplitSpoilSponsorSpoonSportSpotSpraySpreadSpringSpySquareSqueezeSquirrelStableStadiumStaffStageStairsStampStandStartStateStaySteakSteelStemStepStereoStickStillStingStockStomachStoneStoolStoryStoveStrategyStreetStrikeStrongStruggleStudentStuffStumbleStyleSubjectSubmitSubwaySuccessSuchSuddenSufferSugarSuggestSuitSummerSunSunnySunsetSuperSupplySupremeSureSurfaceSurgeSurpriseSurroundSurveySuspectSustainSwallowSwampSwapSwarmSwearSweetSwiftSwimSwingSwitchSwordSymbolSymptomSyrupSystemTableTackleTagTailTalentTalkTankTapeTargetTaskTasteTattooTaxiTeachTeamTellTenTenantTennisTentTermTestTextThankThatThemeThenTheoryThereTheyThingThisThoughtThreeThriveThrowThumbThunderTicketTideTigerTiltTimberTimeTinyTipTiredTissueTitleToastTobaccoTodayToddlerToeTogetherToiletTokenTomatoTomorrowToneTongueTonightToolToothTopTopicToppleTorchTornadoTortoiseTossTotalTouristTowardTowerTownToyTrackTradeTrafficTragicTrainTransferTrapTrashTravelTrayTreatTreeTrendTrialTribeTrickTriggerTrimTripTrophyTroubleTruckTrueTrulyTrumpetTrustTruthTryTubeTuitionTumbleTunaTunnelTurkeyTurnTurtleTwelveTwentyTwiceTwinTwistTwoTypeTypicalUglyUmbrellaUnableUnawareUncleUncoverUnderUndoUnfairUnfoldUnhappyUniformUniqueUnitUniverseUnknownUnlockUntilUnusualUnveilUpdateUpgradeUpholdUponUpperUpsetUrbanUrgeUsageUseUsedUsefulUselessUsualUtilityVacantVacuumVagueValidValleyValveVanVanishVaporVariousVastVaultVehicleVelvetVendorVentureVenueVerbVerifyVersionVeryVesselVeteranViableVibrantViciousVictoryVideoViewVillageVintageViolinVirtualVirusVisaVisitVisualVitalVividVocalVoiceVoidVolcanoVolumeVoteVoyageWageWagonWaitWalkWallWalnutWantWarfareWarmWarriorWashWaspWasteWaterWaveWayWealthWeaponWearWeaselWeatherWebWeddingWeekendWeirdWelcomeWestWetWhaleWhatWheatWheelWhenWhereWhipWhisperWideWidthWifeWildWillWinWindowWineWingWinkWinnerWinterWireWisdomWiseWishWitnessWolfWomanWonderWoodWoolWordWorkWorldWorryWorthWrapWreckWrestleWristWriteWrongYardYearYellowYouYoungYouthZebraZeroZoneZoo"
         }, {}]
     }, {}, [4])(4)
 }); 