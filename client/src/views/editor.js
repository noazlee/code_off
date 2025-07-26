import React, { useState } from 'react';
import Editor from '@monaco-editor/react';

function MyMonacoEditor() {
  const [code, setCode] = useState('// Your code here');

  function handleEditorChange(value, event) {
    setCode(value);
  }

  return (
    <Editor
      height="500px" // Set the desired height
      language="python" // Set the default language
      theme="vs-dark" // Optional: Set a theme (e.g., "vs-dark", "vs-light")
      value={code} // The current value of the editor
      onChange={handleEditorChange} // Callback for when the content changes
      options={{
        // Optional: Editor options (e.g., line numbers, word wrap)
        minimap: { enabled: false },
        readOnly: false,
      }}
    />
  );
}

export default MyMonacoEditor;