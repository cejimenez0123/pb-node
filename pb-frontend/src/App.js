import React from 'react';
import logo from './logo.svg';
import {Router,Route,Switch} from 'react-router-dom'
import SignUpForm from './components/User/SignUpForm'
import HomeContainer from "./containers/HomeContainer"
import {useUserActions,signUp,LOG_IN} from "./actions/UserActions"
import Test from "./containers/test"
import {connect} from 'react-redux'
import './App.css';
import ProfileContainer from './containers/ProfileContainer';

class App extends React.Component {


  render(){
  return (
    <div className="App">
  
    <Route exact path="/">
      <HomeContainer signUp={this.props.signUp} logIn={this.props.logIn}/>
    </Route>
    <Route exact path="/users/:id">
      <ProfileContainer currentUser={this.props.currentUser}/>
    </Route>
    <Route path="/test">
      <Test/>
    </Route>

     
    </div>
  );}
}

function mapDispatch(dispatch){
  return({signUp: (user)=>dispatch(signUp(user)),
  logIn: (user)=>dispatch(LOG_IN(user))})
}
function mapState(state){
  return({currentUser: state.users.currentUser})
}
export default connect(mapState,mapDispatch)(App);
