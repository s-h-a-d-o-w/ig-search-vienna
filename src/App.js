import React, { Component } from 'react';
import './App.css';
import Hashtags from './containers/Hashtags';
import Posts from './components/Posts';

class App extends Component {
  state = {
    showContentFor: ''
  };

  changeContent = (e) => {
    this.setState({
        showContentFor: e.target.getAttribute('data-key')
    });
  };

  render() {
    const {showContentFor} = this.state;
    return (
      <div className="App">
        <Hashtags onClickHashtag={this.changeContent}  />
        <Posts hashtag={showContentFor} />
      </div>
    );
  }
}

export default App;
