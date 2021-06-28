"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dayjs_1 = __importDefault(require("dayjs"));
const utc_1 = __importDefault(require("dayjs/plugin/utc"));
const customParseFormat_1 = __importDefault(require("dayjs/plugin/customParseFormat"));
function parse(input = '') {
    dayjs_1.default.extend(utc_1.default);
    dayjs_1.default.extend(customParseFormat_1.default);
    let value;
    let match;
    let currentDate = false;
    input = input.toString().replace(/^\s+/, '');
    if (match = input.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})Z/)) {
        value = dayjs_1.default(match[0]);
        input = input.substring(match[0].length);
    }
    else if (match = input.match(/^(\d{4}-\d{2}-\d{2})/)) {
        value = dayjs_1.default(`${match[0]} -0000`, 'YYYY-MM-DD Z');
        input = input.substring(match[0].length);
    }
    else if (match = input.match(/^(\d{2}):(\d{2}):(\d{2})/)) {
        value = dayjs_1.default();
        value = value.utc().hour(+match[1]);
        value = value.utc().minute(+match[2]);
        value = value.utc().second(+match[3]);
        input = input.substring(match[0].length);
    }
    else {
        value = dayjs_1.default();
        currentDate = true;
    }
    while (input.length > 0) {
        let operator;
        input = input.replace(/^\s+/, '');
        if (match = input.match(/^([+-])\s*/)) {
            operator = match[1];
            input = input.substring(match[0].length);
        }
        else if (currentDate != null) {
            // if no date was specified, users don't need a starting operator
            operator = '+';
            currentDate = false;
        }
        else {
            throw new Error(`operator expected, got '${input}'`);
        }
        let operation = (operator == '-') ?
            (d, v, u) => d.utc().subtract(v, u) :
            (d, v, u) => d.utc().add(v, u);
        if (match = input.match(/^([\d]+)\s*(year|month|day|hour|minute|second)(s?)\s*/)) {
            input = input.substring(match[0].length);
            value = operation(value, +match[1], match[2]);
        }
        else if (match = input.match(/^(\d{2}):(\d{2}):(\d{2})\s*/)) {
            input = input.substring(match[0].length);
            value = operation(value, +match[1], 'hours');
            value = operation(value, +match[2], 'minutes');
            value = operation(value, +match[3], 'seconds');
        }
        else {
            throw new Error(`date adjustment expected, got '${input}'`);
        }
    }
    return value.utc();
}
function date(input = undefined) {
    return parse(input).format('YYYY-MM-DD');
}
exports.date = date;
function time(input = undefined) {
    return parse(input).format('HH:mm:ss');
}
exports.time = time;
function datetime(input = undefined) {
    return parse(input).format();
}
exports.datetime = datetime;
