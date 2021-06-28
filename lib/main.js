"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github_1 = require("@actions/github");
const config_1 = require("./config");
const analytics_1 = require("./analytics");
const render_1 = require("./render");
async function run() {
    try {
        const token = core.getInput('token') || process.env.GITHUB_TOKEN || '';
        const github = new github_1.GitHub(token);
        const config = config_1.AnalyticsConfig.from(core.getInput('config', { required: true }), core.getInput('configType'));
        const renderer = render_1.Renderer.fromConfig(config);
        const result = await analytics_1.Analytics.evaluate(config, github);
        renderer.render(result);
    }
    catch (err) {
        core.setFailed(err.message);
    }
}
run();
