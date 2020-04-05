'use strict';

const { ipcRenderer } = require('electron');

window.addEventListener('load', evt => {
	const $ = path => {
		return document.getElementById(path.substr(1));
	};
	const $content = $('#content');
	const $pages = $('#pages');
	let active_idx = 0;
	let pages = [];

	const $edit_area = $('#edit-area');
	const editor = SUNEDITOR.create($edit_area, {
	    buttonList: [
			['undo', 'redo'],
			['font', 'fontSize', 'formatBlock'],
			['paragraphStyle', 'blockquote'],
			['bold', 'underline', 'italic', 'strike', 'subscript', 'superscript'],
			['fontColor', 'hiliteColor', 'textStyle'],
			['removeFormat'],
			['outdent', 'indent'],
			['align', 'horizontalRule', 'list'],
			['table', 'link', 'image'],
			['showBlocks', 'codeView']
		],
		width: '100%', height: 'auto',
		lang: SUNEDITOR_LANG['de']
	});
	editor.onBlur = function(evt, core) {
		if (active_id) {
			const val = editor.getContents();
			const pg = pages[active_id];
			if (val !== pg.body) {
				if (! pg.undos) { pg.undos = []; }
				pg.undos.push(pg.body);
				pg.body = val;
				ipcRenderer.send('save-page', pg);
			}
		}
	};
	const add_page = p => {
		pages.push(p);
		const idx = pages.length;
		const $elm = document.createElement('li');
		if (! p.active) { $elm.classList.add('inactive'); }
		$elm.id = 'page-' + idx;
		$pages.appendChild($elm);
		const $a = document.createElement('a');
		$a.innerText = p.short;
		$a.addEventListener('click', evt => {
			if (active_idx) {
				$('#page-' + active_idx).classList.remove('active');
			}
			$('#page-' + idx).classList.add('active');
			active_idx = idx;
			editor.setContents(pages[idx].body);
		});
		$elm.appendChild($a);
	};

	ipcRenderer.send('load-pages');
	ipcRenderer.on('pages-loaded', (evt, pgs) => {
		pages = [];
		while ($pages.firstChild) {
			$pages.removeChild($pages.firstChild);
		}
		pgs.forEach(p => {
			add_page(p);
		});
	});

	$('#build').addEventListener('click', evt => {
		evt.preventDefault();
		ipcRenderer.send('upload-pages', pages);
	});
});
