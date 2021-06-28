"use strict";
// A renderer takes an `Analytics` structure and emits it as data.
Object.defineProperty(exports, "__esModule", { value: true });
const render_html_1 = require("./render_html");
const render_markdown_1 = require("./render_markdown");
class Renderer {
    static fromConfig(config) {
        if (config.output == null) {
            throw new Error(`config: 'output' is not defined`);
        }
        if (config.output.format == null) {
            throw new Error(`config: 'output.format' is not defined`);
        }
        if (config.output.format == 'markdown') {
            return new render_markdown_1.MarkdownRenderer(config);
        }
        else if (config.output.format == 'html') {
            return new render_html_1.HtmlRenderer(config);
        }
        else {
            throw new Error(`config: unknown output format type '${config.output.format}'`);
        }
    }
}
exports.Renderer = Renderer;
