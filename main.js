'use strict';

const { app, ipcMain, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

app.on('ready', () => {
	const win = new BrowserWindow({
		width: 800,
		height: 600,
		webPreferences: {
			nodeIntegration: true
		}
	});
	ipcMain.on('load-pages', evt => {
		console.log("load json");
		const p = path.join(app.getPath('documents'), 'static-blog');
		console.log('path', p);
		const pages = JSON.parse(fs.readFileSync(path.join(p, "pages.json")));
		console.log("pages", pages);
		let result = [];
		pages.forEach(id => {
			result.push({
				'id': id,
				'body': fs.readFileSync(path.join(p, 'page-' + id + '.md'))
			});
		});
		evt.reply('pages-loaded', result);
	});
	win.loadFile('index.html');
});

