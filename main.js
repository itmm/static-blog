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
	const full_path = path.join(app.getPath('documents'), 'static-blog');
	ipcMain.on('load-pages', evt => {
		const pages = JSON.parse(fs.readFileSync(path.join(full_path, "pages.json")));
		let result = [];
		pages.forEach(pg => {
			result.push({
				'file': pg.file,
				'short': pg.short,
				'active': pg.active,
				'body': fs.readFileSync(path.join(full_path, pg.file + '.html'))
			});
		});
		evt.reply('pages-loaded', result);
	});
	ipcMain.on('save-page', (evt, pg) => {
		console.log('write ' + pg.file);
		fs.writeFileSync(path.join(full_path, pg.file + '.html'), pg.body);
	});
	win.loadFile('index.html');
});

