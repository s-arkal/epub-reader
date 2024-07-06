const { ipcRenderer } = require('electron');

let currentBook = null;
let currentChapterIndex = 0;
let currentPage = 1;
const WORDS_PER_PAGE = 300;

console.log('Renderer process started');

document.getElementById('openFile').addEventListener('click', async () => {
  console.log('Open file clicked');
  try {
    const book = await ipcRenderer.invoke('open-file');
    console.log('Book data received:', book);
    if (book) {
      currentBook = book;
      currentChapterIndex = 0;
      currentPage = 1;
      displayBookInfo(book);
      await displayChapter();
    }
  } catch (error) {
    console.error('Error opening file:', error);
    alert('Error opening file: ' + error.message);
  }
});

document.getElementById('prevChapter').addEventListener('click', () => {
  if (currentChapterIndex > 0) {
    currentChapterIndex--;
    currentPage = 1;
    displayChapter();
  }
});

document.getElementById('nextChapter').addEventListener('click', () => {
  if (currentBook && currentChapterIndex < currentBook.content.length - 1) {
    currentChapterIndex++;
    currentPage = 1;
    displayChapter();
  }
});

document.getElementById('prevPage').addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    displayPage();
  }
});

document.getElementById('nextPage').addEventListener('click', () => {
  currentPage++;
  displayPage();
});

function displayBookInfo(book) {
  document.getElementById('bookInfo').innerHTML = `
    <h1>${book.title}</h1>
    <h2>${book.author}</h2>
  `;
}

async function displayChapter() {
  console.log('Displaying chapter', currentChapterIndex);
  if (currentBook) {
    const chapter = currentBook.content[currentChapterIndex];
    console.log('Chapter:', chapter);
    try {
      const chapterContent = await ipcRenderer.invoke('get-chapter', currentBook.filePath, chapter.id);
      console.log('Chapter content received');
      currentBook.chapterContent = chapterContent;
      displayPage();
    } catch (error) {
      console.error('Error getting chapter:', error);
      document.getElementById('content').innerHTML = `<p>Error loading chapter: ${error.message}</p>`;
    }
  }
}

async function displayPage() {
  if (currentBook && currentBook.chapterContent) {
    const contentDiv = document.getElementById('content');
    const words = currentBook.chapterContent.split(/\s+/);
    const startIndex = (currentPage - 1) * WORDS_PER_PAGE;
    const endIndex = startIndex + WORDS_PER_PAGE;
    const pageContent = words.slice(startIndex, endIndex).join(' ');
    
    // Replace image tags with actual images
    const processedContent = await replaceImages(pageContent);
    
    contentDiv.innerHTML = processedContent;
    
    document.getElementById('pageInfo').textContent = `Page ${currentPage}`;
  }
}

async function replaceImages(content) {
  const imgRegex = /<img[^>]+src="([^">]+)"/g;
  let match;
  let processedContent = content;
  
  while ((match = imgRegex.exec(content)) !== null) {
    const [fullTag, src] = match;
    try {
      const imageData = await ipcRenderer.invoke('get-image', currentBook.filePath, src);
      const base64Image = `data:${imageData.mimeType};base64,${imageData.data}`;
      processedContent = processedContent.replace(fullTag, `<img src="${base64Image}" style="max-width: 100%;">`);
    } catch (error) {
      console.error('Error loading image:', error);
    }
  }
  
  return processedContent;
}