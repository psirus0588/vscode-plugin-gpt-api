import * as vscode from 'vscode';
import axios from 'axios';

export function activate(context: vscode.ExtensionContext) {
    const provider = new ChatGPTViewProvider(context);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'chatgptView',
            provider
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('chatgpt.sendSelectedCode', async () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const selection = editor.document.getText(editor.selection);
                if (selection.trim()) {
                    const apiKey = vscode.workspace.getConfiguration('chatgpt').get<string>('apiKey');
                    if (!apiKey) {
                        vscode.commands.executeCommand('workbench.action.openSettings', 'chatgpt.apiKey');
                        vscode.window.showInformationMessage('add your API key');
                        return;
                    }

                    const response = await provider.askChatGPT(apiKey, selection);
                    if (provider._view) {
                        provider._view.webview.postMessage({ command: 'response', text: response });
                    } else {
                        vscode.window.showErrorMessage('ChatGPT view is not available.');
                    }
                } else {
                    vscode.window.showErrorMessage('Выделите код перед отправкой.');
                }
            }
        })
    );
}

class ChatGPTViewProvider implements vscode.WebviewViewProvider {
    public _view?: vscode.WebviewView;

    constructor(private readonly context: vscode.ExtensionContext) {}

    resolveWebviewView(view: vscode.WebviewView) {
        this._view = view;
        view.webview.options = { enableScripts: true };
        view.webview.html = this.getHtml();

        view.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'askChatGPT') {
                const apiKey = vscode.workspace.getConfiguration('chatgpt').get<string>('apiKey');
                if (!apiKey) {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'chatgpt.apiKey');
                    vscode.window.showInformationMessage('add your API key');
                    return;
                }
                const response = await this.askChatGPT(apiKey, message.text);
                view.webview.postMessage({ command: 'response', text: response });
            }
        });
    }

    public async askChatGPT(apiKey: string, prompt: string): Promise<string> {
        try {
            const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
            }, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            return response.data.choices[0].message.content;
        } catch (error) {
            return 'Ошибка запроса к ChatGPT';
        }
    }

    private getHtml(): string {
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
                    function openSettings() {
                        vscode.postMessage({ command: 'openSettings' });
                    }
                    window.addEventListener('message', event => {
                        if (event.data.command === 'response') {
                            document.getElementById('response').innerHTML = event.data.text;
                        }
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

export function deactivate() {}