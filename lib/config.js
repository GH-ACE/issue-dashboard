"use strict";
// A configuration is an `Analytics` structure of its own.  It will take
// the YAML configuration and parse it into an `AnalyticsConfig`.  This
// will contain the literal definition from the configuration itself.
// By running the `evaluate` on the `Analytics`, it will take the input,
// including any queries, and execute them to produce a static `Analytics`
// structure with the actual values.
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const analytics_1 = require("./analytics");
const yaml = __importStar(require("js-yaml"));
const fs = __importStar(require("fs"));
function configError(context, message) {
    const location = context ? ` for ${context}` : '';
    throw new Error(`config: invalid configuration${location}: ${message}`);
}
function configValue(config, context, key, required = false) {
    if (!(key in config) && required) {
        configError(context, `missing required option '${key}'`);
    }
    let value = config[key];
    delete config[key];
    return value;
}
function ensureConfigEmpty(config, context) {
    var remaining = Object.keys(config);
    if (remaining.length != 0) {
        configError(context, `unexpected option '${remaining[0]}'`);
    }
}
function keyList(keys, andor) {
    let result = new Array();
    for (let i = 0; i < keys.length; i++) {
        if (i == keys.length - 1) {
            result.push(` ${andor} `);
        }
        else if (i > 0) {
            result.push(', ');
        }
        result.push(`'${keys[i]}'`);
    }
    return result.join('');
}
function ensureOneConfigKey(config, context, keys) {
    let found = new Array();
    for (let key of keys) {
        if (key in config) {
            found.push(key);
        }
    }
    if (found.length == 0) {
        configError(context, `expected one of: ${keyList(keys, 'or')}`);
    }
    if (found.length > 1) {
        configError(context, `expected only one of: ${keyList(found, 'or')}`);
    }
}
class AnalyticsConfig extends analytics_1.Analytics {
    constructor(title, description, sections, output, setup, shutdown) {
        super(title, description, sections, setup, shutdown);
        this.output = output;
    }
    static loadStringWidget(config) {
        let widget;
        if (typeof config == 'string') {
            config = { value: config };
        }
        ensureOneConfigKey(config, 'string widget', ['value', 'script']);
        let title = configValue(config, 'string widget', 'title');
        let url = configValue(config, 'string widget', 'url');
        let color = configValue(config, 'string widget', 'color');
        let align = configValue(config, 'string widget', 'align');
        let value = configValue(config, 'string widget', 'value');
        let script = configValue(config, 'string widget', 'script');
        if (script != null) {
            widget = new analytics_1.ScriptStringWidget(title, url, script, align, color);
        }
        else if (value != null) {
            widget = new analytics_1.StringWidget(title, url, value, align, color);
        }
        else {
            throw new Error();
        }
        ensureConfigEmpty(config, 'string widget');
        return widget;
    }
    static loadNumberWidget(config) {
        let widget;
        ensureOneConfigKey(config, 'number widget', ['issue_query', 'value', 'script']);
        let title = configValue(config, 'number widget', 'title');
        let url = configValue(config, 'number widget', 'url');
        let color = configValue(config, 'number widget', 'color');
        let value = configValue(config, 'number widget', 'value');
        let script = configValue(config, 'number widget', 'script');
        let query = configValue(config, 'number widget', 'issue_query');
        let query_type = 0 /* Issue */;
        if (query != null) {
            widget = new analytics_1.QueryNumberWidget(title, url, query_type, query, color);
        }
        else if (script != null) {
            widget = new analytics_1.ScriptNumberWidget(title, url, script, color);
        }
        else if (value != null) {
            widget = new analytics_1.NumberWidget(title, url, value, color);
        }
        else {
            throw new Error();
        }
        ensureConfigEmpty(config, 'number widget');
        return widget;
    }
    static loadGraphWidget(config) {
        let widgets = new Array();
        let title = configValue(config, 'graph widget', 'title');
        let url = configValue(config, 'graph widget', 'url');
        let elements = configValue(config, 'graph widget', 'elements', true);
        for (let element of elements) {
            ensureOneConfigKey(element, 'graph widget element', ['issue_query', 'value']);
            let title = configValue(element, 'graph widget element', 'title');
            let url = configValue(element, 'graph widget element', 'url');
            let color = configValue(element, 'graph widget element', 'color');
            let query = configValue(element, 'graph widget element', 'issue_query');
            let query_type = 0 /* Issue */;
            let value = configValue(element, 'graph widget element', 'value');
            if (query != null) {
                widgets.push(new analytics_1.QueryNumberWidget(title, url, query_type, query, color));
            }
            else if (value != null) {
                widgets.push(new analytics_1.NumberWidget(title, url, value, color));
            }
            ensureConfigEmpty(element, 'graph widget element');
        }
        ensureConfigEmpty(config, 'graph widget');
        return new analytics_1.GraphWidget(title, url, widgets);
    }
    static loadQueryTableWidget(config) {
        let title = configValue(config, 'table widget', 'title');
        let url = configValue(config, 'table widget', 'url');
        let fields = configValue(config, 'table widget', 'fields');
        let query = configValue(config, 'table widget', 'issue_query', true);
        let limit = configValue(config, 'table widget', 'limit');
        let query_type = 0 /* Issue */;
        if (fields != null && !Array.isArray(fields)) {
            configError('table widget', `'fields' is not an array`);
        }
        return new analytics_1.QueryTableWidget(title, url, query_type, query, limit, fields);
    }
    static loadStaticTableWidget(config) {
        const headers = new Array();
        const elements = new Array();
        let title = configValue(config, 'table widget', 'title');
        let url = configValue(config, 'table widget', 'url');
        let headerConfig = configValue(config, 'table widget', 'headers');
        let elementsConfig = configValue(config, 'table widget', 'elements', true);
        if (headerConfig != null && Array.isArray(headerConfig)) {
            for (let header of headerConfig) {
                headers.push(AnalyticsConfig.loadStringWidget(header));
            }
        }
        else if (headerConfig != null) {
            headers.push(AnalyticsConfig.loadStringWidget(headerConfig));
        }
        if (elementsConfig != null && !Array.isArray(elementsConfig)) {
            configError('table widget', `'elements' is not an array`);
        }
        for (let elementList of elementsConfig) {
            if (Array.isArray(elementList)) {
                let row = new Array();
                for (let element of elementList) {
                    row.push(AnalyticsConfig.loadStringWidget(element));
                }
                elements.push(row);
            }
            else {
                elements.push([AnalyticsConfig.loadStringWidget(elementList)]);
            }
        }
        return new analytics_1.TableWidget(title, url, headers, elements);
    }
    static loadTableWidget(config) {
        let widget;
        ensureOneConfigKey(config, 'table widget', ['issue_query', 'elements']);
        if (config.issue_query != null) {
            widget = AnalyticsConfig.loadQueryTableWidget(config);
        }
        else {
            widget = AnalyticsConfig.loadStaticTableWidget(config);
        }
        ensureConfigEmpty(config, 'table widget');
        return widget;
    }
    static loadWidget(config) {
        let widget;
        let type = configValue(config, 'widget', 'type', true);
        if (type == 'number') {
            widget = AnalyticsConfig.loadNumberWidget(config);
        }
        else if (type == 'string') {
            widget = AnalyticsConfig.loadStringWidget(config);
        }
        else if (type == 'graph') {
            widget = AnalyticsConfig.loadGraphWidget(config);
        }
        else if (type == 'table') {
            widget = AnalyticsConfig.loadTableWidget(config);
        }
        else {
            configError('widget', `invalid type '${type}'`);
        }
        ensureConfigEmpty(config, 'widget');
        return widget;
    }
    static loadSection(config) {
        const widgets = new Array();
        let title = configValue(config, 'section', 'title');
        let description = configValue(config, 'section', 'description');
        let widgetConfig = configValue(config, 'section', 'widgets');
        if (widgetConfig != null) {
            if (!Array.isArray(widgetConfig)) {
                configError('section', `'widgets' is not an array`);
            }
            for (let wc of widgetConfig) {
                widgets.push(AnalyticsConfig.loadWidget(wc));
            }
        }
        ensureConfigEmpty(config, 'section');
        return new analytics_1.Section(title, description, widgets);
    }
    static loadOutput(config) {
        let output = {};
        if (!('format' in config)) {
            throw new Error(`config: 'output.format' is not defined`);
        }
        for (let key in config) {
            output[key] = config[key];
        }
        return output;
    }
    static load(config) {
        const sections = new Array();
        let title = configValue(config, null, 'title');
        let description = configValue(config, null, 'description');
        let setup = configValue(config, null, 'setup');
        let shutdown = configValue(config, null, 'shutdown');
        let outputConfig = configValue(config, null, 'output', true);
        let sectionConfig = configValue(config, null, 'sections');
        if (sectionConfig != null) {
            if (!Array.isArray(sectionConfig)) {
                configError(null, `'sections' is not an array`);
            }
            for (let section of sectionConfig) {
                sections.push(AnalyticsConfig.loadSection(section));
            }
        }
        let output = AnalyticsConfig.loadOutput(outputConfig);
        ensureConfigEmpty(config, null);
        return new AnalyticsConfig(title, description, sections, output, setup, shutdown);
    }
    static fromJson(config) {
        return AnalyticsConfig.load(JSON.parse(config));
    }
    static fromYaml(config) {
        return AnalyticsConfig.load(yaml.safeLoad(config));
    }
    static from(config, configType) {
        let ConfigFormat;
        (function (ConfigFormat) {
            ConfigFormat[ConfigFormat["JSON"] = 0] = "JSON";
            ConfigFormat[ConfigFormat["YAML"] = 1] = "YAML";
        })(ConfigFormat || (ConfigFormat = {}));
        let format;
        let input;
        format = ConfigFormat.YAML;
        if (configType == 'inline') {
            //preserving old code
            try {
                input = JSON.parse(config);
                format = ConfigFormat.JSON;
            }
            catch (e) {
                input = yaml.safeLoad(config);
            }
        }
        else {
            try {
                console.log('Loading the config yml file');
                input = yaml.safeLoad(fs.readFileSync(config, 'utf8'));
            }
            catch (err) {
                console.log(err);
            }
        }
        return AnalyticsConfig.load(input);
    }
}
exports.AnalyticsConfig = AnalyticsConfig;
