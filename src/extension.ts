// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as googleTranslate from '@vitalets/google-translate-api';
import * as googleTranslateCN from 'google-translate-api-cn';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	let config = vscode.workspace.getConfiguration("translatorHelper");
	const api = config.api;
	const source = config.sourceLanguage;
	const target = config.targetLanguage;
	const servie = TranslationServiceFactory.createServiceInstance(api);
	const docService = new DocService();
	let statusBarItem: vscode.StatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	//console.log('Congratulations, your extension "translator-helper" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let translateInsert = vscode.commands.registerCommand('extension.translateInsert', async () => {
		// The code you place here will be executed every time your command is executed
		const text = docService.getParagraph();
		try {
			let result = await servie.translate(text, source, target);
			docService.insertText(result);
		} catch (error) {
			vscode.window.showErrorMessage(`Error occurs. ${error.message}`);
		}

		// Display a message box to the user
		//vscode.window.showInformationMessage('Hello World!');
	});

	let translate = vscode.commands.registerCommand('extension.translate', async () => {
		// The code you place here will be executed every time your command is executed
		const text = docService.getSelectionText();
		try {
			const result = await servie.translate(text, source, target);
			if(statusBarItem !== undefined){
				statusBarItem.dispose();
			}
			statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
			statusBarItem.text = `$(book) ${result}`;
			statusBarItem.show();
		} catch (error) {
			vscode.window.showErrorMessage(`Error occurs. ${error.message}`);
		}

		// Display a message box to the user
		//vscode.window.showInformationMessage('Hello World!');
	});
	context.subscriptions.push(translateInsert, translate);
}

// this method is called when your extension is deactivated
export function deactivate() { }


interface ITranslatorService {
	translate(text: string, source: string, target: string): Promise<string>;
}

class GoogleTranslationService implements ITranslatorService {
	async translate(text: string, source: string, target: string): Promise<string> {
		const service = googleTranslate;
		let result = await service(text, { from: source, to: target });
		return result.text;
	}
}

class GoogleCNTranslationService implements ITranslatorService {
	async translate(text: string, source: string, target: string): Promise<string> {
		const service = googleTranslateCN;
		let result = await service(text, { from: source, to: target });
		return result.text;
	}
}

class MicrosoftTranslationService implements ITranslatorService {
	translate(text: string, source: string, target: string): Promise<string> {
		throw new Error("Method not implemented.");
	}
}

class TranslationServiceFactory {
	static createServiceInstance(api: string): ITranslatorService {
		switch (api) {
			case "google":
				return new GoogleTranslationService();
			case "google-cn":
				return new GoogleCNTranslationService();
			case "microsoft":
				return new MicrosoftTranslationService();
			default:
				return new GoogleTranslationService();
		}
	}
}



class DocService {
	editor: vscode.TextEditor | undefined;
	constructor() {
		let currentEditor = vscode.window.activeTextEditor;
		if (currentEditor) {
			this.editor = currentEditor;
		} else {
			this.editor = undefined;
		}
	}

	getParagraph(): string {
		if (this.editor !== undefined) {
			let startLine = this.editor.selection.start.line;
			let endLine = this.editor.selection.end.line;
			const endCharacter = this.editor.document.lineAt(endLine).text.length;
			this.editor.selection = new vscode.Selection(startLine, 0, startLine, endCharacter);
			var paragraph = this.editor.selection;
			let result = this.editor.document.getText(paragraph);
			if (result !== undefined) {
				return result;
			}
			else {
				return "";
			}
		} else {
			return "";
		}
	}

	getSelectionText(): string{
		if (this.editor !== undefined) {
			return this.editor.document.getText(this.editor.selection);
		} else {
			return "";
		}
	}

	insertText(text: string): void {
		if (this.editor !== undefined) {
			let end = this.editor.selection.end;
			this.editor.edit(editBuilder => {
				editBuilder.insert(end, '\n');
				editBuilder.insert(end, text);
			}).then(success => {
				if (success && this.editor !== undefined) {
					let end = this.editor.selection.end;
					this.editor.selection = new vscode.Selection(end, end);
					let startLine = this.editor.selection.start.line;
					let endLine = this.editor.selection.end.line;
					const endCharacter = this.editor.document.lineAt(endLine).text.length;
					this.editor.selection = new vscode.Selection(startLine, 0, startLine, endCharacter);
				}
			});
		}
	}
}
