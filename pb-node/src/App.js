import React from 'react';
import logo from './logo.svg';
import {Router,Route,Switch} from 'react-router-dom'
import SignUpForm from './components/User/SignUpForm'
import Test from "./containers/test"
import './App.css';

class App extends React.Component {


  render(){
  return (
    <div className="App">
      
    <Route exact path="/">
      <SignUpForm/>
    </Route>
    <Route path="/test">
      <Test/>
    </Route>

     
    </div>
  );}
}

export default App;
