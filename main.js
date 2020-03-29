'use strict';

const { app, BrowserWindow } = require('electron');

app.on('ready', () => {
	const win = new BrowserWindow({
		width: 800,
		height: 600,
		webPreferences: {
			nodeIntegration: true
		}
	});
	win.loadFile('index.html');
});

