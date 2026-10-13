const marked = require('marked');
const { ipcRenderer, webUtils, shell } = require('electron');

const markdownView = document.querySelector('#markdown');
const htmlView = document.querySelector('#html');
const newFileButton = document.querySelector('#new-file');
const openFileButton = document.querySelector('#open-file');
const saveFileButton = document.querySelector('#save-file');
const revertButton = document.querySelector('#revert');
const saveHtmlButton = document.querySelector('#save-html');
const showFileButton = document.querySelector('#show-file');
const openInDefaultButton = document.querySelector('#open-in-default');

let currentFilePath = null;
let originalContent = '';

const renderMarkdownToHtml = (markdown) => {
    htmlView.innerHTML = marked.parse(markdown);
}; 

const getDraggedFile = (event) => event.dataTransfer.items[0];
const getDroppedFile = (event) => event.dataTransfer.files[0];

const fileTypeSupported = (file) => {
    return ['text/plain', 'text/markdown'].includes(file.type);
};

const renderFile = (filePath, content, isEdited = false) => {
    currentFilePath = filePath;
    originalContent = content;

    markdownView.value = content;
    renderMarkdownToHtml(content);

    // update the saveFile button and revert button based on user action
    saveFileButton.disabled = !isEdited;
    revertButton.disabled = !isEdited;

    showFileButton.disabled = false;
    openInDefaultButton.disabled = false;

    ipcRenderer.send('file-edited-state', isEdited, filePath);
}

const showFile = () => {
    if (!currentFilePath) {
        return alert('This file has not been saved to the filesystem.');
    }
    shell.showItemInFolder(currentFilePath);
};

const openInDefaultApplication = async () => {
    if (!currentFilePath) {
        return alert('This file has not been saved to the filesystem.');
    }

    // open the file in the default application set by user in the operating
    const errorMessage = await shell.openPath(currentFilePath);
    // handle error 
    if (errorMessage) console.log('Failed to open file: ', errorMessage);
};

showFileButton.addEventListener('click', showFile);
openInDefaultButton.addEventListener('click', openInDefaultApplication);

saveHtmlButton.addEventListener('click', () => {
    ipcRenderer.send('save-html', htmlView.innerHTML);
});

newFileButton.addEventListener('click', () => {
    ipcRenderer.send('new-file-dialog');
});

saveFileButton.addEventListener('click', () => {
    ipcRenderer.send('save-file', currentFilePath, markdownView.value);
});

revertButton.addEventListener('click', () => {
    markdownView.value = originalContent;
    renderMarkdownToHtml(originalContent);
    
    saveFileButton.disabled = true;
    revertButton.disabled = true;
    
    ipcRenderer.send('file-edited-state', false, currentFilePath);
});

markdownView.addEventListener('keyup', (event) => {
    const currentContent = event.target.value;
    renderMarkdownToHtml(currentContent);

    const isEdited = (currentContent !== originalContent);

    saveFileButton.disabled = !isEdited;
    revertButton.disabled = !isEdited;

    ipcRenderer.send('file-edited-state', isEdited, currentFilePath);
});

openFileButton.addEventListener('click', () => {
    ipcRenderer.send('open-file-dialog');
});

document.addEventListener('dragstart', event => event.preventDefault());
document.addEventListener('dragover', event => event.preventDefault());
document.addEventListener('dragleave', event => event.preventDefault());
document.addEventListener('drop', event => event.preventDefault());

markdownView.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    ipcRenderer.send('show-context-menu', !!currentFilePath);
});

markdownView.addEventListener('dragover', (event) => {
    const file = getDraggedFile(event);

    if (fileTypeSupported(file)) {
        markdownView.classList.add('drag-over');
    } else {
        markdownView.classList.add('drag-error');
    }
});

markdownView.addEventListener('dragleave', () => {
    markdownView.classList.remove('drag-over');
    markdownView.classList.remove('drag-error');
});

markdownView.addEventListener('drop', (event) => {
    const file = getDroppedFile(event);

    if (fileTypeSupported(file)) {
        const draggedFilePath = webUtils.getPathForFile(file);
        ipcRenderer.send('open-dragged-file', draggedFilePath);
    } else {
        alert('That file type is not supported');
    }

    markdownView.classList.remove('drag-over');
    markdownView.classList.remove('drag-error');
});

let lastPromptedContent = null;
ipcRenderer.on('file-changed', (event, filePath, content) => {
    // re-render the content of targeted window

    // issue 1: because we detect 'change' event to trigger this channel. Each operating system has 
    // multiple event return when we save the file

    // compaaring wheter the newest content is same with latest content, to determine wheter we need 
    // to call the confirm again.
    if (content == markdownView.value) return;
    if (content == lastPromptedContent) return;
    
    lastPromptedContent = content;
    const userWantsToReload = confirm('This file has been modified by another application. Would you like to reload it?');
    
    if (!userWantsToReload) return;
    renderFile(filePath, content);
});

// when user open new file but the new change not saved yet
ipcRenderer.on('file-opened', (event, filePath, content) => {
    const hasUnsavedChanges = markdownView.value !== originalContent;
    const isOpeningDifferentContent = content !== markdownView.value;

    if (hasUnsavedChanges && isOpeningDifferentContent) {
        const userWantsToOverwrite = confirm('Opening a new file in this window will overwrite your Unsaved changes. Open this file anyway?');

        if (!userWantsToOverwrite) return;
    }

    renderFile(filePath, content);
});

ipcRenderer.on('save-markdown', (event) => {
    ipcRenderer.send('save-file', currentFilePath, markdownView.value);
});

ipcRenderer.on('save-html', (event) => {
    ipcRenderer.send('save-html', htmlView.innerHTML);
});

ipcRenderer.on('show-file', showFile);
ipcRenderer.on('open-in-default', openInDefaultApplication);