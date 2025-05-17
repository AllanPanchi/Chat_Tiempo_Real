import React from 'react';
import logo from './logo.svg';
import './App.css';
import { Chat } from './components/chat';

function App() {
  return (
    <div className="App"> 
      <header className='App-header'>
        <h1>Chat</h1>
        <Chat />
      </header>
    </div>
  );
}

export default App;
