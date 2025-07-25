import React, { useEffect, useState } from 'react';

function Test() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/test')
      .then(res => res.text())
      .then(data => setMessage(data));
  }, []);

  return <div>{message}</div>;
}

export default Test;