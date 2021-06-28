"use strict";
// A mechanism for evaluating user-provided strings or scripts.  For
// strings, this will take user input and parse anything within
// double curly-braces (`{{ }}`) as eval-able JavaScript.  Several
// helper functions (like `date()`, `time()`, etc) will be provided.
// Users can provide additional data that will be given to the
// functions.
Object.defineProperty(exports, "__esModule", { value: true });
const date_1 = require("./date");
class Evaluate {
    static invokeAsyncFunction(source, args) {
        const asyncFn = Object.getPrototypeOf(async () => { }).constructor;
        const fn = new asyncFn(...Object.keys(args), source);
        return fn(...Object.values(args));
    }
    static createArgs(additional = null) {
        let args = {
            date: date_1.date,
            time: date_1.time,
            datetime: date_1.datetime
        };
        for (let key in additional) {
            if (key in args) {
                throw new Error(`cannot redefine evaluation global '${key}'`);
            }
            args[key] = additional[key];
        }
        return args;
    }
    static async runScript(input, additional = null) {
        const args = Evaluate.createArgs(additional);
        return await Evaluate.invokeAsyncFunction(input, args);
    }
    static async parseExpression(raw, additional = null) {
        const args = Evaluate.createArgs(additional);
        const search = new RegExp('{{(.*?)}}', 'g');
        let match;
        let output = new Array();
        let last = 0;
        while (match = search.exec(raw)) {
            if (match.index > 0) {
                output.push(raw.substring(last, match.index));
            }
            output.push(await Evaluate.invokeAsyncFunction(`return (async () => ${match[1]})()`, args));
            last = search.lastIndex;
        }
        if (last < raw.length) {
            output.push(raw.substring(last, raw.length));
        }
        return output.join('');
    }
}
exports.Evaluate = Evaluate;
