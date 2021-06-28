"use strict";
// The data structure that contains the actual analytics information.
// An analytics data structure contains one or more "sections" that
// are available for grouping.  Sections contain one or more "widgets"
// that show data.  For example, the `NumberWidget` shows a number, the
// `GraphWidget` shows a graph.
//
// Some of these widgets are able to be computed from dynamic data:
// for example, the `QueryNumberWidget` can execute a query against the
// items REST endpoint on GitHub.
//
// Each widget has an `evaluate` function; this will run its query,
// capture the output, and then return a static value widget with the
// data.  That is, running `QueryNumberWidget.evaluate` will return a
// `NumberWidget` with the actual value set.  The renderers expect static
// value widgets (the results of `evaluate`).
Object.defineProperty(exports, "__esModule", { value: true });
const evaluate_1 = require("./evaluate");
async function evaluateExpression(expr, context) {
    return expr != null ? await evaluate_1.Evaluate.parseExpression(expr, context) : null;
}
async function evaluateMetadata(md, context, value) {
    if (md == null) {
        return null;
    }
    const valuedContext = {
        github: context.github,
        value: value,
        userdata: context.userdata
    };
    return await evaluate_1.Evaluate.parseExpression(md, valuedContext);
}
async function evaluateQuery(type, query, limit, context) {
    // fetch 100 at a time (the GitHub REST API limit) for maximum caching
    const FETCH_COUNT = 100;
    let queryFunction;
    let resultCount = -1;
    let totalCount = 2147483647;
    let items = new Array();
    let page = 0;
    if (type == 0 /* Issue */) {
        queryFunction = context.github.search.issuesAndPullRequests;
    }
    else {
        throw new Error(`unknown query type: ${type}`);
    }
    let parsedQuery = await evaluate_1.Evaluate.parseExpression(query, context);
    let url = queryToUrl(parsedQuery);
    // start with any data that we've cached for this query.  we may need
    // to fetch additional pages to supply the requested number of items
    if (context.querycache != null && context.querycache[parsedQuery] != null) {
        const cached = context.querycache[parsedQuery];
        totalCount = cached.totalCount;
        items = cached.items;
        resultCount = items.length;
        page = items.length / FETCH_COUNT;
    }
    while (resultCount < limit && resultCount < totalCount) {
        let results = await queryFunction({
            q: parsedQuery,
            per_page: FETCH_COUNT,
            page: ++page
        });
        totalCount = results.data.total_count;
        resultCount += results.data.items.length;
        items.push(...results.data.items);
        if (results.data.items.length == 0) {
            break;
        }
    }
    if (context.querycache != null) {
        context.querycache[parsedQuery] = {
            query: parsedQuery,
            totalCount: totalCount,
            items: items
        };
    }
    return {
        totalCount: totalCount,
        items: items.slice(0, limit),
        url: url
    };
}
function queryToUrl(query) {
    let repo = null;
    query = query.replace(/^(.*\s+)?repo:([^\s]+)(\s+.*)?$/, (match, ...args) => {
        repo = args[1];
        let replace = '';
        if (args[0] != null) {
            replace += args[0];
        }
        if (args[2] != null) {
            replace += args[2];
        }
        return replace;
    });
    query = query.replace(/\s+/g, ' ').replace(/^ /, '').replace(/ $/, '');
    return repo ?
        `https://github.com/${repo}/issues?q=${encodeURIComponent(query)}` :
        `https://github.com/search?q=${encodeURIComponent(query)}`;
}
exports.queryToUrl = queryToUrl;
class Widget {
    constructor(title, url) {
        this.title = title;
        this.url = url;
    }
}
exports.Widget = Widget;
// A widget that has an expression that will evaluate to a numeric value
class NumberWidget extends Widget {
    constructor(title, url, value, color) {
        super(title, url);
        this.value = value;
        this.color = color;
    }
    async evaluate(context) {
        let value;
        if (typeof (this.value) == 'number') {
            value = this.value;
        }
        else {
            let result = await evaluate_1.Evaluate.parseExpression(this.value, context);
            if (typeof (result) == 'number') {
                value = result;
            }
            else {
                value = +result;
            }
        }
        const title = await evaluateMetadata(this.title, context, value);
        const url = await evaluateMetadata(this.url, context, value);
        const color = await evaluateMetadata(this.color, context, value);
        return new NumberWidget(title, url, value, color);
    }
}
exports.NumberWidget = NumberWidget;
// A widget that runs an issue query and displays the number of returned
// items as a numeric value
class QueryNumberWidget extends Widget {
    constructor(title, url, type, query, color) {
        super(title, url);
        this.type = type;
        this.query = query;
        this.color = color;
    }
    async evaluate(context) {
        let results = await evaluateQuery(this.type, this.query, 0, context);
        const value = results.totalCount;
        const url = this.url != null ? await evaluateMetadata(this.url, context, value) : results.url;
        const title = await evaluateMetadata(this.title, context, value);
        const color = await evaluateMetadata(this.color, context, value);
        return new NumberWidget(title, url, value, color);
    }
}
exports.QueryNumberWidget = QueryNumberWidget;
// A widget that runs a script and displays the number of returned
// items as a numeric value
class ScriptNumberWidget extends Widget {
    constructor(title, url, script, color) {
        super(title, url);
        this.script = script;
        this.color = color;
    }
    async evaluate(context) {
        let result = await evaluate_1.Evaluate.runScript(this.script, context);
        let value;
        let title = null;
        let url = null;
        let color = null;
        if (typeof result == 'object' && result.value) {
            title = result.title;
            url = result.url;
            color = result.color;
            result = result.value;
        }
        if (typeof result != 'number') {
            result = result.toString();
            if (result.match(/^\d+$/)) {
                result = +result;
            }
            else {
                result = Number.NaN;
            }
        }
        value = result;
        if (title == null) {
            title = await evaluateMetadata(this.title, context, value);
        }
        if (url == null) {
            url = await evaluateMetadata(this.url, context, value);
        }
        if (color == null) {
            color = await evaluateMetadata(this.color, context, value);
        }
        return new NumberWidget(title, url, result, color);
    }
}
exports.ScriptNumberWidget = ScriptNumberWidget;
// A widget that has an expression that will evaluate to a string value
class StringWidget extends Widget {
    constructor(title, url, value, align, color) {
        super(title, url);
        this.value = value;
        this.align = align;
        this.color = color;
    }
    async evaluate(context) {
        let value = await evaluate_1.Evaluate.parseExpression(this.value, context);
        const title = await evaluateMetadata(this.title, context, value);
        const url = await evaluateMetadata(this.url, context, value);
        const align = await evaluateMetadata(this.align, context, value);
        const color = await evaluateMetadata(this.color, context, value);
        return new StringWidget(title, url, value, align, color);
    }
}
exports.StringWidget = StringWidget;
// A widget that runs a script and displays the string returned
class ScriptStringWidget extends Widget {
    constructor(title, url, script, align, color) {
        super(title, url);
        this.script = script;
        this.align = align;
        this.color = color;
    }
    async evaluate(context) {
        let result = await evaluate_1.Evaluate.runScript(this.script, context);
        let value;
        let title = null;
        let url = null;
        let align = null;
        let color = null;
        if (typeof result == 'object' && result.value) {
            title = result.title;
            url = result.url;
            color = result.color;
            result = result.value;
        }
        if (typeof result != 'string') {
            result = result.toString();
        }
        value = result;
        if (title == null) {
            title = await evaluateMetadata(this.title, context, value);
        }
        if (url == null) {
            url = await evaluateMetadata(this.url, context, value);
        }
        if (align == null) {
            align = await evaluateMetadata(this.align, context, value);
        }
        if (color == null) {
            color = await evaluateMetadata(this.color, context, value);
        }
        return new StringWidget(title, url, result, align, color);
    }
}
exports.ScriptStringWidget = ScriptStringWidget;
// A widget that displays multiple numeric values against each other,
// usually in a bar graph.  This actually is composed of other widgets;
// namely `NumberWidget`s (or things that derive from it, like a
// `QueryNumberWidget`s) to store the data.
class GraphWidget extends Widget {
    constructor(title, url, elements) {
        super(title, url);
        this.elements = elements ? elements : new Array();
    }
    async evaluate(context) {
        let elements = new Array();
        for (let element of this.elements) {
            let result = await element.evaluate(context);
            if (!(result instanceof NumberWidget)) {
                throw new Error('graph widget elements must be number widgets');
            }
            elements.push(result);
        }
        const title = await evaluateExpression(this.title, context);
        const url = await evaluateExpression(this.url, context);
        return new GraphWidget(title, url, elements);
    }
}
exports.GraphWidget = GraphWidget;
class TableWidget extends Widget {
    constructor(title, url, headers, elements) {
        super(title, url);
        this.headers = headers;
        this.elements = elements;
    }
    async evaluate(context) {
        let headers = new Array();
        let elements = new Array();
        for (let header of this.headers) {
            let result = await header.evaluate(context);
            if (!(result instanceof NumberWidget) && !(result instanceof StringWidget)) {
                throw new Error('table widget elements must be string or number widgets');
            }
            headers.push(result);
        }
        for (let row of this.elements) {
            let cells = new Array();
            for (let cell of row) {
                let result = await cell.evaluate(context);
                if (!(result instanceof NumberWidget) && !(result instanceof StringWidget)) {
                    throw new Error('table widget elements must be string or number widgets');
                }
                cells.push(result);
            }
            elements.push(cells);
        }
        const title = await evaluateExpression(this.title, context);
        const url = await evaluateExpression(this.url, context);
        return new TableWidget(title, url, headers, elements);
    }
}
exports.TableWidget = TableWidget;
class QueryTableWidget extends Widget {
    constructor(title, url, type, query, limit, fields) {
        super(title, url);
        this.type = type;
        this.query = query;
        this.limit = limit != null ? limit : QueryTableWidget.DEFAULT_LIMIT;
        this.fields = fields != null ? fields : QueryTableWidget.DEFAULT_FIELDS[type];
    }
    getHeaders() {
        const headers = new Array();
        for (let field of this.fields) {
            if (field.title != null) {
                headers.push(field.title);
            }
            else if (field.value != null) {
                headers.push(field.value);
            }
            else {
                headers.push(field.toString());
            }
        }
        return headers;
    }
    static async evaluateItemValue(value, context, item) {
        const valuedContext = {
            github: context.github,
            item: item,
            userdata: context.userdata
        };
        return await evaluate_1.Evaluate.parseExpression(value, valuedContext);
    }
    async getRow(item, context) {
        const values = new Array();
        for (let field of this.fields) {
            if (field.value != null) {
                values.push(await QueryTableWidget.evaluateItemValue(field.value, context, item));
            }
            else {
                let property = (field.property != null) ? field.property : field.toString();
                values.push(item[property]);
            }
        }
        return values;
    }
    async evaluate(context) {
        let headers = new Array();
        let elements = new Array();
        let results = await evaluateQuery(this.type, this.query, this.limit, context);
        for (let header of this.getHeaders()) {
            headers.push(new StringWidget(null, null, header, null, null));
        }
        let item;
        for (item of results.items) {
            let row = new Array();
            for (let value of await this.getRow(item, context)) {
                row.push(new StringWidget(null, item.html_url, value, null, null));
            }
            elements.push(row);
        }
        const title = await evaluateExpression(this.title, context);
        const url = this.url != null ? await evaluateExpression(this.url, context) : results.url;
        return new TableWidget(title, url, headers, elements);
    }
}
exports.QueryTableWidget = QueryTableWidget;
QueryTableWidget.DEFAULT_FIELDS = {
    [0 /* Issue */]: [
        { title: 'Issue', property: 'number' },
        { title: 'Title', property: 'title' }
    ]
};
QueryTableWidget.DEFAULT_LIMIT = 10;
// A `Section` contains one or more widgets
class Section {
    constructor(title, description, widgets) {
        this.title = title;
        this.description = description;
        this.widgets = widgets;
    }
    async evaluate(context) {
        const evaluated = new Array();
        for (let widget of this.widgets) {
            evaluated.push(await widget.evaluate(context));
        }
        const title = this.title ? await evaluate_1.Evaluate.parseExpression(this.title, context) : null;
        const description = this.description ? await evaluate_1.Evaluate.parseExpression(this.description, context) : null;
        return new Section(title, description, evaluated);
    }
}
exports.Section = Section;
class Analytics {
    constructor(title, description, sections, setup, shutdown) {
        this.title = title;
        this.description = description;
        this.sections = sections;
        this.setup = setup;
        this.shutdown = shutdown;
    }
    static async evaluate(config, github) {
        const context = { 'github': github, 'querycache': {}, 'userdata': {} };
        const evaluated = new Array();
        if (config.setup != null) {
            await evaluate_1.Evaluate.runScript(config.setup, context);
        }
        for (let section of config.sections) {
            evaluated.push(await section.evaluate(context));
        }
        const title = await evaluateExpression(config.title, context);
        const description = await evaluateExpression(config.description, context);
        if (config.shutdown != null) {
            await evaluate_1.Evaluate.runScript(config.shutdown, context);
        }
        return new Analytics(title, description, evaluated, null, null);
    }
}
exports.Analytics = Analytics;
