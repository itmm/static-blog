'use strict';

const { ipcRenderer } = require('electron');

window.addEventListener('load', evt => {
	const $ = path => {
		return document.getElementById(path.substr(1));
	};
	const $edit = $('#edit');
	const $preview = $('#preview');
	const $content = $('#content');
	$('#do-preview').addEventListener('click', evt => {
		evt.preventDefault();
		$edit.classList.add('hidden');
		$preview.classList.remove('hidden');
		const md = window.markdownit();
		$content.innerHTML = md.render($edit_area.value);
	});
	$('#do-edit').addEventListener('click', evt => {
		evt.preventDefault();
		$preview.classList.add('hidden');
		$edit.classList.remove('hidden');
	});
	const $pages = $('#pages');
	let active_id = 0;
	let pages = {};
	let page_ids = [];

	const $edit_area = $('#edit-area');
	$edit_area.addEventListener('change', evt => {
		if (active_id) {
			const val = $edit_area.value;
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
	const add_page = (id, name, body) => {
		pages[id] = { 'name': name, 'body': body, 'undos': [] };
		page_ids.push(id);
		const $elm = document.createElement('li');
		$elm.id = 'page-' + id;
		$pages.appendChild($elm);
		const $a = document.createElement('a');
		$a.innerText = name;
		$a.addEventListener('click', evt => {
			if (active_id) {
				$('#page-' + active_id).classList.remove('active');
			}
			$('#page-' + id).classList.add('active');
			active_id = id;
			$edit_area.value = pages[id].body;
			const md = window.markdownit();
			$content.innerHTML = md.render($edit_area.value);
		});
		$elm.appendChild($a);
	};

	ipcRenderer.send('load-pages');
	ipcRenderer.on('pages-loaded', (evt, pages) => {
		pages.forEach(p => {
			add_page(p.id, 'Page ' + p.id, p.body);
		});
	});
});
