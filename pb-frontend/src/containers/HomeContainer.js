import React from 'react'
import SignUpForm from "../components/User/SignUpForm"
import Navbar from '../components/Navbar'
import { useStore } from 'react-redux'
import {Card,Accordion,Button} from 'react-bootstrap'
import LogInForm from "../components/User/LogInForm"
import Editor from "../components/Page/editor"
import "../App.css"
function HomeContainer (props){
   
  
    
 
        return(
            <div className="HomeContainer" >
                <Navbar/>
                <Accordion defaultActiveKey="0">
 <Card>
    <Card.Header>
      <Accordion.Toggle as={Button} variant="link" eventKey="0">
        Log In
      </Accordion.Toggle>
    </Card.Header>
    <Accordion.Collapse eventKey="0">
      <Card.Body><LogInForm logIn={props.logIn}/>
      </Card.Body>
    </Accordion.Collapse>
  </Card>
  <Card>
    <Card.Header>
      <Accordion.Toggle as={Button} variant="link" eventKey="1">
        Sign Up
      </Accordion.Toggle>
    </Card.Header>
    <Accordion.Collapse eventKey="1">
      <Card.Body>
          <SignUpForm signUp={props.signUp}/>

      </Card.Body>
    </Accordion.Collapse>
  </Card>
</Accordion>
                <Editor/>

            </div>
        )
        
}
export default HomeContainer