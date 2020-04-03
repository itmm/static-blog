'use strict';

const { ipcRenderer } = require('electron');

window.addEventListener('load', evt => {
	const $ = path => {
		return document.getElementById(path.substr(1));
	};
	const $content = $('#content');
	const $pages = $('#pages');
	let active_id = 0;
	let pages = {};
	let page_ids = [];

	const $edit_area = $('#edit-area');
	const editor = SUNEDITOR.create($edit_area, {
		lang: SUNEDITOR_LANG['de']
	});
	$edit_area.addEventListener('change', evt => {
		if (active_id) {
			const val = editor.getContents();
			if (val !== pages[active_id].body) {
				pages[active_id].undos.push(pages[active_id].body);
				pages[active_id].body = val;
			}
		}
	});
	$('#do-undo').addEventListener('click', evt => {
		evt.preventDefault();
		if (active_id && pages[active_id].undos.length) {
			$edit_area.value = pages[active_id].undos.pop();
		}
	});
	const add_page = p => {
		const id = Object.keys(pages).length + 1;
		p.id = id;
		pages[id] = p;
		page_ids.push(id);
		const $elm = document.createElement('li');
		$elm.id = 'page-' + id;
		$pages.appendChild($elm);
		const $a = document.createElement('a');
		$a.innerText = p.small;
		$a.addEventListener('click', evt => {
			if (active_id) {
				$('#page-' + active_id).classList.remove('active');
			}
			$('#page-' + id).classList.add('active');
			active_id = id;
			editor.setContents(pages[id].body);
		});
		$elm.appendChild($a);
	};

	ipcRenderer.send('load-pages');
	ipcRenderer.on('pages-loaded', (evt, pages) => {
		pages.forEach(p => {
			add_page(p);
		});
	});
});
