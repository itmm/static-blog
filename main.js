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
		const pages = JSON.parse(fs.readFileSync(path.join(full_path, "pages.json")).toString('utf8'));
		let result = [];
		pages.forEach(pg => {
			pg.body = fs.readFileSync(path.join(full_path, pg.file + '.html')).toString('utf8');
			result.push(pg);
		});
		evt.reply('pages-loaded', result);
	});
	ipcMain.on('save-page', (evt, pg) => {
		console.log('write ' + pg.file);
		fs.writeFileSync(path.join(full_path, pg.file + '.html'), pg.body);
	});

	const htmlify = src => {
		src = src.replace(/&/g, '&amp;');
		src = src.replace(/</g, '&lt;');
		src = src.replace(/>/g, '&gt;');
		return src;
	};
	const build_page = (pg, pgs) => {
		const build_path = path.join(full_path, 'build');
		if (! fs.existsSync(build_path)) {
			fs.mkdirSync(build_path);
		}
		const template = fs.readFileSync(path.join(full_path, 'PAGE.html')).toString('utf8');
		const yr = (new Date()).getFullYear();
		let nav = '';
		pgs.forEach(p2 => {
			nav += "<li" + (pg.file === p2.file ? " class=\"active\"" : '')  + "><a href=\"" + p2.file + ".html\"" +
				">" + htmlify(p2.short) + "</a></li>\n";
		});
		let val = template.replace(/\$\{NAVIGATION\}/g, nav);
		val = val.replace(/\$\{CONTENT\}/g, pg.body);
		val = val.replace(/\$\{TITLE\}/g, pg.full);
		val = val.replace(/\$\{YEAR\}/g, yr);
		fs.writeFileSync(path.join(build_path, pg.file + '.html'), val);
		if (pg.index) {
			fs.writeFileSync(path.join(build_path, 'index.html'), val);
		}
		const de = fs.readdirSync(full_path);
		de.forEach(e => {
			const ext = path.extname(e)
			if (ext === '.css' ||
				ext === '.jpg' ||
				ext === '.png'
			) {
				fs.copyFileSync(path.join(full_path, e), path.join(build_path, e));
			}
		});
	};
	ipcMain.on('build-pages', (evt, pgs) => {
		pgs.forEach(pg => {
			build_page(pg, pgs);
		});
		build_page({
			file: 'datenschutz', body: fs.readFileSync(path.join(full_path, 'datenschutz.html')).toString('utf8'),
			index: false, full: 'Datenschutzerklärung'
		}, pgs);
		build_page({
			file: 'impressum', body: fs.readFileSync(path.join(full_path, 'impressum.html')).toString('utf8'),
			index: false, full: 'Impressum'
		}, pgs);

	});

	win.loadFile('index.html');
});

