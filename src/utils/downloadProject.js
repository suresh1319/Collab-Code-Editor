import JSZip from 'jszip';

/**
 * Build the full path for a node by traversing parentId chain
 */
function getNodePath(fileSystem, nodeId) {
  const parts = [];
  let current = fileSystem[nodeId];
  while (current && current.parentId !== null) {
    parts.unshift(current.name);
    current = fileSystem[current.parentId];
  }
  return parts.join('/');
}

/**
 * Recursively add files and folders to the zip
 */
function addToZip(zip, fileSystem, nodeId, editorContents) {
  const node = fileSystem[nodeId];
  if (!node) return;

  if (node.type === 'folder') {
    const folderPath = getNodePath(fileSystem, nodeId);
    const folder = folderPath ? zip.folder(folderPath) : zip;
    (node.children || []).forEach(childId => {
      addToZip(zip, fileSystem, childId, editorContents);
    });
  } else {
    const filePath = getNodePath(fileSystem, nodeId);
    const content = editorContents[nodeId] || '';
    zip.file(filePath, content);
  }
}

/**
 * Download the entire project as a ZIP file
 * @param {Object} fileSystem - The flat file system map
 * @param {Object} editorContents - Map of { fileId: string content }
 */
export async function downloadProject(fileSystem, editorContents) {
  const zip = new JSZip();

  // Start from root's children
  const root = fileSystem['root'];
  if (!root) return;

  (root.children || []).forEach(childId => {
    addToZip(zip, fileSystem, childId, editorContents);
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'CollabCE-Project.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
