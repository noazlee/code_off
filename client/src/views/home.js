import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { useLocation } from 'react-router-dom';

function Home() {
  const [code, setCode] = useState('// Your code here');
  const location = useLocation();
  const { user_id } = location.state || {};

  function handleEditorChange(value, event) {
    setCode(value);
  }

  return (
    <div className='container'>
        <div className='player'>
            <p>{user_id}</p>
        </div>
        <div className='player'>
            <p>yo</p>
        </div>
    </div>
  );
}

const styles = {
    container: {

    },
    player: {
        backgroundColor: "rgb(0,0,0)",
    }
}

export default Home;