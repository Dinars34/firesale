const marked = require('marked');
const { ipcRenderer } = require('electron');

const markdownView = document.querySelector('#markdown');
const htmlView = document.querySelector('#html');
const newFileButton = document.querySelector('#new-file');
const openFileButton = document.querySelector('#open-file');
const saveMarkdownButton = document.querySelector('#save-markdown');
const revertButton = document.querySelector('#revert');
const saveHtmlButton = document.querySelector('#save-html');
const showFileButton = document.querySelector('#show-file');
const openInDefaultButton = document.querySelector('#open-in-default');

// make a function to render the markdown to html view
// make event listener to listen in key up in text area field

const renderMarkdownToHtml = (markdown) => {
    htmlView.innerHTML = marked.parse(markdown);
}; 

newFileButton.addEventListener('click', () => {
    ipcRenderer.send('new-file-dialog');
});


markdownView.addEventListener('keyup', (event) => {
    const currentContent = event.target.value;
    renderMarkdownToHtml(currentContent);
});

openFileButton.addEventListener('click', () => {
    // fire message across the process gap to the main process
    ipcRenderer.send('open-file-dialog');
});

ipcRenderer.on('file-opened', (event, file, content) => {
    markdownView.value = content;
    renderMarkdownToHtml(content);
});