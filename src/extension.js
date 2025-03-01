"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const axios_1 = __importDefault(require("axios"));
function activate(context) {
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('chatgptView', new ChatGPTViewProvider(context)));
}
class ChatGPTViewProvider {
    context;
    _view;
    constructor(context) {
        this.context = context;
    }
    resolveWebviewView(view) {
        this._view = view;
        view.webview.options = { enableScripts: true };
        view.webview.html = this.getHtml();
        view.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'askChatGPT') {
                const apiKey = vscode.workspace.getConfiguration('chatgpt').get('apiKey');
                if (!apiKey) {
                    view.webview.postMessage({ command: 'response', text: 'API ключ не задан в настройках!' });
                    return;
                }
                const response = await this.askChatGPT(apiKey, message.text);
                view.webview.postMessage({ command: 'response', text: response });
            }
        });
    }
    async askChatGPT(apiKey, prompt) {
        try {
            const response = await axios_1.default.post('https://api.openai.com/v1/chat/completions', {
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
            }, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            return response.data.choices[0].message.content;
        }
        catch (error) {
            return 'Ошибка запроса к ChatGPT';
        }
    }
    getHtml() {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>ChatGPT</title>
                <script>
                    const vscode = acquireVsCodeApi();
                    function sendMessage() {
                        const input = document.getElementById('input');
                        vscode.postMessage({ command: 'askChatGPT', text: input.value });
                        input.value = '';
                    }
                    window.addEventListener('message', event => {
                        document.getElementById('response').innerText = event.data.text;
                    });
                </script>
            </head>
            <body>
                <input id="input" type="text" placeholder="Ask ChatGPT...">
                <button onclick="sendMessage()">Send</button>
                <p id="response"></p>
            </body>
            </html>`;
    }
}
function deactivate() { }
//# sourceMappingURL=extension.js.map