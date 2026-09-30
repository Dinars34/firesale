const marked = require('marked');

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

const markdownToHtml = (markdown) => {
    htmlView.innerHTML = marked.parse(markdown);
}; 


markdownView.addEventListener('keyup', (event) => {
    const currentContent = event.target.value;
    markdownToHtml(currentContent);
});