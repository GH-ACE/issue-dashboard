"use strict";
// A markdown renderer takes an `Analytics` structure and emits the
// data as markdown.
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const analytics_1 = require("./analytics");
const fs = __importStar(require("fs"));
class MarkdownRenderer {
    constructor(config) {
        if (config == null || config.output == null) {
            throw new Error('invalid configuration for markdown renderer');
        }
        let mdconfig = config.output;
        if (mdconfig.format == null || mdconfig.format != 'markdown') {
            throw new Error(`config: 'output.format' expected as 'markdown'`);
        }
        if (mdconfig.filename == null) {
            throw new Error(`config: 'output.filename' is not defined`);
        }
        this.config = mdconfig;
    }
    static renderColor(color) {
        if (color == 'red') {
            return '🔴';
        }
        else if (color == 'yellow') {
            return '💛';
        }
        else if (color == 'green') {
            return '✅';
        }
        else if (color == 'blue') {
            return '🔷';
        }
        else if (color == 'black') {
            return '⬛️';
        }
        throw new Error(`invalid color: ${color}`);
    }
    static renderNumberWidget(widget) {
        let value = widget.value;
        let color = widget.color;
        let out = value.toString();
        if (color != null) {
            out = `${MarkdownRenderer.renderColor(color)} ${out}`;
        }
        if (widget.url != null) {
            out = `[${out}](${widget.url})`;
        }
        return out;
    }
    static renderStringWidget(widget) {
        let value = widget.value;
        let color = widget.color;
        let md = new Array;
        if (widget.title != null) {
            md.push(`#### ${widget.title}\n`);
            md.push('\n');
        }
        if (widget.url != null) {
            md.push('[');
        }
        if (color != null) {
            md.push(`${MarkdownRenderer.renderColor(color)} `);
        }
        md.push(value);
        if (widget.url != null) {
            md.push(`](${widget.url})`);
        }
        md.push('\n');
        return md.join('');
    }
    static renderGraphWidget(widget) {
        // length of the bar (on-screen) at the largest value
        // TODO: account for the length of titles and values
        const BAR_LENGTH = 35;
        let md = new Array();
        let min = 0;
        let max = 0;
        for (let element of widget.elements) {
            if (!(element instanceof analytics_1.NumberWidget)) {
                throw new Error(`GraphWidget element did not evaluate to a NumberWidget (is a ${widget.constructor.name})`);
            }
            let num = element;
            if (typeof num.value != 'number') {
                throw new Error(`GraphWidget element did not evaluate to a static number (is a ${typeof num.value})`);
            }
            let value = num.value;
            if (value > max) {
                max = value;
            }
        }
        // TODO: scale this by accounting for the minimum value, to avoid
        // large numbers with little variance blowing out the graph
        let scale = (BAR_LENGTH / max);
        // To get the numbers left and right-aligned, add non-breaking space
        // between them.  A number is roughly the size of the block unicode
        // glyph, a non-breaking space is roughly n times those glyphs
        let spacerlen = Math.floor((BAR_LENGTH - (min.toString().length - max.toString().length)) * 3.75);
        let spacer = '&nbsp;'.repeat(spacerlen);
        if (widget.title) {
            md.push(`#### ${widget.title}`);
            md.push('');
        }
        md.push(`| ${widget.title ? widget.title : ''} |  | ${min}${spacer}${max} |`);
        md.push(`|:------------------------------------|-:|:-------|`);
        for (let element of widget.elements) {
            let num = element;
            let value = num.value;
            let bar = '█'.repeat(value * scale);
            md.push(`| ${num.title ? num.title : ''} | ${MarkdownRenderer.renderNumberWidget(num)} | ${bar} |`);
        }
        md.push('');
        return md.join('\n');
    }
    static renderTableCell(widget) {
        if (!(widget instanceof analytics_1.NumberWidget) && !(widget instanceof analytics_1.StringWidget)) {
            throw new Error(`TableWidget header cell did not evaluate to a static value (is a ${typeof widget})`);
        }
        let value = widget.value;
        let color = widget.color;
        let out = value.toString();
        if (color != null) {
            out = `${MarkdownRenderer.renderColor(color)} ${out}`;
        }
        if (widget.url != null) {
            out = `[${out}](${widget.url})`;
        }
        return out;
    }
    static renderTableWidget(widget) {
        let md = new Array();
        let line;
        let columns = (widget.headers != null) ? widget.headers.length : 0;
        // Find the maximum number of columns
        for (let row of widget.elements) {
            if (row.length > columns) {
                columns = row.length;
            }
        }
        if (columns == 0) {
            return '';
        }
        if (widget.title) {
            md.push(`#### ${widget.title}`);
            md.push('');
        }
        // Draw header
        line = new Array();
        line.push('|');
        for (let i = 0; i < columns; i++) {
            line.push(' ');
            if (widget.headers != null && i < widget.headers.length) {
                line.push(MarkdownRenderer.renderTableCell(widget.headers[i]));
            }
            line.push(' |');
        }
        md.push(line.join(''));
        // Draw header/element separator lines
        line = new Array();
        line.push('|');
        for (let i = 0; i < columns; i++) {
            let align = (widget.headers != null && i < widget.headers.length && widget.headers[i] instanceof analytics_1.StringWidget) ? widget.headers[i].align : null;
            if (align == 'left') {
                line.push(':--');
            }
            else if (align == 'center') {
                line.push(':-:');
            }
            else if (align == 'right') {
                line.push('--:');
            }
            else {
                line.push('---');
            }
            line.push('|');
        }
        md.push(line.join(''));
        // Draw elements
        for (let row of widget.elements) {
            line = new Array();
            line.push('|');
            for (let i = 0; i < columns; i++) {
                line.push(' ');
                line.push(MarkdownRenderer.renderTableCell(row[i]));
                line.push(' |');
            }
            md.push(line.join(''));
        }
        return md.join('\n');
    }
    static renderAnalytics(analytics) {
        let md = new Array();
        if (analytics.title != null) {
            md.push(`# ${analytics.title}`);
            md.push('');
        }
        if (analytics.description != null) {
            md.push(analytics.description);
            md.push('');
        }
        for (let section of analytics.sections) {
            if (section.title != null) {
                md.push(`## ${section.title}`);
                md.push('');
            }
            if (section.description != null) {
                md.push(section.description);
                md.push('');
            }
            let showingNumberWidgets = false;
            for (let widget of section.widgets) {
                if (widget instanceof analytics_1.NumberWidget) {
                    // Group the number widgets together
                    if (!showingNumberWidgets) {
                        md.push('| Query |  |');
                        md.push('|:------|-:|');
                        showingNumberWidgets = true;
                    }
                    md.push(`| ${widget.title ? widget.title : ''} | ${MarkdownRenderer.renderNumberWidget(widget)} |`);
                    continue;
                }
                if (showingNumberWidgets) {
                    md.push('');
                    showingNumberWidgets = false;
                }
                if (widget instanceof analytics_1.StringWidget) {
                    md.push(MarkdownRenderer.renderStringWidget(widget));
                }
                else if (widget instanceof analytics_1.GraphWidget) {
                    md.push(MarkdownRenderer.renderGraphWidget(widget));
                }
                else if (widget instanceof analytics_1.TableWidget) {
                    md.push(MarkdownRenderer.renderTableWidget(widget));
                }
                else {
                    throw new Error(`cannot render unknown widget type: ${widget.constructor.name}`);
                }
            }
        }
        md.push('');
        return md.join('\n');
    }
    render(analytics) {
        fs.writeFileSync(this.config.filename, MarkdownRenderer.renderAnalytics(analytics), 'utf8');
    }
}
exports.MarkdownRenderer = MarkdownRenderer;
