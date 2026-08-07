function extractDocumentId(url) {
  const match = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

module.exports =  { extractDocumentId };